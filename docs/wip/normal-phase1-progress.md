# Phase 1 Progress: Normalization System Foundations

## Status: COMPLETED

**Date**: 2025-12-03
**Branch**: migration/questions

## Files Created

### Source Files

1. **`src/lib/mathAST/normal/types.ts`** - All interface definitions
   - `Rational`: BigInt fraction (n/d), always reduced, d > 0
   - `SimplifiedRadical`: radicand^(1/index) with no extractable perfect powers
   - `AlgebraicTerm`: rational coefficient times product of radicals
   - `AlgebraicCoefficient`: sum of algebraic terms
   - `SymbolicFactor`: MathNode base with rational exponent
   - `NormalTerm`: algebraic coefficient times monomial
   - `NormalForm`: numerator/denominator with hash
   - `SimplifiedRadicalResult`: result of radical simplification
   - `ComparisonResult`: -1 | 0 | 1 for ordering functions

2. **`src/lib/mathAST/normal/rational.ts`** - Exact BigInt arithmetic
   - Constants: `ZERO`, `ONE`, `MINUS_ONE`, `TWO`, `HALF`
   - Helpers: `gcd`, `lcm`, `absBigInt`
   - Constructor: `rational(n, d)`, `fromInteger(n)`
   - Arithmetic: `addRational`, `subRational`, `mulRational`, `divRational`, `negRational`, `absRational`, `reciprocal`, `powRational`
   - Comparison: `compareRational`, `equalRational`
   - Predicates: `isZero`, `isOne`, `isMinusOne`, `isNegative`, `isPositive`, `isInteger`
   - Conversion: `rationalToNumber`, `rationalToString`, `parseRational`

3. **`src/lib/mathAST/normal/radical.ts`** - Radical operations
   - Helpers: `integerNthRoot`, `extractPerfectPower`
   - Simplification: `simplifyRadical`, `createRadical`
   - Multiplication: `mulRadicalsSameIndex`, `mulRadicals`
   - Comparison: `compareRadicals`, `equalRadicals`
   - Conversion: `radicalToNumber`, `radicalToString`, `hashRadical`

4. **`src/lib/mathAST/normal/compare.ts`** - Canonical ordering (levels 1-2)
   - Level 1 (Radicals): `compareRadicals`, `compareRadicalArrays`, `equalRadicalArrays`, `hashRadicalArray`
   - Level 2 (AlgebraicTerms): `compareAlgebraicTerms`, `sameRadicalSignature`, `hashAlgebraicTerm`, `getRadicalSignature`
   - Sorting: `sortRadicals`, `sortAlgebraicTerms`
   - Validation: `isRadicalArraySorted`, `isAlgebraicTermArraySorted`

### Test Files

1. **`src/lib/mathAST/normal/__tests__/rational.test.ts`** - 77 tests
2. **`src/lib/mathAST/normal/__tests__/radical.test.ts`** - 65 tests
3. **`src/lib/mathAST/normal/__tests__/compare.test.ts`** - 46 tests

## Test Results

```
Test Files  3 passed (3)
     Tests  188 passed (188)
  Duration  451ms
```

All tests pass.

## Design Decisions

1. **BigInt for exact arithmetic**: All numeric operations use BigInt to avoid floating-point precision issues. This is essential for algebraic manipulation.

2. **Immutable types**: All interfaces use `readonly` properties and `readonly` arrays to ensure immutability throughout the normalization pipeline.

3. **Sign normalization**: Rationals always have positive denominators with the sign in the numerator. Zero is always represented as `{ n: 0n, d: 1n }`.

4. **Radical ordering**: Radicals are ordered by index first (ascending), then by radicand (ascending). This means sqrt < cbrt < fourth root.

5. **Term ordering**: AlgebraicTerms are ordered by:
   - Number of radicals (fewer = simpler = first)
   - Lexicographic comparison of radical arrays
   - Rational coefficient value

6. **Radical simplification**: Uses trial division to extract perfect powers. Works correctly for arbitrary precision BigInt inputs.

## Implementation Notes

### Newton's Method for Integer Roots

The `integerNthRoot` function uses Newton's method adapted for BigInt. It returns the exact root if one exists, or `null` otherwise.

### Radical Multiplication

When multiplying radicals with different indices, we:

1. Find the LCM of the indices
2. Convert both radicals to the common index
3. Multiply and simplify

### Canonical Form Invariants

- Rationals: reduced, d > 0, sign in n
- Radicals: radicand > 1 (else it's rational), no extractable perfect powers
- AlgebraicTerms: radicals sorted by (index, radicand)
- All arrays: sorted in canonical order

## Next Steps (Phase 2)

1. Implement `algebraic.ts` (addAlgebraic, mulAlgebraic, compareAlgebraic)
2. Implement `monomial.ts` (mulMonomials, compareMonomials, hashMonomial)
3. Implement `term.ts` (addTerms, mulTerms, collectLikeTerms)
4. Implement `polynomial.ts` (addPolynomials, mulPolynomials)
5. Implement `hash.ts` (hashTerm, hashNormalForm)
6. Extend `compare.ts` (levels 3 and 4: facteurs symboliques, termes)
7. Tests unitaires

## Dependencies for Phase 2

Phase 2 will need to import `MathNode` from `../types` for the `SymbolicFactor.base` type. The types are already defined in `types.ts`.
