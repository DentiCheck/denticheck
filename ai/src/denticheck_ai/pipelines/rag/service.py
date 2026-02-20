"""
[파일 역할]
RAG(Retrieval-Augmented Generation) 검색 결과와 Ollama(로컬 LLM)를 하나로 묶어 최종 답변을 생성하는 상위 서비스 레이어입니다.
검색된 지식 조각들을 바탕으로 AI가 자연스러운 문장으로 답변을 구성합니다.

[실행 방법]
1. 로컬에 Ollama가 설치되어 있고 `llama3.2:3b` 모델이 다운로드되어 있어야 합니다.
2. `RagService` 클래스를 인스턴스화하여 `ask(질문)` 메서드를 호출합니다.
9: 
10: 단독 실행하여 질문-답변 파이프라인 전체를 테스트할 수 있습니다.
11: $env:PYTHONPATH="src"; python src/denticheck_ai/pipelines/rag/service.py
12: 

[동작 순서]
1. `MilvusRetriever`를 통해 질문과 관련된 치과 지식을 검색합니다.
2. 검색된 지식과 사용자 질문을 결합하여 전용 프롬프트를 구성합니다.
3. Ollama 모델에 프롬프트를 전달하여 최종 답변 문장을 생성합니다.
"""

import os
from typing import List
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from denticheck_ai.pipelines.rag.retrieve import MilvusRetriever
from denticheck_ai.pipelines.llm import prompts

class RagService:
    """
    RAG 검색 결과와 Ollama(Llama 3.2 3B)를 결합하여 최종 지식 답변을 생성하는 통합 서비스 클래스입니다.
    비용 0원으로 로컬에서 작동하는 지능형 치과 상담 엔진입니다.
    """
    
    def __init__(self, model_name: str = "llama3.2:3b"):
        """
        서비스 초기화: 검색기(Milvus)와 생성기(Ollama) 커넥션 설정
        
        Args:
            model_name (str): 사용할 Ollama 모델명. 기본값은 'llama3.2:3b'.
        """
        # 1. 문서 검색기(Vector DB 연결) 초기화
        self.retriever = MilvusRetriever()
        
        # 2. 로컬 LLM (Ollama) 초기화
        # 환경 변수로부터 Ollama 서버 주소를 가져옵니다.
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        
        # 0원에 무제한으로 사용 가능한 로컬 모델입니다.
        self.llm = ChatOllama(
            model=model_name,
            base_url=base_url,
            temperature=0.2, # 일관성 있는 전문 답변을 위해 온도를 낮게 설정
        )
        
        # 답변 결과(Message 객체)를 문자열로 변환해주는 파서
        self.output_parser = StrOutputParser()

    def _get_chain(self, language: str = "en"):
        """
        언어별(한/영)로 최적화된 LangChain 랭체인(프롬프트 + 모델 + 파서)을 생성합니다.
        
        Args:
            language (str): 답변 언어 ('ko' 또는 'en')
        """
        # 한국어 기본 시스템 프롬프트 (페르소나 정의)
        system_prompt = f"""당신은 친절하고 전문적인 치과 의사 '덴티체크 점검봇'입니다.
아래 제공된 [검색된 지식]만을 근거로 사용자의 질문에 답변하세요.
만약 [검색된 지식]에 질문에 대한 직접적인 답이 없다면, 아는 범위 내에서 구강 건강 상식으로 답변하되 전문적인 진료는 치과 방문이 필요함을 반드시 안내하세요.

[검색된 지식]
{{context}}

{prompts.get_common_rules()}"""

        # 영어일 경우 시스템 프롬프트 번역본 적용
        if language not in {"ko", "en"}:
            language = "en"

        if language == "en":
            system_prompt = f"""You are a friendly and professional dentist 'DentiCheck Bot'.
Answer the user's question based ONLY on the [Retrieved Knowledge] provided below.
If there is no direct answer in the [Retrieved Knowledge], answer with general oral health knowledge but ALWAYS state that a dental visit is required for a professional diagnosis.
Always answer in English only.

[Retrieved Knowledge]
{{context}}

{prompts.get_common_rules()}"""

        # 프롬프트 템플릿 생성
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{question}"),
        ])
        
        # 체인 연결 (선언적 프로그래밍)
        return prompt | self.llm | self.output_parser

    def ask(self, content: str, language: str = "en") -> str:
        """
        사용자 질문에 대해 RAG 파이프라인 전 과정을 실행하여 최종 답변을 반환합니다.
        
        Args:
            content (str): 사용자 질문 내용
            language (str): 답변 언어
            
        Returns:
            str: AI가 생성한 최종 답변 전문
        """
        # 1. 관련 의학 지식 검색 (Milvus에서 Top 3 추출)
        contexts = self.retriever.retrieve_context(content, top_k=3)
        context_text = "\n\n".join(contexts)
        
        # 2. 언어별 체인 획득 및 모델 호출
        chain = self._get_chain(language=language)
        response = chain.invoke({
            "context": context_text,
            "question": content
        })
        
        
        # response가 메시지 객체면 content를 꺼내고, 아니면 문자열로 변환
        if hasattr(response, "content"):
            return response.content
        return str(response)


if __name__ == "__main__":
    # 라이브러리 직접 실행 시 간단한 연동 테스트 진행
    service = RagService()
    test_question = "사랑니 뽑고 나서 술 마셔도 돼?"
    answer = service.ask(test_question)
    
    print("\n" + "="*50)
    print(f"질문: {test_question}")
    print(f"답변: {answer}")
    print("="*50)
