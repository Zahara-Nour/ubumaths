# `simplify` recâblé sur `tidy` — progression (PR 2 de 3)

> Spécification : [tidy-phase0.md](tidy-phase0.md) §B et §C (validée le 2026-09-20).
> Worktree `../ubumaths-wt-simplify-tidy`, branche `feat/simplify-tidy`.
> PR 1 (`tidy` seul) : mergée, #378. PR 3 (grandeurs) : après celle-ci.

## Le câblage visé (§B)

Une itération du moteur de réécriture (`common/rewriting-engine.ts`) :

1. `preProcess` = `tidy` (à la place de `normalizePass`) ;
2. règles de motif, sur la forme `tidy` ;
3. `postProcess` = `tidy`, puis **« développer seulement si moins cher »** : le
   candidat `tidy(normalizePass(n))` ne remplace `tidy(n)` que si son coût est
   **strictement** inférieur — sans le biais de 1,2 de `cheapest`, qui reste
   réservé aux règles. C'est la seule place où `normalize` intervient encore.

`foldCoefficients` en sortie du moteur disparaît : `tidy` replie déjà.

## Tests

- `simplify/__tests__/panel.test.ts` : le panel §C, 56 cas, écrits avant le
  recâblage. Rouges avant : 9 (`x+x`, `√8`, `1/√2`, `5(x+1)²`, `(x+1)³`, les
  `×` explicites, `x/(2y)`).
- Les 7 fichiers de tests existants de `simplify/` doivent rester verts, ainsi
  que `normal/`, `pattern/`, `pedagogical-simplify/`, `grapheur/` (appelant
  `simplifyExact`) et la commande `.simplify` du REPL.

## État

- [ ] Tests rouges prouvés (commit 1)
- [ ] Recâblage
- [ ] Suites vertes, mesure avant/après sur les deux appelants
- [ ] `pnpm check:incremental` = 0 erreur, `pnpm lint:fast`
- [ ] PR, CI verte, merge, worktree supprimé
