# Ubumark Refactoring - Progress Document

**Started**: 2025-12-15
**Completed**: 2025-12-15
**Status**: COMPLETED

## Objective

Consolidate all custom markdown related modules into `src/lib/ubumark/` and resolve architectural inconsistencies.

## Target Architecture

```
src/lib/ubumark/
├── parser/              # markdown → AST (exists)
├── types/               # AST types (exists)
├── parameterization/    # templates (exists)
├── utils/               # utilities (exists)
├── generators/          # NEW: AST → other formats
│   ├── latex-generator.ts
│   └── typst-generator.ts
└── importers/           # NEW: other formats → markdown
    └── latex/

src/lib/math/            # NEW: shared module
└── compute-engine/
    └── wrapper.ts
```

## Phase Progress

| Phase | Description                     | Status | Commit        |
| ----- | ------------------------------- | ------ | ------------- |
| 0     | Preparation                     | DONE   | Initial setup |
| 1     | Create $lib/math/compute-engine | DONE   | 33502ebf      |
| 2     | Use MathAST/eval in ubumark     | DONE   | 33502ebf      |
| 3     | Add missing exports             | DONE   | 33502ebf      |
| 4     | Create generators/              | DONE   | 33502ebf      |
| 5     | Create importers/               | DONE   | 33502ebf      |
| 6     | Cleanup                         | DONE   | 33502ebf      |
| 7     | Documentation                   | DONE   | This update   |
| 8     | Final verification              | DONE   | Complete      |

## Summary of Changes

### What Was Accomplished

1. **Moved Compute Engine to Shared Location** (`$lib/math/compute-engine/`)
   - Moved from `$lib/questions/compute-engine/` to make it available for non-question code
   - Now accessible to ubumark without circular dependencies

2. **Created MathAST Evaluation Function** (`$lib/mathAST/eval/evaluate-with-modifiers.ts`)
   - Replaced direct compute-engine dependency in ubumark
   - Supports evaluation modifiers (display, fixed, sci, etc.)
   - Cleaner separation of concerns

3. **Created Generators Directory** (`$lib/ubumark/generators/`)
   - Moved LaTeX generator from typst module
   - Moved Typst generator from separate module
   - All markdown → other format conversions in one place

4. **Created Importers Directory** (`$lib/ubumark/importers/`)
   - Moved LaTeX importer from `$lib/exercises/transpilers/latex-to-markdown/`
   - Clean separation: importers bring content IN, generators output content OUT

5. **Deleted Old Directories**
   - `src/lib/exercises/transpilers/` (moved to importers)
   - `src/lib/typst/transpiler/` (moved to generators)
   - `src/lib/questions/compute-engine/` (moved to math)

### New Architecture

All ubumark functionality is now consolidated under `$lib/ubumark/`:

```
src/lib/ubumark/
├── parser/              # markdown → AST
├── types/               # AST types
├── parameterization/    # templates, variables
├── utils/               # utilities
├── generators/          # AST → other formats (LaTeX, Typst)
│   ├── latex-generator.ts
│   └── typst-generator.ts
└── importers/           # other formats → markdown
    └── latex/           # LaTeX → markdown transpiler
```

Shared compute engine:

```
src/lib/math/
└── compute-engine/      # MathLive Compute Engine wrapper
```

## Files Modified

### Phase 0-1: Setup & Compute Engine Move

- `docs/wip/ubumark-refactor-progress.md` (this file)
- `src/lib/math/` (created)
- `src/lib/math/compute-engine/` (moved from questions)
- `src/lib/math/index.ts` (created)

### Phase 2: MathAST Evaluation

- `src/lib/mathAST/eval/evaluate-with-modifiers.ts` (created)
- `src/lib/ubumark/parameterization/resolvers/eval-resolver.ts` (updated to use new function)

### Phase 3: Exports

- `src/lib/ubumark/index.ts` (added generator and importer exports)
- `src/lib/ubumark/generators/index.ts` (created)
- `src/lib/ubumark/importers/index.ts` (created)

### Phase 4: Generators

- `src/lib/ubumark/generators/latex-generator.ts` (moved from typst)
- `src/lib/ubumark/generators/typst-generator.ts` (moved from typst/transpiler)
- `src/lib/ubumark/generators/__tests__/` (moved tests)

### Phase 5: Importers

- `src/lib/ubumark/importers/latex/` (moved from exercises/transpilers/latex-to-markdown)
- All subdirectories and tests moved

### Phase 6: Cleanup

- Deleted `src/lib/exercises/transpilers/`
- Deleted `src/lib/typst/transpiler/`
- Deleted `src/lib/questions/compute-engine/`

### Phase 7: Documentation

- `docs/claude/latex-to-markdown.md` (updated all import paths)
- `docs/wip/ubumark-refactor-progress.md` (this summary)

## Decisions Made

1. **Typst module**: Move `typst-transpiler.ts` to ubumark/generators/
2. **Circular dependency**: Use MathAST/eval + move compute-engine to $lib/math
3. **Question\* components**: Out of scope (separate task)
4. **Backward compatibility**: Breaking change (no shims)

## Impact on External Code

### Import Path Changes

Code that previously imported from these locations needs to be updated:

| Old Path                                       | New Path                       |
| ---------------------------------------------- | ------------------------------ |
| `$lib/exercises/transpilers`                   | `$lib/ubumark` (main exports)  |
| `$lib/exercises/transpilers/latex-to-markdown` | `$lib/ubumark/importers/latex` |
| `$lib/typst/transpiler`                        | `$lib/ubumark/generators`      |
| `$lib/questions/compute-engine`                | `$lib/math/compute-engine`     |

### Recommended Imports

**For LaTeX transpilation:**

```typescript
// Before
import { transpileLatexToMarkdown } from '$lib/exercises/transpilers';

// After
import { transpileLatexToMarkdown } from '$lib/ubumark';
```

**For Typst generation:**

```typescript
// Before
import { generateTypst, escapeTypst } from '$lib/typst/transpiler';

// After
import { generateTypst, escapeTypst } from '$lib/ubumark';
// or
import { generateTypst, escapeTypst } from '$lib/ubumark/generators';
```

**For Compute Engine:**

```typescript
// Before
import { evaluateExpression } from '$lib/questions/compute-engine/wrapper';

// After
import { evaluateExpression } from '$lib/math/compute-engine';
```

## Rollback Instructions

All changes were made in commit 33502ebf. To rollback:

```bash
git revert 33502ebf
```

## Next Steps

This refactoring is complete. All ubumark functionality is now:

- ✅ Consolidated in one location
- ✅ Properly organized by function (parse, generate, import)
- ✅ Free of circular dependencies
- ✅ Well-documented with updated paths
