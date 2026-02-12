# Fill-in-Blanks Redesign v2 — Progress

## Phase 1: TypeScript Types (COMPLETE)

### Status: Done

### Changes Summary

**Core type refactoring**: Removed `type` and `transformType` fields from `QuestionTemplate` and `QuestionInstance`, replaced with inferred `getQuestionType()` function. 7 old types collapsed to 2: `fill_in_blanks` (no choices) and `multiple_choice` (has choices). `transformType` entirely removed from codebase and DB. Legacy `solutionPool` replaced by `orderIndependent` flag on `blanks[]`.

### Decisions Made

1. **Type inference via `getQuestionType()`** — `choices` present (et non-vide) = `multiple_choice`, sinon = `fill_in_blanks`. `choices: []` est traite comme `fill_in_blanks`.
2. **`transformType` entierement supprime** — Supprime de types.ts, Zod schemas, API endpoints, migration transformer, QuestionTemplateForm, AnswerEditor, scripts, et colonne DB (migration `20260212162248_drop_transform_type_column.sql`).
3. **`fill_in_blanks` requiert `blanks[]`** — Chaque question fill_in_blanks doit definir `blanks[]`. Pas de champ `solution` pour fill_in_blanks. Le champ `solution` n'existe que pour `multiple_choice`.
4. **DB type column conservee** — Les endpoints API calculent `type` pour la colonne DB (indexation/requetes) mais le champ n'existe plus dans le modele TypeScript.
5. **`solutionPool` remplace par `orderIndependent`** — L'ancien `options.solutionPool` (base sur `solution`) est remplace par `options.orderIndependent` (base sur `blanks[]`). La logique de pool matching est integree dans `validateBlanks()`. Concerne 4 questions sur 633.

### Files Modified

| File                                                                         | Changes                                                                                                                                         |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/questions/types.ts`                                                 | Removed `type`/`transformType`, added `getQuestionType()`, `InstanceBlank`, `blankDefaults`, `answerFormats`, `expressions`, `orderIndependent` |
| `src/lib/ubumark/types/ast.ts`                                               | `BlankNode.index`/`InputState.index` JSDoc 1-based→0-based, added `expressionName` on math nodes                                                |
| `src/lib/utils/answer-validator.ts`                                          | Removed `validateWithSolutionPool`, legacy solution fallback. `validateBlanks()` supporte `orderIndependent`. Constraints utilisent `blanks[]`. |
| `src/lib/utils/answer-validator.test.ts`                                     | Rewritten: `blanks[]` partout, zero `solution` pour fill_in_blanks, `orderIndependent` remplace `solutionPool`                                  |
| `src/lib/questions/generator/instance-generator.ts`                          | Adapted to new types, builds `InstanceBlank[]`                                                                                                  |
| `src/lib/questions/generator/content-resolver.ts`                            | `resolveSolution` accepts undefined                                                                                                             |
| `src/lib/questions/validators/template-validator.ts`                         | Type inferred, fill_in_blanks requires `blanks[]` (no solution)                                                                                 |
| `src/lib/questions/validators/template-validator.test.ts`                    | Rewritten: removed all `type:` refs, fill_in_blanks uses `blanks[]` only                                                                        |
| `src/lib/migration/question-transformer.ts`                                  | Removed `AlgebraicTransformType`/`transformType`, `solutionPool` → `orderIndependent`                                                           |
| `src/lib/migration/test-transformer-examples.ts`                             | `getQuestionType(template)` instead of `template.type`                                                                                          |
| `src/lib/server/validation/questions.ts`                                     | Removed `transformType` from Zod schemas                                                                                                        |
| `src/lib/questions/generator/instance-generator.test.ts`                     | Removed `type:` from templates                                                                                                                  |
| `src/lib/questions/generator/test-exact-repro.test.ts`                       | Removed `type:`                                                                                                                                 |
| `src/routes/api/questions/templates/+server.ts`                              | Compute `type` for DB column, removed `transform_type` write                                                                                    |
| `src/routes/api/questions/templates/[id]/+server.ts`                         | Compute `type` for DB column, removed `transform_type` write                                                                                    |
| `src/routes/api/questions/generate/[id]/+server.ts`                          | Removed `type` and `transformType` from `dbRowToQuestionTemplate`                                                                               |
| `src/lib/components/QuestionTemplateCard.svelte`                             | `getQuestionType(template)`, simplified to 2 types                                                                                              |
| `src/lib/components/QuestionPreview.svelte`                                  | Uses `getQuestionType()`                                                                                                                        |
| `src/lib/components/QuestionTemplateForm.svelte`                             | Removed `transformType` state, algebraic_transform branch, AnswerEditor prop                                                                    |
| `src/lib/components/AnswerEditor.svelte`                                     | Removed `transformType` prop, `TRANSFORM_TYPES`, algebraic transform UI section                                                                 |
| `src/lib/components/questions/FlashCard.svelte`                              | Adapted to inferred type                                                                                                                        |
| `src/lib/components/questions/QuestionCard.svelte`                           | Adapted to inferred type                                                                                                                        |
| `src/lib/components/questions/CorrectionCard.svelte`                         | Adapted to inferred type                                                                                                                        |
| `src/lib/components/questions/QuestionPreviewBaseCard.svelte`                | Adapted to inferred type                                                                                                                        |
| `src/lib/slides/core/QuestionSlide.svelte`                                   | Adapted to inferred type                                                                                                                        |
| `src/routes/(protected)/dashboard/admin/questions/+page.svelte`              | Badge uses `getQuestionType()`                                                                                                                  |
| `src/routes/(protected)/dashboard/admin/questions/[id]/preview/+page.svelte` | Badge uses `getQuestionType()`                                                                                                                  |
| `src/routes/(public)/demo/question-display-demo/+page.svelte`                | Removed `type:` from instances                                                                                                                  |
| `src/routes/(protected)/dashboard/admin/debug/question-display/+page.svelte` | `getQuestionType()` for display                                                                                                                 |
| `scripts/import-questions-to-db.ts`                                          | Removed `transformType` from interface and DB insert                                                                                            |
| `scripts/validate-phase1-questions.ts`                                       | Removed `algebraic_transform` validation case                                                                                                   |
| `src/lib/types/database.ts`                                                  | Regenerated after dropping `transform_type` column                                                                                              |
| `docs/wip/options-migration-reference.md`                                    | `solutionPool` → `orderIndependent`                                                                                                             |
| `docs/wip/question-migration-status.md`                                      | `solutionPool` → `orderIndependent`                                                                                                             |

### Files Created

| File                                                                | Description                            |
| ------------------------------------------------------------------- | -------------------------------------- |
| `supabase/migrations/20260212162248_drop_transform_type_column.sql` | DB migration: drop constraint + column |

### Code Review Findings (post-commit fixes)

Issues corrigees apres code review (`code-reviewer` agent) :

1. **`getQuestionType()` edge case** — `choices: []` retournait `multiple_choice`, corrige pour retourner `fill_in_blanks`
2. **Test mis a jour** — Test "should fail multiple_choice without choices" adapte au nouveau comportement

Issues documentees pour phases suivantes :

- **Per-blank validation config** → Phase 4 : les types `InstanceBlank` declarent `precision`, `requiredForm`, `unit` per-blank, mais `validateBlanks()` ne les utilise pas encore (fait seulement `areEquivalent` ou string match).
- **`expectedAnswerLatex` non peuple** → Phase 3 : champ declare sur `InstanceBlank` mais jamais rempli par le generateur. Sert pour le flash back (afficher la bonne reponse en LaTeX apres correction).
- **Inference type blank (math vs text)** → Phase 3 : `InstanceBlank.type` doit etre infere du contexte par le generateur — `'math'` si le `?` est dans `$...$`, `'text'` si `[_]` est dans du texte. `assignBlankIndices` connait ce contexte.

### Test Results

- **1803 passed** | 7 failed (all pre-existing) | 5 skipped
- Pre-existing failures: variable-resolver (2), instance-generator (3), color-integration (2)
- Zero new test failures introduced

### User Feedback Fixes

1. **`blanks[]` obligatoire pour fill_in_blanks** — Le validateur exige `blanks[]` pour toute question fill_in_blanks. Pas de fallback `solution`.
2. **Pas de `solution` pour fill_in_blanks** — Le champ `solution` n'existe que pour `multiple_choice`. Tous les tests ont ete reecrits pour refleter cette regle.
3. **`transformType` entierement supprime** — Y compris la colonne DB `transform_type` et sa contrainte, les scripts d'import/validation, et les composants Svelte.
4. **`solutionPool` remplace par `orderIndependent`** — L'ancien mecanisme base sur `solution` est remplace par un flag `options.orderIndependent` qui utilise `blanks[]`. `validateWithSolutionPool` supprime, logique integree dans `validateBlanks()`.

### Commits

- `9a8c5fe4` — refactor: remove type field from QuestionTemplate/QuestionInstance, infer from structure
- `3e8801c1` — chore: regenerate database types after dropping transform_type column
- `f6ac75a6` — docs: remove all transformType references from documentation
- `69d504bd` — docs: update Phase 1 progress with corrected decisions and complete file list
- `6114e256` — refactor: remove legacy solution fallback from answer-validator
- `1bb8e41a` — refactor: replace solutionPool with orderIndependent on blanks[]

### Next Steps

- **Phase 2**: Parser ubumark + `assignBlankIndices` (Steps 3-4)
- **Phase 3**: Pipeline de generation (Step 6)
