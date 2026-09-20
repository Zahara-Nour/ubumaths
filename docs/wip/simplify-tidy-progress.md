# `simplify` recâblé sur `tidy` — progression (PR 2 de 3)

> Spécification : [tidy-phase0.md](tidy-phase0.md) §B et §C (validée le 2026-09-20).
> Worktree `../ubumaths-wt-simplify-tidy`, branche `feat/simplify-tidy`.
> PR 1 (`tidy` seul) : mergée, #378. PR 3 (grandeurs) : après celle-ci.

## Le câblage visé (§B)

Une itération du moteur de réécriture (`common/rewriting-engine.ts`) :

1. `preProcess` = `tidy` (à la place de `normalizePass`) ;
2. règles de motif, sur la forme `tidy` ;
3. `postProcess` = `tidy`, puis **« développer seulement si moins cher »** : le
   candidat `tidy(normalizePass(n))` remplace `tidy(n)` si son coût est
   inférieur — sans le biais de 1,2 de `cheapest`, qui reste réservé aux
   règles. C'est la seule place où `normalize` intervient encore.

Deux ajustements mesurés en cours de route, **à valider par David** :

- **Le moteur démarre sur `tidy(entrée)`**, pas sur l'entrée brute. Sa barrière
  de coût compare au meilleur candidat connu ; sans cela `x+x` (5) → `2x` (9)
  et `√8` (6) → `2√2` (14) étaient rejetés avant même les règles — le §3 du
  relevé, rejoué. « Regrouper toujours » se traduit ainsi.
- **À coût égal, le candidat développé gagne s'il n'a pas plus de termes.** Le
  « strictement inférieur » de la phase 0 faisait perdre les identités que
  seule `normalize` connaît et qui ne changent pas le coût : `sin(x+π) → −sin(x)`
  (15 contre 15). Avec ce départage, l'identité passe et le développement
  `2(x+1) → 2x+2` (13 contre 13) ne passe pas.

`foldCoefficients` en sortie du moteur disparaît : `tidy` replie déjà. En cas
d'interruption, `simplify` rend le nœud d'origine ; le délai est vérifié
coopérativement après le candidat développé, là où le temps se passe désormais.

## Tests

- `simplify/__tests__/panel.test.ts` : le panel §C, 56 cas, écrits avant le
  recâblage. Rouges avant : 9 (`x+x`, `√8`, `1/√2`, `5(x+1)²`, `(x+1)³`, les
  `×` explicites, `x/(2y)`).
- Les 7 fichiers de tests existants de `simplify/` doivent rester verts, ainsi
  que `normal/`, `pattern/`, `pedagogical-simplify/`, `grapheur/` (appelant
  `simplifyExact`) et la commande `.simplify` du REPL.

## Attentes d'anciens tests mises à jour (l'affichage d'avant, pas un comportement)

- `coefficients-factorises.test.ts` : `6 \times (x+1)^2` → `6(x+1)^2` (× implicite, panel §C) et l'ordre canonique `6x(x²+1)²`.
- `releve-bugs.test.ts` : `x/{2y}` → `x/(2y)`.
- `cost-portage-ce.test.ts` : le barème injectable n'arbitre plus la mise au propre (`x·x` s'écrit `x²` par construction) ; le test montre qu'il arbitre le développement (`(x+1)²` développé sous un barème qui déteste les puissances de sommes).

## Revue de code (Opus) — 7 findings, tous traités ou tranchés

- **F1, bloquant, affichage** : `tidy` posait un `delimiter` autour d'un numérateur ou dénominateur composite — juste en linéaire (`x/(2y)`), faux en LaTeX (`\dfrac{\left( x+1 \right)}{2}`), et c'est le LaTeX que lit l'élève (`CurveHover`, `SpecialPoints`). Aucun test ne regardait le LaTeX. Corrigé dans `tidy/build.ts` (plus de délimiteur de part et d'autre d'une barre, convention de l'AST : `toCustom` pose des accolades, `x/{2y}`), et **une colonne LaTeX ajoutée au panel** (8 cas).
- **F2, interruption** : le `checkAbort` posé après le candidat jetait un résultat déjà calculé. Retiré ; à la place, le moteur (`rewriting-engine.ts`) vérifie le délai **après le post-traitement**, comme il le fait après les deux autres phases.
- **F4, recorder** : les descriptions `tidy`/`post-tidy` étaient dans une table que personne ne lit ; posées dans celle de `getSimplifyRuleDescription`. L'étape initiale `tidy(entrée)` n'est plus enregistrée quand rien ne change (`nodesEqual`, pas la référence).
- **F5** : à l'abandon, `simplify` rend le **meilleur-jusqu'ici**, et le nœud d'origine seulement si le moteur en est resté à la forme de départ.
- **F7** : JSDoc de `normalizePass` mis à jour ; `SimplifyPhase` ne garde que les phases que `simplify` émet.
- **F3, à trancher par David** : `tidy(entrée)` tourne hors du budget d'interruption (`tidy` n'a pas de point de contrôle coopératif). Mesuré : 3,7 ms sur une somme de 80 termes. Linéaire, sans développement — laissé tel quel.
- **F6, renvoyé à la PR 3** : `3[km]+2000[m]` est réordonné sans être regroupé (`2000 m + 3 km`) ; la conversion des grandeurs le réglera.
- **Hors périmètre, à décider** : `simplify/fold-coefficients.ts` n'a plus d'appelant.

## État

- [x] Tests rouges prouvés (commit `9edac252c`, 9 rouges sur 56)
- [x] Recâblage (`simplify.ts`, `types.ts`, `descriptions-fr.ts`)
- [x] Suites vertes : `simplify/` 8 fichiers ; `normal`, `pattern`, `pedagogical-simplify`, `tidy`, `mathAST/__tests__`, `grapheur` (appelant `simplifyExact`), `cli` (commande `.simplify`) : 123 fichiers, 5 790 tests
- [x] Revue (Opus) : F1 à F7, cf. ci-dessus
- [x] `pnpm check:incremental` = 0 erreur, `pnpm lint:fast`
- [x] PR, CI verte, merge, worktree supprimé — PR #379 mergée le 2026-09-20
