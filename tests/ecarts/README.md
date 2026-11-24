# tests/ecarts/

Tests de preuve du registre des écarts ([docs/ecarts/registre.md](../../docs/ecarts/registre.md)).

Chaque test affirme le comportement **attendu** d'un écart encore ouvert : il est donc **rouge
tant que l'écart est vrai**. Seul `pnpm ecarts rejouer` les joue (projet vitest `ecarts`, présent
quand `ECARTS_PREUVES=1`) ; la CI, `test:server` et `test:changed` ne les voient pas.

À la correction de l'écart, le test part d'ici et devient un test ordinaire à côté du code corrigé.

Mode d'emploi : [docs/pratiques/registre-des-ecarts.md](../../docs/pratiques/registre-des-ecarts.md).
