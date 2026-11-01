# Chantier « migrations-collision » — garde des horodatages de migration

## Reprendre ici

_Mis à jour le 2026-11-01, PR ouverte._

- **État** : garde `pnpm check:migrations` (`scripts/garde-migrations-horodatage.sh`) au pre-push et en `--pr <n>` avant `gh pr merge` ; règle « horodatage = heure réelle » dans `CLAUDE.md` et la doc. · **Prochaine action** : CI verte, merge, archiver ce journal. · **En attente de David** : rien. · **Pièges en cours** : main cassée par `20261101215000` en double tant que #2154 n'est pas mergée. · **Worktree / branche** : `../ubumaths-wt-migrations-collision`, `fix/migrations-collision`.

## Pourquoi

Le 2026-11-01, `20261101215000` a été pris par les lots 1re spé suites (#2140) et 4e lot 8 : la CI du lot 8 a
tourné sur un main qui n'avait pas encore l'autre migration (protection de `main` sans « branche à jour »),
la PR a été mergée verte, et la garde SECURITY DEFINER a échoué sur toutes les PR (correctif #2154).
Décision de David (2026-11-01) : A (horodatage = heure réelle) + B (garde au push et avant le merge) ;
C (CI allégée, garde des migrations en premier) reste à décider.
