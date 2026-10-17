#!/usr/bin/env python3
"""
Replace symbols of the KaTeX fonts with the ones of Shantell Sans, fitted
into the box of the KaTeX glyph they replace.

MathLive does not read glyph sizes from the font: it has the KaTeX metrics
hard-coded (width, height, depth of every glyph) and lays formulas out with
them. A Shantell glyph copied as is would overflow its neighbours or sit off
the math axis, so each one is fitted in one of three ways:

- operators (+ = < ∞ ∅ …): kept at Shantell size, so that their stroke
  matches the letters, and centred on the KaTeX glyph's box (hence on the
  math axis);
- delimiters (( [ { | /): scaled to the KaTeX glyph's height, and narrowed
  only when wider than the room MathLive gives them;
- letter-like symbols (π ∂ Ω): kept at Shantell size on Shantell's baseline,
  like the letters, centred horizontally and narrowed only when too wide;

and given the KaTeX advance width, whatever its own.

Run after roughen_extras.py, which rebuilds AMS from the original KaTeX font.
The script works in place on static/fonts/chiphre-math/: each listed glyph
is redrawn from the Shantell source, so running it twice gives the same font.
Writing to static/fonts/KaTeX_*.woff2 is refused: the original KaTeX fonts
were overwritten that way on 2026-01-20.
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
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "chiphre-math"
ORIGINAL_DIR = REPO_ROOT / "static" / "fonts" / "katex-original"
SHANTELL = REPO_ROOT / "tools" / "chiphre-math" / "fonts" / "input" / "shantell-sans-300.ttf"

OPERATOR, DELIMITER, LETTER = "operator", "delimiter", "letter"

# Police -> [(caractères, manière de les ajuster)]
TARGETS = {
    "KaTeX_Main-Regular": [
        ("+−=<>≤≥±×÷≈→←↔∞∅", OPERATOR),
        ("()[]{}|/", DELIMITER),
        ("∂Ω", LETTER),
        # Ponctuation : virgule décimale, point-virgule des intervalles, factorielle…
        (".,;:!?", LETTER),
        # ′ : MathLive le pose en exposant, à la taille du ′ de KaTeX, bien plus grand
        ("′", DELIMITER),
    ],
    "KaTeX_Math-Italic": [("πΩ", LETTER)],
    # \varnothing : le ∅ rond
    "KaTeX_AMS-Regular": [("∅", OPERATOR)],
}

# Marge minimale (unités de la police) entre un glyphe resserré et le bord de sa place
SIDE_MARGIN = 20


def bounds(font: TTFont, glyph_name: str):
    glyph_set = font.getGlyphSet()
    pen = BoundsPen(glyph_set)
    glyph_set[glyph_name].draw(pen)
    return pen.bounds


def replace_symbol(target: TTFont, reference: TTFont, source: TTFont, char: str, fit: str) -> bool:
    target_name = target.getBestCmap().get(ord(char))
    source_name = source.getBestCmap().get(ord(char))
    if not target_name or not source_name:
        print(f"  '{char}' absent de {'KaTeX' if not target_name else 'Shantell'}, ignoré")
        return False

    # La boîte de référence est celle du glyphe KaTeX d'origine, pas celle d'un passage précédent
    t_xmin, t_ymin, t_xmax, t_ymax = bounds(reference, target_name)
    advance = reference["hmtx"][target_name][0]
    s_xmin, s_ymin, s_xmax, s_ymax = bounds(source, source_name)

    scale_y = (t_ymax - t_ymin) / (s_ymax - s_ymin) if fit == DELIMITER else 1.0
    room = advance - 2 * SIDE_MARGIN
    scale_x = min(scale_y, room / (s_xmax - s_xmin))

    dx = (t_xmin + t_xmax) / 2 - scale_x * (s_xmin + s_xmax) / 2
    # Une lettre garde la ligne de base de Shantell, comme les lettres déjà copiées
    dy = 0 if fit == LETTER else (t_ymin + t_ymax) / 2 - scale_y * (s_ymin + s_ymax) / 2

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
    parser = argparse.ArgumentParser(description="Shantell symbols in the KaTeX fonts")
    parser.parse_args()

    source = TTFont(SHANTELL)
    for name, groups in TARGETS.items():
        path = OUTPUT_DIR / f"{name}.woff2"
        if path.parent.resolve() != OUTPUT_DIR.resolve():
            raise SystemExit(f"Sortie refusée hors de {OUTPUT_DIR}: {path}")
        target = TTFont(path)
        reference = TTFont(ORIGINAL_DIR / f"{name}.woff2")
        print(name)
        count = 0
        for chars, fit in groups:
            for char in chars:
                count += replace_symbol(target, reference, source, char, fit)
        target.flavor = "woff2"
        target.save(path)
        print(f"{count} symboles remplacés -> {path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
