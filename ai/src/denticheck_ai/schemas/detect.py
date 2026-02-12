from pydantic import BaseModel
from typing import List, Optional

class BBox(BaseModel):
    x: float
    y: float
    w: float
    h: float

class DetectionResult(BaseModel):
    label: str  # caries|tartar|oral_cancer|normal
    confidence: float
    bbox: BBox

class DetectRequest(BaseModel):
    storage_key: str
    image_url: Optional[str] = None
    model_version: str = "yolo_v26nano"

class DetectResponse(BaseModel):
    detections: List[DetectionResult]
    summary: dict # class -> count/area_ratio etc.
