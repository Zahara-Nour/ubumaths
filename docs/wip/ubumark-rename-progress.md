# Ubumark Rename Progress

Rename `custom-markdown` to `ubumark` throughout the codebase.

## Status: Phase 0 - Setup

**Branch**: `refactor/rename-custom-markdown-to-ubumark`
**Started**: 2025-12-20

---

## Phase 0: Setup
- [x] Create branch
- [ ] Verify baseline build
- [x] Create progress document

---

## Phase 1: Directory + Imports (ATOMIC)
- [ ] Rename `src/lib/custom-markdown/` to `src/lib/ubumark/`
- [ ] Update all import paths (~83 files)
- [ ] Code review
- [ ] Commit

---

## Phase 2: JSDoc Annotations
- [ ] Update `@module custom-markdown` to `@module ubumark` (38 files)
- [ ] Code review
- [ ] Commit

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
