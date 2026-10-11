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
- [x] Règle par l'exactitude : `formatNumber(numValue, ast)` dans `formatExact` ; 5 tests vus rouges.
- [x] Revue (2026-10-11) : `numberToLatexSafe` (`mathAST/common/numeric.ts`) dans les règles
      `custom` (`substitutedValue`, `substituteVariable`), les tirages (`variable-resolver.ts`),
      `composite-duration.ts` ; `evalResultToNumber` relit `10^{-7}` ; résultat non fini → erreur ;
      `;sci` sur grandeur / `;hms` / littéral ; `10^{-7} \times 2` à gauche ; L20 dans
      `ecarts-a-trier.md`. 20 tests vus rouges.
- [ ] PR
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

### Simplification (David, 2026-10-11) — remplace les points 4 et 5

Plus de dépendance au niveau, pas d'acheminement, pas de contrôle de publication. Raisons : le
nouveau programme repousse la notation scientifique en 3e (`docs/wip/arbre-notions/programmes-ecarts-cycle4.md`),
il fallait traverser ~30 appels pour faire arriver `template.grades`, et aucun modèle de prod n'est
concerné. Règle, sans modificateur : |x| < 10⁻⁶ → toujours développé ; |x| ≥ 10¹⁵ → toujours
notation scientifique ; entre les deux, inchangé. `;d` : développé, et au-delà de 10¹⁵ tous les
chiffres d'un entier EXACT (rationnel), notation scientifique sinon. `;sci` : toujours scientifique.

### Règle par l'exactitude (David, 2026-10-11) — remplace la règle simplifiée pour les grands

Jamais un chiffre faux. Un entier EXACT s'écrit toujours en entier, quelle que soit sa taille, avec
ou sans `;d` (`factorial(18)` → `6402373705728000`, `10^22` → 23 chiffres). Seul un résultat
APPROCHÉ ≥ 10¹⁵ passe en notation scientifique. `;sci` la force toujours. Petits : développés.

### État (2026-10-11)

- [x] 1, 2, 3, 6 : `;sci`, écriture sans notation JS (5a8252acd).
- [x] Règle simplifiée : option `scientificOutOfRange` retirée, `MAX_EXPANDED_MAGNITUDE` seule
      borne, entier exact sous `;d` (`exactIntegerWriting`). 6 tests vus rouges.
- [x] Règle par l'exactitude : `formatNumber(numValue, ast)` dans `formatExact` ; 5 tests vus rouges.
- [x] Revue (2026-10-11) : `numberToLatexSafe` (`mathAST/common/numeric.ts`) dans les règles
      `custom` (`substitutedValue`, `substituteVariable`), les tirages (`variable-resolver.ts`),
      `composite-duration.ts` ; `evalResultToNumber` relit `10^{-7}` ; résultat non fini → erreur ;
      `;sci` sur grandeur / `;hms` / littéral ; `10^{-7} \times 2` à gauche ; L20 dans
      `ecarts-a-trier.md`. 20 tests vus rouges.
- [ ] PR
