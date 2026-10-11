---
title: Défauts figures / PDF — progression
date: 2026-10-03
status: corrections faites, branche non poussée
branche: fix/figures-pdf (worktree ../ubumaths-wt-g1-figures)
---

# Défauts des figures et du PDF

Point de reprise en cas de crash. Fiche de contrôle : point en croix, cercle débordant la
fenêtre en repère, texte « n⃗ », `align*` avec `\iff\ &`, point nommé Ω.

## Défauts et décisions

1. **`forme="croix"`** : l'écran (`figure-svg.ts` → `FigureBlockView.svelte`) dessinait toujours
   un rond plein ; le PDF (`export-typst.ts`) savait croix / cercle / carré. L'écran suit le PDF,
   mêmes proportions. Une forme inconnue (`forme="triangle"`) passait telle quelle (rond à l'écran,
   RIEN au PDF) → erreur située, valeurs `point`, `cercle`, `croix`, `carre` (+ `carré`, alias
   anglais).
2. **PDF non découpé à la fenêtre** : cetz 0.3.0 n'a pas de découpe. Option `clipToViewport` de
   `exportToTypst` : objets dans `box(clip: true)` aux dimensions de la fenêtre, posée par
   `content` au coin nord-ouest ; la boîte contient une 2ᵉ toile cetz d'étendue CONNUE (rectangle
   invisible englobant tout ce qui est tracé + 1 cm) recalée par `place`. Repère, noms et textes
   AU-DESSUS (jamais coupés) ; nom d'un point / texte hors de la fenêtre omis (l'écran le découpe).
3. **`n⃗` en carrés** : la police du texte (PDF ET écran de test) n'a pas la flèche combinante
   U+20D7. `texte` n'accepte pas de maths (`mtexte` existe mais hors liste blanche du bloc
   figure, et l'écran est un SVG statique sans moteur de formules). Approche retenue, la plus
   simple : `combining-accents.ts` découpe le texte ; PDF = mode math `arrow(n)` ; écran = lettre
   italique + flèche posée au-dessus (`<tspan>`). Accents gérés : U+20D7 →, U+20D6 ←, U+20E1 ↔,
   U+20D1 ⇀ ; un combinant isolé est ôté.
4. **`\iff\ &` dans `align*`** : le découpage sur `&` puis `.trim()` ôtait l'espace de `\ ` → `\`
   orphelin qui échappait le `$` fermant (`<=>\$`) ou la `)` d'un `cases` → « unclosed delimiter »,
   toute la fiche échouait. `trimLatex` garde l'espace après un nombre impair de `\` ;
   `splitAlignCells` ne coupe pas sur `\&` ; les `&` suivants sont des espaces ; `\` + tabulation
   ou retour à la ligne = espace aussi.
5. **`Ω` refusé** : le tokenizer n'acceptait que `[A-Za-z_]`. Lettres grecques Unicode (Α…Ω, α…ω)
   acceptées dans les identifiants, nom affiché tel qu'écrit. `π` est un nom ordinaire (la
   constante reste `\pi`, l'erreur « variable inconnue » le rappelle). `α` et `alpha`/`\alpha`
   restent deux noms distincts (pas de normalisation : le nom affiché serait « alpha »).

## Journal

- 2026-10-03 : tests rouges écrits pour 1-5 (montrés), corrections, fiche compilée avant (ÉCHEC
  « unclosed delimiter », « Figure indisponible », cercle hors cadre, □□) / après (OK).
- Vérifs : suites `geometry-core` + `ubumark` + `constructions-v2` (307 fichiers, 7767 tests)
  vertes ; tests navigateur des composants figure (14 fichiers) verts ; écran capturé dans le
  navigateur de test (croix, cercle, carré, `n⃗`, Ω, objets découpés) identique au PDF.
- Instantanés de `figure-repere-invariance` ré-enregistrés : seuls changements `shape: "dot"` à
  l'écran et l'enveloppe de découpe au PDF (vérifié ligne à ligne).
- `question:specs --file` : les 12 modèles à figures (produit scalaire, géométrie repérée) OK.
- Mesure PRODUCTION (lecture seule, 315 exercices + 815 modèles × 5 tirages, 18 399 rendus) :
  84 rendus changent, tous dans les 11 modèles à figures (42 Typst, 42 SVG) ; chaque changement
  est l'enveloppe de découpe (mêmes lignes de dessin, triées) ou le champ `shape: "dot"` ; aucun
  objet de ces figures ne dépasse de la fenêtre (rendu visuel inchangé) ; 11 figures compilées
  avec typst.ts 0.6.1-rc5 : OK. 0 exercice ne change : la classe du défaut 4 (`\ ` avant `&`)
  est absente de la base, prouvée par les tests unitaires seulement.
