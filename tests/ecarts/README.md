# tests/ecarts/

Tests de preuve du registre des écarts ([docs/ecarts/registre.md](../../docs/ecarts/registre.md)).

Chaque test affirme le comportement **attendu** d'un écart encore ouvert : il est donc **rouge
tant que l'écart est vrai**. Seul `pnpm ecarts rejouer` les joue (projet vitest `ecarts`, présent
quand `ECARTS_PREUVES=1`) ; la CI, `test:server` et `test:changed` ne les voient pas.

À la correction de l'écart, le test part d'ici et devient un test ordinaire à côté du code corrigé.

Un écart qui demande une vraie base n'a pas son test ici : il est en `it.fails` dans
`tests/integration/ecarts-<domaine>.test.ts`, et le registre le suit par un marqueur.

Même chose pour un écart qui demande un navigateur (composant monté, réactivité) : `it.fails` dans
`src/**/__tests__/ecarts-<domaine>.svelte.test.ts`, suivi par un marqueur.

Mode d'emploi : [docs/pratiques/registre-des-ecarts.md](../../docs/pratiques/registre-des-ecarts.md).
