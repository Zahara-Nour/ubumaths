# Custom Math Syntax Implementation Progress

## Current State: Phase 2 Complete

### Phase 1: Types AST (DONE)

**Commit**: `feat(custom-markdown): add syntax field to math AST nodes`

**Files modified:**

- `src/lib/custom-markdown/types/ast.ts` - Added `syntax?: 'latex' | 'custom'` to MathInlineNode and MathBlockNode
- `src/lib/custom-markdown/types/parser.ts` - Added `syntax?: 'latex' | 'custom'` to MathPlaceholder

**Code Review**: Passed

---

### Phase 2: Math Extractor (DONE)

**Commit**: `54df3621` - `feat(custom-markdown): add ~custom~ math syntax extraction`

**Files modified:**

- `src/lib/custom-markdown/parser/math-extractor.ts`:
  - Added `INLINE_CUSTOM_REGEX` and `BLOCK_CUSTOM_REGEX`
  - Added `customToLatex()` function using mathAST parser
  - Modified `extractMath()` to handle both syntaxes
  - Handle escaped tildes (`\~`)
- `src/lib/custom-markdown/parser/markdown-parser.ts`:
  - Propagated `syntax` field to AST nodes

**Tests**: 55 tests added, all passing

**Code Review**: Passed

---

### Phase 3: Tests (DONE - included in Phase 2)

Tests were already created in Phase 2 by the fullstack-developer agent:

- `src/lib/custom-markdown/__tests__/parser/math-extractor.test.ts`

Coverage:

- Inline custom syntax `~2x+3~`
- Block custom syntax `~~x^2+1~~`
- Mixed syntax (LaTeX + custom)
- Escaped characters `\~`
- Error handling
- Conversion correctness

---

## Next Steps

### Phase 4: Documentation

- Update `docs/ref/markdown.md` with `~...~` and `~~...~~` syntax

### Phase 5: Final Verification

- `pnpm test:server src/lib/custom-markdown -- --run`
- `pnpm check:fast`
- `pnpm lint`

---

## Specifications

| Aspect      | Decision                                      |
| ----------- | --------------------------------------------- |
| Rendu       | `~custom~` → MathAST → LaTeX → MathLive       |
| Coexistence | `$latex$` et `~custom~` dans le même document |
| Variables   | Résolues AVANT le parsing mathAST             |
| Erreurs     | Affichage visuel en rouge                     |
