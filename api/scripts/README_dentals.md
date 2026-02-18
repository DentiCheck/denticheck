# API 데이터 적재 스크립트

이 디렉토리는 외부 API에서 데이터를 가져와 Denticheck 데이터베이스에 적재하는 스크립트들을 포함하고 있습니다.

## 스크립트 목록

### `load_dentals.py`

이 스크립트는 [공공데이터포털(data.go.kr)](https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15001698)에서 치과 병/의원 정보를 조회하여 `dentals` 테이블에 삽입하거나 업데이트합니다.

#### 사전 요구사항

*   Python 3.x
*   PostgreSQL 데이터베이스 실행 중 (Denticheck DB)
*   `pip` (Python 패키지 설치 관리자)

#### 설정 방법

1.  **의존성 패키지 설치**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **환경 변수 설정**:
    이 디렉토리에 `.env` 파일을 생성하거나 다음 환경 변수를 설정하세요:

    ```env
    OPEN_API_KEY=발급받은_Decoding_인증키
    ```
    *(참고: 공공데이터포털의 **Decoding** 된 인증키를 사용해야 합니다)*

    기본적으로 로컬 데이터베이스에 연결을 시도합니다:
    *   Host: `localhost`
    *   Port: `5432`
    *   DB: `denticheck`
    *   User: `admin`
    *   Password: `admin_password`

    *DB 설정이 다른 경우 `load_dentals.py` 파일 내의 `DB_CONFIG` 변수를 수정하세요.*

#### 사용 방법

파이썬으로 스크립트를 실행합니다:

```bash
python load_dentals.py
```

#### 동작 원리

1.  PostgreSQL 데이터베이스에 연결합니다.
2.  `getHospBasisList` API 오퍼레이션을 통해 데이터를 페이지 단위로 조회합니다.
    *   조회 조건: `zipCd=2050` (치과병원/치과의원).
3.  응답받은 JSON 데이터를 파싱합니다.
4.  `dentals` 테이블에 데이터를 삽입합니다. 이미 존재하는 병원(`source_key` / `ykiho` 기준)인 경우 정보를 업데이트합니다.
5.  진행 상황을 콘솔에 출력합니다.

#### DB를 다시 만든 뒤 치과 데이터 다시 적재하기

API를 재시작하거나 스키마를 초기화하면 `dentals` 테이블이 비어 있고, 치과 row는 **새 UUID**로 다시 들어갑니다. 이때 앱 캐시에 남은 옛날 ID로 등록하면 오류가 나므로, **DB 초기화 후에는 반드시 이 스크립트를 다시 실행**해야 합니다.

**`dentals`만 비우고 다시 적재**

1. PostgreSQL에서 `dentals`와 링크 테이블을 비웁니다.
   - **Docker로 PostgreSQL을 쓰는 경우** (호스트에 `psql` 없어도 됨):
     ```bash
     docker exec -it denticheck-postgres psql -U admin -d denticheck -c "TRUNCATE community_post_dentals, dentals RESTART IDENTITY CASCADE;"
     ```
     *컨테이너 이름이 다르면* `docker ps`로 확인한 뒤 위에서 `denticheck-postgres` 자리를 해당 이름으로 바꾸면 됩니다.
   - **로컬에 PostgreSQL이 직접 설치된 경우**:
     ```bash
     psql -U admin -d denticheck -c "TRUNCATE community_post_dentals, dentals RESTART IDENTITY CASCADE;"
     ```
     `psql`이 PATH에 없으면 PostgreSQL `bin` 전체 경로를 쓰거나, pgAdmin/DBeaver에서 위 SQL만 실행해도 됩니다.
2. 스크립트 실행:
   ```bash
   cd api/scripts
   python load_dentals.py
   ```

이후 앱에서는 **+ (글쓰기)** 를 눌러 새 글쓰기 화면을 연 뒤, **치과 선택**에서 목록을 받고 그 목록에서만 치과를 선택해 등록하면 됩니다.  
*(앱은 글쓰기 모달을 열 때마다 이전에 선택한 치과 태그를 비우므로, TRUNCATE 후에는 반드시 새로 글쓰기를 열고 치과를 다시 선택해야 합니다.)*

#### 자동화

데이터를 최신 상태로 유지하기 위해, 이 스크립트를 주기적(예: 매주 1회)으로 실행하도록 Cron 작업이나 스케줄러에 등록하는 것을 권장합니다.
