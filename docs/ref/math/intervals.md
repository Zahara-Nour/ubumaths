# Intervals Module

Module for mathematical intervals with symbolic bounds using MathNode from mathAST.

## Overview

The intervals module provides a complete system for representing and manipulating mathematical intervals on the real line with **symbolic bounds** (any MathNode expression: rationals, radicals, transcendentals like pi, ln(2), etc.).

**Key Features:**

- Symbolic bounds using MathNode from mathAST
- Exact comparison via `compareNumericNodes` (handles infinity, exact arithmetic, fallback to decimal)
- French notation for intervals: `]a, b[` for open intervals
- Set operations: intersection, union, complement, difference
- Formatting for display and conditions

**Location:** `$lib/math/intervals`

## Quick Start

```typescript
import {
	closedInterval,
	radicalBound,
	fromNumber,
	pi,
	intersect,
	formatDomainInterval,
	positiveReals
} from '$lib/math/intervals';

// Create interval [0, sqrt(2)]
const sqrt2 = radicalBound(2n);
const domain = intervalSet([closedInterval(fromNumber(0), sqrt2)]);

// Format: "[0, sqrt(2)]"
console.log(formatDomainInterval(domain));

// Intersect with ]0, +infty[
const result = intersect(domain, positiveReals());
// Result: ]0, sqrt(2)]

// Symbolic bounds work too
const piInterval = closedInterval(fromNumber(0), pi());
console.log(formatDomainInterval(intervalSet([piInterval]))); // "[0, pi]"
```

## Types

### EndpointValue

An endpoint value is any MathNode from mathAST:

```typescript
import type { MathNode } from '$lib/mathAST/types';

type EndpointValue = MathNode;
```

This includes:

- Numbers: `number('5')`, `number('1.5')`
- Infinity: `infinity('positive')`, `infinity('negative')`
- Greek letters: `greek('pi')`
- Functions: `func('sqrt', [number('2')])`, `func('ln', [number('3')])`
- Any other MathNode expression

### Endpoint

A bound with its type (open/closed):

```typescript
interface Endpoint {
	readonly value: EndpointValue;
	readonly type: 'open' | 'closed';
}
```

### Interval

A continuous interval on the real line:

```typescript
interface Interval {
	readonly kind: 'interval';
	readonly lower: Endpoint;
	readonly upper: Endpoint;
}
```

### IntervalDomain

Union type for all domain representations:

```typescript
type IntervalDomain = EmptySet | UniversalSet | IntervalSet;

interface IntervalSet {
	readonly kind: 'interval_set';
	readonly intervals: readonly Interval[];
	readonly excludedPoints: readonly ExcludedPoint[];
}
```

## Factory Functions

### Creating Bound Values

```typescript
// From number (creates NumberNode)
fromNumber(0); // NumberNode '0'
fromNumber(1.5); // NumberNode '1.5'

// Exact rational (creates DivisionNode)
rationalBound(3n, 2n); // 3/2

// Square root (creates FunctionNode)
radicalBound(2n); // sqrt(2)
radicalBound(3n, 2n); // 2*sqrt(3)
radicalBound(2n, 1n, 2n); // (1/2)*sqrt(2)

// Symbolic constants
positiveInfinity(); // +infty
negativeInfinity(); // -infty
pi(); // pi
e(); // e
sqrt2(); // sqrt(2)
sqrt3(); // sqrt(3)
```

### Creating Intervals

```typescript
// Bounded intervals
closedInterval(a, b); // [a, b]
openInterval(a, b); // ]a, b[
leftClosedInterval(a, b); // [a, b[
rightClosedInterval(a, b); // ]a, b]

// Half-lines
greaterThan(a); // ]a, +infty[
greaterThanOrEqual(a); // [a, +infty[
lessThan(a); // ]-infty, a[
lessThanOrEqual(a); // ]-infty, a]

// Special
realLine(); // ]-infty, +infty[
```

### Creating Domains

```typescript
// Basic domains
emptySet()                 // emptyset
universalSet()             // R
intervalSet([...])         // Union of intervals

// Common shortcuts
positiveReals()            // ]0, +infty[
nonNegativeReals()         // [0, +infty[
nonZeroReals()             // R \ {0}
unitInterval()             // [-1, 1]
```

## Comparison

The module uses `compareNumericNodes` from mathAST for comparison:

```typescript
import { compare, endpointEquals, endpointLessThan } from '$lib/math/intervals';

// Returns -1 | 0 | 1 | undefined
compare(sqrt2(), sqrt3()); // -1 (sqrt(2) < sqrt(3))
compare(pi(), fromNumber(3)); // 1 (pi > 3)

// Boolean helpers (return undefined if incomparable)
endpointLessThan(a, b); // a < b ?
endpointEquals(a, b); // a = b ?
endpointLessThanOrEqual(a, b); // a <= b ?
endpointGreaterThan(a, b); // a > b ?
endpointGreaterThanOrEqual(a, b); // a >= b ?
```

**Comparison Result:**

- `-1`: a < b
- `0`: a = b
- `1`: a > b
- `undefined`: incomparable (contains free variables)

### Handling Incomparable Values

When bounds contain free variables, comparison returns `undefined`. The algebra operations handle this **conservatively**:

- `isEmpty()`: assumes interval is NOT empty if bounds are incomparable
- `intersect()`/`union()`: falls back to first operand when undefined
- Sorting: maintains original order when comparison is undefined

## Algebra Operations

```typescript
// Predicates
isEmpty(domain); // Is the domain empty?
isUniversal(domain); // Is it the universal set?
containsValue(domain, x); // Does domain contain numeric value x?

// Set operations
intersect(a, b); // A cap B
union(a, b); // A cup B
complement(a); // R \ A
difference(a, b); // A \ B

// Point exclusion
excludePoints(domain, [v1, v2]); // Domain \ {v1, v2}
```

## Formatting

```typescript
// French interval notation
formatDomainInterval(positiveReals()); // "]0, +infty["
formatDomainInterval(unitInterval()); // "[-1, 1]"
formatDomainInterval(nonZeroReals()); // "R \ {0}"

// Condition notation
formatDomainCondition(positiveReals()); // "x > 0"
formatDomainCondition(unitInterval()); // "-1 <= x <= 1"

// Both formats
formatDomainFull(domain, 'x');
// { interval: "[0, sqrt(2)]", condition: "0 <= x <= sqrt(2)" }
```

### Formatting Symbolic Values

- Infinity: `+infty`, `-infty`
- Numbers: `0`, `1.5`, `-5`
- Pi: `pi`
- Square roots: `sqrt(2)` (pretty: `sqrt(2)`)
- Fractions: `3/2`
- Products: `2*sqrt(2)`

## Architecture

```
src/lib/math/intervals/
|-- types.ts              # Type definitions (EndpointValue = MathNode)
|-- compare.ts            # Wrapper around compareNumericNodes
|-- endpoint.ts           # Endpoint utilities, infinity checks
|-- factory.ts            # Factory functions for bounds/intervals
|-- algebra.ts            # Set operations (intersect, union, etc.)
|-- format.ts             # Formatting (French notation)
|-- index.ts              # Public exports
+-- __tests__/            # 143 tests
```

## Relation to mathAST

The intervals module uses mathAST types and functions:

| Component             | From mathAST | Usage                                 |
| --------------------- | ------------ | ------------------------------------- |
| `EndpointValue`       | `MathNode`   | Type for interval bounds              |
| `InfinityNode`        | `types.ts`   | Represents +/-infinity                |
| `compareNumericNodes` | `eval/`      | Exact symbolic comparison             |
| Factory functions     | `factory.ts` | Create NumberNode, FunctionNode, etc. |
| Type guards           | `guards.ts`  | `isInfinity`, `isNumber`, etc.        |

The intervals module is the **base layer** that can be used by higher-level modules like `mathAST/domain/` for function domain computation.
