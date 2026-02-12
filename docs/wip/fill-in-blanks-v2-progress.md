# Fill-in-Blanks Redesign v2 — Progress

## Phase 1: TypeScript Types (COMPLETE)

### Status: Done

### Changes Summary

**Core type refactoring**: Removed `type` field from `QuestionTemplate` and `QuestionInstance`, replaced with inferred `getQuestionType()` function. 7 old types collapsed to 2: `fill_in_blanks` (no choices) and `multiple_choice` (has choices).

### Decisions Made

1. **Type inference via `getQuestionType()`** — `choices` present (et non-vide) = `multiple_choice`, sinon = `fill_in_blanks`. `choices: []` est traite comme `fill_in_blanks`.
2. **`transformType` supprime** — Supprime de types.ts, Zod schemas, API endpoints, migration transformer, QuestionTemplateForm, AnswerEditor. La colonne DB `transform_type` reste mais n'est plus lue/ecrite par le code.
3. **`fill_in_blanks` requires `blanks[]` OR `solution`** — Every fill_in_blanks question must define expected answers somewhere. Either `blanks[]` array or `solution` field is required.
4. **Legacy answer validation fallback** — Without `blanks[]`, uses `areEquivalent` (symbolic) when no precision, `validateNumerical` when precision is set. Supporte multi-answer (pair-wise validation).
5. **DB type column conservee** — Les endpoints API calculent `type` pour la colonne DB (indexation/requetes) mais le champ n'existe plus dans le modele TypeScript.

### Files Modified

| File                                                                         | Changes                                                                                                                                                 |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/questions/types.ts`                                                 | Removed `type` from interfaces, added `getQuestionType()`, `InstanceBlank`, `blankDefaults`, `answerFormats`, `expressions`, deprecated `transformType` |
| `src/lib/ubumark/types/ast.ts`                                               | `BlankNode.index`/`InputState.index` JSDoc 1-based→0-based, added `expressionName` on math nodes                                                        |
| `src/lib/utils/answer-validator.ts`                                          | `switch(type)` → `if(getQuestionType())`, removed `validateNumericalWithUnit`, smart fallback                                                           |
| `src/lib/questions/generator/instance-generator.ts`                          | Adapted to new types, builds `InstanceBlank[]`, optional solution                                                                                       |
| `src/lib/questions/generator/content-resolver.ts`                            | `resolveSolution` accepts undefined                                                                                                                     |
| `src/lib/questions/validators/template-validator.ts`                         | Type inferred, fill_in_blanks requires blanks[] OR solution                                                                                             |
| `src/lib/migration/test-transformer-examples.ts`                             | `getQuestionType(template)` instead of `template.type`                                                                                                  |
| `src/lib/questions/validators/template-validator.test.ts`                    | Removed all `type:` refs, updated tests for inferred types                                                                                              |
| `src/lib/utils/answer-validator.test.ts`                                     | Removed `type:` from instances, fixed blanks structure                                                                                                  |
| `src/lib/questions/generator/instance-generator.test.ts`                     | Removed `type:` from templates                                                                                                                          |
| `src/lib/questions/generator/test-exact-repro.test.ts`                       | Removed `type:`                                                                                                                                         |
| `src/routes/api/questions/templates/+server.ts`                              | Compute `type` for DB column from structure                                                                                                             |
| `src/routes/api/questions/templates/[id]/+server.ts`                         | Compute `type` for DB column from structure                                                                                                             |
| `src/routes/api/questions/generate/[id]/+server.ts`                          | Removed `type` from `dbRowToQuestionTemplate`                                                                                                           |
| `src/lib/components/QuestionTemplateCard.svelte`                             | `getQuestionType(template)`, simplified to 2 types                                                                                                      |
| `src/lib/components/QuestionPreview.svelte`                                  | Uses `getQuestionType()`                                                                                                                                |
| `src/lib/components/questions/FlashCard.svelte`                              | Adapted to inferred type                                                                                                                                |
| `src/lib/components/questions/QuestionCard.svelte`                           | Adapted to inferred type                                                                                                                                |
| `src/lib/components/questions/CorrectionCard.svelte`                         | Adapted to inferred type                                                                                                                                |
| `src/lib/components/questions/QuestionPreviewBaseCard.svelte`                | Adapted to inferred type                                                                                                                                |
| `src/lib/slides/core/QuestionSlide.svelte`                                   | Adapted to inferred type                                                                                                                                |
| `src/routes/(protected)/dashboard/admin/questions/+page.svelte`              | Badge uses `getQuestionType()`                                                                                                                          |
| `src/routes/(protected)/dashboard/admin/questions/[id]/preview/+page.svelte` | Badge uses `getQuestionType()`                                                                                                                          |
| `src/routes/(public)/demo/question-display-demo/+page.svelte`                | Removed `type:` from instances                                                                                                                          |
| `src/routes/(protected)/dashboard/admin/debug/question-display/+page.svelte` | `getQuestionType()` for display                                                                                                                         |

### Code Review Findings (post-commit fixes)

Issues corrigees apres code review (`code-reviewer` agent) :

1. **`getQuestionType()` edge case** — `choices: []` retournait `multiple_choice`, corrige pour retourner `fill_in_blanks`
2. **Fallback multi-answer** — Le fallback prenait `solution[0]` pour les arrays, corrige avec validation pair-wise
3. **Test mis a jour** — Test "should fail multiple_choice without choices" adapte au nouveau comportement

Issues documentees pour phases suivantes :

- Per-blank validation config (precision, requiredForm, unit) → Phase 4
- `expectedAnswerLatex` non peuple → Phase 3
- Inference type blank (math vs text) → Phase 3

### Test Results

- **1803 passed** | 7 failed (all pre-existing) | 5 skipped
- Pre-existing failures: variable-resolver (2), instance-generator (3), color-integration (2)
- Zero new test failures introduced

### User Feedback Fix

- **`blanks[]` ne doit PAS etre optionnel** — L'utilisateur a insiste : chaque question fill_in_blanks doit definir ses reponses attendues. Le validateur exige desormais `blanks[]` OU `solution`. 3 tests mis a jour + 1 nouveau test ajoute.

### Commit

- `b3fcaee6` — 27 files changed, 607 insertions, 569 deletions

### Next Steps

- **Phase 2**: Parser ubumark + `assignBlankIndices` (Steps 3-4)
- **Phase 3**: Pipeline de generation (Step 6)
