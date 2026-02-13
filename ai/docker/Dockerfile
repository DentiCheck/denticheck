FROM python:3.11-slim-bullseye

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements to cache them in docker layer
# For now, we don't have requirements.txt, so we will install dependencies directly
# In production, generated requirements.txt from poetry should be used
RUN pip install --no-cache-dir \
    fastapi uvicorn[standard] pydantic pydantic-settings ultralytics torch torchvision python-multipart httpx openai \
    langchain langchain-ollama langchain-milvus langchain-community \
    langchain-huggingface \
    sentence-transformers transformers "huggingface_hub>=0.20.0" \
    pymilvus python-dotenv loguru beautifulsoup4 lxml

ENV PYTHONPATH=/app/src

COPY . .

CMD ["uvicorn", "denticheck_ai.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
