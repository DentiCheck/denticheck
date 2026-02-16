"""
[파일 역할]
수집된 치과 지식 데이터(JSON)를 로컬 벡터 데이터베이스(Milvus Lite)에 적재하는 스크립트입니다.
RAG 시스템이 지식을 검색할 수 있도록 '학습 데이터'를 DB에 밀어넣는 전처리 단계에 해당합니다.

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
from langchain_milvus import Milvus
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

# 환경 변수 로드
load_dotenv()

"""
[파일 역할]
JSON 형식의 치과 의학 지식을 벡터 데이터베이스(Milvus)에 적재(Ingest)하는 스크립트입니다.
텍스트 데이터를 임베딩 모델을 통해 벡터로 변환하여 검색 가능한 상태로 만듭니다.

[실행 방법]
python -m src.denticheck_ai.pipelines.rag.ingest
"""
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

    # 2. LangChain Document 객체로 변환 (메타데이터 포함)
    documents = []
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
        documents.append(doc)

    print(f"총 {len(documents)}건의 문서를 준비했습니다.")

    # 3. 로컬 임베딩 모델 설정
    # 한국어 성능이 검증된 'jhgan/ko-sroberta-multitask' 모델을 사용하여 텍스트를 벡터로 수치화합니다.
    print("로컬 임베딩 모델 로드 중 (최초 실행 시 다운로드 진행)...")
    embeddings = HuggingFaceEmbeddings(
        model_name="jhgan/ko-sroberta-multitask",
        model_kwargs={'device': 'cpu'}, # GPU 활용을 위해 'cuda'로 변경됨
        encode_kwargs={'normalize_embeddings': True}
    )

    # 4. Milvus 연결 및 데이터 저장
    # Milvus Lite(로컬 파일 방식) 또는 독립 실행형 서버에 연결합니다.
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
