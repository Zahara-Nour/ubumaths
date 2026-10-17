#!/usr/bin/env python3
"""
Redraw the big delimiters of the Shantell fonts with Shantell's stroke.

Shantell only draws ( [ { | at text size, and scaling them up would make
their stroke grow with them. Each big delimiter is drawn instead as a centre
line (arcs, and corners rounded by the stroke, like Shantell's small
delimiters) stroked with the width of Shantell's letters, inside the box of
the KaTeX glyph it replaces (MathLive lays formulas out with the KaTeX
metrics, hard-coded):

- KaTeX_Size1-4: ( ) [ ] { } ⟨ ⟩ ⌈ ⌉ ⌊ ⌋ / \\ at their four fixed sizes;
- the pieces MathLive stacks for taller delimiters (makeStackedDelim in
  mathlive.mjs): ⎛ ⎜ ⎝ ⎞ ⎟ ⎠ ⎡ ⎢ ⎣ ⎤ ⎥ ⎦ ⎧ ⎨ ⎩ ⎪ ⎫ ⎬ ⎭ in Size4, ∣ ∥ ‖ ⏐ in
  Size1. All the pieces of one delimiter share the vertical of its repeated
  KaTeX piece, and each piece is cut flat at its KaTeX edges, so that stacked
  pieces join.

Run after roughen_extras.py: this script works in place on
static/fonts/chiphre-math/ and redraws each glyph from scratch, so running
it twice gives the same font. Writing to static/fonts/KaTeX_*.woff2 is
refused: the original KaTeX fonts were overwritten that way on 2026-01-20.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple

import pathops
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont


REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "chiphre-math"
ORIGINAL_DIR = REPO_ROOT / "static" / "fonts" / "katex-original"

SIZE_FONTS = ["KaTeX_Size1-Regular", "KaTeX_Size2-Regular", "KaTeX_Size3-Regular", "KaTeX_Size4-Regular"]

# Trait des lettres de Shantell 300 (mesuré sur o, l, n, c)
STROKE = 68
# Débord au-delà d'un bord de raccord avant la coupe nette
OVERSHOOT = 100

Box = Tuple[float, float, float, float]
# Une ligne centrale : liste de commandes ("M" | "L" | "C", points)
Commands = List[Tuple[str, Tuple[float, ...]]]


class Frame:
    """Boîte de la ligne centrale : la boîte KaTeX rentrée d'un demi-trait."""

    def __init__(self, box: Box):
        self.left = box[0] + STROKE / 2
        self.right = box[2] - STROKE / 2
        self.bottom = box[1] + STROKE / 2
        self.top = box[3] - STROKE / 2
        self.middle = (self.bottom + self.top) / 2
        self.height = self.top - self.bottom


# --- Délimiteurs de taille fixe (la forme ouvrante ; la fermante en est le miroir) ---


def paren(f: Frame) -> Commands:
    # Arc symétrique dont le point le plus à gauche tombe sur f.left
    control_x = (f.left - 0.25 * f.right) / 0.75
    return [
        ("M", (f.right, f.top)),
        ("C", (control_x, f.top - 0.28 * f.height, control_x, f.bottom + 0.28 * f.height, f.right, f.bottom)),
    ]


def bracket(f: Frame) -> Commands:
    return [("M", (f.right, f.top)), ("L", (f.left, f.top)), ("L", (f.left, f.bottom)), ("L", (f.right, f.bottom))]


def brace(f: Frame) -> Commands:
    vertical = (f.left + f.right) / 2
    turn = min(0.12 * f.height, 2 * (f.right - vertical))
    cusp = min(0.1 * f.height, 2 * (vertical - f.left))
    return [
        ("M", (f.right, f.top)),
        ("C", (vertical, f.top, vertical, f.top - 0.3 * turn, vertical, f.top - turn)),
        ("L", (vertical, f.middle + cusp)),
        ("C", (vertical, f.middle + 0.3 * cusp, (vertical + f.left) / 2, f.middle, f.left, f.middle)),
        ("C", ((vertical + f.left) / 2, f.middle, vertical, f.middle - 0.3 * cusp, vertical, f.middle - cusp)),
        ("L", (vertical, f.bottom + turn)),
        ("C", (vertical, f.bottom + 0.3 * turn, vertical, f.bottom, f.right, f.bottom)),
    ]


def angle(f: Frame) -> Commands:
    return [("M", (f.right, f.top)), ("L", (f.left, f.middle)), ("L", (f.right, f.bottom))]


def ceiling(f: Frame) -> Commands:
    return [("M", (f.right, f.top)), ("L", (f.left, f.top)), ("L", (f.left, f.bottom))]


def floor(f: Frame) -> Commands:
    return [("M", (f.left, f.top)), ("L", (f.left, f.bottom)), ("L", (f.right, f.bottom))]


def slash(f: Frame) -> Commands:
    return [("M", (f.left, f.bottom)), ("L", (f.right, f.top))]


# Caractère -> (forme, miroir gauche-droite)
FIXED: Dict[str, Tuple[Callable[[Frame], Commands], bool]] = {
    "(": (paren, False),
    ")": (paren, True),
    "[": (bracket, False),
    "]": (bracket, True),
    "{": (brace, False),
    "}": (brace, True),
    "⟨": (angle, False),
    "⟩": (angle, True),
    "⌈": (ceiling, False),
    "⌉": (ceiling, True),
    "⌊": (floor, False),
    "⌋": (floor, True),
    "/": (slash, False),
    "\\": (slash, True),
}


# --- Morceaux empilés ---


def stack_top_arc(f: Frame, vertical: float, low: float) -> Commands:
    """Haut de grande parenthèse : de l'extrémité à la verticale, puis la verticale."""
    return [
        ("M", (f.right, f.top)),
        ("C", (vertical + 0.35 * (f.right - vertical), f.top - 0.12 * f.height, vertical, f.top - 0.45 * f.height, vertical, f.top - 0.8 * f.height)),
        ("L", (vertical, low)),
    ]


def stack_top_bracket(f: Frame, vertical: float, low: float) -> Commands:
    return [("M", (f.right, f.top)), ("L", (vertical, f.top)), ("L", (vertical, low))]


def stack_top_brace(f: Frame, vertical: float, low: float) -> Commands:
    turn = min(0.35 * f.height, 2 * (f.right - vertical))
    return [
        ("M", (f.right, f.top)),
        ("C", (vertical, f.top, vertical, f.top - 0.3 * turn, vertical, f.top - turn)),
        ("L", (vertical, low)),
    ]


def stack_brace_middle(f: Frame, vertical: float, box: Box) -> Commands:
    cusp = 0.2 * f.height
    return [
        ("M", (vertical, box[3] + OVERSHOOT)),
        ("L", (vertical, f.middle + cusp)),
        ("C", (vertical, f.middle + 0.3 * cusp, (vertical + f.left) / 2, f.middle, f.left, f.middle)),
        ("C", ((vertical + f.left) / 2, f.middle, vertical, f.middle - 0.3 * cusp, vertical, f.middle - cusp)),
        ("L", (vertical, box[1] - OVERSHOOT)),
    ]


# Morceau -> (morceau répété dont il prend la verticale, forme, miroir G-D, miroir H-B)
STACKED = {
    0x239B: (0x239C, stack_top_arc, False, False),  # ⎛
    0x239D: (0x239C, stack_top_arc, False, True),  # ⎝
    0x239E: (0x239F, stack_top_arc, True, False),  # ⎞
    0x23A0: (0x239F, stack_top_arc, True, True),  # ⎠
    0x23A1: (0x23A2, stack_top_bracket, False, False),  # ⎡
    0x23A3: (0x23A2, stack_top_bracket, False, True),  # ⎣
    0x23A4: (0x23A5, stack_top_bracket, True, False),  # ⎤
    0x23A6: (0x23A5, stack_top_bracket, True, True),  # ⎦
    0x23A7: (0x23AA, stack_top_brace, False, False),  # ⎧
    0x23A9: (0x23AA, stack_top_brace, False, True),  # ⎩
    0x23AB: (0x23AA, stack_top_brace, True, False),  # ⎫
    0x23AD: (0x23AA, stack_top_brace, True, True),  # ⎭
}
BRACE_MIDDLES = {0x23A8: False, 0x23AC: True}  # ⎨, ⎬ (miroir G-D)
REPEATED = [0x239C, 0x239F, 0x23A2, 0x23A5, 0x23AA]  # ⎜ ⎟ ⎢ ⎥ ⎪
# Barres de Size1 (répétées pour | et ‖ hauts) : une ou deux verticales
BARS = [0x2223, 0x2225, 0x2016, 0x23D0]  # ∣ ∥ ‖ ⏐


# --- Outils ---


def reference_glyph(reference: TTFont, codepoint: int) -> Tuple[Box, int]:
    glyph_set = reference.getGlyphSet()
    name = reference.getBestCmap()[codepoint]
    pen = BoundsPen(glyph_set)
    glyph_set[name].draw(pen)
    return pen.bounds, reference["hmtx"][name][0]


def mirrored_box(box: Box, mirror_x: bool, mirror_y: bool) -> Box:
    """Boîte dans le repère où l'on dessine la forme non retournée."""
    x0, y0, x1, y1 = box
    if mirror_x:
        x0, x1 = -x1, -x0
    if mirror_y:
        y0, y1 = -y1, -y0
    return x0, y0, x1, y1


def to_path(commands: Commands, mirror_x: bool = False, mirror_y: bool = False) -> pathops.Path:
    sx = -1 if mirror_x else 1
    sy = -1 if mirror_y else 1
    path = pathops.Path()
    for op, values in commands:
        points = [(sx * values[i], sy * values[i + 1]) for i in range(0, len(values), 2)]
        if op == "M":
            path.moveTo(*points[0])
        elif op == "L":
            path.lineTo(*points[0])
        else:
            path.cubicTo(*points[0], *points[1], *points[2])
    return path


def stroked(
    path: pathops.Path, clip: Optional[Tuple[float, float]] = None, width: float = STROKE
) -> pathops.Path:
    path.stroke(width, pathops.LineCap.ROUND_CAP, pathops.LineJoin.ROUND_JOIN, 4)
    # Les bouts ronds sont des coniques, que simplify() et les polices ignorent
    path.convertConicsToQuads()
    path.simplify()
    if clip is None:
        return path
    band = pathops.Path()
    band.moveTo(-10000, clip[0])
    band.lineTo(10000, clip[0])
    band.lineTo(10000, clip[1])
    band.lineTo(-10000, clip[1])
    band.close()
    return pathops.op(path, band, pathops.PathOp.INTERSECTION)


def vertical_line(x: float, box: Box) -> pathops.Path:
    return stroked(to_path([("M", (x, box[1] - OVERSHOOT)), ("L", (x, box[3] + OVERSHOOT))]), (box[1], box[3]))


def put_glyph(font: TTFont, codepoint: int, outline: pathops.Path, advance: int) -> None:
    glyph_name = font.getBestCmap()[codepoint]
    tt_pen = TTGlyphPen(None)
    outline.draw(Cu2QuPen(tt_pen, max_err=1.0, reverse_direction=True))
    glyph = tt_pen.glyph()
    glyph.recalcBounds(font["glyf"])
    font["glyf"][glyph_name] = glyph
    font["hmtx"][glyph_name] = (advance, glyph.xMin)


# --- Construction ---


def fixed_delimiters(font: TTFont, reference: TTFont) -> None:
    for char, (shape, mirror_x) in FIXED.items():
        box, advance = reference_glyph(reference, ord(char))
        commands = shape(Frame(mirrored_box(box, mirror_x, False)))
        put_glyph(font, ord(char), stroked(to_path(commands, mirror_x)), advance)


def stacked_pieces(font: TTFont, reference: TTFont) -> None:
    for codepoint in REPEATED:
        box, advance = reference_glyph(reference, codepoint)
        put_glyph(font, codepoint, vertical_line((box[0] + box[2]) / 2, box), advance)

    for codepoint, (repeated, shape, mirror_x, mirror_y) in STACKED.items():
        box, advance = reference_glyph(reference, codepoint)
        repeat_box, _ = reference_glyph(reference, repeated)
        vertical = (repeat_box[0] + repeat_box[2]) / 2
        local = mirrored_box(box, mirror_x, mirror_y)
        local_vertical = -vertical if mirror_x else vertical
        commands = shape(Frame(local), local_vertical, local[1] - OVERSHOOT)
        put_glyph(font, codepoint, stroked(to_path(commands, mirror_x, mirror_y), (box[1], box[3])), advance)

    repeat_box, _ = reference_glyph(reference, 0x23AA)
    vertical = (repeat_box[0] + repeat_box[2]) / 2
    for codepoint, mirror_x in BRACE_MIDDLES.items():
        box, advance = reference_glyph(reference, codepoint)
        local = mirrored_box(box, mirror_x, False)
        local_vertical = -vertical if mirror_x else vertical
        commands = stack_brace_middle(Frame(local), local_vertical, local)
        put_glyph(font, codepoint, stroked(to_path(commands, mirror_x), (box[1], box[3])), advance)


def bars(font: TTFont, reference: TTFont) -> None:
    for codepoint in BARS:
        box, advance = reference_glyph(reference, codepoint)
        glyph = reference["glyf"][reference.getBestCmap()[codepoint]]
        # Une ou deux barres : le centre de chaque contour KaTeX
        outline = pathops.Path()
        for points in contour_ranges(glyph):
            xs = [glyph.coordinates[i][0] for i in points]
            line = vertical_line((min(xs) + max(xs)) / 2, box)
            outline = pathops.op(outline, line, pathops.PathOp.UNION)
        put_glyph(font, codepoint, outline, advance)


def contour_ranges(glyph) -> List[range]:
    ranges = []
    start = 0
    for end in glyph.endPtsOfContours:
        ranges.append(range(start, end + 1))
        start = end + 1
    return ranges


def main() -> None:
    parser = argparse.ArgumentParser(description="Shantell-stroke big delimiters")
    parser.parse_args()

    for name in SIZE_FONTS:
        path = OUTPUT_DIR / f"{name}.woff2"
        if path.parent.resolve() != OUTPUT_DIR.resolve():
            raise SystemExit(f"Sortie refusée hors de {OUTPUT_DIR}: {path}")
        font = TTFont(path)
        reference = TTFont(ORIGINAL_DIR / f"{name}.woff2")
        fixed_delimiters(font, reference)
        if name == "KaTeX_Size1-Regular":
            bars(font, reference)
        if name == "KaTeX_Size4-Regular":
            stacked_pieces(font, reference)
        font.flavor = "woff2"
        font.save(path)
        print(f"{name}: délimiteurs -> {path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
