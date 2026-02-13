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

**Ollama 모델 다운로드 ( llama3.1:latest )**

(선택1) 컨테이너 실행 후 종료

```bash
docker compose -f .\docker-compose.local.yml up ollama-init
```

(선택2) 컨테이너 실행 후 삭제

```bash
docker compose -f .\docker-compose.local.yml rm -f ollama-init
```

> **볼륨은 유지**되니까 모델은 그대로 남음.

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

# 서버 실행 (Windows/Mac 공통)
./gradlew bootRun --args='--spring.profiles.active=local'
```

- API 서버: `http://localhost:8080`
- Swagger UI (REST API 문서): `http://localhost:8080/docs/swagger-ui`
- MAGIDOC (GraphQL 문서) : `http://localhost:8080/docs/graphql`

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
# 1. 안드로이드 시뮬레이터 실행 (Windows 전용 스크립트)
./scripts/start-emulator.ps1

# 2. 의존성 설치 (최초 1회)
npm install

# 3. 앱 실행 (Development Build 방식 - 추천)
npx expo run:android

# 4. Expo Go 방식 (에뮬레이터 없이 실제 폰 테스트 시)
npx expo start --tunnel
```

---

## ⚠️ 트러블슈팅

**Q. API 서버 실행 시 Flyway 오류가 발생해요.**

- 로컬 DB 초기화를 위해 `application-local.yml`에 `spring.flyway.clean-disabled: false` 설정이 추가되어 있는지 확인하세요.

**Q. AI 서비스 연결이 안 돼요.**

- `api/src/main/resources/application-local.yml`에서 `ai.client.url`이 실행 중인 AI 서비스 포트와 일치하는지 확인하세요. (기본값: `8000`)

**Q. 로그인 후 앱을 껐다 켜면 로그인이 풀려요.**

- 최근 `AuthProvider.tsx` 업데이트를 통해 `SecureStore`에 토큰을 저장하도록 수정되었습니다. 최신 코드를 pull 받은 후 다시 테스트해 보세요.

**Q. "Couldn't find a navigation context" 에러와 함께 앱이 꺼졌어요.**

- NativeWind의 `shadow` 클래스 관련 버그가 수정되었습니다. `TouchableOpacity` 등에 인라인 `style` 속성을 대신 사용하여 해결했으니, 수정된 컴포넌트 패턴을 따라주세요.
