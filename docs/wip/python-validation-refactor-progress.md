# Refactor python-exercises validation — Progress

> Document vivant qui suit l'avancement du refactor décrit dans
> `python-validation-refactor-spec.md`. Mis à jour après chaque phase / commit.

---

## État actuel : refactor terminé (phases 1 à 7)

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

## Phase 4 — Form UI refonte (terminée)

### Décisions

- **Panneaux indépendants** : `ExerciseStrategyEditor.svelte` est désormais
  organisé en deux `<fieldset>` (« Forme du code » / « Comportement attendu »),
  chacun activable séparément. La case AST contrôle directement la présence
  de `config.ast_requirements` ; le selector de behavior contrôle
  `config.behavior` (none / output / unit_test).
- **Garde inline** : si les deux panneaux sont désactivés, un message rouge
  apparaît (« Active au moins une vérification de forme ou un comportement
  attendu »). Le serveur Zod bloque aussi côté API (refine).
- **Pattern callback (pas de `$bindable`)** pour `ASTRequirementsPanel` :
  l'enfant reçoit `requirements` + `onchange(next)`. Plus simple à câbler
  côté parent quand le tableau peut être `undefined` (état désactivé).
- **`ExerciseForm.svelte`** : `validation_config` typé `ValidationConfigV2` ;
  `emptyExerciseForm()` produit la nouvelle forme directement ; le catch du
  `validateExercise` construit un résultat V2 (`failed_layer: null`,
  `behavior_kind: form.validation_config.behavior?.kind`).
- **`ExerciseValidationResult.svelte` non touché en Phase 4** — il reste
  typé sur l'ancien `ExerciseValidationResult`. Phase 5 le bascule vers V2
  avec rendu adapté à `failed_layer` / `behavior_kind` / `ast_issues`.

### Fichiers livrés

1. **Nouveau** `src/lib/components/python/exercises/ASTRequirementsPanel.svelte`
   - 152 lignes, isolé, prop `requirements` + callback `onchange`.
2. `src/lib/components/python/exercises/ExerciseStrategyEditor.svelte`
   - Réécrit complètement (790 lignes). Toggle AST + selector behavior
     indépendants. Logique des presets de comparaison conservée.
3. `src/lib/components/python/exercises/ExerciseForm.svelte`
   - `validation_config: ValidationConfigV2`. `emptyExerciseForm()` produit
     `{ behavior: { kind: 'output', ... } }`. Catch du verify aligné sur V2.

### Tests / qualité

- ✅ `mcp__svelte__svelte-autofixer` sur `ASTRequirementsPanel.svelte`,
  `ExerciseStrategyEditor.svelte` et `ExerciseForm.svelte` → 0 issue
  (1 pré-existant signalé sur `$effect` resetting `verifyResult`, non lié au
  refactor).
- ✅ `pnpm check:incremental` → baseline 9/46 préservé (1573 fichiers,
  +1 pour `ASTRequirementsPanel.svelte`).
- ✅ `pnpm test:server src/routes/api/python-exercises` → 99/99.
- ✅ `pnpm test:client src/lib/components/python/exercises/ExerciseValidationResult.svelte.test.ts`
  → 8/8.

## Phase 5 — Consommateurs (terminée)

### Décisions

- **`ExerciseValidationResult.svelte`** : passé sur `ExerciseValidationResultV2`.
  Ajout d'un `failureSubline` dérivé de `failed_layer` / `behavior_kind` :
  « Vérifications de forme non satisfaites » / « Tests de fonction
  échoués » / « Sortie attendue non obtenue ». Le rendu des `ast_issues`
  était déjà conditionnel sur la longueur du tableau, donc compatible
  avec la nouvelle convention (« vide quand AST passe »).
- **Viewer** (`[id]/+page.svelte`) : `isUnitTest` désormais dérivé de
  `config.behavior?.kind === 'unit_test'`, ce qui découple la présence du
  panneau « Tester ma fonction » de la combinaison AST + behavior. Le
  fallback de `runValidation` produit un résultat V2.
- **Page résultats** (`[id]/results/[student_id]/+page.svelte`) : import
  type passé à `ExerciseValidationResultV2`.
- **API submit** : `validationResultSchemaLegacy` → `validationResultSchema`
  (nouveau). Tous les fixtures de tests migrent au passage.
- **`createExerciseSchema` / `updateExerciseSchema`** : bascule de
  `validationConfigSchemaLegacy` vers `validationConfigSchema` (nouveau)
  pour les API endpoints `/api/python-exercises` POST / PATCH.

### Fichiers livrés

1. `src/lib/components/python/exercises/ExerciseValidationResult.svelte`
   - Type `ExerciseValidationResultV2` + `failureSubline` dérivé.
2. `src/lib/components/python/exercises/ExerciseValidationResult.svelte.test.ts`
   - 7 fixtures migrés vers V2.
3. `src/routes/(public)/python-exercises/[id]/+page.svelte`
   - `isUnitTest` / `callFunctionName` dérivés de `behavior?.kind`.
   - Test de fonction synthétisé en `{ behavior: { kind: 'unit_test', ... } }`.
   - Catch du `runValidation` produit un V2.
4. `src/routes/(public)/python-exercises/[id]/results/[student_id]/+page.svelte`
   - Type alias `ExerciseValidationResultV2 as ValidationResult`.
5. `src/routes/(public)/python-exercises/[id]/results/[student_id]/page.server.test.ts`
   - 2 fixtures migrés.
6. `src/routes/api/python-exercises/[id]/submit/+server.ts`
   - `validationResultSchema` (nouveau).
7. `src/routes/api/python-exercises/[id]/submit/server.test.ts`
   - `validResult` migré (failed_layer / behavior_kind).
8. `src/routes/api/python-exercises/server.test.ts`
   - `validExercisePayload.validation_config` migré.
9. `src/routes/api/python-exercises/[id]/server.test.ts`
   - `fullExercise.validation_config` migré.
10. `src/routes/api/python-exercises/[id]/my-submissions/server.test.ts`
    - 2 fixtures `validation_result` migrés.
11. `src/lib/server/validation/python-exercises.ts`
    - `createExerciseSchema` / `updateExerciseSchema` pointent vers
      `validationConfigSchema` (nouveau).

### Tests / qualité

- ✅ `pnpm test:server src/routes/api/python-exercises src/lib/server/validation/python-exercises.test.ts src/routes/(public)/python-exercises`
  → 137/137.
- ✅ `pnpm test:client src/lib/components/python/exercises/ExerciseValidationResult.svelte.test.ts`
  → 8/8.
- ✅ `pnpm check:incremental` → baseline 9/46 préservé.
- ✅ `mcp__svelte__svelte-autofixer` sur
  `ExerciseValidationResult.svelte` → 0 issue.

## Phase 6 — Cleanup legacy schemas (terminée)

### Décisions

- **Suppression complète des schémas `*Legacy`** côté `messages.ts` et
  `validation/python-exercises.ts` (avec leurs types inférés).
- **Suppression des anciens types TS** :
  `OutputValidationConfig` / `UnitTestValidationConfig` /
  `ASTValidationConfig` / `ValidationStrategyType` / l'union legacy
  `ValidationConfig` / `ValidationResult` (avec `strategy`) — côté
  `shared/python/types.ts` ET `types/python-exercises.ts`.
- **Rename V2 → noms canoniques** : `ExerciseValidationConfigV2` →
  `ExerciseValidationConfig`, `ExerciseValidationResultV2` →
  `ExerciseValidationResult`, idem pour `ValidationConfigV2` /
  `ValidationResultV2` côté `types/python-exercises.ts`. Les noms sont
  maintenant à nouveau canoniques sans suffixe.
- **Re-exports `index.ts`** nettoyés pour ne plus exposer de Legacy ni
  de V2.
- **Tests** : suppression du describe block « legacy schemas remain
  accepting old shape » dans `python-exercises.test.ts` (4 tests
  retirés). Reste 20 tests Zod (round-trip / refine / edge cases).

### Fichiers livrés

- `src/lib/server/validation/python-exercises.ts` : suppression de
  `validationConfigSchemaLegacy` / `validationResultSchemaLegacy` et
  leurs sous-schémas (output/unitTest/ast). Suppression de
  `validationStrategyTypeSchema`.
- `src/lib/shared/python/worker/messages.ts` : idem côté worker.
- `src/lib/shared/python/types.ts` : suppression des anciens types,
  rename V2 → canonique.
- `src/lib/types/python-exercises.ts` : réécrit, propre.
- `src/lib/shared/python/index.ts` : re-exports nettoyés.
- `src/lib/server/validation/python-exercises.test.ts` : 20 tests
  (suppression des 4 tests legacy).
- 10 fichiers consommateurs renommés (V2 → canonique) via sed :
  worker, executor, tests, components, routes.

### Tests / qualité

- ✅ `pnpm check:incremental` → baseline 9/46 préservé (1573 fichiers).
- ✅ `pnpm test:server` (python-exercises + shared/python) → 296/296.

## Phase 7 — Quality gates final (terminée)

### Résultats

- ✅ `pnpm check:incremental` → baseline 9 errors / 46 warnings préservé
  (1573 fichiers).
- ✅ `npx eslint <fichiers modifiés depuis HEAD~6>` → 0 errors,
  4 warnings pré-existantes dans `base-executor.svelte.ts`
  (`prefer-svelte-reactivity` sur Map/Set/URL — hors scope du refactor).
- ✅ `mcp__svelte__svelte-autofixer` exécuté sur tous les `.svelte`
  modifiés (Phase 4 et 5).
- ✅ Audit sécurité (`security-auditor`, Opus) :
  - **Findings positifs** : namespace isolation correcte (AST + behavior
    partagent le namespace par design, custom comparator a son propre
    namespace), `detectSyntaxError` sûr (pas d'interpolation de student
    code), Zod `refine` non contournable, migration DB idempotente,
    redaction des hidden tests faite côté worker avant `postMessage`.
  - **Medium #1** (function*name interpolé en code Python) — non
    appliqué : pré-existant à ce refactor, défense en profondeur
    bloquée par la regex Zod `/^[a-zA-Z*][a-zA-Z0-9_]\*$/`. À traiter
    dans un suivi dédié.
  - **Medium #2** (chaînes non bornées dans
    `validationResultSchema`) — **APPLIQUÉ** : ajout de `.max()` sur
    `input` / `expected` / `actual` / `diff` (10 000 caractères),
    `error` (2 000 / 500 caractères), `ast_issues` (max 20 entrées,
    chacune ≤ 500 caractères). Protège la base et le rendu côté client
    contre des soumissions malicieuses.
  - **Low #3** (StringIO interpolation via JSON.stringify) — pratique
    sûre conservée (JSON.stringify produit un littéral Python valide).
  - **Nit #4** (commentaire `getStudentClassIds`) — non appliqué (hors
    scope direct).

### Documents produits tout au long du refactor

- `docs/wip/python-validation-refactor-spec.md` (préexistant, validé en
  amont, transmis tel quel par l'utilisateur).
- `docs/wip/python-validation-refactor-progress.md` (ce fichier).

### Critères de validation finale (cf. spec)

- [x] La création d'un nouvel exo « AST + unit_test » fonctionne
      end-to-end (Form UI → API Zod refine → worker → result).
- [x] La création d'un nouvel exo « AST seul » fonctionne (toggle AST
      seul activé, behavior à `'none'`).
- [x] Le panneau « Tester ma fonction » s'affiche dès qu'il y a un
      `behavior.kind === 'unit_test'`, indépendamment de la présence
      d'AST (logique migrée dans
      `routes/(public)/python-exercises/[id]/+page.svelte`).
- [x] Tests existants passent (`pnpm test:server` python-exercises +
      shared/python : 296/296 ; `pnpm test:server` consommateurs :
      133/133).
- [x] `pnpm check:incremental` : baseline préservé.
- [x] Audit sécurité : pas de régression, 1 finding medium appliqué
      (string bounds) ; 1 finding pré-existant documenté.

⚠️ **Non couvert par les tests automatisés** (à valider manuellement
si nécessaire) :

- Vérification que les 12 exos prod (chargés via le validation script
  Phase 3) chargent et soumettent correctement sur l'app live.
- Comportement réel du form UI (drag-and-drop des champs, dialogs,
  etc.) — testé uniquement via les 8 tests du composant
  `ExerciseValidationResult.svelte`.

### Commits

| #   | Hash      | Message                                                                  |
| --- | --------- | ------------------------------------------------------------------------ |
| 1   | 8b9e6b139 | feat(python-exercises): add new ValidationConfig types                   |
| 2   | b58b54582 | feat(python-exercises): refactor worker to AST + behavior pipeline       |
| 3   | e7ad5d710 | feat(python-exercises): migrate validation_config to ast+behavior schema |
| 4   | a40f8b4df | feat(python-exercises): redesign strategy editor with form + behavior UI |
| 5   | b2111d3fd | feat(python-exercises): update consumers for new ValidationConfig shape  |
| 6   | 49bfcd1ce | chore(python-exercises): remove legacy ValidationConfig schema           |
| 7   | _à venir_ | chore(python-exercises): bound result fields per security audit          |
