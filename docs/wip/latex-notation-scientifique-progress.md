# LaTeX sans notation scientifique (progression)

Branche `fix/latex-sans-notation-scientifique`, worktree `../ubumaths-wt-sci`. Suite de K2 (#1061).

## Décision de David (2026-10-10)

La lettre `e` est la constante d'Euler : en LaTeX, `3e-2` se lit 3e − 2, plus 0,03. La notation
scientifique reste en syntaxe custom (`1e5`).

## Comportements validés par David (2026-10-11)

- `parseLatex('3e-2')` = 3e − 2 ; `parseLatex('2e3')` = 2·e·3 ; `parseLatex('1.5e-3x')` = 1,5e − 3x.
- Inchangé : syntaxe custom `1e5` = 100 000 ; `3\times10^{-2}` = 0,03.
- `toLatex` d'un nombre `1e-7` / `1e+21` écrit `10^{-7}` / `10^{21}` (jamais `1e-7`) et se relit à
  l'identique. Producteurs relevés : `grapheur/exact.ts:112`, `mathAST/analysis/periodicity.ts:461`,
  `solve/constant-base-exponential.ts:65`.

## Fait

- [x] Tests vus rouges (2026-10-11) : 20 — 12 parseur (pratt + rd), 7 `toLatex`, 1 période
      (`sin(1e-7*x)`). `exact.ts` était déjà juste (le premier terme est évalué en fraction).
- [x] Tokenizer LaTeX (bloc exposant retiré, 29 tests du tokenizer qui enregistraient l'ancienne
      lecture réécrits) ; `toLatex` réécrit `1e-7` en `10^{-7}` avant rendu.
- [x] Doc : `docs/systeme/mathast/README.md` (invariant 6).
- [ ] code-reviewer, PR
- `2e3` : refusé comme `2e 3` (« nombre écrit après un facteur »), pas 2·e·3 — aligné.
- Régressions relevées par le coordinateur, corrigées : `\pi \cdot 3e-7` implicite et
  `\pi / 2.5e-8` en ligne → parenthèses posées par la passe (table contextes × valeurs, 5 rouges).
- Hors périmètre, relevé : le parseur rd ne connaît pas `\exponentialE`.
- ⚠️ OUVERT : `{{eval:…}}` rend `1e-7` / `1e+22` (`formatNumber` de
  `eval/evaluate-with-modifiers.ts`) ; `areEquivalent('1e-7', '10^{-7}')` = false désormais.
