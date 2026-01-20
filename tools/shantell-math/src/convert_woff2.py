#!/usr/bin/env python3
"""
Convert fonts to WOFF2 format for web use.

WOFF2 provides excellent compression for web fonts while maintaining
full OpenType feature support.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Optional
from fontTools.ttLib import TTFont


def ttf_to_woff2(input_path: Path, output_path: Optional[Path] = None) -> Path:
    """
    Convert a TTF/OTF font to WOFF2 format.

    Args:
        input_path: Path to input font (TTF or OTF)
        output_path: Path for output WOFF2 (default: same name with .woff2)

    Returns:
        Path to the created WOFF2 file
    """
    if output_path is None:
        output_path = input_path.with_suffix(".woff2")

    print(f"Converting: {input_path}")

    font = TTFont(input_path)

    # Set flavor to woff2
    font.flavor = "woff2"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    font.save(output_path)

    font.close()

    # Report sizes
    input_size = input_path.stat().st_size
    output_size = output_path.stat().st_size
    ratio = (1 - output_size / input_size) * 100

    print(f"  Input:  {input_size:,} bytes")
    print(f"  Output: {output_size:,} bytes")
    print(f"  Saved:  {ratio:.1f}%")
    print(f"  Created: {output_path}")

    return output_path


def woff2_to_ttf(input_path: Path, output_path: Optional[Path] = None) -> Path:
    """
    Convert a WOFF2 font back to TTF format.

    Args:
        input_path: Path to input WOFF2
        output_path: Path for output TTF (default: same name with .ttf)

    Returns:
        Path to the created TTF file
    """
    if output_path is None:
        output_path = input_path.with_suffix(".ttf")

    print(f"Converting: {input_path}")

    font = TTFont(input_path)

    # Remove woff2 flavor
    font.flavor = None

    output_path.parent.mkdir(parents=True, exist_ok=True)
    font.save(output_path)

    font.close()

    print(f"  Created: {output_path}")

    return output_path


def batch_convert(
    input_dir: Path,
    output_dir: Path,
    pattern: str = "*.ttf",
    to_woff2: bool = True
) -> list[Path]:
    """
    Batch convert all fonts in a directory.

    Args:
        input_dir: Directory containing fonts
        output_dir: Directory for converted fonts
        pattern: Glob pattern for input files
        to_woff2: If True, convert to WOFF2; if False, convert from WOFF2

    Returns:
        List of created files
    """
    input_files = list(input_dir.glob(pattern))

    if not input_files:
        print(f"No files matching '{pattern}' in {input_dir}")
        return []

    print(f"Found {len(input_files)} files to convert")

    created = []

    for input_path in input_files:
        if to_woff2:
            output_path = output_dir / input_path.with_suffix(".woff2").name
            created.append(ttf_to_woff2(input_path, output_path))
        else:
            output_path = output_dir / input_path.with_suffix(".ttf").name
            created.append(woff2_to_ttf(input_path, output_path))

    print(f"\nConverted {len(created)} files")
    return created


def main():
    parser = argparse.ArgumentParser(
        description="Convert fonts to/from WOFF2 format"
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # Single file conversion
    convert_parser = subparsers.add_parser("convert", help="Convert a single font")
    convert_parser.add_argument("input", type=Path, help="Input font file")
    convert_parser.add_argument("-o", "--output", type=Path, help="Output file path")
    convert_parser.add_argument(
        "--to-ttf",
        action="store_true",
        help="Convert WOFF2 to TTF (default: TTF to WOFF2)"
    )

    # Batch conversion
    batch_parser = subparsers.add_parser("batch", help="Batch convert fonts")
    batch_parser.add_argument("input_dir", type=Path, help="Input directory")
    batch_parser.add_argument("output_dir", type=Path, help="Output directory")
    batch_parser.add_argument(
        "-p", "--pattern",
        default="*.ttf",
        help="File pattern (default: *.ttf)"
    )
    batch_parser.add_argument(
        "--to-ttf",
        action="store_true",
        help="Convert WOFF2 to TTF (default: TTF to WOFF2)"
    )

    args = parser.parse_args()

    if args.command == "convert":
        if args.to_ttf:
            woff2_to_ttf(args.input, args.output)
        else:
            ttf_to_woff2(args.input, args.output)
    elif args.command == "batch":
        batch_convert(
            args.input_dir,
            args.output_dir,
            args.pattern,
            to_woff2=not args.to_ttf
        )


if __name__ == "__main__":
    main()
