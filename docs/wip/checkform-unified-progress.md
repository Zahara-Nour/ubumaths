# checkForm Unified - Progress

## Status: Complete (ready to commit)

## What was done

### Phase 1a: Moved removeNullTermsAST to transforms.ts

- `isZeroTerm` and `removeNullTermsAST` moved from `expression-transforms.ts` to `transforms.ts`
- `expression-transforms.ts` now imports from `transforms.ts`
- Exported from `mathAST/index.ts`

### Phase 1b-c: Created cosmetic-transforms.ts with all transformers + checkForm pipeline

- **New file**: `src/lib/mathAST/cosmetic-transforms.ts`
- **String transformers**: `removeZeros`, `checkSpacesViolation`, `removeSpaces`
- **AST transformers**: `reduceFractionsAST`, `simplifyNullProductsAST`, `removeFactorsOneAST`, `removeSignsAST`, `removeMultOperatorAST`, `sortTermsAndFactorsAST`
- **Re-exports**: `removeNullTermsAST`, `stripUnnecessaryBracketsAST`
- **Pipeline**: `checkForm(answerLatex, expectedLatex, constraints)` applies all transformers sequentially

### Phase 1d: Tests

- **New file**: `src/lib/mathAST/__tests__/cosmetic-transforms.test.ts` (51 tests)
- Covers all individual transformers and the unified checkForm pipeline
- Includes monomial fraction detection tests (2x/4 -> x/2)
- Includes removeSignsAST edge case for (-a)+(-b)

### Phase 2: Integration into answer-validator.ts

- `applyConstraints` now uses `checkFormUnified` per answer/expected pair
- Unit check kept separate (not a cosmetic transform)
- Old individual check imports removed (checkSpaces, checkProducts, etc.)
- Old `checkForm` in `constraint-validators.ts` kept (used by its own tests)

### Phase 3: All tests pass

- cosmetic-transforms.test.ts: 51 passed
- transforms.test.ts: 83 passed
- constraint-validators.test.ts: 512 passed
- ESLint: 0 errors

### Code review fixes

- Fixed dead monomial fraction detection code in `reduceFractionsAST`
  - Added `extractVariablePart` helper to extract non-numeric parts of nodes
  - `reduceFractionsAST` now actually rebuilds fractions with reduced monomial coefficients
- Added tests: monomial fractions (2x/4 -> x/2, 4x/6 -> 2x/3)
- Added test: removeSignsAST with (-a)+(-b)
- Added test: checkForm with signs simplification x+(-y) vs x-y
- Removed unused `divide` import from test file

## Files modified

| File                                                        | Action                                     |
| ----------------------------------------------------------- | ------------------------------------------ |
| `src/lib/mathAST/cosmetic-transforms.ts`                    | **New**: transformers + checkForm pipeline |
| `src/lib/mathAST/transforms.ts`                             | Added `removeNullTermsAST` + `isZeroTerm`  |
| `src/lib/mathAST/index.ts`                                  | Export `removeNullTermsAST`, `isZeroTerm`  |
| `src/lib/ubumark/parameterization/expression-transforms.ts` | Import from `transforms.ts`                |
| `src/lib/utils/answer-validator.ts`                         | Use unified `checkFormUnified`             |
| `src/lib/mathAST/__tests__/cosmetic-transforms.test.ts`     | **New**: 51 tests                          |

## Decisions

- `toLatex` comparison used for before/after detection (not AST structural comparison)
- `unit` constraint kept separate from cosmetic pipeline
- Old constraint-validators functions preserved for backward compatibility
- `\dfrac` is the default LaTeX output format (not `\frac`)
- Monomial fraction reduction rebuilds the AST (not just detection)
