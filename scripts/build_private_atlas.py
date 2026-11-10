#!/usr/bin/env python3
"""Prepare a STRICTLY client-only asset bundle for private Cloudflare Worker.

Never copy the GitHub repository wholesale: it contains scripts, workflow
configuration, and backend source which must never become static assets.
"""
from pathlib import Path
import shutil
import sys

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"private-dist"
TOP=(
    "index.html", "app.js", "broker-ai.js", "satellite-cache-sw.js",
    "phuket_full.webp", "phuket_game_clean.png..PNG", "phuket_overview.jpg",
    "IMG_5967.png", "6A8F1440-3C22-4E8E-B596-7E5B80E6BDB1.png",
    "3d-preview.html", "editor.html"
)
DIRS=("assets", "data", "presentations")
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()
for f in TOP:
    p=ROOT/f
    if p.is_file():shutil.copy2(p,OUT/f)
    elif f in ("index.html","app.js","broker-ai.js"):
        sys.exit(f"Missing required file: {f}")
for p in ROOT.glob("hd_*.webp"):shutil.copy2(p,OUT/p.name)
for p in ROOT.glob("tile_*.jpg"):shutil.copy2(p,OUT/p.name)
for d in DIRS:
    if (ROOT/d).is_dir():shutil.copytree(ROOT/d,OUT/d)
# Private assets should never include backend code, credentials, or internal git metadata.
for p in OUT.rglob("*"):
    if p.is_file() and (p.name.startswith(".env") or p.name.startswith(".dev.vars") or p.name==".git"):
        sys.exit(f"Unexpected secret-like file in assets: {p}")
size=sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file())
print(f"Private Atlas assets: {sum(1 for p in OUT.rglob('*') if p.is_file())} files, {size / 1048576:.1f} MiB")
