# Shantell-Math

Outils pour créer une version "handwritten" des polices KaTeX pour MathLive.

## Objectif

Remplacer les caractères normaux (A-Z, a-z, 0-9) par ceux de Shantell Sans et appliquer un effet "roughen" aux symboles mathématiques pour un rendu manuscrit.

## Installation

```bash
cd tools/shantell-math
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou: venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

## Préparation des polices sources

1. Convertir les WOFF2 KaTeX en TTF :

```bash
python src/convert_woff2.py convert ../../static/fonts/KaTeX_Main-Regular.woff2 --to-ttf -o fonts/input/KaTeX_Main-Regular.ttf
```

2. Copier Shantell Sans (si besoin de la version TTF) :

```bash
# Le fichier WOFF2 peut être utilisé directement par fontTools
cp ../../static/fonts/shantell-sans-variable.woff2 fonts/input/
```

## Utilisation

### 1. Remplacer les caractères par Shantell Sans

```bash
python src/replace_glyphs.py \
    fonts/input/KaTeX_Main-Regular.ttf \
    fonts/input/shantell-sans-variable.woff2 \
    -o fonts/output/ShantellMath-Regular.ttf
```

Options :

- `--chars "ABC123"` : Remplacer seulement certains caractères

### 2. Appliquer l'effet "roughen" aux symboles math

```bash
python src/roughen_math.py \
    fonts/output/ShantellMath-Regular.ttf \
    -o fonts/output/ShantellMath-Regular-rough.ttf \
    --intensity 15 \
    --seed 42
```

Options :

- `-i, --intensity` : Niveau de perturbation (défaut: 10, recommandé: 10-30)
- `-s, --seed` : Graine aléatoire pour reproductibilité

### 3. Extraire/comparer les métriques

```bash
# Extraire les métriques d'une police
python src/build_metrics.py extract fonts/output/ShantellMath-Regular.ttf -o metrics.json

# Comparer avec l'originale
python src/build_metrics.py compare \
    fonts/input/KaTeX_Main-Regular.ttf \
    fonts/output/ShantellMath-Regular.ttf \
    -o differences.json

# Générer au format KaTeX
python src/build_metrics.py katex \
    fonts/output/ShantellMath-Regular.ttf \
    ShantellMath_Regular \
    -o shantellmath-metrics.js
```

### 4. Convertir en WOFF2

```bash
# Fichier unique
python src/convert_woff2.py convert fonts/output/ShantellMath-Regular.ttf

# Batch
python src/convert_woff2.py batch fonts/output/ ../../static/fonts/shantell-math/ -p "*.ttf"
```

## Pipeline complet

```bash
#!/bin/bash
set -e

# Variables
KATEX_FONTS="../../static/fonts"
INPUT="fonts/input"
OUTPUT="fonts/output"

# 1. Préparer les sources
python src/convert_woff2.py convert "$KATEX_FONTS/KaTeX_Main-Regular.woff2" --to-ttf -o "$INPUT/KaTeX_Main-Regular.ttf"

# 2. Remplacer les caractères
python src/replace_glyphs.py "$INPUT/KaTeX_Main-Regular.ttf" "$KATEX_FONTS/shantell-sans-variable.woff2" -o "$OUTPUT/ShantellMath-Regular.ttf"

# 3. Roughen les symboles math
python src/roughen_math.py "$OUTPUT/ShantellMath-Regular.ttf" -o "$OUTPUT/ShantellMath-Regular-final.ttf" -i 12 -s 42

# 4. Convertir en WOFF2
python src/convert_woff2.py convert "$OUTPUT/ShantellMath-Regular-final.ttf" -o "$KATEX_FONTS/ShantellMath-Regular.woff2"

echo "Done! Police générée: $KATEX_FONTS/ShantellMath-Regular.woff2"
```

## Structure

```
shantell-math/
├── src/
│   ├── replace_glyphs.py    # Remplace caractères par Shantell Sans
│   ├── roughen_math.py      # Effet sketchy sur symboles math
│   ├── build_metrics.py     # Extrait/compare les métriques
│   └── convert_woff2.py     # Conversion WOFF2 ↔ TTF
├── fonts/
│   ├── input/               # Polices sources
│   └── output/              # Polices modifiées
├── requirements.txt
├── PROJECT_BRIEF.md
└── README.md
```

## Polices KaTeX à traiter

| Police             | Usage                    |
| ------------------ | ------------------------ |
| KaTeX_Main-Regular | Texte principal          |
| KaTeX_Main-Bold    | Gras                     |
| KaTeX_Main-Italic  | Italique                 |
| KaTeX_Math-Italic  | Variables mathématiques  |
| KaTeX_Size1-4      | Grands opérateurs (∑, ∫) |
| KaTeX_AMS-Regular  | Symboles AMS             |

## Notes techniques

- Les métriques (height, depth, width, italic correction) sont cruciales pour le positionnement
- fontTools gère nativement les WOFF2 (pas besoin de conversion préalable en TTF pour lecture)
- L'intensité du roughen doit être ajustée selon la taille d'affichage cible
- Le seed permet de reproduire exactement le même résultat

## Ressources

- [fontTools documentation](https://fonttools.readthedocs.io/)
- [KaTeX fonts repo](https://github.com/KaTeX/katex-fonts)
- [MathLive fonts](https://mathlive.io/mathfield/guides/integration/)
