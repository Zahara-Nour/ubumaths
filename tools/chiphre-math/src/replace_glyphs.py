#!/usr/bin/env python3
"""
Replace normal characters (A-Z, a-z, 0-9) in KaTeX fonts with Shantell Sans glyphs.

This script:
1. Loads a KaTeX font (TTF format)
2. Loads Shantell Sans variable font
3. Copies alphanumeric glyphs from Shantell to KaTeX
4. Adjusts metrics to maintain proper rendering
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Optional, List
from fontTools.ttLib import TTFont
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen


# Characters to replace
CHARACTERS_TO_REPLACE = (
    list("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789")
)


def get_glyph_name(font: TTFont, char: str) -> Optional[str]:
    """Get the glyph name for a character in a font."""
    cmap = font.getBestCmap()
    code_point = ord(char)
    return cmap.get(code_point)


def copy_glyph(source_font: TTFont, target_font: TTFont, char: str, scale: float = 1.0) -> bool:
    """
    Copy a glyph from source font to target font.

    Args:
        source_font: Font to copy from (Shantell Sans)
        target_font: Font to copy to (KaTeX)
        char: Character to copy
        scale: Scale factor to apply to the glyph

    Returns:
        True if successful, False otherwise
    """
    source_glyph_name = get_glyph_name(source_font, char)
    target_glyph_name = get_glyph_name(target_font, char)

    if not source_glyph_name or not target_glyph_name:
        print(f"  Skipping '{char}': glyph not found in {'source' if not source_glyph_name else 'target'}")
        return False

    # Get glyph sets
    source_glyf = source_font.get("glyf")
    target_glyf = target_font.get("glyf")

    if source_glyf is None or target_glyf is None:
        # Try CFF fonts (OpenType with PostScript outlines)
        return copy_glyph_cff(source_font, target_font, source_glyph_name, target_glyph_name, scale)

    # TrueType outlines
    return copy_glyph_truetype(source_font, target_font, source_glyph_name, target_glyph_name, scale)


def copy_glyph_truetype(
    source_font: TTFont,
    target_font: TTFont,
    source_name: str,
    target_name: str,
    scale: float
) -> bool:
    """Copy glyph with TrueType outlines, decomposing composite glyphs."""
    from fontTools.pens.recordingPen import DecomposingRecordingPen

    source_glyf = source_font["glyf"]
    target_glyf = target_font["glyf"]

    if source_name not in source_glyf:
        return False

    source_glyph = source_glyf[source_name]
    glyph_set = source_font.getGlyphSet()

    # Use DecomposingRecordingPen to flatten composite glyphs
    recording_pen = DecomposingRecordingPen(glyph_set)
    glyph_set[source_name].draw(recording_pen)

    # Create new glyph from recorded operations
    pen = TTGlyphPen(glyph_set)

    for op, args in recording_pen.value:
        if op == 'moveTo':
            x, y = args[0]
            pen.moveTo((x * scale, y * scale))
        elif op == 'lineTo':
            x, y = args[0]
            pen.lineTo((x * scale, y * scale))
        elif op == 'curveTo':
            scaled = tuple((p[0] * scale, p[1] * scale) for p in args)
            pen.curveTo(*scaled)
        elif op == 'qCurveTo':
            scaled = tuple(
                (p[0] * scale, p[1] * scale) if p is not None else None
                for p in args
            )
            pen.qCurveTo(*scaled)
        elif op == 'closePath':
            pen.closePath()
        elif op == 'endPath':
            pen.endPath()

    new_glyph = pen.glyph()
    target_glyf[target_name] = new_glyph

    # Update horizontal metrics
    source_hmtx = source_font["hmtx"]
    target_hmtx = target_font["hmtx"]

    width, lsb = source_hmtx[source_name]
    target_hmtx[target_name] = (int(width * scale), int(lsb * scale))

    return True


def copy_glyph_cff(
    source_font: TTFont,
    target_font: TTFont,
    source_name: str,
    target_name: str,
    scale: float
) -> bool:
    """Copy glyph with CFF (PostScript) outlines."""
    # Check for CFF or CFF2 table
    cff_table = source_font.get("CFF ") or source_font.get("CFF2")
    target_cff = target_font.get("CFF ") or target_font.get("CFF2")

    if not cff_table or not target_cff:
        print("  CFF table not found")
        return False

    try:
        # Get the charstring from source
        source_cff = cff_table.cff
        source_top_dict = source_cff.topDictIndex[0]
        source_charstrings = source_top_dict.CharStrings

        if source_name not in source_charstrings:
            return False

        # Record the glyph drawing operations
        source_charstring = source_charstrings[source_name]
        recording_pen = RecordingPen()
        source_charstring.draw(recording_pen)

        # Get target CFF
        target_cff_data = target_cff.cff
        target_top_dict = target_cff_data.topDictIndex[0]
        target_charstrings = target_top_dict.CharStrings

        # Replay to target with scaling
        t2_pen = T2CharStringPen(
            width=source_charstring.width * scale if hasattr(source_charstring, 'width') else 0,
            glyphSet=target_charstrings
        )

        for op, args in recording_pen.value:
            if scale != 1.0 and args:
                # Scale coordinates
                scaled_args = tuple(
                    int(a * scale) if isinstance(a, (int, float)) else a
                    for a in args
                )
                getattr(t2_pen, op)(*scaled_args)
            else:
                getattr(t2_pen, op)(*args)

        target_charstrings[target_name] = t2_pen.getCharString()

        # Update metrics
        source_hmtx = source_font["hmtx"]
        target_hmtx = target_font["hmtx"]
        width, lsb = source_hmtx[source_name]
        target_hmtx[target_name] = (int(width * scale), int(lsb * scale))

        return True

    except Exception as e:
        print(f"  Error copying CFF glyph: {e}")
        return False


def calculate_scale_factor(source_font: TTFont, target_font: TTFont) -> float:
    """
    Calculate scale factor to match source font size to target.
    Uses the units per em (UPM) ratio.
    """
    source_upm = source_font["head"].unitsPerEm
    target_upm = target_font["head"].unitsPerEm
    return target_upm / source_upm


def replace_glyphs(
    katex_path: Path,
    shantell_path: Path,
    output_path: Path,
    chars: Optional[List[str]] = None
) -> None:
    """
    Replace glyphs in KaTeX font with Shantell Sans glyphs.

    Args:
        katex_path: Path to KaTeX font (TTF)
        shantell_path: Path to Shantell Sans font
        output_path: Path for output font
        chars: List of characters to replace (default: alphanumeric)
    """
    if chars is None:
        chars = CHARACTERS_TO_REPLACE

    print(f"Loading KaTeX font: {katex_path}")
    katex_font = TTFont(katex_path)

    print(f"Loading Shantell Sans: {shantell_path}")
    shantell_font = TTFont(shantell_path)

    # Calculate scale factor
    scale = calculate_scale_factor(shantell_font, katex_font)
    print(f"Scale factor: {scale:.4f}")

    # Replace each character
    success_count = 0
    for char in chars:
        if copy_glyph(shantell_font, katex_font, char, scale):
            print(f"  Replaced: '{char}'")
            success_count += 1

    print(f"\nReplaced {success_count}/{len(chars)} characters")

    # Save the modified font
    output_path.parent.mkdir(parents=True, exist_ok=True)
    katex_font.save(output_path)
    print(f"Saved: {output_path}")

    katex_font.close()
    shantell_font.close()


def main():
    parser = argparse.ArgumentParser(
        description="Replace KaTeX alphanumeric glyphs with Shantell Sans"
    )
    parser.add_argument(
        "katex_font",
        type=Path,
        help="Path to KaTeX font (TTF)"
    )
    parser.add_argument(
        "shantell_font",
        type=Path,
        help="Path to Shantell Sans font"
    )
    parser.add_argument(
        "-o", "--output",
        type=Path,
        required=True,
        help="Output path for modified font"
    )
    parser.add_argument(
        "--chars",
        type=str,
        default=None,
        help="Characters to replace (default: A-Za-z0-9)"
    )

    args = parser.parse_args()

    chars = list(args.chars) if args.chars else None

    replace_glyphs(
        katex_path=args.katex_font,
        shantell_path=args.shantell_font,
        output_path=args.output,
        chars=chars
    )


if __name__ == "__main__":
    main()
