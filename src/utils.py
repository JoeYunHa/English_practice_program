import nltk
import re
from pathlib import Path
from pydub import AudioSegment


def setup_environment(dirs: list[Path]):
    """필요한 디렉토리를 생성하고 NLTK 데이터를 다운로드합니다."""
    # 1. 디렉토리 생성
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)

    # 2. NLTK 데이터 다운로드 (punkt_tab 필수)
    required_nltk_packages = ["punkt", "punkt_tab"]

    for package in required_nltk_packages:
        try:
            # tokenizer 데이터는 'tokenizers/패키지명' 경로에 위치함
            nltk.data.find(f"tokenizers/{package}")
        except LookupError:
            print(f"📥 Downloading NLTK data: {package}...")
            nltk.download(package, quiet=True)


def sanitize_filename(name: str) -> str:
    """파일명으로 사용할 수 없는 문자를 제거하고 공백을 언더바(_)로 치환합니다."""
    clean_name = re.sub(r"[^\w\s-]", "", name)
    return clean_name.replace(" ", "_")


def load_text_file(path: Path) -> str:
    """텍스트 파일을 읽어 반환합니다."""
    return path.read_text(encoding="utf-8")


def split_into_sentences(text: str) -> list[str]:
    """텍스트를 문장 단위로 분리합니다."""
    return nltk.sent_tokenize(text)


def merge_audio_files(file_list: list[Path], output_path: Path, pause_ms: int = 500):
    """
    생성된 문장 MP3 파일들을 하나로 병합합니다.
    각 문장 사이에 pause_ms 만큼의 무음을 추가합니다.
    """
    if not file_list:
        return

    combined = AudioSegment.empty()
    silence = AudioSegment.silent(duration=pause_ms)

    print(f"   🧩 Merging {len(file_list)} files into '{output_path.name}'...")

    for i, file_path in enumerate(file_list):
        try:
            sound = AudioSegment.from_mp3(str(file_path))
            combined += sound

            if i < len(file_list) - 1:
                combined += silence
        except Exception as e:
            print(f"      ⚠️ Failed to merge {file_path.name}: {e}")

    try:
        combined.export(str(output_path), format="mp3")
        print(f"      ✨ Full audio saved!")
    except Exception as e:
        print(f"      ❌ FFmpeg Error: {e}")
        print("      👉 Please install FFmpeg to enable audio merging.")
