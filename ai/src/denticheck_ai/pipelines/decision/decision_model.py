"""
[파일 역할]
DentiCheck AI 서비스에서 사용하는 모든 데이터 구조(Schema)를 정의하는 모델 파일입니다.
이미지 분석의 각 단계별 결과(품질체크, YOLO 탐지, ML 분류, 종합 판단)를 구조화하여 관리합니다.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from uuid import UUID

# --- 1. Gate 모델 (이미지 품질 검사 결과) ---
class GateMetrics(BaseModel):
    """상세 이미지 지표 (선명도, 밝기 등)"""
    oral_present_prob: float # 구강 이미지일 확률
    blur_score: float        # 블러(흐림) 정도
    brightness_mean: float   # 평균 밝기
    clipping_ratio: float    # 노출 과다/부족 비율
    contrast_std: float      # 대비 표준편차

class GateResult(BaseModel):
    """품질 검사 최종 결과"""
    status: str  # pass(통과) | recapture(재촬영)
    reasons: List[str] = [] # 부적격 사유 리스트
    metrics: GateMetrics

# --- 2. YOLO 모델 (객체 탐지 결과) ---
class DetectionBox(BaseModel):
    """개별 탐지 객체 정보"""
    label: str               # 질환명 (calculus, caries, lesion 등)
    confidence: float        # 탐지 신뢰도
    bbox: Dict[str, float]   # 이미지 내 위치 (x, y, w, h)

class ClassSummary(BaseModel):
    """질환 클래스별 요약 통계"""
    present: bool            # 해당 질환 존재 여부
    max_score: float         # 발견된 개체 중 최고 신뢰도
    count: int               # 발견된 개수
    area_ratio: float        # 이미지 내 점유 면적 비율

class YoloResult(BaseModel):
    """YOLO 탐지 전체 결과"""
    summary: Dict[str, ClassSummary] # 질환별 요약 (calculus, caries, lesion)
    detections: List[DetectionBox]   # 탐지된 모든 박스 리스트

# --- 3. Survey 모델 (문진 데이터) ---
class SurveyResult(BaseModel):
    """사용자가 입력한 자가 문진 정보"""
    answers: Dict[str, Any]  # 문진 응답 리스트
    risk_score: Optional[float] = None # 문진 기반 추출 위험 점수

# --- 4. Overall 모델 (최종 종합 판단 결과) ---
class RecommendedAction(BaseModel):
    """전문가 권장 조치 사항"""
    code: str                # 조치 코드 (예: hospital_visit)
    priority: str            # 우선순위 (high, medium, low)

class OverallResult(BaseModel):
    """모든 분석 결과를 통합한 최종 소견"""
    level: str # 건강 등급 (normal, attention, recommend_visit, urgent)
    reasons: List[str]       # 판단 근거 리스트
    recommended_actions: List[RecommendedAction] # 추천 행동 가이드
    safety_flags: Dict[str, bool] # 안전 관련 특이사항 (예: 긴급 여부)

# --- 5. Root Decision Record (전체 분석 이력 저장용) ---
class DecisionMeta(BaseModel):
    """분석 세션 메타 정보"""
    session_id: UUID         # 분석 세션 ID
    user_id: UUID            # 사용자 ID
    image_id: UUID            # 분석 이미지 ID
    image_url: str           # 이미지 저장 경로
    captured_at: datetime    # 촬영 일시
    model_versions: Dict[str, str] # 사용된 AI 모델 버전들

class DecisionRecord(BaseModel):
    """
    한 번의 분석에 대한 모든 데이터가 집약된 '최종 기록물'입니다.
    DB 저장 및 리포트 생성의 원천 데이터로 사용됩니다.
    """
    meta: DecisionMeta
    gate: GateResult
    yolo: YoloResult
    survey: Optional[SurveyResult] = None
    history: Optional[Dict[str, Any]] = None
    overall: Optional[OverallResult] = None # Rule Engine에 의해 채워짐
