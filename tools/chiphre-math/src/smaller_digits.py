#!/usr/bin/env python3
"""
Digits of KaTeX_Main-Regular, smaller and closer together than Shantell's.

Shantell's digits are as tall as its capitals (711) and take 0.7 em each (the
1 takes 0.4): in a formula, a number spread out and stood out against the
letters and the operators (measured on 2026-10-13: « 2024 » 280 px wide at
100 px, against 200 px with KaTeX). Each digit is

- scaled to DIGIT_SCALE of its size, from its baseline;
- then thickened back to the stroke of the letters: the outline is stroked
  with the width the scaling took away (half on each side);
- centred in an advance of DIGIT_ADVANCE times Shantell's.

+ − = keep their size (decided with David on 2026-10-13).

MathLive takes digits from KaTeX_Main-Regular (class ML__cmr), whatever the
letter style. Run after replace_symbols.py and before build_typst_math_font.py,
which copies these digits into Chiphre Math. The script works in place on
static/fonts/chiphre-math/ and redraws each digit from the Shantell source,
so running it twice gives the same font. Writing to static/fonts/KaTeX_*.woff2
is refused: the original KaTeX fonts were overwritten that way on 2026-01-20.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pathops
from fontTools.ttLib import TTFont

# Les scripts voisins, même lancé en mode isolé (python -I)
sys.path.insert(0, str(Path(__file__).resolve().parent))

from greek_letters import glyph, moved  # noqa: E402
from replace_delimiters import STROKE, put_glyph  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "chiphre-math"
SHANTELL = REPO_ROOT / "tools" / "chiphre-math" / "fonts" / "input" / "shantell-sans-300.ttf"

# Taille des chiffres et chasse, par rapport à ceux de Shantell (variante B,
# choisie par David parmi trois essais : 100 %/0,8, 90 %/0,8, 85 %/0,75)
DIGIT_SCALE = 0.9
DIGIT_ADVANCE = 0.8


def smaller_digit(source: TTFont, char: str) -> tuple[pathops.Path, int]:
    outline = moved(glyph(source, char), (DIGIT_SCALE, 0, 0, DIGIT_SCALE, 0, 0))
    # Le trait réduit est regagné : le contour, épaissi de ce que l'échelle a retiré
    ring = pathops.Path()
    outline.draw(ring.getPen())
    ring.stroke(STROKE * (1 - DIGIT_SCALE), pathops.LineCap.ROUND_CAP, pathops.LineJoin.ROUND_JOIN, 4)
    ring.convertConicsToQuads()
    outline = pathops.op(outline, ring, pathops.PathOp.UNION)

    advance = round(source["hmtx"][source.getBestCmap()[ord(char)]][0] * DIGIT_ADVANCE)
    x_min, _, x_max, _ = outline.bounds
    return moved(outline, (1, 0, 0, 1, advance / 2 - (x_min + x_max) / 2, 0)), advance


def main() -> None:
    parser = argparse.ArgumentParser(description="Smaller, closer digits in KaTeX_Main-Regular")
    parser.parse_args()

    source = TTFont(SHANTELL)
    name = "KaTeX_Main-Regular"
    path = OUTPUT_DIR / f"{name}.woff2"
    if path.parent.resolve() != OUTPUT_DIR.resolve():
        raise SystemExit(f"Sortie refusée hors de {OUTPUT_DIR}: {path}")
    font = TTFont(path)
    for char in "0123456789":
        outline, advance = smaller_digit(source, char)
        put_glyph(font, ord(char), outline, advance)
    font.flavor = "woff2"
    font.save(path)
    print(f"{name}: 0-9 à {DIGIT_SCALE:.0%}, chasse x{DIGIT_ADVANCE} -> {path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
