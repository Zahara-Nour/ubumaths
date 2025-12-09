# Test Infrastructure Refactoring - Progress

## Status: Phase 1 Complete

**Last Updated**: 2025-12-09
**Commit**: `2bad9d1d` - refactor(tests): consolidate test helpers into unified structure

---

## Completed Phases

### Phase 1: Consolidation des Helpers

| Task                          | Status | Agent                    |
| ----------------------------- | ------ | ------------------------ |
| 1.1 Creer structure helpers   | Done   | typescript-expert (Opus) |
| 1.2 Ajouter alias $tests      | Done   | Direct                   |
| 1.3 Code Review               | Done   | code-reviewer (Opus)     |
| 1.4 Commit                    | Done   | commit-manager           |
| 1.5 Documentation progression | Done   | Direct                   |

**Files Created**:

```
tests/helpers/
├── index.ts                    # Barrel export
├── supabase/
│   ├── mock-client.ts          # createMockSupabase unifie (consolidation 6 impls)
│   ├── mock-locals.ts          # createMockLocals
│   ├── mock-request.ts         # createMockRequest
│   ├── mock-helpers.ts         # mockSuccess, mockError, mockSequence
│   └── index.ts
└── fixtures/
    ├── profiles.ts             # mockIds, mockProfiles, createMockProfile
    └── index.ts
```

**Files Modified**:

- `svelte.config.js` - Added `$tests: './tests'` alias

**Documentation Created**:

- `docs/ref/tests/index.md`
- `docs/ref/tests/configuration.md`
- `docs/ref/tests/mocking.md`
- `docs/ref/tests/patterns.md`
- `docs/ref/tests/utilities.md`
- `docs/ref/tests/component-testing.md`
- `docs/ref/tests/database-testing.md`
- `docs/ref/tests/e2e-testing.md`

**Issues Fixed During Review**:

1. Removed `require('vitest')` calls - replaced with static imports
2. Fixed email counter bug in `createMockProfile()`
3. Consolidated `UserRole`/`ProfileRole` types

---

## Remaining Phases

### Phase 2: Standardisation Conventions

**Status**: Pending

**Tasks**:

1. Rename `e2e/demo.test.ts` -> `e2e/demo.spec.ts`
2. Rename `src/routes/(public)/page.svelte.spec.ts` -> `page.svelte.test.ts`
3. Move `src/tests/` -> `tests/unit/`
4. Code review + commit

### Phase 3: Configuration

**Status**: Pending

**Tasks**:

1. Create `vitest.base.config.ts` with shared config
2. Add coverage reporting to `vite.config.ts`
3. Fix DB configs (`loadEnv`, `requireAssertions`)
4. Fix Playwright config (`npm` -> `pnpm`)
5. Code review + commit

### Phase 4: Migration Imports & CI

**Status**: Pending

**Tasks**:

1. Migrate test imports to `$tests/helpers`
2. Remove legacy helpers (`src/lib/testing/`, `src/lib/test-utils/`)
3. Add coverage to CI workflow
4. Create `vitest-setup-server.ts`
5. Code review + commit
6. Update documentation

---

## Decisions Made

| Question                            | Decision                                | Rationale             |
| ----------------------------------- | --------------------------------------- | --------------------- |
| Migration approach                  | Progressive                             | Zero breaking changes |
| Coverage in CI                      | Report only                             | No thresholds yet     |
| Convention `.test.ts` vs `.spec.ts` | `.test.ts` for unit, `.spec.ts` for E2E | Industry standard     |

---

## Next Action

Start **Phase 2** - Standardisation des conventions de nommage.

Commands to resume:

```bash
# Check files to rename
ls e2e/demo.test.ts
ls src/routes/\(public\)/page.svelte.spec.ts

# Check src/tests to move
ls src/tests/
```
