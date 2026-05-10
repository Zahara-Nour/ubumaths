# Refactor python-exercises validation — Progress

> Document vivant qui suit l'avancement du refactor décrit dans
> `python-validation-refactor-spec.md`. Mis à jour après chaque phase / commit.

---

## État actuel : Phases 1 et 2 terminées

Phases 3–7 restantes.

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

### Prochaines étapes (Phase 3)

- Migration DB : SQL `UPDATE python_exercises SET validation_config = ...`
  avec `CASE WHEN type = '…'` pour les 3 formes anciennes.
- Migration `down` (transformation inverse).
- Réécriture du seed `20260508163407_seed_python_exercises_samples.sql`.
- Script `scripts/validate-python-exercises-migration.ts` qui parse old + new
  pour chaque exo et vérifie l'équivalence sémantique.

### Commits

| #   | Hash      | Message                                                            |
| --- | --------- | ------------------------------------------------------------------ |
| 1   | 8b9e6b139 | feat(python-exercises): add new ValidationConfig types             |
| 2   | _à venir_ | feat(python-exercises): refactor worker to AST + behavior pipeline |
