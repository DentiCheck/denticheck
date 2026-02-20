"""
[파일 역할]
RAG (Retrieval-Augmented Generation) 파이프라인의 핵심인 '문서 검색' 모듈입니다.
사용자의 질문과 관련된 치과 의학 지식을 Vector DB (Milvus)에서 찾아오는 역할을 합니다.

[실행 방법]
단독 실행하여 검색 성능을 테스트할 수 있습니다.
$ export PYTHONPATH=$PYTHONPATH:.
$ python3 src/denticheck_ai/pipelines/rag/retrieve.py

[동작 순서]
1. 사전에 `ingest.py`를 통해 Milvus DB에 지식이 적재되어 있어야 합니다.
2. 질문을 임베딩(벡터화)하여 DB(Milvus Standalone/Lite)에서 가장 유사한 문서 조각(Top-K)을 찾습니다.
3. 거리 점수를 계산하여 '신뢰도(%)'와 함께 관련 문서를 반환합니다.
"""

import os
from typing import List
from dotenv import load_dotenv
from langchain_milvus import Milvus
from langchain_huggingface import HuggingFaceEmbeddings

# 환경 설정 및 DB 연결 정보를 로드합니다.
load_dotenv()

class MilvusRetriever:
    """
    Milvus 벡터 데이터베이스에서 관련 문서를 검색하는 클래스입니다.
    """
    
    def __init__(self):
        """
        검색기 초기화: 내부적으로 임베딩 모델과 DB 연결 설정을 로드합니다.
        """
        # 1. 임베딩 모델 설정 (Ingest 단계와 반드시 동일한 모델 사용)
        self.embeddings = HuggingFaceEmbeddings(
            model_name="jhgan/ko-sroberta-multitask",
            model_kwargs={'device': 'cpu'}, # GPU 활용을 위해 'cuda'로 변경됨
            encode_kwargs={'normalize_embeddings': True}
        )
        
        # 2. Milvus 연결 정보 설정
        # Default to Milvus server endpoint to avoid accidental milvus-lite mode.
        self.milvus_uri = os.getenv("MILVUS_URI", "http://localhost:19530")
        self.collection_name = os.getenv("COLLECTION_NAME", "dental_knowledge")
        
        # 3. VectorStore 객체 생성 (기존 생성된 컬렉션에 연결)
        self.vector_db = Milvus(
            self.embeddings,
            connection_args={"uri": self.milvus_uri},
            collection_name=self.collection_name,
        )

    def retrieve_context(self, query: str, top_k: int = 3) -> List[str]:
        """
        질문과 가장 유사한 상위 k개의 지식 문장을 검색하여 반환합니다. (Sync)

        Args:
            query (str): 검색할 질문 텍스트
            top_k (int): 검색할 상위 문서 개수

        Returns:
            List[str]: 검색된 문서 내용 리스트
        """
        print(f"지식 검색 중... (질문: {query})")
        return self._search_internal(query, top_k)

    async def aretrieve_context(self, query: str, top_k: int = 3) -> List[str]:
        """
        질문과 가장 유사한 상위 k개의 지식 문장을 검색하여 반환합니다. (Async)
        LangChain Milvus는 아직 완전한 async search를 지원하지 않을 수 있으므로,
        필요 시 동기 메서드를 별도 스레드에서 실행하는 방식으로 래핑합니다.

        Args:
            query (str): 검색할 질문 텍스트
            top_k (int): 검색할 상위 문서 개수

        Returns:
            List[str]: 검색된 문서 내용 리스트
        """
        import asyncio
        from functools import partial
        
        loop = asyncio.get_running_loop()
        # 동기 메서드인 _search_internal을 별도 스레드에서 실행하여 이벤트 루프 차단 방지
        return await loop.run_in_executor(
            None, 
            partial(self._search_internal, query, top_k)
        )

    def _search_internal(self, query: str, top_k: int) -> List[str]:
        """실제 검색 로직 (내부 메서드)"""
        try:
            # 유사도 검색 수행 (거리 점수 포함)
            docs_with_scores = self.vector_db.similarity_search_with_score(query, k=top_k)
            
            results = []
            for doc, score in docs_with_scores:
                content = doc.page_content
                # L2 거리를 활용해 직관적인 신뢰도(%)로 변환
                # score(거리)가 0에 가까울수록 유사함
                # 여기서는 간단히 코사인 유사도 근사치를 사용 (데이터 분포에 따라 조정 필요)
                # Milvus L2 metric 기준: distance
                cosine_sim = 1 - (score / 2) # L2 distance to normalized similarity (approx)
                if cosine_sim < 0: cosine_sim = 0
                confidence = cosine_sim * 100
                
                # 출처 정보와 내용을 결합
                title = doc.metadata.get('title', '치과지식')
                source_info = f"[출처: {title}] (신뢰도: {confidence:.1f}%)"
                results.append(f"{source_info}\n{content}")
            
            return results
        except Exception as e:
            print(f"검색 중 오류 발생: {e}")
            return [f"검색 오류가 발생했습니다: {e}"]

    def retrieve_with_score(self, query: str, top_k: int = 3) -> List[dict]:
        """유사도 점수를 상세히 포함하여 검색 결과를 반환합니다."""
        results = self.vector_db.similarity_search_with_score(query, k=top_k)
        
        formatted_results = []
        for doc, score in results:
            formatted_results.append({
                "content": doc.page_content,
                "metadata": doc.metadata,
                "score": float(score)
            })
        return formatted_results

    def get_raw_retriever(self):
        """LangChain의 기본 Retriever 인터페이스를 반환합니다."""
        return self.vector_db.as_retriever(search_kwargs={"k": 3})

if __name__ == "__main__":
    # 라이브러리 직접 실행 시 간단한 검색 테스트 진행
    retriever = MilvusRetriever()
    test_query = "임플란트 수술 후 주의사항이 뭐야?"
    contexts = retriever.retrieve_context(test_query)
    
    print("\n" + "="*50)
    print(f"질문: {test_query}")
    for i, ctx in enumerate(contexts):
        print(f"\n[결과 {i+1}]\n{ctx}")
    print("="*50)
