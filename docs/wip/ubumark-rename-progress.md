# Ubumark Rename Progress

Rename `custom-markdown` to `ubumark` throughout the codebase.

## Status: Phase 2 - JSDoc Annotations

**Branch**: `refactor/rename-custom-markdown-to-ubumark`
**Started**: 2025-12-20

---

## Phase 0: Setup ✅
- [x] Create branch
- [x] Verify baseline build
- [x] Create progress document

---

## Phase 1: Directory + Imports (ATOMIC) ✅
- [x] Rename `src/lib/custom-markdown/` to `src/lib/ubumark/`
- [x] Update all import paths (71 files)
- [x] Code review (passed)
- [x] Commit: `d8fbaffe`

---

## Phase 2: JSDoc Annotations ✅
- [x] Update `@module custom-markdown` to `@module ubumark` (38 files)
- [x] Code review (passed)
- [x] Commit

---

## Phase 3: Documentation Content
- [ ] Update docs prose and paths (30+ files)
- [ ] Code review
- [ ] Commit

---

## Phase 4: Rename Doc Files
- [ ] Rename `custom-markdown-*.md` files
- [ ] Update references
- [ ] Commit

---

## Phase 5: File Headers
- [ ] Update comment headers in source files
- [ ] Code review
- [ ] Commit

---

## Phase 6: Final Verification
- [ ] grep for remaining references
- [ ] pnpm check
- [ ] pnpm lint
- [ ] pnpm build
- [ ] pnpm test:unit -- --run

---

## Files Modified

### Phase 0
- `docs/wip/ubumark-rename-progress.md` (this file)

### Phase 1
- 97 files renamed: `src/lib/custom-markdown/**` → `src/lib/ubumark/**`
- 71 files updated: imports from `$lib/custom-markdown` → `$lib/ubumark`
