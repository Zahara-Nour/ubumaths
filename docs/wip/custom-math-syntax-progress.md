# Custom Math Syntax Implementation - COMPLETE

## Final State: All 5 Phases Complete

### Summary

Added support for custom MathAST syntax in the markdown parser:

- `~expression~` for inline math
- `~~expression~~` for block math

Expressions are converted to LaTeX via MathAST before rendering.

---

## Commits

| Phase | Commit     | Description                                |
| ----- | ---------- | ------------------------------------------ |
| 1     | (first)    | feat: add syntax field to math AST nodes   |
| 2     | `54df3621` | feat: add ~custom~ math syntax extraction  |
| 4     | `1c00d3db` | docs: add custom math syntax documentation |

---

## Files Modified

### Types

- `src/lib/custom-markdown/types/ast.ts` - Added `syntax?: 'latex' | 'custom'` to MathInlineNode and MathBlockNode
- `src/lib/custom-markdown/types/parser.ts` - Added `syntax?: 'latex' | 'custom'` to MathPlaceholder

### Parser

- `src/lib/custom-markdown/parser/math-extractor.ts`:
  - Added `INLINE_CUSTOM_REGEX` and `BLOCK_CUSTOM_REGEX`
  - Added `customToLatex()` function using mathAST parser
  - Modified `extractMath()` to handle both syntaxes
  - Handle escaped tildes (`\~`)
- `src/lib/custom-markdown/parser/markdown-parser.ts`:
  - Propagated `syntax` field to AST nodes

### Tests

- `src/lib/custom-markdown/__tests__/parser/math-extractor.test.ts` - 55 tests added

### Documentation

- `docs/ref/markdown.md` - Added section 2.2 for custom math syntax

---

## Verification Results

| Check                    | Result                 |
| ------------------------ | ---------------------- |
| Custom-markdown tests    | ✅ 830 passed          |
| TypeScript check         | ⚠️ Pre-existing errors |
| ESLint (custom-markdown) | ✅ No errors           |

---

## Specifications

| Aspect      | Decision                                      |
| ----------- | --------------------------------------------- |
| Rendu       | `~custom~` → MathAST → LaTeX → MathLive       |
| Coexistence | `$latex$` et `~custom~` dans le même document |
| Variables   | Résolues AVANT le parsing mathAST             |
| Erreurs     | Affichage visuel en rouge                     |

---

## Usage Examples

```markdown
# Inline

Calculer ~2x + 3~ quand $x = 5$.

# Block

La formule est :

~~
(a + b)^2 = a^2 + 2ab + b^2
~~

# Mixed syntax

Formule LaTeX : $$\frac{a}{b}$$
Formule custom : ~~a/b~~
```
