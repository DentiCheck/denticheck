"""
[파일 역할]
분석 결과(YOLO, ML, 설문 등)를 종합하여 최종적인 건강 등급과 권장 조치를 결정하는 '의사결정 규칙(Rule Engine)' 파일입니다.
결정론적(Deterministic) 비즈니스 로직을 통해 서비스 레이어에서 사용할 최종 등급을 산출합니다.
"""

from typing import List, Dict
from .decision_model import (
    DecisionRecord, OverallResult, RecommendedAction
)

def evaluate_overall_risk(record: DecisionRecord) -> OverallResult:
    """
    YOLO 탐지 결과와 설문 데이터를 기반으로 종합 위험도 및 건강 등급(Level)을 평가합니다.
    
    [판단 우선순위 및 등급]
    1. 'lesion'(병변) 발견: 즉시 병원 방문 권고 (recommend_visit)
    2. 'caries'(충치): 1~2개(attention), 3개 이상(recommend_visit)
    3. 'calculus'(치석): 발견 시 '주의'(attention) 및 스케일링 권장
    """
    yolo = record.yolo
    survey = record.survey

    reasons = []    # 판단 근거 (백엔드 참고용)
    actions = []    # 추천 조치 리스트 (코드화)
    safety_flags = {"lesion_caution_text_required": False} # 특이사항 플래그
    
    level = "normal" # 기본 등급: 정상

    # 1. 병변(Lesion) 탐지 여부 (최우선 순위)
    if yolo.summary.get("lesion", {}).get("present"):
        reasons.append("lesion_detected")
        level = "recommend_visit"
        safety_flags["lesion_caution_text_required"] = True
        actions.append(RecommendedAction(code="hospital_visit_lesion", priority="high"))

    # 2. 치석(Calculus/Tartar) 탐지 여부
    if yolo.summary.get("calculus", {}).get("present") or yolo.summary.get("tartar", {}).get("present"):
        reasons.append("calculus_present")
        if level == "normal":
            level = "attention"
        actions.append(RecommendedAction(code="scaling_consult", priority="medium"))
    
    # 3. 충치(Caries) 탐지 여부 및 개수별 차등
    if yolo.summary.get("caries", {}).get("present"):
        reasons.append("caries_detected")
        if level == "normal":
            level = "attention"
        
        # 3개 이상 발견 시 등급 상향
        caries_count = yolo.summary.get("caries", {}).get("count", 0)
        if caries_count >= 3:
             level = "recommend_visit"
        actions.append(RecommendedAction(code="cavity_care", priority="medium"))

    # 특이사항 없는 경우 일반 관리 안내
    if level == "normal":
        actions.append(RecommendedAction(code="maintain_routine", priority="low"))

    return OverallResult(
        level=level,
        reasons=reasons,
        recommended_actions=actions,
        safety_flags=safety_flags
    )
