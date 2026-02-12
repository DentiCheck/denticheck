from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import ValidationError
from denticheck_ai.schemas.quality import QualityCheckRequest, QualityCheckResponse

router = APIRouter(prefix="/v1/quality", tags=["quality"])

@router.post("", response_model=QualityCheckResponse)
async def check_quality(request: Request, file: UploadFile | None = File(default=None)):
    try:
        if file is not None:
            content = await file.read()
            if not content:
                return QualityCheckResponse(pass_=False, reasons=["empty_file"], score=0.0)
            # Stub quality gate: multipart upload path
            return QualityCheckResponse(pass_=True, reasons=[], score=0.98)

        payload = await request.json()
        parsed = QualityCheckRequest.model_validate(payload)
        print(f"Checking quality for image: {parsed.storage_key}")
        return QualityCheckResponse(pass_=True, reasons=[], score=0.98)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors())
