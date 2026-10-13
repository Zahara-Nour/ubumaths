# Changelog - Shantell-Math

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

## [1.11.0] - 2026-10-13

### Ajouté

- Script `logic_geometry.py` : symboles de logique et de géométrie à la main de Shantell
  - repris de Shantell : `∀` (A retourné), `∨` et `∧` (V, à l'endroit et retourné), `¬`, l'accent de `\hat`, `∘` (le signe degré de Shantell, donc `90^\circ`), `∥` (deux `|` de Shantell)
  - dessinés au trait des lettres : `∃` (anguleux : un E rond de Shantell en miroir se lit 3), `⊥ ∠ ∡`, la barre de `\bar` et la vague de `\tilde` ; `∄ ∦` portent le trait de `\not`
  - MathLive écrit `\perp` avec `⟂` (U+27C2), absent de KaTeX : ajouté à Main-Regular ; il prend `¬` dans AMS, qui n'en a pas : ajouté ; ses accents sont `^` et `~`, redessinés comme `ˆ` et `˜`
  - `\widehat` et `\overline` restent fins : MathLive les trace lui-même (SVG, filet), sans la police
- Ordre : après `replace_symbols.py` (`∥` reprend son `|`), avant `build_typst_math_font.py`

## [1.10.0] - 2026-10-13

### Modifié

- `greek_letters.py` : minuscules grecques dessinées en traits souples, comme les lettres de Shantell, au lieu de courbes trop régulières (1.9.0) puis de morceaux de lettres raccordés, qui gardaient des angles
  - `α β γ δ ζ η λ ξ ρ ϱ σ ς φ ψ ω ϖ ϑ` : chaque trait est une courbe de Catmull-Rom par des points relevés sur les lignes centrales de Shantell (ventres du o et du c, hauteur d'x, hampes, jambages), épaissie au trait des lettres avec des bouts ronds ; deux traits qui se chevauchent quand la main se lève (`η ψ ζ λ ϱ ϖ`), comme le n
  - `ι` (bas du l, avec son pied), `υ` (u), `χ` (x étiré) restent faits d'un morceau de lettre Shantell ; `θ κ μ ν ο τ ε ϵ ϕ` restent des glyphes Shantell repris entiers
  - ajoutées : `ξ ϖ ϱ ς ϑ`

### Corrigé

- Minuscules grecques (et `π`) ajoutées à Main-Regular : dans un navigateur en français, MathLive les écrit droites (`letterShapeStyle` « french ») et les cherche dans la police droite, où KaTeX n'en a pas ; le navigateur prenait une police du système

## [1.9.0] - 2026-10-12

### Ajouté

- Script `greek_letters.py` : lettres grecques à la main de Shantell, qui n'a que `π Ω`
  - reprises de glyphes Shantell de même forme : `Γ П→Π Ф→Φ Ѳ→Θ ѳ→θ к→κ т→τ є→ϵ`, `∆→Δ`, `µ→μ`, `Y→Υ`, `v→ν`, `o→ο`, `V` retourné → `Λ`, `з` en miroir → `ε`, `ф→ϕ`
  - dessinées au trait des lettres, sur la hauteur d'x, des capitales et des jambages de Shantell : `α β γ δ ζ η ι λ ρ σ υ φ χ ψ ω`, `Ξ Σ Ψ`
  - minuscules dans Math-Italic ; capitales dans Main-Regular (droites, par défaut) et Math-Italic ; `ξ ϑ ϖ ϱ ς` gardent la forme KaTeX
- Ordre : après `replace_symbols.py`, avant `build_typst_math_font.py`

## [1.8.0] - 2026-10-12

### Ajouté

- `replace_symbols.py` : ponctuation `. , ; : ! ?` de Shantell (ajustement « lettre ») et prime `′` (mis à la hauteur du `′` de KaTeX, que MathLive pose en exposant)
- `redraw_symbols.py` :
  - `⊂ ⊃` : ligne centrale du `c` de Shantell (retournée pour `⊃`) ; `⊆ ⊇` : le même posé en haut de la boîte, une barre dessous ; `⊊ ⊋` (AMS) : la barre coupée d'un petit trait ; `⊈ ⊉` (AMS) : barrés du trait du « non »
  - `\not` (U+E020, que MathLive pose sur `=` pour `≠`) : un trait penché droit
  - `∉` : absent de KaTeX, ajouté à Main-Regular (glyphe `notelement`, chasse du `∈`) : le `∈` et le trait du « non »
  - `↦` : la flèche `→` de Shantell prolongée jusqu'au bord gauche de la boîte, et la barre
  - flèche de `\vec` (U+20D7) : un trait et la pointe courte de la flèche de Shantell, au trait des lettres ; elle déborde vers le haut de la boîte de KaTeX, trop basse pour ce trait

## [1.7.0] - 2026-10-12

### Ajouté

- Script `build_typst_math_font.py` : « Shantell Math », une seule police OpenType avec table `MATH`, pour Typst (PDF), construite depuis le jeu KaTeX Shantell
  - glyphes réunis sans hinting : Math-Italic → italiques mathématiques (U+1D434…, ℎ, grec, π), Main-Regular → droites, chiffres, opérateurs, ponctuation ; AMS → ℕ ℤ ℚ ℝ ℂ, ⩽ ⩾
  - tailles successives (Main ou Size1, puis Size1…Size4) des délimiteurs, de √ et des grands opérateurs ; assemblages des plus grandes tailles avec les morceaux de Size4 (⎛ ⎜ ⎝…, ⎷ U+E000 U+E001) et les barres de Size1
  - constantes `MATH` de Computer Modern (métriques KaTeX)
  - écrit aussi Shantell Sans Light et Bold sous le nom de famille « Shantell Sans » : reconstruites glyphe par glyphe, les instances de `fonts/input/` étant refusées telles quelles par Typst
  - sortie : `static/fonts/shantell-typst/`
- Ordre : en dernier, après tous les scripts qui modifient `static/fonts/shantell-katex/`

## [1.6.0] - 2026-10-12

### Ajouté

- Script `redraw_symbols.py` : symboles absents de Shantell redessinés à sa main, au trait des lettres (68), dans la boîte du glyphe KaTeX
  - `∈` : ligne centrale du `c` de Shantell (celle de `round_x.py`) fermée par une barre
  - `∪ ∩` : U dessiné à la main et son reflet
  - `⇒ ⟹ ⇔ ⟺` : deux traits et la pointe courte et ouverte de la flèche de Shantell
  - `ℕ ℤ ℚ ℝ ℂ` (lettres de `\mathbb`, police AMS) : lettres de Shantell avec un trait doublé, mesuré sur la lettre ; la jambe de N et R (droite qui passe au mieux par la jambe sous la boucle), la diagonale de Z (arrêtée au bord droit), l'intérieur gauche de Q et C
- Importe ses voisins (`replace_delimiters.py`, `round_x.py`), même lancé en `python -I`
- Ordre : après `roughen_extras.py` et `replace_symbols.py`

## [1.5.0] - 2026-10-12

### Ajouté

- `replace_symbols.py` traite plusieurs polices et un troisième ajustement, « lettre » (taille et ligne de base de Shantell, centré en largeur, resserré seulement s'il déborde) :
  - Main-Regular : `∞ ∅` (opérateurs), `∂ Ω` (lettres)
  - Math-Italic : `π Ω` (lettres)
  - AMS : `∅` de `\varnothing` (opérateur)
- À lancer après `roughen_extras.py`, qui reconstruit AMS depuis KaTeX d'origine

## [1.4.0] - 2026-10-12

### Ajouté

- Script `replace_radicals.py` : racines redessinées au geste du √ de Shantell (drapeau court qui monte, descente raide, fond arrondi) ; le √ de Shantell est une petite coche sans la branche qui doit rejoindre la barre de MathLive, il ne peut pas être copié
  - Main et Size1-4 : branche montante qui finit au coin où MathLive commence la barre
  - racine empilée (Size4 : ⎷, U+E000, U+E001) : même verticale pour les trois morceaux, coupés net à leurs bords de raccord ; le morceau du haut finit en un bout aussi fin que la barre (0,04 em)
- Script `replace_delimiters.py` : grands délimiteurs redessinés en ligne centrale au trait des lettres (68), dans la boîte du glyphe KaTeX
  - Size1-4 : `( ) [ ] { } ⟨ ⟩ ⌈ ⌉ ⌊ ⌋ / \`
  - morceaux empilés de Size4 (`⎛ ⎜ ⎝ ⎞ ⎟ ⎠ ⎡ ⎢ ⎣ ⎤ ⎥ ⎦ ⎧ ⎨ ⎩ ⎪ ⎫ ⎬ ⎭`) et barres de Size1 (`∣ ∥ ‖ ⏐`) : verticale du morceau répété KaTeX, coupe nette aux bords de raccord
- Ordre de génération complet : `roughen_extras.py` → `replace_big_operators.py` → `replace_delimiters.py` → `replace_radicals.py` (polices Size et AMS) ; `replace_symbols.py` → `round_x.py` → `replace_radicals.py` (police principale)

## [1.3.0] - 2026-10-12

### Ajouté

- Script `replace_big_operators.py` : grands opérateurs de Size1 (en ligne) et Size2 (display) pris dans Shantell Sans 300 : `∑ ∏ ∐ ∫ ∬ ∭`
  - agrandis à la hauteur du glyphe KaTeX (resserrés seulement s'ils débordent), puis rognés sur tout leur pourtour jusqu'au trait des lettres (68) : sans ça, un ∫ display agrandi ×2 aurait un trait de 141
  - `∐` = `∏` de Shantell retourné ; `∬` et `∭` = deux et trois `∫` de Shantell, espacés comme dans KaTeX
  - centrés sur la boîte KaTeX, largeur d'avance KaTeX
- Ordre de génération : `roughen_extras.py` (reconstruit Size1-4 et AMS depuis KaTeX d'origine) **puis** `replace_big_operators.py` ; `replace_symbols.py` puis `round_x.py` pour la police principale

## [1.2.0] - 2026-10-12

### Ajouté

- Script `replace_symbols.py` : opérateurs et délimiteurs de KaTeX_Main-Regular pris dans Shantell Sans (300) : `+ − = < > ≤ ≥ ± × ÷ ≈ → ← ↔ ( ) [ ] { } | /`
  - chaque glyphe est ajusté dans la boîte du glyphe KaTeX d'origine (MathLive a les métriques KaTeX codées en dur) et garde sa largeur d'avance KaTeX
  - opérateurs : taille Shantell (trait identique aux lettres), centrés sur la boîte KaTeX, donc sur l'axe mathématique
  - délimiteurs : mis à la hauteur KaTeX, resserrés seulement s'ils débordent (crochets : 0,69 en largeur)
- Travaille sur place dans `static/fonts/shantell-katex/KaTeX_Main-Regular.woff2` ; relancer le script donne la même police
- Script `round_x.py` : `x` minuscule redessiné en « ɔc », comme on l'écrit en maths ; le `x` de Shantell (et ses trois variantes) est une croix qu'on confond avec `×`
  - construit à partir du `c` de Shantell pour garder le style de la police (arc ample, courbure un peu inégale, bouts ronds sans crochet) : ligne centrale du `c` mesurée par rayons depuis son centre, placée à droite, son reflet à gauche, dos contre dos
  - retracée au trait des lettres Shantell (68 en 300, 153 en gras, mesuré sur o, l, n, c), bouts ronds, contours fusionnés
  - boîte et largeur d'avance du `x` de Shantell : l'espacement de MathLive ne change pas
  - Main-Regular, Main-Italic, Math-Italic (depuis Shantell 300), Main-Bold (depuis Shantell gras) ; relancer le script donne le même glyphe
  - nouvelle dépendance : `skia-pathops` (tracé du trait et fusion des contours)

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
