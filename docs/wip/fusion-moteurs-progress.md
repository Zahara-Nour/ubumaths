# Chantier `fusion-moteurs` — finir la fusion `simplify` / `pedagogical-simplify`

## Reprendre ici

_Mis à jour le 2026-10-27, ouverture du chantier (rien codé)._

- **État** : worktree et journal créés ; phase 0 à faire.
- **Prochaine action** : phase 0 — (1) relever qui appelle encore `simplify()` (repli de l'Atelier `atelier/calcul.ts`, REPL `simplify.command.ts`, Taylor `taylor/expand.ts`, et tout autre appelant hors tests) ; (2) relever les entrées qui tombent dans le repli de l'Atelier (`.simplifier` sans étape de `pedagogical-simplify`), sur le panel et les cas réels ; (3) poser à David la question du repli (ci-dessous) ; (4) proposer l'ordre des lots ; **attendre la validation de David avant de coder**.
- **En attente de David** : la question du repli, après le relevé.
- **Pièges** : relire AVANT toute proposition l'ADR 0007 (un moteur, quatre intentions), l'ADR 0032, `docs/systeme/mathast/tidy-spec.md` §B-§C et `panel-simplifications.md` ; la mémoire `fusion-simplify-pedagogical` (2026-09-21) est en partie périmée — `reduire`, `auto` et `developper` ne passent plus par `normalize` : vérifier dans le code. Ne pas re-proposer de supprimer `auto`.
- **Worktree / branche** : `../ubumaths-wt-fusion-moteurs`, `refactor/fusion-moteurs`.

## Contexte

Décision de David du 2026-10-27 : « finir la fusion », futur chantier noté dans `docs/systeme/mathast/README.md`, Points ouverts, « Fusion des deux moteurs ».

- Fait : `reduire` et `auto` ne passent plus par `normalize` (2026-10-23), `developper` non plus (2026-10-25, normalize-usages) ; tous les `denormalize(normalize(…))` en ligne passent par `canonicalForm`, garde ESLint (canonical-form, #1871).
- Reste : `simplify()` sert encore au repli de l'Atelier (sans étape de `pedagogical-simplify`, `.simplifier` montre la sortie de `simplify()`, calculée en silence — `cos(π/3)/x → 1/(2x)` passait par là avant valeurs-remarquables), à la commande `simplify` du REPL et à Taylor. Les 3 écarts du panel sont tous en faveur d'`auto` : ils ne bloquent rien.
- **Question à trancher par David, après le relevé** : sans étape, l'Atelier garde-t-il l'expression telle quelle (« ce qu'on ne sait pas expliquer, on ne le fait pas », ADR 0007) ou montre-t-il le résultat sans étape, comme aujourd'hui ?
- Restes voisins, hors chantier sauf décision contraire : `tidy` dans `evaluate` (option B), conventions d'échec des évaluateurs, `pnpm math` à brancher sur l'Atelier (même section des Points ouverts).

## Historique

- 2026-10-27 : chantier ouvert depuis la session canonical-form, worktree créé depuis `origin/main` (`845076f1c`).
