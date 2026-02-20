"""
[파일 역할]
RAG(Retrieval-Augmented Generation) 기반의 치과 지식 챗봇 API를 제공하는 라우터입니다.
사용자의 질문을 받아 전문 지식 데이터베이스에서 관련 내용을 검색하고, LLM을 통해 답변을 생성합니다.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from denticheck_ai.pipelines.rag.service import RagService

# 라우터 설정: /v1/chat 경로로 시작하는 모든 API를 관리합니다.
router = APIRouter(prefix="/v1/chat", tags=["Chat"])

# 챗봇 핵심 로직을 담당하는 RagService 인스턴스 (메모리 절약을 위해 싱글톤 형태로 사용 제안)
rag_service = RagService()

class ChatRequest(BaseModel):
    """
    챗봇 질문 요청을 위한 데이터 모델입니다.
    
    Attributes:
        content (str): 사용자로부터 입력받은 질문 메시지
        language (str, optional): 답변을 받을 언어 (기본값: "ko")
    """
    content: str
    language: str = "en"

class AskResponse(BaseModel):
    answer: str
    language: str = "en"

@router.post("/ask", response_model=AskResponse, summary="치과 지식 질문하기")
async def ask_question(req: ChatRequest):
    """
    사용자의 질문에 대해 전문 지식을 바탕으로 AI 답변을 생성합니다.
    
    1. 요청 데이터 유효성 검사
    2. RagService를 통해 Milvus 검색 및 LLM 답변 생성
    3. 최종 답변 및 언어 정보 반환
    """
    if not req.content or not req.content.strip():
        raise HTTPException(status_code=400, detail="content is required.")

    # RAG 파이프라인 호출하여 답변 생성
    answer = rag_service.ask(req.content.strip(), language=req.language or "en")

    return AskResponse(answer=answer, language=req.language or "en")
