"""
[파일 역할]
업로드된 이미지의 품질(선명도, 밝기, 적합성 등)을 체크하는 API 라우터입니다.
분석 전 부적절한 이미지를 필터링하는 역할을 수행합니다.
"""

from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import ValidationError
from denticheck_ai.schemas.quality import QualityCheckRequest, QualityCheckResponse

# 라우터 설정: /v1/quality 경로로 요청을 처리합니다.
router = APIRouter(prefix="/v1/quality", tags=["quality"])

@router.post("", response_model=QualityCheckResponse)
async def check_quality(request: Request, file: UploadFile | None = File(default=None), summary="이미지 품질 체크"):
    """
    이미지가 AI 분석에 적합한지 검사합니다.
    
    현재는 Stub 코드로 구현되어 있으며, 모든 이미지에 대해 '통과(pass)'를 반환합니다.
    실제 구현 시 OpenCV 등을 활용한 블러 감지 및 밝기 체크 로직이 들어갈 예정입니다.
    """
    try:
        if file is not None:
            content = await file.read()
            if not content:
                return QualityCheckResponse(pass_=False, reasons=["empty_file"], score=0.0)
            # Stub quality gate: multipart upload path
            return QualityCheckResponse(pass_=True, reasons=[], score=0.98)

        payload = await request.json()
        parsed = QualityCheckRequest.model_validate(payload)
        print(f"이미지 품질 체크 요청: {parsed.storage_key}")
        # 임시 결과 반환: 항상 통과로 설정
        return QualityCheckResponse(pass_=True, reasons=[], score=0.98)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors())
