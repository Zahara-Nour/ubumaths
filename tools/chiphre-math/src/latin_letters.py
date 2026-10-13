#!/usr/bin/env python3
"""
Latin capitals redrawn in smooth strokes, for KaTeX_Math-Italic (letters of the
formulas), KaTeX_Main-Regular and KaTeX_Main-Italic.

replace_glyphs.py copies Shantell's letters as they are. Its P is too rounded at
the top left: unlike B D F it has no corner, and in a formula it can be read as
ρ or p. It is drawn here like the curvy Greek letters (greek_letters.py):
Catmull-Rom strokes through hand-placed points, stroked with the width of
Shantell's letters and round ends:

- P: the stem leans to the left like Shantell's, and keeps its curved foot (the
  points of the lower half are the middle of Shantell's stroke); the bowl starts
  with a short lead-in at the top left, making a corner with the stem.

The points are in Shantell's own coordinates (the copied letters are not moved
nor rescaled), and each glyph keeps the advance it has in the font.

Run after replace_glyphs.py and before build_typst_math_font.py. The script
works in place on static/fonts/chiphre-math/ and redraws each glyph from
scratch, so running it twice gives the same font. Writing to
static/fonts/KaTeX_*.woff2 is refused: the original KaTeX fonts were
overwritten that way on 2026-01-20.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from fontTools.ttLib import TTFont

# Les scripts voisins, même lancé en mode isolé (python -I)
sys.path.insert(0, str(Path(__file__).resolve().parent))

from greek_letters import BASE, strokes  # noqa: E402
from replace_delimiters import put_glyph  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "chiphre-math"
TARGETS = ["KaTeX_Math-Italic", "KaTeX_Main-Regular", "KaTeX_Main-Italic"]

# Milieu du trait de la hampe du P de Shantell, de la patte courbée à mi-hauteur
P_FOOT = [(170, BASE), (168, 60), (165, 120), (152, 200), (135, 280), (122, 330)]

# Lettre -> traits (points des lignes centrales, dans le repère de Shantell)
LETTERS = {
    "P": [
        P_FOOT + [(100, 420), (82, 540), (70, 665)],
        [(15, 630), (110, 672), (250, 690), (370, 670), (455, 595), (460, 470), (375, 385),
         (225, 352), (118, 345)],
    ],
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Latin capitals redrawn in smooth strokes")
    parser.parse_args()

    for name in TARGETS:
        path = OUTPUT_DIR / f"{name}.woff2"
        if path.parent.resolve() != OUTPUT_DIR.resolve():
            raise SystemExit(f"Sortie refusée hors de {OUTPUT_DIR}: {path}")
        font = TTFont(path)
        for char, lines in LETTERS.items():
            advance = font["hmtx"][font.getBestCmap()[ord(char)]][0]
            put_glyph(font, ord(char), strokes(*lines), advance)
        font.flavor = "woff2"
        font.save(path)
        print(f"{name}: {' '.join(LETTERS)} -> {path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
