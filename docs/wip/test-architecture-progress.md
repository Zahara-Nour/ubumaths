# Migration architecture des tests — progression

> Cible : [docs/ref/tests/architecture.md](../ref/tests/architecture.md). Démarré 2026-06-14.

## Décisions actées (validées PO)

1. **Co-location** : `__tests__/` partout dans `src` (convention déjà majoritaire à 65 %).
2. **`tests/unit/`** : rapatrié dans `src/**/__tests__/` ; `tests/` ne contient plus QUE intégration/e2e/infra.
3. **DB/triggers** : fusionnés dans `tests/integration/database/`, config Docker `vitest.triggers.config.ts` supprimée.
4. **CI** : job nightly Supabase pour `tests/integration/**`.

## Plan (6 phases, 1 commit/phase)

- [x] **Phase 0** — Doc de référence `docs/ref/tests/architecture.md` ✅ (créé, relu PO)
- [x] **Phase 1** — Co-location `src` : 237 tests à plat + 2 dossiers `/tests/` → `__tests__/` ✅ - 237 fichiers à plat déplacés + imports réécrits (codemod) ; `whiteboard/tests`→`__tests__` ; `server/tests/*`→`server/__tests__/` - Vérif : `vitest --project server` = **31765 tests ✓** ; `--project client` = 1009 ✓ (2 échecs `exercise-validation-real.svelte.test.ts` **pré-existants**, byte-identiques au pré-move, real-Pyodide flaky exclu CI)
- [x] **Phase 2** — Vider `tests/unit/` → `src/**/__tests__/` + retirer `tests/unit/**` du glob `server` ✅ - 22 tests rapatriés : 12 tests de routes API → `src/routes/.../__tests__/` (import SUT réécrit en `../+server`), 9 vers `src/lib/server|utils|stores/__tests__/`, 1 script-test → `scripts/__tests__/` - `vite.config.ts` projet `server` : `tests/unit/**` → `scripts/**` - Vérif : `vitest --project server` = **814 fichiers / 31765 tests ✓** (compte identique à Phase 1) - **Reste** : `tests/unit/GOOGLE_MATERIALS_TEST_SUMMARY.md` (fichier **non tracké** git → ne pas déplacer/supprimer sans accord ; à trancher en Phase 6)
- [x] **Phase 3** — Fusion `tests/database/` → `tests/integration/database/`, suppr. config triggers ✅ - 11 tests de triggers → `tests/integration/database/` (import helpers réécrit `../helpers/` → `../../helpers/database/`) ; 2 SQL + README idem - helpers DB **partagés** (triggers + intégration) → `tests/helpers/database/` ; 6 importateurs réécrits (5 tests intégration + competence-referentiel.helpers) - supprimé `vitest.triggers.config.ts` + scripts `test:triggers`/`test:triggers:watch` ; nettoyé exclude mort `vite.config.ts`, commentaire `vitest.base.config.ts`, ligne CLAUDE.md - `tests/database/` supprimé. Vérif : `vitest list --config vitest.integration.config.ts` collecte **19 fichiers** dont les 11 DB (imports résolus ; exécution requiert Supabase local — non lancée)
- [x] **Phase 4** — Consolider helpers/fixtures sous `tests/helpers/` ✅ - Constat : `tests/helpers/` était **déjà** la structure cible (index, *-helpers, fixtures/, supabase/, database/). Alias `$tests` → `./tests` (svelte.config.js). - Seul écart : `tests/fixtures/game-fixtures.ts` quasi-doublon de `tests/helpers/fixtures/game.ts` (version helpers plus propre, exporte les mêmes symboles). - `seed-test-data.ts` (seul importateur, lancé via `tsx` donc import **relatif**) redirigé vers `./helpers/fixtures/game` ; doublon supprimé ; `tests/fixtures/` retiré.
- [ ] **Phase 5** — Job CI nightly intégration
- [ ] **Phase 6** — Validation finale (test:server, test:client, check:incremental) + docs/READMEs

## Faits notables / pièges

- `src/routes/api/tests/save/+server.ts` = **vraie route API** `/api/tests/save`, PAS un dossier de tests. Ne pas toucher.
- Liens morts découverts (à corriger en Phase 6) : `docs/ref/tests/tdd.md`, `docs/README.md`, `docs/development/testing/*` (référencés dans CLAUDE.md et e2e/README.md mais inexistants).
- Règle de réécriture d'import (déplacement +1 niveau vers `__tests__/`) : préfixer un `../` à tout spécificateur relatif. Couvre `from`, `import()` dynamique (~30 fichiers), `vi.mock` (1 fichier : typst-service). Quotes simples uniquement, aucun littéral fs relatif, aucun import test→test.

## Fichiers modifiés

(à compléter par phase)
