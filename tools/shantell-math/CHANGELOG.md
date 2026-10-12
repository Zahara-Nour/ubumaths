# Changelog - Shantell-Math

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

## [1.2.0] - 2026-10-12

### Ajouté

- Script `replace_symbols.py` : opérateurs et délimiteurs de KaTeX_Main-Regular pris dans Shantell Sans (300) : `+ − = < > ≤ ≥ ± × ÷ ≈ → ← ↔ ( ) [ ] { } | /`
  - chaque glyphe est ajusté dans la boîte du glyphe KaTeX d'origine (MathLive a les métriques KaTeX codées en dur) et garde sa largeur d'avance KaTeX
  - opérateurs : taille Shantell (trait identique aux lettres), centrés sur la boîte KaTeX, donc sur l'axe mathématique
  - délimiteurs : mis à la hauteur KaTeX, resserrés seulement s'ils débordent (crochets : 0,69 en largeur)
- Travaille sur place dans `static/fonts/shantell-katex/KaTeX_Main-Regular.woff2` ; relancer le script donne la même police

## [1.1.0] - 2026-10-12

### Ajouté

- Script `roughen_extras.py` : même tremblé que les symboles de KaTeX_Main (intensité 12, graine 42) sur Size1-4 (grands opérateurs, grands délimiteurs, racines) et AMS (ℝ, ⩽, flèches…)
  - pièces empilées par MathLive : points proches des bords de raccord laissés fixes
  - pièces répétées (⎜ ⎢ ⎪ ∣ …) laissées droites : un tremblé recopié N fois devient une rangée de bosses régulières
  - racines : haut laissé fixe (la barre de MathLive s'y raccorde)
  - hinting retiré des glyphes modifiés ; une graine par glyphe
- Lit `static/fonts/katex-original/`, écrit dans `static/fonts/shantell-katex/` (refuse toute autre sortie)

## [1.0.0] - 2025-01-20

### Ajouté

- Script `replace_glyphs.py` : remplace A-Z, a-z, 0-9 par Shantell Sans
- Script `roughen_math.py` : effet manuscrit sur les symboles mathématiques
- Script `convert_woff2.py` : conversion TTF ↔ WOFF2
- Script `build_metrics.py` : extraction et comparaison des métriques
- Support des glyphes composites via `DecomposingRecordingPen`
- Support des polices TrueType et CFF/OpenType
- Gestion des polices variables (instantiation avec poids spécifique)
- Page de test `/test-font` dans UbuMaths

### Polices générées

- KaTeX_Main-Regular.woff2 (wght=300)
- KaTeX_Main-Italic.woff2 (wght=300)
- KaTeX_Main-Bold.woff2 (wght=700)
- KaTeX_Math-Italic.woff2 (wght=300)

### Paramètres utilisés

- Intensité roughen : 12
- Seed : 42
- Poids regular/italic : 300
- Poids bold : 700

### Documentation

- README.md avec instructions complètes
- PROJECT_BRIEF.md avec contexte technique
- docs/TECHNICAL.md avec détails d'implémentation
- docs/TROUBLESHOOTING.md avec solutions aux erreurs courantes
- docs/USAGE.md avec guide d'utilisation

---

## Notes de version

### Compatibilité

- Python 3.9+
- fontTools 4.x
- brotli (pour WOFF2)

### Polices sources

- Shantell Sans Variable (SIL Open Font License)
- KaTeX fonts (SIL Open Font License)
