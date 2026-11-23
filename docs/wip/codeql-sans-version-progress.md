# Chantier `codeql-sans-version` — journal

## Reprendre ici

_Mis à jour le 2026-11-24, avant l'ouverture de la PR._

- **État** : changement fait sur la branche ; PR à ouvrir · **Prochaine action** : PR, CI, merge ; à la prochaine mise en prod, vérifier que CodeQL est « skipped » sur le commit de version, puis archiver · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-codeql-sans-version` / `ci/codeql-sans-version`

## Demande (2026-11-24)

David : « c'est CodeQL qui prend beaucoup de temps ». Mesure : 12 à 18 min par passage sur les 13
derniers ; non bloquant (ni merge ni mise en prod ne l'attendent), mais il tournait deux fois par
mise en prod (merge, puis commit de version qui ne change que `package.json` et le CHANGELOG).
Décision de David : ne plus le lancer sur les commits `chore(release)`.

## Fait

- `.github/workflows/codeql.yml` : `if` au niveau du job (le cron du lundi n'a pas de
  `head_commit` et tourne toujours).
- Doc : `docs/pratiques/environnement-de-dev.md` (tableau des workflows et historique).
