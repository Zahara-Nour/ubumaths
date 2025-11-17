# Decision Log - Template Syntax Unification

> **Project**: Template Syntax Unification (Project 2)
> **Date**: 2025-11-17
> **Context**: Decisions made during optimization of syntax unification strategy

---

## Decision 1: Pause TinyMath Migration

### Context
While attempting Phase 2 of TinyMath migration, discovered converter outputs `%{variable}` syntax but Questions module expects `{{variable}}`.

### Decision
**PAUSE** Phase 2 of migration to fix syntax issue first.

### Details
- **Date**: 2025-11-17 Morning
- **Reason**: Syntax incompatibility discovered
- **Impact**: Delays migration by 1-2 hours
- **Alternative Considered**: Continue migration with wrong syntax, fix later
- **Rationale**: Better to fix converter now than migrate 2,238 questions with wrong syntax

### Outcome
Created separate Project 2 to handle syntax unification before resuming migration.

---

## Decision 2: Delete Seed Questions

### Context
Database contains 5 seed questions that use old `{@:variable}` syntax. Need to decide how to handle them.

### Decision
**DELETE** all seed questions from database.

### Details
- **Date**: 2025-11-17
- **Reason**: Test data only, TinyMath will provide real content
- **Risk Assessment**:
  - Low risk - no production dependencies found
  - Not referenced by assignments or student results
- **Backup**: Yes, created before deletion
- **Alternative Considered**: Migrate seed questions to new syntax
- **Rationale**: Cleaner to start fresh with TinyMath data than maintain test data

### Verification
```bash
# Check dependencies first
SELECT COUNT(*) FROM assignment_questions WHERE question_id IN (
  SELECT id FROM questions WHERE is_seed = true
);
# Result: 0 (no dependencies)
```

---

## Decision 3: Optimized Implementation Plan

### Context
Three implementation options considered for syntax unification.

### Decision
**Option C**: Delete seed → Fix converter → Migrate with correct syntax

### Details
- **Date**: 2025-11-17
- **Original Plan**: Migrate DB → Keep adapter → Fix converter later
- **New Plan**: Delete seed → Fix converter first → Migrate with correct syntax
- **Time Saved**: ~1 hour (no DB migration needed)
- **Complexity Reduced**: No runtime adapter needed permanently

### Comparison
| Aspect | Original Plan | Optimized Plan |
|--------|--------------|----------------|
| Steps | 5 (including DB migration) | 3 (skip migration) |
| Runtime Overhead | Permanent adapter | None |
| Risk | Medium (data migration) | Low (no data touch) |
| Time | 2-3 hours | 1-2 hours |

### Rationale
- Simpler is better
- No production data exists yet
- Converter fix prevents future issues
- Cleaner codebase without permanent adapters

---

## Decision 4: Keep Adapter as Temporary Bridge

### Context
Phase 1 created syntax adapter. Deciding whether to keep or remove.

### Decision
**KEEP** adapter temporarily during transition, remove after full unification.

### Details
- **Date**: 2025-11-17
- **Current Role**: Bridge between syntaxes
- **Future Plan**: Remove once all components use `{{variable}}`
- **Timeline**: Remove in ~1 week after migration complete
- **Alternative Considered**: Remove immediately
- **Rationale**: Provides safety during transition period

---

## Decision 5: Single Syntax Standard

### Context
Need to choose standard syntax for entire application.

### Decision
**Standardize** on `{{variable}}` (mustache-like) syntax.

### Details
- **Date**: 2025-11-17
- **Chosen**: `{{variable}}`
- **Rejected**: `%{variable}`, `{@:variable}`
- **Reason**: Industry standard, better tooling support, cleaner
- **Scope**: Questions, Exercises, Shared library
- **Migration Path**: Fix converter → Update Shared → Remove adapter

### Benefits
- Consistent with industry standards
- Better IDE support
- Easier for new developers
- Compatible with many template engines

---

## Decision 6: Shared Library in lib/questions

### Context
Discovered Shared library is in `lib/questions/generator/shared/` not separate module.

### Decision
**UPDATE** Shared library in place within questions module.

### Details
- **Date**: 2025-11-17
- **Location**: `src/lib/questions/generator/shared/`
- **Not**: Separate npm package or lib/shared
- **Reason**: Already integrated, no need to move
- **Impact**: Simpler update process

---

## Decision 7: Test-First Approach

### Context
Deciding how to validate converter changes.

### Decision
**CREATE** comprehensive tests before modifying converter.

### Details
- **Date**: 2025-11-17
- **Test Coverage**:
  - Basic replacements
  - Nested variables
  - Edge cases
  - Color templates
- **Run Tests**: After each converter change
- **Success Criteria**: 100% pass before proceeding

---

## Key Learnings

1. **Always verify syntax compatibility** before large-scale migrations
2. **Test data can be deleted** if real data is coming
3. **Simpler solutions often better** than complex workarounds
4. **Fix root causes** not symptoms
5. **Document decisions** for future reference

---

## Next Decision Points

- [ ] When to remove syntax adapter (after migration complete)
- [ ] Whether to add syntax validation to CI/CD
- [ ] How to prevent future syntax divergence

---

**For current status**: See `.claude/PROJECT-OVERVIEW-2025-11-17.md`