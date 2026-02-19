"""
[파일 역할]
YOLOv8 모델을 사용하여 치과 질환(치석, 충치, 병변)을 탐지하는 핵심 서비스 클래스입니다.
이미지 다운로드, 전처리, 추론, 결과 가공의 전체 파이프라인을 관리합니다.
"""
import os
import httpx
import tempfile
from pathlib import Path
from ultralytics import YOLO
from denticheck_ai.core.settings import settings
from denticheck_ai.schemas.detect import DetectResponse, DetectionResult, BBox
from loguru import logger


class DetectionService:
    """
    YOLOv8 기반 질환 탐지 서비스 클래스입니다.
    """
    def __init__(self):
        """
        서비스 초기화 및 YOLO 모델 로드
        - 설정된 경로에서 모델 가중치(.pt) 파일을 불러옵니다.
        - 모델 파일이 없을 경우 기본 모델(yolov8n.pt)을 사용합니다.
        """
        configured_path = settings.YOLO_MODEL_PATH
        model_path = configured_path if os.path.isabs(configured_path) else os.path.join(os.getcwd(), configured_path)
        if not os.path.exists(model_path):
            logger.warning(f"모델을 찾을 수 없습니다: {model_path}, 기본 모델(yolov8n.pt)을 로드합니다.")
            self.model = YOLO("yolov8n.pt")
        else:
            self.model = YOLO(model_path)
        logger.info(f"YOLO 모델 로드 완료: {model_path}")

    async def _download_image(self, storage_key: str, image_url: str = None) -> Path:
        """
        이미지 다운로드 및 임시 저장
        - 우선순위 1: 전달된 직접 URL(image_url) 사용
        - 우선순위 2: storage_key(MinIO)를 기반으로 내부 URL 생성
        - 다운로드된 파일은 작업 완료 후 삭제될 수 있도록 임시 경로에 저장합니다.
        """
        target_url = image_url
        if not target_url:
            # MinIO 프로토콜 및 URL 구성
            protocol = "https" if settings.MINIO_SECURE else "http"
            target_url = f"{protocol}://{settings.MINIO_ENDPOINT}/{settings.MINIO_BUCKET}/{storage_key}"

        tmp_dir = tempfile.gettempdir()
        # 파일명 내 안전하지 않은 문자 처리
        safe_name = storage_key.replace("/", "_")
        tmp_path = Path(tmp_dir) / f"detect_{safe_name}"

        logger.info(f"이미지 다운로드 시작: {target_url} to {tmp_path}")

        async with httpx.AsyncClient() as client:
            resp = await client.get(target_url, timeout=30.0)
            resp.raise_for_status()
            tmp_path.write_bytes(resp.content)

        return tmp_path

    def _run_detection(self, image_path: Path) -> DetectResponse:
        results = self.model.predict(
            source=str(image_path),
            conf=settings.DETECT_CONF_THRESHOLD,
            verbose=False,
        )

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
