"""
[파일 역할]
로컬 LLM (Ollama) 호출을 담당하는 클라이언트 모듈입니다.
Llama 3.1 모델을 사용하여 텍스트 생성, 요약, 소견 작성 등의 작업을 수행합니다.
비용이 들지 않으며 모든 데이터는 로컬에서 처리됩니다.

[실행 순서]
1. 로컬에 Ollama가 설치되어 있고 llama3.1 모델이 있어야 합니다.
2. LlmClient 클래스를 인스턴스화합니다.
3. generate_report() 또는 stream_chat() 메서드를 호출하여 응답을 받습니다.

[사용 예시]
client = LlmClient()
response = client.simple_chat("치석이 생기는 이유가 뭐야?")
print(response)
"""

import os
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from src.denticheck_ai.pipelines.llm import prompts

class LlmClient:
    """
    Ollama API와 통신하여 로컬 LLM 기능을 제공하는 클래스입니다.
    """

    def __init__(self, model_name: str = "llama3.1:latest"):
        """
        초기화 메서드입니다. 로컬 Ollama 클라이언트를 설정합니다.
        
        Args:
            model_name (str): 사용할 모델 이름. 기본값은 'llama3.1:latest'.
        """
        # Ollama 서버 주소 설정 (Docker 및 로컬 환경 대응)
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        
        self.model = model_name
        self.llm = ChatOllama(
            model=self.model,
            base_url=base_url,
            temperature=0.2, # 전문적인 답변을 위해 창의성을 낮춤
        )
        self.parser = StrOutputParser()

    def simple_chat(self, user_message: str, language: str = "ko", system_prompt: str = None) -> str:
        """
        간단한 챗봇 대화를 수행합니다 (일괄 응답).

        Args:
            user_message (str): 사용자가 입력한 질문이나 메시지
            language (str): 답변 언어 ('ko' 또는 'en')
            system_prompt (str): 직접 지정할 페르소나 (None일 경우 의사 페르소나 자동 선택)

        Returns:
            str: AI의 응답 텍스트
        """
        if system_prompt is None:
            system_prompt = prompts.get_system_persona_doctor(language=language)
            
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_message)
            ]
            response = self.llm.invoke(messages)
            return self.parser.invoke(response)
        except Exception as e:
            return f"에러 발생: {str(e)}"

    def stream_chat(self, user_message: str, language: str = "ko", system_prompt: str = None):
        """
        실시간 스트리밍으로 답변을 생성합니다.

        Args:
            user_message (str): 사용자가 입력한 메시지
            language (str): 답변 언어 ('ko' 또는 'en')
            system_prompt (str): 직접 지정할 페르소나
        """
        if system_prompt is None:
            system_prompt = prompts.get_system_persona_doctor(language=language)
            
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ]
        return (self.llm | self.parser).stream(messages)

    def generate_report(self, data, context: str = "", language: str = "ko") -> dict:
        """
        분석 데이터와 RAG 컨텍스트를 기반으로 전문적인 치과 소견서를 생성합니다.
        """
        # 1. 템플릿 가져오기
        template = prompts.get_report_generation_template(language)
        
        # 2. 데이터 포맷팅
        formatted_data = self._format_data_for_prompt(data, context)
        
        # 3. 프롬프트 구성
        system_prompt = prompts.get_system_persona_doctor(language)
        format_instruction = "\n\n반드시 아래 형식으로 답변하세요:\nSUMMARY: <한줄요약>\nDETAILS: <상세분석 및 가이드>\nDISCLAIMER: <면책고지>"
        user_prompt = template.format(context=formatted_data) + format_instruction
        
        # 4. LLM 호출 및 파싱
        raw_response = self._call_ollama(system_prompt, user_prompt)
        return self._parse_structured_report(raw_response)

    def _call_ollama(self, system_prompt: str, user_prompt: str) -> str:
        """Ollama 모델을 호출하여 일괄 응답을 받습니다."""
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            response = self.llm.invoke(messages)
            return self.parser.invoke(response)
        except Exception as e:
            return f"에러 발생: {str(e)}"

    def _parse_structured_report(self, text: str) -> dict:
        """상세 텍스트를 summary, details, disclaimer로 파싱합니다."""
        result = {"summary": "", "details": "", "disclaimer": ""}
        try:
            if "SUMMARY:" in text and "DETAILS:" in text and "DISCLAIMER:" in text:
                result["summary"] = text.split("SUMMARY:")[1].split("DETAILS:")[0].strip()
                result["details"] = text.split("DETAILS:")[1].split("DISCLAIMER:")[0].strip()
                result["disclaimer"] = text.split("DISCLAIMER:")[1].strip()
            else:
                # 파싱 실패 시 대체 로직
                parts = text.split("\n\n")
                result["summary"] = parts[0] if len(parts) > 0 else text
                result["details"] = "\n\n".join(parts[1:-1]) if len(parts) > 2 else ""
                result["disclaimer"] = parts[-1] if len(parts) > 1 else ""
        except Exception:
            result["summary"] = "분석 리포트가 생성되었습니다."
            result["details"] = text
        return result

    def _format_data_for_prompt(self, data, context: str = "") -> str:
        """분석 데이터와 RAG 지식을 LLM 전용 텍스트 컨텍스트로 변환합니다."""
        lines = []
        
        # [RAG 연동 포인트]
        # Milvus에서 검색된 전문 치과 지식(context)을 프롬프트 최상단에 배치합니다.
        # LLM은 프롬프트의 앞부분을 가장 중요한 참조 정보로 인식하므로, 
        # 이를 통해 생성되는 답변이 실제 의학적 근거에 기반하도록 유도합니다.
        if context:
            lines.append("[참고할 전문 치과 지식]")
            lines.append(context)
            lines.append("")

        # YOLO 탐지 결과
        lines.append("[YOLO 탐지 요약]")
        for label, info in data.yolo.items():
            if info.present:
                lines.append(f"- {label}: {info.count}건 발견 (면적비: {info.area_ratio}, 신뢰도: {info.max_score})")
            else:
                lines.append(f"- {label}: 발견되지 않음")
        
        # ML 위험도 분류
        lines.append("\n[머신러닝 분석 결과]")
        for disease, res in data.ml.items():
            status = "의심" if res.suspect else "정상"
            lines.append(f"- {disease}: {status} (확률: {res.prob})")
            
        # 설문 데이터
        lines.append("\n[사용자 설문 정보]")
        for key, value in data.survey.items():
            lines.append(f"- {key}: {value}")
            
        # 히스토리 변화
        if data.history.get("delta_from_last"):
            lines.append("\n[이전 대비 변화량]")
            for key, val in data.history["delta_from_last"].items():
                lines.append(f"- {key}: {val}")
                
        # 종합 판단(Overall)
        lines.append("\n[시스템 종합 판단]")
        lines.append(f"- 위험 레벨: {data.overall.level}")
        actions = ", ".join([a.code for a in data.overall.recommended_actions])
        lines.append(f"- 추천 행동 코드: {actions}")
        
        return "\n".join(lines)
