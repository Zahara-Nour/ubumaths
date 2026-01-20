# Dépannage - Shantell-Math

## Erreurs courantes

### 1. KeyError: 'two.tnum' (ou autre glyphe)

**Symptôme :**

```
KeyError: 'two.tnum'
```

**Cause :**
Shantell Sans utilise des glyphes composites qui référencent des variantes (ex: `two.tnum` pour les chiffres tabulaires).

**Solution :**
Utiliser `DecomposingRecordingPen` au lieu de `RecordingPen` :

```python
from fontTools.pens.recordingPen import DecomposingRecordingPen

glyph_set = font.getGlyphSet()
pen = DecomposingRecordingPen(glyph_set)
glyph_set[glyph_name].draw(pen)
```

---

### 2. 'list' object has no attribute 'calcIntBounds'

**Symptôme :**

```
AttributeError: 'list' object has no attribute 'calcIntBounds'
```

**Cause :**
Les coordonnées TrueType doivent être de type `GlyphCoordinates`, pas une simple liste.

**Solution :**

```python
from fontTools.ttLib.tables._g_l_y_f import GlyphCoordinates

# Mauvais
glyph.coordinates = [(x, y) for x, y in new_coords]

# Bon
glyph.coordinates = GlyphCoordinates(new_coords)
```

---

### 3. La police ne change pas dans MathLive

**Symptôme :**
Les formules mathématiques utilisent toujours la police KaTeX standard.

**Causes possibles :**

1. **fontsDirectory non défini** - Doit être défini AVANT de créer les mathfields :

   ```javascript
   import { MathfieldElement } from 'mathlive';
   MathfieldElement.fontsDirectory = '/fonts/shantell-katex';
   // PUIS créer les mathfields
   ```

2. **Cache navigateur** - Vider le cache ou utiliser Ctrl+Shift+R

3. **Mauvais chemin** - Vérifier que les fichiers existent dans le dossier

4. **Nom de fichier incorrect** - Les fichiers doivent garder les noms KaTeX exacts :
   - ✅ `KaTeX_Main-Regular.woff2`
   - ❌ `ShantellMath-Regular.woff2`

---

### 4. Polices italiques plus grasses que regular

**Symptôme :**
Le texte en italique apparaît plus épais que le texte normal.

**Cause :**
Shantell Sans variable a un poids par défaut de 300. Si les versions italiques viennent d'une source différente (Google Fonts italic = 400), il y aura un décalage.

**Solution :**
Créer toutes les variantes avec le même poids :

```python
from fontTools.varLib.instancer import instantiateVariableFont

font = TTFont("shantell-sans-variable.woff2")
font = instantiateVariableFont(font, {"wght": 300})  # Même poids
```

---

### 5. TypeError: unsupported operand type(s)

**Symptôme :**

```
TypeError: unsupported operand type(s) for +: 'NoneType' and 'float'
```

**Cause :**
Tentative de modifier un glyphe vide ou sans coordonnées.

**Solution :**
Vérifier l'existence des données avant modification :

```python
if not hasattr(glyph, "coordinates") or not glyph.coordinates:
    return False  # Glyphe vide, ignorer
```

---

### 6. WOFF2 compression failed

**Symptôme :**

```
brotli.error: BrotliEncoderCompress failed
```

**Cause :**
La bibliothèque `brotli` n'est pas installée ou incompatible.

**Solution :**

```bash
pip install --upgrade brotli fonttools[woff]
```

---

### 7. Python 3.9 type syntax error

**Symptôme :**

```
TypeError: unsupported operand type(s) for |: 'type' and 'NoneType'
```

**Cause :**
Syntaxe Python 3.10+ (`Path | None`) utilisée avec Python 3.9.

**Solution :**
Utiliser `Optional` de typing :

```python
from __future__ import annotations
from typing import Optional

def func(path: Optional[Path] = None):  # Au lieu de path: Path | None
    pass
```

---

## Vérifications de base

### Vérifier l'installation

```bash
cd tools/shantell-math
source venv/bin/activate
python -c "import fontTools; print(fontTools.__version__)"
python -c "import brotli; print('brotli OK')"
```

### Vérifier une police générée

```bash
# Lister les glyphes
python -c "
from fontTools.ttLib import TTFont
font = TTFont('static/fonts/shantell-katex/KaTeX_Main-Regular.woff2')
cmap = font.getBestCmap()
print('A:', cmap.get(ord('A')))
print('∑:', cmap.get(0x2211))
"
```

### Comparer avec l'originale

```bash
python src/build_metrics.py compare \
    static/fonts/KaTeX_Main-Regular.woff2.backup \
    static/fonts/KaTeX_Main-Regular.woff2 \
    -o comparison.json
```

---

## Contact

Pour les problèmes non résolus, créer une issue dans le repo UbuMaths avec :

- Version de Python
- Message d'erreur complet
- Commande exécutée
- Fichiers d'entrée utilisés
