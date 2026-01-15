import edge_tts
import asyncio
from pathlib import Path


class TTSService:
    def __init__(self, voice: str, rate: str):
        self.voice = voice
        self.rate = rate

    async def generate_file(self, text: str, output_path: Path) -> bool:
        """
        단일 문장에 대한 오디오 파일을 생성합니다.
        성공 시 True, 실패 시 False 반환
        """
        # 이미 파일이 존재하면 건너뛰기 (캐싱 효과)
        if output_path.exists():
            return True

        try:
            communicate = edge_tts.Communicate(text, self.voice, rate=self.rate)
            await communicate.save(str(output_path))
            return True
        except Exception as e:
            print(f"❌ TTS Generation Error: {e}")
            return False
