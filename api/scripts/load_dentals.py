import os
import sys
import requests
import psycopg2
import uuid
from psycopg2.extras import execute_values
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration
API_BASE_URL = "http://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList"
DB_CONFIG = {
    "host": "localhost",
    "port": "5432",
    "dbname": "denticheck",
    "user": "admin",
    "password": "admin_password"
}

def get_db_connection():
    try:
        print(f"Connecting to {DB_CONFIG['dbname']} at {DB_CONFIG['host']}...")
        conn = psycopg2.connect(**DB_CONFIG)
        
        # Debug connection info
        cur = conn.cursor()
        cur.execute("SELECT current_database(), current_user, inet_server_addr(), inet_server_port();")
        info = cur.fetchone()
        print(f"Connected to: DB={info[0]}, User={info[1]}, IP={info[2]}, Port={info[3]}")
        cur.close()
        
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def fetch_data(api_key, page_no=1, num_of_rows=100):
    params = {
        "serviceKey": api_key,
        "pageNo": page_no,
        "numOfRows": num_of_rows,
        "zipCd": "2050",  # Dental distinction code as requested
        "_type": "json"
    }
    
    for attempt in range(3):
        try:
            # Note: serviceKey is usually already encoded
            response = requests.get(API_BASE_URL, params=params, timeout=30)
            response.raise_for_status()
            
            # Check if response is valid JSON
            try:
                data = response.json()
            except ValueError:
                print(f"Response is not JSON: {response.text[:200]}")
                return None
    
            # Handle API error responses
            if "response" in data and "header" in data["response"]:
                result_code = data["response"]["header"]["resultCode"]
                if result_code != "00":
                    print(f"API Error: {data['response']['header']['resultMsg']}")
                    return None
                    
            return data
        except requests.exceptions.RequestException as e:
            print(f"Error fetching data (attempt {attempt+1}/3): {e}")
            if attempt == 2:
                return None
            import time
            time.sleep(2)

def parse_and_insert(conn, items):
    cursor = conn.cursor()
    
    # Prepare data for insertion
    records = []
    
    for item in items:
        # Generate UUID for new records (though we might use source_key to find existing)
        # We will use ON CONFLICT to update existing
        
        # Mapping fields
        source_key = item.get("ykiho", "")
        if not source_key:
            continue
            
        name = item.get("yadmNm", "Unknown")
        phone = item.get("telno", "")
        address = item.get("addr", "")
        
        # Coordinates (XPos: Longitude, YPos: Latitude)
        # We use the real coordinates from the API. 
        # To avoid multiple markers overlapping at the exact same spot during testing,
        # we can add a tiny random jitter if they are missing or for all of them if desired.
        import random
        try:
            lng = float(item.get("XPos")) if item.get("XPos") else 126.97 + (random.random() - 0.5) * 0.01
            lat = float(item.get("YPos")) if item.get("YPos") else 37.56 + (random.random() - 0.5) * 0.01
        except ValueError:
            lng = 126.97 + (random.random() - 0.5) * 0.01
            lat = 37.56 + (random.random() - 0.5) * 0.01
            
        sido_code = item.get("sidoCd", "")
        sigungu_code = item.get("sgguCd", "")
        
        # Extract additional logic if needed for business_status
        # For now, assume active/open if it appears in the list? 
        # getHospBasisList usually returns active hospitals.
        business_status = "OPEN"
        
        # Prepare record tuple (order must match SQL)
        # ID is generated here, but for upsert we want to keep existing ID if possible.
        # But execute_values with ON CONFLICT DO UPDATE is tricky with generated ID.
        # Strategy: 
        # 1. Insert with ON CONFLICT (source_key) DO UPDATE ...
        # 2. For ID, we can use a fresh UUID for insert. If update happens, ID is ignored/preserved.
        
        record = (
            str(uuid.uuid4()),  # id
            "DATA_GO_KR",       # source
            source_key,         # source_key
            name,               # name
            phone,              # phone
            address,            # address
            sido_code,          # sido_code
            sigungu_code,       # sigungu_code
            lat,                # lat
            lng,                # lng
            business_status,    # business_status
            0.0,                # rating_avg
            0,                  # rating_count
            datetime.now(),     # created_at
            datetime.now(),     # updated_at
            False               # is_affiliate
        )
        records.append(record)

    if not records:
        return 0

    insert_query = """
    INSERT INTO dentals (
        id, source, source_key, name, phone, address, 
        sido_code, sigungu_code, lat, lng, business_status, 
        rating_avg, rating_count, created_at, updated_at, is_affiliate
    ) VALUES %s
    ON CONFLICT (source_key) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        sido_code = EXCLUDED.sido_code,
        sigungu_code = EXCLUDED.sigungu_code,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        updated_at = EXCLUDED.updated_at
    """
    
    try:
        execute_values(cursor, insert_query, records)
        conn.commit()
        return len(records)
    except Exception as e:
        print(f"Error inserting data: {e}")
        conn.rollback()
        return 0
    finally:
        cursor.close()

def main():
    api_key = os.environ.get("OPEN_API_KEY")
    if not api_key:
        print("Error: OPEN_API_KEY environment variable is not set.")
        print("Usage: set OPEN_API_KEY=your_key && python load_dentals.py")
        sys.exit(1)

    print("Connecting to database...")
    conn = get_db_connection()
    
    page_no = 1
    total_count = 0
    
    print("Starting data fetch...")
    
    while True:
        print(f"Fetching page {page_no}...")
        data = fetch_data(api_key, page_no=page_no)
        
        if not data:
            break
            
        response_body = data.get("response", {}).get("body", {})
        items = response_body.get("items", {}).get("item", [])
        
        # items can be a dict if only one item, or list if multiple, or None if empty
        if isinstance(items, dict):
            items = [items]
        elif items is None:
            items = []
            
        if not items:
            print("No more items found.")
            break
            
        count = parse_and_insert(conn, items)
        total_count += count
        print(f"Processed {count} items. Total: {total_count}")
        
        # Check pagination
        total_items = response_body.get("totalCount", 0)
        num_of_rows = response_body.get("numOfRows", 100)
        
        if page_no * num_of_rows >= total_items:
            print("All pages fetched.")
            break
            
        page_no += 1
        
        if total_count >= 3000:
            print("Reached limit of 3000 records.")
            break
        
    conn.close()
    print(f"Done. Total {total_count} records processed.")

if __name__ == "__main__":
    main()
