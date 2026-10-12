#!/usr/bin/env python3
"""
Greek letters in Shantell's hand. Shantell Sans has only π and Ω (see
replace_symbols.py); the other letters are

- borrowed from Shantell glyphs of the same shape: Cyrillic Г П Ф Ѳ ѳ з є к т,
  Latin Y V v o, ∆ and µ, mirrored when needed (Λ is V upside down, ε is з
  mirrored);
- or drawn as centre lines stroked with the width of Shantell's letters, on
  Shantell's x-height, cap height and descender: α β γ δ ζ η ι λ ρ σ υ φ χ ψ ω,
  Ξ Σ Ψ.

Like the other letters, each one keeps Shantell's size and baseline, is centred
on the KaTeX glyph it replaces and narrowed only when wider than its advance
(MathLive lays formulas out with the KaTeX metrics, hard-coded). Lowercase
letters go to KaTeX_Math-Italic, capitals to KaTeX_Main-Regular (upright, the
default) and KaTeX_Math-Italic (\\varGamma…). ξ ϑ ϖ ϱ ς keep the KaTeX shape.

Run after replace_symbols.py and before build_typst_math_font.py. The script
works in place on static/fonts/shantell-katex/ and redraws each glyph from the
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
    "τ": ("т", False, False),
    "ϕ": ("ф", False, False),
}


# --- Lettres dessinées : lignes centrales, unités de Shantell ---


def alpha() -> list:
    # Une boucle à gauche, les deux traits de droite se croisent en queue de poisson
    return [
        ("M", (470, X_HEIGHT + 10)),
        ("C", (400, 200, 330, BASE, 220, BASE)),
        ("C", (110, BASE, 50, 120, 50, 235)),
        ("C", (50, 360, 120, X_HEIGHT, 225, X_HEIGHT)),
        ("C", (340, X_HEIGHT, 400, 260, 475, BASE - 10)),
    ]


def beta() -> list:
    return [
        ("M", (95, DESCENDER)),
        ("L", (95, 560)),
        ("C", (95, 670, 160, ASCENDER, 260, ASCENDER)),
        ("C", (370, ASCENDER, 420, 650, 420, 570)),
        ("C", (420, 480, 345, 425, 225, 425)),
        ("C", (390, 425, 470, 330, 470, 220)),
        ("C", (470, 90, 375, BASE, 260, BASE)),
        ("C", (180, BASE, 120, 30, 95, 80)),
    ]


def gamma() -> list:
    # Deux bras qui se croisent sur la ligne de base, une petite boucle dessous
    return [
        ("M", (30, X_HEIGHT - 20)),
        ("C", (130, X_HEIGHT + 20, 220, 260, 255, 40)),
        ("C", (340, -90, 330, DESCENDER, 255, DESCENDER)),
        ("C", (180, DESCENDER, 170, -90, 255, 40)),
        ("M", (465, X_HEIGHT)),
        ("L", (255, 40)),
    ]


def delta() -> list:
    return [
        ("M", (400, ASCENDER - 20)),
        ("C", (330, ASCENDER + 10, 160, ASCENDER + 10, 160, 650)),
        ("C", (160, 570, 455, 470, 455, 230)),
        ("C", (455, 90, 365, BASE, 250, BASE)),
        ("C", (130, BASE, 50, 90, 50, 220)),
        ("C", (50, 350, 150, 440, 300, 470)),
    ]


def iota() -> list:
    # Le ı de Shantell, avec le crochet du bas qui le distingue d'un 1 ou d'un l
    return [
        ("M", (90, X_HEIGHT)),
        ("L", (90, 130)),
        ("C", (90, 50, 130, BASE, 200, BASE + 10)),
    ]


def zeta() -> list:
    return [
        ("M", (140, ASCENDER - 30)),
        ("L", (390, ASCENDER - 30)),
        ("C", (210, 570, 60, 390, 60, 220)),
        ("C", (60, 60, 160, BASE + 10, 300, BASE + 10)),
        ("C", (420, BASE + 10, 435, -80, 405, -140)),
        ("C", (385, -190, 335, DESCENDER, 290, DESCENDER)),
    ]


def eta() -> list:
    # Le n de Shantell, jambe droite prolongée sous la ligne
    return [
        ("M", (80, X_HEIGHT)),
        ("L", (80, BASE)),
        ("M", (80, 300)),
        ("C", (110, 410, 190, X_HEIGHT, 290, X_HEIGHT)),
        ("C", (400, X_HEIGHT, 460, 400, 460, 300)),
        ("L", (460, DESCENDER)),
    ]


def lambda_() -> list:
    return [
        ("M", (90, ASCENDER - 20)),
        ("C", (180, ASCENDER + 10, 225, 620, 275, 430)),
        ("L", (450, BASE)),
        ("M", (275, 410)),
        ("L", (60, BASE)),
    ]


def rho() -> list:
    return [
        ("M", (90, DESCENDER)),
        ("L", (90, 230)),
        ("C", (90, 380, 170, X_HEIGHT, 270, X_HEIGHT)),
        ("C", (390, X_HEIGHT, 460, 370, 460, 230)),
        ("C", (460, 90, 380, BASE, 270, BASE)),
        ("C", (180, BASE, 110, 50, 90, 110)),
    ]


def sigma() -> list:
    # Un o fermé, et le trait du haut qui part à droite
    return [
        ("M", (500, X_HEIGHT)),
        ("L", (250, X_HEIGHT)),
        ("C", (120, X_HEIGHT, 50, 360, 50, 230)),
        ("C", (50, 90, 140, BASE, 250, BASE)),
        ("C", (370, BASE, 440, 100, 440, 230)),
        ("C", (440, 360, 370, 445, 270, X_HEIGHT)),
    ]


def upsilon() -> list:
    return [
        ("M", (60, X_HEIGHT)),
        ("L", (60, 230)),
        ("C", (60, 80, 150, BASE, 260, BASE)),
        ("C", (390, BASE, 460, 130, 460, 300)),
        ("C", (460, 400, 440, 450, 410, X_HEIGHT)),
    ]


def varphi() -> list:
    # La boucle ouverte et la hampe du φ manuscrit
    return [
        ("M", (170, X_HEIGHT - 20)),
        ("C", (60, 400, 40, 250, 60, 150)),
        ("C", (90, 40, 200, BASE, 290, BASE)),
        ("C", (420, BASE, 490, 100, 490, 240)),
        ("C", (490, 380, 400, X_HEIGHT, 330, X_HEIGHT)),
        ("C", (260, X_HEIGHT, 240, 400, 240, 300)),
        ("L", (240, DESCENDER)),
    ]


def chi() -> list:
    return [
        ("M", (30, X_HEIGHT - 20)),
        ("C", (90, X_HEIGHT + 10, 140, 440, 200, 300)),
        ("L", (360, -150)),
        ("C", (390, -210, 420, DESCENDER, 470, DESCENDER + 20)),
        ("M", (450, X_HEIGHT)),
        ("L", (60, DESCENDER)),
    ]


def psi() -> list:
    return [
        ("M", (40, X_HEIGHT)),
        ("L", (40, 260)),
        ("C", (40, 100, 140, BASE, 260, BASE)),
        ("C", (380, BASE, 480, 100, 480, 260)),
        ("L", (480, X_HEIGHT)),
        ("M", (260, ASCENDER)),
        ("L", (260, DESCENDER)),
    ]


def omega() -> list:
    # Deux creux arrondis qui se rejoignent au milieu
    return [
        ("M", (90, X_HEIGHT)),
        ("C", (35, 380, 35, BASE, 165, BASE)),
        ("C", (245, BASE, 265, 80, 265, 200)),
        ("C", (265, 80, 285, BASE, 365, BASE)),
        ("C", (495, BASE, 495, 380, 440, X_HEIGHT)),
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
    "α": alpha,
    "β": beta,
    "γ": gamma,
    "δ": delta,
    "ζ": zeta,
    "ι": iota,
    "η": eta,
    "λ": lambda_,
    "ρ": rho,
    "σ": sigma,
    "υ": upsilon,
    "φ": varphi,
    "χ": chi,
    "ψ": psi,
    "ω": omega,
    "Ξ": capital_xi,
    "Σ": capital_sigma,
    "Ψ": capital_psi,
}

LOWERCASE = "αβγδεϵζηθικλμνορστυφϕχψω"
CAPITALS = "ΓΔΘΛΞΠΣΥΦΨ"
TARGETS = {
    "KaTeX_Math-Italic": LOWERCASE + CAPITALS,
    "KaTeX_Main-Regular": CAPITALS,
}


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
        for char in chars:
            box, advance = reference_glyph(reference, ord(char))
            put_glyph(font, ord(char), placed(letter_path(source, char), box, advance), advance)
        font.flavor = "woff2"
        font.save(path)
        print(f"{name}: {chars} -> {path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
