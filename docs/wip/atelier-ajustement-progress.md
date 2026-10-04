# Atelier : `.ajustement` complété (manche 15, PR c) — progression

Décisions Q173-Q177. Spec validée par David le 2026-10-04.

- Commande `.ajustement` / `.linreg` (`src/lib/mathAST/cli/web/web-repl-engine.ts`) ET action
  « Ajuster » de la carte (`src/lib/atelier/desk.svelte.ts` `#fit`) : r au lieu de R² ; point
  moyen G ; calcul par `statistics/bivariate.ts` (exact) / `variable-change.ts`, arrondi au
  millième, mêmes textes que le bloc ```nuage.
- `.ajustement X : Y ; x = 10 ; y = 7` : prévisions + interpolation / extrapolation.
- `.ajustement X : Y ; z = ln(y)` (8 formes) : z = ax + b + relation ; la carte crée la
  fonction de la relation.
- Golden `statistics-commands.golden.json` mis à jour : diff ligne par ligne justifié.

## Étapes

- [ ] Tests rouges · [ ] Implémentation · [ ] Revue · [ ] PR, CI, merge
