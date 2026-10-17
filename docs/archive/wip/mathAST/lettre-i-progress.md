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

- [x] Tests vus rouges (2026-10-11) : 57 échecs / 145 sur le code de HEAD (copie restaurée par
      `git show HEAD:…`) — parseurs 19, équivalence/écriture/ordre 11, refus 13, notation de
      `simplify/__tests__/unite-imaginaire.test.ts` 14 ; `complex-forms-lettre-i.test.ts` vert avant
      comme après (garde de non-régression).
- [x] Parseurs, nettoyage, refus : `subscriptDepth` dans les deux parseurs LaTeX, `i_1` variable
      dans les quatre ; `common/reserved-letters.ts` (`reservedVariableRefusal`,
      `reservedLetterMessage`, `IMAGINARY_NOT_A_VARIABLE`), `euler-variable.ts` garde son API ;
      `imaginaryUnit()` / `isImaginaryUnit` ; `toCustom` écrit `i` ; `tidy` range `i` sous la
      clé `\i` (après `e`, devant `π`) ; contournements retirés (normalize, evaluate, taylor,
      euler-formula, cosmetic-transforms, complex-forms, complex-finite-set).
- [x] Doc : mathast/README (invariant 6, écarts connus), convention-equivalence, tidy-spec,
      questions, atelier-syntaxe.
- [ ] code-reviewer, PR

## Écarts relevés, non corrigés

- Le parseur LaTeX rd ne lit ni `\imaginaryI` ni `\exponentialE` (avant comme après).
- Filtres de noms `e`/`i` sur `getVariables` gardés comme pour `e` (#1061) : `atelier/solve-steps.ts`,
  `questions/calculus/calculus-reading.ts`, `CONSTANT_NAMES` de `cli/core/variable-argument.ts` ;
  ils ne visent plus que `e_1`, `i_1`, `u_i`.
- `complex-finite-set.ts` admet encore la variable `e` (base de `e_1`) comme lettre constante.
