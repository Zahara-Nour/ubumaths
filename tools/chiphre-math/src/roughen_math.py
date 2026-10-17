#!/usr/bin/env python3
"""
Apply a "roughen" effect to mathematical symbols in fonts.

This script adds small perturbations to the control points of Bezier curves
to create a hand-drawn appearance while preserving the overall shape.
"""

from __future__ import annotations

import argparse
import random
from pathlib import Path
from copy import deepcopy
from typing import Optional, List, Tuple
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.ttLib.tables._g_l_y_f import GlyphCoordinates


# Mathematical symbols to roughen (Unicode code points)
MATH_SYMBOLS = [
    # Greek letters (commonly used in math)
    0x0391, 0x0392, 0x0393, 0x0394, 0x0395,  # Alpha-Epsilon (uppercase)
    0x0396, 0x0397, 0x0398, 0x0399, 0x039A,  # Zeta-Kappa
    0x039B, 0x039C, 0x039D, 0x039E, 0x039F,  # Lambda-Omicron
    0x03A0, 0x03A1, 0x03A3, 0x03A4, 0x03A5,  # Pi-Upsilon
    0x03A6, 0x03A7, 0x03A8, 0x03A9,          # Phi-Omega
    0x03B1, 0x03B2, 0x03B3, 0x03B4, 0x03B5,  # alpha-epsilon (lowercase)
    0x03B6, 0x03B7, 0x03B8, 0x03B9, 0x03BA,  # zeta-kappa
    0x03BB, 0x03BC, 0x03BD, 0x03BE, 0x03BF,  # lambda-omicron
    0x03C0, 0x03C1, 0x03C2, 0x03C3, 0x03C4,  # pi-tau
    0x03C5, 0x03C6, 0x03C7, 0x03C8, 0x03C9,  # upsilon-omega

    # Operators and symbols
    0x002B,  # +
    0x2212,  # minus
    0x00D7,  # multiplication sign
    0x00F7,  # division sign
    0x003D,  # =
    0x2260,  # not equal
    0x003C,  # <
    0x003E,  # >
    0x2264,  # less than or equal
    0x2265,  # greater than or equal
    0x221E,  # infinity

    # Big operators
    0x2211,  # summation
    0x220F,  # product
    0x222B,  # integral
    0x222C,  # double integral
    0x222D,  # triple integral
    0x222E,  # contour integral

    # Roots and radicals
    0x221A,  # square root
    0x221B,  # cube root
    0x221C,  # fourth root

    # Set theory
    0x2208,  # element of
    0x2209,  # not element of
    0x2282,  # subset of
    0x2283,  # superset of
    0x2286,  # subset or equal
    0x2287,  # superset or equal
    0x222A,  # union
    0x2229,  # intersection
    0x2205,  # empty set

    # Logic
    0x2200,  # for all
    0x2203,  # there exists
    0x2227,  # logical and
    0x2228,  # logical or
    0x00AC,  # not
    0x21D2,  # implies (double arrow)
    0x21D4,  # if and only if

    # Arrows
    0x2190,  # left arrow
    0x2191,  # up arrow
    0x2192,  # right arrow
    0x2193,  # down arrow
    0x2194,  # left-right arrow

    # Misc
    0x2202,  # partial derivative
    0x2207,  # nabla/del
    0x221D,  # proportional to
    0x2248,  # approximately equal
    0x2261,  # identical to
    0x00B1,  # plus-minus

    # Brackets (may want to roughen)
    0x0028,  # (
    0x0029,  # )
    0x005B,  # [
    0x005D,  # ]
    0x007B,  # {
    0x007D,  # }
]


def perturb_point(x: float, y: float, intensity: float, rng: random.Random) -> Tuple[float, float]:
    """
    Add a small random perturbation to a point.

    Args:
        x, y: Original coordinates
        intensity: Maximum perturbation amount (in font units)
        rng: Random number generator for reproducibility

    Returns:
        Perturbed (x, y) coordinates
    """
    dx = rng.uniform(-intensity, intensity)
    dy = rng.uniform(-intensity, intensity)
    return (x + dx, y + dy)


def roughen_glyph_truetype(font: TTFont, glyph_name: str, intensity: float, rng: random.Random) -> bool:
    """Roughen a TrueType glyph by perturbing its coordinates."""
    glyf = font["glyf"]

    if glyph_name not in glyf:
        return False

    glyph = glyf[glyph_name]

    if not hasattr(glyph, "coordinates") or not glyph.coordinates:
        return False

    # Perturb each coordinate, keeping GlyphCoordinates format
    new_coords = []
    for x, y in glyph.coordinates:
        px, py = perturb_point(x, y, intensity, rng)
        new_coords.append((int(px), int(py)))

    # Convert back to GlyphCoordinates to maintain proper format
    glyph.coordinates = GlyphCoordinates(new_coords)
    return True


def roughen_glyph_cff(font: TTFont, glyph_name: str, intensity: float, rng: random.Random) -> bool:
    """Roughen a CFF glyph by perturbing control points."""
    cff_table = font.get("CFF ") or font.get("CFF2")

    if not cff_table:
        return False

    try:
        cff = cff_table.cff
        top_dict = cff.topDictIndex[0]
        charstrings = top_dict.CharStrings

        if glyph_name not in charstrings:
            return False

        charstring = charstrings[glyph_name]

        # Record operations
        recording_pen = RecordingPen()
        charstring.draw(recording_pen)

        # Create new charstring with perturbed points
        width = charstring.width if hasattr(charstring, 'width') else 0
        t2_pen = T2CharStringPen(width=width, glyphSet=charstrings)

        for op, args in recording_pen.value:
            if op in ('moveTo', 'lineTo'):
                # Single point operations
                x, y = args[0]
                px, py = perturb_point(x, y, intensity, rng)
                getattr(t2_pen, op)((px, py))
            elif op == 'curveTo':
                # Cubic bezier: 3 points
                perturbed = []
                for point in args:
                    px, py = perturb_point(point[0], point[1], intensity, rng)
                    perturbed.append((px, py))
                t2_pen.curveTo(*perturbed)
            elif op == 'qCurveTo':
                # Quadratic bezier
                perturbed = []
                for point in args:
                    if point is not None:
                        px, py = perturb_point(point[0], point[1], intensity, rng)
                        perturbed.append((px, py))
                    else:
                        perturbed.append(None)
                t2_pen.qCurveTo(*perturbed)
            elif op == 'closePath':
                t2_pen.closePath()
            elif op == 'endPath':
                t2_pen.endPath()
            else:
                # Pass through other operations
                getattr(t2_pen, op)(*args)

        charstrings[glyph_name] = t2_pen.getCharString()
        return True

    except Exception as e:
        print(f"  Error roughening CFF glyph {glyph_name}: {e}")
        return False


def roughen_font(
    input_path: Path,
    output_path: Path,
    intensity: float = 10.0,
    seed: Optional[int] = None,
    symbols: Optional[List[int]] = None
) -> None:
    """
    Apply roughen effect to mathematical symbols in a font.

    Args:
        input_path: Path to input font
        output_path: Path for output font
        intensity: Perturbation intensity (font units, typically 10-30)
        seed: Random seed for reproducibility
        symbols: Unicode code points to roughen (default: MATH_SYMBOLS)
    """
    if symbols is None:
        symbols = MATH_SYMBOLS

    rng = random.Random(seed)

    print(f"Loading font: {input_path}")
    font = TTFont(input_path)

    # Get character map
    cmap = font.getBestCmap()

    # Determine if TrueType or CFF
    is_truetype = "glyf" in font

    print(f"Font type: {'TrueType' if is_truetype else 'CFF'}")
    print(f"Intensity: {intensity}")
    print(f"Seed: {seed}")

    success_count = 0

    for code_point in symbols:
        glyph_name = cmap.get(code_point)
        if not glyph_name:
            continue

        char = chr(code_point)

        if is_truetype:
            success = roughen_glyph_truetype(font, glyph_name, intensity, rng)
        else:
            success = roughen_glyph_cff(font, glyph_name, intensity, rng)

        if success:
            print(f"  Roughened: U+{code_point:04X} '{char}' ({glyph_name})")
            success_count += 1

    print(f"\nRoughened {success_count}/{len(symbols)} symbols")

    # Save
    output_path.parent.mkdir(parents=True, exist_ok=True)
    font.save(output_path)
    print(f"Saved: {output_path}")

    font.close()


def main():
    parser = argparse.ArgumentParser(
        description="Apply roughen effect to math symbols in a font"
    )
    parser.add_argument(
        "input_font",
        type=Path,
        help="Path to input font"
    )
    parser.add_argument(
        "-o", "--output",
        type=Path,
        required=True,
        help="Output path for modified font"
    )
    parser.add_argument(
        "-i", "--intensity",
        type=float,
        default=10.0,
        help="Perturbation intensity in font units (default: 10)"
    )
    parser.add_argument(
        "-s", "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility (default: 42)"
    )

    args = parser.parse_args()

    roughen_font(
        input_path=args.input_font,
        output_path=args.output,
        intensity=args.intensity,
        seed=args.seed
    )


if __name__ == "__main__":
    main()
