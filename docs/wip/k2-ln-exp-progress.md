# K2 — règles ln/exp et garde-fous du moteur (progression)

Branche `fix/mathast-ln-exp-gardes`, worktree `../ubumaths-wt-ln-exp`. Écarts : V7, L5, L6, C8 de `docs/wip/ecarts-a-trier.md`.

## Décisions de David (2026-10-10)

- La lettre `e` est **toujours** la constante d'Euler, dans le parseur LaTeX comme dans le parseur custom (qui le faisait déjà). Il n'y a pas de « variable e » : le commentaire de `solve/promote-euler.ts` (charge élémentaire) n'a jamais été voulu.
- `toLatex(euler())` reste `\exponentialE` (relu par le parseur et par MathLive).
- `i` : hors périmètre, chantier à part.
- Nettoyer le code autour de la constante d'Euler (contournements « euler OU lettre e »).

## Fait

- [x] V7 : parseur LaTeX `e` → `euler()` ; tests `ln-exp-lettre-e.test.ts` (23/30 rouges avant, 30/30 après).
- [x] Nettoyage des contournements (`promote-euler.ts` supprimé, `isEulerBase` & co ramenés à `isEulerConstant`, `unifyEulerNotationAST` inversée, custom-generator écrit `e`).
- [x] Régressions : `ex=1` → `1/e`, `x^2=e` → `±√e`, `∫_1^e 1/x dx = 1`, ordre `e a` comme `π a`.

## Reste

- [ ] Arbitrages David : calcul « par rapport à e » imposé par l'appelant ; `e_1` ; `factoriser` calcule `2×3` ; code mort atelier.
- [ ] L5 (profondeur du parseur avant analyse), L6 (limite d'`applyRules`), C8 (commentaire `rule-sets/index.ts`).
- [ ] Doc `docs/systeme/mathast/` (README, panel, pattern-matching) ; retirer les écarts traités de `ecarts-a-trier.md`.
- [ ] code-reviewer, PR.
