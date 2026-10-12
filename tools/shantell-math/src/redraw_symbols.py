#!/usr/bin/env python3
"""
Redraw, in Shantell's hand, symbols that Shantell Sans does not have:
∈ ∪ ∩ ⇒ ⟹ ⇔ ⟺ (KaTeX_Main-Regular) and the number sets ℕ ℤ ℚ ℝ ℂ
(\\mathbb letters of KaTeX_AMS-Regular).

- ∈ is the centre line of Shantell's c (see round_x.py) closed by a bar;
- ∪ ∩ are a hand-drawn U and its mirror image;
- ⇒ ⟹ ⇔ ⟺ have two shafts and the short open head of Shantell's →;
- ℕ ℤ ℚ ℝ ℂ are Shantell's N Z Q R C with one stroke doubled, as they are
  handwritten: the stem of N and R, the diagonal of Z, the inner left side of
  Q and C. The stroke to double is measured on the letter itself.

Centre lines are stroked with the width of Shantell's letters, inside the box
of the KaTeX glyph they replace (MathLive lays formulas out with the KaTeX
metrics, hard-coded); letters keep Shantell's size and baseline, like the
letters already copied.

Run after roughen_extras.py and replace_symbols.py: this script works in place
on static/fonts/shantell-katex/ and redraws each glyph from scratch, so running
it twice gives the same font. Writing to static/fonts/KaTeX_*.woff2 is
refused: the original KaTeX fonts were overwritten that way on 2026-01-20.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Tuple

import pathops
from fontTools.pens.pointInsidePen import PointInsidePen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

# Les scripts voisins, même lancé en mode isolé (python -I)
sys.path.insert(0, str(Path(__file__).resolve().parent))

from replace_delimiters import STROKE, Frame, put_glyph, reference_glyph, stroked, to_path  # noqa: E402
from round_x import c_centre_line  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "shantell-katex"
ORIGINAL_DIR = REPO_ROOT / "static" / "fonts" / "katex-original"
SHANTELL = REPO_ROOT / "tools" / "shantell-math" / "fonts" / "input" / "shantell-sans-300.ttf"

# Écart entre la ligne centrale d'un trait et celle de son double (ℝ, ℕ…)
DOUBLE_GAP = 2.6 * STROKE
# Marge minimale entre une lettre resserrée et le bord de sa place
SIDE_MARGIN = 20

Point = Tuple[float, float]


# --- ∈ ∪ ∩ ---


def element_of(source: TTFont, f: Frame) -> pathops.Path:
    """∈ : le c de Shantell, fermé par une barre à mi-hauteur."""
    c_line = c_centre_line(source, STROKE)
    c_left = min(x for x, _ in c_line)
    c_right = max(x for x, _ in c_line)
    c_bottom = min(y for _, y in c_line)
    c_top = max(y for _, y in c_line)
    fitted = [
        (
            f.left + (x - c_left) / (c_right - c_left) * (f.right - f.left),
            f.bottom + (y - c_bottom) / (c_top - c_bottom) * f.height,
        )
        for x, y in c_line
    ]
    path = pathops.Path()
    path.moveTo(*fitted[0])
    for point in fitted[1:]:
        path.lineTo(*point)
    bar = to_path([("M", (f.left, f.middle)), ("L", (f.right, f.middle))])
    return pathops.op(stroked(path), stroked(bar), pathops.PathOp.UNION)


def cup(f: Frame, upside_down: bool) -> pathops.Path:
    """∪ (ou ∩ retourné) : deux jambes et un fond en demi-cercle."""
    radius = (f.right - f.left) / 2
    centre_x = (f.left + f.right) / 2
    k = 0.55 * radius
    commands = [
        ("M", (f.left, f.top)),
        ("L", (f.left, f.bottom + radius)),
        ("C", (f.left, f.bottom + radius - k, centre_x - k, f.bottom, centre_x, f.bottom)),
        ("C", (centre_x + k, f.bottom, f.right, f.bottom + radius - k, f.right, f.bottom + radius)),
        ("L", (f.right, f.top)),
    ]
    if upside_down:
        flip = f.top + f.bottom
        commands = [(op, tuple(v if i % 2 == 0 else flip - v for i, v in enumerate(values))) for op, values in commands]
    return stroked(to_path(commands))


# --- ⇒ ⟹ ⇔ ⟺ ---


def double_arrow(f: Frame, both_ends: bool) -> pathops.Path:
    """Deux traits et la pointe courte et ouverte de la flèche de Shantell."""
    half_gap = 0.22 * f.height
    head_height = 0.5 * f.height
    head_length = 0.42 * f.height
    commands = []
    shaft_start = f.left + (head_length * 0.6 if both_ends else 0)
    shaft_end = f.right - head_length * 0.6
    for y in (f.middle + half_gap, f.middle - half_gap):
        commands += [("M", (shaft_start, y)), ("L", (shaft_end, y))]
    commands += [
        ("M", (f.right - head_length, f.middle + head_height)),
        ("L", (f.right, f.middle)),
        ("L", (f.right - head_length, f.middle - head_height)),
    ]
    if both_ends:
        commands += [
            ("M", (f.left + head_length, f.middle + head_height)),
            ("L", (f.left, f.middle)),
            ("L", (f.left + head_length, f.middle - head_height)),
        ]
    return stroked(to_path(commands))


# --- ℕ ℤ ℚ ℝ ℂ ---


def letter_path(source: TTFont, char: str) -> pathops.Path:
    glyph_set = source.getGlyphSet()
    recording = DecomposingRecordingPen(glyph_set)
    glyph_set[source.getBestCmap()[ord(char)]].draw(recording)
    path = pathops.Path()
    recording.replay(path.getPen())
    path.simplify()
    return path


def first_stroke_centre(source: TTFont, char: str, y: float, from_right: bool = False) -> float:
    """Milieu du premier trait rencontré sur l'horizontale y, depuis la gauche (ou la droite)."""
    glyph_set = source.getGlyphSet()
    glyph = glyph_set[source.getBestCmap()[ord(char)]]

    def inside(x: float) -> bool:
        pen = PointInsidePen(glyph_set, (x, y))
        glyph.draw(pen)
        return pen.getResult()

    xs = range(1000, -1, -1) if from_right else range(0, 1001)
    crossings = []
    was_inside = False
    for x in xs:
        now_inside = inside(x)
        if now_inside != was_inside:
            crossings.append(x)
            if len(crossings) == 2:
                break
        was_inside = now_inside
    return (crossings[0] + crossings[1]) / 2


def doubled_stroke(source: TTFont, char: str) -> pathops.Path:
    """Le trait ajouté à la lettre : parallèle au trait doublé, du côté intérieur."""
    letter = letter_path(source, char)
    x_min, y_min, x_max, y_max = letter.bounds
    height = y_max - y_min
    if char in "NR":
        # La jambe penche, et sa mesure se perd dans la boucle en haut du R : le
        # trait ajouté est la droite qui passe au mieux par les mesures prises
        # sous la boucle, décalée de DOUBLE_GAP, tracée du pied au sommet
        ys = [y_min + f * height for f in (0.08, 0.2, 0.32, 0.44, 0.56, 0.7)]
        xs = [first_stroke_centre(source, char, y) + DOUBLE_GAP for y in ys]
        mean_x, mean_y = sum(xs) / len(xs), sum(ys) / len(ys)
        slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys)) / sum((y - mean_y) ** 2 for y in ys)
        bottom_y, top_y = y_min + STROKE / 2, y_max - STROKE / 2
        start = (mean_x + slope * (bottom_y - mean_y), bottom_y)
        end = (mean_x + slope * (top_y - mean_y), top_y)
    elif char == "Z":
        # La diagonale, entre les deux barres, décalée vers la droite
        low, high = y_min + 0.3 * height, y_max - 0.3 * height
        x_low = first_stroke_centre(source, char, low) + DOUBLE_GAP
        x_high = first_stroke_centre(source, char, high) + DOUBLE_GAP
        slope = (x_high - x_low) / (high - low)
        bottom_y, top_y = y_min + 1.5 * STROKE, y_max - 1.5 * STROKE
        # Décalée vers la droite, la diagonale dépasserait la barre du haut : on
        # l'arrête au bord droit de la lettre
        top_y = min(top_y, low + (x_max - STROKE / 2 - x_low) / slope) if slope > 0 else top_y
        start = (x_low + slope * (bottom_y - low), bottom_y)
        end = (x_low + slope * (top_y - low), top_y)
    else:
        # Q, C : un trait vertical à l'intérieur du côté gauche
        x = first_stroke_centre(source, char, (y_min + y_max) / 2) + DOUBLE_GAP
        start, end = (x, y_min + 0.22 * height), (x, y_max - 0.22 * height)
    return stroked(to_path([("M", start), ("L", end)]))


def blackboard_letter(source: TTFont, char: str, box, advance: int) -> pathops.Path:
    outline = pathops.op(letter_path(source, char), doubled_stroke(source, char), pathops.PathOp.UNION)
    x_min, _, x_max, _ = outline.bounds
    scale_x = min(1.0, (advance - 2 * SIDE_MARGIN) / (x_max - x_min))
    dx = (box[0] + box[2]) / 2 - scale_x * (x_min + x_max) / 2
    placed = pathops.Path()
    outline.draw(TransformPen(placed.getPen(), (scale_x, 0, 0, 1, dx, 0)))
    placed.simplify()
    return placed


def main() -> None:
    parser = argparse.ArgumentParser(description="Shantell-style ∈ ∪ ∩ ⇒ and number sets")
    parser.parse_args()

    source = TTFont(SHANTELL)

    name = "KaTeX_Main-Regular"
    path = OUTPUT_DIR / f"{name}.woff2"
    font = TTFont(path)
    reference = TTFont(ORIGINAL_DIR / f"{name}.woff2")
    drawers = {
        "∈": lambda f: element_of(source, f),
        "∪": lambda f: cup(f, upside_down=False),
        "∩": lambda f: cup(f, upside_down=True),
        "⇒": lambda f: double_arrow(f, both_ends=False),
        "⟹": lambda f: double_arrow(f, both_ends=False),
        "⇔": lambda f: double_arrow(f, both_ends=True),
        "⟺": lambda f: double_arrow(f, both_ends=True),
    }
    for char, draw in drawers.items():
        box, advance = reference_glyph(reference, ord(char))
        put_glyph(font, ord(char), draw(Frame(box)), advance)
    font.flavor = "woff2"
    font.save(path)
    print(f"{name}: {' '.join(drawers)} -> {path.relative_to(REPO_ROOT)}")

    name = "KaTeX_AMS-Regular"
    path = OUTPUT_DIR / f"{name}.woff2"
    font = TTFont(path)
    reference = TTFont(ORIGINAL_DIR / f"{name}.woff2")
    for char in "NZQRC":
        box, advance = reference_glyph(reference, ord(char))
        put_glyph(font, ord(char), blackboard_letter(source, char, box, advance), advance)
    font.flavor = "woff2"
    font.save(path)
    print(f"{name}: ℕ ℤ ℚ ℝ ℂ -> {path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
