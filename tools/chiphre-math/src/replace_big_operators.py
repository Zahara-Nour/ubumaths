#!/usr/bin/env python3
"""
Replace the big operators of KaTeX_Size1 (inline) and KaTeX_Size2 (display)
with Shantell Sans ones: ∑ ∏ ∐ ∫ ∬ ∭.

Shantell only draws them at text size. Scaled up to the KaTeX glyph, its
stroke would grow with it (×1.4 for a display ∑, ×2 for a display ∫), far
bolder than the letters. So each glyph is:

1. scaled to the height of the KaTeX glyph it replaces, narrowed only when
   wider than the KaTeX glyph;
2. eroded back to the stroke width of Shantell's letters: a band drawn along
   its own outline is subtracted from it;
3. centred on the KaTeX glyph's box, with the KaTeX advance width (MathLive
   lays formulas out with the KaTeX metrics, hard-coded).

∐ is Shantell's ∏ upside down; ∬ and ∭ are two and three Shantell ∫, spaced
like the KaTeX ones.

Run after roughen_extras.py, which rebuilds Size1-4 from the original KaTeX
fonts: this script works in place on static/fonts/chiphre-math/ and redraws
each listed glyph from the Shantell source, so running it twice gives the same
font. Writing to static/fonts/KaTeX_*.woff2 is refused: the original KaTeX
fonts were overwritten that way on 2026-01-20.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Tuple

import pathops
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont


REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "chiphre-math"
ORIGINAL_DIR = REPO_ROOT / "static" / "fonts" / "katex-original"
SHANTELL = REPO_ROOT / "tools" / "chiphre-math" / "fonts" / "input" / "shantell-sans-300.ttf"

FONTS = ["KaTeX_Size1-Regular", "KaTeX_Size2-Regular"]

# Glyphe KaTeX -> (glyphe Shantell, nombre de copies côte à côte, retourné)
OPERATORS = {
    "∑": ("∑", 1, False),
    "∏": ("∏", 1, False),
    "∐": ("∏", 1, True),
    "∫": ("∫", 1, False),
    "∬": ("∫", 2, False),
    "∭": ("∫", 3, False),
}

# Trait des lettres de Shantell 300 (mesuré sur o, l, n, c)
STROKE = 68

Box = Tuple[float, float, float, float]


def path_bounds(path: pathops.Path) -> Box:
    pen = BoundsPen(None)
    path.draw(pen)
    return pen.bounds


def shantell_path(source: TTFont, char: str, scale_x: float, scale_y: float, flipped: bool) -> pathops.Path:
    glyph_set = source.getGlyphSet()
    recording = DecomposingRecordingPen(glyph_set)
    glyph_set[source.getBestCmap()[ord(char)]].draw(recording)
    path = pathops.Path()
    sign = -1 if flipped else 1
    recording.replay(TransformPen(path.getPen(), (scale_x, 0, 0, sign * scale_y, 0, 0)))
    path.simplify()
    return path


def erode(path: pathops.Path, amount: float) -> pathops.Path:
    """Rogne le contour de `amount` unités sur tout son pourtour."""
    if amount <= 0:
        return path
    band = pathops.Path()
    path.draw(band.getPen())
    band.stroke(2 * amount, pathops.LineCap.BUTT_CAP, pathops.LineJoin.ROUND_JOIN, 4)
    band.convertConicsToQuads()
    return pathops.op(path, band, pathops.PathOp.DIFFERENCE)


def build_operator(source: TTFont, reference: TTFont, char: str) -> Tuple[pathops.Path, int]:
    source_char, copies, flipped = OPERATORS[char]
    reference_set = reference.getGlyphSet()
    reference_name = reference.getBestCmap()[ord(char)]
    pen = BoundsPen(reference_set)
    reference_set[reference_name].draw(pen)
    t_xmin, t_ymin, t_xmax, t_ymax = pen.bounds
    advance = reference["hmtx"][reference_name][0]

    single = shantell_path(source, source_char, 1, 1, flipped)
    s_xmin, s_ymin, s_xmax, s_ymax = path_bounds(single)
    scale_y = (t_ymax - t_ymin) / (s_ymax - s_ymin)

    # Plusieurs copies (∬, ∭) : chacune occupe la largeur d'un ∫ KaTeX, décalée
    # comme dans KaTeX (largeur du ∬ moins celle du ∫ = un pas)
    if copies > 1:
        one_name = reference.getBestCmap()[ord("∫")]
        one_pen = BoundsPen(reference_set)
        reference_set[one_name].draw(one_pen)
        one_width = one_pen.bounds[2] - one_pen.bounds[0]
        step = ((t_xmax - t_xmin) - one_width) / (copies - 1)
        target_width = one_width
    else:
        step = 0
        target_width = t_xmax - t_xmin
    scale_x = min(scale_y, target_width / (s_xmax - s_xmin))

    piece = erode(shantell_path(source, source_char, scale_x, scale_y, flipped), STROKE * (min(scale_x, scale_y) - 1) / 2)
    p_xmin, p_ymin, p_xmax, p_ymax = path_bounds(piece)
    width = (p_xmax - p_xmin) + step * (copies - 1)

    dx = (t_xmin + t_xmax) / 2 - (p_xmin + width / 2)
    dy = (t_ymin + t_ymax) / 2 - (p_ymin + p_ymax) / 2
    result = pathops.Path()
    for index in range(copies):
        piece.draw(TransformPen(result.getPen(), (1, 0, 0, 1, dx + index * step, dy)))
    result.simplify()
    return result, advance


def main() -> None:
    parser = argparse.ArgumentParser(description="Shantell big operators in KaTeX_Size1 and Size2")
    parser.parse_args()

    source = TTFont(SHANTELL)
    for name in FONTS:
        path = OUTPUT_DIR / f"{name}.woff2"
        if path.parent.resolve() != OUTPUT_DIR.resolve():
            raise SystemExit(f"Sortie refusée hors de {OUTPUT_DIR}: {path}")
        font = TTFont(path)
        reference = TTFont(ORIGINAL_DIR / f"{name}.woff2")
        for char in OPERATORS:
            outline, advance = build_operator(source, reference, char)
            glyph_name = font.getBestCmap()[ord(char)]
            tt_pen = TTGlyphPen(None)
            outline.draw(Cu2QuPen(tt_pen, max_err=1.0, reverse_direction=True))
            glyph = tt_pen.glyph()
            glyph.recalcBounds(font["glyf"])
            font["glyf"][glyph_name] = glyph
            font["hmtx"][glyph_name] = (advance, glyph.xMin)
        font.flavor = "woff2"
        font.save(path)
        print(f"{name}: {' '.join(OPERATORS)} -> {path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
