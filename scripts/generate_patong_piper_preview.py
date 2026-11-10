#!/usr/bin/env python3
"""Build a short, standalone Piper voice preview for Patong only."""
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = json.loads((ROOT / "data/district-narrations-ru.json").read_text(encoding="utf-8"))["patong"]
# Only a short excerpt for voice comparison; do not overwrite the live Patong recording.
sentences = source.replace("\n", " ").split(". ")
preview = ". ".join(sentences[:3]).rstrip(". ") + "."
model = ROOT / "tmp-piper-model/ru_RU-denis-medium.onnx"
target = ROOT / "assets/district-audio/patong-piper-test.mp3"
target.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix="piper-preview-") as scratch:
    wav = Path(scratch) / "voice.wav"
    subprocess.run(["piper", "--model", str(model), "--output_file", str(wav)], input=preview, text=True, check=True)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "128k", str(target)], check=True)
if target.stat().st_size < 10000:
    raise RuntimeError("Piper preview file is too small")
print(f"Created isolated preview {target}: {target.stat().st_size} bytes")
