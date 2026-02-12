from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import ValidationError
from denticheck_ai.schemas.detect import DetectRequest, DetectResponse
from denticheck_ai.pipelines.detect.service import DetectionService
from loguru import logger

router = APIRouter(prefix="/v1/detect", tags=["detect"])
detector = DetectionService()


@router.post("", response_model=DetectResponse)
async def detect_objects(request: Request, file: UploadFile | None = File(default=None)):
    """
    Supports both:
    1) multipart/form-data with `file`
    2) application/json with {storage_key, image_url?, model_version?}
    """
    try:
        if file is not None:
            file_bytes = await file.read()
            if not file_bytes:
                raise HTTPException(status_code=400, detail="empty file")
            logger.info(f"Detection multipart request received: filename={file.filename}")
            return await detector.detect_from_upload(file_bytes=file_bytes, filename=file.filename or "upload.jpg")

        payload = await request.json()
        detect_request = DetectRequest.model_validate(payload)
        logger.info(f"Detection json request received: storage_key={detect_request.storage_key}")
        return await detector.detect(storage_key=detect_request.storage_key, image_url=detect_request.image_url)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors())
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail="image detection failed")
