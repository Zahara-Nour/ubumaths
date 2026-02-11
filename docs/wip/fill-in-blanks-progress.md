# Fill-in-Blanks Redesign — Progress

**Last updated**: 2026-02-11

## Phase 1: Define updated TypeScript types ✅

### Status: COMPLETE (commit `872b4a01`)

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

## Phase 2: Add [_] support in ubumark parser ✅

### Status: COMPLETE (commit `82b6d01f`)

### Changes made

| File                                                         | Change                                                                                                               |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `src/lib/ubumark/parser/markdown-parser.ts`                  | Added `TEXT_BLANK_REGEX`, `parseTextForTextBlanks()`, `isInsideCodeSpan()`. Step 1b in pipeline after `{{blank:N}}`. |
| `src/lib/ubumark/__tests__/parser/text-blank-parser.test.ts` | NEW — 10 tests for `[_]` parsing.                                                                                    |

---

## Phase 3: Adapt generation pipeline ✅

### Status: COMPLETE (commit `543df8a7`)

### Changes made

| File                                                 | Change                                                                       |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/lib/questions/generator/blank-resolver.ts`      | NEW — `resolveBlanks()`, `buildAnswerFormatExpression()`, `findMathZones()`. |
| `src/lib/questions/generator/blank-resolver.test.ts` | NEW — 16 tests.                                                              |
| `src/lib/questions/generator/instance-generator.ts`  | Merge `answerFormat`/`requiredForm` in shared, step 7b for fill_in_blanks.   |

---

## Phase 4: Implement new FillBlanksInput — PENDING

---

## Phase 5: Adapt validation ✅

### Status: COMPLETE

### Changes made

| File                                         | Change                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/utils/fuzzy-text-validator.ts`      | NEW — `normalizeText()` (NFD+lowercase+trim+collapse spaces), `levenshteinDistance()` (O(min(m,n)) space), `fuzzyTextMatch()` (exact for 1-2 chars, Levenshtein ≤ 1 for 3+).                                                                                                                                     |
| `src/lib/utils/fuzzy-text-validator.test.ts` | NEW — 35 tests (normalization, Levenshtein, fuzzy matching, multi-word, whitespace).                                                                                                                                                                                                                             |
| `src/lib/utils/answer-validator.ts`          | `validateBlanks()` now type-aware: `BlankInfo` interface, math → `areEquivalent()`, text → `fuzzyTextMatch()`, pool → fuzzy pool match. Per-blank results in `blankResults`. Legacy types handled via string cast in switch. Added `open_answer` case. Removed `fill_in_blanks` from `validateWithSolutionPool`. |
| `src/lib/utils/answer-validator.test.ts`     | Added 10 tests for type-aware `validateBlanks`.                                                                                                                                                                                                                                                                  |
| `src/lib/types/question-display.ts`          | Added `blankResults` field to `ValidationResult`.                                                                                                                                                                                                                                                                |

### Decisions

- Pool validation uses `fuzzyTextMatch` against each pool item (accent/case tolerant).
- `validateWithSolutionPool` no longer handles `fill_in_blanks` — it always goes through `validateBlanks`.
- Legacy types (`numerical_exact`, etc.) still work via `typeStr = type as string` cast in switch.

### Test results

- 35/35 fuzzy-text-validator tests pass
- 65/65 answer-validator tests pass (55 existing + 10 new)
- No regressions

---

## Phase 6: Update migration transformer — PENDING

## Phase 7: Create math vocabulary dictionary FR — PENDING

## Phase 8: Integration tests + DB import — PENDING
