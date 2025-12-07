# Custom Math Syntax Implementation Progress

## Current State: Phase 1 Complete

### Phase 1: Types AST (DONE)

**Commit**: pending

**Files modified:**

- `src/lib/custom-markdown/types/ast.ts` - Added `syntax?: 'latex' | 'custom'` to MathInlineNode and MathBlockNode
- `src/lib/custom-markdown/types/parser.ts` - Added `syntax?: 'latex' | 'custom'` to MathPlaceholder

**Code Review**: Passed - Types are correctly defined, propagation will be done in Phase 2

---

## Next Steps

### Phase 2: Math Extractor

- Add regex for `~...~` and `~~...~~`
- Add `customToLatex()` function using mathAST parser
- Modify `extractMath()` to handle both syntaxes
- Propagate `syntax` field to AST nodes

### Remaining Phases

- Phase 3: Tests
- Phase 4: Documentation
- Phase 5: Final verification

---

## Specifications

| Aspect      | Decision                                      |
| ----------- | --------------------------------------------- |
| Rendu       | `~custom~` → MathAST → LaTeX → MathLive       |
| Coexistence | `$latex$` et `~custom~` dans le même document |
| Variables   | Résolues AVANT le parsing mathAST             |
| Erreurs     | Affichage visuel en rouge                     |
