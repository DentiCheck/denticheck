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
        configured_path = settings.YOLO_MODEL_PATH
        model_path = configured_path if os.path.isabs(configured_path) else os.path.join(os.getcwd(), configured_path)
        if not os.path.exists(model_path):
            logger.warning(f"Model not found at {model_path}, using default yolov8n.pt")
            self.model = YOLO("yolov8n.pt")
        else:
            self.model = YOLO(model_path)
        logger.info(f"Loaded YOLO model from {model_path}")

    async def _download_image(self, storage_key: str, image_url: str = None) -> Path:
        target_url = image_url
        if not target_url:
            protocol = "https" if settings.MINIO_SECURE else "http"
            target_url = f"{protocol}://{settings.MINIO_ENDPOINT}/{settings.MINIO_BUCKET}/{storage_key}"

        tmp_dir = tempfile.gettempdir()
        safe_name = storage_key.replace("/", "_")
        tmp_path = Path(tmp_dir) / f"detect_{safe_name}"

        logger.info(f"Downloading image from {target_url} to {tmp_path}")

        async with httpx.AsyncClient() as client:
            resp = await client.get(target_url, timeout=30.0)
            resp.raise_for_status()
            tmp_path.write_bytes(resp.content)

        return tmp_path

    def _run_detection(self, image_path: Path) -> DetectResponse:
        results = self.model.predict(source=str(image_path), conf=0.25, verbose=False)

        detections = []
        summary = {}

        if len(results) > 0:
            result = results[0]
            for box in result.boxes:
                cls_id = int(box.cls[0])
                label = self._normalize_label(self.model.names[cls_id])

                score = float(box.conf[0])
                pxy = box.xywhn[0].tolist()  # normalized xywh

                detections.append(
                    DetectionResult(
                        label=label,
                        confidence=score,
                        bbox=BBox(x=pxy[0], y=pxy[1], w=pxy[2], h=pxy[3]),
                    )
                )

                if label not in summary:
                    summary[label] = {"count": 0, "max_score": 0.0}
                summary[label]["count"] += 1
                summary[label]["max_score"] = max(summary[label]["max_score"], score)

        return DetectResponse(detections=detections, summary=summary)

    async def detect_from_upload(self, file_bytes: bytes, filename: str = "upload.jpg") -> DetectResponse:
        image_path = None
        try:
            suffix = Path(filename).suffix or ".jpg"
            tmp_path = Path(tempfile.gettempdir()) / f"detect_upload_{os.getpid()}{suffix}"
            tmp_path.write_bytes(file_bytes)
            image_path = tmp_path
            return self._run_detection(image_path)
        except Exception as e:
            logger.error(f"Detection pipeline (upload) failed: {str(e)}")
            return DetectResponse(detections=[], summary={})
        finally:
            if image_path and image_path.exists():
                try:
                    image_path.unlink()
                except Exception:
                    pass

    async def detect(self, storage_key: str, image_url: str = None) -> DetectResponse:
        image_path = None
        try:
            image_path = await self._download_image(storage_key, image_url)
            return self._run_detection(image_path)
        except Exception as e:
            logger.error(f"Detection pipeline failed: {str(e)}")
            return DetectResponse(detections=[], summary={})
        finally:
            if image_path and image_path.exists():
                try:
                    image_path.unlink()
                except Exception:
                    pass

    def _normalize_label(self, label: str) -> str:
        raw = (label or "normal").strip().lower()
        mapping = {
            "caries": "caries",
            "cavity": "caries",
            "tartar": "tartar",
            "calculus": "tartar",
            "plaque": "tartar",
            "oral_cancer": "oral_cancer",
            "lesion": "oral_cancer",
            "normal": "normal",
        }
        return mapping.get(raw, "normal")
