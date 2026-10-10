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

- [x] Arbitrages David appliqués : calcul « par rapport à e » refusé (`common/euler-variable.ts`, un test par module : `__tests__/e-pas-une-variable.test.ts`) ; `e_1` variable indicée dans les 4 parseurs (`parser/__tests__/e-indice.test.ts`) ; `factoriser` calcule `2×3` (gardé, testé) ; code mort atelier retiré (`withPlainEuler`, `\euler` de `render.ts`, `CUSTOM_EULER`).
- [x] L5 : débordement de pile converti en `SecurityError` aux 8 entrées (`guardStackDepth`, revue : `checkNestingDepth` retiré, il ne comptait que `( [ {` et refusait les unions `[0;1[`). C8 : commentaire de `rule-sets/index.ts`.
- [x] Revue : `e_1` n'est plus refusé (`refusesEulerVariable`), variable `E` protégée dans `toCustom` (`2E -3`), `{e}` mort retiré d'`evalResultToCustom`, primitive pédagogique `∫ e^{2x}` corrigée (`composite-exp-primitive.test.ts`).
- [x] L6 : mesure (0 occurrence dans `applyRules` sur la suite serveur) puis `RuleIterationLimitError` ; `solve` rattrape l'erreur (`factorCommon`). Relevé : cycle de `runPatternLoop` sur `x(1±1)` (L15).
- [x] Doc `docs/systeme/` (mathast/README, panel, pattern-matching, convention-equivalence, tidy-spec ; questions, atelier, atelier-syntaxe, grapheur) ; écarts traités retirés de `ecarts-a-trier.md`, V13 et L15 ajoutés.

## Reste

- [ ] code-reviewer, PR.

## PR suivante (décidée par David le 2026-10-10)

Désactiver la notation scientifique dans le parseur LaTeX (`3e-2` lu 0,03 au lieu de 3e − 2) ; la garder en syntaxe custom (`1e5`).
Préalable mesuré : des nœuds `number(String(<float>))` peuvent porter `1e-7` / `1e+21` (`grapheur/exact.ts:112`,
`analysis/periodicity.ts:461`, `solve/constant-base-exponential.ts:65`) et `toLatex` les écrit tels quels → à corriger dans
la même PR (`toLatex` doit écrire `10^{-7}`, jamais `1e-7`).
