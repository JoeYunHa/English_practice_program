from pathlib import Path

# default settings

# 음성 설정
TTS_VOICE = "en-US-AriaNeural"
TTS_RATE = "-10%"

# 오디오 병합 설정
MERGE_PAUSE_MS = 500  # 문장 사이 무음 간격 (밀리초 단위, 500ms = 0.5초)

# 디렉토리 경로
BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_DIR = BASE_DIR / "input_texts"
OUTPUT_ROOT = BASE_DIR / "output_dist"
OUTPUT_AUDIO_DIR = OUTPUT_ROOT / "mp3"
OUTPUT_FULL_DIR = OUTPUT_ROOT / "full_audio"  # [NEW] 통합 파일 경로
CSV_FILE_PATH = OUTPUT_ROOT / "anki_import.csv"

RATE_LIMIT_SLEEP = 0.3
