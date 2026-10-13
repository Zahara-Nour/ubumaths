#!/usr/bin/env python3
"""
Redraw, in Shantell's hand, symbols that Shantell Sans does not have:
∈ ∉ ∪ ∩ ⊂ ⊃ ⊆ ⊇ ⇒ ⟹ ⇔ ⟺ ↦, the slash of \\not (≠) and the arrow of \\vec
(KaTeX_Main-Regular), ⊊ ⊋ ⊈ ⊉ and the number sets ℕ ℤ ℚ ℝ ℂ (KaTeX_AMS-Regular).

- ∈ is the centre line of Shantell's c (see round_x.py) closed by a bar;
  ⊂ ⊃ ⊆ ⊇ ⊊ ⊋ ⊈ ⊉ are the same c, with a bar under it, cut or struck through;
- ≠ ∉ ⊈ ⊉ share the straight slash of \\not; ∉ is missing from KaTeX and is added;
- ↦ is Shantell's → (already in the font), lengthened, with a bar;
- ∪ ∩ are a hand-drawn U and its mirror image;
- ⇒ ⟹ ⇔ ⟺ have two shafts and the short open head of Shantell's →;
- ℚ ℂ are Shantell's Q C with one stroke doubled, as they are handwritten (ℕ ℤ ℝ
  are drawn by blackboard_letters.py): the inner left side of
  Q and C. The stroke to double is measured on the letter itself.

Centre lines are stroked with the width of Shantell's letters, inside the box
of the KaTeX glyph they replace (MathLive lays formulas out with the KaTeX
metrics, hard-coded); letters keep Shantell's size and baseline, like the
letters already copied.

Run after roughen_extras.py and replace_symbols.py: this script works in place
on static/fonts/chiphre-math/ and redraws each glyph from scratch, so running
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
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

# Les scripts voisins, même lancé en mode isolé (python -I)
sys.path.insert(0, str(Path(__file__).resolve().parent))

from replace_delimiters import STROKE, Frame, put_glyph, reference_glyph, stroked, to_path  # noqa: E402
from round_x import c_centre_line  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "chiphre-math"
ORIGINAL_DIR = REPO_ROOT / "static" / "fonts" / "katex-original"
SHANTELL = REPO_ROOT / "tools" / "chiphre-math" / "fonts" / "input" / "shantell-sans-300.ttf"

# Écart entre la ligne centrale d'un trait et celle de son double (ℝ, ℕ…)
DOUBLE_GAP = 2.6 * STROKE
# ⊂ de KaTeX : hauteur ; ⊆ de KaTeX : haut du c et bas de la barre
SUBSET_HEIGHT = 580
SUBSET_EQ_TOP = 636
SUBSET_EQ_BOTTOM = -138
# Demi-hauteur de la pointe de la flèche de \vec
VECTOR_HEAD = 105
# Écart ajouté entre la flèche de \vec et le haut de la lettre
VECTOR_LIFT = 30
# Marge minimale entre une lettre resserrée et le bord de sa place
SIDE_MARGIN = 20

Point = Tuple[float, float]


# --- ∈ ∪ ∩ ---


def c_shape(source: TTFont, f: Frame, mirror: bool = False) -> pathops.Path:
    """La ligne centrale du c de Shantell, étirée dans le cadre (retournée pour ⊃)."""
    c_line = c_centre_line(source, STROKE)
    c_left = min(x for x, _ in c_line)
    c_right = max(x for x, _ in c_line)
    c_bottom = min(y for _, y in c_line)
    c_top = max(y for _, y in c_line)
    fitted = []
    for x, y in c_line:
        t = (x - c_left) / (c_right - c_left)
        fitted.append(
            (
                f.left + (1 - t if mirror else t) * (f.right - f.left),
                f.bottom + (y - c_bottom) / (c_top - c_bottom) * f.height,
            )
        )
    path = pathops.Path()
    path.moveTo(*fitted[0])
    for point in fitted[1:]:
        path.lineTo(*point)
    return stroked(path)


def line(start: Point, end: Point) -> pathops.Path:
    return stroked(to_path([("M", start), ("L", end)]))


def union(*paths: pathops.Path) -> pathops.Path:
    result = paths[0]
    for path in paths[1:]:
        result = pathops.op(result, path, pathops.PathOp.UNION)
    return result


def element_of(source: TTFont, f: Frame) -> pathops.Path:
    """∈ : le c de Shantell, fermé par une barre à mi-hauteur."""
    return union(c_shape(source, f), line((f.left, f.middle), (f.right, f.middle)))


def subset(source: TTFont, box, mirror: bool, bar: str = "") -> pathops.Path:
    """⊂ ⊃ et leurs variantes : le c (retourné pour ⊃), une barre dessous si
    demandée, barrée d'un petit trait (⊊) ou d'un grand (⊈).

    Le c garde la hauteur du ⊂ de KaTeX (SUBSET_HEIGHT), posé en haut de la boîte ;
    la barre est à la place de celle du ⊆ de KaTeX."""
    f = Frame(box)
    if not bar:
        return c_shape(source, f, mirror)
    c_frame = Frame((box[0], SUBSET_EQ_TOP - SUBSET_HEIGHT, box[2], SUBSET_EQ_TOP))
    bar_y = SUBSET_EQ_BOTTOM + STROKE / 2
    parts = [c_shape(source, c_frame, mirror), line((f.left, bar_y), (f.right, bar_y))]
    centre_x = (f.left + f.right) / 2
    if bar == "neq":
        # ⊊ : un petit trait penché qui coupe la barre
        rise = bar_y - f.bottom
        parts.append(line((centre_x - 0.45 * rise, f.bottom), (centre_x + 0.45 * rise, bar_y + rise)))
    elif bar == "not":
        # ⊈ : le trait du « non » sur toute la hauteur
        parts.append(not_slash(Frame((centre_x - 150, box[1], centre_x + 150, box[3]))))
    return union(*parts)


def not_slash(f: Frame) -> pathops.Path:
    """Le trait penché du « non » (≠, ∉, ⊈) : la barre oblique de Shantell, droite."""
    return line((f.left, f.bottom), (f.right, f.top))


def not_element_of(source: TTFont, element_box, slash_box) -> pathops.Path:
    """∉ : le ∈ et le trait du « non », centré dessus."""
    centre_x = (element_box[0] + element_box[2]) / 2
    half_width = (slash_box[2] - slash_box[0]) / 2
    slash = Frame((centre_x - half_width, slash_box[1], centre_x + half_width, slash_box[3]))
    return union(element_of(source, Frame(element_box)), not_slash(slash))


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


def maps_to(font: TTFont, f: Frame) -> pathops.Path:
    """↦ : la flèche → de Shantell (déjà dans la police), prolongée jusqu'au bord
    gauche de la boîte de KaTeX, où se dresse la barre.

    La flèche de Shantell est plus courte que celle de KaTeX : la barre posée
    juste à son départ la tassait en « ⊢> »."""
    arrow = glyph_path(font, ord("→"))
    x_min, y_min, _, y_max = arrow.bounds
    shaft_y = (y_min + y_max) / 2
    half_bar = (y_max - y_min) / 2 - STROKE / 2
    return union(
        arrow,
        line((f.left, shaft_y), (x_min + 2 * STROKE, shaft_y)),
        line((f.left, shaft_y - half_bar), (f.left, shaft_y + half_bar)),
    )


def vector_arrow(f: Frame) -> pathops.Path:
    """La flèche de \\vec : un trait et la pointe courte de la flèche de Shantell.

    Le cadre de KaTeX est trop bas pour un trait de lettre : la pointe déborde
    vers le haut, du côté où il n'y a rien."""
    head_height = VECTOR_HEAD
    shaft_y = f.bottom + VECTOR_LIFT + head_height
    head_length = 0.9 * head_height
    commands = [
        ("M", (f.left, shaft_y)),
        ("L", (f.right - 0.3 * head_length, shaft_y)),
        ("M", (f.right - head_length, shaft_y + head_height)),
        ("L", (f.right, shaft_y)),
        ("L", (f.right - head_length, shaft_y - head_height)),
    ]
    return stroked(to_path(commands))


def glyph_path(font: TTFont, codepoint: int) -> pathops.Path:
    glyph_set = font.getGlyphSet()
    recording = DecomposingRecordingPen(glyph_set)
    glyph_set[font.getBestCmap()[codepoint]].draw(recording)
    path = pathops.Path()
    recording.replay(path.getPen())
    path.simplify()
    return path


def add_glyph(font: TTFont, codepoint: int, glyph_name: str) -> None:
    """Ajoute à la police un glyphe vide pour un caractère qu'elle n'a pas."""
    if codepoint in font.getBestCmap():
        return
    font.setGlyphOrder(font.getGlyphOrder() + [glyph_name])
    font["glyf"][glyph_name] = TTGlyphPen(None).glyph()
    font["hmtx"][glyph_name] = (0, 0)
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap[codepoint] = glyph_name


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
    for char, mirror, bar in [("⊂", False, ""), ("⊃", True, ""), ("⊆", False, "eq"), ("⊇", True, "eq")]:
        box, advance = reference_glyph(reference, ord(char))
        put_glyph(font, ord(char), subset(source, box, mirror, bar), advance)
    # \not (≠, et tout ce que MathLive barre) : glyphe privé posé sur le symbole
    slash_box, slash_advance = reference_glyph(reference, 0xE020)
    put_glyph(font, 0xE020, not_slash(Frame(slash_box)), slash_advance)
    # ∉ : absent de KaTeX, ajouté avec la chasse du ∈
    element_box, element_advance = reference_glyph(reference, ord("∈"))
    add_glyph(font, ord("∉"), "notelement")
    put_glyph(font, ord("∉"), not_element_of(source, element_box, slash_box), element_advance)
    box, advance = reference_glyph(reference, ord("↦"))
    put_glyph(font, ord("↦"), maps_to(font, Frame(box)), advance)
    box, advance = reference_glyph(reference, 0x20D7)
    put_glyph(font, 0x20D7, vector_arrow(Frame(box)), advance)
    font.flavor = "woff2"
    font.save(path)
    print(f"{name}: {' '.join(drawers)} ⊂ ⊃ ⊆ ⊇ ≠ ∉ ↦ \\vec -> {path.relative_to(REPO_ROOT)}")

    name = "KaTeX_AMS-Regular"
    path = OUTPUT_DIR / f"{name}.woff2"
    font = TTFont(path)
    reference = TTFont(ORIGINAL_DIR / f"{name}.woff2")
    # ℕ ℤ ℝ : tracés en traits souples par blackboard_letters.py
    for char in "QC":
        box, advance = reference_glyph(reference, ord(char))
        put_glyph(font, ord(char), blackboard_letter(source, char, box, advance), advance)
    for char, mirror, bar in [("⊊", False, "neq"), ("⊋", True, "neq"), ("⊈", False, "not"), ("⊉", True, "not")]:
        box, advance = reference_glyph(reference, ord(char))
        put_glyph(font, ord(char), subset(source, box, mirror, bar), advance)
    font.flavor = "woff2"
    font.save(path)
    print(f"{name}: ℚ ℂ ⊊ ⊋ ⊈ ⊉ -> {path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
