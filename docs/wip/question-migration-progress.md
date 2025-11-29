# Question Migration Progress

> **Plan**: `/Users/david/.claude/plans/foamy-purring-cerf.md`
> **Branche**: `migration/questions`
> **Derniere mise a jour**: 2025-11-29

---

## Current Phase: COMPLETED ✅

## Last Commit: fbcf944b

### Phase 9: Display Options Mapping ✅

- [x] Map 6 generation options to `defaultDisplayOptions` (shuffle-terms, shuffle-factors, etc.)
- [x] Map 2 formatting options (exp-no-spaces, exp-allow-unecessary-zeros)
- [x] Add `shuffleChoices` to QuestionTemplate options type
- [x] Add `displayOptionsMapped` to TransformStats
- [x] Add 10 new tests for display options mapping
- [x] Total: 49 tests pass for question-transformer

### Phase 8: Image Upload to Supabase ✅

- [x] Downloaded 214 images from old Supabase project
- [x] Improved migration script with retry logic and reduced batch size
- [x] Uploaded all 214 images to new Supabase bucket `question-images`
- [x] Generated URL mapping (856 entries)
- [x] Size reduction: 11.17 MB → 7.51 MB (34.6% avg)

---

## Completed Phases

### Phase 1: Documentation ✅

- [x] Section 19: Unit validation discovery (ALREADY IMPLEMENTED)
- [x] Section 20: Typed ValidationRule proposal
- [x] Section 21: Correction system unification
- [x] Section 22: WebP images strategy
- [x] Code review (haiku) - no critical issues
- [x] Commit: 39abfa59

### Phase 2: Types TypeScript ✅

- [x] QuestionCorrection interface
- [x] ValidationRule discriminated union (7 rule types)
- [x] correction-placeholders.ts (parsing utilities)
- [x] Tests unitaires (107 tests)
- [x] Code review (sonnet) - fixed templateMarkdown usage
- [x] Commit: e7a6c795

### Phase 3: Convertisseurs Placeholders ✅

- [x] placeholder-converter.ts (61 tests)
- [x] conditional-converter.ts (64 tests)
- [x] Code review (sonnet) - no critical issues
- [x] Commit: 4bb0b88d

### Phase 4: Integration Correction Unifiee ✅

- [x] convertLegacySyntax() chained conversion
- [x] transformCorrection() unified transformer
- [x] correction-integration.test.ts (51 tests)
- [x] Code review (haiku) - no critical issues
- [x] Commit: d9c97792

### Phase 5: Typed Validation Rules ✅

- [x] validation-rule-evaluator.ts
- [x] Tests (71 tests, all rule types)
- [x] Code review (haiku) - no critical issues
- [x] Commit: 7a7162b8

### Phase 6: Migration Images ✅

- [x] scripts/migrate-question-images.ts
- [x] scripts/extract-question-image-refs.ts
- [x] scripts/README-question-images.md
- [x] Generated question-images-list.json (214 images)
- [x] Commit: 4dd3b027

### Phase 7: Quality Checks ✅

- [x] pnpm lint - 0 errors, 58 warnings (pre-existing)
- [x] pnpm check - pre-existing TypeScript errors (RAG code, not migration)
- [x] pnpm test:unit - 539/540 passed (1 flaky performance test)
- [x] pnpm build - SUCCESS
- [x] Fix test expectation (correction feedback not exposed)
- [x] Commit final

---

## Key Decisions

| Decision         | Choice                       | Rationale                                    |
| ---------------- | ---------------------------- | -------------------------------------------- |
| Images           | WebP simple                  | Supabase dynamic, no build-time optimization |
| Correction       | Unify to `{feedback, steps}` | Remove redundancy, single source             |
| Placeholders     | `{{}}` syntax                | Consistent, no conflict with LaTeX           |
| testAnswerss     | Typed ValidationRule         | Type safety, exhaustive checking             |
| Steps type field | None                         | TemplateMarkdown handles text+images         |

---

## Files Modified

### Phase 1

- `docs/wip/question-migration-analysis.md` - Added sections 19-22

### Phase 2

- `src/lib/questions/types.ts` - Added QuestionCorrection, ValidationRule types
- `src/lib/questions/correction-placeholders.ts` - Placeholder parsing utilities
- `src/lib/questions/__tests__/correction-types.test.ts` - 107 tests

### Phase 3

- `src/lib/migration/placeholder-converter.ts` - Legacy placeholder conversion
- `src/lib/migration/conditional-converter.ts` - Legacy conditional conversion
- `src/lib/migration/placeholder-converter.test.ts` - 61 tests
- `src/lib/migration/conditional-converter.test.ts` - 64 tests

### Phase 4

- `src/lib/migration/question-transformer.ts` - Added transformCorrection, convertLegacySyntax
- `src/lib/migration/correction-integration.test.ts` - 51 tests

### Phase 5

- `src/lib/questions/validation-rule-evaluator.ts` - All 7 rule type evaluators
- `src/lib/questions/__tests__/validation-rule-evaluator.test.ts` - 71 tests

### Phase 6

- `scripts/migrate-question-images.ts` - Image migration script (PNG→WebP)
- `scripts/extract-question-image-refs.ts` - Image reference analyzer
- `scripts/README-question-images.md` - Documentation
- `scripts/question-images-list.json` - Generated list of 214 images

### Phase 7

- `src/lib/migration/correction-integration.test.ts` - Fixed test expectation

### Phase 8

- `scripts/download-old-images.ts` - Script to download from old Supabase
- `scripts/migrate-question-images.ts` - Added retry logic, reduced batch size
- `scripts/image-url-mapping.json` - Generated URL mapping (856 entries)
- `static/images/questions/` - Downloaded 214 source images

### Phase 9

- `src/lib/migration/question-transformer.ts` - Display options mapping to defaultDisplayOptions
- `src/lib/migration/question-transformer.test.ts` - 10 new tests for display options
- `src/lib/migration/correction-integration.test.ts` - Added displayOptionsMapped to mock stats
- `src/lib/questions/types.ts` - Added shuffleChoices to options type

---

## Crash Recovery

```
"Lis /Users/david/.claude/plans/foamy-purring-cerf.md et continue l'implementation"
```

**Documents de reference:**

- Plan: `/Users/david/.claude/plans/foamy-purring-cerf.md`
- Analyse: `docs/wip/question-migration-analysis.md`
- Progression: `docs/wip/question-migration-progress.md` (ce fichier)

---

## Statistics

| Metric                 | Value           |
| ---------------------- | --------------- |
| Questions totales      | 633             |
| Syntax conversion      | 100%            |
| Constraint validators  | 5/5 (133 tests) |
| Unit validation        | DONE (~150KB)   |
| testAnswerss questions | 8               |
| Images migrees         | 214/214 (100%)  |
| Color references       | 683             |
| Image size reduction   | 34.6% (3.65 MB) |
