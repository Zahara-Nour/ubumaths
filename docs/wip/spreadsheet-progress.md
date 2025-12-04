# Spreadsheet Feature - Progress Document

## Status: Complete

All 6 phases have been implemented successfully.

## Summary

A simple 20x20 spreadsheet for ubumaths with:

- Complete formula engine (custom parser, not using MathAST)
- French + English formula support (SOMME/SUM, MOYENNE/AVERAGE, etc.)
- Svelte 5 runes for reactivity
- Supabase persistence with RLS
- CSV import/export

## Completed Phases

### Phase 1: Core Engine

- Types and AST definitions (`src/lib/spreadsheet/types.ts`, `src/lib/spreadsheet/parser/ast.ts`)
- Cell reference utilities (`src/lib/spreadsheet/cell-reference.ts`)
- Lexer (`src/lib/spreadsheet/parser/lexer.ts`)
- Parser - recursive descent (`src/lib/spreadsheet/parser/parser.ts`)
- Evaluator (`src/lib/spreadsheet/parser/evaluator.ts`)
- Functions: math, logic, text (`src/lib/spreadsheet/functions/`)
- French aliases (`src/lib/spreadsheet/functions/aliases.ts`)
- Dependency graph with cycle detection (`src/lib/spreadsheet/dependency-graph.ts`)
- **Tests: 380 passing**

### Phase 2: Store + UI

- Svelte 5 store (`src/lib/spreadsheet/store.svelte.ts`)
- Components:
  - `Spreadsheet.svelte` - Main component
  - `SpreadsheetGrid.svelte` - Table grid
  - `SpreadsheetCell.svelte` - Editable cell
  - `SpreadsheetFormulaBar.svelte` - Formula bar
- Route page (`src/routes/(protected)/spreadsheet/+page.svelte`)

### Phase 3: Formatting + Toolbar

- `SpreadsheetToolbar.svelte` - Bold, italic, alignment, colors, number format
- `format.ts` - Formatting utilities

### Phase 4: Supabase Persistence

- Migration: `supabase/migrations/20251205000000_create_spreadsheets_table.sql`
- Validation: `src/lib/server/validation/spreadsheet.ts`
- API endpoints:
  - `src/routes/api/spreadsheets/+server.ts` (GET list, POST create)
  - `src/routes/api/spreadsheets/[id]/+server.ts` (GET, PUT, DELETE)
- Server load functions in route pages

### Phase 5: CSV Import/Export

- CSV utilities (`src/lib/spreadsheet/csv.ts`)
- `SpreadsheetImportExport.svelte` - Import/Export UI
- Features:
  - Auto-detection of delimiter
  - French Excel compatibility (semicolon, UTF-8 BOM)
  - Preview before import
- **Tests: 35 additional tests (415 total)**

### Phase 6: Polish + Documentation

- All error messages in French
- Accessibility attributes (ARIA)
- This documentation

## File Structure

```
src/lib/spreadsheet/
├── types.ts                    # Core types + Zod schemas
├── cell-reference.ts           # A1 reference parsing
├── store.svelte.ts             # Svelte 5 reactive store
├── dependency-graph.ts         # Formula dependencies
├── format.ts                   # Number/value formatting
├── csv.ts                      # CSV import/export
├── README.md                   # Usage documentation
├── parser/
│   ├── ast.ts                  # AST node definitions
│   ├── lexer.ts                # Tokenizer
│   ├── parser.ts               # Recursive descent parser
│   └── evaluator.ts            # AST evaluation
├── functions/
│   ├── index.ts                # Function registry
│   ├── math.ts                 # Math functions
│   ├── logic.ts                # Logic functions
│   ├── text.ts                 # Text functions
│   └── aliases.ts              # French aliases
└── __tests__/                  # 415 tests

src/lib/components/spreadsheet/
├── Spreadsheet.svelte          # Main component
├── SpreadsheetGrid.svelte      # Grid with headers
├── SpreadsheetCell.svelte      # Editable cell
├── SpreadsheetFormulaBar.svelte
├── SpreadsheetToolbar.svelte   # Formatting toolbar
└── SpreadsheetImportExport.svelte

src/routes/(protected)/spreadsheet/
├── +page.svelte                # List page
├── +page.server.ts             # Server load
├── [id]/
│   ├── +page.svelte            # Edit page
│   └── +page.server.ts         # Server load

src/routes/api/spreadsheets/
├── +server.ts                  # List/Create endpoints
└── [id]/+server.ts             # CRUD endpoints
```

## Test Count

| File                     | Tests   |
| ------------------------ | ------- |
| csv.test.ts              | 35      |
| lexer.test.ts            | 61      |
| types-import.test.ts     | 14      |
| parser.test.ts           | 81      |
| functions.test.ts        | 120     |
| evaluator.test.ts        | 50      |
| dependency-graph.test.ts | 54      |
| **Total**                | **415** |

## Bug Fixes (Post-Release)

### Svelte 5 Compatibility Issues

1. **Tooltip/DropdownMenu patterns** - Removed `asChild let:builder` patterns incompatible with Svelte 5 snippets
2. **structuredClone error** - Used `$state.snapshot()` instead of `structuredClone` for reactive proxies
3. **SvelteMap reactivity** - Added version counter to trigger reactivity when computed values change

### Keyboard Navigation

1. **Double navigation** - Removed duplicate `svelte:window` keydown handler
2. **Focus management** - Focus container on cell select and after edit commit/cancel
3. **Arrow keys** - Proper focus flow between container and cell inputs

### Cell Editing

1. **Text selection on type** - Don't select text when editing starts with typed character (only on double-click/F2)
2. **Input focus timing** - Use `tick()` to ensure input exists before focusing
3. **Number parsing** - Use `Number()` instead of `parseFloat()` to avoid truncating strings like "3+4" to "3"

### Cell Display

1. **Missing recalculation** - Always include changed cell in recalculation order (not just formula cells)

## Deferred to V2

- Charts/visualization
- Undo/Redo
- MathLive integration

## Technical Decisions

1. **Custom parser vs MathAST reuse**: Chose custom parser for simpler cell reference handling and spreadsheet-specific semantics
2. **Recursive descent**: Clean, maintainable, easy to extend
3. **French-first**: All error messages and function names in French, with English aliases
4. **20x20 limit**: Keeps performance manageable for educational use
5. **Dependency graph**: DFS-based topological sort with cycle detection
