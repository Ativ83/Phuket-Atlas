#!/usr/bin/env python3
"""Generate static Russian MP3 guides from reviewed district scripts.

Usage:
    python scripts/generate_district_audio.py             # all 12
    python scripts/generate_district_audio.py bang-tao    # one district
"""
import argparse
import asyncio
import json
import re
import imageio_ffmpeg
import subprocess
import tempfile
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "district-narrations-ru.json"
OUTPUT = ROOT / "assets" / "district-audio"
VOICE = "ru-RU-DmitryNeural"
RATE = "-5%"


def split_narration(text: str, limit: int = 550) -> list[str]:
    """Use short segments to avoid Edge service dropping long requests."""
    sentences = re.split(r"(?<=[.!?])\s+", " ".join(text.split()))
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        if len(sentence) > limit:
            # Extremely long sentences are also split at spaces.
            words = sentence.split()
            sentence_parts = []
            part = ""
            for word in words:
                if len(part) + len(word) + 1 > limit and part:
                    sentence_parts.append(part)
                    part = ""
                part = (part + " " + word).strip()
            if part:
                sentence_parts.append(part)
        else:
            sentence_parts = [sentence]
        for piece in sentence_parts:
            if current and len(current) + len(piece) + 1 > limit:
                chunks.append(current)
                current = ""
            current = (current + " " + piece).strip()
    if current:
        chunks.append(current)
    return chunks


async def make_segment(text: str, destination: Path) -> None:
    for attempt in range(1, 4):
        try:
            await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(destination))
            if destination.stat().st_size < 2000:
                raise RuntimeError("Segment too small")
            return
        except Exception:
            destination.unlink(missing_ok=True)
            if attempt == 3:
                raise
            await asyncio.sleep(4 * attempt)


async def generate(slug: str, text: str) -> None:
    destination = OUTPUT / (slug + ".mp3")
    segments = split_narration(text)
    with tempfile.TemporaryDirectory(prefix="phuket-tts-") as directory:
        directory = Path(directory)
        files = []
        for index, segment in enumerate(segments):
            fragment = directory / f"part-{index:03}.mp3"
            await make_segment(segment, fragment)
            files.append(fragment)
            await asyncio.sleep(2)
        temp_output = directory / "complete.mp3"
        if len(files) == 1:
            temp_output.write_bytes(files[0].read_bytes())
        else:
            playlist = directory / "list.txt"
            playlist.write_text("".join(f"file '{part.name}'\\n" for part in files))
            subprocess.run(
                [imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-loglevel", "error",
                 "-f", "concat", "-safe", "0", "-i", str(playlist),
                 "-c:a", "libmp3lame", "-q:a", "4", "-y", str(temp_output)],
                check=True,
            )
        if temp_output.stat().st_size < 2000:
            raise RuntimeError("Combined MP3 too small")
        destination.write_bytes(temp_output.read_bytes())
        print(f"OK {slug}: {len(segments)} segments, {destination.stat().st_size} bytes", flush=True)

async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("districts", nargs="*", help="District IDs; default: all")
    parser.add_argument("--force", action="store_true", help="Regenerate existing MP3 files")
    args = parser.parse_args()
    scripts = json.loads(SOURCE.read_text(encoding="utf-8"))
    requested = args.districts or ["bang-tao", *(slug for slug in scripts if slug != "bang-tao")]
    unknown = set(requested).difference(scripts)
    if unknown:
        parser.error("Unknown district IDs: " + ", ".join(sorted(unknown)))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    failures = []
    for slug in requested:
        if (OUTPUT / (slug + ".mp3")).is_file() and not args.force:
            print(f"SKIP existing {slug}", flush=True)
            continue
        try:
            await generate(slug, scripts[slug])
        except Exception as error:
            print(f"WARNING: Could not generate {slug}: {error}", flush=True)
            failures.append(slug)
        await asyncio.sleep(4)
    print(f"Completed: {len(requested)-len(failures)}/{len(requested)} audio files; failed: {failures}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
