# Chantier « ci-contenu » — CI allégée pour les PR de contenu seul

## Reprendre ici

_Mis à jour le 2026-11-02, PR ouverte._

- **État** : `quality.yml` modifié (tests client sautés, ESLint sauté, tests serveur réduits au shard 1 avec
  `scripts/ci-tests-contenu.sh`) ; test du script vert ; doc à jour ; PR ouverte.
- **Prochaine action** : CI verte → merge ; puis vérifier sur la **première PR de contenu** après le merge
  que le shard 1 lance les 8 tests listés, que les shards 2-4 font « portée rien », que les tests client
  sont « skipped » et que CI Summary est vert.
- **En attente de David** : rien.
- **Pièges en cours** : cette PR n'est pas du contenu (elle touche `.github/` et `scripts/*.sh`) : sa CI
  est complète et ne prouve pas le chemin « contenu ».
- **Worktree / branche** : `../ubumaths-wt-ci-contenu`, `ci/ci-contenu-allegee`.

---

## Contexte (2026-11-02)

David a demandé pourquoi la CI de #2245 (5 modèles JSON + doc) prenait si longtemps, puis d'étudier la piste
d'économie, puis « oui ».

Mesures sur le run de #2245 : ~2 min 30 d'attente d'un runner (8 runs en parallèle), puis Lint 3 min (ESLint
30 s, couverture de doc 76 s, Prettier 32 s), tests serveur 3 à 5 min par shard, tests client ~5 min par
shard. 69 PR de contenu seul sur 179 mergées depuis le 2026-11-01.

## Pourquoi c'est sûr

- Projet vitest `client` = `src/**/*.svelte.test.*` ; aucun ne lit `scripts/questions` ni `docs/`.
  Les tests client ne sont pas des checks exigés par la protection de `main` (API, 2026-11-02 :
  Lint, Type Check, Build, Server Tests 1-4, CI Summary).
- Tests serveur qui lisent `scripts/questions` : trouvés par `git grep` sur le chemin (7 fichiers +
  le test du script). Aucun code non testé de `src/` n'écrit ce chemin. Les autres tests qui parcourent
  des dossiers lisent `src/` seulement. En local : 205 tests, 27 s.
- Filet : le commit de version de `deploy:prod` passe la CI complète.
