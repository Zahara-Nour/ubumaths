#!/usr/bin/env python3
"""
Calligraphic capitals (\\mathcal) in Shantell's hand, for KaTeX_Caligraphic-Regular.

Shantell Sans has no script letters. Each capital follows the KaTeX
calligraphic letter it replaces (swash at the start of the stroke, curl at its
end) but is drawn like the curvy Greek letters (greek_letters.py): smooth
Catmull-Rom strokes through hand-placed points, stroked with the width of
Shantell's letters and round ends; a letter where the hand lifts (𝒫 𝒟 𝒜) has
several strokes overlapping. They must not read as Shantell's own capitals:
𝒮 (solution set) is not S.

Letters used in Chiphre (counted in the code on 2026-10-13): 𝒫 (43) 𝒞 (9) 𝒮 (7)
ℒ (2) 𝒟 (1) 𝒜 (1); the other capitals keep the KaTeX shape for now.

Like the other letters, each one keeps Shantell's size and baseline, is centred
on the KaTeX glyph it replaces and narrowed only when wider than its advance
(MathLive lays formulas out with the KaTeX metrics, hard-coded).

Run before build_typst_math_font.py. The script works in place on
static/fonts/chiphre-math/ and redraws each glyph from scratch, so running it
twice gives the same font. Writing to static/fonts/KaTeX_*.woff2 is refused:
the original KaTeX fonts were overwritten that way on 2026-01-20.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pathops
from fontTools.ttLib import TTFont

# Les scripts voisins, même lancé en mode isolé (python -I)
sys.path.insert(0, str(Path(__file__).resolve().parent))

from greek_letters import placed, strokes  # noqa: E402
from replace_delimiters import put_glyph, reference_glyph  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "chiphre-math"
ORIGINAL_DIR = REPO_ROOT / "static" / "fonts" / "katex-original"

# Lettre -> traits (points des lignes centrales, ligne de base 34, haut 676)
LETTERS = {
    # Le paraphe part d'un crochet à gauche et fait le ventre ; la hampe descend à part
    "P": [
        [(30, 470), (80, 470), (150, 540), (260, 620), (400, 660), (560, 650), (670, 580),
         (680, 470), (590, 380), (440, 330), (290, 320)],
        [(340, 640), (320, 500), (270, 300), (200, 120), (130, 0), (60, -20)],
    ],
    # La boucle du haut retombe, le corps s'arrondit, la queue remonte
    "C": [
        [(450, 500), (520, 600), (500, 680), (400, 690), (260, 610), (150, 450), (110, 270),
         (150, 110), (250, 30), (370, 34), (470, 110)],
    ],
    # Crochet en haut à droite, le dos, et la boucle finale en bas à gauche
    "S": [
        [(520, 540), (580, 610), (550, 680), (440, 695), (330, 640), (300, 540), (370, 450),
         (490, 380), (560, 270), (535, 130), (430, 40), (290, 22), (160, 50), (105, 120),
         (135, 185), (195, 190)],
    ],
    # Du crochet du haut, la hampe descend, boucle à gauche et file sur la base
    "L": [
        [(560, 560), (620, 610), (600, 680), (510, 695), (400, 620), (300, 450), (220, 250),
         (160, 110), (115, 45), (60, 25), (30, 60), (60, 100), (140, 95), (280, 60),
         (430, 30), (550, 40), (620, 100)],
    ],
    # Comme 𝒫 : le paraphe fait tout le ventre jusqu'en bas ; la hampe à part
    "D": [
        [(30, 470), (90, 470), (170, 560), (300, 640), (470, 665), (640, 620), (740, 500),
         (740, 330), (660, 170), (500, 60), (300, 30), (130, 34), (50, 60)],
        [(340, 640), (320, 480), (270, 280), (210, 100), (160, 30)],
    ],
    # Le grand trait monte d'une boucle en bas à gauche, la hampe redescend, la barre
    "A": [
        [(40, 110), (70, 40), (140, 20), (220, 60), (340, 220), (480, 430), (620, 640), (690, 695)],
        [(690, 695), (685, 450), (695, 200), (710, 30)],
        [(340, 240), (690, 250)],
    ],
}


def letter_path(char: str) -> pathops.Path:
    return strokes(*LETTERS[char])


def main() -> None:
    parser = argparse.ArgumentParser(description="Calligraphic capitals in Shantell's hand")
    parser.parse_args()

    name = "KaTeX_Caligraphic-Regular"
    path = OUTPUT_DIR / f"{name}.woff2"
    if path.parent.resolve() != OUTPUT_DIR.resolve():
        raise SystemExit(f"Sortie refusée hors de {OUTPUT_DIR}: {path}")
    font = TTFont(path)
    reference = TTFont(ORIGINAL_DIR / f"{name}.woff2")
    for char in LETTERS:
        box, advance = reference_glyph(reference, ord(char))
        put_glyph(font, ord(char), placed(letter_path(char), box, advance), advance)
    font.flavor = "woff2"
    font.save(path)
    print(f"{name}: {' '.join(LETTERS)} -> {path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
