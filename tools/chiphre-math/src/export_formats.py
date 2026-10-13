#!/usr/bin/env python3
"""
Export Chiphre Math in the common font formats, for David's own use (not
served by the site): TTF, OTF (CFF outlines), WOFF and WOFF2.

The source is static/fonts/chiphre-math-typst/ChiphreMath.ttf, written by
build_typst_math_font.py: run this script after it. Every format keeps the
MATH table, so each one is a full OpenType math font (Typst, LibreOffice,
Word, MathML in a browser…). The OTF has the same glyphs drawn as cubic
curves (CFF): quadratic curves convert to cubic ones exactly.

Output: tools/chiphre-math/fonts/dist/ChiphreMath.{ttf,otf,woff,woff2}.
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.ttLib import TTFont

REPO_ROOT = Path(__file__).resolve().parents[3]
SOURCE = REPO_ROOT / "static" / "fonts" / "chiphre-math-typst" / "ChiphreMath.ttf"
OUTPUT_DIR = REPO_ROOT / "tools" / "chiphre-math" / "fonts" / "dist"
# Tables propres aux contours TrueType, sans objet dans une police CFF
TRUETYPE_ONLY = ("glyf", "loca", "cvt ", "fpgm", "prep", "gasp")


def to_otf(source: Path, target: Path) -> None:
    font = TTFont(source)
    glyph_set = font.getGlyphSet()
    charstrings = {}
    for glyph_name in font.getGlyphOrder():
        # Les composites sont dépliés : CFF n'a pas de composants
        recording = DecomposingRecordingPen(glyph_set)
        glyph_set[glyph_name].draw(recording)
        pen = T2CharStringPen(font["hmtx"][glyph_name][0], glyph_set)
        recording.replay(pen)
        charstrings[glyph_name] = pen.getCharString()

    names = font["name"]
    ps_name = names.getDebugName(6)
    for tag in TRUETYPE_ONLY:
        if tag in font:
            del font[tag]
    font.sfntVersion = "OTTO"
    builder = FontBuilder(font=font, isTTF=False)
    builder.setupCFF(
        ps_name,
        {"FullName": names.getDebugName(4), "FamilyName": names.getDebugName(1)},
        charstrings,
        {},
    )
    builder.setupMaxp()
    font.save(target)


def main() -> None:
    parser = argparse.ArgumentParser(description="Export Chiphre Math as TTF, OTF, WOFF and WOFF2")
    parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stem = SOURCE.stem
    shutil.copyfile(SOURCE, OUTPUT_DIR / f"{stem}.ttf")
    to_otf(SOURCE, OUTPUT_DIR / f"{stem}.otf")
    for flavor in ("woff", "woff2"):
        font = TTFont(SOURCE)
        font.flavor = flavor
        font.save(OUTPUT_DIR / f"{stem}.{flavor}")
    for path in sorted(OUTPUT_DIR.glob(f"{stem}.*")):
        print(f"{path.relative_to(REPO_ROOT)} : {path.stat().st_size // 1024} Ko")


if __name__ == "__main__":
    main()
