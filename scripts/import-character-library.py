#!/usr/bin/env python3
"""Crop the authored full-body cast from the single transparent character sheet."""

from pathlib import Path
from PIL import Image
import json
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
LIBRARY = ROOT / "public" / "assets" / "characters"
SOURCE = LIBRARY / "source" / "characters.webp"
SPRITES = LIBRARY / "sprites"

ROWS = [(0, 285), (285, 480), (480, 706)]


def main():
    sheet = Image.open(SOURCE).convert("RGBA")
    SPRITES.mkdir(parents=True, exist_ok=True)
    for old_sprite in SPRITES.glob("character-*.webp"):
        old_sprite.unlink()
    entries = []
    index = 1
    alpha = np.asarray(sheet.getchannel("A"))
    for top, bottom in ROWS:
        foreground = (alpha[top:bottom] > 200).astype(np.uint8)
        count, labels, stats, _ = cv2.connectedComponentsWithStats(foreground)
        components = [(label, *stats[label]) for label in range(1, count) if stats[label, cv2.CC_STAT_AREA] > 500]
        components.sort(key=lambda item: item[1])
        for label, left, y, width, height, _area in components:
            # Use the opaque character as a seed, then expand into its own soft edge.
            component = (labels == label).astype(np.uint8)
            mask = cv2.dilate(component, np.ones((9, 9), np.uint8), iterations=1)
            masked_alpha = alpha[top:bottom] * mask
            rgba = np.asarray(sheet.crop((0, top, sheet.width, bottom))).copy()
            rgba[:, :, 3] = masked_alpha
            isolated = Image.fromarray(rgba, "RGBA")
            cell = isolated.crop((left, y, left + width, y + height))
            bounds = cell.getchannel("A").getbbox()
            if not bounds:
                raise RuntimeError(f"Empty character cell {index}")
            cell = cell.crop(bounds)
            canvas = Image.new("RGBA", (240, 300))
            scale = min(230 / cell.width, 290 / cell.height)
            cell = cell.resize((round(cell.width * scale), round(cell.height * scale)), Image.Resampling.LANCZOS)
            canvas.alpha_composite(cell, ((240 - cell.width) // 2, 295 - cell.height))
            name = f"character-{index:02}.webp"
            canvas.save(SPRITES / name, "WEBP", lossless=True, method=6)
            entries.append({"id": name.removesuffix(".webp"), "file": f"sprites/{name}"})
            index += 1
    manifest = {"version": 1, "source": "source/characters.webp", "characters": entries}
    (LIBRARY / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Built {len(entries)} characters from {SOURCE}")


if __name__ == "__main__":
    main()
