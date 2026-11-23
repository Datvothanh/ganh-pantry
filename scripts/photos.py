"""Build public/photos/<handle>/ from staged AI photos plus a studio packshot.

- <stage>/webp/<handle>-ing-*.webp and <stage>/<handle>-jar-*.jpg (AI, optional) are copied/encoded.
- 10-packshot.webp is rendered here: the labelled composite (public/products/<handle>.webp)
  on the product's card colour with a soft contact shadow.

usage: python scripts/photos.py <stage_dir>
"""
import re
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
STAGE = Path(sys.argv[1])
PRODUCTS = (ROOT / "src" / "content" / "products.ts").read_text(encoding="utf-8")


def card_colour(handle: str) -> tuple[int, int, int]:
    block = PRODUCTS.split(f'handle: "{handle}"', 1)[1]
    hexv = re.search(r'card: "#([0-9A-Fa-f]{6})"', block).group(1)
    return tuple(int(hexv[i : i + 2], 16) for i in (0, 2, 4))


def packshot(handle: str, out: Path) -> None:
    W, H = 1400, 1050
    bg = Image.new("RGBA", (W, H), card_colour(handle) + (255,))
    jar = Image.open(ROOT / "public" / "products" / f"{handle}.webp").convert("RGBA")
    jh = round(H * 0.8)
    jar = jar.resize((round(jar.width * jh / jar.height), jh), Image.LANCZOS)
    x, y = (W - jar.width) // 2, round(H * 0.08)
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ell = Image.new("L", (W, H), 0)
    from PIL import ImageDraw

    ImageDraw.Draw(ell).ellipse(
        (x + jar.width * 0.08, y + jh - 34, x + jar.width * 0.92, y + jh + 18), fill=120
    )
    ell = ell.filter(ImageFilter.GaussianBlur(18))
    shadow.putalpha(ell)
    bg.alpha_composite(shadow)
    bg.alpha_composite(jar, (x, y))
    bg.convert("RGB").save(out, "WEBP", quality=84, method=6)


handles = re.findall(r'handle: "([a-z0-9-]+)"', PRODUCTS)
for h in handles:
    dst = ROOT / "public" / "photos" / h
    dst.mkdir(parents=True, exist_ok=True)
    for f in sorted((STAGE / "webp").glob(f"{h}-ing-*.webp")):
        shutil.copyfile(f, dst / f"20-{f.name}")
    for f in sorted(STAGE.glob(f"{h}-jar-*.jpg")):
        Image.open(f).convert("RGB").save(dst / f"00-{f.stem}.webp", "WEBP", quality=84, method=6)
    packshot(h, dst / "10-packshot.webp")
    print(h, sorted(p.name for p in dst.iterdir()))
