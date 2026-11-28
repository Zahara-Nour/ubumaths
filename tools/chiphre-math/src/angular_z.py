#!/usr/bin/env python3
"""
Redraw the lowercase z of the Shantell fonts with corners, the way it is
handwritten in maths: Shantell's z (and its three alternates) has the round
shoulder of the 2, and pupils read « 2z » as « 22 ».

The z is three strokes drawn by hand, with no bar across it (a bar fills the
z of the bold font):

1. a top stroke that starts a little low on the left and bulges slightly;
2. a sharp corner, then a diagonal that is barely hollowed;
3. a sharp corner, then a bottom stroke that rises a little at its end.

The centre line is fitted into the box of Shantell's z, then stroked with the
width of Shantell's letters and round caps and joins, as the x of round_x.py.
The z keeps the box and advance width of Shantell's z, so MathLive spacing is
unchanged. The script works in place on static/fonts/chiphre-math/ (each run
redraws the glyph from the Shantell sources, so running it twice gives the
same font). Writing to static/fonts/KaTeX_*.woff2 is refused: the original
KaTeX fonts were overwritten that way on 2026-01-20.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import List, Tuple

import pathops
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont


REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "chiphre-math"
INPUT_DIR = REPO_ROOT / "tools" / "chiphre-math" / "fonts" / "input"

# Police -> (source Shantell au même poids, épaisseur du trait des lettres de
# cette source, mesurée sur o, l, n, c) : les mêmes que pour le x de round_x.py
FONTS = {
    "KaTeX_Main-Regular": ("shantell-sans-300.ttf", 68),
    "KaTeX_Main-Italic": ("shantell-sans-300.ttf", 68),
    "KaTeX_Math-Italic": ("shantell-sans-300.ttf", 68),
    "KaTeX_Main-Bold": ("shantell-sans-bold.ttf", 153),
}

# Points de chaque courbe quadratique de la ligne centrale
SAMPLES = 30

Point = Tuple[float, float]
Box = Tuple[float, float, float, float]


def glyph_bounds(glyph_set, glyph_name: str) -> Box:
    pen = BoundsPen(glyph_set)
    glyph_set[glyph_name].draw(pen)
    return pen.bounds


def quadratic(start: Point, control: Point, end: Point) -> List[Point]:
    points = []
    for i in range(SAMPLES + 1):
        t = i / SAMPLES
        points.append(
            (
                (1 - t) ** 2 * start[0] + 2 * (1 - t) * t * control[0] + t * t * end[0],
                (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * control[1] + t * t * end[1],
            )
        )
    return points


def z_centre_line(box: Box, stroke: float) -> List[Point]:
    """Barre du haut, diagonale, barre du bas, d'un seul trait, coins nets."""
    left = box[0] + stroke / 2
    right = box[2] - stroke / 2
    bottom = box[1] + stroke / 2
    top = box[3] - stroke / 2
    width = right - left
    height = top - bottom

    top_left = (left + 0.02 * width, top - 0.06 * height)
    top_right = (right, top)
    bottom_left = (left + 0.01 * width, bottom + 0.01 * height)
    bottom_right = (right + 0.02 * width, bottom + 0.04 * height)

    top_stroke = quadratic(top_left, (left + 0.45 * width, top + 0.05 * height), top_right)
    diagonal = quadratic(top_right, (left + 0.58 * width, bottom + 0.42 * height), bottom_left)
    bottom_stroke = quadratic(bottom_left, (left + 0.5 * width, bottom - 0.05 * height), bottom_right)
    return top_stroke + diagonal[1:] + bottom_stroke[1:]


def angular_z_outline(source: TTFont, stroke: float) -> pathops.Path:
    box = glyph_bounds(source.getGlyphSet(), "z")
    line = z_centre_line(box, stroke)
    outline = pathops.Path()
    outline.moveTo(*line[0])
    for point in line[1:]:
        outline.lineTo(*point)
    outline.stroke(stroke, pathops.LineCap.ROUND_CAP, pathops.LineJoin.ROUND_JOIN, 4)
    # Les bouts ronds sont des coniques, que simplify() et les polices ignorent
    outline.convertConicsToQuads()
    outline.simplify()
    return outline


def draw_angular_z(font: TTFont, outline: pathops.Path) -> None:
    glyph_name = font.getBestCmap()[ord("z")]
    tt_pen = TTGlyphPen(None)
    outline.draw(Cu2QuPen(tt_pen, max_err=1.0, reverse_direction=True))
    glyph = tt_pen.glyph()
    glyph.recalcBounds(font["glyf"])
    font["glyf"][glyph_name] = glyph
    advance = font["hmtx"][glyph_name][0]
    font["hmtx"][glyph_name] = (advance, glyph.xMin)


def main() -> None:
    parser = argparse.ArgumentParser(description="Handwritten z with corners in the Shantell fonts")
    parser.parse_args()

    outlines = {}
    for name, (source_file, stroke) in FONTS.items():
        path = OUTPUT_DIR / f"{name}.woff2"
        if path.parent.resolve() != OUTPUT_DIR.resolve():
            raise SystemExit(f"Sortie refusée hors de {OUTPUT_DIR}: {path}")
        if (source_file, stroke) not in outlines:
            outlines[(source_file, stroke)] = angular_z_outline(TTFont(INPUT_DIR / source_file), stroke)
        font = TTFont(path)
        draw_angular_z(font, outlines[(source_file, stroke)])
        font.flavor = "woff2"
        font.save(path)
        print(f"{name}: z à coins (boîte du z de {source_file}, trait {stroke}) -> {path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
