import nltk
import re
from pathlib import Path
from pydub import AudioSegment 


def setup_environment(dirs: list[Path]):
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        nltk.download("punkt", quiet=True)


def sanitize_filename(name: str) -> str:
    clean_name = re.sub(r"[^\w\s-]", "", name)
    return clean_name.replace(" ", "_")


def load_text_file(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def split_into_sentences(text: str) -> list[str]:
    return nltk.sent_tokenize(text)


# [NEW] 오디오 병합 함수
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

            # 마지막 문장 뒤에는 무음을 넣지 않음
            if i < len(file_list) - 1:
                combined += silence
        except Exception as e:
            print(f"      ⚠️ Failed to merge {file_path.name}: {e}")

    # 통합 파일 저장
    combined.export(str(output_path), format="mp3")
    print(f"      ✨ Full audio saved!")
