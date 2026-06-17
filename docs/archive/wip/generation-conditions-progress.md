# Generation Conditions (Guards) - Implementation Progress

## Status: COMPLETE

All 7 phases implemented and verified.

## Summary

Added generation conditions (guards) to the question system. When conditions are defined on a variation (e.g., `a*b!=0`, `gcd(a,b)=1`), the instance generator retries variable generation up to 100 times until all conditions are satisfied.

## Files Modified

| File                                                | Change                                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/lib/questions/types.ts`                        | Added `conditions?: string[]` to `QuestionVariation` and `SharedVariationDefaults` |
| `src/lib/mathAST/parser/custom/tokenizer.ts`        | Added `gcd`, `mod` to function names                                               |
| `src/lib/mathAST/eval/evaluate.ts`                  | Added `gcd`, `mod` evaluation (reuses `gcd()` from `rational.ts`)                  |
| `src/lib/questions/generator/instance-generator.ts` | Added condition retry loop + conditions merge from shared                          |
| `src/lib/migration/question-transformer.ts`         | Added `convertCondition()` for migration (pgcd->gcd, &N->letters, ;->,)            |

## Files Created

| File                                                                | Purpose                                            |
| ------------------------------------------------------------------- | -------------------------------------------------- |
| `src/lib/questions/generator/condition-evaluator.ts`                | Boolean condition evaluator using mathAST pipeline |
| `src/lib/questions/generator/__tests__/condition-evaluator.test.ts` | 20 unit tests covering all condition patterns      |
| `src/lib/questions/generator/__tests__/condition-retry.test.ts`     | 5 integration tests for retry loop                 |
| `src/lib/migration/__tests__/transformer-conditions.test.ts`        | 9 migration tests                                  |

## Key Design Decisions

1. **Custom numeric evaluation for relations**: The standard `evaluate()` pipeline uses `areEquivalent()` for `=` relations, which does structural comparison and doesn't evaluate function calls like `gcd()` to numbers. The condition evaluator uses `evaluateNodeToApproximatedNumber()` on both sides of relations for correct numeric comparison.

2. **Retry with seed variation**: Each retry uses `seed + retryCount * 7919` (prime number) to ensure different random values on each attempt.

3. **Conditions merge**: Conditions from `shared` are merged into variations via `resolveVariationWithShared()`, with variation conditions taking priority.

4. **Migration**: Old TinyMath conditions (`pgcd(&1+&2;&3)=1`) are converted to new format (`gcd(a+b,c)=1`) via `convertCondition()` which handles variable reference conversion, function name conversion, and separator conversion.

## Test Results

- condition-evaluator.test.ts: 20/20 PASS
- condition-retry.test.ts: 5/5 PASS
- transformer-conditions.test.ts: 9/9 PASS
- evaluate.test.ts (gcd/mod): 431/431 PASS
- All migration tests: 484/484 PASS
- TypeScript: 0 errors
- ESLint: 0 errors
