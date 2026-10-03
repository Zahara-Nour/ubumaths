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

- [x] 1 · [x] 2 · [x] 3 · [x] 4 · [ ] 5 · [ ] 6

Tests : `FillBlanksInput-tableau.svelte.test.ts` 9 rouges → 10 verts ; `fill-blanks-table.test.ts`
8 rouges → verts. Non-régression : client 40 fichiers / 359 tests, serveur 105 / 3984 verts.
375 px : le tableau défile dans son cadre (`relative` sur le cadre : sinon le libellé
absolu de MathLive faisait déborder la page à 415 px), bouton de menu MathLive masqué en cellule.
