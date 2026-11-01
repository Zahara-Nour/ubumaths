# Chantier « migrations-collision » — garde des horodatages de migration

## Reprendre ici

_Mis à jour le 2026-11-01, PR ouverte après le merge de #2154._

- **État** : A + B + C écrits, revus deux fois (`code-reviewer`, findings corrigés), `git-workflow.md` mis à jour et relu. · **Prochaine action** : CI verte → merge → archiver ce journal. · **En attente de David** : les commits f665090cd, 3712d9c3e, 408449ab2 portent un trailer `Claude-Session:` interdit par `CLAUDE.md` : réécrire (push forcé, liste `ask`) ou laisser. · **Pièges en cours** : la porte de la CI est dans le job « Commit de version ? » ; une PR de contenu seul saute 5 jobs. · **Worktree / branche** : `../ubumaths-wt-migrations-collision`, `fix/migrations-collision`.

## Pourquoi

Le 2026-11-01, `20261101215000` a été pris par les lots 1re spé suites (#2140) et 4e lot 8 : la CI du lot 8 a
tourné sur un main qui n'avait pas encore l'autre migration (protection de `main` sans « branche à jour »),
la PR a été mergée verte, et la garde SECURITY DEFINER a échoué sur toutes les PR (correctif #2154).
Décision de David (2026-11-01) : A (horodatage = heure réelle) + B (garde au push et avant le merge) ;
C demandé ensuite par David (2026-11-01) : porte de la CI dans le job « Commit de version ? »
(horodatages d'abord, jobs lourds sautés s'ils échouent) et PR de contenu seul allégée
(`scripts/ci-nature-changement.sh`).

Revue (`code-reviewer`) : conflit « heure réelle » / garde quand main porte des horodatages ronds dans
le futur → `pnpm migration:horodatage` (heure UTC ou dernière + 1 s) ; exception du pre-push documentée.
