#!/usr/bin/env python3
"""
Roughen the KaTeX fonts that replace_glyphs.py does not touch:
Size1-4 (big operators, tall delimiters, radicals) and AMS.

Every glyph of these fonts gets the same hand-drawn jitter as the symbols of
KaTeX_Main (roughen_math.py, intensity 12, seed 42), with two exceptions:

- the pieces MathLive stacks to build tall delimiters (makeStackedDelim in
  mathlive.mjs): points near their top and bottom edges are left untouched,
  otherwise two stacked pieces no longer join;
- the repeated pieces of those stacks are not roughened at all: copied N
  times, the same jitter becomes a regular row of bumps;
- radicals: points near the top edge are left untouched, the vinculum drawn
  by MathLive starts there.

Each glyph has its own random generator (seed + glyph name), so the result
does not depend on the order of the glyphs.

Sources are read from static/fonts/katex-original/; outputs go to
static/fonts/chiphre-math/. Writing to static/fonts/KaTeX_*.woff2 is refused:
the original KaTeX fonts were overwritten that way on 2026-01-20.
"""

from __future__ import annotations

import argparse
import random
from pathlib import Path
from typing import Dict, Set

from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import ttProgram
from fontTools.ttLib.tables._g_l_y_f import GlyphCoordinates


REPO_ROOT = Path(__file__).resolve().parents[3]
SOURCE_DIR = REPO_ROOT / "static" / "fonts" / "katex-original"
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "chiphre-math"

FONTS = [
    "KaTeX_Size1-Regular",
    "KaTeX_Size2-Regular",
    "KaTeX_Size3-Regular",
    "KaTeX_Size4-Regular",
    "KaTeX_AMS-Regular",
]

# Pièces empilées par MathLive (makeStackedDelim), par police
STACKED_PIECES: Dict[str, Set[int]] = {
    # ∣ ∥ ‖ ⏐ ↑ ↓ ⇑ ⇓
    "KaTeX_Size1-Regular": {0x2223, 0x2225, 0x2016, 0x23D0, 0x2191, 0x2193, 0x21D1, 0x21D3},
    # ⎛ … ⎭ (parenthèses, crochets, accolades), ⎷ et les deux pièces de la racine
    "KaTeX_Size4-Regular": set(range(0x239B, 0x23AE)) | {0x23B7, 0xE000, 0xE001},
}

# Pièces répétées : laissées droites (un tremblé recopié devient périodique)
REPEATED_PIECES: Dict[str, Set[int]] = {
    # ∣ ∥ ‖ ⏐
    "KaTeX_Size1-Regular": {0x2223, 0x2225, 0x2016, 0x23D0},
    # ⎜ ⎟ ⎢ ⎥ ⎪ et la pièce verticale de la racine
    "KaTeX_Size4-Regular": {0x239C, 0x239F, 0x23A2, 0x23A5, 0x23AA, 0xE000},
}

RADICALS = {0x221A}

# Bande (unités de la police, 1000/em) autour d'un bord où les points restent fixes
EDGE_BAND = 40


def roughen_glyph(glyph, rng: random.Random, intensity: float, keep_top: bool, keep_bottom: bool) -> bool:
    if glyph.numberOfContours <= 0:
        return False

    coords = list(glyph.coordinates)
    y_min = min(y for _, y in coords)
    y_max = max(y for _, y in coords)

    new_coords = []
    for x, y in coords:
        frozen = (keep_top and y >= y_max - EDGE_BAND) or (keep_bottom and y <= y_min + EDGE_BAND)
        if frozen:
            new_coords.append((x, y))
        else:
            dx = rng.uniform(-intensity, intensity)
            dy = rng.uniform(-intensity, intensity)
            new_coords.append((round(x + dx), round(y + dy)))

    glyph.coordinates = GlyphCoordinates(new_coords)
    # Le hinting désigne les points par leur position d'origine : on le retire
    glyph.program = ttProgram.Program()
    glyph.program.fromBytecode(b"")
    return True


def roughen_font(name: str, intensity: float, seed: int) -> None:
    source = SOURCE_DIR / f"{name}.woff2"
    output = OUTPUT_DIR / f"{name}.woff2"
    if output.parent.resolve() != OUTPUT_DIR.resolve():
        raise SystemExit(f"Sortie refusée hors de {OUTPUT_DIR}: {output}")

    font = TTFont(source)
    glyf = font["glyf"]
    pieces = STACKED_PIECES.get(name, set())
    repeated = REPEATED_PIECES.get(name, set())

    # Un même glyphe peut porter plusieurs points de code (ˆ et ̂) : on le traite une fois
    codepoints_by_glyph: Dict[str, Set[int]] = {}
    for codepoint, glyph_name in font.getBestCmap().items():
        codepoints_by_glyph.setdefault(glyph_name, set()).add(codepoint)

    count = 0
    for glyph_name in font.getGlyphOrder():
        codepoints = codepoints_by_glyph.get(glyph_name, set())
        if codepoints & repeated:
            continue
        is_piece = bool(codepoints & pieces)
        is_radical = bool(codepoints & RADICALS)
        rng = random.Random(f"{seed}:{glyph_name}")
        if roughen_glyph(
            glyf[glyph_name],
            rng,
            intensity,
            keep_top=is_piece or is_radical,
            keep_bottom=is_piece,
        ):
            count += 1

    font.flavor = "woff2"
    font.save(output)
    print(f"{name}: {count} glyphes tremblés -> {output.relative_to(REPO_ROOT)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Roughen KaTeX Size1-4 and AMS fonts")
    parser.add_argument("-i", "--intensity", type=float, default=12.0)
    parser.add_argument("-s", "--seed", type=int, default=42)
    args = parser.parse_args()

    for name in FONTS:
        roughen_font(name, args.intensity, args.seed)


if __name__ == "__main__":
    main()
