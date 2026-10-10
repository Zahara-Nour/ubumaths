# tests/integration/

Tests contre une **vraie pile Supabase locale** (RLS, RPC, triggers, policies, courses) :
`pnpm db:start` puis `pnpm test:integration` (sous verrou Supabase). Config : `vitest.integration.config.ts`.

- `*.test.ts` — la suite, à plat (un fichier par sujet)
- `database/` — tests de triggers PL/pgSQL
- `fixtures/` — copies figées lues par la suite (seeds de l'arbre des notions, liste blanche DEFINER)
- `global-setup.ts` — supprime les profs seedés avant la suite, rejoue le seed de dev après
- `garde-fonctions-security-definer.test.ts` — garde-fou lancé seul par `pnpm test:definer-guard`
- `draw-vip-cards-race-conditions.README.md` — notes historiques de ce test (actif)

Helpers, pièges (`auth.uid()` NULL, RLS silencieuse), CI : [docs/pratiques/tests.md](../../docs/pratiques/tests.md).
