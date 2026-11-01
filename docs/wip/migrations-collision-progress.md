# Chantier « migrations-collision » — garde des horodatages de migration

## Reprendre ici

_Mis à jour le 2026-11-01, PR #2165 ouverte (CI relancée après le merge de origin/main, en attente de runner)._

- **État** : A + B + C écrits (garde `pnpm check:migrations`, `pnpm migration:horodatage`, porte de la CI et PR de contenu allégée dans `quality.yml`), deux revues `code-reviewer` corrigées, `git-workflow.md` relu. Règle d'horodatage en une ligne dans `CLAUDE.md`, pourquoi dans `claude-md-pourquoi.md`. Commits réécrits sans trailer. Les 17 sessions actives prévenues des nouvelles règles.
- **Prochaine action** : `gh pr checks 2165` ; c'est le premier run du nouveau workflow : vérifier que « Commit de version ? » passe, puis que tous les jobs tournent (PR non « contenu ») → merge → `git merge origin/main` dans les worktrees qui en ont besoin.
- **En attente de David** : rien.
- **Après le merge** : réécrire la mémoire `reference_horodatage-migration-collision.md` (elle conseille encore « max + 1 min » : proposition 9 du ménage validée), puis archiver ce journal.
- **Pièges en cours** : un check exigé « skipped » vaut réussi, seul CI Summary porte la porte ; en CI, la garde refuse si `origin/main` est injoignable.
- **Worktree / branche** : `../ubumaths-wt-migrations-collision`, `fix/migrations-collision`.

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
