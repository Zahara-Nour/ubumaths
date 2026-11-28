# Chantier `lecture-facilitee` — texte en Luciole, et étude d'une police de maths Luciole

## Reprendre ici

_Mis à jour le 2026-11-19 : chantier CLOS (go de David)._

- **État** : clos. Découpage D4 entièrement mergé (#2892, #2898, #2900, #2902, #2908) ; crédit D5 dans `/a-propos`. Le durable est dans `docs/systeme/fiches-et-pdf.md` et `docs/systeme/base-de-donnees.md`.
- **Prochaine action** : aucune. Autres PDF (exercice public, guides, cahier, presques-évaluations) = nouveau chantier si David le demande (D12).
- **Pièges laissés** : `\cdot` gros et `∯` petit (D8) ; lot « une copie par élève » de `PdfPreview` (zip) sans taille ni lecture facilitée.
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

- **D7 (2026-11-19, après #2892)** : David trouve le jeu écran Luciole Math réussi (« franchement j'aime beaucoup ») et répond « oui » : l'interrupteur « Lecture facilitée » passe aussi les **formules** en Luciole Math (D1 tranché).
- **D8 (2026-11-19)** : David reconfirme D7 (« Oui, maths aussi ») et laisse `\cdot` (gros) et `∯` (petit) tels quels.
- **Phase 0 des formules (complète A, découle de D7)** : nominal : réglage allumé → toutes les formules (champs MathLive et formules rendues) en Luciole Math ; limite : `/dev/polices` rend, en partant, le jeu du réglage (et non plus KaTeX) ; erreur : police absente → repli du navigateur, rien ne casse. Le jeu de polices des maths vaut pour toute la page (en-tête compris : il n'y en a guère).

### Phase 0 de la PR 4 — PDF en Luciole (validée par David le 2026-11-19, « ok » sur les recommandations)

- **Nominal** : fiche imprimée en lecture facilitée → tout le document en Luciole, formules en Luciole Math (bandeau, titres, consignes, réponses, corrigé : le corrigé quitte Shantell / Chiphre Math) ; lettres, mots et lignes un peu espacés comme à l'écran.
- **Limite** : se cumule avec la taille du texte ; un gabarit de prof passe aussi en Luciole ; réglage éteint → rien ne change, rien de plus téléchargé (Luciole + Luciole Math ≈ 810 ko).
- **Erreur** : compilation avec Luciole en échec → PDF dans la police habituelle + avertissement (comme le corrigé).
- **D9 (Q1)** : comme la taille du texte : enregistré **par élève** (`student_print_settings`, colonne `easy_reading`) ; interrupteur à côté du menu « Taille du texte » sur la fiche de l'élève ; vaut pour sa copie nominative ; le prof le règle dans l'aperçu « vue élève » ; au coup par coup (jamais enregistré) dans l'aperçu générique.
- **D10 (Q1 bis, question d'accès)** : personne de nouveau ne lit quoi que ce soit : l'élève, son prof et l'admin, comme la taille ; ni ami, ni autre élève, ni anon.
- **D11 (Q2)** : réglage PDF et interrupteur écran **séparés** (écran = ce navigateur ; PDF = l'élève).
- **D12 (Q3)** : fiches seulement (fiche, réponses, corrigé, copies par élève) ; autres PDF plus tard si David le veut.
- **D13 (Q4)** : mêmes petits écarts qu'à l'écran, quitte à une page de plus.
- **D14 (2026-11-19, après l'essai)** : en lecture facilitée, texte aligné à gauche, jamais justifié (la justification creusait des blancs irréguliers) ; David : « je te suis ».

## Observations de l'essai (2026-11-19)

- Luciole-Math 0.76 (2026-09) couvre tous nos symboles courants (× ÷ ≤ ≥ ≠ ≈ ± √ ∞ π ℕ ℤ ℚ ℝ ℂ ∈ ∉ ⊂ ∪ ∩ ∅ → ⇒ ⇔ ∀ ∃ ∑ ∫ ∠ ° ′ ″ ‰ ⟦ ⟧) ; elle se dit compatible Typst 0.14.
- PDF : compilée par le compilateur de la prod (`scripts/fiches/compile-prod.mjs --police …`), fractions, racines, matrices, ∑ ∫, ℕℤℚℝ, gras et italique corrects.
- `cal(A)` en Typst sort comme un A italique simple (à regarder : variante calligraphique par défaut de Luciole Math, ou la variante `cv` « script »).
- Les lettres des formules sont en italique (ABC) ; à l'écran, MathLive gardera notre convention (points en droit) au jeu écran de la PR 3.
- Aperçu écran MathML : la conversion de MathLive perd la virgule décimale et ignore `\mathcal` ; corrigé dans la page.

## Historique

### 2026-11-19 — PR 4a et 4b : PDF en lecture facilitée

- #2902 : colonne `easy_reading` de `student_print_settings` (tests d'intégration rouges sans, verts avec ; `security-auditor` sans bloquant) ; `db:migrate` joué (seule migration en attente).
- 4b : `src/lib/typst/easy-reading.ts` (règles encadrées, posées en tête et après le dernier `#set text`/`#set par`), compilateur à part `getEasyReadingCompiler` + repli (`fontSetOf`), option `easyReading` du générateur (corrections sans polices du Corrigé), `print-settings.ts` généralisé (`loadPrintSettings*`, `savePrintSettings`), API `print-settings` (`easyReading`), case `EasyReadingPdfCheckbox` (fiche élève, aperçu vue élève / vue prof, `PdfPreview`), copies par élève.
- Preuve : 5 fiches générées par le générateur réel, compilées par `scripts/fiches/compile-prod.mjs` avec Luciole : toutes OK ; polices embarquées = Luciole + Luciole Math seules (aucune New Computer Modern ni Shantell).

### 2026-11-19 — PR de suite : interligne du tableau de bord, classe dès le chargement

- `app.css` : `html.lecture-facilitee .dashboard-content :is(p, li).text-xs…xl`, interligne × 7/6 (les `!important` de `.dashboard-content .text-*` battaient la règle de `main p`).
- `app.html` : script inline (CSP : `'unsafe-inline'` déjà permis) qui lit `easyReading` et pose `lecture-facilitee` avant le premier affichage.
- Vérifié dans Chrome (5181) : page servie sans le JS de l'appli → classe posée ; interlignes 16→18,7, 20→23,3, 24→28, 28→32,7 px ; un `div.text-sm` inchangé.

### 2026-11-19 — PR 2 : réglage « Lecture facilitée »

- `src/lib/stores/easyReading.svelte.ts` : réglage gardé sous `easyReading`, classe `lecture-facilitee` sur `<html>`, bascule `switchMathFonts('luciole' | 'katex')` ; tests `easyReading.svelte.test.ts`.
- `EasyReadingToggle.svelte` (3 formes : icône, ligne de menu, bouton à libellé), posé à côté de la taille du texte dans `Header`, le layout du tableau de bord, `MobileNavDrawer` et le profil.
- `app.css` : `@font-face` Luciole (téléchargée seulement réglage allumé), `main` en Luciole (titres et `.exercise-content` compris), lettres +0,02 em, mots +0,08 em, lignes 1,75 rem × taille du texte.
- Vérifié dans Chrome (5182) : texte en Luciole, en-tête en Inter, jeu Luciole Math posé, rendu par `/dev/polices` en partant.

### 2026-11-19 — racine et délimiteurs (après l'avis de David)

- Morceaux empilés (accolades, crochets, grande racine) : décalés de 25 à 70 unités parce que chacun était calé sur le bord gauche de sa boîte KaTeX ; ils gardent maintenant la position de Luciole (même repère pour tout le délimiteur).
- Petite racine : la barre flottait à 77 unités du √ (avance KaTeX plus large que le dessin) ; avance = bout du dessin − 20.
- Retour de David (capture de la vitrine) : crans encore visibles dans une formule centrée (`gathered`) : MathLive y centre chaque morceau, et le milieu du crochet (371) est plus étroit que ses bouts (510) → même avance pour tous les morceaux d'un délimiteur.
- Grande racine : MathLive remonte sa barre de 0,04 em (aussi visible en KaTeX) ; pour Luciole, barre posée sans cette marge.

### 2026-11-19 — PR 3 : jeu écran Luciole Math

- `tools/chiphre-math/src/build_luciole_katex.py` : les 20 `KaTeX_*.woff2` depuis Luciole (texte) et Luciole-Math (maths). Glyphe ordinaire au même point de code (lettres des alphabets mathématiques pour Math-Italic, AMS = ℕℤℚℝℂ, Caligraphic/Script, Fraktur, Typewriter) ; grands symboles, délimiteurs, morceaux empilés, √ et primes : variante de hauteur la plus proche calée dans la boîte KaTeX.
- **Taille** : à taille native, Luciole (capitales 763, « b » 791) dépasse les hauteurs de KaTeX (683, 694) qui servent à MathLive : le `b` de `√(b²−4ac)` touchait la barre. Glyphes réduits à 0,9 dans les polices, formules grossies de 1/0,9 par `mathlive-fonts.ts` : même taille de lettres, écarts agrandis.
- **Codes privés** : Luciole-Math range d'autres signes en E000… (zéro barré) → grande racine en « 0 » barrés ; corrigé par noms de glyphes (`sqrt.tp/ex/bt`, `notaccent` pour le ≠).
- Grec minuscule droit, ⟂, ¬ ajoutés (absents de KaTeX, sinon police du système).

### Observations PR 3 (2026-11-19), à montrer à David

- `\cdot` : point de Luciole-Math gros (presque une puce).
- La barre de racine rejoint le haut du √ avec un petit cran.
- `\oiint` (∯) reste petit.
- Barres de fraction et de racine à 0,1 em (épaisseur de Luciole-Math), nettement plus grasses que KaTeX.

### 2026-11-19 — ouverture

Chantier ouvert par David depuis `inspiration` (proposition 4), avec en plus l'étude d'une version maths de Luciole « comme Chiphre Math à partir de Shantell ».
