"""
[파일 역할]
이 파일은 '지식 기반 데이터 적재(Ingest)'를 담당합니다. 
수집된 치과 지식 데이터(JSON)를 읽어와서, AI가 이해할 수 있는 벡터(Vector) 형태로 변환한 뒤 
Milvus 벡터 데이터베이스에 저장하는 역할을 합니다. 

[실행 방법]
프로젝트 루트에서 아래 명령어를 실행합니다.
macOS / Linux (Bash, zsh)
$ export PYTHONPATH=$PYTHONPATH:.
$ python3 src/denticheck_ai/pipelines/rag/ingest.py

Windows
$env:PYTHONPATH="$env:PYTHONPATH;."; py -3 src\denticheck_ai\pipelines\rag\ingest.py

※ langchain-huggingface 없어서 실패하면 설치
Windows
=> docker exec -it [container_name] python -m pip install langchain-huggingface

[동작 순서]
1. `data/snudh_knowledge.json` 파일을 읽어옵니다.
2. 각 데이터를 LangChain의 `Document` 객체로 변환합니다.
3. 로컬 임베딩 모델(`ko-sroberta`)을 로드합니다.
4. Milvus Standalone(또는 Lite)을 사용하여 벡터화된 데이터를 저장합니다.
"""

import json
import os
from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_milvus import Milvus
from langchain_text_splitters import RecursiveCharacterTextSplitter

# .env 파일에 정의된 환경 변수(DB 경로 등)를 로드합니다.
load_dotenv()

def ingest_data():
    """
    JSON 지식 베이스 데이터를 읽어 임베딩 과정을 거친 후 Milvus DB에 적재합니다.
    기존 데이터가 있을 경우 삭제하고 새로 적재(drop_old=True)하여 정합성을 유지합니다.
    """
    json_path = "data/snudh_knowledge.json" # 서울대치과병원 지식 데이터 경로
    
    if not os.path.exists(json_path):
        print(f"[에러] {json_path} 파일이 존재하지 않습니다.")
        return

    # 1. 파일에서 데이터 로드
    with open(json_path, "r", encoding="utf-8") as f:
        knowledge_base = json.load(f)

    # 2. LangChain Document 객체로 변환 및 문서 분할 (Chunking)
    raw_documents = []
    for item in knowledge_base:
        if not item['content']: continue
        
        doc = Document(
            page_content=item['content'],
            metadata={
                "title": item['title'],
                "source": item['source'],
                "url": item['url']
            }
        )
        raw_documents.append(doc)

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=100)
    documents = text_splitter.split_documents(raw_documents)

    print(f"원문 {len(raw_documents)}건을 {len(documents)}개의 조각으로 분리하여 준비했습니다.")

    # 3. 로컬 임베딩 모델 설정
    print("로컬 임베딩 모델 로드 중 (최초 실행 시 다운로드 진행)...")
    embeddings = HuggingFaceEmbeddings(
        model_name="jhgan/ko-sroberta-multitask",
        model_kwargs={'device': 'cpu'}, # GPU 활용 시 'cuda'로 변경 권장
        encode_kwargs={'normalize_embeddings': True}
    )

    # 4. Milvus 연결 및 데이터 저장
    milvus_uri = os.getenv("MILVUS_URI", "./data/milvus_dental.db")
    collection_name = os.getenv("COLLECTION_NAME", "dental_knowledge")

    print(f"Milvus 연결 및 데이터 적재 시작... (타겟: {milvus_uri})")
    
    try:
        vector_db = Milvus.from_documents(
            documents,
            embeddings,
            connection_args={
                "uri": milvus_uri,
            },
            collection_name=collection_name,
            drop_old=True # 색인이 중복되지 않도록 기존 데이터를 비우고 새로 생성
        )
        print(f"성공적으로 {len(documents)}건의 지식을 Milvus에 적재했습니다.")
    except Exception as e:
        print(f"[에러] Milvus 적재 실패: {e}")

if __name__ == "__main__":
    ingest_data()
