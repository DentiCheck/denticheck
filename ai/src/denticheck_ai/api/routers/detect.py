from fastapi import APIRouter, HTTPException
from denticheck_ai.schemas.detect import DetectRequest, DetectResponse
from denticheck_ai.pipelines.detect.service import DetectionService
from loguru import logger

router = APIRouter(prefix="/v1/detect", tags=["detect"])
detector = DetectionService()

@router.post("", response_model=DetectResponse)
async def detect_objects(request: DetectRequest):
    """
    이미지에서 치과 관련 질환(치석, 충치 등)을 탐지합니다.
    """
    logger.info(f"Detection request received: storage_key={request.storage_key}")
    try:
        result = await detector.detect(
            storage_key=request.storage_key,
            image_url=request.image_url
        )
        return result
    except Exception as e:
        logger.error(f"Detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail="이미지 분석 중 오류가 발생했습니다.")
