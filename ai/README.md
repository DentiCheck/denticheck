# Denticheck AI

덴티체크 AI 서비스입니다.

## 📖 상세 문서

RAG 전담 기술 보고서 및 실행 가이드는 **[이곳 (DentiCheck_AI_Knowledge_System.md)](./DentiCheck_AI_Knowledge_System.md)**에서 확인하실 수 있습니다.

## 주요 기능

- 치아 품질 체크 (밝기, 블러, 입벌림 등)
- YOLO를 이용한 치아 및 병변 탐지
- 질환 위험도 분석 (ML)
- 의학 지식 기반 RAG (LLM)

## 🚀 시작하기 (실행 방법)

### 방법 1: Docker (권장)

가장 간편하게 실행할 수 있습니다.

```bash
cd ..
docker-compose -f docker-compose.local.yml up -d ai
```

- API 주소: `http://localhost:8000`

### 방법 2: 로컬 개발 환경 (uvicorn)

코드를 수정하며 즉시 테스트할 때 유용합니다.

**1. 인프라 실행 (필수)**
AI 서비스가 의존하는 DB(Milvus)와 LLM(Ollama)을 먼저 실행해야 합니다.

```bash
cd ..
docker-compose -f docker-compose.local.yml up -d postgres milvus ollama etcd minio
```

**2. 의존성 설치**

```bash
cd ai
pip install fastapi "uvicorn[standard]" pydantic pydantic-settings ultralytics torch torchvision python-multipart httpx openai langchain langchain-ollama langchain-milvus langchain-community sentence-transformers pymilvus python-dotenv loguru --user
```

**3. 서비스 실행 (PowerShell)**

```powershell
$env:PYTHONPATH="src"; $env:MILVUS_URI="http://localhost:19530"; python -m uvicorn denticheck_ai.api.main:app --reload --port 8001
```

- API 주소: `http://localhost:8001`
