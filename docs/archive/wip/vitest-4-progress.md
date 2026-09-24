# vitest 3 → 4 (GHSA-82fw-gwwq-j7x9) — progression

Branche `chore/vitest-4`, worktree `../ubumaths-wt-vitest4`. Faille dev-only :
lecture de fichiers arbitraires via `@vitest/mocker`, corrigée en `vitest >= 4.1.11`.

## Décisions (validées par David le 2026-09-24)

- Cible **vitest 4.1.11** (la 5.0.1 existe, hors mission).
- `vitest-browser-svelte` **2.2.1** : la 3.x rend `render` asynchrone (≈ 53 fichiers).
- Les 26 imports `@vitest/browser/context` → `vitest/browser` (modules identiques).
- Mock appelé avec `new` : `function` ou `class`, jamais une flèche (règle v4).
  4 endroits : `audio-manager.test.ts`, `pythonPlayground.svelte.test.ts` ×2,
  `base-executor.svelte.test.ts`.
- `dbTestConfig` : `poolOptions.forks.singleFork` → `maxWorkers: 1`, isolation gardée.
- Bloc `coverage` de `vite.config.ts` laissé tel quel : aucun paquet de couverture
  installé, aucun script ne la lance.

## Mesures

Scripts dans le scratchpad de session : lots serveur (12), client, intégration
(20 lots de 6 fichiers), un JSON par lot, comparaison test par test.

- Serveur + client : 36 646 tests avant / après, 1 écart (le test instable
  `m4-action-role-guards`, rouge avant par timeout sous charge, vert après).
- Intégration : 116 fichiers, 1 036 réussis, 12 ignorés, 0 écart.
- `pnpm audit` : 0 vulnérabilité (main : 2 modérées, GHSA-82fw-gwwq-j7x9).
- `check:incremental` : 1615 fichiers, 0 erreur.

## État

- [x] Référence serveur + client + intégration
- [x] Bump + config + adaptations
- [x] Mesure après, comparaison
- [x] `pnpm audit`, `check:incremental`, `lint:fast`
- [x] PR #421, CI verte, mergée le 2026-09-24 (`75730b6ae`) ; branche et worktree supprimés
