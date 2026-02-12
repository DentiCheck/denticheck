# DentiCheck (덴티체크)

DentiCheck는 AI 기반의 구강 자가 진단 및 관리 앱입니다.
사용자는 앱을 통해 치아 사진을 촬영하고, AI가 이를 분석하여 치아 상태 및 질환 위험도를 알려줍니다.

## 🛠️ 필수 요구 사항 (Prerequisites)

이 프로젝트를 실행하기 위해 다음 도구들이 설치되어 있어야 합니다.

- **Docker Desktop**: 데이터베이스 및 AI 인프라 실행용
- **Java JDK 17**: 백엔드 API 실행용 (Spring Boot 3.x)
- **Node.js**: 프론트엔드 실행용 (LTS 버전 권장)
- **Python 3.11**: AI 서비스 로컬 개발용 (선택 사항)

---

## 🚀 전체 서비스 실행 가이드

모든 서비스를 로컬 환경에서 실행하는 순서입니다.

### 1단계: 인프라 실행 (Infrastructure)

가장 먼저 데이터베이스, Milvus(Vector DB), Ollama(LLM) 등을 실행해야 합니다.

```bash
# 프로젝트 루트 디렉토리에서 실행
docker-compose -f docker-compose.local.yml up -d postgres milvus ollama etcd minio
```

- **PostgreSQL**: `localhost:5432`
- **Milvus**: `localhost:19530`
- **Ollama**: `localhost:11434`

### 2단계: AI 서비스 (AI Service)

Docker로 실행하거나 로컬 Python 환경에서 실행할 수 있습니다. (개발 시 로컬 권장)

**옵션 A: Docker 실행 (간편)**

```bash
docker-compose -f docker-compose.local.yml up -d ai
```

- API 주소: `http://localhost:8000`

**옵션 B: 로컬 실행 (개발용)**
코드를 수정하며 즉시 테스트할 때 유용합니다.

```powershell
cd ai
# (최초 1회) 의존성 설치
pip install -r requirements.txt  # 또는 직접 패키지 설치

# 서비스 실행
$env:PYTHONPATH="src"; c:\Python311\python.exe -m uvicorn denticheck_ai.api.main:app --reload --port 8001
```

- API 주소: `http://localhost:8001`

### 3단계: 백엔드 API (Backend)

AI 서비스가 준비되면 API 서버를 실행합니다.

```powershell
cd api
# Windows (CMD/PowerShell)
./gradlew bootRun --args='--spring.profiles.active=local'

# Mac/Linux
./gradlew bootRun --args='--spring.profiles.active=local'

Expo Go로 실행 (에뮬레이터/Android Studio 없이 가능)
npx expo start --tunnel
```

- API 서버: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- GraphiQL: `http://localhost:8080/graphiql`

### 4단계: 프론트엔드 (Frontend)

**A. 관리자 콘솔 (Web)**

```bash
cd console
npm install
npm run dev
```

- 주소: `http://localhost:5173`

**B. 모바일 앱 (App)**

```bash
cd app
# DentiCheck\app 폴더에서 실행
./scripts/start-emulator.ps1
```

- 안드로이드 시뮬레이터 실행

```bash
cd app
# DentiCheck\app 폴더에서 실행
npm install # 최초 1회 실행
npx expo run:android
```
```bash
- Expo QR코드를 스캔하여 실행
npx expo start --tunnel
```
---

## ⚠️ 트러블슈팅

**Q. API 서버 실행 시 Flyway 오류가 발생해요.**

- 로컬 DB 초기화를 위해 `application-local.yml`에 `spring.flyway.clean-disabled: false` 설정이 추가되어 있는지 확인하세요.

**Q. AI 서비스 연결이 안 돼요.**

- `api/src/main/resources/application-local.yml`에서 `ai.client.url`이 실행 중인 AI 서비스 포트(8000 또는 8001)와 일치하는지 확인하세요.
