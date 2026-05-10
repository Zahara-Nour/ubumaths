# Refactor python-exercises validation — Progress

> Document vivant qui suit l'avancement du refactor décrit dans
> `python-validation-refactor-spec.md`. Mis à jour après chaque phase / commit.

---

## État actuel : Phases 1 à 3 terminées

Phases 4–7 restantes.

---

## Phase 1 — Types TS + Zod schemas (terminée)

### Décisions

- **Coexistence** : nouvelles formes ajoutées **à côté** des anciennes. Schémas
  legacy renommés avec suffixe `Legacy` ; nouvelles formes utilisent les noms
  canoniques.
- **Consommateurs API non touchés** : `createExerciseSchema`,
  `updateExerciseSchema`, et le endpoint `/api/python-exercises/[id]/submit`
  pointent explicitement vers les schémas `*Legacy`. Phase 5 les bascule vers
  la nouvelle forme.
- **Worker non touché** : `toWorkerMessageSchema` utilise
  `validateExerciseMessageSchemaLegacy` (et idem pour
  `fromWorkerMessageSchema`). Phase 2 bascule.

### Fichiers modifiés

1. `src/lib/shared/python/types.ts`
   - Ajout `BehaviorCheck`, `ExerciseValidationConfigV2`,
     `ExerciseValidationResultV2`.
2. `src/lib/types/python-exercises.ts`
   - Ajout `BehaviorCheck`, `ValidationConfigV2`, `ValidationResultV2`.
3. `src/lib/server/validation/python-exercises.ts`
   - Renommé `outputValidationConfigSchema` →
     `outputValidationConfigSchemaLegacy` (idem pour `unitTest`, `ast`).
   - Renommé l'export `validationConfigSchema` →
     `validationConfigSchemaLegacy` ; idem pour `validationResultSchema`.
   - Ajouté `behaviorCheckSchema`, `validationConfigSchema` (nouvelle forme
     avec `.refine` "au moins un des deux"), `validationResultSchema` (avec
     `failed_layer` / `behavior_kind`).
   - `createExerciseSchema` et `updateExerciseSchema` pointent vers
     `validationConfigSchemaLegacy`.
4. `src/lib/shared/python/worker/messages.ts`
   - Mêmes renommages côté worker.
   - Ajouté `behaviorCheckSchema`, `failedLayerSchema`, `behaviorKindSchema`,
     nouveaux `exerciseValidationConfigSchema` /
     `exerciseValidationResultSchema` /
     `validateExerciseMessageSchema` /
     `exerciseValidationResultMessageSchema`.
   - `toWorkerMessageSchema` et `fromWorkerMessageSchema` utilisent
     temporairement les versions Legacy (commentaire « Phase 1 transition »).
5. `src/lib/shared/python/index.ts`
   - Re-exports nouveaux types et schémas (Legacy + nouveaux).
6. `src/routes/api/python-exercises/[id]/submit/+server.ts`
   - Utilise `validationResultSchemaLegacy` explicitement.
7. **Nouveau** `src/lib/server/validation/python-exercises.test.ts`
   - 24 tests Zod : round-trip valides, refine au-moins-un, edge cases,
     legacy.

### Tests

- ✅ `pnpm test:server src/lib/server/validation/python-exercises.test.ts`
  → 24 / 24
- ✅ `pnpm test:server src/routes/api/python-exercises` → 75 / 75 (aucune
  régression)
- ✅ `pnpm test:server src/lib/shared/python` → 163 / 163

## Phase 2 — Worker refactor (terminée)

### Décisions

- **Pipeline strict** : `validateExercise` exécute AST puis behavior, avec
  short-circuit sur échec AST. Aucune tolérance au format legacy côté worker.
- **Pré-check syntaxe** : si `ast_requirements` est non vide, un seul
  `ast.parse()` détecte les `SyntaxError` AVANT la boucle des requirements,
  pour produire un message dédié « Erreur de syntaxe Python : ligne N : ... ».
  Sans AST, la behavior layer fait surfacer le runtime error naturellement.
- **`behavior_kind`** : présent dans le résultat dès que `config.behavior` est
  défini, même quand AST short-circuit. Permet à l'UI d'afficher un libellé
  stable.
- **Limite Python interrompible** : `pyodide.runPythonAsync` n'est pas
  interruptible depuis JS sans `SharedArrayBuffer` ; en pratique le timeout
  worker (Promise.race) ne peut pas tuer une boucle infinie. C'est le
  safety-net de l'executor (`pendingExerciseValidation.timeout`) qui rejette
  la promesse. Le test case 8 reflète ce comportement réel (rejet de
  promesse) et est placé en dernier pour ne pas bloquer la suite.

### Fichiers modifiés

1. `src/lib/workers/pyodide.worker.ts`
   - `validateExercise()` reécrite pour le pipeline AST → behavior.
   - Helpers extraits : `runASTChecks`, `runBehavior`, `runOutputBehavior`,
     `runUnitTestBehavior`, `detectSyntaxError`.
   - Imports de types passés à `ExerciseValidationConfigV2`,
     `ExerciseValidationResultV2`, `BehaviorCheck`, `ASTRequirement`.
2. `src/lib/shared/python/worker/messages.ts`
   - `toWorkerMessageSchema` utilise `validateExerciseMessageSchema` (nouveau).
   - `fromWorkerMessageSchema` utilise `exerciseValidationResultMessageSchema`
     (nouveau). Les variantes Legacy restent exportées (pour Phase 6).
3. `src/lib/shared/python/index.ts`
   - Commentaire de transition mis à jour.
4. `src/lib/shared/python/execution/base-executor.svelte.ts`
   - `validateExercise` : signature en `ExerciseValidationConfigV2` →
     `Promise<ExerciseValidationResultV2>`.
5. `src/lib/shared/python/execution/exercise-validation-real.svelte.test.ts`
   - Tous les configs migrés vers la nouvelle forme (`behavior` / `ast_requirements`).
   - Nouvelle section « E. AST + behavior pipeline matrix » : 9 cas du
     tableau de la spec.
6. `src/lib/shared/python/execution/base-executor.svelte.test.ts`
   - Helpers `makeOutputConfig` / `makeResult` migrés vers V2.

### Tests

- ✅ `pnpm test:server src/lib/shared/python` → 187 / 187
- ✅ `pnpm test:server src/routes/api/python-exercises` → 75 / 75
- ✅ `pnpm test:client src/lib/shared/python/execution/base-executor.svelte.test.ts`
  → 14 / 14
- ✅ `pnpm test:client src/lib/shared/python/execution/exercise-validation-real.svelte.test.ts`
  → 31 / 31 (dont les 9 cas matrix)
- ✅ `pnpm check:incremental` → baseline 9 / 46 préservé.

## Phase 3 — DB migration + validation script (terminée)

### Décisions

- **Migration idempotente** : la `WHERE validation_config ? 'type'` évite les
  doubles transformations. Re-run = no-op après le premier passage.
- **Default `comparison: { kind: 'exact' }`** quand `output_comparison`
  n'est pas spécifié dans un AST + output_tests legacy (cohérent avec
  l'ancien comportement de `validateAST` du worker).
- **Down migration documentée en commentaire** dans le fichier de migration
  (pas de fichier séparé). Inclut un garde `RAISE EXCEPTION` pour
  `ast_requirements + behavior.unit_test` (combinaison non représentable en
  legacy).
- **Seed canonique** (`20260508163407`) réécrit en nouvelle forme directement
  pour que `db:reset` produise du data propre. Les autres seeds (les 4
  ajouts récents) restent en ancienne forme et sont transformés par la
  Phase 3 migration au runtime — fonctionnel mais à uniformiser plus tard.
- **Patch obsolète** `20260508180000_update_seeds_for_output_v2.sql` reste
  en place mais devient un no-op (n'a plus de rows `type='output'` à
  patcher après la réécriture du seed).

### Fichiers livrés

1. `supabase/migrations/20260510130000_refactor_python_validation_config.sql`
   - UPDATE avec `CASE WHEN validation_config->>'type' = '…'` pour les 3
     types legacy ; gère `ast` avec ou sans `output_tests`.
   - Down migration documentée en commentaire (paste-and-run en cas de
     rollback).
2. `supabase/migrations/20260508163407_seed_python_exercises_samples.sql`
   - 5 exos seedés réécrits en nouvelle forme (`behavior` /
     `ast_requirements`).
3. `scripts/validate-python-exercises-migration.ts`
   - Parse chaque row avec `validationConfigSchema` (nouveau) et avec
     `validationConfigSchemaLegacy` ; échoue si une row valide en legacy
     (= migration partielle) ou invalide en nouveau.

### Application

- ✅ `pnpm db:migrate` → migration appliquée à la base remote.
- ✅ `pnpm tsx scripts/validate-python-exercises-migration.ts`
  → `12 ok / 0 invalid / 0 still-legacy / 12 total`.
- ✅ `pnpm test:server` → 99/99 (aucune régression sur l'API).

### Prochaines étapes (Phase 4)

- Refonte `ExerciseStrategyEditor.svelte` en deux panneaux indépendants
  (« Forme du code » / « Comportement attendu »).
- Extraction `ASTRequirementsPanel.svelte`.
- Mise à jour de `ExerciseForm.svelte` ligne 135
  (`form.validation_config.type` → `form.validation_config.behavior?.kind`).

### Commits

| #   | Hash      | Message                                                                  |
| --- | --------- | ------------------------------------------------------------------------ |
| 1   | 8b9e6b139 | feat(python-exercises): add new ValidationConfig types                   |
| 2   | b58b54582 | feat(python-exercises): refactor worker to AST + behavior pipeline       |
| 3   | _à venir_ | feat(python-exercises): migrate validation_config to ast+behavior schema |
