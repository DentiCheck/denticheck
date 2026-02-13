"""
[파일 역할]
DentiCheck AI 서비스의 모든 환경 변수와 설정을 중앙 관리하는 파일입니다.
Pydantic Settings를 사용하여 .env 파일 또는 환경 변수로부터 값을 로드합니다.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    애플리케이션 전역 설정 클래스
    """
    ENV: str = "local" # 현재 환경 (local, dev, prod)
    API_URL: str = "http://localhost:8000" # API 서버 주소
    
    # --- YOLO 모델 관련 설정 ---
    YOLO_MODEL_PATH: str = "models/yolo/weights/best.pt" # 학습된 YOLO 가중치 파일 경로
    
    # --- MinIO(오브젝트 스토리지) 관련 설정 ---
    MINIO_ENDPOINT: str = "localhost:9000" # MinIO 서버 주소
    MINIO_ACCESS_KEY: str = "minioadmin"   # 액세스 키
    MINIO_SECRET_KEY: str = "minioadmin"   # 시크릿 키
    MINIO_BUCKET: str = "denticheck"       # 이미지가 저장된 버킷 이름
    MINIO_SECURE: bool = False             # SSL/TLS 사용 여부
    
    # .env 파일을 자동으로 로드하도록 설정
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8', extra="ignore")

# 설정 싱글톤 인스턴스 생성
settings = Settings()
