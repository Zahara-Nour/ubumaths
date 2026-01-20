# Guide Technique - Shantell-Math

## Architecture des polices

### Structure d'une police OpenType

```
Font (TTF/WOFF2)
├── head     - Métadonnées (unitsPerEm, dates, etc.)
├── hhea     - Métriques horizontales globales
├── hmtx     - Métriques par glyphe (largeur, LSB)
├── cmap     - Table de correspondance Unicode → glyph
├── glyf     - Contours des glyphes (TrueType)
│   └── ou CFF  - Contours PostScript (OpenType-CFF)
├── loca     - Index des glyphes dans glyf
├── name     - Noms (famille, version, copyright)
└── ...
```

### KaTeX vs Shantell Sans

| Caractéristique    | KaTeX           | Shantell Sans    |
| ------------------ | --------------- | ---------------- |
| Type               | TrueType (glyf) | CFF (PostScript) |
| unitsPerEm         | 1000            | 1000             |
| Style              | Computer Modern | Handwritten      |
| Glyphes composites | Peu             | Beaucoup         |

## Pipeline de modification

### 1. Remplacement des glyphes (`replace_glyphs.py`)

```
KaTeX_Main-Regular.ttf
        │
        ▼
┌──────────────────────────┐
│  Charger les deux fonts  │
└──────────────────────────┘
        │
        ▼
┌──────────────────────────┐
│  Calculer le scale       │
│  (UPM source / UPM cible)│
└──────────────────────────┘
        │
        ▼
┌──────────────────────────┐
│  Pour chaque caractère   │
│  A-Z, a-z, 0-9 :         │
│  - Décomposer composites │
│  - Copier les contours   │
│  - Mettre à jour hmtx    │
└──────────────────────────┘
        │
        ▼
   Output.ttf
```

#### Décomposition des glyphes composites

Shantell Sans utilise des glyphes composites (ex: "2" référence "two.tnum").
On utilise `DecomposingRecordingPen` pour aplatir ces références :

```python
from fontTools.pens.recordingPen import DecomposingRecordingPen

glyph_set = source_font.getGlyphSet()
recording_pen = DecomposingRecordingPen(glyph_set)
glyph_set[glyph_name].draw(recording_pen)
# recording_pen.value contient les opérations décomposées
```

### 2. Effet Roughen (`roughen_math.py`)

Ajoute des perturbations aléatoires aux points de contrôle pour un effet manuscrit.

```
Point original (x, y)
        │
        ▼
┌──────────────────────────┐
│  dx = random(-i, +i)     │
│  dy = random(-i, +i)     │
└──────────────────────────┘
        │
        ▼
Point modifié (x+dx, y+dy)
```

#### Paramètres recommandés

| Intensité | Effet                         |
| --------- | ----------------------------- |
| 5-10      | Subtil, presque imperceptible |
| 10-15     | Légèrement manuscrit          |
| 15-25     | Clairement manuscrit          |
| 25+       | Très irrégulier               |

Le seed garantit la reproductibilité (seed=42 par défaut).

### 3. Formats de coordonnées

#### TrueType (glyf)

Les coordonnées sont stockées dans `glyph.coordinates` comme `GlyphCoordinates`:

```python
from fontTools.ttLib.tables._g_l_y_f import GlyphCoordinates

# Lecture
coords = glyph.coordinates  # GlyphCoordinates

# Modification
new_coords = [(x+dx, y+dy) for x, y in coords]
glyph.coordinates = GlyphCoordinates(new_coords)
```

#### CFF (PostScript)

Les glyphes CFF utilisent des CharStrings avec des opérations de dessin :

```python
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.t2CharStringPen import T2CharStringPen

# Enregistrer les opérations
recording_pen = RecordingPen()
charstring.draw(recording_pen)

# Recréer avec modifications
t2_pen = T2CharStringPen(width=width, glyphSet=charstrings)
for op, args in recording_pen.value:
    # Modifier args si nécessaire
    getattr(t2_pen, op)(*args)
charstrings[glyph_name] = t2_pen.getCharString()
```

## Intégration avec MathLive

### Configuration des polices

MathLive charge ses polices depuis `fontsDirectory` :

```javascript
import { MathfieldElement } from 'mathlive';

// Définir AVANT de créer des mathfields
MathfieldElement.fontsDirectory = '/fonts/shantell-katex';
```

### Polices requises par MathLive

| Police             | Rôle                   |
| ------------------ | ---------------------- |
| KaTeX_Main-Regular | Texte et nombres       |
| KaTeX_Main-Italic  | Texte italique         |
| KaTeX_Main-Bold    | Texte gras             |
| KaTeX_Math-Italic  | Variables (x, y, z)    |
| KaTeX_Size1-4      | Grands symboles (∑, ∫) |
| KaTeX_AMS          | Symboles AMS           |

## Polices variables

Shantell Sans est une police variable avec des axes :

| Axe  | Plage   | Défaut |
| ---- | ------- | ------ |
| wght | 300-800 | 300    |
| ital | 0-1     | 0      |

Pour créer une instance statique avec un poids spécifique :

```python
from fontTools.varLib.instancer import instantiateVariableFont

font = TTFont("shantell-sans-variable.woff2")
font = instantiateVariableFont(font, {"wght": 400})
```

## Débogage

### Vérifier les glyphes d'une police

```bash
# Lister les glyphes
python -c "
from fontTools.ttLib import TTFont
font = TTFont('font.ttf')
print(list(font.getGlyphOrder())[:50])
"

# Vérifier un caractère spécifique
python -c "
from fontTools.ttLib import TTFont
font = TTFont('font.ttf')
cmap = font.getBestCmap()
print(cmap.get(ord('A')))  # Nom du glyphe pour 'A'
"
```

### Comparer les métriques

```bash
python src/build_metrics.py compare \
    fonts/input/KaTeX_Main-Regular.ttf \
    fonts/output/ShantellMath-Regular.ttf \
    -o differences.json
```

## Ressources

- [fontTools Documentation](https://fonttools.readthedocs.io/)
- [OpenType Specification](https://docs.microsoft.com/en-us/typography/opentype/spec/)
- [MathLive Customization](https://mathlive.io/mathfield/guides/integration/)
- [KaTeX Font Metrics](https://github.com/KaTeX/katex-fonts)
