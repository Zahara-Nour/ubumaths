# Passe « tests stale » — inventaire

> **Date** : 2026-06-12 · **Statut** : inventaire (aucun fix appliqué) · **Auteur** : sweep automatisé par zone

## Contexte

Le job `test` de la CI (`quality.yml:120`) appelle `pnpm test:unit -- --run --coverage`,
mais **`test:unit` a été retiré volontairement** (run complet trop lourd). Conséquence :
le job CI échoue avant de lancer le moindre test → **plus aucun gate de test depuis le retrait**.
La suite a donc « rouillé » : du code a évolué sans mettre à jour les tests, et personne n'a eu de signal.

Découvert via le fix `generateCronSecret` (un test `verifyCronAuth` était stale depuis un changement de message).

## Méthode

Sweep **par zone** (`pnpm test:server <zone> --run` + `pnpm test:client`), jamais toute la suite
d'un coup (mémoire). Capture des fichiers rouges + compteurs uniquement.

## Résultat global

|                         |                                                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Fichiers de test rouges | **63** (sur ~835)                                                                                                                              |
| Tests rouges (approx.)  | **~470**                                                                                                                                       |
| Zones saines (100 %)    | **mathAST (282)**, geometry-core _partiel_, math, constructions-v2, typst, spreadsheet, grapheur, transpilers, templates, srs, data, migration |

La dette est **concentrée** sur les zones « drift-prone » prévues (server, routes/API, validation, stores client, rich-text) ; le cœur logique (mathAST entièrement vert) est sain.

## Modes d'échec caractérisés (2 confirmés)

1. **Dérive de contrat** — ex. `messages-delete.test.ts` : le handler a été refactoré (vérif teacher/admin **en premier** → 403 + nouveau message) ; les tests attendent l'ancien contrat (`403 to be 400/404`, ancien message). → **Action : mettre à jour les tests** après avoir confirmé que le nouveau comportement est voulu.
2. **Introspection cassée** — ex. `achievements/migration.test.ts` (72/83) : tests `expect.hasAssertions()` qui parsent un fichier de migration et n'assertent **rien** (« expected any number of assertion, but got none ») → fichier déplacé / structure changée. → **Action : réparer la lecture, ou retirer ces tests fragiles.**

**Correction post-diagnostic (2026-06-12)** : il n'y a **pas** de cluster « erreur de collection ». L'écart de comptage (« 17 vs 15 ») venait d'un artefact de grep — un fichier à 1 test affiche `(1 test | 1 failed)` au **singulier**, raté par le filtre `tests |` (pluriel). Et `api/srs` (23/23) n'est **pas** un setup partagé : c'est une **dérive des chaînes de requêtes des handlers** (les mocks per-test, pourtant chaînables, ne matchent plus les `.from().…().select()` actuels), **isolée** à ce fichier — donc faible levier, fort coût (23 mocks à réaligner). Le vrai fort levier est le **cluster validation Zod** (homogène, simple).

## Inventaire détaillé (par zone, tri par nb de fails ↓)

### `src/lib/server` — 17 fichiers rouges / 78

| Fichier                                                    |      Fails | Cause présumée                          |
| ---------------------------------------------------------- | ---------: | --------------------------------------- |
| `achievements/__tests__/migration.test.ts`                 |      72/83 | introspection cassée                    |
| `middleware/student-access.test.ts`                        |      19/21 | refactor middleware (contrat)           |
| `validation/misc-modules.test.ts`                          |     10/114 | dérive schémas Zod                      |
| `validation/__tests__/exercises-generic-functions.test.ts` |       9/18 | dérive validation                       |
| `validation/srs.test.ts`                                   |       7/48 | dérive schémas                          |
| `validation/assessments.test.ts`                           |       7/42 | dérive schémas                          |
| `exercise-import-export.test.ts`                           |       4/23 | dérive format                           |
| `validation/exercises.test.ts`                             |       2/65 | dérive schémas                          |
| `validation/rewards-messages-notifications.test.ts`        |      2/105 | dérive schémas                          |
| `validation/common.test.ts`                                |       2/68 | dérive schémas                          |
| `validation/cron.test.ts`                                  |       2/19 | dérive schémas                          |
| `achievements/__tests__/service.test.ts`                   |       1/26 | dérive                                  |
| `admin/exercise-backup.test.ts`                            |       1/27 | dérive                                  |
| `validation/vip-card-admin.test.ts`                        |       1/91 | dérive schémas                          |
| `validation/message-templates.test.ts`                     |       1/81 | dérive schémas                          |
| _+ 2 fichiers_                                             | collection | erreur de chargement (import/transform) |

### `src/routes` — 13 fichiers rouges / 39

| Fichier                                                          |     Fails | Cause présumée                                |
| ---------------------------------------------------------------- | --------: | --------------------------------------------- |
| `api/srs/api-routes.test.ts`                                     | **23/23** | setup/contrat cassé (fichier entier)          |
| `api/assessments/api-routes.test.ts`                             |     34/47 | dérive contrat API                            |
| `api/moderation/restrict-user/restrict-user.test.ts`             |     24/26 | **cluster modération** (auth-first 403)       |
| `api/exercises/api-routes.test.ts`                               |     21/27 | dérive contrat API                            |
| `api/moderation/messages/messages-delete.test.ts`                |     18/20 | **cluster modération** (confirmé : 403-first) |
| `api/moderation/unrestrict-user/unrestrict-user.test.ts`         |     14/16 | **cluster modération**                        |
| `api/admin/schools/[schoolId]/config/config.test.ts`             |     11/29 | dérive contrat                                |
| `(protected)/dashboard/teacher/contenu/templates/routes.test.ts` |     10/21 | dérive contrat                                |
| `api/games/minesweeper/minesweeper-authorization.test.ts`        |      9/20 | dérive autorisation (403 teacher/admin)       |
| `api/python-notebooks/[id]/checkpoint-runs/server.test.ts`       |      4/17 | dérive                                        |
| `api/riddles/api-routes.test.ts`                                 |      4/16 | dérive                                        |
| `api/migration/__tests__/migration-review.test.ts`               |      3/22 | dérive                                        |
| `api/messages/api-routes.test.ts`                                |      2/78 | dérive                                        |

### `src/lib/components` — 2 / 17

- `rich-text/__tests__/markdown-roundtrip.test.ts` — 31/133 — **cluster rich-text/markdown roundtrip**
- `rich-text/__tests__/markdown-semantic-roundtrip.test.ts` — 2/49 — idem

### `src/lib/utils` — 3 / 20

- `game/challenge-variables.test.ts` — 25/48 — dérive logique (cf. `new Function` connu)
- `answer-validator-blanks.test.ts` — 13/49 — **cluster answer-validator**
- `answer-validator.test.ts` — 8/56 — idem

### `src/lib/stores` — 1 / 6

- `teacherDashboardCache.test.ts` — 9/105

### `src/lib/whiteboard` — 3 / 23

- `core/binding.test.ts` — 4/84
- `tests/hit-testing.test.ts` — 2/67
- `tests/serialization.test.ts` — 1/25

### `src/lib/games` — 2 / 10

- `evoland/logic/hero.test.ts` — 4/56
- `evoland/logic/progression.test.ts` — 1/37

### `src/lib/ubumark` — 2 / 54

- `importers/latex/__tests__/math-to-custom.test.ts` — 8/64
- `__tests__/parser/markdown-parser.test.ts` — 4/91

### `src/lib/questions` — 4 / 32 (2 nommés + 2 erreurs de collection)

- `generator/__tests__/e2e-fill-blanks-pipeline.test.ts` — 6/145
- `integration/color-integration.test.ts` — 2/8
- _+ 2 fichiers en erreur de collection_

### `src/lib/exercises` — 3 / 9

- `generator/instance-generator.test.ts` — 3/44
- `markdown-frontmatter.test.ts` — 3/17
- `validation.test.ts` — 1/13

### `src/lib/shared` — 1 / 7

- `blockly/__tests__/types.test.ts` — 1/23

### `src/lib/geometry-core` — 7 / 155 (dérive mineure d'export)

- `dsl/__tests__/parser.test.ts` — 2/42
- `rendering/__tests__/export-tikz.test.ts` — 1/27
- `rendering/__tests__/export-tikz-edge.test.ts` — 1/36
- `rendering/__tests__/export-svg.test.ts` — 1/32
- `rendering/__tests__/export-svg-edge.test.ts` — 1/42
- `rendering/__tests__/export-typst-edge.test.ts` — 1/23
- `dsl/__tests__/trace-demos.test.ts` — 1/6

### Client (`*.svelte.test.ts`) — 5 / 41 (15 tests)

- `components/markdown/__tests__/VariationTable.svelte.test.ts`
- `components/python/exercises/ExerciseValidationResult.svelte.test.ts`
- `stores/chat.svelte.test.ts`
- `stores/minesweeper.svelte.test.ts`
- `stores/presence.svelte.test.ts`

## Clusters à traiter ensemble (probables racines partagées)

1. **Modération** (`restrict-user` 24, `unrestrict-user` 14, `messages-delete` 18) — refonte auth-first → 403. ~56 tests, 1 décision de contrat.
2. **Contrats API** (`assessments` 34, `exercises` 21, `srs` 23, `config` 11, `riddles`, `checkpoint`, `messages`, `templates routes`, `minesweeper-auth`) — dérive de contrat / setup de mock. `srs` 23/23 et les 2 collection-errors server = **setup cassé**, à regarder en premier (cause unique probable).
3. **Validation Zod** (`server/validation/*`, ~11 fichiers, fails 1-10) — messages/règles de schéma changés → assertions stale. Lot homogène, fix rapide.
4. **answer-validator** (`utils/answer-validator*` + `challenge-variables`) — dérive logique de validation des réponses.
5. **Markdown roundtrip** (`components/rich-text/*` + `ubumark/markdown-parser`) — sérialisation rich-text.
6. **Exports geometry** (`rendering/export-*`, 1 fail chacun) — format d'export, mineur.

## Recommandations

- **Triage par cluster, pas fichier par fichier.** Pour chaque cluster : 1 décision (le nouveau comportement code est-il voulu ?), puis mise à jour groupée des tests (ou fix code si vraie régression).
- **Règle par rouge** : code correct → maj test · vraie régression → fix code · test obsolète/mort → suppression. **Ne pas « réaligner » un test sans confirmer le comportement** (risque de masquer un bug).
- **Commencer par les setups cassés** (`api/srs` 23/23, les 4 erreurs de collection) : cause unique probable, fort effet de levier.
- **Restaurer un gate LÉGER** (le full `test:unit` a été retiré pour sa lourdeur) — pistes :
  - pre-commit : lancer uniquement les tests des fichiers touchés (`vitest related` / `check:changed`-style) ;
  - CI : `test:server` shardé par zone, ou seulement sur les dossiers modifiés du diff.
- **Corriger `quality.yml`** : le job `test` appelle encore `test:unit` (retiré) → il erreur à chaque push. Le pointer vers le gate léger retenu, ou retirer le job.

## Zones vertes confirmées (ne pas re-tester)

`mathAST` (286 fichiers ✓), `math`, `constructions-v2`, `typst`, `spreadsheet`, `grapheur`, `transpilers`, `templates`, `srs` (lib), `data`, `migration`, + la grande majorité de `geometry-core` (148/155) et `whiteboard` (20/23).

## Prochaines étapes (à valider)

1. Choisir un premier cluster à remédier (reco : **setups cassés** puis **validation Zod** — fort levier, faible risque).
2. Décider la stratégie de gate léger.
3. Itérer cluster par cluster, un commit par lot.
