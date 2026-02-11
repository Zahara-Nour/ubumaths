# Fill-in-Blanks Redesign — Progress

**Last updated**: 2026-02-11

## Phase 1: Define updated TypeScript types ✅

### Status: COMPLETE

### Changes made

| File                                           | Change                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/questions/types.ts`                   | `QuestionType` → 3 values (`fill_in_blanks`, `multiple_choice`, `open_answer`). `AlgebraicTransformType` marked deprecated. `answerFormat` added to `SharedVariationDefaults`, `QuestionVariation`, `QuestionInstance`. `blanks` enriched with `type: 'math' \| 'text'` and `pool?: string[]`. `transformType` marked deprecated on `QuestionTemplate` and `QuestionInstance`. |
| `src/lib/questions/legacy-type-mapper.ts`      | NEW — `mapLegacyType()` maps old 7 types to new 3. `isLegacyType()` identifies old types.                                                                                                                                                                                                                                                                                      |
| `src/lib/questions/legacy-type-mapper.test.ts` | NEW — 31 tests covering type mapping, legacy detection, and new type structure.                                                                                                                                                                                                                                                                                                |

### Decisions

- `AlgebraicTransformType` and `transformType` kept as deprecated (not removed) to avoid breaking 27+ files. Will be fully removed in Phase 6.
- 3 pre-existing failures in `instance-generator.test.ts` confirmed unrelated (LaTeX resolution, validation edge cases).

### Blast radius inventory (27+ files referencing old types)

Files to fix in subsequent phases:

- Phase 3: `instance-generator.ts`, `content-resolver.ts`
- Phase 4: `FlashCard.svelte`, `QuestionCard.svelte`, `FillBlanksInput.svelte`, `MathInput.svelte`
- Phase 5: `answer-validator.ts`
- Phase 6: `question-transformer.ts`, `migration-review.ts`
- Later: `QuestionTemplateForm.svelte`, `AnswerEditor.svelte`, admin pages, demo pages, scripts

---

## Phase 2: Add [_] support in ubumark parser — PENDING

## Phase 3: Adapt generation pipeline — PENDING

## Phase 4: Implement new FillBlanksInput — PENDING

## Phase 5: Adapt validation — PENDING

## Phase 6: Update migration transformer — PENDING

## Phase 7: Create math vocabulary dictionary FR — PENDING

## Phase 8: Integration tests + DB import — PENDING
