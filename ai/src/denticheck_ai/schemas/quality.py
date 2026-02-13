"""
[파일 역할]
입력된 이미지의 품질(블러, 밝기 등)이 AI 분석에 적합한지 판단하기 위한 요청/응답 스키마입니다.
"""

from pydantic import BaseModel
from typing import List, Optional

class QualityCheckRequest(BaseModel):
    """품질 검사 요청 모델"""
    storage_key: str              # 스토리지 내 파일명
    image_url: Optional[str] = None # 직접 접근 가능한 이미지 URL

class QualityCheckResponse(BaseModel):
    """품질 검사 응답 모델"""
    pass_: bool  # 적합 여부 (True: 통과, False: 재촬영 필요)
    reasons: List[str] # 부적합 사유 리스트
    score: float       # 최종 품질 점수 (0~1)

    class Config:
        populate_by_name = True
        # JSON 응답 시 pass_ 필드를 pass로 노출
        json_schema_extra = {
            "example": {
                "pass": True,
                "reasons": [],
                "score": 0.95
            }
        }
