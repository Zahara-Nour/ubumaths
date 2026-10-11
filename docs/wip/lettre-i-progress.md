# La lettre `i` est l'unité imaginaire (progression)

Branche `fix/latex-lettre-i`, worktree `../ubumaths-wt-lettre-i`. Suite de #1061 (`e` constante d'Euler).

## Décision de David (2026-10-11)

- Les 4 parseurs (LaTeX et custom, pratt et rd) : la lettre `i` est l'unité imaginaire
  (`complex(0, 1)`), sauf dans un indice (`u_i`, `x_{i+1}`) ou suivie d'un indice (`i_1`).
  `toLatex` écrit toujours `\imaginaryI`.
- Nettoyage comme pour `e` : `unifyEulerNotationAST` prend le nœud complexe comme forme unique ;
  les tests de la lettre `i` (`complex-forms.ts`, `cosmetic-transforms.ts`) passent sur ce nœud.
- Calcul « par rapport à `i` » demandé par l'appelant : refus explicite (« i est l'unité
  imaginaire, pas une variable »), même mécanisme que `e` (`common/euler-variable.ts`).
- Ordre des facteurs : `i` se range comme π et `e`.

## Mesures (sonde du 2026-10-11)

- Suite serveur avec `i` → imaginaire hors indice (LaTeX pratt seul) : 14 échecs / 46 624, tous de
  notation dans `simplify/__tests__/unite-imaginaire.test.ts`.
- Prod : aucun modèle publié n'utilise `i` hors indice ; brouillons de complexes (T_EXP) l'écrivent
  déjà comme l'imaginaire. `\sum` / `\prod` ne sont pas lus par le parseur LaTeX (pas de piège d'indice
  de sommation).

## Fait

- [ ] Tests vus rouges
- [ ] Parseurs, nettoyage, refus
- [ ] Doc, code-reviewer, PR
