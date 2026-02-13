from datetime import datetime
from uuid import uuid4
from denticheck_ai.pipelines.decision.decision_model import (
    DecisionRecord, DecisionMeta, GateResult, GateMetrics,
    YoloResult, ClassSummary, DetectionBox,
    SurveyResult
)
from denticheck_ai.pipelines.decision.rules import evaluate_overall_risk

def create_mock_record(
    calculus_present=False,
    caries_count=0,
    lesion_present=False
):
    """테스트용 DecisionRecord 생성을 위한 팩토리 메서드입니다."""
    return DecisionRecord(
        meta=DecisionMeta(
            session_id=uuid4(), user_id=uuid4(), image_id=uuid4(),
            image_url="http://test", captured_at=datetime.now(),
            model_versions={"yolo": "v1"}
        ),
        gate=GateResult(status="pass", metrics=GateMetrics(
            oral_present_prob=0.9, blur_score=100, brightness_mean=100,
            clipping_ratio=0, contrast_std=10
        )),
        yolo=YoloResult(
            summary={
                "calculus": ClassSummary(present=calculus_present, max_score=0.9, count=1 if calculus_present else 0, area_ratio=0),
                "caries": ClassSummary(present=caries_count > 0, max_score=0.9, count=caries_count, area_ratio=0),
                "lesion": ClassSummary(present=lesion_present, max_score=0.9, count=1 if lesion_present else 0, area_ratio=0),
            },
            detections=[]
        ),
        survey=SurveyResult(answers={})
    )

def test_rules():
    """의사결정 엔진(Rule Engine) 로직 테스트"""
    print("--- 의사결정 규칙 테스트 시작 ---")

    # 케이스 1: 정상 상태
    r1 = create_mock_record()
    res1 = evaluate_overall_risk(r1)
    print(f"케이스 1 (정상): Level={res1.level}, 조치코드={[a.code for a in res1.recommended_actions]}")
    assert res1.level == "normal"

    # 케이스 2: 치석 발견 -> '주의' 단계
    r2 = create_mock_record(calculus_present=True)
    res2 = evaluate_overall_risk(r2)
    print(f"케이스 2 (치석): Level={res2.level}, 조치코드={[a.code for a in res2.recommended_actions]}")
    assert res2.level == "attention"
    assert "scaling_consult" in [a.code for a in res2.recommended_actions]

    # 케이스 3: 병변 발견 -> '병원 방문' 단계
    r3 = create_mock_record(lesion_present=True)
    res3 = evaluate_overall_risk(r3)
    print(f"케이스 3 (병변): Level={res3.level}, 조치코드={[a.code for a in res3.recommended_actions]}")
    assert res3.level == "recommend_visit"
    assert res3.safety_flags["lesion_caution_text_required"] == True

    print("--- 모든 테스트 통과 완료! ---")

if __name__ == "__main__":
    test_rules()
