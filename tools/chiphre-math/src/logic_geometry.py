#!/usr/bin/env python3
"""
Logic and geometry symbols in Shantell's hand: ∀ ∃ ∄ ∧ ∨ ¬ ⊥ ∥ ∦ ∠ ∡ ∘ and
the accents of \\hat \\bar \\tilde.

- borrowed from Shantell glyphs: ∀ is A upside down, ∨ is V and ∧ is V upside
  down (fitted to the KaTeX box), ¬ and the hat accent are Shantell's own,
  ∘ (\\circ, so 90^\\circ) is Shantell's degree sign brought to the size of
  the KaTeX ∘;
- ∥ is two copies of Shantell's | (already in the font, see replace_symbols.py);
- drawn as centre lines stroked with the width of Shantell's letters, round
  ends: ∃ (angular: a rounded E mirrored reads as a 3), ⊥ ∠ ∡, the bar and the
  tilde. ∄ ∦ add the slash of \\not (redraw_symbols.py).

MathLive writes some of them with other characters than KaTeX: \\perp is ⟂
(U+27C2, missing from KaTeX, added with the box of ⊥), \\lnot is taken from
AMS (which has no ¬, added), and accents are ^ and ~ (drawn like ˆ and ˜).

Each glyph is drawn in the box of the KaTeX glyph it replaces (MathLive lays
formulas out with the KaTeX metrics, hard-coded); ∀ keeps Shantell's size and
baseline, like the letters. ∀ ∃ ∧ ∨ ¬ ⊥ ⟂ ∥ ∠ ∘ and the accents go to
KaTeX_Main-Regular, ¬ ∄ ∦ ∡ to KaTeX_AMS-Regular.

Run after replace_symbols.py (∥ reads the | it puts in the font) and before
build_typst_math_font.py. The script works in place on
static/fonts/chiphre-math/ and redraws each glyph from scratch, so running it
twice gives the same font. Writing to static/fonts/KaTeX_*.woff2 is refused:
the original KaTeX fonts were overwritten that way on 2026-01-20.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path
from typing import Tuple

import pathops
from fontTools.ttLib import TTFont

# Les scripts voisins, même lancé en mode isolé (python -I)
sys.path.insert(0, str(Path(__file__).resolve().parent))

from greek_letters import glyph, merged, moved, one_stroke, placed  # noqa: E402
from redraw_symbols import add_glyph, glyph_path, not_slash  # noqa: E402
from replace_delimiters import STROKE, Frame, put_glyph, reference_glyph, stroked, to_path  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "chiphre-math"
ORIGINAL_DIR = REPO_ROOT / "static" / "fonts" / "katex-original"
SHANTELL = REPO_ROOT / "tools" / "chiphre-math" / "fonts" / "input" / "shantell-sans-300.ttf"

Box = Tuple[float, float, float, float]


# --- Glyphes repris de Shantell ---


def fitted(outline: pathops.Path, box: Box, keep_ratio: bool = False) -> pathops.Path:
    """Le tracé mis dans la boîte KaTeX, bords extérieurs sur ses bords."""
    x_min, y_min, x_max, y_max = outline.bounds
    scale_x = (box[2] - box[0]) / (x_max - x_min)
    scale_y = (box[3] - box[1]) / (y_max - y_min)
    if keep_ratio:
        scale_x = scale_y = min(scale_x, scale_y)
    dx = (box[0] + box[2]) / 2 - scale_x * (x_min + x_max) / 2
    dy = (box[1] + box[3]) / 2 - scale_y * (y_min + y_max) / 2
    return moved(outline, (scale_x, 0, 0, scale_y, dx, dy))


def upside_down(outline: pathops.Path) -> pathops.Path:
    """Retourné dans sa propre boîte : il garde sa place sur la ligne de base."""
    _, y_min, _, y_max = outline.bounds
    return moved(outline, (1, 0, 0, -1, 0, y_min + y_max))


def centred(outline: pathops.Path, box: Box) -> pathops.Path:
    """Taille de Shantell, centré sur la boîte KaTeX (les opérateurs, sur l'axe)."""
    x_min, y_min, x_max, y_max = outline.bounds
    dx = (box[0] + box[2]) / 2 - (x_min + x_max) / 2
    dy = (box[1] + box[3]) / 2 - (y_min + y_max) / 2
    return moved(outline, (1, 0, 0, 1, dx, dy))


def double_bar(font: TTFont, box: Box) -> pathops.Path:
    """∥ : deux | de Shantell, chacun sur un trait du ∥ de KaTeX."""
    bar = glyph_path(font, ord("|"))
    x_min, _, x_max, _ = bar.bounds
    half = (x_max - x_min) / 2
    centre = (x_min + x_max) / 2
    left = box[0] + half
    right = box[2] - half
    return merged(
        moved(bar, (1, 0, 0, 1, left - centre, 0)),
        moved(bar, (1, 0, 0, 1, right - centre, 0)),
    )


# --- Symboles dessinés ---


def polyline(*points) -> pathops.Path:
    """Traits droits enchaînés, coins arrondis (la main ne se lève pas)."""
    return stroked(to_path([("M", points[0])] + [("L", p) for p in points[1:]]))


def exists(f: Frame) -> pathops.Path:
    """∃ : les barres montent un peu vers la gauche, comme celles du E de Shantell."""
    rise = 0.03 * f.height
    return merged(
        polyline((f.left, f.top - rise), (f.right, f.top), (f.right, f.bottom), (f.left, f.bottom + rise)),
        polyline((f.left + 0.12 * (f.right - f.left), f.middle + rise / 2), (f.right, f.middle)),
    )


def up_tack(f: Frame) -> pathops.Path:
    """⊥ : une hampe posée au milieu d'un trait de base."""
    centre = (f.left + f.right) / 2
    return merged(polyline((f.left, f.bottom), (f.right, f.bottom)), polyline((centre, f.top), (centre, f.bottom)))


def angle(f: Frame) -> pathops.Path:
    """∠ : le trait penché revient sur la base, d'un seul geste."""
    return polyline((f.right, f.top), (f.left, f.bottom), (f.right, f.bottom))


def measured_angle(f: Frame) -> pathops.Path:
    """∡ : l'angle et l'arc qui le mesure."""
    radius = 0.55 * (f.right - f.left)
    slope = math.atan2(f.top - f.bottom, f.right - f.left)
    arc = [
        (f.left + radius * math.cos(t), f.bottom + radius * math.sin(t))
        for t in (slope * k / 4 for k in range(5))
    ]
    return merged(angle(f), one_stroke(arc))


def bar_accent(f: Frame) -> pathops.Path:
    """La barre de \\bar, sur la ligne médiane de la boîte KaTeX."""
    return polyline((f.left, f.middle), (f.right, f.middle))


def tilde_accent(f: Frame) -> pathops.Path:
    """La vague de \\tilde : monte, redescend, remonte, comme le ~ de Shantell."""
    width = f.right - f.left
    low, high = f.bottom, f.top
    return one_stroke([
        (f.left, low + 0.25 * (high - low)),
        (f.left + 0.22 * width, high),
        (f.left + 0.5 * width, f.middle),
        (f.left + 0.78 * width, low),
        (f.right, low + 0.75 * (high - low)),
    ])


# --- Construction ---


def main() -> None:
    parser = argparse.ArgumentParser(description="Logic and geometry symbols in Shantell's hand")
    parser.parse_args()

    source = TTFont(SHANTELL)

    name = "KaTeX_Main-Regular"
    path = OUTPUT_DIR / f"{name}.woff2"
    if path.parent.resolve() != OUTPUT_DIR.resolve():
        raise SystemExit(f"Sortie refusée hors de {OUTPUT_DIR}: {path}")
    font = TTFont(path)
    reference = TTFont(ORIGINAL_DIR / f"{name}.woff2")
    v_shape = glyph(source, "V")
    drawers = {
        "∀": lambda box, advance: placed(upside_down(glyph(source, "A")), box, advance),
        "∃": lambda box, advance: exists(Frame(box)),
        "∨": lambda box, advance: fitted(v_shape, box),
        "∧": lambda box, advance: fitted(upside_down(v_shape), box),
        "¬": lambda box, advance: centred(glyph(source, "¬"), box),
        "⊥": lambda box, advance: up_tack(Frame(box)),
        "∥": lambda box, advance: double_bar(font, box),
        "∠": lambda box, advance: angle(Frame(box)),
        "∘": lambda box, advance: fitted(glyph(source, "°"), box, keep_ratio=True),
        # Accents : MathLive pose ^ et ~ (pas ˆ ˜) au-dessus de la lettre
        "ˆ": lambda box, advance: centred(glyph(source, "ˆ"), box),
        "^": lambda box, advance: centred(glyph(source, "ˆ"), box),
        "ˉ": lambda box, advance: bar_accent(Frame(box)),
        "˜": lambda box, advance: tilde_accent(Frame(box)),
        "~": lambda box, advance: tilde_accent(Frame(box)),
    }
    for char, draw in drawers.items():
        box, advance = reference_glyph(reference, ord(char))
        put_glyph(font, ord(char), draw(box, advance), advance)
    # \perp : MathLive écrit ⟂ (U+27C2), absent de KaTeX ; ajouté avec la boîte du ⊥
    box, advance = reference_glyph(reference, ord("⊥"))
    add_glyph(font, 0x27C2, "uni27C2")
    put_glyph(font, 0x27C2, up_tack(Frame(box)), advance)
    font.flavor = "woff2"
    font.save(path)
    print(f"{name}: {' '.join(drawers)} ⟂ -> {path.relative_to(REPO_ROOT)}")

    # Les mêmes formes, barrées ou mesurées, pour la police AMS
    slash_box, _ = reference_glyph(reference, 0xE020)
    exists_box, _ = reference_glyph(reference, ord("∃"))
    parallel_box, _ = reference_glyph(reference, ord("∥"))
    parallel = double_bar(font, parallel_box)
    not_box, not_advance = reference_glyph(reference, ord("¬"))

    name = "KaTeX_AMS-Regular"
    path = OUTPUT_DIR / f"{name}.woff2"
    font = TTFont(path)
    reference = TTFont(ORIGINAL_DIR / f"{name}.woff2")

    def struck(outline: pathops.Path, box: Box) -> pathops.Path:
        """Le symbole centré dans la boîte, barré du trait du « non »."""
        x_min, _, x_max, _ = outline.bounds
        centre = (box[0] + box[2]) / 2
        dx = centre - (x_min + x_max) / 2
        half = (slash_box[2] - slash_box[0]) / 2
        slash = not_slash(Frame((centre - half, box[1], centre + half, box[3])))
        return merged(moved(outline, (1, 0, 0, 1, dx, 0)), slash)

    # \lnot : MathLive prend ¬ dans AMS, qui n'en a pas ; ajouté avec la boîte de Main
    add_glyph(font, ord("¬"), "logicalnot")
    put_glyph(font, ord("¬"), centred(glyph(source, "¬"), not_box), not_advance)
    box, advance = reference_glyph(reference, ord("∄"))
    put_glyph(font, ord("∄"), struck(exists(Frame(exists_box)), box), advance)
    box, advance = reference_glyph(reference, ord("∦"))
    put_glyph(font, ord("∦"), struck(parallel, box), advance)
    box, advance = reference_glyph(reference, ord("∡"))
    put_glyph(font, ord("∡"), measured_angle(Frame(box)), advance)
    font.flavor = "woff2"
    font.save(path)
    print(f"{name}: ¬ ∄ ∦ ∡ -> {path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
