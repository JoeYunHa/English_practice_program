import asyncio
import csv
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

import config
import utils
from tts_service import TTSService


async def process_file(txt_file: Path, tts_service: TTSService, writer):
    source_name = txt_file.stem
    safe_source_name = utils.sanitize_filename(source_name)

    print(f"\n📄 Reading: {txt_file.name}")
    text = utils.load_text_file(txt_file)
    sentences = utils.split_into_sentences(text)

    # [NEW] 병합을 위해 생성된 파일 경로들을 저장할 리스트
    generated_files = []

    for i, sentence in enumerate(sentences, start=1):
        if not sentence.strip():
            continue

        audio_filename = f"{safe_source_name}_{i:03d}.mp3"
        audio_path = config.OUTPUT_AUDIO_DIR / audio_filename

        is_success = await tts_service.generate_file(sentence, audio_path)

        if is_success:
            row = [sentence, "", f"[sound:{audio_filename}]", safe_source_name]
            writer.writerow(row)

            # [NEW] 성공한 파일 경로 리스트에 추가
            generated_files.append(audio_path)

            await asyncio.sleep(config.RATE_LIMIT_SLEEP)

        print(".", end="", flush=True)

    # [NEW] 모든 문장 처리가 끝나면 통합 파일 생성 호출
    if generated_files:
        full_audio_name = f"{safe_source_name}_FULL.mp3"
        full_audio_path = config.OUTPUT_FULL_DIR / full_audio_name

        # utils 모듈의 병합 함수 실행 (Blocking IO이므로 비동기 밖에서 실행되거나 별도 처리)
        # pydub 작업이 무거울 수 있으므로, 간단히 호출
        utils.merge_audio_files(generated_files, full_audio_path, config.MERGE_PAUSE_MS)

    print(f" Done!")


async def main():
    # 환경 초기화 (FULL_DIR 추가)
    utils.setup_environment(
        [config.INPUT_DIR, config.OUTPUT_AUDIO_DIR, config.OUTPUT_FULL_DIR]
    )

    tts = TTSService(voice=config.TTS_VOICE, rate=config.TTS_RATE)

    txt_files = list(config.INPUT_DIR.glob("*.txt"))
    if not txt_files:
        print(f"❌ No input files found in {config.INPUT_DIR}")
        return

    print(f"🚀 Batch Processing Started: {len(txt_files)} files.")

    with open(config.CSV_FILE_PATH, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        for txt_file in txt_files:
            await process_file(txt_file, tts, writer)

    print("\n" + "=" * 50)
    print("✅ All tasks completed.")
    print(f"📂 Split Audio: {config.OUTPUT_AUDIO_DIR}")
    print(f"🎧 Full Audio:  {config.OUTPUT_FULL_DIR}")
    print(f"📝 Anki CSV:    {config.CSV_FILE_PATH}")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
