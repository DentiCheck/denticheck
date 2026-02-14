"""
[파일 역할]
이 파일은 RAG(검색 증강 생성) 시스템의 '오케스트레이터(Orchestrator)'인 `RagService`를 정의합니다.
`MilvusRetriever`를 통해 찾아온 지식(Context)과 사용자의 질문(Question)을 결합하여, 
Ollama LLM이 전문적인 답변을 생성할 수 있도록 전체 흐름을 관리합니다.

[실행 방법]
단독 실행하여 질문-답변 파이프라인 전체를 테스트할 수 있습니다.
$env:PYTHONPATH="src"; python src/denticheck_ai/pipelines/rag/service.py

[작동 원리]
1. 지식 검색: `MilvusRetriever`를 사용해 관련 지식 조각들을 10개(Top-10) 가져옵니다.
2. 프롬프트 구성: 검색된 지식과 질문을 미리 정의된 시스템 페르소나와 결합합니다.
3. LLM 호출: 로컬에서 가동 중인 Ollama(Llama 3.1) 모델에 최종 요청을 보냅니다.
4. 결과 반환: 생성된 텍스트를 파싱하여 사용자에게 전달합니다.
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
    RAG 검색 결과와 Ollama(Llama 3.1)를 결합하여 최종 지식 답변을 생성하는 통합 서비스 클래스입니다.
    비용 0원으로 로컬에서 작동하는 지능형 치과 상담 엔진입니다.
    """
    
    def __init__(self, model_name: str = "llama3.1:latest"):
        """
        서비스 초기화: 검색기(Milvus)와 생성기(Ollama) 커넥션 설정
        
        Args:
            model_name (str): 사용할 Ollama 모델명. 기본값은 'llama3.1:latest'.
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

    def _get_chain(self, language: str = "ko"):
        """
        언어별(한/영)로 최적화된 LangChain 랭체인(프롬프트 + 모델 + 파서)을 생성합니다.
        
        Args:
            language (str): 답변 언어 ('ko' 또는 'en')
        """
        # 한국어 기본 시스템 프롬프트 (페르소나 정의)
        # 검색된 지식(Context)에서 상위 3개를 골라 답변에 활용하고 출처를 밝히도록 지시합니다.
        system_prompt = f"""당신은 친절하고 전문적인 치과 의사 '덴티체크 점검봇'입니다.
아래 제공된 [검색된 지식]을 바탕으로 사용자의 질문에 답변하세요.

[답변 가이드라인]
1. 제공된 조각들 중 가장 관련성이 높은 '상위 3개'의 지식을 선별하여 답변을 구성하세요.
2. 답변 마지막에 반드시 '참고한 지식의 출처(제목 및 URL)'를 명시하세요.
3. 만약 지식에 직접적인 답이 없다면 상식 선에서 답변하되, 반드시 치과 방문을 권고하세요.

[검색된 지식]
{{context}}

{prompts.get_common_rules(language=language)}"""

        # 영어일 경우 시스템 프롬프트 번역본 적용
        if language == "en":
            system_prompt = f"""You are a friendly and professional dentist 'DentiCheck Bot'.
Answer the user's question based on the [Retrieved Knowledge] provided below.

[Response Guidelines]
1. Select the 'Top 3' most relevant pieces of knowledge from the provided context to answer.
2. Always mention the 'Sources (Titles & URLs)' used at the end of your response.
3. If no direct answer is found, provide general advice and strongly recommend visiting a dentist.

[Retrieved Knowledge]
{{context}}

{prompts.get_common_rules(language=language)}"""

        # 프롬프트 템플릿 생성
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{question}"),
        ])
        
        # 체인 연결 (선언적 프로그래밍)
        return prompt | self.llm | self.output_parser

    def ask(self, content: str, language: str = "ko") -> str:
        """
        사용자 질문에 대해 RAG 파이프라인 전 과정을 실행하여 최종 답변을 반환합니다.
        
        Args:
            content (str): 사용자 질문 내용
            language (str): 답변 언어
            
        Returns:
            str: AI가 생성한 최종 답변 전문
        """
        # 1. 관련 의학 지식 검색 (Milvus에서 넉넉히 10개 추출)
        contexts = self.retriever.retrieve_context(content, top_k=10)
        context_text = "\n\n---\n\n".join(contexts)
        
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
