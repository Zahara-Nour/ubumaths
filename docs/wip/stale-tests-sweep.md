# Passe « tests stale » — inventaire

> **Date** : 2026-06-12 · **Statut** : inventaire (aucun fix appliqué) · **Auteur** : sweep automatisé par zone

## Contexte

**Vrai diagnostic (confirmé via `gh run view` le 2026-06-12) :** la CI est **entièrement
HS depuis des semaines** — pas seulement le gate de test. Les **4 jobs** (Lint, Type Check,
Build, Unit Tests) échouent tous à l'étape `pnpm install --frozen-lockfile` avec
`ERR_PNPM_UNSUPPORTED_ENGINE` : la CI pinait **pnpm 9 / Node 20** (`quality.yml`) alors que
le projet tourne sur **pnpm 10 / Node 26**. Les runs meurent en ~16-18 s, avant d'exécuter
quoi que ce soit. → **Aucun signal CI du tout** (ni lint, ni types, ni build, ni tests) → tout a rouillé.

> **Correction d'un diagnostic antérieur** : on avait d'abord cru que la CI cassait parce que
> `test:unit` avait été retiré (le job `test` l'appelle encore). C'est un **vrai bug mais latent** :
> le job `test` n'atteint jamais `test:unit` (il meurt à l'install avant). À régler _après_ l'install.

**Fix CI appliqué** (commit `f6353dd21`) : bump `quality.yml` → pnpm 10 / Node 22 LTS + champ
`packageManager: "pnpm@10.23.0"` (anti-divergence). Au prochain push, l'install devrait passer
et la CI deviendra **honnête** : Type Check rouge (~9 erreurs svelte-check baseline), Unit Tests
rouge (`test:unit` manquant), tests stale rouges — c'est le présent chantier.

Découvert au départ via le fix `generateCronSecret` (un test `verifyCronAuth` était stale depuis un changement de message).

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
- ~~Commencer par les setups cassés~~ — **réfuté au diagnostic** : pas de cluster « collection error » (artefact de grep), et `api/srs` (23/23) est une dérive **isolée** des chaînes de requêtes des handlers (23 mocks à réaligner) = faible levier. **Commencer plutôt par `validation/*`** (homogène), puis le **cluster modération** (1 décision de contrat pour 3 fichiers / ~56 tests).
- **Restaurer un gate LÉGER** (le full `test:unit` a été retiré pour sa lourdeur) — pistes :
  - pre-commit : lancer uniquement les tests des fichiers touchés (`vitest related` / `check:changed`-style) ;
  - CI : `test:server` shardé par zone, ou seulement sur les dossiers modifiés du diff.
- **Corriger `quality.yml`** : le job `test` appelle encore `test:unit` (retiré) → il erreur à chaque push. Le pointer vers le gate léger retenu, ou retirer le job.

## Zones vertes confirmées (ne pas re-tester)

`mathAST` (286 fichiers ✓), `math`, `constructions-v2`, `typst`, `spreadsheet`, `grapheur`, `transpilers`, `templates`, `srs` (lib), `data`, `migration`, + la grande majorité de `geometry-core` (148/155) et `whiteboard` (20/23).

## Journal de remédiation

| Date       | Fichier(s)                                                | Verdict                                                                               | Commit                           |
| ---------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------- |
| 2026-06-12 | `server/auth/cron.test.ts` (test `verifyCronAuth`)        | stale (message d'erreur changé) — réaligné                                            | `b8080eb10` (dans le fix /login) |
| 2026-06-12 | `server/validation/cron.test.ts`                          | stale (jobs cron migrés HTTP→RPC, 3→8) — **pas une régression**                       | `99ee0cc74`                      |
| 2026-06-12 | **cluster `server/validation/*`** (9 fichiers, 41 rouges) | **tous stale, 0 régression** — voir tableau ci-dessous                                | `0b4f65794`                      |
| 2026-06-12 | **cluster modération** (3 fichiers, 56 rouges)            | **mock périmé + 1 VRAIE RÉGRESSION** (`deleteMessageSchema`) — voir détail ci-dessous | _(ce commit)_                    |

### Détail cluster `server/validation/*` (2026-06-12)

Verdict global : **aucune régression**. Chaque rouge mappé à un refactor délibéré tracé en commit.

| Fichier                                 |           Rouges | Refactor source                                                                                                     | Commit                            |
| --------------------------------------- | ---------------: | ------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `misc-modules`                          | 10 (+1 démasqué) | enums `error_type`/`severity` alignées sur `errorMonitoring.ts` ; grade `6eme→6` ; `.url()` retiré (paths relatifs) | types canoniques, `854b5ac81`     |
| `__tests__/exercises-generic-functions` |                9 | fixture sans `category` (désormais requis)                                                                          | `2738a8df4` (difficulty→category) |
| `srs`                                   |                7 | `frontContent`/`backContent` : `ContentField[]` → markdown string                                                   | `53de6998b` / `c4059b316`         |
| `assessments`                           |                7 | grade `6eme→6`                                                                                                      | `854b5ac81`                       |
| `exercises`                             |                2 | `category` enum string ; grades `6eme→6`                                                                            | `2738a8df4`                       |
| `rewards-messages-notifications`        |                2 | `awardGidouilles` exige `classId` ; pagination string                                                               | `a86e1fd47`, `d4b5051e9`          |
| `common`                                |                2 | pagination `coerce.number` → string+clamp                                                                           | `d4b5051e9`                       |
| `vip-card-admin`                        |                1 | `count` optionnel = mode flexible                                                                                   | `870d3fbdc`                       |
| `message-templates`                     |                1 | extends pagination (string)                                                                                         | `d4b5051e9`                       |

**Loosenings sémantiques signalés (délibérés, pas régressions)** :

- **pagination** (`d4b5051e9`) : `?page=-1` n'est plus rejeté (400) mais **clampé** silencieusement à 1. Tests réécrits pour documenter le clamp.
- **`awardGidouilles`** (`2478a8425`) : montants **négatifs** (−1000..−1) autorisés (= retrait de gidouilles). Les anciens tests « reject negative/zero amount » passaient à tort (faux positif : ils omettaient le `classId` désormais requis). Réécrits : `accept negative`, `reject < -1000`, `reject missing classId`.
- **`replace_random`** (`870d3fbdc`) : `count` manquant accepté (mode flexible).

Cluster entier : **27 fichiers / 1202 tests verts** après réalignement.

### Détail cluster modération (2026-06-12)

**Ce n'était PAS une « décision de contrat auth-first 403 »** (hypothèse de l'inventaire) — diagnostic réel après lecture du code : **mock de rôle périmé** + **1 vraie régression**.

- **Racine commune (mock)** : le rôle vit sur `locals.profile.role` (peuplé par `getUserProfile` dans `hooks.server.ts:163`, cf. `app.d.ts`), pas sur `locals.user`. Le helper `createLocalsWithRole` posait le rôle sur `locals.user` → `locals.profile` `undefined` → **403 systématique** dans les 3 fichiers (faux `expected 400/404/500 to be 403`). Fix : `locals.profile = { id, role }`. Débloque ~47 tests d'un coup (commits handler `fb15f303b` confirme le pattern `locals.profile.role`).
- **`restrict-user`** (4 résiduels) : messages de refine `scopeType` fusionnés (un seul message), + 2 tests sur l'ancien check « conversation existence » **retiré délibérément** par `e56f6ae2d` (`fix(moderation): allow restriction from reports without conversation access`) → réécrits sur le nouveau contrat (participant OU élève dans une classe du prof).
- **🔴 VRAIE RÉGRESSION — `messages-delete`** : `deleteMessageSchema` exigeait `messageId` **dans le body**, mais le frontend (`DeleteMessageDialog.svelte:63`) n'envoie que `{ reason }` et le handler prend l'id depuis l'URL. → **toute suppression de message en prod échouait en 400** (« expected string, received undefined »). Les tests rouges captaient un endpoint cassé. **Fix code** : retrait du champ `messageId` de `deleteMessageSchema` (`src/lib/server/validation/moderation.ts`). 13 tests débloqués + endpoint réparé. ⚠️ **À signaler à David : bug de prod, pas juste un test.**
- Restants `messages-delete` (2) : mock de la requête count `class_members` (`{ count, head:true }`) faisait un `select.mockReturnValueOnce` consommé par le mauvais `.select()` → remplacé par le protocole thenable `.then`.

Cluster modération : **3 fichiers / 62 tests verts**. `check:incremental` = baseline (9 err / 46 warn), inchangé.

### Détail cluster « contrats API » — `assessments` (2026-06-12)

Fichier `api/assessments/api-routes.test.ts` (34 rouges) : **PAS mécanique** — a révélé **3 régressions de prod** + 2 bugs latents, toutes du commit `47d317cb5` (`feat(validation): add comprehensive Zod validation`, 2025-10-28) qui a inventé des formes de schéma ne correspondant pas au modèle de données réel.

**🔴 Régressions de prod corrigées (code)** :

1. `createAssessmentSchema` validait `categories: [{category_id, question_count}]` au lieu de `CartItem[]` + `settings` → **POST création rejeté en 400** (frontend, type `CreateAssessmentData`, fn serveur, JSONB utilisent tous `CartItem[]`). Commit `5e84d5606`.
2. `assessmentResponseSchema` (idem + `max_attempts: number` top-level) → `validateResponse` **throw 500** sur toute réponse réelle (POST/GET liste/GET détail). Commit `7f2212d9e`.
3. **Bug latent** : `GET /api/assessments` et `/[id]/results` passaient `searchParams.get()` (= `null` si absent) à des champs `.optional()` (acceptent `undefined`, pas `null`) → **400 sans filtre**. Pas d'appelant frontend actuel mais route cassée. Commit `c534401e9`.

**Piège évité** : le test unitaire `validation/assessments.test.ts` était écrit contre le **même schéma cassé** (self-consistant) — d'où la non-détection dans le cluster validation (j'y avais aligné les codes grade sans voir que la forme `category` entière était fausse). La régression n'apparaît qu'au niveau API où le payload frontend réel rencontre le schéma.

**Réalignement tests** (`46b6fba58`) : messages auth EN→FR, grade codes, payloads CartItem[], **ordre des mocks `.single`** (GET[id] : `requireAuth` lit le profil AVANT `getAssessment`), UUIDs valides. 47/47 + 42/42 verts.

### Reste du cluster contrats API — FAIT 2026-06-12

Les 7 autres fichiers (après assessments) traités, **tous test-drift, 0 régression de prod** :

| Fichier            | Tests | Cause racine                                                                                          | Commit              |
| ------------------ | ----- | ----------------------------------------------------------------------------------------------------- | ------------------- |
| `exercises`        | 27/27 | migration `requireAuth`/`requireRole` (throw FR au lieu de json ; profil `.single()` consommé en 1er) | `3673b0845`         |
| `minesweeper`      | 20/20 | `c2f4ec7e6` autorise les profs (start/complete/loss) ; tests "reject teachers"→"allow" + message FR   | `b09439c73`         |
| `config`           | 29/29 | mocks accédaient `(mockSupabase as any).single` au lieu de `._mockChain.single`                       | `b09439c73`         |
| `templates routes` | 21/21 | `ActionFailure.data.error`, `content_snapshot` mock, action create = `redirect(303)`, messages FR     | `b09439c73`         |
| `riddles`          | 16/16 | `params.id` non-UUID (`'riddle-123'`) rejeté par `validateUuidParam` ; mock profil ; shape RPC        | `b09439c73`         |
| `checkpoint-runs`  | 17/17 | `rpc('...').single()` mocké comme rpc non-chaînable                                                   | `b09439c73`         |
| `messages`         | 78/78 | 2 tests self-contained à fixtures incohérentes (scope `system`/`class`, `.message_id`/`.id`)          | _(commit messages)_ |

**Verdicts des « suspects »** : `minesweeper 500→403` = autz délibérée (`c2f4ec7e6`, profs autorisés) ; `messages 'system'→'class'` = fixture de test incohérente (le test n'appelle aucun handler). Aucun n'était une régression.

**Notes robustesse (non bloquant, signalées par les agents)** : `templates/instantiate` fait `formData.get('title') as string|undefined` (runtime `null`) → gagnerait `?? undefined` (même classe de bug latent que les GET assessments). Commentaire JSDoc obsolète sur minesweeper `current` (dit "students only", autorise profs).

**Cluster contrats API : 8 fichiers, 100% verts.** 3 régressions de prod corrigées (assessments), reste = test-drift.

### Serveur — student-access + achievements/migration (2026-06-12)

| Fichier                     | Tests | Cause racine                                                                                                                                                                                                                                               | Commit      |
| --------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `middleware/student-access` | 21/21 | `verifyTeacherStudent` fait `.eq('student_id').eq('status','active')` (2e `.eq` ajouté par `186352255`) awaité ; le mock local résolvait via `eq.mockResolvedValueOnce` → 1er `.eq` cassait le 2e. Mock rendu **thenable** (`_queueResult`).               | `b2bc8da60` |
| `achievements/migration`    | 83/83 | introspection regex-sur-SQL. 68 « no assertions » : `assertContains` throwait sans `expect()` → 0 assertion. 4 patterns stale vs migration réelle (UNIQUE INDEX≠CONSTRAINT, index `incomplete` inexistant→`is_active`, 2 regex multi-lignes `.`→`[\s\S]`). | `5d356c38d` |

⚠️ `achievements/migration` est un test **fragile** (regex sur DDL d'une migration figée) — candidat à suppression future (faible valeur : une migration s'applique ou pas, vérifier son texte est cassant).

### ✅ Cluster answer-validator — RÉGRESSION CONFIRMÉE + corrigée (2026-06-12)

**Résolu** : `answer-validator` 56/56 + `answer-validator-blanks` 49/49. Les 19 rouges (après les 2 stale de `7fe4a37a4`) ont été **revus un par un avec David** → **18 = vraie régression de prod** (la plus grosse du chantier : validation des réponses élèves), **1 = test obsolète réaligné**. Fix code commit `e48b63785` (+ doc `docs/wip/answer-validator-form-fix-progress.md`).

**Cause** : `checkForm` compare la réponse normalisée à l'**attendu littéral** ; les commits `f2f9287a2`/`9ff3c2e0a`/`dece435e4` ont généralisé ce form-mismatch à TOUS les blancs → des réponses correctes étaient marquées `bad_form` (équivalence, précision, conversion d'unité, texte fuzzy, requiredForm). **Fix** : aiguillage par mode (chaque blanc a une forme exigée explicite/implicite ; on vérifie « conforme à la forme exigée », pas « == attendu ») ; violations cosmétiques conservées. Détail design + décisions PO dans le doc dédié.

_(Section historique ci-dessous conservée pour trace du diagnostic.)_

**`answer-validator` (49/56) + `answer-validator-blanks` (37/49)** : 2 tests stale réalignés (`7fe4a37a4`), mais **19 tests laissés ROUGES volontairement** car ils exposent ce qui ressemble fortement à une **régression du validateur** (agent pedagogy-expert a refusé de maquiller, à raison). À ARBITRER avec David.

**Symptôme** : le `checkForm` cosmétique écrase le verdict de valeur correct → `bad_form`. Source : `validateSingleBlank` étape 4 (`answer-validator.ts:644-653`) lance `applyConstraints`/`checkForm` sur **TOUS** les blancs (y compris `text`/`precision`/`unit`, depuis `f2f9287a2` « always run constraints ») + mismatch de forme **inconditionnel** (`answer-validator.ts:118`, ignore `form:'off'`, depuis `9ff3c2e0a`/`dece435e4`). Or `checkForm` n'évalue pas l'arithmétique, ne convertit pas les unités, et parse le texte comme du LaTeX math.

**Cas cassés** (tous : valeur OK puis `bad_form`) :

- équivalence algébrique : `2+3` (attendu `5`)
- tolérance de précision : `3.1` (exp `3.14`), `10.3` (exp `10`) → **précision rendue inopérante**
- conversion d'unité : `5000\unit{m}` (exp `5\unit{km}`) → **conversions cassées**
- blancs **`text`** : `'éntier'`/`'paire'` fuzzy-match OK puis parsés en LaTeX math → `bad_form` (**le plus flagrant**)
- **`requiredForm`** : `2×3` (forme produit, valeur 6), `2+3` (somme), `\frac12`, `2^3` → forme validée puis écrasée → **toute la feature requiredForm cassée**
- `form:'off'` ignoré (mismatch inconditionnel)

**Régression #2** : `allowBracketsInFirstNegativeTerm` (champ de `ConstraintOptions`, `types.ts:836`) n'est jamais lu par le pipeline unifié `cosmetic-transforms.ts` → option silencieusement inopérante (`(-5)+3` → `bad_form`).

**Décision PO** : ces durcissements (form mismatch inconditionnel + checkForm sur tous les blancs) sont-ils **voulus** (→ réaligner les 19 tests) ou une **régression** (→ scoper checkForm aux blancs math, le rendre conditionnel à une vraie contrainte `form`/`requiredForm`, et porter `allowBracketsInFirstNegativeTerm`) ? La validation des réponses est cœur de l'app → fort impact si régression.

### ✅ `challenge-variables` (25) — test supprimé (système navadra condamné)

**Décision David (2026-06-12)** : navadra va être **réécrit pour utiliser le système de questions d'UbuMaths** pour les challenges. Le module `challenge-variables.ts` (encore utilisé par les composants navadra/combat) sera remplacé. Migrer la fixture/les 25 tests stale (ancien format `{ value: 'randomInt(1,10)' }` vs code `{ type: 'random', min, max }`) vers un format condamné = effort jeté. → **`challenge-variables.test.ts` supprimé** (`6f568615d`). Module conservé jusqu'à la réécriture.

### Cluster markdown/rich-text (2026-06-12, `ea8e15ec3`)

4 fichiers. Décision PO (b) sur le strict-roundtrip : forme **canonique** voulue.

| Fichier                                 | Résultat           | Détail                                                                                                                                 |
| --------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `rich-text/markdown-roundtrip`          | **133/133**        | 31 strict réalignés sur la forme CommonMark canonique (ligne blanche avant contenu-bloc des items de liste) ; sérialiseur **inchangé** |
| `ubumark/markdown-parser`               | **91/91**          | `orientation`→`transpose` (rename `be99d241b`)                                                                                         |
| `ubumark/math-to-custom`                | 61/64              | 5 stale réalignés (`SUPPORTED_GREEK` 5→23) ; **3 rouges = 🔴 régression**                                                              |
| `rich-text/markdown-semantic-roundtrip` | 47/49 (non touché) | **2 rouges = 🔴 régression**                                                                                                           |

**✅ Ces 2 régressions ont été CORRIGÉES (2026-06-12)** :

- **#6 blockquote dans item de liste** → fix `e4674ccb8` : `parseContentWithBlockquote`/`containsBlockquote` portées dans `src/lib/ubumark/parser/markdown-parser.ts`, garde `childIndex>0` (1er enfant = forme compacte `- > quote` littérale ; ulterieur = vrai blockquote). semantic-roundtrip 49/49.
- **#7 `\np{12345}`** → fix `6ca99c297` (décision PO : gérer `\,`, pas U+202F). Tokenizer mathAST consomme `\,` entre chiffres (miroir de `{,}`) → `12\,345`=nombre `12345` ; convertisseur `\np` (chemin math) sort `\,`. `cda20f960` préservé (implicit-mult 26/26). math-to-custom 64/64.
  - **2 nuances** : `simple.ts` (chemin `\np` **texte**, non re-parsé) garde U+202F (sinon `\,` littéral visible) ; la valeur convertie est le **nombre nu** (`S=12345`), le regroupement d'affichage est réappliqué par le resolver.

_(Historique du diagnostic ci-dessous.)_

**🔴 2 régressions de prod (flaggées, non maquillées)** :

1. **Blockquote dans item de liste** (`markdown-semantic-roundtrip`) : le support a été **perdu au rename `custom-markdown`→`ubumark`** (`d8fbaffed`). `parseContentWithBlockquote`/`containsBlockquote` (ajoutées `3818094ae` dans l'ancien `src/lib/custom-markdown/parser/`) **non portées** dans `src/lib/ubumark/parser/markdown-parser.ts`. → un `> quote` multiligne dans un `- item` n'est plus parsé en nœud blockquote.
2. **`\np{12345}` conversion cassée** (`math-to-custom`) : commit `cda20f960` (« prevent NUMBER from starting implicit multiplication ») casse la conversion LaTeX→custom des entiers formatés. `\np{12345}`→`12⁠345` (espace fine U+202F) ; le parser tokenise ` ` en LETTER et `NUMBER` ne peut plus démarrer une mult implicite après → parse error → `converted: false`. Affecte l'import de nombres formatés.

**Reste : 31 fichiers** (markdown cluster traité ; 2 fichiers restent partiellement rouges sur les régressions ci-dessus, à corriger côté code avec décision David). Notables : `api/srs` 23 (mock isolé, fin), cluster **markdown-roundtrip** (`rich-text` 2 + `ubumark` 2), `challenge-variables` 25 (⚠️ **décision format WIP en attente**, cf. plus haut), `api/migration/migration-review` 3, `exercise-import-export` 4, divers petits (geometry-core exports 7×1, whiteboard 3, evoland 2, questions 4, stores 1, shared/blockly 1) + **5 fichiers client** (`*.svelte.test.ts`). _(challenge-variables retiré : test supprimé.)_

## Reprise — par où continuer (prochaine session)

1. ~~cluster `server/validation/*`~~ — **FAIT 2026-06-12** (9 fichiers, 41 rouges, tous stale, 0 régression — voir journal). Cluster vert (27 fichiers / 1202 tests).
2. ~~cluster modération~~ — **FAIT 2026-06-12** (3 fichiers, 56 rouges). Racine = mock `locals.profile.role` périmé + **1 vraie régression** (`deleteMessageSchema` exigeait `messageId` dans le body → suppression de message cassée en prod, **fix code** appliqué). Pas une décision de contrat. Cluster vert (62 tests).
3. **Prochain lot** : cluster « contrats API » (`assessments` 34, `exercises` 21, `config` 11, `templates routes` 10, `minesweeper-auth` 9, `riddles`, `checkpoint`, `messages`) + `middleware/student-access` 19 + `achievements/migration` 72 (introspection cassée). Garder `api/srs` (mock isolé, tedious) et les exports geometry (mineur) **pour la fin**.
4. **Hors remédiation, à décider avec David** : gate léger (pre-commit `vitest related` ou CI shardé par zone) + corriger/retirer le job `test` de `quality.yml` (il appelle `test:unit`, retiré → erreur à chaque push).

**Règle d'or** : ne jamais réaligner un test sans confirmer que le comportement code actuel est voulu (sinon on masque une vraie régression).
