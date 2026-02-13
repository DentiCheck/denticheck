"""
[파일 역할]
YOLOv8 기반 질환 탐지 결과에 대한 요청/응답 스키마를 정의합니다.
탐지된 객체의 위치(BBox)와 질환 종류, 통계 정보를 포함합니다.
"""

from pydantic import BaseModel
from typing import List, Optional

class BBox(BaseModel):
    """이미지 내 탐지 객체의 좌표 (상대 좌표 0~1)"""
    x: float # 중심 X
    y: float # 중심 Y
    w: float # 너비
    h: float # 높이

class DetectionResult(BaseModel):
    """개별 질환 탐지 결과"""
    label: str  # 질환명 (caries|tartar|oral_cancer|normal)
    confidence: float # 확신도
    bbox: BBox        # 위치 정보

class DetectRequest(BaseModel):
    """질환 탐지 요청 모델"""
    storage_key: str
    image_url: Optional[str] = None
    model_version: str = "yolo_v26nano"

class DetectResponse(BaseModel):
    """질환 탐지 최종 응답 모델"""
    detections: List[DetectionResult] # 탐지된 모든 박스들
    summary: dict # 질환별 통계 (예: {"tartar": {"count": 2, ...}})
