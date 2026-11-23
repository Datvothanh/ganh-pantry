"""Cut-out jar photos (rembg output, 1024x1024 RGBA) -> public/jars/<handle>.webp.

All source photos share one framing, so one fixed crop keeps the label cylinder
parameters valid for every jar. Output is 630x1013 (same aspect as the reference).

usage: python scripts/jars.py <rembg_out_dir>
"""
import sys
from pathlib import Path

from PIL import Image

OUT_W, OUT_H = 630, 1013
CROP_H = 900
CROP_TOP = 76
CROP_W = round(CROP_H * OUT_W / OUT_H)
CENTER_X = 512

src = Path(sys.argv[1])
dst = Path(__file__).resolve().parent.parent / "public" / "jars"
dst.mkdir(parents=True, exist_ok=True)

for p in sorted(src.glob("*.png")):
    im = Image.open(p).convert("RGBA")
    a = im.getchannel("A").point(lambda v: 0 if v < 12 else v)
    im.putalpha(a)
    box = (CENTER_X - CROP_W // 2, CROP_TOP, CENTER_X - CROP_W // 2 + CROP_W, CROP_TOP + CROP_H)
    out = im.crop(box).resize((OUT_W, OUT_H), Image.LANCZOS)
    solid = out.getchannel("A").point(lambda v: 255 if v > 200 else 0).getbbox()
    out.save(dst / f"{p.stem}.webp", "WEBP", quality=88, method=6)
    print(p.stem, "jar bbox in output:", solid)
