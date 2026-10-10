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

- [ ] Tests vus rouges
- [ ] Tokenizer LaTeX, `toLatex`
- [ ] Doc, code-reviewer, PR
