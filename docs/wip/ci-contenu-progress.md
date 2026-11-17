# Chantier « ci-contenu » — CI allégée pour les PR de contenu seul

## Reprendre ici

_Mis à jour le 2026-11-02, après #2250._

- **État** : #2250 mergée (tests client et ESLint sautés sur une PR de contenu, tests serveur ciblés au
  shard 1 par `scripts/ci-tests-contenu.sh`, `.js` compris). CI complète verte sur la PR elle-même.
- **Prochaine action** : sur la **première PR de contenu** après #2250, ouvrir son run « Code Quality » et
  vérifier : shard 1 « portée contenu » avec les tests listés, shards 2-4 « portée rien », tests client
  « skipped », ESLint sauté, CI Summary vert. Puis archiver ce journal (verser le durable : déjà dans
  `docs/pratiques/environnement-de-dev.md`).
- **En attente de David** : rien.
- **Pièges en cours** : un test qui lit les modèles sans écrire `scripts/questions` en clair échappe au tri.
- **Worktree / branche** : aucun (retiré après le merge).

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
