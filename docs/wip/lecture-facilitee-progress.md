# Chantier `lecture-facilitee` — texte en Luciole, et étude d'une police de maths Luciole

## Reprendre ici

_Mis à jour le 2026-11-19, après l'avis de David sur la page d'essai (#2884)._

- **État** : PR 1 mergée (#2884). David a regardé la page d'essai : « C plutôt pas mal », il faut voir **avec MathLive et toutes les expressions possibles** → D6 ci-dessous : la PR 3 passe avant la PR 2.
- **Prochaine action** : PR 3, nouveau jeu de polices écran `luciole` pour MathLive (fichiers `KaTeX_*.woff2` construits depuis Luciole / Luciole-Math avec `tools/chiphre-math`, sans effet manuscrit), ajouté à côté de `katex` et `shantell` dans `mathlive-fonts.ts` ; 3e bouton « Luciole Math » sur `/dev/polices`, dont la vitrine montre déjà tous les symboles, la galerie, le texte mixte et les exercices. Worktree `../ubumaths-wt-lecture-facilitee`, branche `feat/lecture-facilitee-mathlive`.
- **En attente de David** : rien ; il jugera la PR 3 sur `/dev/polices`.
- **Pièges en cours** : ne rien renommer ni retirer de ce qui porte le nom KaTeX ; les métriques des polices sont codées dans MathLive (pas lues dans les fichiers) → un glyphe Luciole plus large/haut que celui de KaTeX déborde (voir comment `tools/chiphre-math` l'a traité : `build_metrics.py`, `docs/TECHNICAL.md`) ; venv Python à recréer (`tools/chiphre-math/README.md`) ; Tailscale Serve `:8445` → 5175 encore ouvert (le couper : `tailscale serve --https=8445 off`).
- **Worktree / branche** : aucun.

## Ce qui existe déjà (vérifié le 2026-11-19)

- **Taille du texte** : `src/lib/stores/fontSize.svelte.ts` (variable CSS `--font-scale`, gardée dans le navigateur sous `fontScale`), boutons dans `Header.svelte`, `MobileNavDrawer.svelte` et la page profil.
- **Jeux de polices des maths à l'écran** : `src/lib/utils/mathlive-fonts.ts`, jeux `katex` (par défaut, partout) et `shantell` (= Chiphre Math, seulement sur `/dev/polices`). Un jeu = des fichiers `KaTeX_*.woff2` qui remplacent ceux de MathLive + une feuille CSS de surcharge.
- **Chiphre Math** : générée par `tools/chiphre-math/` (Python, fontTools) : lettres et chiffres pris dans Shantell Sans, symboles « roughen », métriques recalculées ; deux sorties : les `KaTeX_*.woff2` pour l'écran (`static/fonts/chiphre-math/`) et une police de maths OpenType `ChiphreMath.ttf` pour les PDF Typst (`static/fonts/chiphre-math-typst/`, `src/lib/typst/correction-fonts.ts`).

## Fait nouveau : Luciole a déjà sa police de maths

Le paquet CTAN `luciole` contient, en plus des 4 polices de texte (CC-BY 4.0), **`Luciole-Math.otf`**, une police de maths OpenType (licence SIL OFL 1.1), version 0.75 du 2026-09-11 (0.76 peut-être). Elle a longtemps été dite « à tester davantage ».

Conséquence pour l'étude :

- **PDF (Typst)** : Typst lit directement une police de maths OpenType → on peut essayer `Luciole-Math.otf` telle quelle, sans rien générer (comme `ChiphreMath.ttf`).
- **Écran (MathLive)** : MathLive ne lit pas une police de maths OpenType ; il veut des fichiers découpés à la KaTeX (`KaTeX_Main`, `KaTeX_Math`, `KaTeX_Size1-4`…). Il faudrait donc adapter `tools/chiphre-math` : prendre les glyphes dans Luciole et Luciole-Math au lieu de Shantell, **sans** effet manuscrit, et recalculer les métriques. C'est le gros du travail.

## Phase 0 — validée par David le 2026-11-19 (« ok » sur les recommandations)

### A. Réglage « Lecture facilitée » à l'écran

- **Nominal** : un interrupteur « Lecture facilitée » à côté des boutons de taille du texte (en-tête, menu mobile, page profil). Allumé : le texte passe en Luciole, les lettres et les lignes s'espacent un peu. Exemple : la consigne « Calcule l'aire du rectangle » s'affiche en Luciole ; la formule `3 × 4` garde la police des maths. Le choix est gardé dans le navigateur, comme la taille du texte.
- **Limite** : éteint par défaut ; se cumule avec la taille du texte (150 % + Luciole possible) ; s'applique aussi aux pages sans connexion.
- **Erreur** : si la police ne se charge pas, le texte reste dans la police habituelle, rien ne casse.

### B. Étude d'une version maths de Luciole

- **Étape 1** : page d'essai (dans `/dev/polices`, à côté de ce qui existe) : un même texte avec formules, montré en police habituelle, en Luciole + maths actuelles, en Luciole + Luciole-Math (PDF Typst, tout de suite possible).
- **Étape 2**, si l'essai plaît : construire le jeu écran « Luciole Math » pour MathLive à partir de Luciole-Math, avec l'outillage de Chiphre Math ; nouveau jeu à côté de `katex` et `shantell`, rien de retiré.

### Questions à David

- **Q1. Les maths en Luciole ?** Le chantier `inspiration` disait « les maths gardent leur police ». Si l'essai de Luciole-Math plaît, la lecture facilitée doit-elle **aussi** passer les maths en Luciole Math ? (Exemple : dans « Calcule 3 × 4 », le 3 et le 4 en Luciole comme le texte, au lieu de chiffres d'une autre forme.)
- **Q2. Qui voit l'interrupteur ?** Tout le monde (élèves, prof, visiteurs), ou seulement les élèves ?
- **Q3. Où il s'applique ?** Le contenu de la page seulement (comme la taille du texte : consignes, questions, cours), ou aussi les menus et l'en-tête ?
- **Q4. Ordre des PR** proposé : (1) page d'essai, (2) réglage écran pour le texte, (3) jeu écran Luciole Math si Q1 = oui, (4) PDF plus tard. D'accord ?
- **Q5. Crédit** : Luciole demande de citer ses auteurs. Une ligne sur la page « À propos » / mentions, ça te va ?

### Décisions (2026-11-19)

- **D1 (Q1)** : maths en Luciole Math aussi, comme but, **si la page d'essai convainc** ; vérifier sur l'essai la couverture de nos symboles.
- **D2 (Q2)** : interrupteur visible par **tout le monde** ; nom « Lecture facilitée » (jamais « mode dys »).
- **D3 (Q3)** : s'applique au **contenu** de la page seulement, comme la taille du texte ; menus et en-tête inchangés.
- **D4 (Q4)** : PR 1 page d'essai → PR 2 réglage écran (texte), sans attendre D1 → PR 3 jeu écran Luciole Math si D1 → PR 4 PDF (peut-être plus tôt : Typst lit Luciole-Math telle quelle).
- **D5 (Q5)** : crédit dans une section « Polices » de `/a-propos` (ou `/legal`), qui cite Luciole et Shantell.

- **D6 (2026-11-19, après l'essai)** : version C jugée « plutôt pas mal » ; avant de décider, la voir rendue **par MathLive** sur toutes les expressions → PR 3 (jeu écran Luciole Math, sur `/dev/polices` seulement) avant la PR 2.

## Observations de l'essai (2026-11-19)

- Luciole-Math 0.76 (2026-09) couvre tous nos symboles courants (× ÷ ≤ ≥ ≠ ≈ ± √ ∞ π ℕ ℤ ℚ ℝ ℂ ∈ ∉ ⊂ ∪ ∩ ∅ → ⇒ ⇔ ∀ ∃ ∑ ∫ ∠ ° ′ ″ ‰ ⟦ ⟧) ; elle se dit compatible Typst 0.14.
- PDF : compilée par le compilateur de la prod (`scripts/fiches/compile-prod.mjs --police …`), fractions, racines, matrices, ∑ ∫, ℕℤℚℝ, gras et italique corrects.
- `cal(A)` en Typst sort comme un A italique simple (à regarder : variante calligraphique par défaut de Luciole Math, ou la variante `cv` « script »).
- Les lettres des formules sont en italique (ABC) ; à l'écran, MathLive gardera notre convention (points en droit) au jeu écran de la PR 3.
- Aperçu écran MathML : la conversion de MathLive perd la virgule décimale et ignore `\mathcal` ; corrigé dans la page.

## Historique

### 2026-11-19 — ouverture

Chantier ouvert par David depuis `inspiration` (proposition 4), avec en plus l'étude d'une version maths de Luciole « comme Chiphre Math à partir de Shantell ».
