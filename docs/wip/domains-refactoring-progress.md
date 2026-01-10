# Progress: Refactor Domains to Use Intervals

## Status: COMPLETE ✓

Refactored `src/lib/mathAST/domain/` to delegate interval representation and algebra operations to `src/lib/math/intervals/`.

### Summary

The domains module now uses the intervals module for all interval-based operations:

- **Before**: Mixed types (`MathNode | number | 'positive_infinity'`), local algebra implementation
- **After**: Pure `MathNode` endpoint values, delegates to intervals module

### Architecture

```
src/lib/mathAST/domain/
├── types.ts         ← Re-exports from intervals, keeps ConditionDomain
├── factory.ts       ← Re-exports from intervals, keeps conditionDomain()
├── algebra.ts       ← Delegates to intervals, handles ConditionDomain
├── format.ts        ← Delegates to intervals, handles ConditionDomain
├── compute.ts       ← Uses fromNumber() for numeric bounds
├── preimage.ts      ← Uses fromNumber() for numeric bounds
├── validate.ts      ← Unchanged (uses containsValue from algebra)
├── builtins.ts      ← Uses fromNumber() for acosh domain
└── index.ts         ← Updated exports

src/lib/math/intervals/  (upstream, unchanged)
├── types.ts         ← EndpointValue = MathNode, IntervalSet
├── factory.ts       ← fromNumber(), interval factories
├── algebra.ts       ← intersect, union, complement, etc.
└── format.ts        ← formatEndpointValue, formatDomainInterval
```

### Breaking Changes

| Change                                                             | Migration                  |
| ------------------------------------------------------------------ | -------------------------- |
| `IntervalDomain.kind` → `'interval_set'` (was `'interval_domain'`) | Update pattern matching    |
| `EndpointValue` no longer accepts raw `number`                     | Use `fromNumber(n)`        |
| `EndpointValue` no longer accepts string `'positive_infinity'`     | Use `infinity('positive')` |
| `excludePoints()` takes `EndpointValue[]` instead of `number[]`    | Map with `fromNumber()`    |

### Backward Compatibility

Type aliases maintained for migration:

```typescript
export type EmptyDomain = EmptySet; // @deprecated
export type UniversalDomain = UniversalSet; // @deprecated
export type IntervalDomain = IntervalSet; // @deprecated
```

### Test Results

| Suite          | Tests   | Status   |
| -------------- | ------- | -------- |
| Domain tests   | 209     | PASS     |
| Interval tests | 292     | PASS     |
| **Total**      | **501** | **PASS** |

### Changes Made

| File                                 | Change                                                  |
| ------------------------------------ | ------------------------------------------------------- |
| `domain/types.ts`                    | Re-export from intervals, add aliases                   |
| `domain/factory.ts`                  | Re-export from intervals, keep conditionDomain          |
| `domain/algebra.ts`                  | Delegate to intervals, handle ConditionDomain           |
| `domain/format.ts`                   | Delegate to intervals formatting                        |
| `domain/compute.ts`                  | Use fromNumber(), isNegativeInfinity/isPositiveInfinity |
| `domain/preimage.ts`                 | Use fromNumber() for all numeric bounds                 |
| `domain/builtins.ts`                 | Use fromNumber(1) for acosh domain                      |
| `domain/index.ts`                    | Update exports to include new types                     |
| `mathAST/index.ts`                   | Add new type exports, backward compat aliases           |
| `domain/__tests__/*.ts`              | Update to use fromNumber(), 'interval_set' kind         |
| `intervals/__tests__/format.test.ts` | Fix duplicate import, use valid GreekLetter types       |

### Key Decisions

1. **Delegate to intervals**: All interval algebra delegated to `$lib/math/intervals/algebra`
2. **ConditionDomain stays local**: Domain-specific type not moved to intervals
3. **Use `'interval_set'` kind**: Breaking change, cleaner architecture
4. **fromNumber() required**: No implicit conversion from raw numbers

---

_Completed: January 2026_
