# Chantier `tidy` — journal

## Reprendre ici

_Mis à jour le 2026-10-20, avant la PR._

- **État** : `tidy` rend irréductible une fraction de sommes (`(6x+3)/9 → (2x+1)/3`, `(x/2+1)/3 → (x+2)/6`, `(6x−3)/(−9) → (1−2x)/3`) ; spec `docs/systeme/mathast/tidy-spec.md` réécrite d'après le code (§A.1, §A.2, §G).
- **Prochaine action** : PR `feat/tidy-fractions`, revue `code-reviewer` (opus), CI, merge.
- **En attente de David** : rien.
- **Pièges en cours** : `(3i−2)/(−1)` donne maintenant `2−3i` (avant `−(3i−2)`), test de `tidy-sum-lead.test.ts` mis à jour.
- **À faire ensuite** : vérifier le grapheur — `simplify` fait `(x²−1)/(x+1) → x−1` sans garder la valeur interdite −1 (`simplifyExact`) ; la courbe perd-elle son trou ?
- **Worktree / branche** : `../ubumaths-wt-tidy` · `feat/tidy-fractions`.

## Historique

- 2026-10-20 : inventaire de `tidy` (fait / ne fait pas), constat : la validation passe par `checkForm`, jamais par `tidy`. Décisions de David : `(2x+1)/3` (une seule barre), `(1−2x)/3` pour le signe, `(x+2)/6` pour les fractions internes, tableau d'exemples validé.
