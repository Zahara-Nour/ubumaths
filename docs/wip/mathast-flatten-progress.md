# MathAST Flatten Helpers - Progress

## Objectif

Ajouter des helpers de flattening pour additions/soustractions et multiplications.

## Décisions

- Délimiteurs intangibles (frontières)
- Shallow : enfants directs uniquement
- Deep : Shallow + Map des sous-listes
- Associativité gauche pour unflatten
- Option A améliorée (pas de nouveaux types de noeuds)

## Status: COMPLETED

Commit: `17aabff4` - feat(mathAST): add flatten and unflatten helpers for sum/product operations

## Progress Log

### Phase 1 - COMPLETED

- Files: `src/lib/mathAST/flatten.ts`
- Created: Types (Sign, SignedTerm, FlatSum, FlatProduct, DeepFlatSumResult, DeepFlatProductResult)
- Created: flipSign(), flattenSumShallow(), flattenProductShallow()

### Phase 2 - COMPLETED

- Files: `src/lib/mathAST/flatten.ts`
- Created: flattenSumDeep(), flattenProductDeep()

### Phase 3 - COMPLETED

- Files: `src/lib/mathAST/flatten.ts`
- Created: unflattenSum(), unflattenProduct()

### Phase 4 - COMPLETED

- Files: `src/lib/mathAST/__tests__/flatten.test.ts`
- Created: 45 unit tests covering all functions and edge cases

### Phase 5 - COMPLETED

- Code review performed
- Results in: `docs/wip/flatten-review-results.md`

### Phase 6 - COMPLETED

- Updated: `src/lib/mathAST/index.ts` (exports)
- Updated: `src/lib/mathAST/README.md` (documentation)

### Phase 7 - COMPLETED

- Quality checks passed:
  - Tests: 262/262 passing
  - ESLint: 0 errors on MathAST files
  - Pre-commit hooks: passed
