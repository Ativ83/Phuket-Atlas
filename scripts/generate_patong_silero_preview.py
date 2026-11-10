#!/usr/bin/env python3
"""Create an isolated free Silero TTS voice preview for Patong.

Does not change the live audio or any other district.
"""
import json
import subprocess
import tempfile
import wave
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parents[1]
narration = json.loads((ROOT / "data/district-narrations-ru.json").read_text(encoding="utf-8"))["patong"]
preview = ". ".join(narration.replace("\n", " ").split(". ")[:3]).rstrip(". ") + "."
# Silero uses + directly before the stressed vowel, not a combining diacritic.
preview = preview.replace("Патонг", "Пат+онг").replace("Патонга", "Пат+онга")
torch.set_num_threads(2)
model, _ = torch.hub.load(
    repo_or_dir="snakers4/silero-models",
    model="silero_tts",
    language="ru",
    speaker="v5_6_ru",
    trust_repo=True,
)
model.to(torch.device("cpu"))
rate = 24000
audio = model.apply_tts(text=preview, speaker="aidar", sample_rate=rate)
pcm = (audio.detach().cpu().numpy().clip(-1, 1) * 32767).astype("int16")
out = ROOT / "assets/district-audio/patong-silero-test.mp3"
out.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix="silero-patong-") as directory:
    wav = Path(directory) / "speech.wav"
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "128k", str(out)], check=True)
if out.stat().st_size < 10000:
    raise RuntimeError("Silero voice preview is unexpectedly small")
print(f"Created Silero Patong test: {out.stat().st_size} bytes", flush=True)
