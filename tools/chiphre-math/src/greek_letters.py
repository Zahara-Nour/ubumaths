#!/usr/bin/env python3
"""
Greek letters in Shantell's hand. Shantell Sans has only π and Ω (see
replace_symbols.py); the other letters are

- borrowed whole from Shantell glyphs of the same shape: Cyrillic Г П Ф Ѳ ѳ з
  є к т ф, Latin Y V v o, ∆ and µ, mirrored when needed (Λ is V upside down, ε
  is з mirrored);
- taken from a single piece of a Shantell letter: ι (the lower part of l, with
  its foot), υ (u), χ (x stretched below the baseline);
- drawn in smooth strokes, like Shantell's own letters: α β γ δ ζ η λ ξ ρ ϱ σ ς
  φ ψ ω ϖ ϑ. Each stroke is a Catmull-Rom curve through points taken on the
  centre lines of Shantell's letters (bowls of o and c, x-height, ascender,
  descender), stroked with the width of its letters and round ends; a letter
  where the hand lifts (η ψ ζ λ ϱ ϖ) has two strokes overlapping, like n. Pieces
  of Shantell letters joined together kept corners at the joins, and stood out;
- drawn as straight centre lines with the width of Shantell's letters: Ξ Σ Ψ.

Like the other letters, each one keeps Shantell's size and baseline, is centred
on the KaTeX glyph it replaces and narrowed only when wider than its advance
(MathLive lays formulas out with the KaTeX metrics, hard-coded). Lowercase
letters go to KaTeX_Math-Italic and, added, to KaTeX_Main-Regular (MathLive
sets lowercase Greek upright in French); capitals to KaTeX_Main-Regular (upright,
the default) and KaTeX_Math-Italic (\\varGamma…).

Run after replace_symbols.py and before build_typst_math_font.py. The script
works in place on static/fonts/chiphre-math/ and redraws each glyph from the
Shantell source, so running it twice gives the same font. Writing to
static/fonts/KaTeX_*.woff2 is refused: the original KaTeX fonts were
overwritten that way on 2026-01-20.
"""

from __future__ import annotations

import argparse
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
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "chiphre-math"
ORIGINAL_DIR = REPO_ROOT / "static" / "fonts" / "katex-original"
SHANTELL = REPO_ROOT / "tools" / "chiphre-math" / "fonts" / "input" / "shantell-sans-300.ttf"

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


# --- Lettres faites d'un morceau de lettre Shantell : ι υ χ ---
#
# Un bout coupé net reçoit un bout rond, comme les traits de Shantell.

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


def moved(path: pathops.Path, matrix: Matrix) -> pathops.Path:
    result = pathops.Path()
    path.draw(TransformPen(result.getPen(), matrix))
    result.simplify()
    return result


def cap(x: float, y: float) -> pathops.Path:
    """Un bout rond, au trait des lettres."""
    return stroked(to_path([("M", (x, y)), ("L", (x + 0.5, y))]))


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


def assembled_iota(source: TTFont) -> pathops.Path:
    # Le bas du l de Shantell, avec son pied qui part à droite
    l_glyph = glyph(source, "l")
    top = X_HEIGHT
    lower = keep(l_glyph, (-100, -100, 800, top))
    return merged(lower, cap(stroke_centre(lower, top - 2), top))


def assembled_upsilon(source: TTFont) -> pathops.Path:
    return glyph(source, "u")


def assembled_chi(source: TTFont) -> pathops.Path:
    # Le x de Shantell, étiré pour descendre sous la ligne comme le χ
    x = glyph(source, "x")
    y_min, y_max = x.bounds[1], x.bounds[3]
    factor = (y_max - (DESCENDER - HALF)) / (y_max - y_min)
    return moved(x, (1, 0, 0, factor, 0, y_max * (1 - factor)))


# --- Lettres d'un seul trait : courbe lisse par des points ---
#
# Les assemblages gardent des angles aux raccords. Ces lettres-ci sont un seul
# trait souple, comme celles de Shantell : une courbe sans cassure (spline de
# Catmull-Rom) passe par des points relevés sur les lignes centrales des lettres
# de Shantell (ventres du o et du c, hauteur d'x, jambages), puis elle est
# épaissie au trait des lettres, bouts ronds.


def smooth(points) -> list:
    """Commandes d'une courbe lisse passant par les points (Catmull-Rom)."""
    padded = [points[0]] + list(points) + [points[-1]]
    commands = [("M", points[0])]
    for i in range(1, len(padded) - 2):
        p0, p1, p2, p3 = padded[i - 1], padded[i], padded[i + 1], padded[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        commands.append(("C", (*c1, *c2, *p2)))
    return commands


def one_stroke(points) -> pathops.Path:
    return stroked(to_path(smooth(points)))


def curvy_alpha(source: TTFont) -> pathops.Path:
    # Queue du haut, croisement, ventre du c (gauche 96, bas 24, haut 455),
    # retour par le croisement, queue du bas
    return one_stroke([
        (605, 480), (530, 395), (455, 245), (398, 100), (300, 26), (175, 52), (106, 158),
        (97, 255), (124, 354), (198, 433), (300, 457), (396, 396), (455, 245), (522, 95), (608, 16),
    ])


def curvy_beta(source: TTFont) -> pathops.Path:
    # La hampe monte du jambage, deux ventres, le second revient vers la hampe
    return one_stroke([
        (110, DESCENDER), (104, 40), (100, 330), (108, 570), (150, 695), (245, 726), (345, 700),
        (392, 622), (358, 530), (262, 480), (205, 466), (275, 456), (390, 420), (462, 310),
        (465, 175), (405, 62), (290, 18), (180, 32), (112, 90),
    ])


def curvy_gamma(source: TTFont) -> pathops.Path:
    # Bras gauche courbe, boucle en goutte sous la ligne, bras droit qui remonte
    return one_stroke([
        (25, 425), (85, X_HEIGHT), (160, 380), (225, 180), (262, 20), (300, -105), (292, -205),
        (240, DESCENDER), (192, -175), (205, -70), (262, 25), (345, 210), (420, 380), (478, X_HEIGHT),
    ])


def curvy_delta(source: TTFont) -> pathops.Path:
    # L'enroulement du haut descend dans le ventre du o, qui fait le tour
    return one_stroke([
        (440, 680), (385, ASCENDER), (290, ASCENDER + 5), (215, 700), (220, 630), (305, 565),
        (420, 470), (478, 330), (470, 180), (400, 60), (292, 22), (170, 40), (100, 130),
        (92, 250), (130, 360), (220, 435), (330, 455), (420, 420),
    ])


def strokes(*point_lists) -> pathops.Path:
    """Plusieurs traits souples qui se chevauchent, comme la main qui se lève (n, ψ)."""
    return merged(*(one_stroke(points) for points in point_lists))


# Queue commune de ζ ξ ς : le trait file à droite sous la ligne, puis plonge et revient
TAIL = [(340, 25), (410, -35), (400, -130), (330, -195), (270, DESCENDER + 10)]


def curvy_zeta(source: TTFont) -> pathops.Path:
    return strokes(
        [(130, 690), (280, 705), (420, 712)],
        [(405, 702), (260, 600), (140, 460), (80, 290), (110, 125), (225, 48)] + TAIL,
    )


def curvy_eta(source: TTFont) -> pathops.Path:
    # Le n : la hampe, puis l'arche dont la jambe droite descend au jambage
    return strokes(
        [(92, X_HEIGHT + 5), (90, 250), (95, BASE)],
        [(95, 300), (150, 420), (260, 465), (380, 432), (446, 330), (456, 150), (455, -100), (450, DESCENDER)],
    )


def curvy_lambda(source: TTFont) -> pathops.Path:
    return strokes(
        [(85, ASCENDER - 10), (150, ASCENDER + 5), (215, 650), (280, 450), (360, 230), (420, 90), (462, BASE)],
        [(275, 420), (190, 250), (120, 110), (70, BASE)],
    )


def curvy_xi(source: TTFont) -> pathops.Path:
    return one_stroke([
        (410, 710), (270, 714), (165, 662), (170, 575), (260, 526), (365, 512), (250, 505), (130, 440),
        (80, 300), (105, 140), (225, 48),
    ] + TAIL)


def curvy_rho(source: TTFont) -> pathops.Path:
    # Du bas du jambage, la hampe monte et fait le tour du ventre
    return one_stroke([
        (105, DESCENDER), (100, 0), (100, 230), (130, 370), (220, 455), (330, 460), (430, 390),
        (462, 250), (430, 110), (340, 30), (230, 25), (140, 70), (102, 140),
    ])


def curvy_varrho(source: TTFont) -> pathops.Path:
    # Le ventre rond (le trait repasse sur son début pour se refermer sans pli),
    # et la hampe qui descend de son flanc gauche et file à droite
    return strokes(
        [(280, 462), (410, 415), (462, 270), (430, 110), (330, 28), (210, 30), (120, 100), (98, 250),
         (140, 390), (250, 462), (350, 455), (425, 400)],
        [(100, 200), (98, 0), (110, -140), (170, -205), (280, -215), (380, -205)],
    )


def curvy_sigma(source: TTFont) -> pathops.Path:
    # La barre du haut, qui revient en arrière et fait le tour du ventre
    return one_stroke([
        (540, 470), (420, 462), (290, 462), (160, 425), (80, 300), (85, 140), (170, 45), (290, 26),
        (400, 60), (458, 180), (445, 330), (370, 440), (270, 465),
    ])


def curvy_final_sigma(source: TTFont) -> pathops.Path:
    return one_stroke([(440, 445), (350, 468), (220, 445), (115, 360), (80, 235), (120, 115), (230, 50)] + TAIL)


def curvy_varphi(source: TTFont) -> pathops.Path:
    # La boucle ouverte du φ manuscrit, puis la hampe qui descend en son milieu
    return one_stroke([
        (170, 430), (100, 380), (70, 260), (110, 120), (220, 40), (330, 40), (430, 120), (470, 260),
        (440, 400), (350, 462), (270, 420), (250, 300), (248, 100), (245, -100), (245, DESCENDER),
    ])


def curvy_psi(source: TTFont) -> pathops.Path:
    return strokes(
        [(60, 470), (60, 300), (90, 140), (180, 50), (270, 30), (370, 55), (450, 150), (472, 300), (472, 470)],
        [(265, ASCENDER), (268, 300), (265, 0), (262, DESCENDER)],
    )


OMEGA = [
    (115, 470), (65, 340), (68, 170), (120, 60), (195, 28), (262, 70), (285, 180), (288, 240), (292, 180),
    (315, 70), (380, 28), (455, 60), (505, 170), (508, 340), (458, 470),
]


def curvy_omega(source: TTFont) -> pathops.Path:
    # Deux creux ronds, qui se rejoignent en une pointe au milieu
    return one_stroke(OMEGA)


def curvy_varpi(source: TTFont) -> pathops.Path:
    return strokes([(30, 470), (300, 480), (575, 470)], OMEGA)


def curvy_vartheta(source: TTFont) -> pathops.Path:
    # Un crochet à gauche, le creux, la boucle du haut qui revient en queue
    return one_stroke([
        (45, 380), (75, 450), (120, 465), (150, 420), (140, 300), (150, 140), (200, 50), (290, 30),
        (390, 70), (440, 200), (445, 330), (440, 480), (410, 640), (340, ASCENDER), (270, 700),
        (255, 600), (300, 470), (400, 400), (505, 395),
    ])


ASSEMBLED: Dict[str, Callable[[TTFont], pathops.Path]] = {
    "ι": assembled_iota,
    "υ": assembled_upsilon,
    "χ": assembled_chi,
}
CURVY: Dict[str, Callable[[TTFont], pathops.Path]] = {
    "α": curvy_alpha,
    "β": curvy_beta,
    "γ": curvy_gamma,
    "δ": curvy_delta,
    "ζ": curvy_zeta,
    "η": curvy_eta,
    "λ": curvy_lambda,
    "ξ": curvy_xi,
    "ρ": curvy_rho,
    "ϱ": curvy_varrho,
    "σ": curvy_sigma,
    "ς": curvy_final_sigma,
    "φ": curvy_varphi,
    "ψ": curvy_psi,
    "ω": curvy_omega,
    "ϖ": curvy_varpi,
    "ϑ": curvy_vartheta,
}


# --- Capitales dessinées : lignes centrales droites, unités de Shantell ---
#
# Ξ Σ Ψ sont faites de traits droits, où un trait calculé ne se remarque pas.


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
    if char in CURVY:
        return CURVY[char](source)
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
