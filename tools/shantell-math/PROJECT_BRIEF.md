# Projet Shantell-Math

## Objectif

Créer une version "handwritten" des polices KaTeX pour MathLive en :

1. Remplaçant les caractères normaux (A-Z, a-z, 0-9) par ceux de Shantell Sans
2. Appliquant un effet "roughen" aux symboles mathématiques (∑, ∫, √, etc.)
3. Recalculant les métriques pour un rendu correct

## Contexte technique

### Comment MathLive/KaTeX fonctionne

- MathLive utilise les **polices KaTeX** (basées sur Computer Modern)
- Le rendu utilise des **polices web** (WOFF2), pas du SVG
- Les **métriques** (height, depth, width, italic correction) sont stockées séparément dans `fontMetricsData.js`
- Les métriques sont cruciales pour le positionnement (exposants, indices, fractions, accents)

### Polices KaTeX à modifier

| Police                   | Usage                    |
| ------------------------ | ------------------------ |
| KaTeX_Main-Regular.woff2 | Texte principal          |
| KaTeX_Main-Bold.woff2    | Gras                     |
| KaTeX_Main-Italic.woff2  | Italique                 |
| KaTeX_Math-Italic.woff2  | Variables mathématiques  |
| KaTeX_Size1-4            | Grands opérateurs (∑, ∫) |
| KaTeX_AMS                | Symboles AMS             |

### Ressources disponibles

- `static/fonts/shantell-sans-variable.woff2` - Police handwritten source
- `static/fonts/KaTeX_*.woff2` - Polices KaTeX actuelles

## Plan d'implémentation

### Étape 1 : Setup

```bash
cd tools/shantell-math
python -m venv venv
source venv/bin/activate
pip install fonttools brotli
```

### Étape 2 : Remplacer les glyphes normaux

Script Python qui :

1. Charge KaTeX_Main (TTF)
2. Charge Shantell Sans
3. Copie les glyphes A-Z, a-z, 0-9 de Shantell vers KaTeX_Main
4. Ajuste les métriques

### Étape 3 : Roughen les symboles math

Script Python qui :

1. Parcourt les glyphes mathématiques
2. Ajoute des perturbations aux points de contrôle des courbes de Bézier
3. Paramètres : intensity (niveau d'irrégularité), seed (reproductibilité)

### Étape 4 : Recalculer les métriques

Utiliser fontTools pour extraire :

- Height (au-dessus baseline)
- Depth (sous baseline)
- Width
- Italic correction

### Étape 5 : Générer WOFF2

Convertir les polices modifiées en WOFF2 pour le web.

## Structure du projet

```
tools/shantell-math/
├── src/
│   ├── replace_glyphs.py    # Remplace caractères par Shantell Sans
│   ├── roughen_math.py      # Effet sketchy sur symboles math
│   ├── build_metrics.py     # Recalcule les métriques
│   └── convert_woff2.py     # Génère les WOFF2
├── fonts/
│   ├── input/               # Polices sources (KaTeX TTF, Shantell)
│   └── output/              # Polices modifiées
├── requirements.txt
└── README.md
```

## Commande pour démarrer

```
Crée le projet shantell-math dans tools/ pour modifier les polices KaTeX
avec Shantell Sans (caractères normaux) et un effet roughen (symboles math).
Voir tools/shantell-math/PROJECT_BRIEF.md pour les détails.
```

## Références

- [fontTools documentation](https://fonttools.readthedocs.io/)
- [KaTeX fonts repo](https://github.com/KaTeX/katex-fonts)
- [MathLive fonts](https://mathlive.io/mathfield/guides/integration/)
- [Building OpenType Math Fonts](https://github.com/notofonts/math/blob/main/documentation/building-math-fonts/index.md)
