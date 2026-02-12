from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from denticheck_ai.pipelines.llm.client import LlmClient
from denticheck_ai.pipelines.rag.retrieve import MilvusRetriever

router = APIRouter(prefix="/v1/report", tags=["Report"])

# LLM 및 RAG 인스턴스
llm_client = LlmClient()
retriever = MilvusRetriever()

# 아키텍처 설계 사양: NLG용 투영본(Projection) 데이터 모델
class YoloSummary(BaseModel):
    present: bool
    count: int
    area_ratio: Optional[float] = 0.0
    max_score: Optional[float] = 0.0

class MlResult(BaseModel):
    suspect: bool
    prob: float

class OverallAction(BaseModel):
    code: str
    priority: str

class OverallInfo(BaseModel):
    level: str
    recommended_actions: List[OverallAction]
    safety_flags: Dict[str, bool]

class ReportRequest(BaseModel):
    yolo: Dict[str, YoloSummary]
    ml: Dict[str, MlResult]
    survey: Dict[str, Any]
    history: Dict[str, Any]
    overall: OverallInfo
    disclaimer_version: str = "v1.0"
    language: Optional[str] = "ko" # "ko" or "en"

class ReportResponse(BaseModel):
    summary: str
    details: str
    disclaimer: str
    language: str

@router.post("/generate", response_model=ReportResponse)
async def generate_report(req: ReportRequest):
    try:
        # [RAG 연동 포인트 1: 관련 지식 검색]
        # YOLO 탐지 결과에서 '발견됨(present: true)' 상태인 항목들(치석, 충치 등)을 추출하여 검색 키워드를 생성합니다.
        # 이 키워드를 기반으로 Milvus 벡터 데이터베이스에서 가장 유사한 전문 치과 지식 2개를 가져옵니다.
        query_parts = []
        for label, summary in req.yolo.items():
            if summary.present:
                query_parts.append(label)
        
        search_query = ", ".join(query_parts) if query_parts else "구강 건강 관리"
        contexts = retriever.retrieve_context(search_query, top_k=2)
        context_text = "\n\n".join(contexts)
 
        # [RAG 연동 포인트 2: LLM 전달]
        # 검색된 지식(context_text)을 LLM 클라이언트의 리포트 생성 함수로 전달합니다.
        result = llm_client.generate_report(data=req, context=context_text, language=req.language)
        
        return ReportResponse(
            summary=result["summary"],
            details=result["details"],
            disclaimer=result["disclaimer"],
            language=req.language
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
