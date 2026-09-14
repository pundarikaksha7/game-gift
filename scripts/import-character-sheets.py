#!/usr/bin/env python3
"""Build the local character library from the two repository sprite sheets.

The source artwork contains a baked checkerboard rather than an alpha channel.
This importer estimates that neutral backdrop, recovers soft edge alpha, crops the
authored cells, and writes only deterministic, runtime-ready PNGs.
"""

from pathlib import Path
from PIL import Image, ImageFilter
import cv2
import numpy as np
import json
import math

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "characters"


def transparent_sheet(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def save_cell(sheet: Image.Image, box, target: Path, canvas=(180, 240), pad=5):
    cell = sheet.crop(box)
    rgb = np.asarray(cell.convert("RGB"))
    chroma = rgb.max(axis=2).astype(np.int16) - rgb.min(axis=2).astype(np.int16)
    value = rgb.max(axis=2)
    seed = np.where((chroma > 13) | (value < 182), 255, 0).astype(np.uint8)
    seed = cv2.morphologyEx(seed, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8), iterations=1)
    contours, _ = cv2.findContours(seed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    matte = np.zeros_like(seed)
    for contour in contours:
        if cv2.contourArea(contour) >= 8:
            cv2.drawContours(matte, [contour], -1, 255, thickness=cv2.FILLED)
    alpha = Image.fromarray(matte).filter(ImageFilter.GaussianBlur(.55))
    cell.putalpha(alpha)
    bounds = cell.getchannel("A").getbbox()
    if not bounds:
        raise RuntimeError(f"Empty sprite cell: {box}")
    cell = cell.crop(bounds)
    scale = min((canvas[0] - pad * 2) / cell.width, (canvas[1] - pad * 2) / cell.height)
    cell = cell.resize((max(1, round(cell.width * scale)), max(1, round(cell.height * scale))), Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", canvas)
    frame.alpha_composite(cell, ((canvas[0] - cell.width) // 2, canvas[1] - cell.height - pad))
    target.parent.mkdir(parents=True, exist_ok=True)
    frame.save(target, optimize=True)


def recolor_look(source: Path, target: Path, skin_rgb, hair_rgb):
    image = Image.open(source).convert("RGBA")
    px = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = px[x, y]
            if a < 10:
                continue
            h, s, v = __import__('colorsys').rgb_to_hsv(r / 255, g / 255, b / 255)
            # Warm mid-saturation pixels are skin; saturated reds remain clothing.
            if (h < .115 or h > .97) and .14 < s < .70 and v > .34:
                shade = .58 + v * .50
                px[x, y] = tuple(min(255, round(c * shade)) for c in skin_rgb) + (a,)
            # Hair lives in the upper silhouette. Keep highlights and ink detail.
            if y < image.height * .48 and v < .62 and (s > .08 or v < .25):
                shade = .38 + v * .85
                px[x, y] = tuple(min(255, round(c * shade)) for c in hair_rgb) + (a,)
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, optimize=True)


def main():
    sheet = transparent_sheet(ROOT / "sprite-sheet.png")
    cast = transparent_sheet(ROOT / "image.png")
    OUT.mkdir(parents=True, exist_ok=True)

    # Sheet one: two coherent pose families. Rows are front, run A, run B, back.
    motion = {}
    for family, x0 in (("feminine", 0), ("masculine", 768)):
        cells = []
        for row, y0 in enumerate((8, 116, 218, 320)):
            for col in range(14):
                x1 = x0 + col * 55
                target = OUT / "motion" / family / f"r{row}-f{col:02}.png"
                save_cell(sheet, (x1, y0, min(x1 + 55, x0 + 768), y0 + 112), target)
                cells.append(str(target.relative_to(ROOT / "public")))
        motion[family] = {
            "idle": [cells[0], cells[1]],
            "run": [cells[14 + i] for i in range(9)],
            "jump": [cells[6], cells[7], cells[8], cells[9]],
        }

    # Sheet two: authored full-body cast. Coordinates deliberately stop above
    # the portrait strips, keeping names and animation previews crisp.
    hero_boxes = [
        (8, 8, 104, 289), (105, 8, 218, 289), (215, 8, 326, 289),
        (322, 8, 456, 289), (451, 8, 570, 289), (565, 8, 682, 289),
        (675, 8, 790, 289), (785, 8, 891, 289), (895, 8, 1012, 289),
        (1005, 8, 1134, 289), (1128, 8, 1240, 289), (1232, 8, 1379, 289),
        (1372, 8, 1530, 289),
    ]
    villain_boxes = [
        (5, 382, 119, 633), (112, 382, 232, 633), (224, 382, 342, 633),
        (335, 382, 457, 633), (448, 382, 568, 633), (560, 382, 681, 633),
        (672, 382, 790, 633), (782, 382, 913, 633), (912, 382, 1020, 633),
        (1010, 382, 1152, 633), (1145, 382, 1278, 633), (1270, 382, 1406, 633),
        (1398, 382, 1530, 633),
    ]
    companion_boxes = [
        (5, 735, 90, 943), (82, 735, 174, 943), (166, 735, 252, 943),
        (238, 735, 342, 943), (330, 735, 430, 943), (424, 735, 530, 943),
        (520, 735, 619, 943), (610, 735, 724, 943), (715, 735, 833, 943),
        (824, 735, 916, 943), (906, 735, 1003, 943), (994, 735, 1086, 943),
        (1077, 735, 1203, 943), (1194, 735, 1286, 943), (1278, 735, 1361, 943),
        (1352, 735, 1441, 943), (1432, 735, 1532, 943),
    ]
    for group, boxes in (("looks", hero_boxes), ("villains", villain_boxes), ("companions", companion_boxes)):
        for index, box in enumerate(boxes, 1):
            save_cell(cast, box, OUT / group / f"{group[:-1]}-{index:02}.png")

    skins = {"porcelain": (255, 211, 184), "peach": (238, 174, 133), "golden": (211, 143, 91),
             "caramel": (174, 108, 66), "cocoa": (126, 75, 52), "deep": (84, 49, 40)}
    hairs = {"black": (38, 34, 39), "brown": (91, 53, 39), "blonde": (218, 169, 91), "pink": (205, 76, 126)}
    for index in range(1, len(hero_boxes) + 1):
        source = OUT / "looks" / f"look-{index:02}.png"
        for skin, skin_rgb in skins.items():
            for hair, hair_rgb in hairs.items():
                recolor_look(source, OUT / "variants" / f"look-{index:02}-{skin}-{hair}.png", skin_rgb, hair_rgb)

    manifest = {"version": 2, "source": ["sprite-sheet.png", "image.png"], "motion": motion,
                "counts": {"looks": len(hero_boxes), "variants": len(hero_boxes) * len(skins) * len(hairs),
                           "villains": len(villain_boxes), "companions": len(companion_boxes)}}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Built {sum(manifest['counts'].values()) + 112} sprites in {OUT}")


if __name__ == "__main__":
    main()
