#!/usr/bin/env python3
"""
Build « Chiphre Math », a single OpenType math font (with a MATH table) for
Typst, from the Shantell KaTeX fonts of static/fonts/chiphre-math/.

MathLive combines twenty KaTeX fonts and lays formulas out with the KaTeX
metrics it has hard-coded. Typst needs one font whose MATH table tells it, for
each symbol, which sizes exist and how to stack the pieces of a tall one. The
KaTeX fonts already hold all of it, so this script only gathers their glyphs
and writes that table:

- letters: Math-Italic → math italic code points (U+1D434…, ℎ, Greek, π),
  Main-Regular → upright letters, digits, operators, punctuation, Greek capitals;
  AMS → ℕ ℤ ℚ ℝ ℂ (the \\mathbb letters), ⩽ ⩾ and every other AMS symbol missing
  from Main; ≠ = « = » and the slash of \\not; Caligraphic → math script
  capitals (U+1D49C…, ℬ ℰ ℱ ℋ ℐ ℒ ℳ ℛ: Typst's cal());
- sizes: the glyph of Main (or Size1 for the big operators), then Size1 to
  Size4, become the vertical variants of ( [ { | ⟨ ⌈ ⌊ / √ ∑ ∏ ∐ ∫ ∬ ∭;
- stacked pieces: the Size4 pieces (⎛ ⎜ ⎝…, ⎷ U+E000 U+E001) and the Size1
  bars become the glyph assemblies of the tallest delimiters and radical;
- global constants (axis height, rule thicknesses, gaps): those of the KaTeX
  font metrics, i.e. Computer Modern's, which these glyphs were fitted to.

Every glyph is redrawn without hinting; the result is OFL like its sources.
Output: static/fonts/chiphre-math-typst/ChiphreMath.ttf, plus the text font of the
PDF: Shantell Sans Light and Bold, rebuilt from their instances (fonts/input/)
under one family name, « Shantell Sans » (see write_text_fonts).
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from fontTools.fontBuilder import FontBuilder as OpenTypeFontBuilder
from fontTools.otlLib.builder import buildMathTable
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont, newTable

REPO_ROOT = Path(__file__).resolve().parents[3]
SOURCE_DIR = REPO_ROOT / "static" / "fonts" / "chiphre-math"
OUTPUT_DIR = REPO_ROOT / "static" / "fonts" / "chiphre-math-typst"
OUTPUT = OUTPUT_DIR / "ChiphreMath.ttf"
INPUT_DIR = REPO_ROOT / "tools" / "chiphre-math" / "fonts" / "input"
# Police de texte du PDF : source -> (fichier publié, style)
TEXT_FONTS = {
    "shantell-sans-300.ttf": ("ShantellSans-Light.ttf", "Light"),
    "shantell-sans-bold.ttf": ("ShantellSans-Bold.ttf", "Bold"),
}
FAMILY = "Chiphre Math"

# Police source -> préfixe des noms de glyphes dans la police réunie
SOURCES = {
    "Main": "KaTeX_Main-Regular",
    "MathIt": "KaTeX_Math-Italic",
    "AMS": "KaTeX_AMS-Regular",
    "Cal": "KaTeX_Caligraphic-Regular",
    "S1": "KaTeX_Size1-Regular",
    "S2": "KaTeX_Size2-Regular",
    "S3": "KaTeX_Size3-Regular",
    "S4": "KaTeX_Size4-Regular",
}

# Constantes MATH : celles de Computer Modern (les métriques KaTeX), en unités pour 1000/em
CONSTANTS = {
    "ScriptPercentScaleDown": 70,
    "ScriptScriptPercentScaleDown": 50,
    "DelimitedSubFormulaMinHeight": 1300,
    "DisplayOperatorMinHeight": 1300,
    "MathLeading": 154,
    "AxisHeight": 250,
    "AccentBaseHeight": 431,
    "FlattenedAccentBaseHeight": 664,
    "SubscriptShiftDown": 150,
    "SubscriptTopMax": 344,
    "SubscriptBaselineDropMin": 200,
    "SuperscriptShiftUp": 363,
    "SuperscriptShiftUpCramped": 289,
    "SuperscriptBottomMin": 108,
    "SuperscriptBaselineDropMax": 250,
    "SubSuperscriptGapMin": 160,
    "SuperscriptBottomMaxWithSubscript": 344,
    "SpaceAfterScript": 56,
    "UpperLimitGapMin": 111,
    "UpperLimitBaselineRiseMin": 200,
    "LowerLimitGapMin": 167,
    "LowerLimitBaselineDropMin": 600,
    "StackTopShiftUp": 444,
    "StackTopDisplayStyleShiftUp": 677,
    "StackBottomShiftDown": 345,
    "StackBottomDisplayStyleShiftDown": 686,
    "StackGapMin": 120,
    "StackDisplayStyleGapMin": 280,
    "StretchStackTopShiftUp": 111,
    "StretchStackBottomShiftDown": 600,
    "StretchStackGapAboveMin": 200,
    "StretchStackGapBelowMin": 167,
    "FractionNumeratorShiftUp": 394,
    "FractionNumeratorDisplayStyleShiftUp": 677,
    "FractionDenominatorShiftDown": 345,
    "FractionDenominatorDisplayStyleShiftDown": 686,
    "FractionNumeratorGapMin": 40,
    "FractionNumDisplayStyleGapMin": 120,
    "FractionRuleThickness": 40,
    "FractionDenominatorGapMin": 40,
    "FractionDenomDisplayStyleGapMin": 120,
    "SkewedFractionHorizontalGap": 350,
    "SkewedFractionVerticalGap": 96,
    "OverbarVerticalGap": 120,
    "OverbarRuleThickness": 40,
    "OverbarExtraAscender": 40,
    "UnderbarVerticalGap": 120,
    "UnderbarRuleThickness": 40,
    "UnderbarExtraDescender": 40,
    "RadicalVerticalGap": 50,
    "RadicalDisplayStyleVerticalGap": 148,
    "RadicalRuleThickness": 40,
    "RadicalExtraAscender": 40,
    "RadicalKernBeforeDegree": 278,
    "RadicalKernAfterDegree": -556,
    "RadicalDegreeBottomRaisePercent": 60,
}

# Caractères dont les tailles successives sont : Main (ou Size1), Size1…Size4
DELIMITERS = "()[]{}⟨⟩⌈⌉⌊⌋/\\√|‖"
BIG_OPERATORS = "∑∏∐∫∬∭"  # tailles : Size1 (en ligne), Size2 (display)

# Assemblages (du bas vers le haut) : (caractère, police, [(point de code, extenseur ?)])
ASSEMBLIES: List[Tuple[str, str, List[Tuple[int, bool]]]] = [
    ("(", "S4", [(0x239D, False), (0x239C, True), (0x239B, False)]),
    (")", "S4", [(0x23A0, False), (0x239F, True), (0x239E, False)]),
    ("[", "S4", [(0x23A3, False), (0x23A2, True), (0x23A1, False)]),
    ("]", "S4", [(0x23A6, False), (0x23A5, True), (0x23A4, False)]),
    ("⌈", "S4", [(0x23A2, True), (0x23A2, True), (0x23A1, False)]),
    ("⌉", "S4", [(0x23A5, True), (0x23A5, True), (0x23A4, False)]),
    ("⌊", "S4", [(0x23A3, False), (0x23A2, True), (0x23A2, True)]),
    ("⌋", "S4", [(0x23A6, False), (0x23A5, True), (0x23A5, True)]),
    ("{", "S4", [(0x23A9, False), (0x23AA, True), (0x23A8, False), (0x23AA, True), (0x23A7, False)]),
    ("}", "S4", [(0x23AD, False), (0x23AA, True), (0x23AC, False), (0x23AA, True), (0x23AB, False)]),
    ("√", "S4", [(0x23B7, False), (0xE000, True), (0xE001, False)]),
    ("|", "S1", [(0x2223, True), (0x2223, True)]),
    ("‖", "S1", [(0x2225, True), (0x2225, True)]),
]

# Recouvrement minimal entre deux morceaux d'un assemblage
MIN_CONNECTOR_OVERLAP = 20


def math_italic_codepoint(char: str) -> Optional[int]:
    """Point de code « italique mathématique » d'une lettre latine ou grecque."""
    if char == "h":
        return 0x210E
    if "a" <= char <= "z":
        return 0x1D44E + ord(char) - ord("a")
    if "A" <= char <= "Z":
        return 0x1D434 + ord(char) - ord("A")
    if "α" <= char <= "ω":
        return 0x1D6FC + ord(char) - ord("α")
    return None


# Capitales « script » rangées hors du bloc U+1D49C (bloc des symboles de type lettre)
SCRIPT_EXCEPTIONS = {"B": 0x212C, "E": 0x2130, "F": 0x2131, "H": 0x210B, "I": 0x2110, "L": 0x2112, "M": 0x2133, "R": 0x211B}


def math_script_codepoint(char: str) -> int:
    """Point de code « script mathématique » d'une capitale latine (cal() de Typst)."""
    return SCRIPT_EXCEPTIONS.get(char, 0x1D49C + ord(char) - ord("A"))


class FontBuilder:
    def __init__(self) -> None:
        self.sources = {key: TTFont(SOURCE_DIR / f"{name}.woff2") for key, name in SOURCES.items()}
        self.base = TTFont(SOURCE_DIR / "KaTeX_Main-Regular.woff2")
        self.glyphs: Dict[str, object] = {".notdef": self.base["glyf"][".notdef"]}
        self.metrics: Dict[str, Tuple[int, int]] = {".notdef": self.base["hmtx"][".notdef"]}
        self.order: List[str] = [".notdef"]
        self.cmap: Dict[int, str] = {}

    def glyph(self, source: str, codepoint: int) -> Optional[str]:
        """Copie (une fois) le glyphe d'une police source ; rend son nom dans la police réunie."""
        font = self.sources[source]
        source_name = font.getBestCmap().get(codepoint)
        if source_name is None:
            return None
        name = f"{source}.{source_name}"
        if name in self.glyphs:
            return name
        pen = TTGlyphPen(None)
        font.getGlyphSet()[source_name].draw(pen)
        glyph = pen.glyph()
        glyph.recalcBounds(None)
        self.glyphs[name] = glyph
        self.metrics[name] = (font["hmtx"][source_name][0], getattr(glyph, "xMin", 0))
        self.order.append(name)
        return name

    def map(self, codepoint: int, source: str, source_codepoint: Optional[int] = None) -> None:
        name = self.glyph(source, codepoint if source_codepoint is None else source_codepoint)
        if name is not None:
            self.cmap[codepoint] = name

    def compose(self, codepoint: int, name: str, source: str, parts: List[int]) -> None:
        """Glyphe fait de glyphes d'une police source superposés à la même origine
        (≠ : le « = » et le trait de \\not, que MathLive superpose lui aussi)."""
        font = self.sources[source]
        glyph_set = font.getGlyphSet()
        cmap = font.getBestCmap()
        pen = TTGlyphPen(None)
        for part in parts:
            glyph_set[cmap[part]].draw(pen)
        glyph = pen.glyph()
        glyph.recalcBounds(None)
        self.glyphs[name] = glyph
        self.metrics[name] = (font["hmtx"][cmap[parts[0]]][0], getattr(glyph, "xMin", 0))
        self.order.append(name)
        self.cmap[codepoint] = name

    def height(self, name: str) -> int:
        pen = BoundsPen(None)
        self.glyphs[name].draw(pen, None)
        if pen.bounds is None:
            return 0
        return round(pen.bounds[3] - pen.bounds[1])

    def build(self) -> TTFont:
        # 1. Caractères : tout Main-Regular, puis les italiques, puis AMS
        for codepoint in self.sources["Main"].getBestCmap():
            self.map(codepoint, "Main")
        for codepoint in self.sources["MathIt"].getBestCmap():
            target = math_italic_codepoint(chr(codepoint))
            if target is not None:
                self.map(target, "MathIt", codepoint)
        for char, codepoint in (("N", 0x2115), ("Z", 0x2124), ("Q", 0x211A), ("R", 0x211D), ("C", 0x2102)):
            self.map(codepoint, "AMS", ord(char))
        for codepoint in (0x2A7D, 0x2A7E):
            self.map(codepoint, "AMS")
        for char in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            self.map(math_script_codepoint(char), "Cal", ord(char))
        # Le reste d'AMS (⊊ ⊈ ∄ ∦ ∡ ∴ ∵…) : sans lui, Typst prenait ces symboles dans une
        # autre police ; △ est celui d'AMS, que MathLive affiche (\\triangle)
        for codepoint in self.sources["AMS"].getBestCmap():
            if codepoint >= 0x80 and codepoint not in self.cmap:
                self.map(codepoint, "AMS")
        self.map(ord("△"), "AMS")
        # ≠ : KaTeX n'a pas ce caractère, MathLive superpose « = » et le trait de \\not
        self.compose(0x2260, "Main.notequal", "Main", [ord("="), 0xE020])
        # Les grands opérateurs n'existent qu'en Size1-2 : la taille en ligne est le glyphe de base
        for char in BIG_OPERATORS:
            self.map(ord(char), "S1")

        # 2. Tailles successives
        variants: Dict[str, List[Tuple[str, int]]] = {}
        for char in DELIMITERS + BIG_OPERATORS:
            sizes = ["S1", "S2"] if char in BIG_OPERATORS else ["Main", "S1", "S2", "S3", "S4"]
            names = [self.glyph(size, ord(char)) for size in sizes]
            names = [name for name in names if name is not None]
            if not names:
                continue
            self.cmap.setdefault(ord(char), names[0])
            variants[self.cmap[ord(char)]] = [(name, self.height(name)) for name in names]

        # 3. Assemblages des plus grandes tailles
        assemblies = {}
        for char, source, parts in ASSEMBLIES:
            records = []
            for index, (codepoint, extender) in enumerate(parts):
                name = self.glyph(source, codepoint)
                full = self.height(name)
                connector = min(150, full // 3)
                # Rien sous le morceau du bas, rien au-dessus de celui du haut
                start = 0 if index == 0 else connector
                end = 0 if index == len(parts) - 1 else connector
                records.append((name, 1 if extender else 0, start, end, full))
            base = self.cmap.get(ord(char))
            if base is not None:
                assemblies[base] = [records, 0]

        return self.assemble(variants, assemblies)

    def assemble(self, variants, assemblies) -> TTFont:
        font = self.base
        font.setGlyphOrder(self.order)
        font["glyf"].glyphs = dict(self.glyphs)
        font["glyf"].glyphOrder = self.order
        font["hmtx"].metrics = dict(self.metrics)
        for table in ("fpgm", "prep", "cvt ", "gasp"):
            if table in font:
                del font[table]

        cmap = newTable("cmap")
        cmap.tableVersion = 0
        cmap.tables = []
        from fontTools.ttLib.tables._c_m_a_p import cmap_format_4, cmap_format_12

        bmp = {cp: name for cp, name in self.cmap.items() if cp <= 0xFFFF}
        for subtable_class, platform, encoding, mapping in (
            (cmap_format_4, 3, 1, bmp),
            (cmap_format_12, 3, 10, dict(self.cmap)),
        ):
            subtable = subtable_class(4 if subtable_class is cmap_format_4 else 12)
            subtable.platformID, subtable.platEncID, subtable.language = platform, encoding, 0
            subtable.cmap = mapping
            cmap.tables.append(subtable)
        font["cmap"] = cmap

        post = font["post"]
        post.formatType = 3.0
        font["maxp"].maxZones = 1
        for attr in ("maxTwilightPoints", "maxStorage", "maxFunctionDefs", "maxInstructionDefs", "maxStackElements", "maxSizeOfInstructions"):
            setattr(font["maxp"], attr, 0)

        name = font["name"]
        name.names = []
        for name_id, value in (
            (0, "Shantell Sans: Copyright Arrow Type, Anna Tobias. KaTeX fonts: Copyright Khan Academy."),
            (1, FAMILY),
            (2, "Regular"),
            (3, f"{FAMILY} Regular"),
            (4, f"{FAMILY} Regular"),
            (5, "Version 1.0"),
            (6, "ChiphreMath-Regular"),
            (13, "This Font Software is licensed under the SIL Open Font License, Version 1.1."),
            (14, "https://openfontlicense.org"),
        ):
            name.setName(value, name_id, 3, 1, 0x409)

        buildMathTable(
            font,
            constants=CONSTANTS,
            minConnectorOverlap=MIN_CONNECTOR_OVERLAP,
            vertGlyphVariants=variants,
            vertGlyphAssembly=assemblies,
        )
        return font


def write_text_fonts() -> None:
    """Shantell Sans Light et Bold, reconstruites sous un même nom, « Shantell Sans ».

    Les instances de fonts/input/ (découpées dans la police variable) sont
    refusées par Typst telles quelles : il ne les voit pas, même renommées et
    privées de leurs tables accessoires. Reconstruites glyphe par glyphe (même
    ordre, mêmes métriques, mêmes tables de crénage et de ligatures), elles
    sont acceptées.
    """
    for source, (published, style) in TEXT_FONTS.items():
        font = TTFont(INPUT_DIR / source)
        order = font.getGlyphOrder()
        glyph_set = font.getGlyphSet()
        glyphs = {}
        for glyph_name in order:
            pen = TTGlyphPen(glyph_set)
            glyph_set[glyph_name].draw(pen)
            glyphs[glyph_name] = pen.glyph()

        builder = OpenTypeFontBuilder(font["head"].unitsPerEm, isTTF=True)
        builder.setupGlyphOrder(order)
        builder.setupCharacterMap(font.getBestCmap())
        builder.setupGlyf(glyphs)
        builder.setupHorizontalMetrics({glyph_name: font["hmtx"][glyph_name] for glyph_name in order})
        hhea = font["hhea"]
        builder.setupHorizontalHeader(ascent=hhea.ascent, descent=hhea.descent, lineGap=hhea.lineGap)
        builder.setupNameTable(
            {
                "familyName": "Shantell Sans",
                "styleName": "Regular" if style == "Light" else "Bold",
                "typographicFamily": "Shantell Sans",
                "typographicSubfamily": style,
                "psName": f"ShantellSans-{style}",
                "licenseDescription": "This Font Software is licensed under the SIL Open Font License, Version 1.1.",
            }
        )
        os2 = font["OS/2"]
        builder.setupOS2(
            usWeightClass=os2.usWeightClass,
            sTypoAscender=os2.sTypoAscender,
            sTypoDescender=os2.sTypoDescender,
            sTypoLineGap=os2.sTypoLineGap,
            usWinAscent=os2.usWinAscent,
            usWinDescent=os2.usWinDescent,
            sxHeight=os2.sxHeight,
            sCapHeight=os2.sCapHeight,
            # Bit 6 : Regular ; bit 5 : Bold
            fsSelection=0x40 if style == "Light" else 0x20,
        )
        builder.setupPost()
        # Bit 0 : gras, comme fsSelection
        builder.font["head"].macStyle = 0 if style == "Light" else 1
        for table in ("GDEF", "GPOS", "GSUB"):
            if table in font:
                builder.font[table] = font[table]
        builder.save(OUTPUT_DIR / published)
        print(f"Shantell Sans {style} -> {(OUTPUT_DIR / published).relative_to(REPO_ROOT)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the Chiphre Math OpenType font for Typst")
    parser.parse_args()

    font = FontBuilder().build()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = None
    font.save(OUTPUT)
    print(f"{FAMILY}: {len(font.getGlyphOrder())} glyphes -> {OUTPUT.relative_to(REPO_ROOT)}")
    write_text_fonts()


if __name__ == "__main__":
    main()
