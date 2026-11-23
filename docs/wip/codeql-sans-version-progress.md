# Chantier `codeql-sans-version` — journal

## Reprendre ici

_Mis à jour le 2026-11-24, après #3060._

- **État** : #3060 mergée, pas encore exercée par une mise en prod · **Prochaine action** : à la prochaine mise en prod, vérifier sur GitHub que « CodeQL / Analyze » est « skipped » sur le commit `chore(release)`, puis archiver ce journal · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : retirés

## Demande (2026-11-24)

David : « c'est CodeQL qui prend beaucoup de temps ». Mesure : 12 à 18 min par passage sur les 13
derniers ; non bloquant (ni merge ni mise en prod ne l'attendent), mais il tournait deux fois par
mise en prod (merge, puis commit de version qui ne change que `package.json` et le CHANGELOG).
Décision de David : ne plus le lancer sur les commits `chore(release)`.

## Fait

- `.github/workflows/codeql.yml` : `if` au niveau du job (le cron du lundi n'a pas de
  `head_commit` et tourne toujours).
- Doc : `docs/pratiques/environnement-de-dev.md` (tableau des workflows et historique).
