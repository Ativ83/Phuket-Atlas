#!/usr/bin/env python3
"""Generate static Russian MP3 guides from reviewed district scripts.

Usage:
    python scripts/generate_district_audio.py             # all 12
    python scripts/generate_district_audio.py bang-tao    # one district
"""
import argparse
import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "district-narrations-ru.json"
OUTPUT = ROOT / "assets" / "district-audio"
VOICE = "ru-RU-DmitryNeural"
RATE = "-5%"


async def generate(slug: str, text: str) -> None:
    destination = OUTPUT / (slug + ".mp3")
    for attempt in range(1, 3):
        try:
            temporary = destination.with_suffix(".mp3.part")
            await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(temporary))
            if temporary.stat().st_size < 2000:
                raise RuntimeError("Generated MP3 unexpectedly small")
            temporary.replace(destination)
            print(f"OK {slug}: {destination.stat().st_size} bytes")
            return
        except Exception:
            temporary.unlink(missing_ok=True)
            if attempt == 2:
                raise
            await asyncio.sleep(2 * attempt)


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
