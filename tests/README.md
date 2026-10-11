# tests/

Tests qui **ne peuvent pas être co-localisés** dans `src/` (vraie base Supabase) et infra partagée.
Les tests unitaires vivent dans `src/**/__tests__/` et `scripts/**/__tests__/` ; les e2e dans `e2e/`.

- `integration/` — suite d'intégration contre Supabase local (`pnpm test:integration`)
- `helpers/` — clients réels et factory (`database/`), mocks (`supabase/`, `fixtures/`), helpers e2e
- `fixtures/` — copies figées lues par des tests (`lexique/`, `relecture/`)
- `seed-test-data.ts`, `cleanup-test-data.ts` — seed / nettoyage pour les e2e (à la main, `npx tsx`)

Tout le système de tests : [docs/pratiques/tests.md](../docs/pratiques/tests.md).
