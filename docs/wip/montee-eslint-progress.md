# montee-eslint — paquets de la config ESLint

Piste du chantier [amelioration](amelioration-progress.md).

## Reprendre ici

_Mis à jour le 2026-11-12, PR ouverte._

- **État** : typescript-eslint 8.71.0 → ^8.72.1 (épingle levée), eslint-plugin-svelte ^3.24.1, globals ^17.14.0 ; job Lint 30 → 60 min · **Prochaine action** : CI verte (Lint à froid) → merge · **En attente de David** : rien · **Pièges en cours** : typescript-eslint 8.72.2 trop jeune (`minimumReleaseAge`) ; `pnpm lint` local à froid = exit 134, la CI fait foi · **Worktree / branche** : `../ubumaths-wt-montee-eslint`, `chore/montee-eslint`

## Journal

- 2026-11-12 : faux positif `$bindable` (sveltejs/eslint-plugin-svelte#1607, corrigé dans svelte-eslint-parser 1.10) vérifié absent : `npx eslint` sur MathField et LockedPythonEditor = 0 erreur. UnifiedInput et ExerciseMarkdownEditor n'existent plus.
