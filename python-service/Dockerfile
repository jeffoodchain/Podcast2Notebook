# faster-whisper requires Python 3.13 — ctranslate2 has no 3.14 wheels.
FROM python:3.13-slim
WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py ./

EXPOSE 8000
# No --reload in containers; the whisper model loads once at import time.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
