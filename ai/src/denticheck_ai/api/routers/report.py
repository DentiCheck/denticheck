"""
[파일 역할]
이 파일은 사용자의 구강 검진 데이터(YOLO 탐지 결과, 문진 내용 등)를 바탕으로 
AI 소견서(Report) 생성을 요청하는 '비즈니스 로직 진입점(API Router)'입니다.

[데이터 흐름]
1. 분석 제어: 탐지된 질환(예: 치석)을 키워드로 `MilvusRetriever`에서 관련 의학 지식을 검색합니다.
2. 병합 조립: 검색된 지식(Context)과 사용자의 문진/탐지 데이터를 하나의 큰 맥락으로 결합합니다.
3. 소견 생성: `LlmClient`를 통해 최종적으로 구조화된(SUMMARY/DETAILS/DISCLAIMER) 소견서를 생성합니다.
4. 결과 반환: 생성된 텍스트와 필요한 부가 정보(언어, PDF URL 등)를 클라이언트에 응답합니다.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from denticheck_ai.pipelines.llm.client import LlmClient
from denticheck_ai.pipelines.rag.retrieve import MilvusRetriever

# 라우터 설정: /v1/report 경로로 요청을 처리합니다.
router = APIRouter(prefix="/v1/report", tags=["Report"])

# 핵심 컴포넌트 인스턴스
llm_client = LlmClient()      # LLM 호출 클라이언트
retriever = MilvusRetriever()  # Milvus 지식 검색기

# --- 데이터 전송 객체 (DTO) 정의 ---

class YoloSummary(BaseModel):
    """YOLO 탐지 결과의 요약 정보"""
    present: bool                  # 질환 존재 여부
    count: int                     # 탐지된 개수
    area_ratio: Optional[float] = 0.0 # 이미지 내 점유 면적 비율
    max_score: Optional[float] = 0.0  # 탐지 신뢰도 중 최댓값

class OverallAction(BaseModel):
    """권장 조치 사항 코드와 우선순위"""
    code: str
    priority: str

class OverallInfo(BaseModel):
    """종합 분석 정보"""
    level: str                          # 건강 등급 (info, warning, danger 등)
    recommended_actions: List[OverallAction] # 권장 조치 리스트
    safety_flags: Dict[str, bool]       # 긴급 상황 여부 등 안전 플래그

class ReportRequest(BaseModel):
    """소견서 생성 요청 데이터 모델"""
    yolo: Dict[str, YoloSummary]        # 질환별 탐지 요약
    survey: Dict[str, Any]              # 사용자 문진 데이터
    history: Dict[str, Any]             # 사용자 과거 이력
    overall: OverallInfo                # 종합 분석 결과
    disclaimer_version: str = "v1.0"   # 면책조항 버전
    language: str                      # 소견서 생성 언어 (필수)

class ReportResponse(BaseModel):
    """생성된 소견서 응답 모델"""
    summary: str                        # 핵심 요약 (한 줄)
    details: str                        # RAG 기반 상세 소견
    disclaimer: str                     # AI 판독에 대한 법적 고지
    language: str                       # 생성된 언어
    pdf_url: Optional[str] = None       # [선택] 생성된 PDF 다운로드 URL

@router.post("/generate", response_model=ReportResponse, summary="AI 소견서 생성")
async def generate_report(req: ReportRequest):
    """
    분석 데이터를 바탕으로 맞춤형 소견서를 작성합니다.
    
    1. 탐지된 질환 항목을 기반으로 Milvus에서 관련 의학 자료 검색 (RAG)
    2. 검색된 전문 지식과 탐지 데이터를 LLM 프롬프트에 결합
    3. LLM을 통해 사용자 맞춤형 소견서(3단계 구조) 생성
    """
    try:
        # [RAG 연동 1단계: 관련 지식 검색]
        # 발견된 질환 라벨을 키워드로 사용하여 Milvus 벡터 DB에서 지식 조각을 가져옵니다.
        query_parts = []
        for label, summary in req.yolo.items():
            if summary.present:
                query_parts.append(label)
        
        search_query = ", ".join(query_parts) if query_parts else "구강 건강 관리"
        contexts = retriever.retrieve_context(search_query, top_k=10)
        context_text = "\n\n---\n\n".join(contexts)
 
        # [RAG 연동 2단계: 소견서 생성 호출]
        # 검색된 지식(context_text)과 함께 모든 분석 데이터를 LLM에 전달합니다.
        result = llm_client.generate_report(data=req, context=context_text, language=req.language)
        
        return ReportResponse(
            summary=result["summary"],
            details=result["details"],
            disclaimer=result["disclaimer"],
            language=req.language
        )
    except Exception as e:
        from loguru import logger
        logger.error(f"소견서 생성 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="소견서 생성 중 오류가 발생했습니다.")

@router.post("/pdf", response_model=Dict[str, Any], summary="소견서 PDF 변환")
async def generate_pdf(report: ReportResponse):
    """
    생성된 텍스트 소견서를 PDF 파일로 변환합니다.
    (현재는 구조 정의 단계이며, 실제 PDF 생성 라이브러리 연동이 필요합니다.)
    """
    try:
        # TODO: report 데이터를 바탕으로 PDF 생성 로직 구현 (예: WeasyPrint, ReportLab 등)
        # 생성 후 S3/MinIO에 업로드하고 해당 URL을 반환하는 흐름
        return {
            "status": "success",
            "pdf_url": f"http://localhost:9000/denticheck/reports/sample_report.pdf",
            "message": "PDF 생성 기능이 준비 중입니다."
        }
    except Exception as e:
        from loguru import logger
        logger.error(f"PDF 생성 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="PDF 변환 중 오류가 발생했습니다.")
