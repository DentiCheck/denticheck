"""
[?뚯씪 ??븷]
YOLOv8 紐⑤뜽???ъ슜?섏뿬 移섍낵 吏덊솚(移섏꽍, 異⑹튂, 蹂묐?)???먯??섎뒗 ?듭떖 ?쒕퉬???대옒?ㅼ엯?덈떎.
?대?吏 ?ㅼ슫濡쒕뱶, ?꾩쿂由? 異붾줎, 寃곌낵 媛怨듭쓽 ?꾩껜 ?뚯씠?꾨씪?몄쓣 愿由ы빀?덈떎.
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
    YOLOv8 湲곕컲 吏덊솚 ?먯? ?쒕퉬???대옒?ㅼ엯?덈떎.
    """
    
    def __init__(self):
        """
        ?쒕퉬??珥덇린??諛?YOLO 紐⑤뜽 濡쒕뱶
        - ?ㅼ젙??寃쎈줈?먯꽌 紐⑤뜽 媛以묒튂(.pt) ?뚯씪??遺덈윭?듬땲??
        - 紐⑤뜽 ?뚯씪???놁쓣 寃쎌슦 湲곕낯 紐⑤뜽(yolov8n.pt)???ъ슜?⑸땲??
        """
        # ?꾩옱 ?묒뾽 ?붾젆?좊━ 湲곗? 紐⑤뜽 寃쎈줈 ?ㅼ젙
        model_path = os.path.join(os.getcwd(), settings.YOLO_MODEL_PATH)
        if not os.path.exists(model_path):
            logger.warning(f"紐⑤뜽??李얠쓣 ???놁뒿?덈떎: {model_path}. 湲곕낯 紐⑤뜽(yolov8n.pt)??濡쒕뱶?⑸땲??")
            self.model = YOLO("yolov8n.pt")
        else:
            self.model = YOLO(model_path)
        logger.info(f"YOLO 紐⑤뜽 濡쒕뱶 ?꾨즺: {model_path}")

    async def _download_image(self, storage_key: str, image_url: str = None) -> Path:
        """
        ?대?吏 ?ㅼ슫濡쒕뱶 諛??꾩떆 ???        - ?곗꽑?쒖쐞 1: ?꾨떖??吏곸젒 URL(image_url) ?ъ슜
        - ?곗꽑?쒖쐞 2: storage_key(MinIO)瑜?湲곕컲?쇰줈 ?대? URL ?앹꽦
        - ?ㅼ슫濡쒕뱶???뚯씪? ?묒뾽 ?꾨즺 ????젣?????덈룄濡??꾩떆 寃쎈줈????ν빀?덈떎.
        """
        target_url = image_url
        if not target_url:
            # MinIO ?꾨줈?좎퐳 諛?URL 援ъ꽦
            protocol = "https" if settings.MINIO_SECURE else "http"
            target_url = f"{protocol}://{settings.MINIO_ENDPOINT}/{settings.MINIO_BUCKET}/{storage_key}"

        tmp_dir = tempfile.gettempdir()
        # ?뚯씪紐????덉쟾?섏? ?딆? 臾몄옄 泥섎━
        safe_name = storage_key.replace("/", "_")
        tmp_path = Path(tmp_dir) / f"detect_{safe_name}"
        
        logger.info(f"?대?吏 ?ㅼ슫濡쒕뱶 ?쒖옉: {target_url} -> {tmp_path}")
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(target_url, timeout=30.0)
            resp.raise_for_status()
            tmp_path.write_bytes(resp.content)
            
        return tmp_path

    async def detect(self, storage_key: str, image_url: str = None) -> DetectResponse:
        """
        吏덊솚 ?먯? ?ㅽ뻾 硫붿씤 硫붿꽌??        1. ?대?吏 ?ㅼ슫濡쒕뱶
        2. YOLOv8 紐⑤뜽 異붾줎(Predict)
        3. 寃곌낵 ?곗씠?곕? ?뺥빐吏??ㅽ궎留?DetectResponse)濡?蹂??        4. ?꾩떆 ?뚯씪 ??젣 諛?理쒖쥌 寃곌낵 諛섑솚
        """
        image_path = None
        try:
            # 1. ?대?吏 以鍮?            image_path = await self._download_image(storage_key, image_url)
            
            # 2. YOLO 異붾줎 (?좊ː??0.25 ?댁긽??寃껊쭔 ?먯?)
            results = self.model.predict(source=str(image_path), conf=0.25, verbose=False)
            
            detections = []
            # 吏덊솚蹂??듦퀎 ?붿빟 珥덇린??            summary = {
                "tartar": {"count": 0, "max_score": 0.0}, 
                "caries": {"count": 0, "max_score": 0.0}, 
                "lesion": {"count": 0, "max_score": 0.0}
            }
            
            if len(results) > 0:
                result = results[0]
                for box in result.boxes:
                    cls_id = int(box.cls[0])
                    label = self.model.names[cls_id]
                    
                    # ?쇰꺼 移?샇 ?쇨???留욎텛湲?(calculus -> tartar)
                    if label == "calculus": label = "tartar"
                    
                    score = float(box.conf[0])
                    # ?대?吏 ???깅퉬 醫뚰몴 [以묒떖x, 以묒떖y, ?덈퉬, ?믪씠] (0~1 ?ъ씠 媛?
                    pxy = box.xywhn[0].tolist()
                    
                    det = DetectionResult(
                        label=label,
                        confidence=score,
                        bbox=BBox(x=pxy[0], y=pxy[1], w=pxy[2], h=pxy[3])
                    )
                    detections.append(det)
                    
                    # ?붿빟 ?뺣낫(媛쒖닔 諛?理쒓퀬 ?좊ː?? ?낅뜲?댄듃
                    if label not in summary:
                        summary[label] = {"count": 0, "max_score": 0.0}
                    
                    summary[label]["count"] += 1
                    summary[label]["max_score"] = max(summary[label]["max_score"], score)
            
            return DetectResponse(detections=detections, summary=summary)
            
        except Exception as e:
            logger.error(f"?먯? ?뚯씠?꾨씪???묐룞 ?ㅽ뙣: {str(e)}")
            # ?먮윭 諛쒖깮 ???쒖뒪??以묐떒??留됯린 ?꾪빐 鍮?寃곌낵 諛섑솚
            return DetectResponse(detections=[], summary={})
        finally:
            # 4. ?ъ슜???앸궃 ?꾩떆 ?대?吏 ?뚯씪 ??젣 (?붿뒪???⑸웾 愿由?
            if image_path and image_path.exists():
                try:
                    image_path.unlink()
                except Exception:
                    pass
