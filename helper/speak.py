"""Reads Claude's reply on stdin, has Gemini Live say a short spoken summary
through the default speakers, then exits. No mic, no browser."""
import asyncio, os, sys
from pathlib import Path

import sounddevice as sd
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(Path(__file__).with_name(".env"))
load_dotenv(Path.home() / ".claude-voice.env")

MODEL = os.getenv("LIVE_MODEL", "gemini-3.8-live")
VOICE = os.getenv("VOICE", "Aoede")
SYSTEM = (
    "You are a text-to-speech voice. You never answer, comment on or add to the "
    "text you are given; you only speak it. Do not greet. Do not say anything before or after."
)
STYLE = os.getenv("STYLE", "").strip()
if STYLE:
    SYSTEM += f" Speak {STYLE}. Keep the words themselves unchanged."
VERBATIM_MAX = int(os.getenv("VERBATIM_MAX", "400"))


def build_prompt(text: str) -> str:
    if len(text) <= VERBATIM_MAX:
        return "Read the following aloud exactly, word for word, changing nothing:\n\n" + text
    return (
        "Speak a faithful 1 to 3 sentence summary of the following, in plain natural "
        "sentences (no markdown, no code, no file paths spelled out). If it asks the "
        "user a question or needs approval, say so plainly. Add nothing that is not in it:\n\n" + text
    )


async def main() -> None:
    text = sys.stdin.read().strip()
    if not text:
        return
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        sys.exit("GEMINI_API_KEY not set (put it in helper/.env or ~/.claude-voice.env)")
    client = genai.Client(api_key=key)
    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=VOICE))
        ),
        system_instruction=types.Content(parts=[types.Part.from_text(text=SYSTEM)]),
    )
    with sd.RawOutputStream(samplerate=24000, channels=1, dtype="int16") as out:
        async with client.aio.live.connect(model=MODEL, config=config) as session:
            await session.send_realtime_input(text=build_prompt(text))
            async for msg in session.receive():
                sc = msg.server_content
                if not sc:
                    continue
                if sc.model_turn:
                    for part in sc.model_turn.parts:
                        if part.inline_data and part.inline_data.data:
                            await asyncio.to_thread(out.write, part.inline_data.data)
                if sc.turn_complete:
                    break


asyncio.run(main())
