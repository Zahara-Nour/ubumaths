# Intervals Module

Module for mathematical intervals with exact algebraic bounds.

## Overview

The intervals module provides a complete system for representing and manipulating mathematical intervals on the real line with **exact algebraic bounds** (rationals like `3/2`, radicals like `√2`).

**Key Features:**

- Exact comparison of algebraic bounds via squaring technique
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
	intersect,
	formatDomainInterval,
	positiveReals
} from '$lib/math/intervals';

// Create interval [0, √2]
const sqrt2 = radicalBound(2n);
const domain = intervalSet([closedInterval(fromNumber(0), sqrt2)]);

// Format: "[0, √2]"
console.log(formatDomainInterval(domain));

// Intersect with ]0, +∞[
const result = intersect(domain, positiveReals());
// Result: ]0, √2]
```

## Types

### EndpointValue

Represents a bound value - either algebraic or infinity:

```typescript
type EndpointValue =
	| { kind: 'algebraic'; value: AlgebraicCoefficient }
	| { kind: 'infinity'; value: InfinityKind };

type InfinityKind = 'positive_infinity' | 'negative_infinity';
```

### Endpoint

A bound with its type (open/closed):

```typescript
interface Endpoint {
	value: EndpointValue;
	type: 'open' | 'closed';
}
```

### Interval

A continuous interval on the real line:

```typescript
interface Interval {
	kind: 'interval';
	lower: Endpoint;
	upper: Endpoint;
}
```

### IntervalDomain

Union type for all domain representations:

```typescript
type IntervalDomain = EmptySet | UniversalSet | IntervalSet;

interface IntervalSet {
	kind: 'interval_set';
	intervals: readonly Interval[];
	excludedPoints: readonly ExcludedPoint[];
}
```

## Factory Functions

### Creating Bound Values

```typescript
// From number (converted to exact rational)
fromNumber(0); // Algebraic 0
fromNumber(1.5); // Algebraic 3/2

// Exact rational
rationalBound(3n, 2n); // Exact 3/2

// Square root
radicalBound(2n); // √2
radicalBound(3n, 2n); // 2√3
radicalBound(2n, 1n, 2n); // (1/2)√2
```

### Creating Intervals

```typescript
// Bounded intervals
closedInterval(a, b); // [a, b]
openInterval(a, b); // ]a, b[
leftClosedInterval(a, b); // [a, b[
rightClosedInterval(a, b); // ]a, b]

// Half-lines
greaterThan(a); // ]a, +∞[
greaterThanOrEqual(a); // [a, +∞[
lessThan(a); // ]-∞, a[
lessThanOrEqual(a); // ]-∞, a]

// Special
realLine(); // ]-∞, +∞[
```

### Creating Domains

```typescript
// Basic domains
emptySet()                 // ∅
universalSet()             // ℝ
intervalSet([...])         // Union of intervals

// Common shortcuts
positiveReals()            // ]0, +∞[
nonNegativeReals()         // [0, +∞[
nonZeroReals()             // ℝ \ {0}
unitInterval()             // [-1, 1]
```

## Algebra Operations

```typescript
// Predicates
isEmpty(domain); // Is the domain empty?
isUniversal(domain); // Is it the universal set?
containsValue(domain, x); // Does domain contain value x?

// Set operations
intersect(a, b); // A ∩ B
union(a, b); // A ∪ B
complement(a); // ℝ \ A
difference(a, b); // A \ B

// Point exclusion
excludePoints(domain, [v1, v2]); // Domain \ {v1, v2}
```

## Formatting

```typescript
// French interval notation
formatDomainInterval(positiveReals()); // "]0, +∞["
formatDomainInterval(unitInterval()); // "[-1, 1]"
formatDomainInterval(nonZeroReals()); // "ℝ \ {0}"

// Condition notation
formatDomainCondition(positiveReals()); // "x > 0"
formatDomainCondition(unitInterval()); // "-1 ≤ x ≤ 1"

// Both formats
formatDomainFull(domain, 'x');
// { interval: "[0, √2]", condition: "0 ≤ x ≤ √2" }
```

## Algebraic Comparison

The module performs **exact comparison** of algebraic bounds where possible:

```typescript
// Exact: rationals compared via cross-multiplication
// √2 vs √3 → compare 2 vs 3 (exact)
// 3/2 vs √2 → compare 9/4 vs 2 (exact)

// Fallback: complex expressions use numeric approximation
// √2 + √3 vs 3 → numeric with exact: false flag
```

Comparison results include an `exact` flag:

```typescript
interface AlgebraicCompareResult {
	result: -1 | 0 | 1; // less, equal, greater
	exact: boolean; // true if comparison was exact
}
```

## Architecture

```
src/lib/math/intervals/
├── types.ts              # Type definitions
├── algebraic-compare.ts  # Exact algebraic comparison
├── endpoint.ts           # Endpoint utilities
├── factory.ts            # Factory functions
├── algebra.ts            # Set operations
├── format.ts             # Formatting
├── index.ts              # Public exports
└── __tests__/            # 152 tests
```

## Relation to mathAST/domain

The `intervals` module is **separate from** `mathAST/domain`:

| Module       | EndpointValue        | Purpose                          |
| ------------ | -------------------- | -------------------------------- |
| `intervals/` | AlgebraicCoefficient | Exact algebraic interval algebra |
| `domain/`    | MathNode \| number   | Expression domain computation    |

They serve different purposes and may be unified in the future.
