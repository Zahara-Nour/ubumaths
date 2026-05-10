# Refactor python-exercises validation — Progress

> Document vivant qui suit l'avancement du refactor décrit dans
> `python-validation-refactor-spec.md`. Mis à jour après chaque phase / commit.

---

## État actuel : Phase 1 terminée

Phases 2–7 restantes.

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

### Prochaines étapes (Phase 2)

- Refactorer `validateExerciseCode()` dans `src/lib/workers/pyodide.worker.ts`
  pour pipeline AST → behavior avec short-circuit.
- Worker n'accepte que la nouvelle forme : remettre
  `validateExerciseMessageSchema` (sans Legacy) dans `toWorkerMessageSchema`.
- Idem pour `exerciseValidationResultMessageSchema` côté
  `fromWorkerMessageSchema`.
- Tests des 9 cas du tableau de la spec.

### Commits

| #   | Hash      | Message                                                |
| --- | --------- | ------------------------------------------------------ |
| 1   | _à venir_ | feat(python-exercises): add new ValidationConfig types |
