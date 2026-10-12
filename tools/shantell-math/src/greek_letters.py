#!/usr/bin/env python3
"""
Greek letters in Shantell's hand. Shantell Sans has only π and Ω (see
replace_symbols.py); the other letters are

- borrowed whole from Shantell glyphs of the same shape: Cyrillic Г П Ф Ѳ ѳ з
  є к т ф, Latin Y V v o, ∆ and µ, mirrored when needed (Λ is V upside down, ε
  is з mirrored);
- assembled from pieces of real Shantell letters, cut, moved or mirrored and
  joined by overlapping (a hand-drawn curve, even at the right stroke width,
  stands out next to Shantell's letters): α from the bowl of c closed by x, β
  from B, γ from v (its left arm turned down as the tail), δ from ð without its
  bar and topped by the top of f, η from ŋ, ι from the foot of l, λ from л,
  ρ ϱ σ φ from o, ψ υ ω from u, χ from x, ζ from C, ξ from a mirrored 3, ς from
  c; the stem of p, the bar of t and the hook of j are the joints and tails;
- drawn as centre lines stroked with the width of Shantell's letters when no
  piece fits: Ξ Σ Ψ (straight strokes) and ϑ.

Like the other letters, each one keeps Shantell's size and baseline, is centred
on the KaTeX glyph it replaces and narrowed only when wider than its advance
(MathLive lays formulas out with the KaTeX metrics, hard-coded). Lowercase
letters go to KaTeX_Math-Italic and, added, to KaTeX_Main-Regular (MathLive
sets lowercase Greek upright in French); capitals to KaTeX_Main-Regular (upright,
the default) and KaTeX_Math-Italic (\\varGamma…).

Run after replace_symbols.py and before build_typst_math_font.py. The script
works in place on static/fonts/shantell-katex/ and redraws each glyph from the
Shantell source, so running it twice gives the same font. Writing to
static/fonts/KaTeX_*.woff2 is refused: the original KaTeX fonts were
overwritten that way on 2026-01-20.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path
from typing import Callable, Dict, Tuple

import pathops
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

# Les scripts voisins, même lancé en mode isolé (python -I)
sys.path.insert(0, str(Path(__file__).resolve().parent))

from redraw_symbols import add_glyph  # noqa: E402
from replace_delimiters import STROKE, put_glyph, reference_glyph, stroked, to_path  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "shantell-katex"
ORIGINAL_DIR = REPO_ROOT / "static" / "fonts" / "katex-original"
SHANTELL = REPO_ROOT / "tools" / "shantell-math" / "fonts" / "input" / "shantell-sans-300.ttf"

# Lignes centrales des traits, mesurées sur Shantell 300 (o, H, p, ß) : le bord
# extérieur du trait tombe sur la ligne de Shantell
HALF = STROKE / 2
X_HEIGHT = 496 - HALF
CAP = 710 - HALF
ASCENDER = 760 - HALF
DESCENDER = -261 + HALF
BASE = HALF

# Marge minimale entre une lettre resserrée et le bord de sa place
SIDE_MARGIN = 20

Point = Tuple[float, float]

# Lettre grecque -> (glyphe de Shantell, miroir gauche-droite, miroir haut-bas)
BORROWED: Dict[str, Tuple[str, bool, bool]] = {
    "Γ": ("Г", False, False),
    "Δ": ("∆", False, False),
    "Θ": ("Ѳ", False, False),
    "Λ": ("V", False, True),
    "Π": ("П", False, False),
    "Υ": ("Y", False, False),
    "Φ": ("Ф", False, False),
    "ε": ("з", True, False),
    "ϵ": ("є", False, False),
    "θ": ("ѳ", False, False),
    "κ": ("к", False, False),
    "μ": ("µ", False, False),
    "ν": ("v", False, False),
    "ο": ("o", False, False),
    # π de Shantell lui-même (déjà mis dans Math-Italic par replace_symbols.py) :
    # ici pour Main-Regular
    "π": ("π", False, False),
    "τ": ("т", False, False),
    "ϕ": ("ф", False, False),
}


# --- Lettres assemblées : morceaux de vraies lettres de Shantell ---
#
# Une courbe calculée, même au bon trait, se voit à côté des lettres de Shantell :
# hampes trop droites, ventres trop réguliers. Ces lettres sont donc faites de
# morceaux de glyphes Shantell (découpés, déplacés, retournés), raccordés en se
# chevauchant ; un bout coupé net reçoit un bout rond, comme les traits de Shantell.

Box = Tuple[float, float, float, float]
Matrix = Tuple[float, float, float, float, float, float]


def glyph(source: TTFont, char: str) -> pathops.Path:
    glyph_set = source.getGlyphSet()
    recording = DecomposingRecordingPen(glyph_set)
    glyph_set[source.getBestCmap()[ord(char)]].draw(recording)
    path = pathops.Path()
    recording.replay(path.getPen())
    path.simplify()
    return path


def stroke_of(source: TTFont, char: str, index: int) -> pathops.Path:
    """Un trait d'un glyphe Shantell : ses traits sont des contours à part
    (la barre du t et du ð, la hampe du p)."""
    glyph_set = source.getGlyphSet()
    recording = DecomposingRecordingPen(glyph_set)
    glyph_set[source.getBestCmap()[ord(char)]].draw(recording)
    path = pathops.Path()
    recording.replay(path.getPen())
    contour = pathops.Path()
    contour.addPath(list(path.contours)[index])
    contour.simplify()
    return contour


def p_stem(source: TTFont) -> pathops.Path:
    """La hampe du p de Shantell, avec son coude et ses deux bouts ronds."""
    return stroke_of(source, "p", 1)


def rectangle(box: Box) -> pathops.Path:
    path = pathops.Path()
    path.moveTo(box[0], box[1])
    path.lineTo(box[2], box[1])
    path.lineTo(box[2], box[3])
    path.lineTo(box[0], box[3])
    path.close()
    return path


def keep(path: pathops.Path, box: Box) -> pathops.Path:
    """La partie du tracé dans la boîte."""
    return pathops.op(path, rectangle(box), pathops.PathOp.INTERSECTION)


def drop(path: pathops.Path, box: Box) -> pathops.Path:
    """Le tracé sans la partie dans la boîte."""
    return pathops.op(path, rectangle(box), pathops.PathOp.DIFFERENCE)


def moved(path: pathops.Path, matrix: Matrix) -> pathops.Path:
    result = pathops.Path()
    path.draw(TransformPen(result.getPen(), matrix))
    result.simplify()
    return result


def shift(path: pathops.Path, dx: float, dy: float) -> pathops.Path:
    return moved(path, (1, 0, 0, 1, dx, dy))


def mirror_x(path: pathops.Path, axis: float) -> pathops.Path:
    return moved(path, (-1, 0, 0, 1, 2 * axis, 0))


def mirror_y(path: pathops.Path, axis: float) -> pathops.Path:
    return moved(path, (1, 0, 0, -1, 0, 2 * axis))


def rotated(path: pathops.Path, degrees: float, centre: Point) -> pathops.Path:
    angle = math.radians(degrees)
    cos_a, sin_a = math.cos(angle), math.sin(angle)
    cx, cy = centre
    return moved(path, (cos_a, sin_a, -sin_a, cos_a, cx - cos_a * cx + sin_a * cy, cy - sin_a * cx - cos_a * cy))


def cap(x: float, y: float) -> pathops.Path:
    """Un bout rond, au trait des lettres."""
    return stroked(to_path([("M", (x, y)), ("L", (x + 0.5, y))]))


def thickened(path: pathops.Path, amount: float) -> pathops.Path:
    """Épaissit chaque trait de amount : un morceau réduit retrouve le trait des lettres."""
    border = pathops.Path()
    border.addPath(path)
    border.stroke(amount, pathops.LineCap.ROUND_CAP, pathops.LineJoin.ROUND_JOIN, 4)
    border.convertConicsToQuads()
    return merged(path, border)


def scaled(path: pathops.Path, factor: float) -> pathops.Path:
    """Réduit un morceau en gardant le trait des lettres."""
    return thickened(moved(path, (factor, 0, 0, factor, 0, 0)), STROKE * (1 - factor))


def tail_below(source: TTFont, path: pathops.Path, box: Box) -> pathops.Path:
    """Le coin bas-droit de la lettre (dans box) retourné sous la ligne de base,
    prolongé par le crochet du j : au lieu de remonter, le trait plonge en queue
    (ζ ξ ς). Le coin est retourné autour du milieu du trait du bas, pour que la
    queue reparte du trait sans cassure."""
    corner = keep(path, box)
    x = box[0] + 1
    inside = [y for y in range(-200, 300) if path.contains((x, y))]
    axis = (min(inside) + max(inside)) / 2
    turn = mirror_y(corner, axis)
    end_x, end_y = turn.bounds[2] - HALF, turn.bounds[1] + HALF
    # Le crochet s'arrête au jambage : on n'en garde que la hauteur qui manque
    j_stroke = stroke_of(source, "j", 0)
    hook_bottom = j_stroke.bounds[1]
    top = min(-20, hook_bottom + (end_y + 20) - (DESCENDER - HALF))
    hook = keep(j_stroke, (-200, -400, 400, top))
    hook_x = stroke_centre(hook, top - 20)
    return merged(drop(path, box), turn, shift(hook, end_x - hook_x - 10, end_y + 20 - top))


def merged(*paths: pathops.Path) -> pathops.Path:
    result = paths[0]
    for path in paths[1:]:
        result = pathops.op(result, path, pathops.PathOp.UNION)
    return result


def stroke_centre(path: pathops.Path, y: float, from_right: bool = False) -> float:
    """Milieu du premier trait rencontré sur l'horizontale y."""
    xs = range(1200, -400, -2) if from_right else range(-400, 1200, 2)
    crossings = []
    was_inside = False
    for x in xs:
        now_inside = path.contains((x, y))
        if now_inside != was_inside:
            crossings.append(x)
            if len(crossings) == 2:
                break
        was_inside = now_inside
    return (crossings[0] + crossings[1]) / 2


def assembled_alpha(source: TTFont) -> pathops.Path:
    # Le ventre du c de Shantell, refermé par le x : ses bras de gauche
    # rejoignent les bouts du c, ses bras de droite font les deux queues croisées
    bowl = keep(glyph(source, "c"), (-100, -100, 260, 600))
    arms = keep(shift(glyph(source, "x"), 200, 0), (240, -100, 900, 600))
    return merged(bowl, arms)


def assembled_beta(source: TTFont) -> pathops.Path:
    # Le B de Shantell sans l'amorce de son sommet, sa hampe prolongée sous la
    # ligne par le bas de la hampe du p
    b = drop(glyph(source, "B"), (-100, 600, 105, 800))
    descender = keep(p_stem(source), (-100, -400, 400, 120))
    join_y = 110
    dx = stroke_centre(b, join_y) - stroke_centre(descender, join_y)
    return merged(b, shift(descender, dx, 0))


def assembled_delta(source: TTFont) -> pathops.Path:
    # Le ð de Shantell sans sa barre ; le haut de son trait est remplacé par le
    # haut du f, penché dans le sens du trait, qui s'enroule vers la droite
    stroke = stroke_of(source, "ð", 0)
    cut_y = 540
    body = drop(stroke, (-100, cut_y, 800, 900))
    low, high = cut_y - 120, cut_y - 10
    lean = math.degrees(math.atan2(stroke_centre(body, high) - stroke_centre(body, low), high - low))
    top = keep(stroke_of(source, "f", 0), (-100, 450, 800, 900))
    base = (stroke_centre(top, top.bounds[1] + 4), top.bounds[1])
    top = rotated(top, -lean, base)
    join_y = cut_y - 40
    dx = stroke_centre(body, join_y) - stroke_centre(top, top.bounds[1] + 20)
    placed_top = shift(top, dx, join_y - top.bounds[1] - 20)
    return merged(body, placed_top)


def assembled_eta(source: TTFont) -> pathops.Path:
    # Le ŋ de Shantell sans le crochet du bas : sa jambe droite descend dans le
    # bas de la hampe du p
    cut_y = -60
    upper = drop(glyph(source, "ŋ"), (-100, -400, 800, cut_y))
    descender = keep(p_stem(source), (-100, -400, 400, cut_y + 60))
    join_y = cut_y + 20
    dx = stroke_centre(upper, join_y, from_right=True) - stroke_centre(descender, join_y)
    return merged(upper, shift(descender, dx, 0))


def assembled_iota(source: TTFont) -> pathops.Path:
    # Le bas du l de Shantell, avec son pied qui part à droite
    l_glyph = glyph(source, "l")
    top = X_HEIGHT
    lower = keep(l_glyph, (-100, -100, 800, top))
    return merged(lower, cap(stroke_centre(lower, top - 2), top))


def assembled_lambda(source: TTFont) -> pathops.Path:
    # Le л de Shantell, sa jambe droite prolongée vers le haut dans son élan, par
    # deux copies d'un de ses morceaux
    el = glyph(source, "л")
    low, high = 200, 380
    x_low = stroke_centre(el, low, from_right=True)
    x_high = stroke_centre(el, high, from_right=True)
    slope = (x_high - x_low) / (high - low)
    piece = keep(el, (260, low, 800, high))
    parts = [el]
    step = high - low - 20
    rise = 0.0
    while high + rise < ASCENDER:
        rise += step
        parts.append(shift(piece, slope * rise, rise))
    top = min(ASCENDER, high + rise)
    end = drop(merged(*parts), (-100, top, 800, 1000))
    return merged(end, cap(stroke_centre(end, top - 2, from_right=True), top))

def assembled_rho(source: TTFont) -> pathops.Path:
    # Le o de Shantell et le bas de la hampe du p, accroché à son flanc gauche
    o = glyph(source, "o")
    descender = keep(p_stem(source), (-100, -400, 400, 160))
    join_y = 120
    dx = stroke_centre(o, join_y) - stroke_centre(descender, join_y)
    return merged(o, shift(descender, dx, 0))


def assembled_sigma(source: TTFont) -> pathops.Path:
    # Le o de Shantell et la barre du t, qui part de son sommet vers la droite
    o = glyph(source, "o")
    bar = stroke_of(source, "t", 1)
    return merged(o, shift(bar, 270 - bar.bounds[0], o.bounds[3] - bar.bounds[3]))


def assembled_upsilon(source: TTFont) -> pathops.Path:
    return glyph(source, "u")


def assembled_varphi(source: TTFont) -> pathops.Path:
    # Le o de Shantell ouvert en haut à gauche, traversé par la hampe du p
    o = glyph(source, "o")
    opened = drop(o, (0, 300, 255, 600))
    end_x = stroke_centre(opened, 296)
    shaft = p_stem(source)
    shaft = shift(shaft, 0, o.bounds[3] - shaft.bounds[3])
    middle = (o.bounds[0] + o.bounds[2]) / 2
    return merged(opened, cap(end_x, 300), shift(shaft, middle - stroke_centre(shaft, 250), 0))


def assembled_chi(source: TTFont) -> pathops.Path:
    # Le x de Shantell, étiré pour descendre sous la ligne comme le χ
    x = glyph(source, "x")
    y_min, y_max = x.bounds[1], x.bounds[3]
    factor = (y_max - (DESCENDER - HALF)) / (y_max - y_min)
    return moved(x, (1, 0, 0, factor, 0, y_max * (1 - factor)))


def assembled_psi(source: TTFont) -> pathops.Path:
    # Le u de Shantell et la hampe du p, étirée du haut des lettres au jambage
    u = glyph(source, "u")
    shaft = p_stem(source)
    top, bottom = shaft.bounds[3], shaft.bounds[1]
    factor = (ASCENDER + HALF - bottom) / (top - bottom)
    shaft = moved(shaft, (1, 0, 0, factor, 0, bottom * (1 - factor)))
    middle = (u.bounds[0] + u.bounds[2]) / 2
    return merged(u, shift(shaft, middle - stroke_centre(shaft, 250), 0))


def assembled_zeta(source: TTFont) -> pathops.Path:
    # Le C de Shantell : la barre du t prolonge son sommet, son coin bas-droit
    # plonge sous la ligne
    c = drop(glyph(source, "C"), (420, 300, 800, 900))
    bar = stroke_of(source, "t", 1)
    top = shift(bar, 360 - bar.bounds[0], 711 - bar.bounds[3])
    return merged(tail_below(source, c, (300, -100, 800, 250)), top)


def assembled_xi(source: TTFont) -> pathops.Path:
    # Le 3 de Shantell en miroir, son coin bas-droit plongeant sous la ligne
    three = glyph(source, "3")
    mirrored = mirror_x(three, (three.bounds[0] + three.bounds[2]) / 2)
    return tail_below(source, mirrored, (330, -100, 800, 250))


def assembled_final_sigma(source: TTFont) -> pathops.Path:
    # Le c de Shantell, son bout du bas plongeant sous la ligne
    return tail_below(source, glyph(source, "c"), (250, -100, 800, 200))


def assembled_varrho(source: TTFont) -> pathops.Path:
    # Le o de Shantell et le bas de la hampe du p en miroir : la queue part à droite
    o = glyph(source, "o")
    descender = keep(p_stem(source), (-100, -400, 400, 160))
    descender = mirror_x(descender, stroke_centre(descender, 120))
    join_y = 120
    dx = stroke_centre(o, join_y) - stroke_centre(descender, join_y)
    return merged(o, shift(descender, dx, 0))


def assembled_omega(source: TTFont) -> pathops.Path:
    # Deux u de Shantell resserrés (le fond, coupé au milieu, se recolle), qui
    # partagent le bras du milieu, raccourci
    u = glyph(source, "u")
    middle = (u.bounds[0] + u.bounds[2]) / 2
    gap = 50
    narrow = merged(keep(u, (-100, -100, middle - gap / 2, 600)), shift(keep(u, (middle + gap / 2, -100, 800, 600)), -gap, 0))
    left_arm = stroke_centre(narrow, 300)
    right_arm = stroke_centre(narrow, 300, from_right=True)
    second = shift(narrow, right_arm - left_arm, 0)
    both = merged(narrow, second)
    shared_top = 250
    shared = drop(both, (right_arm - 60, shared_top, right_arm + 60, 900))
    return merged(shared, cap(right_arm, shared_top - 2))


def assembled_varpi(source: TTFont) -> pathops.Path:
    # Le ω, coiffé de la barre du t étirée sur sa largeur
    omega = assembled_omega(source)
    bar = stroke_of(source, "t", 1)
    factor = (omega.bounds[2] - omega.bounds[0]) / (bar.bounds[2] - bar.bounds[0])
    bar = moved(bar, (factor, 0, 0, 1, 0, 0))
    return merged(omega, shift(bar, omega.bounds[0] - bar.bounds[0], omega.bounds[3] - bar.bounds[3] + 30))


def assembled_gamma(source: TTFont) -> pathops.Path:
    # Le v de Shantell ; son bras gauche, retourné sous la pointe, descend vers
    # la gauche dans le prolongement du bras droit : la queue du γ, d'un seul trait
    v = glyph(source, "v")
    tip = stroke_centre(v, 30)
    left_arm = keep(v, (-100, -100, tip, 600))
    tail = keep(mirror_y(left_arm, 0), (-100, DESCENDER, 900, 100))
    return merged(v, tail, cap(stroke_centre(tail, DESCENDER + 4), DESCENDER))


ASSEMBLED: Dict[str, Callable[[TTFont], pathops.Path]] = {
    "α": assembled_alpha,
    "β": assembled_beta,
    "δ": assembled_delta,
    "η": assembled_eta,
    "ι": assembled_iota,
    "λ": assembled_lambda,
    "ρ": assembled_rho,
    "σ": assembled_sigma,
    "υ": assembled_upsilon,
    "φ": assembled_varphi,
    "χ": assembled_chi,
    "ψ": assembled_psi,
    "γ": assembled_gamma,
    "ζ": assembled_zeta,
    "ξ": assembled_xi,
    "ς": assembled_final_sigma,
    "ϱ": assembled_varrho,
    "ω": assembled_omega,
    "ϖ": assembled_varpi,
}


# --- Lettres dessinées : lignes centrales, unités de Shantell ---
#
# Pour les lettres sans morceau Shantell qui convienne : capitales faites de
# traits droits (Ξ Σ Ψ), où un trait calculé ne se remarque pas, et ϑ.


def vartheta() -> list:
    # ϑ manuscrit : un crochet à gauche, le creux, puis la boucle du haut qui
    # revient en queue vers la droite
    return [
        ("M", (50, 380)),
        ("C", (60, 440, 90, X_HEIGHT, 120, X_HEIGHT)),
        ("C", (160, X_HEIGHT, 150, 380, 140, 300)),
        ("C", (130, 150, 160, BASE, 260, BASE)),
        ("C", (380, BASE, 430, 150, 440, 300)),
        ("C", (450, 450, 450, ASCENDER, 360, ASCENDER)),
        ("C", (280, ASCENDER, 250, 650, 270, 560)),
        ("C", (300, 440, 400, 380, 500, 390)),
    ]


def capital_xi() -> list:
    return [
        ("M", (70, CAP)),
        ("L", (560, CAP)),
        ("M", (140, 360)),
        ("L", (490, 360)),
        ("M", (70, BASE)),
        ("L", (560, BASE)),
    ]


def capital_sigma() -> list:
    return [
        ("M", (560, CAP)),
        ("L", (70, CAP)),
        ("L", (330, 360)),
        ("L", (70, BASE)),
        ("L", (570, BASE)),
    ]


def capital_psi() -> list:
    return [
        ("M", (50, CAP)),
        ("L", (50, 470)),
        ("C", (50, 330, 170, 250, 320, 250)),
        ("C", (470, 250, 590, 330, 590, 470)),
        ("L", (590, CAP)),
        ("M", (320, CAP)),
        ("L", (320, BASE)),
    ]


DRAWN: Dict[str, Callable[[], list]] = {
    "ϑ": vartheta,
    "Ξ": capital_xi,
    "Σ": capital_sigma,
    "Ψ": capital_psi,
}

LOWERCASE = "αβγδεϵζηθϑικλμνξοπϖρϱσςτυφϕχψω"
CAPITALS = "ΓΔΘΛΞΠΣΥΦΨ"
# Les minuscules vont aussi dans Main-Regular : en français, MathLive écrit les
# minuscules grecques droites (letterShapeStyle « french », choisi d'après la
# langue du navigateur) et les cherche dans la police droite, que KaTeX n'en a
# pas pourvue ; le navigateur se rabattait sur une police du système
TARGETS = {
    "KaTeX_Math-Italic": LOWERCASE + CAPITALS,
    "KaTeX_Main-Regular": CAPITALS + LOWERCASE,
}
# Police de référence (boîte, chasse) d'une lettre absente de la police visée
FALLBACK_REFERENCE = "KaTeX_Math-Italic"


# --- Construction ---


def borrowed_path(source: TTFont, char: str) -> pathops.Path:
    source_char, mirror_x, mirror_y = BORROWED[char]
    glyph_set = source.getGlyphSet()
    recording = DecomposingRecordingPen(glyph_set)
    glyph_set[source.getBestCmap()[ord(source_char)]].draw(recording)
    path = pathops.Path()
    recording.replay(path.getPen())
    path.simplify()
    if not (mirror_x or mirror_y):
        return path
    x_min, y_min, x_max, y_max = path.bounds
    # Retourné dans sa propre boîte : la lettre garde sa place sur la ligne de base
    matrix = (
        -1 if mirror_x else 1,
        0,
        0,
        -1 if mirror_y else 1,
        x_min + x_max if mirror_x else 0,
        y_min + y_max if mirror_y else 0,
    )
    flipped = pathops.Path()
    path.draw(TransformPen(flipped.getPen(), matrix))
    flipped.simplify()
    return flipped


def letter_path(source: TTFont, char: str) -> pathops.Path:
    if char in ASSEMBLED:
        return ASSEMBLED[char](source)
    if char in BORROWED:
        return borrowed_path(source, char)
    return stroked(to_path(DRAWN[char]()))


def placed(outline: pathops.Path, box, advance: int) -> pathops.Path:
    """Taille et ligne de base de Shantell, centré sur la boîte KaTeX, resserré s'il déborde."""
    x_min, _, x_max, _ = outline.bounds
    scale_x = min(1.0, (advance - 2 * SIDE_MARGIN) / (x_max - x_min))
    dx = (box[0] + box[2]) / 2 - scale_x * (x_min + x_max) / 2
    result = pathops.Path()
    outline.draw(TransformPen(result.getPen(), (scale_x, 0, 0, 1, dx, 0)))
    result.simplify()
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Greek letters in Shantell's hand")
    parser.parse_args()

    source = TTFont(SHANTELL)
    for name, chars in TARGETS.items():
        path = OUTPUT_DIR / f"{name}.woff2"
        if path.parent.resolve() != OUTPUT_DIR.resolve():
            raise SystemExit(f"Sortie refusée hors de {OUTPUT_DIR}: {path}")
        font = TTFont(path)
        reference = TTFont(ORIGINAL_DIR / f"{name}.woff2")
        fallback = TTFont(ORIGINAL_DIR / f"{FALLBACK_REFERENCE}.woff2")
        for char in chars:
            if ord(char) in reference.getBestCmap():
                box, advance = reference_glyph(reference, ord(char))
            else:
                box, advance = reference_glyph(fallback, ord(char))
                add_glyph(font, ord(char), f"uni{ord(char):04X}")
            put_glyph(font, ord(char), placed(letter_path(source, char), box, advance), advance)
        font.flavor = "woff2"
        font.save(path)
        print(f"{name}: {chars} -> {path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
