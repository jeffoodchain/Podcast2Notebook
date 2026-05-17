import os
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from faster_whisper import WhisperModel
import uvicorn
from typing import Optional, List

app = FastAPI(title="Podcast2Notebook Transcription Service")
transcription_progress = {} # Store progress as { file_path: { current_time: float, total_time: float } }

# Use 'small' model by default for CPU capability on MVP. Can be changed via env.
MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "small")
# Run on CPU for broad compatibility unless GPU is requested
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

print(f"Loading faster-whisper model '{MODEL_SIZE}' on {DEVICE}...")
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
print("Model loaded successfully.")

class TranscribeRequest(BaseModel):
    file_path: str
    language: Optional[str] = None

class Segment(BaseModel):
    start: float
    end: float
    text: str

class TranscribeResponse(BaseModel):
    text: str
    language: str
    segments: List[Segment]

def _file_signature(path: str) -> str:
    """Identifies an audio file by size + mtime, used to invalidate stale cache."""
    st = os.stat(path)
    return f"{st.st_size}:{int(st.st_mtime)}"

@app.post("/transcribe", response_model=TranscribeResponse)
def transcribe_audio(request: TranscribeRequest):
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
        
    # The cache is keyed by file path, but a path can be reused for a different
    # episode (e.g. same podcast, same day). Tag the cache with the audio file's
    # size + mtime so a reused path with new content is re-transcribed instead
    # of silently returning the previous episode's transcript.
    cache_path = request.file_path + ".json"
    file_sig = _file_signature(request.file_path)
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                cached = json.load(f)
            if cached.get("_cache_sig") == file_sig:
                print(f"Loading cached transcription for {request.file_path}...")
                return cached
            print(f"Cache stale for {request.file_path}, re-transcribing...")
        except Exception as e:
            print(f"Cache read error: {e}")

    try:
        print(f"Transcribing {request.file_path}...")
        segments_generator, info = model.transcribe(
            request.file_path, 
            beam_size=5, 
            language=request.language
        )
        
        full_text = ""
        segments = []
        
        for segment in segments_generator:
            segment_data = Segment(
                start=segment.start,
                end=segment.end,
                text=segment.text
            )
            segments.append(segment_data)
            full_text += segment.text + " "
            
            # Update progress
            transcription_progress[request.file_path] = {
                "current_time": segment.end,
                "total_time": info.duration
            }
            
            print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")
            
        response_data = {
            "text": full_text.strip(),
            "language": info.language,
            "segments": [s.model_dump() for s in segments],
            "_cache_sig": file_sig,
        }

        # Save to cache
        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(response_data, f, ensure_ascii=False)
        except Exception as e:
            print(f"Cache write error: {e}")

        return response_data
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/progress")
def get_progress(file_path: str):
    print(f"Progress request for: {file_path}")
    progress = transcription_progress.get(file_path)
    if not progress:
        # Fuzzy match in case of path separator differences or missing extensions
        for key in transcription_progress.keys():
            base_key = os.path.basename(key)
            base_query = os.path.basename(file_path)
            if base_key == base_query or base_key.startswith(base_query):
                print(f"Fuzzy match found: {key}")
                return transcription_progress[key]
        return {"status": "not_found"}
    return progress

@app.get("/health")
def health_check():
    return {"status": "ok", "model": MODEL_SIZE, "device": DEVICE}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
