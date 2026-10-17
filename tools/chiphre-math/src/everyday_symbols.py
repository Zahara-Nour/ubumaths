#!/usr/bin/env python3
"""
Everyday symbols of school maths still drawn by KaTeX, in Shantell's hand:
ℏ % … ⋯ ⋅ ∖ ⇐ ⟸ ⟼ ↗ ↘ ℓ ∓ ∼ ≃ ≪ ≫ ∣ ♠ ♡ ♢ ♣ (KaTeX_Main-Regular) and
△ ⩽ ⩾ ∴ ∵ (KaTeX_AMS-Regular).

- borrowed from Shantell: ℏ (h with a slanted bar), %, ℓ, ↗ ↘, ∼ (~), △, ∓ (± upside down), ∖
  (\\), the dots of … ⋯ ⋅ ∴ ∵ (· and .), ≪ ≫ (two <), the heart of ♡ ♠;
- built like the arrows already drawn: ⇐ ⟸ are ⇒ ⟹ mirrored (same shafts, same
  short open head), ⟼ is ↦ lengthened;
- ⩽ ⩾ are Shantell's < with a bar parallel to its lower arm, as the slanted
  « inférieur ou égal » is handwritten in France; ≃ is a wave over a bar;
- ♢ ♣ are drawn: a diamond with slightly curved sides, three round leaves.

A glyph shrunk to fit its KaTeX box is thickened back to the stroke of the
letters (see smaller_digits.py). ∣ is the | already in the font. Like the
other symbols, each one is drawn in the box of the KaTeX glyph it replaces
(MathLive lays formulas out with the KaTeX metrics, hard-coded); ℏ ℓ % keep
Shantell's size and baseline, like the letters.

MathLive draws \\longrightarrow and the other long arrows itself (SVG), without
the font. Run after replace_symbols.py and redraw_symbols.py (| → ↦ are read
from the font) and before build_typst_math_font.py. The script works in place
on static/fonts/chiphre-math/ and redraws each glyph from scratch, so running
it twice gives the same font. Writing to static/fonts/KaTeX_*.woff2 is refused:
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
from logic_geometry import centred, polyline, upside_down  # noqa: E402
from redraw_symbols import double_arrow, glyph_path  # noqa: E402
from replace_delimiters import STROKE, Frame, put_glyph, reference_glyph, stroked, to_path  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "chiphre-math"
ORIGINAL_DIR = REPO_ROOT / "static" / "fonts" / "katex-original"
SHANTELL = REPO_ROOT / "tools" / "chiphre-math" / "fonts" / "input" / "shantell-sans-300.ttf"

Box = Tuple[float, float, float, float]

# Écart entre le bras du < et la barre du ⩽ (lignes centrales)
SLANT_BAR_GAP = 2.4 * STROKE


# --- Outils ---


def thickened(outline: pathops.Path, width: float) -> pathops.Path:
    """Le contour épaissi de width/2 de chaque côté."""
    if width <= 0:
        return outline
    ring = pathops.Path()
    outline.draw(ring.getPen())
    ring.stroke(width, pathops.LineCap.ROUND_CAP, pathops.LineJoin.ROUND_JOIN, 4)
    ring.convertConicsToQuads()
    return pathops.op(outline, ring, pathops.PathOp.UNION)


def shrunk_into(outline: pathops.Path, box: Box) -> pathops.Path:
    """Centré dans la boîte, réduit s'il déborde, trait des lettres regagné."""
    x_min, y_min, x_max, y_max = outline.bounds
    scale = min(1.0, (box[2] - box[0]) / (x_max - x_min), (box[3] - box[1]) / (y_max - y_min))
    if scale < 1:
        outline = thickened(moved(outline, (scale, 0, 0, scale, 0, 0)), STROKE * (1 - scale))
    return centred(outline, box)


def mirrored_x(outline: pathops.Path, box: Box) -> pathops.Path:
    """Retourné gauche-droite dans la boîte KaTeX."""
    return moved(outline, (-1, 0, 0, 1, box[0] + box[2], 0))


def dots(source: TTFont, char: str, centres) -> pathops.Path:
    """Le point de Shantell (. ou ·) posé sur chacun des centres."""
    dot = glyph(source, char)
    x_min, y_min, x_max, y_max = dot.bounds
    cx, cy = (x_min + x_max) / 2, (y_min + y_max) / 2
    return merged(*(moved(dot, (1, 0, 0, 1, x - cx, y - cy)) for x, y in centres))


def h_bar(source: TTFont) -> pathops.Path:
    """ℏ : le h de Shantell barré d'un trait penché, comme en physique (ħ a une barre droite)."""
    h = glyph(source, "h")
    x_min, y_min, x_max, y_max = h.bounds
    # Trait penché en travers de la hampe, aux deux tiers de sa hauteur
    stem = x_min + STROKE / 2
    y = y_min + 0.68 * (y_max - y_min)
    return merged(h, polyline((stem - 70, y - 55), (stem + 190, y + 75)))


# --- Points ---


def three_dots(source: TTFont, box: Box, on_axis: bool) -> pathops.Path:
    """… (sur la ligne de base) et ⋯ (sur l'axe) : trois points aux places de KaTeX."""
    dot = glyph(source, "·" if on_axis else ".")
    half = (dot.bounds[2] - dot.bounds[0]) / 2
    y = (box[1] + box[3]) / 2 if on_axis else (dot.bounds[1] + dot.bounds[3]) / 2
    left, right = box[0] + half, box[2] - half
    return dots(source, "·" if on_axis else ".", [(left, y), ((left + right) / 2, y), (right, y)])


def triangle_dots(source: TTFont, box: Box, pointing_up: bool) -> pathops.Path:
    """∴ (pointe en haut) et ∵ (pointe en bas)."""
    dot = glyph(source, "·")
    half = (dot.bounds[2] - dot.bounds[0]) / 2
    left, right = box[0] + half + 40, box[2] - half - 40
    low, high = box[1] + half, box[3] - half
    middle = (left + right) / 2
    if pointing_up:
        centres = [(middle, high), (left, low), (right, low)]
    else:
        centres = [(middle, low), (left, high), (right, high)]
    return dots(source, "·", centres)


# --- Flèches ---


def long_maps_to(font: TTFont, box: Box) -> pathops.Path:
    """⟼ : la flèche → de la police, pointe au bord droit, trait prolongé jusqu'à la barre."""
    arrow = glyph_path(font, ord("→"))
    x_min, y_min, x_max, y_max = arrow.bounds
    arrow = moved(arrow, (1, 0, 0, 1, box[2] - x_max, 0))
    f = Frame(box)
    shaft_y = (y_min + y_max) / 2
    half_bar = (y_max - y_min) / 2 - STROKE / 2
    return merged(
        arrow,
        polyline((f.left, shaft_y), (arrow.bounds[0] + 2 * STROKE, shaft_y)),
        polyline((f.left, shaft_y - half_bar), (f.left, shaft_y + half_bar)),
    )


# --- Relations ---


def slanted_less_equal(source: TTFont, box: Box) -> pathops.Path:
    """⩽ : le < de Shantell, une barre parallèle à son bras du bas, en dessous."""
    less = glyph(source, "<")
    x_min, y_min, x_max, y_max = less.bounds
    # Pointe et bout du bras du bas, sur la ligne centrale du trait
    tip = (x_min + STROKE / 2, (y_min + y_max) / 2)
    end = (x_max - STROKE / 2, y_min + STROKE / 2)
    length = math.hypot(end[0] - tip[0], end[1] - tip[1])
    # Décalage perpendiculaire au bras, vers le bas
    nx, ny = (end[1] - tip[1]) / length, -(end[0] - tip[0]) / length
    if ny > 0:
        nx, ny = -nx, -ny
    start = (tip[0] + SLANT_BAR_GAP * nx + 0.12 * (end[0] - tip[0]), tip[1] + SLANT_BAR_GAP * ny)
    stop = (end[0] + SLANT_BAR_GAP * nx, end[1] + SLANT_BAR_GAP * ny)
    return shrunk_into(merged(less, polyline(start, stop)), box)


def much_less(source: TTFont, box: Box) -> pathops.Path:
    """≪ : deux < de Shantell, le second décalé vers la droite."""
    less = glyph(source, "<")
    shift = 0.6 * (less.bounds[2] - less.bounds[0])
    return shrunk_into(merged(less, moved(less, (1, 0, 0, 1, shift, 0))), box)


def similar_equal(f: Frame) -> pathops.Path:
    """≃ : une vague dans le haut de la boîte, une barre en bas."""
    width = f.right - f.left
    low, high = f.bottom + 0.55 * f.height, f.top
    wave = one_stroke([
        (f.left, low + 0.3 * (high - low)),
        (f.left + 0.25 * width, high),
        (f.left + 0.5 * width, (low + high) / 2),
        (f.left + 0.75 * width, low),
        (f.right, low + 0.7 * (high - low)),
    ])
    return merged(wave, polyline((f.left, f.bottom), (f.right, f.bottom)))


# --- Cartes ---


def heart_outline(source: TTFont, box: Box) -> pathops.Path:
    """♡ : le contour du ♥ de Shantell, au trait des lettres."""
    heart = glyph(source, "♥")
    inner = (box[0] + STROKE / 2, box[1] + STROKE / 2, box[2] - STROKE / 2, box[3] - STROKE / 2)
    x_min, y_min, x_max, y_max = heart.bounds
    scale = min((inner[2] - inner[0]) / (x_max - x_min), (inner[3] - inner[1]) / (y_max - y_min))
    heart = centred(moved(heart, (scale, 0, 0, scale, 0, 0)), inner)
    line = pathops.Path()
    heart.draw(line.getPen())
    return stroked(line)


def spade(source: TTFont, box: Box) -> pathops.Path:
    """♠ : le ♥ de Shantell retourné, sur une petite tige évasée."""
    heart = upside_down(glyph(source, "♥"))
    x_min, y_min, x_max, y_max = heart.bounds
    cx = (x_min + x_max) / 2
    stem = merged(
        polyline((cx, y_min + 0.2 * (y_max - y_min)), (cx, y_min - 0.25 * (y_max - y_min))),
        polyline((cx - 0.18 * (x_max - x_min), y_min - 0.25 * (y_max - y_min)), (cx + 0.18 * (x_max - x_min), y_min - 0.25 * (y_max - y_min))),
    )
    return shrunk_into(merged(heart, stem), box)


def diamond(f: Frame) -> pathops.Path:
    """♢ : un losange aux côtés un peu bombés, d'un seul trait."""
    cx = (f.left + f.right) / 2
    half_w = 0.38 * (f.right - f.left)
    top, bottom, middle = f.top, f.bottom, f.middle
    points = [(cx, top), (cx + 0.55 * half_w, (top + middle) / 2 + 20), (cx + half_w, middle),
              (cx + 0.55 * half_w, (bottom + middle) / 2 - 20), (cx, bottom),
              (cx - 0.55 * half_w, (bottom + middle) / 2 - 20), (cx - half_w, middle),
              (cx - 0.55 * half_w, (top + middle) / 2 + 20), (cx, top)]
    return polyline(*points)


def disc(cx: float, cy: float, radius: float) -> pathops.Path:
    k = 0.5523 * radius
    path = to_path([
        ("M", (cx + radius, cy)),
        ("C", (cx + radius, cy + k, cx + k, cy + radius, cx, cy + radius)),
        ("C", (cx - k, cy + radius, cx - radius, cy + k, cx - radius, cy)),
        ("C", (cx - radius, cy - k, cx - k, cy - radius, cx, cy - radius)),
        ("C", (cx + k, cy - radius, cx + radius, cy - k, cx + radius, cy)),
    ])
    path.close()
    return path


def club(box: Box) -> pathops.Path:
    """♣ : trois feuilles rondes et une tige évasée."""
    f = Frame(box)
    width = f.right - f.left
    cx = (f.left + f.right) / 2
    radius = 0.2 * width
    leaf_y = f.bottom + 0.42 * f.height
    leaves = merged(
        disc(cx, f.top - radius, radius),
        disc(cx - 1.05 * radius, leaf_y, radius),
        disc(cx + 1.05 * radius, leaf_y, radius),
        disc(cx, leaf_y + 0.4 * radius, 0.6 * radius),
    )
    stem = merged(
        polyline((cx, leaf_y), (cx, f.bottom)),
        polyline((cx - 0.6 * radius, f.bottom), (cx + 0.6 * radius, f.bottom)),
    )
    return merged(leaves, stem)


# --- Construction ---


def main() -> None:
    parser = argparse.ArgumentParser(description="Everyday symbols in Shantell's hand")
    parser.parse_args()

    source = TTFont(SHANTELL)

    name = "KaTeX_Main-Regular"
    path = OUTPUT_DIR / f"{name}.woff2"
    if path.parent.resolve() != OUTPUT_DIR.resolve():
        raise SystemExit(f"Sortie refusée hors de {OUTPUT_DIR}: {path}")
    font = TTFont(path)
    reference = TTFont(ORIGINAL_DIR / f"{name}.woff2")
    bar = glyph_path(font, ord("|"))
    drawers = {
        "ℏ": lambda box, advance: placed(h_bar(source), box, advance),
        "%": lambda box, advance: placed(glyph(source, "%"), box, advance),
        "ℓ": lambda box, advance: placed(glyph(source, "ℓ"), box, advance),
        "…": lambda box, advance: three_dots(source, box, on_axis=False),
        "⋯": lambda box, advance: three_dots(source, box, on_axis=True),
        "⋅": lambda box, advance: centred(glyph(source, "·"), box),
        "∖": lambda box, advance: shrunk_into(glyph(source, "\\"), box),
        "⇐": lambda box, advance: mirrored_x(double_arrow(Frame(box), both_ends=False), box),
        "⟸": lambda box, advance: mirrored_x(double_arrow(Frame(box), both_ends=False), box),
        "⟼": lambda box, advance: long_maps_to(font, box),
        "↗": lambda box, advance: centred(glyph(source, "↗"), box),
        "↘": lambda box, advance: centred(glyph(source, "↘"), box),
        "∓": lambda box, advance: centred(upside_down(glyph(source, "±")), box),
        "∼": lambda box, advance: centred(glyph(source, "~"), box),
        "≃": lambda box, advance: similar_equal(Frame(box)),
        "≪": lambda box, advance: much_less(source, box),
        "≫": lambda box, advance: mirrored_x(much_less(source, box), box),
        "∣": lambda box, advance: centred(bar, box),
        "♠": lambda box, advance: spade(source, box),
        "♡": lambda box, advance: heart_outline(source, box),
        "♢": lambda box, advance: diamond(Frame(box)),
        "♣": lambda box, advance: club(box),
    }
    for char, draw in drawers.items():
        box, advance = reference_glyph(reference, ord(char))
        put_glyph(font, ord(char), draw(box, advance), advance)
    font.flavor = "woff2"
    font.save(path)
    print(f"{name}: {' '.join(drawers)} -> {path.relative_to(REPO_ROOT)}")

    name = "KaTeX_AMS-Regular"
    path = OUTPUT_DIR / f"{name}.woff2"
    font = TTFont(path)
    reference = TTFont(ORIGINAL_DIR / f"{name}.woff2")
    drawers = {
        "△": lambda box: shrunk_into(glyph(source, "△"), box),
        "⩽": lambda box: slanted_less_equal(source, box),
        "⩾": lambda box: mirrored_x(slanted_less_equal(source, box), box),
        "∴": lambda box: triangle_dots(source, box, pointing_up=True),
        "∵": lambda box: triangle_dots(source, box, pointing_up=False),
    }
    for char, draw in drawers.items():
        box, advance = reference_glyph(reference, ord(char))
        put_glyph(font, ord(char), draw(box), advance)
    font.flavor = "woff2"
    font.save(path)
    print(f"{name}: {' '.join(drawers)} -> {path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
