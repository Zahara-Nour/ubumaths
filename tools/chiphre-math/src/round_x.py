#!/usr/bin/env python3
"""
Redraw the lowercase x of the Shantell fonts as a « ɔc », the way it is
handwritten in maths: Shantell's x (and its three alternates) is a straight
cross that pupils confuse with the multiplication sign ×.

The x is built from Shantell's own c, so that it keeps the font's style
(wide open arc, slightly uneven curvature, plain round ends, no hooks):

1. the centre line of the c is measured by casting rays from its centre and
   taking the middle of the stroke on each ray;
2. that line, and its mirror image (ɔ), are fitted side by side into the box
   of Shantell's x, touching at the centre;
3. both are stroked with the width of Shantell's letters and round caps, then
   merged into one outline.

The x keeps the box and advance width of Shantell's x, so MathLive spacing is
unchanged. The script works in place on static/fonts/chiphre-math/ (each run
redraws the glyph from the Shantell sources, so running it twice gives the
same font). Writing to static/fonts/KaTeX_*.woff2 is refused: the original
KaTeX fonts were overwritten that way on 2026-01-20.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path
from typing import List, Tuple

import pathops
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.pointInsidePen import PointInsidePen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont


REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "chiphre-math"
INPUT_DIR = REPO_ROOT / "tools" / "chiphre-math" / "fonts" / "input"

# Police -> (source Shantell au même poids, épaisseur du trait des lettres de
# cette source, mesurée sur o, l, n, c)
FONTS = {
    "KaTeX_Main-Regular": ("shantell-sans-300.ttf", 68),
    "KaTeX_Main-Italic": ("shantell-sans-300.ttf", 68),
    "KaTeX_Math-Italic": ("shantell-sans-300.ttf", 68),
    "KaTeX_Main-Bold": ("shantell-sans-bold.ttf", 153),
}

# Rayons lancés depuis le centre du c : un tous les RAY_STEP degrés
RAY_STEP = 2
# Un rayon dont le trait est plus fin que cette fraction de l'épaisseur coupe un
# bout arrondi : on l'écarte, le bout sera refait par le tracé
CAP_RATIO = 0.85

Point = Tuple[float, float]
Box = Tuple[float, float, float, float]


def glyph_bounds(glyph_set, glyph_name: str) -> Box:
    pen = BoundsPen(glyph_set)
    glyph_set[glyph_name].draw(pen)
    return pen.bounds


def c_centre_line(source: TTFont, stroke: float) -> List[Point]:
    """Ligne centrale du c, du bout du haut au bout du bas, en passant par le dos."""
    glyph_set = source.getGlyphSet()
    glyph = glyph_set["c"]
    x_min, y_min, x_max, y_max = glyph_bounds(glyph_set, "c")
    centre_x, centre_y = (x_min + x_max) / 2, (y_min + y_max) / 2
    reach = math.hypot(x_max - x_min, y_max - y_min)

    def inside(x: float, y: float) -> bool:
        pen = PointInsidePen(glyph_set, (x, y))
        glyph.draw(pen)
        return pen.getResult()

    points: List[Point] = []
    # Le c s'ouvre à droite (vers 0°) : de 0° à 360°, on va du bout du haut au bout du bas
    for degrees in range(0, 360, RAY_STEP):
        angle = math.radians(degrees)
        cos_a, sin_a = math.cos(angle), math.sin(angle)
        crossings = []
        was_inside = False
        for radius in range(0, int(reach)):
            now_inside = inside(centre_x + radius * cos_a, centre_y + radius * sin_a)
            if now_inside != was_inside:
                crossings.append(radius)
            was_inside = now_inside
        if len(crossings) < 2 or crossings[1] - crossings[0] < CAP_RATIO * stroke:
            continue
        middle = (crossings[0] + crossings[1]) / 2
        points.append((centre_x + middle * cos_a, centre_y + middle * sin_a))
    return points


def x_centre_line(c_line: List[Point], box: Box, stroke: float) -> pathops.Path:
    """« ɔc » : la ligne du c à droite, son reflet à gauche, dos contre dos au centre."""
    left = box[0] + stroke / 2
    right = box[2] - stroke / 2
    bottom = box[1] + stroke / 2
    top = box[3] - stroke / 2
    mid_x = (left + right) / 2
    half_width = mid_x - left

    c_left = min(x for x, _ in c_line)
    c_right = max(x for x, _ in c_line)
    c_bottom = min(y for _, y in c_line)
    c_top = max(y for _, y in c_line)

    path = pathops.Path()
    for side in (-1, 1):
        # side = 1 : le c, à droite ; side = -1 : son reflet ɔ, à gauche
        fitted = [
            (
                mid_x + side * (x - c_left) / (c_right - c_left) * half_width,
                bottom + (y - c_bottom) / (c_top - c_bottom) * (top - bottom),
            )
            for x, y in c_line
        ]
        path.moveTo(*fitted[0])
        for point in fitted[1:]:
            path.lineTo(*point)
    return path


def round_x_outline(source: TTFont, stroke: float) -> pathops.Path:
    box = glyph_bounds(source.getGlyphSet(), "x")
    outline = x_centre_line(c_centre_line(source, stroke), box, stroke)
    outline.stroke(stroke, pathops.LineCap.ROUND_CAP, pathops.LineJoin.ROUND_JOIN, 4)
    # Les bouts ronds sont des coniques, que simplify() et les polices ignorent
    outline.convertConicsToQuads()
    outline.simplify()
    return outline


def draw_round_x(font: TTFont, outline: pathops.Path) -> None:
    glyph_name = font.getBestCmap()[ord("x")]
    tt_pen = TTGlyphPen(None)
    outline.draw(Cu2QuPen(tt_pen, max_err=1.0, reverse_direction=True))
    glyph = tt_pen.glyph()
    glyph.recalcBounds(font["glyf"])
    font["glyf"][glyph_name] = glyph
    advance = font["hmtx"][glyph_name][0]
    font["hmtx"][glyph_name] = (advance, glyph.xMin)


def main() -> None:
    parser = argparse.ArgumentParser(description="Rounded handwritten x in the Shantell fonts")
    parser.parse_args()

    outlines = {}
    for name, (source_file, stroke) in FONTS.items():
        path = OUTPUT_DIR / f"{name}.woff2"
        if path.parent.resolve() != OUTPUT_DIR.resolve():
            raise SystemExit(f"Sortie refusée hors de {OUTPUT_DIR}: {path}")
        if (source_file, stroke) not in outlines:
            outlines[(source_file, stroke)] = round_x_outline(TTFont(INPUT_DIR / source_file), stroke)
        font = TTFont(path)
        draw_round_x(font, outlines[(source_file, stroke)])
        font.flavor = "woff2"
        font.save(path)
        print(f"{name}: x arrondi (c de {source_file}, trait {stroke}) -> {path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
