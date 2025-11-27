# Question Migration Progress

> **Plan**: `/Users/david/.claude/plans/foamy-purring-cerf.md`
> **Branche**: `migration/questions`
> **Derniere mise a jour**: 2025-11-27

---

## Current Phase: 3 - Convertisseurs Placeholders

## Last Commit: e7a6c795

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

---

## Pending Phases

### Phase 3: Convertisseurs Placeholders

- [ ] placeholder-converter.ts (`&sol` -> `{{solution}}`)
- [ ] conditional-converter.ts (`@@cond ?? text@@` -> `{{if:cond|text}}`)
- [ ] Tests unitaires
- [ ] Code review
- [ ] Commit

### Phase 4: Integration Correction Unifiee

- [ ] Extend question-transformer.ts with transformCorrection()
- [ ] Tests d'integration
- [ ] Code review
- [ ] Commit

### Phase 5: Typed Validation Rules

- [ ] validation-rule-evaluator.ts
- [ ] Tests (8 patterns: divisor, equation_root, equivalence, predicate, custom)
- [ ] Code review
- [ ] Commit

### Phase 6: Migration Images

- [ ] scripts/migrate-question-images.ts
- [ ] Test dry-run
- [ ] Commit

### Phase 7: Quality Checks (FIN)

- [ ] pnpm lint
- [ ] pnpm check
- [ ] pnpm test:unit
- [ ] pnpm build
- [ ] Commit final

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

### Planned New Files

- `src/lib/migration/placeholder-converter.ts` (Phase 3)
- `src/lib/migration/conditional-converter.ts` (Phase 3)
- `src/lib/questions/validation-rule-evaluator.ts` (Phase 5)
- `scripts/migrate-question-images.ts` (Phase 6)

### Planned Modifications

- `src/lib/migration/question-transformer.ts` (Phase 4)

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
| Images a migrer        | 197             |
| Color references       | 683             |
