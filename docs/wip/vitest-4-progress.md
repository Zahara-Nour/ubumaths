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
(lots de 6 fichiers), un JSON par lot pour comparer test par test.

- Référence avant : faite (voir la PR). Instable connu : `m4-action-role-guards.test.ts`
  (timeout sous charge, repasse 13/13 isolé).

## État

- [x] Référence serveur + client
- [ ] Référence intégration
- [ ] Bump + config
- [ ] Mesure après, comparaison
- [ ] `pnpm audit`, `check:incremental`, `lint:fast`
- [ ] PR
