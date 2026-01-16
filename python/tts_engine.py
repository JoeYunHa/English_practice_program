import sys
import asyncio
import edge_tts
import os


async def generate_tts(text, filepath):
    voice = "en-US-AriaNeural"
    # caching
    if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
        print(filepath)
        return

    try:
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(filepath)
        print(filepath)  # success -> print path
    except Exception as e:
        print("Error: {e}", file=sys.stderr)


if __name__ == "__main__":
    # process parameter
    if len(sys.argv) < 3:
        sys.exit(1)

    input_text = sys.argv[1]
    output_path = sys.argv[2]

    asyncio.run(generate_tts(input_text, output_path))
