#!/usr/bin/env python3
"""
Replace the operators and delimiters of KaTeX_Main-Regular with the ones of
Shantell Sans, fitted into the box of the KaTeX glyph they replace.

MathLive does not read glyph sizes from the font: it has the KaTeX metrics
hard-coded (width, height, depth of every glyph) and lays formulas out with
them. A Shantell glyph copied as is would overflow its neighbours or sit off
the math axis, so each one is:

- operators (+ = < …): kept at Shantell size, so that their stroke matches
  the letters, and centred on the KaTeX glyph's box (hence on the math axis);
- delimiters (( [ { | /): scaled to the KaTeX glyph's height, and narrowed
  only when wider than the room MathLive gives them;
- given the KaTeX advance width, whatever its own.

The script works in place on static/fonts/shantell-katex/KaTeX_Main-Regular.woff2
(whose letters already come from Shantell): each listed glyph is redrawn from
scratch, so running it twice gives the same font. Writing to
static/fonts/KaTeX_*.woff2 is refused: the original KaTeX fonts were
overwritten that way on 2026-01-20.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont


REPO_ROOT = Path(__file__).resolve().parents[3]
TARGET = REPO_ROOT / "static" / "fonts" / "shantell-katex" / "KaTeX_Main-Regular.woff2"
SHANTELL = REPO_ROOT / "tools" / "shantell-math" / "fonts" / "input" / "shantell-sans-300.ttf"

OPERATORS = "+−=<>≤≥±×÷≈→←↔"
DELIMITERS = "()[]{}|/"

# Marge minimale (unités de la police) entre un délimiteur resserré et le bord de sa place
SIDE_MARGIN = 20


def bounds(font: TTFont, glyph_name: str):
    glyph_set = font.getGlyphSet()
    pen = BoundsPen(glyph_set)
    glyph_set[glyph_name].draw(pen)
    return pen.bounds


def replace_symbol(target: TTFont, source: TTFont, char: str, is_delimiter: bool) -> bool:
    target_name = target.getBestCmap().get(ord(char))
    source_name = source.getBestCmap().get(ord(char))
    if not target_name or not source_name:
        print(f"  '{char}' absent de {'KaTeX' if not target_name else 'Shantell'}, ignoré")
        return False

    # La boîte de référence est celle du glyphe KaTeX d'origine, pas celle d'un passage précédent
    reference = TTFont(REPO_ROOT / "static" / "fonts" / "katex-original" / "KaTeX_Main-Regular.woff2")
    t_xmin, t_ymin, t_xmax, t_ymax = bounds(reference, target_name)
    advance = reference["hmtx"][target_name][0]
    s_xmin, s_ymin, s_xmax, s_ymax = bounds(source, source_name)

    scale_y = (t_ymax - t_ymin) / (s_ymax - s_ymin) if is_delimiter else 1.0
    room = advance - 2 * SIDE_MARGIN
    scale_x = min(scale_y, room / (s_xmax - s_xmin))

    dx = (t_xmin + t_xmax) / 2 - scale_x * (s_xmin + s_xmax) / 2
    dy = (t_ymin + t_ymax) / 2 - scale_y * (s_ymin + s_ymax) / 2

    glyph_set = source.getGlyphSet()
    recording = DecomposingRecordingPen(glyph_set)
    glyph_set[source_name].draw(recording)
    tt_pen = TTGlyphPen(None)
    recording.replay(TransformPen(tt_pen, (scale_x, 0, 0, scale_y, dx, dy)))
    glyph = tt_pen.glyph()
    glyph.recalcBounds(target["glyf"])

    target["glyf"][target_name] = glyph
    target["hmtx"][target_name] = (advance, glyph.xMin)
    print(f"  '{char}' : échelle x {scale_x:.2f}, y {scale_y:.2f}")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Shantell operators and delimiters in KaTeX_Main-Regular")
    parser.parse_args()

    if TARGET.parent.name != "shantell-katex":
        raise SystemExit(f"Sortie refusée hors de static/fonts/shantell-katex: {TARGET}")

    target = TTFont(TARGET)
    source = TTFont(SHANTELL)
    count = 0
    for char in OPERATORS:
        count += replace_symbol(target, source, char, is_delimiter=False)
    for char in DELIMITERS:
        count += replace_symbol(target, source, char, is_delimiter=True)

    target.flavor = "woff2"
    target.save(TARGET)
    print(f"{count} symboles remplacés -> {TARGET.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
