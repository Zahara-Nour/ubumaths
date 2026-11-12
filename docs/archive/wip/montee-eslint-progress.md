# montee-eslint — paquets de la config ESLint

Piste du chantier [amelioration](amelioration-progress.md).

## Reprendre ici

_Mis à jour le 2026-11-12, après #2584 — chantier clos, journal archivé._

- **État** : clos, #2584 mergée (typescript-eslint ^8.72.1 sans épingle, eslint-plugin-svelte ^3.24.1, globals ^17.14.0, job Lint à 60 min) · **Prochaine action** : aucune · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : retirés

## Journal

- 2026-11-12 : faux positif `$bindable` (sveltejs/eslint-plugin-svelte#1607, corrigé dans svelte-eslint-parser 1.10) vérifié absent : `npx eslint` sur MathField et LockedPythonEditor = 0 erreur. UnifiedInput et ExerciseMarkdownEditor n'existent plus.
- 2026-11-12 : 1er Lint CI à froid en 28 min 28 s, 1 erreur nouvelle (`svelte/no-unused-props` : `stats.period` jamais lu dans `MarketplaceStats.svelte`, retiré) ; 2e passage vert en 25 min 23 s. Mergée.
