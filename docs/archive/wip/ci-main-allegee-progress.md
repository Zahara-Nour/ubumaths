# Chantier « ci-main-allegee » — CI allégée sur main après merge

## Reprendre ici

_Mis à jour le 2026-11-01, après #2167. Chantier clos, journal archivé._

- **État** : #2167 mergée. Sur un push de main (hors `chore(release)`), seuls Porte de la CI, Type Check et Build tournent ; la CI complète passe sur le commit de version de `deploy:prod`. `ci-version-seule.sh` retiré, job « Commit de version ? » renommé « Porte de la CI ».
- **Conséquence** : chaque `deploy:prod` prend ~10 min de plus (CI complète de la version).

## Pourquoi

Le 2026-11-01 : 89 merges sur main, chacun relançant ~15 jobs ; le dépôt (public, compte personnel) a 20 jobs simultanés au plus. Main occupait les trois quarts des runners, les PR attendaient.
