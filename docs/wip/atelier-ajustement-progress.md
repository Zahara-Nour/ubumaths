# Atelier : `.ajustement` complété (manche 15, PR c) — progression

Décisions Q173-Q177. Spec validée par David le 2026-10-04.

- Commande `.ajustement` / `.linreg` (`src/lib/mathAST/cli/web/web-repl-engine.ts`) ET action
  « Ajuster » de la carte (`src/lib/atelier/desk.svelte.ts` `#fit`) : r au lieu de R² ; point
  moyen G ; calcul par `statistics/bivariate.ts` (exact) / `variable-change.ts`, arrondi au
  millième, mêmes textes que le bloc ```nuage.
- `.ajustement X : Y ; x = 10 ; y = 7` : prévisions + interpolation / extrapolation.
- `.ajustement X : Y ; z = ln(y)` (8 formes) : z = ax + b + relation, PAR ÉCRIT. Q176 révisée
  par David le 2026-10-04 : la carte ne crée PAS la fonction de la relation (aucun moyen d'y
  choisir un changement de variable ; la commande ne crée pas d'objet). Le bloc ```nuage trace
  déjà la courbe dans les fiches. Menu « Ajuster avec… » sur la carte : plus tard, sur besoin.
- Golden `statistics-commands.golden.json` mis à jour : diff ligne par ligne justifié.

## Étapes

- [x] Tests rouges · [x] Implémentation · [x] Revue Opus (même arrondi tracé / affiché, 100 points, insécable échappée) · [ ] PR, CI, merge
