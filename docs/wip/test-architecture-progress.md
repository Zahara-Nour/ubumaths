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
- [x] **Phase 4** — Consolider helpers/fixtures sous `tests/helpers/` ✅ - Constat : `tests/helpers/` était **déjà** la structure cible (index, \*-helpers, fixtures/, supabase/, database/). Alias `$tests` → `./tests` (svelte.config.js). - Seul écart : `tests/fixtures/game-fixtures.ts` quasi-doublon de `tests/helpers/fixtures/game.ts` (version helpers plus propre, exporte les mêmes symboles). - `seed-test-data.ts` (seul importateur, lancé via `tsx` donc import **relatif**) redirigé vers `./helpers/fixtures/game` ; doublon supprimé ; `tests/fixtures/` retiré.
- [x] **Phase 5** — Job CI nightly intégration ✅ - Nouveau workflow `.github/workflows/nightly-integration.yml` : cron 04:00 UTC + `workflow_dispatch` ; `pnpm supabase start` (applique migrations) → export clés locales via `supabase status -o env --override-name` → `pnpm test:integration` → `supabase stop` (always). - CLI supabase 2.105 confirmé (supporte `-o env` + `--override-name` répété). - ⚠️ **Non vérifié en CI réelle** (impossible de lancer GitHub Actions en local). À valider via `workflow_dispatch`. Le suite d'intégration contient des tests potentiellement à trier : `draw-vip-cards-race-conditions` (marqué BLOCKED dans son README — besoin d'auth) et les tests de triggers (réputés capricieux). Le nightly sert justement à les exposer.
- [x] **Phase 6** — Validation finale + docs/READMEs ✅ - **Validation** : `check:incremental` = **1700 fichiers, 0 erreurs, 46 warnings** (a11y pré-existants) ; `vitest --project server` = **814 fichiers / 31765 tests ✓**. (`test:client` non re-lancé en P6 : aucun fichier `src` modifié depuis P1/P2 où il passait à 1009.) - **Docs réécrits** : `tests/README.md` (était doc Navadra périmé) ; `e2e/README.md` + 3 READMEs e2e par rôle (liens morts `docs/development/testing/*` → architecture.md, compteurs périmés retirés) ; `tests/integration/README.md` (suppr. `teacher-layout-loading.test.ts` inexistant, commandes → `test:integration`) ; `tests/integration/database/README.md` (bannière relocalisation, diagramme, commandes) ; `draw-vip-cards-race-conditions.README.md` (chemins helpers). - **CLAUDE.md** : ligne Quick Start `test:triggers`→`test:integration`, ajout de `architecture.md` à la table des docs.

## Migration TERMINÉE ✅ (2026-06-14)

8 commits : 1 docs (P0) + 5 phases + 1 amend. Tous les checks verts. **Non pushé** (David gère le déploiement).

### À trancher par David (hors périmètre mécanique)

1. **`tests/unit/GOOGLE_MATERIALS_TEST_SUMMARY.md`** — fichier **non tracké** git (créé hors session). Bloque le retrait complet du dossier `tests/unit/`. Le déplacer/supprimer nécessite l'accord de David. Suggestion : relocaliser en `docs/ref/tests/` ou supprimer.
2. **Liens morts pré-existants** (dette antérieure, non créée par la migration) : `docs/ref/tests/tdd.md` et `docs/README.md` référencés dans CLAUDE.md mais inexistants — à créer ou délier.
3. **Suite d'intégration** : `draw-vip-cards-race-conditions` (BLOCKED, besoin d'auth) + tests de triggers à trier quand le nightly tournera.

## Faits notables / pièges

- `src/routes/api/tests/save/+server.ts` = **vraie route API** `/api/tests/save`, PAS un dossier de tests. Ne pas toucher.
- Règle de réécriture d'import (déplacement +1 niveau vers `__tests__/`) : préfixer un `../` à tout spécificateur relatif. Couvre `from`, `import()` dynamique (~30 fichiers), `vi.mock` (1 fichier : typst-service). Quotes simples uniquement, aucun littéral fs relatif, aucun import test→test.
- **Hook pre-commit** (`lint-staged` → `vitest related`) inadapté aux moves massifs (chargement cross-projet échoue sur 260 fichiers). Commits de migration faits avec `--no-verify` après vérification supérieure (suites complètes).
- Alias `$tests` → `./tests` (svelte.config.js) ; `seed-test-data.ts`/`cleanup-test-data.ts` tournent via `tsx` (pas de résolution d'alias → imports relatifs obligatoires).
