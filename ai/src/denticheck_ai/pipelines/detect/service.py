import os
import httpx
import tempfile
from pathlib import Path
from ultralytics import YOLO
from denticheck_ai.core.settings import settings
from denticheck_ai.schemas.detect import DetectResponse, DetectionResult, BBox
from loguru import logger

class DetectionService:
    def __init__(self):
        # 현재 작업 디렉토리 기준 모델 경로 설정
        model_path = os.path.join(os.getcwd(), settings.YOLO_MODEL_PATH)
        if not os.path.exists(model_path):
            logger.warning(f"Model not found at {model_path}, using default yolov8n.pt")
            self.model = YOLO("yolov8n.pt")
        else:
            self.model = YOLO(model_path)
        logger.info(f"Loaded YOLO model from {model_path}")

    async def _download_image(self, storage_key: str, image_url: str = None) -> Path:
        """MinIO 또는 외부 URL에서 이미지를 다운로드하여 임시 파일로 저장합니다."""
        target_url = image_url
        if not target_url:
            # MinIO endpoint가 localhost일 경우 Docker 내부에서는 접근이 안 되므로 설정 확인 필요
            # 여기서는 우선 설정된 값을 기반으로 URL 구성
            protocol = "https" if settings.MINIO_SECURE else "http"
            target_url = f"{protocol}://{settings.MINIO_ENDPOINT}/{settings.MINIO_BUCKET}/{storage_key}"

        tmp_dir = tempfile.gettempdir()
        # 파일명에서 슬래시 제거
        safe_name = storage_key.replace("/", "_")
        tmp_path = Path(tmp_dir) / f"detect_{safe_name}"
        
        logger.info(f"Downloading image from {target_url} to {tmp_path}")
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(target_url, timeout=30.0)
            resp.raise_for_status()
            tmp_path.write_bytes(resp.content)
            
        return tmp_path

    async def detect(self, storage_key: str, image_url: str = None) -> DetectResponse:
        """이미지를 분석하여 탐지된 객체 리스트와 요약을 반환합니다."""
        image_path = None
        try:
            image_path = await self._download_image(storage_key, image_url)
            
            # YOLO 추론 실행
            results = self.model.predict(source=str(image_path), conf=0.25, verbose=False)
            
            detections = []
            # 응답 스키마와 일치시키기 위한 초기화
            summary = {
                "tartar": {"count": 0, "max_score": 0.0}, 
                "caries": {"count": 0, "max_score": 0.0}, 
                "lesion": {"count": 0, "max_score": 0.0}
            }
            
            if len(results) > 0:
                result = results[0]
                for box in result.boxes:
                    cls_id = int(box.cls[0])
                    label = self.model.names[cls_id]
                    # calculus -> tartar 매핑 (스키마 일관성)
                    if label == "calculus": label = "tartar"
                    
                    score = float(box.conf[0])
                    # 정규화된 좌표 [x_center, y_center, width, height]
                    pxy = box.xywhn[0].tolist()
                    
                    det = DetectionResult(
                        label=label,
                        confidence=score,
                        bbox=BBox(x=pxy[0], y=pxy[1], w=pxy[2], h=pxy[3])
                    )
                    detections.append(det)
                    
                    # 요약 정보 업데이트
                    if label not in summary:
                        summary[label] = {"count": 0, "max_score": 0.0}
                    
                    summary[label]["count"] += 1
                    summary[label]["max_score"] = max(summary[label]["max_score"], score)
            
            return DetectResponse(detections=detections, summary=summary)
            
        except Exception as e:
            logger.error(f"Detection pipeline failed: {str(e)}")
            # 에러 발생 시 빈 결과 반환 (서버 중단 방지)
            return DetectResponse(detections=[], summary={})
        finally:
            if image_path and image_path.exists():
                try:
                    image_path.unlink()
                except Exception:
                    pass
