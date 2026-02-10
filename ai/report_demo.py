"""
[파일 역할]
AI 분석 데이터(위험도, 탐지 결과)를 바탕으로 AI 의사가 전문 소견서를 작성하는 기능을 테스트하는 데모입니다.
LlmClient의 generate_report 기능을 활용합니다.

[실행 방법]
$ export PYTHONPATH=$PYTHONPATH:.
$ python3 report_demo.py
"""

from src.denticheck_ai.api.routers.report import ReportRequest, YoloSummary, MlResult, OverallInfo, OverallAction
from src.denticheck_ai.pipelines.llm.client import LlmClient

def test_report_generation():
    client = LlmClient()
    
    # 최신 Decision Record Projection 데이터 규격 (v2.0)
    req = ReportRequest(
        yolo={
            "Calculus": YoloSummary(present=True, count=2, area_ratio=0.05, max_score=0.92),
            "Caries": YoloSummary(present=False, count=0, area_ratio=0.0, max_score=0.0)
        },
        ml={
            "Gingivitis": MlResult(prob=0.85, suspect=True),
            "Periodontitis": MlResult(prob=0.15, suspect=False)
        },
        survey={
            "Bleeding": "Yes",
            "Pain": "No"
        },
        history={
            "delta_from_last": {"CalculusCount": "+1"}
        },
        overall=OverallInfo(
            level="YELLOW",
            recommended_actions=[OverallAction(code="D100", priority="HIGH")],
            safety_flags={"Emergency": False}
        ),
        language="ko"
    )

    print("==================================================")
    print("🌍 DentiCheck AI 전문 소견 리포트 생성 테스트 (v2.0)")
    print("==================================================")
    
    # 소견서 생성
    result = client.generate_report(data=req, language=req.language)
    
    print("\n[PART 1: SUMMARY]")
    print(f">> {result['summary']}")
    
    print("\n[PART 2: DETAILS]")
    print(result['details'])
    
    print("\n[PART 3: DISCLAIMER]")
    print(f">> {result['disclaimer']}")
    
    print("\n==================================================")
    print("PDF 담당자에게 이 3개 데이터를 각각의 위치에 매핑하도록 전달하면 됩니다.")

if __name__ == "__main__":
    test_report_generation()
