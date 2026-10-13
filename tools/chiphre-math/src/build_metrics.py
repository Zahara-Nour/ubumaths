#!/usr/bin/env python3
"""
Extract and build font metrics for KaTeX/MathLive compatibility.

MathLive/KaTeX use separate metrics files that contain:
- Height (ascent above baseline)
- Depth (descent below baseline)
- Width
- Italic correction

This script extracts these metrics from modified fonts.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Optional, Dict
from fontTools.ttLib import TTFont


def get_glyph_metrics(font: TTFont, glyph_name: str) -> Optional[Dict]:
    """
    Extract metrics for a single glyph.

    Returns dict with:
        - width: advance width
        - height: max y coordinate (ascent)
        - depth: min y coordinate as positive value (descent)
        - italic: italic correction (0 for non-italic)
    """
    # Get width from hmtx
    hmtx = font["hmtx"]
    if glyph_name not in hmtx.metrics:
        return None

    width, lsb = hmtx.metrics[glyph_name]

    # Get bounding box
    height = 0
    depth = 0

    if "glyf" in font:
        # TrueType
        glyf = font["glyf"]
        if glyph_name in glyf and hasattr(glyf[glyph_name], "yMax"):
            glyph = glyf[glyph_name]
            height = glyph.yMax if glyph.yMax else 0
            depth = -glyph.yMin if glyph.yMin and glyph.yMin < 0 else 0
    else:
        # CFF - need to calculate from charstring
        cff_table = font.get("CFF ") or font.get("CFF2")
        if cff_table:
            try:
                from fontTools.pens.boundsPen import BoundsPen

                cff = cff_table.cff
                top_dict = cff.topDictIndex[0]
                charstrings = top_dict.CharStrings

                if glyph_name in charstrings:
                    bounds_pen = BoundsPen(charstrings)
                    charstrings[glyph_name].draw(bounds_pen)
                    bounds = bounds_pen.bounds

                    if bounds:
                        xMin, yMin, xMax, yMax = bounds
                        height = yMax
                        depth = -yMin if yMin < 0 else 0
            except Exception:
                pass

    # Italic correction (simplified - would need more analysis for accurate values)
    italic = 0
    if "post" in font and hasattr(font["post"], "italicAngle"):
        italic_angle = font["post"].italicAngle
        if italic_angle != 0:
            # Rough estimate based on italic angle
            import math
            italic = int(height * math.tan(math.radians(abs(italic_angle))) * 0.5)

    return {
        "width": width,
        "height": height,
        "depth": depth,
        "italic": italic
    }


def extract_metrics(font_path: Path, output_path: Optional[Path] = None) -> Dict:
    """
    Extract metrics for all glyphs in a font.

    Args:
        font_path: Path to the font file
        output_path: Optional path to save JSON output

    Returns:
        Dict mapping glyph names to their metrics
    """
    print(f"Loading font: {font_path}")
    font = TTFont(font_path)

    # Get units per em for normalization
    upm = font["head"].unitsPerEm

    # Get all glyph names
    glyph_order = font.getGlyphOrder()

    metrics = {}
    cmap = font.getBestCmap()

    # Create reverse cmap (glyph name -> unicode)
    reverse_cmap = {v: k for k, v in cmap.items()}

    for glyph_name in glyph_order:
        glyph_metrics = get_glyph_metrics(font, glyph_name)

        if glyph_metrics:
            # Normalize to 1000 UPM (KaTeX convention)
            scale = 1000 / upm

            normalized = {
                "width": round(glyph_metrics["width"] * scale, 4),
                "height": round(glyph_metrics["height"] * scale, 4),
                "depth": round(glyph_metrics["depth"] * scale, 4),
                "italic": round(glyph_metrics["italic"] * scale, 4),
            }

            # Include unicode code point if available
            if glyph_name in reverse_cmap:
                normalized["unicode"] = reverse_cmap[glyph_name]

            metrics[glyph_name] = normalized

    font.close()

    print(f"Extracted metrics for {len(metrics)} glyphs")

    # Output
    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(metrics, f, indent=2)
        print(f"Saved: {output_path}")

    return metrics


def compare_metrics(original_path: Path, modified_path: Path, output_path: Optional[Path] = None) -> Dict:
    """
    Compare metrics between original and modified fonts.

    Useful for identifying changes that might affect rendering.
    """
    print("Extracting original metrics...")
    original = extract_metrics(original_path)

    print("Extracting modified metrics...")
    modified = extract_metrics(modified_path)

    differences = {}

    for glyph_name in modified:
        if glyph_name not in original:
            differences[glyph_name] = {"status": "new"}
            continue

        orig = original[glyph_name]
        mod = modified[glyph_name]

        diff = {}
        for key in ["width", "height", "depth", "italic"]:
            if abs(orig[key] - mod[key]) > 0.1:  # Threshold for significant difference
                diff[key] = {
                    "original": orig[key],
                    "modified": mod[key],
                    "delta": round(mod[key] - orig[key], 4)
                }

        if diff:
            differences[glyph_name] = diff

    print(f"\nFound {len(differences)} glyphs with metric changes")

    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(differences, f, indent=2)
        print(f"Saved comparison: {output_path}")

    return differences


def generate_katex_metrics(font_path: Path, font_name: str, output_path: Path) -> None:
    """
    Generate metrics in KaTeX's fontMetricsData.js format.

    KaTeX format: fontName: { charCode: [depth, height, italic, skew, width], ... }
    """
    font = TTFont(font_path)
    upm = font["head"].unitsPerEm
    scale = 1000 / upm

    cmap = font.getBestCmap()

    katex_metrics = {}

    for code_point, glyph_name in cmap.items():
        glyph_metrics = get_glyph_metrics(font, glyph_name)

        if glyph_metrics:
            # KaTeX format: [depth, height, italic, skew, width]
            # All values normalized to 1 em = 1000 units, then divided by 1000
            katex_metrics[code_point] = [
                round(glyph_metrics["depth"] * scale / 1000, 5),
                round(glyph_metrics["height"] * scale / 1000, 5),
                round(glyph_metrics["italic"] * scale / 1000, 5),
                0,  # skew (not calculated here)
                round(glyph_metrics["width"] * scale / 1000, 5),
            ]

    font.close()

    # Generate JavaScript
    js_content = f'// Auto-generated metrics for {font_name}\n'
    js_content += f'export const {font_name.replace("-", "_")}_metrics = {{\n'

    for code_point in sorted(katex_metrics.keys()):
        values = katex_metrics[code_point]
        js_content += f'  {code_point}: [{", ".join(str(v) for v in values)}],\n'

    js_content += '};\n'

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        f.write(js_content)

    print(f"Generated KaTeX metrics: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Extract and build font metrics for KaTeX/MathLive"
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # Extract command
    extract_parser = subparsers.add_parser("extract", help="Extract metrics from a font")
    extract_parser.add_argument("font", type=Path, help="Font file")
    extract_parser.add_argument("-o", "--output", type=Path, help="Output JSON file")

    # Compare command
    compare_parser = subparsers.add_parser("compare", help="Compare metrics between fonts")
    compare_parser.add_argument("original", type=Path, help="Original font")
    compare_parser.add_argument("modified", type=Path, help="Modified font")
    compare_parser.add_argument("-o", "--output", type=Path, help="Output JSON file")

    # KaTeX command
    katex_parser = subparsers.add_parser("katex", help="Generate KaTeX metrics format")
    katex_parser.add_argument("font", type=Path, help="Font file")
    katex_parser.add_argument("name", type=str, help="Font name (e.g., KaTeX_Main_Regular)")
    katex_parser.add_argument("-o", "--output", type=Path, required=True, help="Output JS file")

    args = parser.parse_args()

    if args.command == "extract":
        extract_metrics(args.font, args.output)
    elif args.command == "compare":
        compare_metrics(args.original, args.modified, args.output)
    elif args.command == "katex":
        generate_katex_metrics(args.font, args.name, args.output)


if __name__ == "__main__":
    main()
