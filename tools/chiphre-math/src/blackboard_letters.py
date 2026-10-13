#!/usr/bin/env python3
"""
ℕ ℤ ℝ (\\mathbb N, Z, R) drawn in smooth strokes, for KaTeX_AMS-Regular.

redraw_symbols.py doubles a stroke of Shantell's own letter; for N Z R the
added straight line crossed the letter (the diagonal of N, the bowl of R) or
doubled only part of the diagonal of Z. They are drawn here like the curvy
Greek letters (greek_letters.py): Catmull-Rom strokes through hand-placed
points, stroked with the width of Shantell's letters and round ends, as the
letters are handwritten on a blackboard:

- ℕ: two stems side by side, the diagonal from the top of the second one, the
  right stem;
- ℤ: the top bar, two parallel diagonals down to the bottom bar;
- ℝ: two stems side by side, the bowl and the leg starting from the second one.

ℚ ℂ keep the doubled stroke of redraw_symbols.py. Like the other letters, each
one keeps Shantell's size and baseline, centred on the KaTeX glyph it replaces
and narrowed only when wider than its advance.

Run after redraw_symbols.py and before build_typst_math_font.py. The script
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

from greek_letters import CAP, BASE, placed, strokes  # noqa: E402
from replace_delimiters import put_glyph, reference_glyph  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "chiphre-math"
ORIGINAL_DIR = REPO_ROOT / "static" / "fonts" / "katex-original"

# Lettre -> traits (points des lignes centrales ; la main tremble un peu : les
# traits droits passent par un point légèrement décalé)
LETTERS = {
    "N": [
        [(95, BASE), (88, 300), (92, CAP)],
        [(215, BASE), (210, 320), (215, CAP)],
        [(215, CAP), (380, 360), (560, BASE)],
        [(560, BASE), (566, 380), (560, CAP)],
    ],
    "Z": [
        [(85, CAP - 5), (330, CAP + 6), (590, CAP)],
        [(470, CAP), (280, 350), (85, BASE)],
        [(590, CAP), (400, 350), (205, BASE)],
        [(85, BASE), (340, BASE - 4), (600, BASE + 6)],
    ],
    "R": [
        [(95, BASE), (90, 330), (95, CAP)],
        [(210, BASE), (206, 330), (210, CAP)],
        [(95, CAP), (300, CAP + 4), (430, CAP - 10), (530, 600), (545, 500), (490, 405),
         (360, 365), (210, 365)],
        [(330, 365), (450, 200), (580, BASE)],
    ],
}


def main() -> None:
    parser = argparse.ArgumentParser(description="ℕ ℤ ℝ drawn in smooth strokes")
    parser.parse_args()

    name = "KaTeX_AMS-Regular"
    path = OUTPUT_DIR / f"{name}.woff2"
    if path.parent.resolve() != OUTPUT_DIR.resolve():
        raise SystemExit(f"Sortie refusée hors de {OUTPUT_DIR}: {path}")
    font = TTFont(path)
    reference = TTFont(ORIGINAL_DIR / f"{name}.woff2")
    for char, lines in LETTERS.items():
        box, advance = reference_glyph(reference, ord(char))
        put_glyph(font, ord(char), placed(strokes(*lines), box, advance), advance)
    font.flavor = "woff2"
    font.save(path)
    print(f"{name}: ℕ ℤ ℝ -> {path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
