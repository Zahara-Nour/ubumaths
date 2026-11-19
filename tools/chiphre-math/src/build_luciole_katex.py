#!/usr/bin/env python3
"""
Construit le jeu écran « Luciole Math » pour MathLive : les 20 fichiers KaTeX_*.woff2
de static/fonts/luciole-math/, dont les glyphes sont pris dans Luciole (texte) et
Luciole-Math (maths), sans effet manuscrit.

MathLive impose les noms de fichiers et de familles KaTeX, et place les glyphes
verticalement avec SES métriques (codées dans son JavaScript) ; l'avance horizontale,
elle, vient de la police (le navigateur mesure le texte). Donc :

- glyphe ordinaire : glyphe Luciole réduit à GLYPH_SCALE (voir ce réglage), avance
  de Luciole réduite d'autant ;
- grand symbole, délimiteur agrandi, morceau d'empilement (fichiers Size1-4) et
  radical : variante Luciole de hauteur la plus proche, étirée verticalement pour
  occuper exactement la boîte verticale du glyphe KaTeX (MathLive le centre et
  l'empile d'après cette boîte) ;
- caractère sans équivalent dans Luciole : glyphe KaTeX gardé (listé à la fin).

Usage (depuis tools/chiphre-math, venv actif) :
    python src/build_luciole_katex.py            # écrit static/fonts/luciole-math/
    python src/build_luciole_katex.py --report   # liste aussi les caractères gardés
"""

from __future__ import annotations

import argparse
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[3]
KATEX_DIR = ROOT / 'static/fonts/katex-original'
LUCIOLE_DIR = ROOT / 'static/fonts/luciole'
OUTPUT_DIR = ROOT / 'static/fonts/luciole-math'

# Luciole est ~10 % plus haute que KaTeX (capitales 763 contre 683, « b » 791 contre
# 694) : à taille native, ses lettres touchaient la barre de racine, que MathLive pose
# d'après les hauteurs de KaTeX. Les glyphes ordinaires sont réduits à 0,9 ici, et
# `mathlive-fonts.ts` grossit les formules du jeu de 1/0,9 : lettres à leur taille
# native, écarts de MathLive agrandis d'autant. Les glyphes calés (Size, radical) ne
# sont pas réduits : ils occupent la boîte KaTeX, agrandie avec le reste.
GLYPH_SCALE = 0.9

# Calés dans la boîte KaTeX même hors fichiers Size : radical (MathLive pose la barre
# au haut du glyphe d'après ses métriques) ; primes, que KaTeX dessine bas parce que
# MathLive les met déjà en exposant (celui de Luciole, à hauteur de lettre, montait trop)
FIT_EVERYWHERE = {0x221A, 0x2032, 0x2033, 0x2034}

# Radical et morceaux de la racine empilée : MathLive commence la barre à l'avance du
# signe. Avance = bout droit du dessin, moins un léger chevauchement (sinon la barre
# flottait à 77 unités du √ de Main, dont la boîte KaTeX est plus large que le dessin).
RADICALS = {0x221A, 0xE000, 0xE001, 0x23B7}
RADICAL_OVERLAP = 20

# Glyphe centré sur la boîte KaTeX, avance de KaTeX : barre de \not, que MathLive
# superpose au signe suivant en la calant à droite sur l'avance de KaTeX (778)
CENTER_IN_KATEX_BOX = {0xE020}

# Points de code privés de KaTeX (E000-F8FF) : jamais cherchés tels quels dans Luciole,
# qui y range d'autres signes (E000 = zéro barré) ; glyphes Luciole-Math désignés par
# leur nom. Racine empilée : haut E001, milieu E000 répété, bas ⎷ (mêmes morceaux) ;
# E020 = barre de \not (≠ = \not=).
GLYPH_ALIASES = {
    0xE000: 'sqrt.ex',
    0xE001: 'sqrt.tp',
    0x23B7: 'sqrt.bt',
    0xE020: 'notaccent',
}

# Lettres hors bloc des alphanumériques mathématiques (trous du bloc Unicode)
HOLES = {
    'italic': {'h': 0x210E},
    'script': {
        'B': 0x212C, 'E': 0x2130, 'F': 0x2131, 'H': 0x210B, 'I': 0x2110,
        'L': 0x2112, 'M': 0x2133, 'R': 0x211B, 'e': 0x212F, 'g': 0x210A, 'o': 0x2134,
    },
    'fraktur': {'C': 0x212D, 'H': 0x210C, 'I': 0x2111, 'R': 0x211C, 'Z': 0x2128},
    'double': {
        'C': 0x2102, 'H': 0x210D, 'N': 0x2115, 'P': 0x2119, 'Q': 0x211A, 'R': 0x211D, 'Z': 0x2124,
    },
}

# Début (majuscule A) de chaque alphabet mathématique
ALPHABETS = {
    'bold': 0x1D400, 'italic': 0x1D434, 'bolditalic': 0x1D468, 'script': 0x1D49C,
    'boldscript': 0x1D4D0, 'fraktur': 0x1D504, 'double': 0x1D538, 'boldfraktur': 0x1D56C,
    'mono': 0x1D670,
}

# Grec italique : majuscules Α..Ω puis minuscules α..ω, et variantes
GREEK_START = {'bold': 0x1D6A8, 'italic': 0x1D6E2, 'bolditalic': 0x1D71C}

# Caractères que KaTeX range ailleurs que Luciole : i et j sans point en italique
# (points de code privés), accents d'espacement ˉ ˊ ˋ (Luciole : ¯ ´ `)
ALIASES = {0xE131: 0x1D6A4, 0xE237: 0x1D6A5, 0x02C9: 0x00AF, 0x02CA: 0x00B4, 0x02CB: 0x0060}

# Alphabet gras du grec, essayé avant le caractère lui-même (Luciole-Bold n'a pas de grec)
FALLBACK_ALPHABET = {
    'KaTeX_Main-Bold': 'bold',
    'KaTeX_SansSerif-Bold': 'bold',
    'KaTeX_Main-BoldItalic': 'bolditalic',
}
GREEK_VARIANTS = [0x2202, 0x03F5, 0x03D1, 0x03F0, 0x03D5, 0x03F1, 0x03D6]  # ∂ ϵ ϑ ϰ ϕ ϱ ϖ


def letter_target(alphabet: str, cp: int) -> int | None:
    """Point de code de la lettre `cp` (ASCII ou grec) dans l'alphabet mathématique donné."""
    ch = chr(cp)
    if ch in HOLES.get(alphabet, {}):
        return HOLES[alphabet][ch]
    if alphabet in ALPHABETS and ch.isascii() and ch.isalpha():
        offset = ord(ch) - 0x41 if ch.isupper() else 26 + ord(ch) - 0x61
        return ALPHABETS[alphabet] + offset
    if alphabet in GREEK_START:
        start = GREEK_START[alphabet]
        if 0x391 <= cp <= 0x3A9:
            return start + cp - 0x391
        if 0x3B1 <= cp <= 0x3C9:
            return start + 26 + cp - 0x3B1
        if cp in GREEK_VARIANTS:
            return start + 51 + GREEK_VARIANTS.index(cp)
    return None


class Source:
    """Une police Luciole : glyphes, boîtes, variantes MATH."""

    def __init__(self, path: Path):
        self.font = TTFont(path)
        self.cmap = self.font.getBestCmap()
        self.glyphs = self.font.getGlyphSet()
        self.variants: dict[str, list[str]] = {}
        # Morceaux d'empilement (GlyphAssembly) : dessinés dans un même repère horizontal ;
        # pour chacun, les morceaux des délimiteurs où il sert
        self.parts: dict[str, set[str]] = {}
        if 'MATH' in self.font and self.font['MATH'].table.MathVariants:
            mv = self.font['MATH'].table.MathVariants
            if mv.VertGlyphCoverage:
                for name, construction in zip(mv.VertGlyphCoverage.glyphs, mv.VertGlyphConstruction):
                    self.variants[name] = [r.VariantGlyph for r in construction.MathGlyphVariantRecord]
                    if construction.GlyphAssembly:
                        group = {p.glyph for p in construction.GlyphAssembly.PartRecords}
                        for part in group:
                            self.parts.setdefault(part, set()).update(group)

    def bounds(self, name: str):
        pen = BoundsPen(self.glyphs)
        self.glyphs[name].draw(pen)
        return pen.bounds

    def advance(self, name: str) -> int:
        return self.font['hmtx'][name][0]


def target_bounds(font: TTFont, name: str):
    glyph_set = font.getGlyphSet()
    pen = BoundsPen(glyph_set)
    glyph_set[name].draw(pen)
    return pen.bounds


def draw_into(source: Source, name: str, transform) -> object:
    """Dessine le glyphe source (décomposé, cubiques → quadratiques) dans un glyphe TrueType."""
    recording = DecomposingRecordingPen(source.glyphs)
    source.glyphs[name].draw(recording)
    tt_pen = TTGlyphPen(None)
    cu2qu = Cu2QuPen(tt_pen, max_err=1.0, reverse_direction=source.font.get('CFF ') is not None)
    recording.replay(TransformPen(cu2qu, transform))
    return tt_pen.glyph()


def copy_glyph(
    target: TTFont, target_name: str, source: Source, source_name: str, fit: bool,
    center: bool = False, radical: bool = False,
) -> None:
    glyf = target['glyf']
    hmtx = target['hmtx']
    katex_advance = hmtx[target_name][0]
    kb = target_bounds(target, target_name)
    sb = source.bounds(source_name)
    if sb is None:
        return

    if fit and kb is not None:
        # Variante de hauteur la plus proche, étirée verticalement dans la boîte KaTeX
        k_height = kb[3] - kb[1]
        candidates = [source_name] + source.variants.get(source_name, [])
        candidates = [c for c in candidates if source.bounds(c)]
        source_name = min(candidates, key=lambda c: abs((source.bounds(c)[3] - source.bounds(c)[1]) - k_height))
        sb = source.bounds(source_name)
        sy = k_height / (sb[3] - sb[1])
        if source_name in source.parts:
            # Morceau d'empilement : position horizontale de Luciole, la même pour tous les
            # morceaux du délimiteur (caler chacun sur le bord gauche de sa boîte KaTeX les
            # décalait : crans des accolades, crochets et de la grande racine). Même avance
            # pour tous : dans une formule centrée (`gathered`), MathLive centre chaque
            # morceau dans sa colonne, et un milieu plus étroit (crochet : 371 contre 510)
            # se décalait. Racine : bout du morceau le plus large, barre soudée.
            dx = 0
            group = source.parts[source_name]
            if radical:
                advance = round(max(source.bounds(p)[2] for p in group)) - RADICAL_OVERLAP
            else:
                advance = max(source.advance(p) for p in group)
        else:
            dx = kb[0] - sb[0]
            # Pas d'avance plus courte que le dessin (sauf morceau sans chasse)
            advance = max(katex_advance, round(sb[2] + dx)) if katex_advance > 0 else 0
        transform = (1, 0, 0, sy, dx, kb[1] - sb[1] * sy)
        if radical and source_name not in source.parts:
            advance = round(sb[2] + dx) - RADICAL_OVERLAP
    elif (center or katex_advance == 0) and kb is not None:
        # Marque sans chasse (accents combinants) ou barre de \not : même centre que KaTeX
        dx = (kb[0] + kb[2]) / 2 - (sb[0] + sb[2]) / 2 * GLYPH_SCALE
        transform = (GLYPH_SCALE, 0, 0, GLYPH_SCALE, dx, 0)
        advance = katex_advance
    else:
        transform = (GLYPH_SCALE, 0, 0, GLYPH_SCALE, 0, 0)
        advance = round(source.advance(source_name) * GLYPH_SCALE)

    glyph = draw_into(source, source_name, transform)
    glyf[target_name] = glyph
    glyph.recalcBounds(glyf)
    hmtx[target_name] = (advance, getattr(glyph, 'xMin', 0))


# Caractères que MathLive écrit dans un fichier KaTeX qui ne les a pas (le navigateur
# les prendrait alors dans une police du système) : ajoutés depuis Luciole-Math.
# Main-Regular : minuscules grecques droites (navigateur en français, `letterShapeStyle`
# « french ») et ⟂ (`\perp`) ; AMS : ¬ (`\lnot`). Voir docs/systeme/utilitaires-et-demos.md.
LOWER_GREEK = list(range(0x03B1, 0x03CA)) + [0x03D1, 0x03D5, 0x03D6, 0x03F0, 0x03F1, 0x03F5]
ADDED: dict[str, list[int]] = {
    'KaTeX_Main-Regular': LOWER_GREEK + [0x27C2],
    'KaTeX_AMS-Regular': [0x00AC],
}


def add_glyph(target: TTFont, cp: int, source: Source, source_name: str) -> None:
    """Ajoute un glyphe neuf (réduit à GLYPH_SCALE) et son entrée dans les cmap Unicode."""
    name = f'uni{cp:04X}'
    assert name not in target.getGlyphOrder(), f'{name} existe déjà'
    target.setGlyphOrder(target.getGlyphOrder() + [name])
    target['glyf'].glyphOrder = target.getGlyphOrder()
    glyph = draw_into(source, source_name, (GLYPH_SCALE, 0, 0, GLYPH_SCALE, 0, 0))
    target['glyf'][name] = glyph
    glyph.recalcBounds(target['glyf'])
    target['hmtx'][name] = (round(source.advance(source_name) * GLYPH_SCALE), getattr(glyph, 'xMin', 0))
    for table in target['cmap'].tables:
        if table.isUnicode():
            table.cmap[cp] = name


# Pour chaque fichier KaTeX : (sources dans l'ordre, alphabet mathématique, calage Size)
# Une source est un nom de fichier Luciole ; l'alphabet s'applique aux lettres.
PLAN: dict[str, tuple[list[str], str | None, bool]] = {
    'KaTeX_Main-Regular': (['Luciole-Math.otf', 'Luciole-Regular.ttf'], None, False),
    'KaTeX_Main-Italic': (['Luciole-Italic.ttf', 'Luciole-Math.otf'], None, False),
    'KaTeX_Main-Bold': (['Luciole-Bold.ttf', 'Luciole-Math.otf'], None, False),
    'KaTeX_Main-BoldItalic': (['Luciole-BoldItalic.ttf', 'Luciole-Math.otf'], None, False),
    'KaTeX_Math-Italic': (['Luciole-Math.otf'], 'italic', False),
    'KaTeX_Math-BoldItalic': (['Luciole-Math.otf'], 'bolditalic', False),
    'KaTeX_AMS-Regular': (['Luciole-Math.otf'], 'double', False),
    'KaTeX_Caligraphic-Regular': (['Luciole-Math.otf'], 'script', False),
    'KaTeX_Caligraphic-Bold': (['Luciole-Math.otf'], 'boldscript', False),
    'KaTeX_Script-Regular': (['Luciole-Math.otf'], 'script', False),
    'KaTeX_Fraktur-Regular': (['Luciole-Math.otf'], 'fraktur', False),
    'KaTeX_Fraktur-Bold': (['Luciole-Math.otf'], 'boldfraktur', False),
    'KaTeX_SansSerif-Regular': (['Luciole-Regular.ttf', 'Luciole-Math.otf'], None, False),
    'KaTeX_SansSerif-Italic': (['Luciole-Italic.ttf', 'Luciole-Math.otf'], None, False),
    'KaTeX_SansSerif-Bold': (['Luciole-Bold.ttf', 'Luciole-Math.otf'], None, False),
    'KaTeX_Typewriter-Regular': (['Luciole-Math.otf'], 'mono', False),
    'KaTeX_Size1-Regular': (['Luciole-Math.otf'], None, True),
    'KaTeX_Size2-Regular': (['Luciole-Math.otf'], None, True),
    'KaTeX_Size3-Regular': (['Luciole-Math.otf'], None, True),
    'KaTeX_Size4-Regular': (['Luciole-Math.otf'], None, True),
}


def build_one(stem: str, sources: dict[str, Source], report: bool) -> None:
    source_names, alphabet, fit_all = PLAN[stem]
    # Date de KaTeX gardée : relancer le script redonne les mêmes fichiers
    target = TTFont(KATEX_DIR / f'{stem}.woff2', recalcTimestamp=False)
    target.flavor = None
    cmap = target.getBestCmap()
    done: set[str] = set()
    kept: list[int] = []
    replaced = 0
    for cp, target_name in sorted(cmap.items()):
        if target_name in done or cp < 0x21:
            continue
        math_source = sources['Luciole-Math.otf']
        if cp in GLYPH_ALIASES:
            copy_glyph(
                target, target_name, math_source, GLYPH_ALIASES[cp],
                fit_all or cp in FIT_EVERYWHERE, center=cp in CENTER_IN_KATEX_BOX,
                radical=cp in RADICALS,
            )
            done.add(target_name)
            replaced += 1
            continue
        lookups = [letter_target(alphabet, cp)] if alphabet else []
        # Grec d'un fichier gras : l'alphabet gras d'abord, sinon Luciole-Math (cherchée
        # après Luciole-Bold) donnerait le grec normal ; latin et chiffres : Luciole-Bold
        if stem in FALLBACK_ALPHABET and not chr(cp).isascii():
            lookups.append(letter_target(FALLBACK_ALPHABET[stem], cp))
        lookups += [ALIASES.get(cp), cp]
        found = None
        for wanted in lookups:
            if wanted is None or (0xE000 <= wanted <= 0xF8FF):
                continue
            for name in source_names:
                src = sources[name]
                if wanted in src.cmap:
                    found = (src, src.cmap[wanted])
                    break
            if found:
                break
        if not found:
            kept.append(cp)
            continue
        copy_glyph(
            target, target_name, found[0], found[1], fit_all or cp in FIT_EVERYWHERE,
            radical=cp in RADICALS,
        )
        done.add(target_name)
        replaced += 1

    added = 0
    math_source = sources['Luciole-Math.otf']
    for cp in ADDED.get(stem, []):
        if cp not in cmap and cp in math_source.cmap:
            add_glyph(target, cp, math_source, math_source.cmap[cp])
            added += 1

    target.flavor = 'woff2'
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    target.save(OUTPUT_DIR / f'{stem}.woff2')
    print(f'{stem}: {replaced} remplacés, {added} ajoutés, {len(kept)} gardés')
    if report and kept:
        print('   gardés :', ' '.join(f'{chr(c)}({c:04X})' for c in kept))


def main() -> None:
    parser = argparse.ArgumentParser(description='Jeu écran Luciole Math pour MathLive')
    parser.add_argument('--report', action='store_true', help='lister les caractères gardés de KaTeX')
    args = parser.parse_args()
    sources = {
        name: Source(LUCIOLE_DIR / name)
        for name in {n for plan in PLAN.values() for n in plan[0]} | {'Luciole-Math.otf'}
    }
    for stem in PLAN:
        build_one(stem, sources, args.report)


if __name__ == '__main__':
    main()
