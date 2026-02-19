"""
[파일 역할]
이 파일은 로컬 LLM(Ollama)과의 통신을 전담하는 `LlmClient`를 정의합니다.
치과 소견서 생성, 텍스트 요약, 일반 대화 등 핵심적인 자연어 처리 작업을 수행하며, 
모든 연산은 사용자 로컬의 `llama3.1` 모델을 통해 이루어집니다.

[사용 방법]
1. 인스턴스화: `client = LlmClient()`로 클라이언트를 생성합니다.
2. 기능 호출:
   - `generate_report()`: YOLO 탐지 결과 등을 바탕으로 전문 소견서를 생성합니다.
   - `simple_chat()`: 일반적인 질문에 대해 단답형으로 대답합니다.
   - `stream_chat()`: 실시간으로 글자가 생성되는 스트리밍 방식으로 대답합니다.

[작동 원리]
1. Ollama 서버 연결: `http://localhost:11434`에 가동 중인 모델 서버에 접속합니다.
2. 페르소나 적용: `prompts.py`에 정의된 치과의사 페르소나를 시스템 메시지로 주입합니다.
3. 데이터 포맷팅: 구조화된 분석 데이터를 LLM이 읽기 쉬운 텍스트 형식으로 가공하여 전달합니다.
4. 결과 파싱: LLM이 생성한 긴 답변에서 소견, 요약, 면책조항 등을 구분하여 추출합니다.
"""

import os
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from denticheck_ai.pipelines.llm import prompts
from denticheck_ai.core.settings import settings

class LlmClient:
    """
    Ollama 엔진을 기반으로 다양한 언어 모델 작업을 수행하는 클라이언트 클래스입니다.
    """

    def __init__(self, model_name: str | None = None):
        """
        클라이언트 초기화: Ollama 주소 및 모델 설정
        
        Args:
            model_name (str): 사용할 모델명. 기본값은 'llama3.1:latest'.
        """
        # 서버 주소 설정 (Docker 환경 등 대응 가능하도록 환경변수 참조)
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        
        self.model = model_name or os.getenv("OLLAMA_MODEL", settings.OLLAMA_MODEL)
        # ChatOllama 객체 생성 (온도를 0.2로 설정하여 일관된 전문 답변 유도)
        self.llm = ChatOllama(
            model=self.model,
            base_url=base_url,
            temperature=0.2,
            timeout=180.0,  # 3분 타임아웃
        )
        # 응답 메시지에서 텍스트만 추출해주는 파서
        self.parser = StrOutputParser()

    async def warmup(self):
        res = await self.simple_chat("ping", system_prompt="You are a helpful assistant.")
        if isinstance(res, str) and res.startswith("LLM 호출 중 오류 발생"):
            raise RuntimeError(res)
        return res

    async def simple_chat(self, user_message: str, language: str = "ko", system_prompt: str = None) -> str:
        """
        일반적인 챗봇 대화 수행 (한꺼번에 답변 반환) - Async

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
            # 모델의 순응도를 높이기 위해 규칙을 메시지 뒤에 한 번 더 상기시킵니다.
            instruction = "\n\n(반드시 지킬 것: 한글로만 답변, 영어 및 한자 사용 금지, 강조기호 ** 금지, 불렛은 • 사용)"
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_message + instruction)
            ]
            # 비동기 호출로 변경 (ainvoke)
            response = await self.llm.ainvoke(messages)
            content = await self.parser.ainvoke(response)
            
            # 최종 방어 코드: 혹시라도 포함된 ** 기호 제거
            return content.replace("**", "")
        except Exception as e:
            return f"LLM 호출 중 오류 발생: {str(e)}"

    async def stream_chat(self, user_message: str, language: str = "ko", system_prompt: str = None):
        """
        글자 단위 실시간 스트리밍 대화 (Async Generator 반환)

        Args:
            user_message (str): 사용자의 입력 메시지
            language (str): 지원 언어 ('ko' 또는 'en')
            system_prompt (str): 직접 지정할 시스템 페르소나 (기본값: 치과의사)

        Yields:
            str: 실시간 생성되는 답변 텍스트 청크
        """
        if system_prompt is None:
            system_prompt = prompts.get_system_persona_doctor(language=language)
            
        # 모델의 순응도를 높이기 위해 규칙을 메시지 뒤에 한 번 더 상기시킵니다.
        instruction = "\n\n(반드시 지킬 것: 한글로만 답변, 영어 및 한자 사용 금지, 강조기호 ** 금지, 불렛은 • 사용)"
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message + instruction)
        ]
        # 비동기 스트림 (astream)
        async for chunk in (self.llm | self.parser).astream(messages):
            # 스트리밍 중에도 강조 기호가 나오면 제거 (간단한 필터링)
            yield chunk.replace("**", "")

    async def generate_report(self, data, context: str = "", language: str = "ko") -> dict:
        """
        분석 데이터(YOLO, ML 등)와 RAG 지식을 결합하여 전문 소견서 생성 - Async

        Args:
            data (ReportRequest): 분석 결과 및 사용자 문진 데이터가 포함된 요청 객체
            context (str): RAG를 통해 검색된 관련 의학 지식 텍스트
            language (str): 소견서 생성 언어 ('ko' 또는 'en')

        Returns:
            dict: summary, details, disclaimer가 포함된 구조화된 소견서 결과
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
        
        # 4. Ollama를 통해 결과 생성 (Async)
        raw_response = await self._call_ollama(system_prompt, user_prompt)
        
        # 5. 생성된 텍스트에서 summary, details, disclaimer 영역을 분리하여 dict로 반환
        return self._parse_structured_report(raw_response)

    async def _call_ollama(self, system_prompt: str, user_prompt: str) -> str:
        """모델 내부 호출용 헬퍼 메서드 (Async)"""
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            response = await self.llm.ainvoke(messages)
            return await self.parser.ainvoke(response)
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
