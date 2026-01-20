# Guide d'utilisation - Shantell-Math

## Démarrage rapide

### Installation

```bash
cd tools/shantell-math
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

### Créer une police manuscrite complète

```bash
# 1. Convertir KaTeX WOFF2 → TTF
python src/convert_woff2.py convert \
    ../../static/fonts/KaTeX_Main-Regular.woff2 \
    --to-ttf \
    -o fonts/input/KaTeX_Main-Regular.ttf

# 2. Remplacer A-Z, a-z, 0-9 par Shantell Sans
python src/replace_glyphs.py \
    fonts/input/KaTeX_Main-Regular.ttf \
    fonts/input/shantell-sans-300.ttf \
    -o fonts/output/ShantellMath-Regular.ttf

# 3. Appliquer l'effet roughen aux symboles math
python src/roughen_math.py \
    fonts/output/ShantellMath-Regular.ttf \
    -o fonts/output/ShantellMath-Regular-final.ttf \
    --intensity 12 \
    --seed 42

# 4. Convertir en WOFF2 pour le web
python src/convert_woff2.py convert \
    fonts/output/ShantellMath-Regular-final.ttf \
    -o ../../static/fonts/shantell-katex/KaTeX_Main-Regular.woff2
```

---

## Scripts détaillés

### replace_glyphs.py

Remplace les caractères alphanumériques par ceux de Shantell Sans.

```bash
python src/replace_glyphs.py <katex_font> <shantell_font> -o <output>
```

**Options :**
| Option | Description |
|--------|-------------|
| `-o, --output` | Chemin de sortie (requis) |
| `--chars "ABC"` | Caractères spécifiques à remplacer |

**Exemples :**

```bash
# Remplacer tous les alphanumériques
python src/replace_glyphs.py \
    fonts/input/KaTeX_Main-Regular.ttf \
    fonts/input/shantell-sans-300.ttf \
    -o fonts/output/modified.ttf

# Remplacer seulement les chiffres
python src/replace_glyphs.py \
    fonts/input/KaTeX_Main-Regular.ttf \
    fonts/input/shantell-sans-300.ttf \
    -o fonts/output/modified.ttf \
    --chars "0123456789"
```

---

### roughen_math.py

Applique un effet "manuscrit" aux symboles mathématiques.

```bash
python src/roughen_math.py <input_font> -o <output> [options]
```

**Options :**
| Option | Défaut | Description |
|--------|--------|-------------|
| `-o, --output` | - | Chemin de sortie (requis) |
| `-i, --intensity` | 10 | Niveau de perturbation (5-30) |
| `-s, --seed` | 42 | Graine aléatoire |

**Exemples :**

```bash
# Effet subtil
python src/roughen_math.py input.ttf -o output.ttf -i 8 -s 42

# Effet prononcé
python src/roughen_math.py input.ttf -o output.ttf -i 20 -s 42

# Autre seed (résultat différent)
python src/roughen_math.py input.ttf -o output.ttf -i 12 -s 123
```

---

### convert_woff2.py

Convertit entre TTF et WOFF2.

```bash
# TTF → WOFF2
python src/convert_woff2.py convert font.ttf -o font.woff2

# WOFF2 → TTF
python src/convert_woff2.py convert font.woff2 --to-ttf -o font.ttf

# Conversion batch
python src/convert_woff2.py batch input_dir/ output_dir/ -p "*.ttf"
```

---

### build_metrics.py

Extrait et compare les métriques des polices.

```bash
# Extraire les métriques
python src/build_metrics.py extract font.ttf -o metrics.json

# Comparer deux polices
python src/build_metrics.py compare original.ttf modified.ttf -o diff.json

# Format KaTeX (pour MathLive)
python src/build_metrics.py katex font.ttf FontName -o metrics.js
```

---

## Polices sources

### Préparer Shantell Sans avec poids spécifique

```bash
# Créer une instance à 300 (light, défaut de la variable)
python -c "
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

font = TTFont('../../static/fonts/shantell-sans-variable.woff2')
font = instantiateVariableFont(font, {'wght': 300})
font.save('fonts/input/shantell-sans-300.ttf')
"
```

### Poids disponibles

| Poids | Style          |
| ----- | -------------- |
| 300   | Light (défaut) |
| 400   | Regular        |
| 500   | Medium         |
| 600   | SemiBold       |
| 700   | Bold           |
| 800   | ExtraBold      |

---

## Intégration UbuMaths

### Structure des fichiers

```
static/fonts/
├── shantell-katex/           # Polices modifiées pour MathLive
│   ├── KaTeX_Main-Regular.woff2
│   ├── KaTeX_Main-Italic.woff2
│   ├── KaTeX_Main-Bold.woff2
│   ├── KaTeX_Math-Italic.woff2
│   └── ... (autres polices KaTeX)
├── shantell-sans-variable.woff2  # Source Shantell
└── KaTeX_*.woff2              # Polices KaTeX originales
```

### Configuration Svelte

```svelte
<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	onMount(async () => {
		if (browser) {
			const mathlive = await import('mathlive');
			// Utiliser les polices manuscrites
			mathlive.MathfieldElement.fontsDirectory = '/fonts/shantell-katex';
		}
	});
</script>
```

---

## Conseils

1. **Toujours utiliser le même seed** pour des résultats reproductibles
2. **Tester avec différentes intensités** (12 est un bon compromis)
3. **Garder des backups** des polices originales
4. **Vérifier visuellement** sur la page de test `/test-font`
5. **Cohérence des poids** : utiliser le même poids pour regular/italic/bold proportionnellement
