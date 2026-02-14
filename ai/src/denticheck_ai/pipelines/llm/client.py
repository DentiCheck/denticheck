"""
[파일 역할]
로컬 LLM (Ollama) 호출을 전담하는 통신 클라이언트 모듈입니다.
Llama 3.1 모델을 사용하여 챗봇 답변, 소견서 생성, 텍스트 요약 등의 업무를 수행합니다.
모든 연산은 로컬에서 이루어지므로 외부 API 비용이 발생하지 않습니다.

[실행 순서]
1. 로컬에 Ollama가 설치되어 있어야 하며 `llama3.1:latest` 모델이 준비되어야 합니다.
2. `LlmClient` 클래스를 생성합니다.
3. `generate_report()` 또는 `simple_chat()` 메서드를 사용하여 AI 답변을 받습니다.
"""

import os
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from denticheck_ai.pipelines.llm import prompts

class LlmClient:
    """
    Ollama 엔진을 기반으로 다양한 언어 모델 작업을 수행하는 클라이언트 클래스입니다.
    """

    def __init__(self, model_name: str = "llama3.2:3b"):
        """
        클라이언트 초기화: Ollama 주소 및 모델 설정
        
        Args:
            model_name (str): 사용할 모델명. 기본값은 'llama3.1:latest'.
        """
        # 서버 주소 설정 (Docker 환경 등 대응 가능하도록 환경변수 참조)
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        
        self.model = model_name
        # ChatOllama 객체 생성 (온도를 0.2로 설정하여 일관된 전문 답변 유도)
        self.llm = ChatOllama(
            model=self.model,
            base_url=base_url,
            temperature=0.2,
        )
        # 응답 메시지에서 텍스트만 추출해주는 파서
        self.parser = StrOutputParser()

    def warmup(self):
        res = self.simple_chat("ping", system_prompt="You are a helpful assistant.")
        if isinstance(res, str) and res.startswith("LLM 호출 중 오류 발생"):
            raise RuntimeError(res)
        return res

    def simple_chat(self, user_message: str, language: str = "ko", system_prompt: str = None) -> str:
        """
        일반적인 챗봇 대화 수행 (한꺼번에 답변 반환)

        Args:
            user_message (str): 사용자의 입력 메시지
            language (str): 지원 언어 ('ko' 또는 'en')
            system_prompt (str): 직접 지정할 시스템 페르소나 (기본값: 치과의사)

        Returns:
            str: 생성된 답변 텍스트
        """
        if system_prompt is None:
            # 기본적으로 치과의사 페르소나 적용
            system_prompt = prompts.get_system_persona_doctor(language=language)
            
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_message)
            ]
            response = self.llm.invoke(messages)
            return self.parser.invoke(response)
        except Exception as e:
            return f"LLM 호출 중 오류 발생: {str(e)}"

    def stream_chat(self, user_message: str, language: str = "ko", system_prompt: str = None):
        """
        글자 단위 실시간 스트리밍 대화 (Generator 반환)
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
        분석 데이터(YOLO, ML 등)와 RAG 지식을 결합하여 전문 소견서 생성
        1. 리포트용 프롬프트 템플릿 로드
        2. 원시 분석 데이터를 텍스트 컨텍스트로 변환
        3. LLM 호출 후 구조화된 결과로 파싱하여 반환
        """
        # 1. 작성 가이드라인 및 서식 템플릿 가져오기
        template = prompts.get_report_generation_template(language)
        
        # 2. 분석 결과 데이터를 LLM이 읽기 좋은 텍스트 형식으로 포맷팅 (데이터 투영)
        formatted_data = self._format_data_for_prompt(data, context)
        
        # 3. 전체 시스템 프롬프트 구성
        system_prompt = prompts.get_system_persona_doctor(language)
        # 응답의 형식을 강제하기 위한 지시문
        format_instruction = "\n\n반드시 아래 형식으로 답변하세요:\nSUMMARY: <한줄요약>\nDETAILS: <상세분석 및 가이드>\nDISCLAIMER: <면책고지>"
        user_prompt = template.format(context=formatted_data) + format_instruction
        
        # 4. Ollama를 통해 결과 생성
        raw_response = self._call_ollama(system_prompt, user_prompt)
        
        # 5. 생성된 텍스트에서 summary, details, disclaimer 영역을 분리하여 dict로 반환
        return self._parse_structured_report(raw_response)

    def _call_ollama(self, system_prompt: str, user_prompt: str) -> str:
        """모델 내부 호출용 헬퍼 메서드"""
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            response = self.llm.invoke(messages)
            return self.parser.invoke(response)
        except Exception as e:
            return f"Ollama 통신 에러: {str(e)}"

    def _parse_structured_report(self, text: str) -> dict:
        """
        LLM이 생성한 긴 텍스트 답변에서 특정 태그(SUMMARY, DETAILS 등)를 기준으로 
        데이터를 분리하여 구조화합니다.
        """
        result = {"summary": "", "details": "", "disclaimer": ""}
        try:
            # 태그 존재 여부 확인 후 파싱
            if "SUMMARY:" in text and "DETAILS:" in text and "DISCLAIMER:" in text:
                result["summary"] = text.split("SUMMARY:")[1].split("DETAILS:")[0].strip()
                result["details"] = text.split("DETAILS:")[1].split("DISCLAIMER:")[0].strip()
                result["disclaimer"] = text.split("DISCLAIMER:")[1].strip()
            else:
                # 태그가 누락된 경우 줄바꿈 기준으로 최대한 추정하여 처리
                parts = text.split("\n\n")
                result["summary"] = parts[0] if len(parts) > 0 else text
                result["details"] = "\n\n".join(parts[1:-1]) if len(parts) > 2 else ""
                result["disclaimer"] = parts[-1] if len(parts) > 1 else ""
        except Exception:
            # 예외 발생 시 원문 보존
            result["summary"] = "분석 리포트가 생성되었습니다."
            result["details"] = text
        return result

    def _format_data_for_prompt(self, data, context: str = "") -> str:
        """
        객체 형태의 분석 데이터와 검색된 의학 지식을 하나의 문자열 컨텍스트로 변환합니다.
        LLM이 탐지 결과와 전문 지식을 상관관계에 맞게 해석할 수 있도록 돕습니다.
        """
        lines = []
        
        # [RAG 연동] 검색된 치과 전문 지식을 가장 앞에 배치하여 답변의 신뢰도 확보
        if context:
            lines.append("[참고할 전문 의학 지식]")
            lines.append(context)
            lines.append("")

        # YOLO 객체 탐지 요약 정보
        lines.append("[이미지 분석(YOLO) 결과]")
        for label, info in data.yolo.items():
            if info.present:
                lines.append(f"- {label}: {info.count}건 발견 (내부 신뢰도: {info.max_score})")
            else:
                lines.append(f"- {label}: 정상 (특이사항 없음)")
        
        # 사용자 문진(Survey) 데이터
        if data.survey and data.survey.answers:
            lines.append("\n[사용자 문진 결과]")
            for key, value in data.survey.answers.items():
                lines.append(f"- {key}: {value}")
            
        # 과거 데이터와의 변화량 (시계열 분석용)
        if data.history and data.history.get("delta_from_last"):
            lines.append("\n[과거 대비 변화 정보]")
            for key, val in data.history["delta_from_last"].items():
                lines.append(f"- {key}: {val}")
                
        # 종합 판단 요약
        if data.overall:
            lines.append("\n[시스템 종합 판단]")
            lines.append(f"- 건강 레벨: {data.overall.level}")
            if data.overall.recommended_actions:
                actions = ", ".join([a.code for a in data.overall.recommended_actions])
                lines.append(f"- 권장 조치 코드: {actions}")
        
        return "\n".join(lines)
