#!/usr/bin/env python3
"""
Redraw the lowercase x of the Shantell fonts as two back-to-back arcs, the
way it is handwritten in maths: Shantell's x is a straight cross that pupils
confuse with the multiplication sign ×.

The x is drawn as a centre line (two cubic arcs with small hooks), stroked
with Shantell's stroke width and rounded caps, then merged into one outline.
It keeps the box and advance width of Shantell's x, so MathLive spacing is
unchanged.

The script works in place on static/fonts/shantell-katex/ (each run redraws
the glyph from scratch, so running it twice gives the same font). Writing to
static/fonts/KaTeX_*.woff2 is refused: the original KaTeX fonts were
overwritten that way on 2026-01-20.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import pathops
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont


REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "shantell-katex"

# Boîte du x de Shantell Sans (300 et gras) : la boîte du nouveau x, fixe pour
# qu'une relance ne parte pas du x déjà redessiné
BOX_300 = (29, -13, 479, 497)
BOX_BOLD = (35, -16, 546, 519)

# Police -> (boîte, épaisseur du trait = celle des lettres de Shantell au même poids, mesurée sur o, l, n, c)
FONTS = {
    "KaTeX_Main-Regular": (BOX_300, 68),
    "KaTeX_Main-Italic": (BOX_300, 68),
    "KaTeX_Math-Italic": (BOX_300, 68),
    "KaTeX_Main-Bold": (BOX_BOLD, 153),
}

def centre_line(x_min: float, y_min: float, x_max: float, y_max: float, stroke: float) -> pathops.Path:
    """Ligne centrale de « ɔc » : deux demi-ovales dos à dos, qui se touchent au centre."""
    left = x_min + stroke / 2
    right = x_max - stroke / 2
    bottom = y_min + stroke / 2
    top = y_max - stroke / 2
    mid_x = (left + right) / 2
    mid_y = (bottom + top) / 2
    half_width = mid_x - left
    height = top - bottom

    # Bras des points de contrôle : longs aux bouts (arc ample), courts au sommet
    # (courbure serrée) ; un sommet trop vertical colle les deux arcs sur toute
    # une hauteur et la jonction devient une tache
    end_arm = 0.6 * half_width
    apex_arm = 0.22 * height / 2
    path = pathops.Path()
    for side in (-1, 1):
        # side = -1 : demi-ovale gauche « ɔ » ; side = 1 : demi-ovale droit « c »
        end_x = mid_x + side * half_width
        path.moveTo(end_x, top - 0.06 * height)
        path.cubicTo(end_x - side * end_arm, top + 0.04 * height, mid_x, mid_y + apex_arm, mid_x, mid_y)
        path.cubicTo(mid_x, mid_y - apex_arm, end_x - side * end_arm, bottom - 0.04 * height, end_x, bottom + 0.06 * height)
    return path


def round_x_outline(box, stroke: float) -> pathops.Path:
    outline = centre_line(*box, stroke)
    outline.stroke(stroke, pathops.LineCap.ROUND_CAP, pathops.LineJoin.ROUND_JOIN, 4)
    # Les bouts ronds sont des coniques, que simplify() et les polices ignorent
    outline.convertConicsToQuads()
    outline.simplify()
    return outline


def draw_round_x(font: TTFont, box, stroke: float) -> None:
    glyph_name = font.getBestCmap()[ord("x")]
    outline = round_x_outline(box, stroke)
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

    for name, (box, stroke) in FONTS.items():
        path = OUTPUT_DIR / f"{name}.woff2"
        if path.parent.resolve() != OUTPUT_DIR.resolve():
            raise SystemExit(f"Sortie refusée hors de {OUTPUT_DIR}: {path}")
        font = TTFont(path)
        draw_round_x(font, box, stroke)
        font.flavor = "woff2"
        font.save(path)
        print(f"{name}: x arrondi (trait {stroke}) -> {path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
