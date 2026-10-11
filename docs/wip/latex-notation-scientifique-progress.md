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

## Décisions de David (2026-10-11) — `{{eval:…}}` sans notation JS

1. Plus jamais de notation JS (`3e-7`, `1e+22`, `1.2089258196146292e+24`) dans une chaîne produite
   par `{{eval:…}}`, avec ou sans modificateur.
2. `;d` garantit l'écriture décimale DÉVELOPPÉE (`0{,}0000003`), jamais de notation scientifique.
3. `;sci` (nouveau) : toujours la notation scientifique `3 \times 10^{-7}`, `3{,}2 \times 10^{5}`
   (mantisse 1 ≤ |m| < 10 ; mantisse 1 → `10^{-7}`).
4. Sans modificateur (valeurs qui sortent déjà en décimal ; une fraction exacte reste une fraction) :
   décimal développé si 10⁻⁶ ≤ |x| ; tous les chiffres d'un entier tant que |x| < 10¹⁵. Hors bornes :
   notation scientifique si le MODÈLE est de 4e ou plus (toutes ses `grades` ≥ 4e), sinon décimal
   développé. Le niveau = `template.grades`, pas l'élève connecté.
5. checkTemplate (50 tirages) : modèle dont toutes les grades < 4e et dont un tirage produit, sans
   `;sci`, un nombre hors bornes (< 10⁻⁶ ou entier ≥ 10¹⁵) → refusé, message clair en français.
6. Pas de détection de « puissance simple » (1 000 000 reste 1 000 000).

### État (2026-10-11)

- [x] 1, 2, 3, 6 + bornes de 4 : `evaluateAstWithModifiers(…, { scientificOutOfRange })`,
      `;sci` (`EvalModifiers.scientific`), constantes `MIN_EXPANDED_MAGNITUDE` / `MAX_EXPANDED_MAGNITUDE`.
      21 tests vus rouges. Résultat littéral (`toCustom`) qui porterait `1e-7` → `toLatex`.
- [ ] Niveau du modèle jusqu'au formatage : ARRÊTÉ avant de coder (≈ 30 appels à traverser),
      chemin à trancher. Défaut actuel : hors bornes → développé (comportement « petits »).
- [ ] 5 (checkTemplate) : dépend du chemin retenu.
- Référence trouvée : programme 2016 = notation scientifique en 4e ; nouveau programme de cycle 4
  = repoussée en 3e (`docs/wip/arbre-notions/programmes-ecarts-cycle4.md`, `seed-cycle4.md` 3-006).
