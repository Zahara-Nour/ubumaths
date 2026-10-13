#!/usr/bin/env python3
"""
Redraw the radicals (√) of the Shantell fonts in Shantell's hand.

Shantell's own √ is a small tick (short flag, rounded « v ») without the long
arm that must climb to the vinculum: MathLive draws the vinculum as a rule
starting at the glyph's top right corner, so the glyph cannot be copied as is.
Each radical is drawn instead as a centre line that keeps Shantell's gesture
(short rising flag, steep descent, rounded bottom) and whose arm ends where
the vinculum starts, stroked with the width of Shantell's letters:

- KaTeX_Main √ and KaTeX_Size1-4 √: one glyph each, fitted into the box of
  the KaTeX glyph it replaces (its advance width, top and bottom);
- tall radicals, stacked by MathLive from three Size4 pieces (⎷ bottom,
  U+E000 repeated, U+E001 top): same vertical for the three, and each piece
  is cut flat at its KaTeX edges so that stacked pieces join; the top piece
  turns into a stub as thin as MathLive's vinculum, which continues it.

Run after roughen_extras.py and replace_symbols.py: this script works in place
on static/fonts/chiphre-math/ and redraws each glyph from scratch, so running
it twice gives the same font. Writing to static/fonts/KaTeX_*.woff2 is
refused: the original KaTeX fonts were overwritten that way on 2026-01-20.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Tuple

import pathops
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont


REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "chiphre-math"
ORIGINAL_DIR = REPO_ROOT / "static" / "fonts" / "katex-original"

SINGLE_RADICAL_FONTS = [
    "KaTeX_Main-Regular",
    "KaTeX_Size1-Regular",
    "KaTeX_Size2-Regular",
    "KaTeX_Size3-Regular",
    "KaTeX_Size4-Regular",
]
STACK_FONT = "KaTeX_Size4-Regular"
STACK_BOTTOM, STACK_REPEAT, STACK_TOP = 0x23B7, 0xE000, 0xE001

# Trait des lettres de Shantell 300 (mesuré sur o, l, n, c)
STROKE = 68
# Épaisseur de la barre de MathLive (0,04 em) : le bout du morceau du haut la prolonge
VINCULUM = 40
# Débord au-delà d'un bord de raccord avant la coupe nette
OVERSHOOT = 100

Box = Tuple[float, float, float, float]


def reference_glyph(reference: TTFont, codepoint: int) -> Tuple[Box, int]:
    glyph_set = reference.getGlyphSet()
    name = reference.getBestCmap()[codepoint]
    pen = BoundsPen(glyph_set)
    glyph_set[name].draw(pen)
    return pen.bounds, reference["hmtx"][name][0]


def stroked(path: pathops.Path, width: float) -> pathops.Path:
    path.stroke(width, pathops.LineCap.ROUND_CAP, pathops.LineJoin.ROUND_JOIN, 4)
    # Les bouts ronds sont des coniques, que simplify() et les polices ignorent
    path.convertConicsToQuads()
    path.simplify()
    return path


def clip_rows(path: pathops.Path, y_min: float, y_max: float) -> pathops.Path:
    """Coupe net tout ce qui dépasse la bande y_min..y_max."""
    band = pathops.Path()
    band.moveTo(-10000, y_min)
    band.lineTo(10000, y_min)
    band.lineTo(10000, y_max)
    band.lineTo(-10000, y_max)
    band.close()
    return pathops.op(path, band, pathops.PathOp.INTERSECTION)


def flag_and_bottom(path: pathops.Path, left: float, bottom: float, depth: float, vertex_x: float) -> None:
    """Drapeau court qui monte, descente raide, fond arrondi : le geste du √ de Shantell."""
    flag_start = (left, bottom + depth)
    flag_peak = (left + 0.14 * (vertex_x - left) + 40, bottom + depth + 45)
    path.moveTo(*flag_start)
    path.lineTo(*flag_peak)
    path.cubicTo(
        flag_peak[0] + 0.45 * (vertex_x - flag_peak[0]),
        flag_peak[1] - 0.55 * (flag_peak[1] - bottom),
        vertex_x - 45,
        bottom,
        vertex_x,
        bottom,
    )


def flag_depth(height: float) -> float:
    """Hauteur du drapeau au-dessus du fond : croît moins vite que la racine."""
    return 380 * (height / 1000) ** 0.5


def single_radical(box: Box, advance: int) -> pathops.Path:
    x_min, y_min, _, y_max = box
    height = y_max - y_min
    left = x_min + STROKE / 2
    bottom = y_min + STROKE / 2
    # Le bout rond de la branche s'arrête au coin où MathLive commence la barre
    end = (advance - STROKE / 2, y_max - STROKE / 2)
    depth = flag_depth(height)
    vertex_x = left + 0.3 * (advance - x_min)

    path = pathops.Path()
    flag_and_bottom(path, left, bottom, depth, vertex_x)
    # Branche montante légèrement bombée, comme les traits de Shantell
    path.cubicTo(vertex_x + 40, bottom, end[0] - 0.55 * (end[0] - vertex_x), end[1] - 0.45 * (end[1] - bottom), *end)
    return stroked(path, STROKE)


def stack_pieces(reference: TTFont):
    """Les trois morceaux de la racine empilée, sur la verticale des morceaux KaTeX."""
    bottom_box, bottom_advance = reference_glyph(reference, STACK_BOTTOM)
    repeat_box, repeat_advance = reference_glyph(reference, STACK_REPEAT)
    top_box, top_advance = reference_glyph(reference, STACK_TOP)
    vertical_x = (repeat_box[0] + repeat_box[2]) / 2

    # ⎷ : drapeau (aussi haut que celui du plus grand √ simple), fond arrondi,
    # puis la verticale jusqu'au bord du haut
    size4_box, _ = reference_glyph(reference, ord("√"))
    left = bottom_box[0] + STROKE / 2
    low = bottom_box[1] + STROKE / 2
    path = pathops.Path()
    flag_and_bottom(path, left, low, flag_depth(size4_box[3] - size4_box[1]), vertical_x)
    path.cubicTo(vertical_x, low, vertical_x, low + 60, vertical_x, low + 200)
    path.lineTo(vertical_x, bottom_box[3] + OVERSHOOT)
    bottom_piece = clip_rows(stroked(path, STROKE), bottom_box[1], bottom_box[3])

    # U+E000 : la verticale seule, coupée net en haut et en bas
    path = pathops.Path()
    path.moveTo(vertical_x, repeat_box[1] - OVERSHOOT)
    path.lineTo(vertical_x, repeat_box[3] + OVERSHOOT)
    repeat_piece = clip_rows(stroked(path, STROKE), repeat_box[1], repeat_box[3])

    # U+E001 : la verticale qui tourne en un bout aussi fin que la barre de MathLive
    bar_top = top_box[3]
    bar_middle = bar_top - VINCULUM / 2
    path = pathops.Path()
    path.moveTo(vertical_x, top_box[1] - OVERSHOOT)
    path.lineTo(vertical_x, bar_middle)
    vertical = stroked(path, STROKE)
    path = pathops.Path()
    path.moveTo(vertical_x, bar_middle)
    path.lineTo(top_box[2] - VINCULUM / 2, bar_middle)
    stub = stroked(path, VINCULUM)
    top_piece = clip_rows(pathops.op(vertical, stub, pathops.PathOp.UNION), top_box[1], bar_top)

    return {
        STACK_BOTTOM: (bottom_piece, bottom_advance),
        STACK_REPEAT: (repeat_piece, repeat_advance),
        STACK_TOP: (top_piece, top_advance),
    }


def put_glyph(font: TTFont, codepoint: int, outline: pathops.Path, advance: int) -> None:
    glyph_name = font.getBestCmap()[codepoint]
    tt_pen = TTGlyphPen(None)
    outline.draw(Cu2QuPen(tt_pen, max_err=1.0, reverse_direction=True))
    glyph = tt_pen.glyph()
    glyph.recalcBounds(font["glyf"])
    font["glyf"][glyph_name] = glyph
    font["hmtx"][glyph_name] = (advance, glyph.xMin)


def main() -> None:
    parser = argparse.ArgumentParser(description="Shantell-style radicals")
    parser.parse_args()

    for name in SINGLE_RADICAL_FONTS:
        path = OUTPUT_DIR / f"{name}.woff2"
        if path.parent.resolve() != OUTPUT_DIR.resolve():
            raise SystemExit(f"Sortie refusée hors de {OUTPUT_DIR}: {path}")
        font = TTFont(path)
        reference = TTFont(ORIGINAL_DIR / f"{name}.woff2")
        box, advance = reference_glyph(reference, ord("√"))
        put_glyph(font, ord("√"), single_radical(box, advance), advance)
        if name == STACK_FONT:
            for codepoint, (outline, piece_advance) in stack_pieces(reference).items():
                put_glyph(font, codepoint, outline, piece_advance)
        font.flavor = "woff2"
        font.save(path)
        print(f"{name}: √{' + morceaux empilés' if name == STACK_FONT else ''} -> {path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
