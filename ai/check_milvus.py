import os
from pymilvus import connections, utility, Collection

def check_milvus_status():
    print("Checking Milvus status...")
    try:
        connections.connect("default", host="localhost", port="19530")
        collection_name = "dental_knowledge"
        
        if not utility.has_collection(collection_name):
            print(f"Collection '{collection_name}' does not exist.")
            return

        collection = Collection(collection_name)
        collection.load()
        num_entities = collection.num_entities
        print(f"Collection: {collection_name}")
        print(f"Number of entities: {num_entities}")
        
    except Exception as e:
        print(f"Error checking Milvus: {e}")

if __name__ == "__main__":
    check_milvus_status()
