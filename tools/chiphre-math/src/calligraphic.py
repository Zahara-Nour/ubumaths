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
ℒ (2) 𝒟 (1) 𝒜 (1), drawn first; the other twenty capitals followed the same day.

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
    # Comme 𝒫, avec la seconde panse ; la hampe finit en boucle sous la panse
    "B": [
        [(30, 470), (80, 470), (150, 540), (260, 620), (400, 660), (540, 650), (620, 590),
         (610, 480), (520, 410), (400, 380), (330, 375)],
        [(330, 375), (480, 370), (600, 320), (640, 220), (590, 100), (460, 40), (300, 30),
         (180, 45)],
        [(340, 640), (320, 500), (270, 300), (220, 130), (170, 50), (100, 40), (70, 80)],
    ],
    # Deux arcs d'un trait, liés par un petit retour au milieu
    "E": [
        [(470, 600), (500, 660), (440, 690), (330, 670), (250, 600), (250, 500), (330, 420),
         (420, 400), (320, 385), (210, 330), (160, 220), (200, 100), (310, 35), (440, 40),
         (520, 110)],
    ],
    # Barre ondulée, hampe qui se recourbe en bas à gauche, petite barre
    "F": [
        [(150, 600), (230, 650), (400, 660), (560, 670), (660, 690)],
        [(430, 660), (400, 450), (340, 230), (270, 90), (190, 30), (110, 40), (80, 90)],
        [(300, 360), (400, 370), (500, 390)],
    ],
    # Comme 𝒞, la queue descend sous la ligne de base
    "G": [
        [(470, 560), (520, 640), (470, 690), (370, 680), (250, 600), (160, 450), (140, 290),
         (190, 150), (300, 80), (420, 100), (500, 200), (530, 320)],
        [(560, 420), (530, 200), (460, 0), (340, -110), (200, -130), (120, -80)],
    ],
    # Jambage gauche à crochet, jambage droit bouclé en bas, barre
    "H": [
        [(30, 560), (80, 650), (170, 680), (240, 610), (230, 450), (190, 250), (140, 40)],
        [(620, 680), (590, 450), (560, 200), (560, 70), (610, 30), (680, 60)],
        [(200, 360), (400, 380), (590, 390)],
    ],
    "I": [
        [(120, 580), (200, 640), (380, 650), (560, 680)],
        [(400, 650), (360, 450), (310, 250), (250, 70)],
        [(60, 34), (250, 40), (400, 40), (480, 80)],
    ],
    "J": [
        [(150, 560), (230, 640), (420, 650), (620, 680)],
        [(470, 650), (440, 450), (390, 200), (320, 30), (220, -60), (120, -50), (80, 10),
         (120, 60)],
    ],
    "K": [
        [(240, 680), (220, 450), (180, 250), (120, 34)],
        [(560, 620), (600, 670), (540, 690), (440, 620), (300, 450), (210, 370)],
        [(260, 400), (360, 300), (440, 120), (520, 40), (600, 40), (650, 90)],
    ],
    # Montée depuis un crochet en bas à gauche, deux pointes, la hampe de droite
    "M": [
        [(30, 60), (80, 30), (150, 60), (230, 250), (300, 500), (350, 680)],
        [(350, 680), (420, 350), (500, 60)],
        [(500, 60), (700, 370), (900, 680)],
        [(900, 680), (880, 400), (880, 150), (900, 50), (950, 40)],
    ],
    "N": [
        [(30, 60), (80, 30), (150, 60), (220, 280), (290, 680)],
        [(290, 680), (430, 350), (560, 40)],
        [(560, 40), (610, 300), (680, 620), (740, 690), (790, 660)],
    ],
    # La boucle se referme en croisant son départ, en haut
    "O": [
        [(300, 640), (420, 690), (560, 640), (630, 500), (620, 300), (540, 130), (400, 40),
         (260, 40), (170, 120), (150, 280), (200, 460), (300, 600), (400, 680), (480, 670)],
    ],
    # Comme 𝒪, avec une queue ondulée sous la boucle
    "Q": [
        [(380, 690), (530, 650), (620, 520), (620, 330), (540, 160), (400, 70), (260, 70),
         (170, 150), (150, 300), (210, 480), (320, 620), (380, 690)],
        [(120, 40), (220, 60), (380, 20), (520, -30), (640, 0)],
    ],
    # Comme 𝒫, avec une jambe qui finit en boucle
    "R": [
        [(30, 470), (80, 470), (150, 540), (260, 620), (400, 660), (540, 650), (620, 580),
         (610, 470), (520, 400), (380, 370), (280, 365)],
        [(340, 640), (320, 500), (270, 300), (210, 110), (160, 34)],
        [(330, 370), (420, 300), (480, 150), (540, 50), (620, 40), (680, 90)],
    ],
    "T": [
        [(60, 560), (130, 640), (300, 650), (500, 660), (660, 700)],
        [(400, 655), (380, 450), (330, 250), (280, 90), (260, 34)],
    ],
    "U": [
        [(60, 600), (110, 670), (190, 670), (220, 580), (190, 400), (160, 220), (200, 80),
         (300, 30), (420, 60), (520, 200), (600, 450), (660, 680)],
        [(660, 680), (630, 450), (610, 220), (630, 70), (680, 40)],
    ],
    "V": [
        [(40, 600), (90, 680), (170, 680), (220, 560), (240, 350), (260, 150), (280, 40)],
        [(280, 40), (450, 220), (570, 450), (600, 600), (580, 680)],
    ],
    "W": [
        [(40, 600), (90, 680), (170, 680), (210, 540), (230, 300), (250, 40)],
        [(250, 40), (400, 300), (530, 560)],
        [(530, 560), (540, 300), (560, 40)],
        [(560, 40), (720, 250), (820, 480), (840, 620), (820, 680)],
    ],
    "X": [
        [(150, 560), (220, 660), (330, 660), (390, 500), (430, 250), (470, 90), (540, 40),
         (610, 90)],
        [(640, 660), (500, 500), (300, 250), (150, 80), (70, 50), (40, 110)],
    ],
    # Comme 𝒰, la hampe de droite descend sous la ligne de base
    "Y": [
        [(40, 600), (90, 680), (170, 680), (220, 560), (230, 400), (280, 260), (380, 240),
         (480, 320), (560, 500), (620, 690)],
        [(620, 690), (580, 400), (500, 150), (380, -20), (240, -80), (130, -40), (130, 30)],
    ],
    "Z": [
        [(150, 560), (230, 650), (400, 640), (560, 650), (640, 690)],
        [(640, 690), (400, 400), (180, 160), (70, 34)],
        [(70, 34), (250, 50), (450, 30), (580, 60), (640, 130)],
        [(250, 350), (500, 370)],
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
