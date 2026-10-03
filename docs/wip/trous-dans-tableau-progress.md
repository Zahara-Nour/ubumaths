# Trous dans une cellule de tableau — progression

Branche `feat/trous-dans-tableau`, worktree `../ubumaths-wt-tableau`. Validé par David le 2026-10-03.

## Constat (mesuré)

Énoncé avec `| $?$ |` : `generateInstance` compte le trou (index dans l'ordre de lecture) et
la cellule devient `$\placeholder[0]{}$`, mais `FillBlanksInput` délègue les tableaux à
`StaticBlockNode` (bloc sans trou) : la case s'affiche, sans pouvoir être saisie.

Validation : indépendante du rendu (index des trous). Modèle sonde (2 trous dans le tableau,
1 dessous) : `pnpm question:specs` 3/3 vertes (ordre de lecture, cellules inversées refusées,
trou hors tableau faux refusé).

## Plan

1. Tests navigateur rouges (`FillBlanksInput-tableau.svelte.test.ts`).
2. `TableNode` : snippet optionnel de cellule (tableaux sans trou inchangés).
3. `ParagraphNode` : rendu en `<span>` dans une cellule.
4. `FillBlanksInput` : tableau à trous rendu avec les mêmes composants de saisie.
5. PDF (générateur Typst) : case « … » et réponse au corrigé dans la cellule.
6. Mesure prod (modèles à trou dans une cellule), doc `fiches-exercices.md`.

## État

- [x] 1 · [x] 2 · [x] 3 · [x] 4 · [x] 5 · [x] 6

Tests : `FillBlanksInput-tableau.svelte.test.ts` 9 rouges → 10 verts ; `fill-blanks-table.test.ts`
8 rouges → verts. Non-régression : client 40 fichiers / 359 tests, serveur 105 / 3984 verts.
375 px : le tableau défile dans son cadre (`relative` sur le cadre : sinon le libellé
absolu de MathLive faisait déborder la page à 415 px), bouton de menu MathLive masqué en cellule.

PDF (série figée `buildSerie` du modèle sonde → `rendu-fiche.ts` → `compile-prod.mjs` → PNG) :
rien à corriger. Énoncé : « …… » dans les deux cellules et sous le tableau ; corrigé : 2 et 4 en gras
dans les cellules, 6 dessous. Les « …… » sont calés en haut de la cellule (alignement vertical
`top` des tableaux Typst) : lisible, laissé tel quel.

Mesure en production (lecture seule, 2026-10-03) : 815 modèles lus, 15 avec un tableau, **0** avec
un trou dans une cellule (génération + `tableHasBlanks`, 40 tirages par variation ; contre-mesure
textuelle sur les lignes `| … |` : 0 ; témoin positif : le modèle sonde est détecté). Les auteurs
ont suivi le contournement.

`question:specs` : 31 modèles de `variables-aleatoires-1spe/` et `probas-cond-1spe/` importables.

Point ouvert : Entrée dans une case MathLive ne fait rien et Entrée dans un trou texte valide la
question — dans un paragraphe comme dans un tableau. Le passage à la case suivante se fait par Tab
(ordre du DOM). « Entrée → case suivante » serait un changement de comportement pour TOUS les
trous : non fait, à trancher.
