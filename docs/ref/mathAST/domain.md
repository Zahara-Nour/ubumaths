# Domain System

The domain system computes, validates, and displays the domain of definition for mathematical expressions.

## Overview

The domain module provides:

- **Domain types**: Empty, Universal, Interval, and Condition-based domains
- **Domain algebra**: Intersection, union, complement operations
- **Automatic computation**: Computes domains for composed expressions with preimage solving
- **Validation**: Runtime checks with pedagogical French error messages
- **French notation**: Standard French interval notation (]a, b[ for open intervals)

## Quick Start

```typescript
import {
	computeDomain,
	formatDomainInterval,
	formatDomainCondition,
	isInDomain,
	getDomainViolations
} from '$lib/mathAST';

// Compute domain of sqrt(x-2)
const result = computeDomain(parseLatex('\\sqrt{x-2}'), 'x');
formatDomainInterval(result.domain); // "[2, +∞["
formatDomainCondition(result.domain, 'x'); // "x >= 2"

// Validate a value
isInDomain(parseLatex('\\sqrt{x}'), { x: 4 }); // true
isInDomain(parseLatex('\\sqrt{x}'), { x: -1 }); // false

// Get violation details
const violations = getDomainViolations(parseLatex('\\sqrt{x}'), { x: -1 });
// violations[0].messageFr: "sqrt(x) requiert x >= 0, valeur recue : x = -1"
```

## Domain Types

### EmptyDomain

Represents the empty set (no valid values).

```typescript
import { emptyDomain } from '$lib/mathAST';

const empty = emptyDomain();
formatDomainInterval(empty); // "∅"
```

### UniversalDomain

Represents all real numbers.

```typescript
import { universalDomain } from '$lib/mathAST';

const real = universalDomain();
formatDomainInterval(real); // "ℝ"
```

### IntervalDomain

Union of intervals with optional excluded points.

```typescript
import {
	intervalDomain,
	positiveReals,
	nonNegativeReals,
	nonZeroReals,
	unitInterval,
	greaterThan,
	lessThanOrEqual,
	excludedPoint
} from '$lib/mathAST';

// Common domains
positiveReals(); // ]0, +∞[
nonNegativeReals(); // [0, +∞[
nonZeroReals(); // ℝ \ {0}
unitInterval(); // [-1, 1]

// Custom intervals
intervalDomain([greaterThan(2)]); // ]2, +∞[
intervalDomain([lessThanOrEqual(-2), greaterThan(2)]); // ]-∞, -2] ∪ ]2, +∞[

// Excluded points
intervalDomain([greaterThan(0)], [excludedPoint(1)]); // ]0, +∞[ \ {1}
```

### ConditionDomain

Condition-based representation for complex constraints.

```typescript
import { conditionDomain } from '$lib/mathAST';

// x > 0 AND x < 10
const cond = conditionDomain(
	[
		{ kind: 'comparison', variable: 'x', op: '>', bound: 0 },
		{ kind: 'comparison', variable: 'x', op: '<', bound: 10 }
	],
	'and'
);
```

## Domain Algebra

```typescript
import { domainIntersect, domainUnion, domainComplement, domainIsEmpty } from '$lib/mathAST';

const a = positiveReals(); // ]0, +∞[
const b = unitInterval(); // [-1, 1]

domainIntersect(a, b); // ]0, 1]
domainUnion(a, b); // [-1, +∞[
domainComplement(positiveReals()); // ]-∞, 0]
domainIsEmpty(emptyDomain()); // true
```

## Domain Computation

The `computeDomain` function automatically computes domains for complex expressions by:

1. Identifying function domain constraints (sqrt needs x >= 0, ln needs x > 0)
2. Computing preimages for compositions (sqrt(x-2) needs x-2 >= 0, so x >= 2)
3. Finding zeros for division (1/(x-1) excludes x = 1)
4. Intersecting all constraints

```typescript
import { computeDomain } from '$lib/mathAST';

// Simple functions
computeDomain(parseLatex('\\sqrt{x}')).domain; // [0, +∞[
computeDomain(parseLatex('\\ln{x}')).domain; // ]0, +∞[
computeDomain(parseLatex('\\frac{1}{x}')).domain; // ℝ \ {0}
computeDomain(parseLatex('\\arcsin{x}')).domain; // [-1, 1]

// Compositions with preimage solving
computeDomain(parseLatex('\\sqrt{x-2}')).domain; // [2, +∞[
computeDomain(parseLatex('\\ln{1-x}')).domain; // ]-∞, 1[
computeDomain(parseLatex('\\sqrt{4-x^2}')).domain; // [-2, 2]

// Multiple constraints
computeDomain(parseLatex('\\ln{x} + \\sqrt{1-x}')).domain; // ]0, 1]

// Division
computeDomain(parseLatex('\\frac{1}{x-1}')).domain; // ℝ \ {1}
computeDomain(parseLatex('\\frac{\\sqrt{x}}{x-2}')).domain; // [0, +∞[ \ {2}
```

### Show Steps Option

```typescript
const result = computeDomain(parseLatex('\\ln{x} + \\sqrt{1-x}'), 'x', { showSteps: true });

result.steps; // Array of computation steps for pedagogical display
```

## Built-in Function Domains

The system knows domains for standard mathematical functions:

| Function       | Domain  | Constraint   |
| -------------- | ------- | ------------ |
| sqrt           | [0, +∞[ | x >= 0       |
| ln, log        | ]0, +∞[ | x > 0        |
| arcsin, arccos | [-1, 1] | -1 <= x <= 1 |
| arctan         | ℝ       | (none)       |
| exp, sin, cos  | ℝ       | (none)       |
| arccosh        | [1, +∞[ | x >= 1       |
| arctanh        | ]-1, 1[ | -1 < x < 1   |

```typescript
import { getBuiltinDomain, hasRestrictedDomain } from '$lib/mathAST';

getBuiltinDomain('sqrt'); // [0, +∞[
getBuiltinDomain('sin'); // ℝ
hasRestrictedDomain('sqrt'); // true
hasRestrictedDomain('sin'); // false
```

## Validation

### Simple Check

```typescript
import { isInDomain } from '$lib/mathAST';

isInDomain(parseLatex('\\sqrt{x}'), { x: 4 }); // true
isInDomain(parseLatex('\\sqrt{x}'), { x: -1 }); // false
isInDomain(parseLatex('\\frac{1}{x}'), { x: 0 }); // false
```

### Detailed Violations

```typescript
import { getDomainViolations } from '$lib/mathAST';

const violations = getDomainViolations(parseLatex('\\sqrt{x}'), { x: -1 });

violations[0];
// {
//   source: 'sqrt',
//   parameter: 'x',
//   constraint: 'x >= 0',
//   value: -1,
//   messageFr: 'sqrt(x) requiert x >= 0, valeur recue : x = -1',
//   messageEn: 'sqrt(x) requires x >= 0, got x = -1'
// }
```

## French Notation

The system uses standard French interval notation:

| French   | English  | Meaning         |
| -------- | -------- | --------------- |
| ]a, b[   | (a, b)   | Open interval   |
| [a, b]   | [a, b]   | Closed interval |
| [a, b[   | [a, b)   | Half-open       |
| ]a, b]   | (a, b]   | Half-open       |
| ]-∞, a[  | (-∞, a)  | Left unbounded  |
| ]a, +∞[  | (a, +∞)  | Right unbounded |
| ℝ \\ {0} | ℝ \\ {0} | Excluded point  |

```typescript
import { formatDomainInterval, formatDomainCondition } from '$lib/mathAST';

formatDomainInterval(positiveReals()); // "]0, +∞["
formatDomainInterval(nonZeroReals()); // "ℝ \\ {0}"
formatDomainInterval(unitInterval()); // "[-1, 1]"

formatDomainCondition(positiveReals(), 'x'); // "x > 0"
formatDomainCondition(nonZeroReals(), 'x'); // "x ≠ 0"
formatDomainCondition(unitInterval(), 'x'); // "-1 ≤ x ≤ 1"
```

## CLI Integration

### .domain Command

The REPL includes a `.domain` command:

```
> .domain sqrt(x)
Expression : sqrt(x)

Domaine : [0, +∞[
Condition : x >= 0

> .domain ln(x) + sqrt(1-x)
Expression : ln(x) + sqrt(1-x)

Contraintes :
  • ln(x) requiert x > 0
  • sqrt(1-x) requiert x <= 1

Domaine : ]0, 1]
Condition : 0 < x <= 1
```

### .def Command Integration

When defining functions with `.def`, domains are automatically computed:

```
> .def f(x) = 1/x
Defined: f(x) = 1/x
  f'(x) = -1/x^2
  Domaine : x ≠ 0

> .def g(x) = sqrt(x) + ln(x)
Defined: g(x) = sqrt(x) + ln(x)
  g'(x) = 1/(2*sqrt(x)) + 1/x
  Domaine : x > 0
```

## API Reference

### Types

```typescript
type Domain = EmptyDomain | UniversalDomain | IntervalDomain | ConditionDomain;

interface DomainResult {
	domain: Domain;
	variable: string;
	steps?: DomainStep[];
}

interface DomainViolation {
	source: string;
	parameter: string;
	constraint: string;
	value: number;
	messageFr: string;
	messageEn: string;
}
```

### Functions

| Function                | Description                             |
| ----------------------- | --------------------------------------- |
| `computeDomain`         | Compute domain for an expression        |
| `isInDomain`            | Check if bindings are in domain         |
| `getDomainViolations`   | Get detailed violations                 |
| `formatDomainInterval`  | Format as French interval notation      |
| `formatDomainCondition` | Format as condition (x > 0)             |
| `formatDomainFull`      | Get both interval and condition formats |
| `domainIntersect`       | Intersect two domains                   |
| `domainUnion`           | Union of two domains                    |
| `domainComplement`      | Complement of a domain                  |
| `domainIsEmpty`         | Check if domain is empty                |
| `containsValue`         | Check if value is in domain             |
| `getBuiltinDomain`      | Get domain for a builtin function       |
| `hasRestrictedDomain`   | Check if function has restricted domain |

## File Structure

```
src/lib/mathAST/domain/
├── types.ts       # Domain type definitions
├── factory.ts     # Factory functions
├── algebra.ts     # Domain algebra operations
├── builtins.ts    # Built-in function domains
├── compute.ts     # Domain computation
├── preimage.ts    # Inequality solving
├── validate.ts    # Validation functions
├── format.ts      # Formatting functions
├── errors.ts      # DomainError class
├── index.ts       # Public exports
└── __tests__/     # 209 tests
```

## See Also

- [Evaluation](./evaluation.md) - Numeric evaluation
- [CLI & REPL](./cli.md) - Command-line interface
- [Types & Nodes](./types.md) - MathAST node types
