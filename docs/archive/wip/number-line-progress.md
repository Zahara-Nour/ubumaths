# Droite Graduee (Number Line) - Progress

## Status: Phase 1-5 Complete, DRY Refactor Done, Typst Generator Done

## Files Created

- `src/lib/ubumark/types/number-line.ts` — Types AST (NumberLineNode, NumberLineValue, etc.)
- `src/lib/ubumark/parser/number-line-parser.ts` — Parser for ```line blocks
- `src/lib/components/markdown/nodes/NumberLine.svelte` — Static SVG renderer
- `src/lib/components/question-inputs/NumberLineInput.svelte` — Interactive input (read-value + place-point)
- `src/lib/components/question-inputs/GraphicalInput.svelte` — Generic dispatcher for graphical tools
- `src/lib/ubumark/utils/number-line-render.ts` — Shared rendering utilities (DRY refactor)
- `src/lib/ubumark/generators/number-line-typst.ts` — Typst/CeTZ generator
- `src/lib/ubumark/__tests__/parser/number-line-parser.test.ts` — 36 parser tests
- `src/lib/components/question-inputs/__tests__/number-line-input.test.ts` — 17 snap/bounds/serialization tests
- `src/lib/ubumark/__tests__/generators/number-line-typst.test.ts` — 17 Typst generator tests

## Files Modified

- `src/lib/ubumark/types/ast.ts` — Added NumberLineNode to BlockNode union
- `src/lib/ubumark/types/index.ts` — Added barrel exports for number-line types
- `src/lib/ubumark/parser/markdown-parser.ts` — Added number-line block detection (Priority 1d)
- `src/lib/ubumark/parser/index.ts` — Added number-line parser exports
- `src/lib/components/markdown/MarkdownRenderer.svelte` — Added NumberLine dispatch
- `src/lib/questions/types.ts` — Extended InstanceBlank.type to include 'graphical', added graphicalConfig
- `src/lib/ubumark/types/ast.ts` — Extended InputState.type to include 'graphical'
- `src/lib/components/question-inputs/fill-blanks-utils.ts` — Handle 'graphical' type in buildInputStates

## Architecture Decisions

1. **Custom mathAST expressions** — All numeric values use `parseCustom()` from mathAST, not LaTeX. This gives exact AST for comparison and LaTeX for display.
2. **NumberLineValue** = { expression: string, ast: MathNode } — single source of truth.
3. **No duplication** — positioning uses `evaluateNodeToApproximatedNumber(ast)`, display uses `toLatex(ast)`, comparison uses `compareNumericNodes(a, b)`.
4. **GraphicalInput as dispatcher** — extensible for future graphical tools (trig input, graph input).
5. **Snap logic** — pure function `snapToStep(val, start, step)` rounds to nearest graduation.

## Tests

- Parser: 36 tests (all pass) — includes edge cases: empty block, graduation cap, log scale, segment bounds
- Snap/bounds: 17 tests (all pass)
- Existing fill-blanks tests: 27 tests (all pass, no regression)
- Existing markdown-parser tests: 85/89 pass (4 pre-existing failures on :table-h)

## Files Modified

- `src/lib/ubumark/generators/typst-generator.ts` — Added number-line dispatch case
- `src/lib/ubumark/generators/index.ts` — Added number-line-typst exports

## Deferred (Future Phases)

- LaTeX generator (`number-line-latex.ts`)
- TipTap editor extension
- `mark-segment` task type
- Full integration into question generation pipeline (creating graphical blanks from templates)
