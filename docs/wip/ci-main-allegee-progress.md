# Chantier « ci-main-allegee » — CI allégée sur main après merge

## Reprendre ici

_Mis à jour le 2026-11-01, avant la PR._

- **État** : `quality.yml` — sur un push de main (hors `chore(release)`), seuls Porte, Type Check et Build tournent ; la CI complète passe sur le commit de version de `deploy:prod`. Raccourci `ci-version-seule.sh` retiré (il sautait justement cette CI complète). Job « Commit de version ? » renommé « Porte de la CI ».
- **Prochaine action** : PR empilée sur #2165 (branche partie de `fix/migrations-collision`) ; après le merge de #2165, `git merge origin/main`, CI, merge, puis « go » aux sessions en pause.
- **En attente de David** : rien (recos suivies le 2026-11-01).
- **Pièges en cours** : le premier push de main après le merge sera le premier run allégé : vérifier que CI Summary est vert avec 6 jobs sautés.
- **Worktree / branche** : `../ubumaths-wt-ci-main-allegee`, `ci/main-allegee`.

## Pourquoi

Le 2026-11-01 : 89 merges sur main, chacun relançant ~15 jobs ; le dépôt (public, compte personnel) a 20 jobs simultanés au plus. Main occupait les trois quarts des runners, les PR attendaient.
