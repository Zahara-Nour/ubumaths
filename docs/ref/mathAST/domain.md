# Domain System

The domain system computes, validates, and displays the domain of definition and range (image) for mathematical expressions.

## Overview

The domain module provides:

- **Domain types**: Empty, Universal, IntervalSet, ConditionDomain, and PeriodicExclusion domains
- **Domain algebra**: Intersection, union, complement, difference operations
- **Symbolic bounds**: Support for π, e, √2, √3, and other symbolic endpoints
- **Automatic computation**: Computes domains for composed expressions with preimage solving
- **Range computation**: Computes output range (image) of expressions
- **Validation**: Runtime checks with pedagogical French error messages
- **French notation**: Standard French interval notation (]a, b[ for open intervals)

> **Architecture**: The domain module delegates interval representation and algebra to `$lib/math/intervals/`, keeping domain-specific features (compute, validate, builtins, ConditionDomain) local.

## Quick Start

```typescript
import {
	computeDomain,
	computeRange,
	formatInterval,
	formatCondition,
	isInDomain,
	getDomainViolations,
	getBuiltinRange
} from '$lib/mathAST';

// Compute domain of sqrt(x-2)
const result = computeDomain(parseLatex('\\sqrt{x-2}'), 'x');
formatInterval(result.domain); // "[2, +∞["
formatCondition(result.domain, 'x'); // "x >= 2"

// Compute range (image) of an expression
const rangeResult = computeRange(parseLatex('\\sin{x}'), 'x');
formatInterval(rangeResult.range); // "[-1, 1]"

// Get builtin function range
getBuiltinRange('sqrt'); // [0, +∞[
getBuiltinRange('sin'); // [-1, 1]

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
formatInterval(empty); // "∅"
```

### UniversalDomain

Represents all real numbers.

```typescript
import { universalDomain } from '$lib/mathAST';

const real = universalDomain();
formatInterval(real); // "ℝ"
```

### IntervalSet

Union of intervals with optional excluded points. Endpoint values are `MathNode` (use `fromNumber()` for numeric values).

```typescript
import {
	intervalDomain,
	positiveReals,
	nonNegativeReals,
	nonZeroReals,
	unitInterval,
	greaterThan,
	lessThanOrEqual,
	excludedPoint,
	domainFromNumber,
	pi,
	sqrt2
} from '$lib/mathAST';

// Common domains
positiveReals(); // ]0, +∞[
nonNegativeReals(); // [0, +∞[
nonZeroReals(); // ℝ \ {0}
unitInterval(); // [-1, 1]

// Custom intervals (use domainFromNumber for numeric bounds)
intervalDomain([greaterThan(domainFromNumber(2))]); // ]2, +∞[
intervalDomain([lessThanOrEqual(domainFromNumber(-2)), greaterThan(domainFromNumber(2))]); // ]-∞, -2] ∪ ]2, +∞[

// Symbolic bounds
intervalDomain([closedInterval(domainFromNumber(0), pi())]); // [0, π]
intervalDomain([closedInterval(domainFromNumber(0), sqrt2())]); // [0, √2]

// Excluded points
intervalDomain([greaterThan(domainFromNumber(0))], [excludedPoint(domainFromNumber(1))]); // ]0, +∞[ \ {1}
```

> **Note**: `IntervalDomain` is a deprecated alias for `IntervalSet`. The `kind` property is `'interval_set'`.

### ConditionDomain

Condition-based representation for complex constraints.

```typescript
import { conditionDomain, comparison, domainFromNumber } from '$lib/mathAST';

// x > 0 AND x < 10
const cond = conditionDomain(
	[comparison('x', '>', domainFromNumber(0)), comparison('x', '<', domainFromNumber(10))],
	'and'
);

// x != 5
const notFive = conditionDomain([comparison('x', '!=', domainFromNumber(5))]);
```

> **Note**: Simple ConditionDomain constraints (like `x > 0`, `x != 5`, `x > 0 AND x < 10`) are automatically converted to IntervalSet when possible via `tryConvertConditionToInterval()`.

### PeriodicExclusion

Represents domains with periodic excluded points, used for trigonometric functions like tan, cot, sec, csc.

```typescript
import { tanDomain, cotDomain, secDomain, cscDomain, periodicExclusion } from '$lib/mathAST';

// Predefined trig domains
tanDomain(); // ℝ \ {π/2 + kπ : k ∈ ℤ}
cotDomain(); // ℝ \ {kπ : k ∈ ℤ}
secDomain(); // ℝ \ {π/2 + kπ : k ∈ ℤ}
cscDomain(); // ℝ \ {kπ : k ∈ ℤ}

// Custom periodic exclusion
periodicExclusion(pi(), multiply(number('2'), pi())); // ℝ \ {π + 2kπ : k ∈ ℤ}
```

## Domain Algebra

```typescript
import {
	domainIntersect,
	domainUnion,
	domainComplement,
	domainDifference,
	domainIsEmpty,
	domainIsUniversal,
	containsValue
} from '$lib/mathAST';

const a = positiveReals(); // ]0, +∞[
const b = unitInterval(); // [-1, 1]

domainIntersect(a, b); // ]0, 1]
domainUnion(a, b); // [-1, +∞[
domainComplement(positiveReals()); // ]-∞, 0]
domainDifference(a, b); // ]1, +∞[
domainIsEmpty(emptyDomain()); // true
domainIsUniversal(universalDomain()); // true
containsValue(positiveReals(), 5); // true
containsValue(positiveReals(), -1); // false
```

### Algebra Properties

The domain algebra satisfies standard set-theoretic properties:

- **Associativity**: `(A ∩ B) ∩ C = A ∩ (B ∩ C)` and `(A ∪ B) ∪ C = A ∪ (B ∪ C)`
- **De Morgan**: `complement(A ∪ B) = complement(A) ∩ complement(B)`
- **Double complement**: `complement(complement(D)) = D`
- **Idempotence**: `D ∪ D = D` and `D ∩ D = D`

## Domain Computation

The `computeDomain` function automatically computes domains for complex expressions by:

1. Identifying function domain constraints (sqrt needs x >= 0, ln needs x > 0)
2. Computing preimages for compositions (sqrt(x-2) needs x-2 >= 0, so x >= 2)
3. Finding zeros for division (1/(x-1) excludes x = 1)
4. Intersecting all constraints

### Preimage Solving

The system solves preimages for linear, quadratic, and cubic polynomial arguments:

- **Linear**: `sqrt(2x - 4)` → solve `2x - 4 >= 0` → `x >= 2`
- **Quadratic**: `sqrt(4 - x²)` → solve `4 - x² >= 0` → `[-2, 2]`
- **Cubic**: `sqrt(x³ - x)` → solve `x³ - x >= 0` → `[-1, 0] ∪ [1, +∞[`

It also handles function compositions (e.g., `sqrt(ln(x))`, `ln(sqrt(x))`) by analyzing inner function output ranges.

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

| Function       | Domain             | Constraint   |
| -------------- | ------------------ | ------------ |
| sqrt           | [0, +∞[            | x >= 0       |
| ln, log        | ]0, +∞[            | x > 0        |
| arcsin, arccos | [-1, 1]            | -1 <= x <= 1 |
| arctan, arccot | ℝ                  | (none)       |
| exp, sin, cos  | ℝ                  | (none)       |
| tan, sec       | ℝ \ {π/2 + kπ}     | x ≠ π/2 + kπ |
| cot, csc       | ℝ \ {kπ}           | x ≠ kπ       |
| arccosh        | [1, +∞[            | x >= 1       |
| arctanh        | ]-1, 1[            | -1 < x < 1   |
| arcsec, arccsc | ]-∞, -1] ∪ [1, +∞[ | \|x\| >= 1   |

```typescript
import { getBuiltinDomain, hasRestrictedDomain } from '$lib/mathAST';

getBuiltinDomain('sqrt'); // [0, +∞[
getBuiltinDomain('sin'); // ℝ
hasRestrictedDomain('sqrt'); // true
hasRestrictedDomain('sin'); // false
```

## Range Computation

The `computeRange` function computes the output range (image) of mathematical expressions using interval arithmetic.

### Built-in Function Ranges

| Function | Range       | Description       |
| -------- | ----------- | ----------------- |
| sqrt     | [0, +∞[     | Non-negative      |
| abs      | [0, +∞[     | Non-negative      |
| exp      | ]0, +∞[     | Strictly positive |
| ln, log  | ℝ           | All reals         |
| sin, cos | [-1, 1]     | Bounded           |
| tan      | ℝ           | Unbounded         |
| asin     | [-π/2, π/2] | Bounded           |
| acos     | [0, π]      | Bounded           |
| atan     | ]-π/2, π/2[ | Open bounded      |
| sinh     | ℝ           | Unbounded         |
| cosh     | [1, +∞[     | Minimum at 1      |
| tanh     | ]-1, 1[     | Open bounded      |

```typescript
import { getBuiltinRange, hasRestrictedRange, computeRange } from '$lib/mathAST';

// Lookup builtin ranges
getBuiltinRange('sqrt'); // [0, +∞[
getBuiltinRange('sin'); // [-1, 1]
getBuiltinRange('exp'); // ]0, +∞[
hasRestrictedRange('sin'); // true (bounded)
hasRestrictedRange('ln'); // false (unbounded)

// Compute range of expressions
computeRange(parseLatex('x^2'), 'x').range; // [0, +∞[
computeRange(parseLatex('\\sin{x}'), 'x').range; // [-1, 1]
computeRange(parseLatex('\\sqrt{x} + 1'), 'x').range; // [1, +∞[

// Compute range on restricted input domain
import { positiveReals } from '$lib/mathAST';
computeRange(parseLatex('x^2'), 'x', { domain: positiveReals() }).range; // ]0, +∞[
```

### Interval Arithmetic

The range computation uses interval arithmetic for operations:

- **Addition/Subtraction**: Minkowski sum/difference of intervals
- **Multiplication/Division**: Interval multiplication/division with sign analysis
- **Powers**: Even powers → non-negative, odd powers preserve sign structure
- **Composition**: Range of outer function applied to range of inner

```typescript
// x + 1 on [0, +∞[ → [1, +∞[
computeRange(parseLatex('x + 1'), 'x', { domain: nonNegativeReals() });

// x^2 on ℝ → [0, +∞[ (even power)
computeRange(parseLatex('x^2'), 'x');

// sin(x^2) → [-1, 1] (composition)
computeRange(parseLatex('\\sin{x^2}'), 'x');
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
import { formatInterval, formatCondition } from '$lib/mathAST';

formatInterval(positiveReals()); // "]0, +∞["
formatInterval(nonZeroReals()); // "ℝ \\ {0}"
formatInterval(unitInterval()); // "[-1, 1]"

formatCondition(positiveReals(), 'x'); // "x > 0"
formatCondition(nonZeroReals(), 'x'); // "x ≠ 0"
formatCondition(unitInterval(), 'x'); // "-1 ≤ x ≤ 1"
```

> **Note**: `formatDomainInterval` and `formatDomainCondition` are deprecated aliases for `formatInterval` and `formatCondition`.

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
// Core types (from intervals module)
type EndpointValue = MathNode; // Symbolic or numeric bound
type EndpointType = 'open' | 'closed';
interface Endpoint {
	value: EndpointValue;
	type: EndpointType;
}
interface Interval {
	kind: 'interval';
	lower: Endpoint;
	upper: Endpoint;
}

// Domain types
type EmptySet = { kind: 'empty' };
type UniversalSet = { kind: 'universal' };
type IntervalSet = {
	kind: 'interval_set';
	intervals: Interval[];
	excludedPoints: ExcludedPoint[];
};
type ConditionDomain = {
	kind: 'condition_domain';
	conditions: Condition[];
	combinator: 'and' | 'or';
};
type PeriodicExclusion = {
	kind: 'periodic_exclusion';
	basePoint: MathNode; // e.g., π/2
	period: MathNode; // e.g., π
};

type Domain = EmptySet | UniversalSet | IntervalSet | ConditionDomain | PeriodicExclusion;

// Backward compatibility aliases
type EmptyDomain = EmptySet; // @deprecated
type UniversalDomain = UniversalSet; // @deprecated
type IntervalDomain = IntervalSet; // @deprecated

interface DomainResult {
	domain: Domain;
	variable: string;
	steps?: DomainStep[];
}

interface RangeResult {
	range: Domain;
	variable: string;
	inputDomain?: Domain;
	steps?: RangeStep[];
}

interface RangeStep {
	expression: string;
	rangeDescription: string;
	explanation: string;
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

| Function              | Description                                      |
| --------------------- | ------------------------------------------------ |
| `computeDomain`       | Compute domain for an expression                 |
| `computeRange`        | Compute range (image) for an expression          |
| `isInDomain`          | Check if bindings are in domain                  |
| `getDomainViolations` | Get detailed violations                          |
| `formatInterval`      | Format as French interval notation               |
| `formatCondition`     | Format as condition (x > 0)                      |
| `formatDomainFull`    | Get both interval and condition formats          |
| `formatEndpointValue` | Format symbolic endpoint (π, √2, etc.)           |
| `domainFromNumber`    | Create MathNode bound from number                |
| `domainIntersect`     | Intersect two domains                            |
| `domainUnion`         | Union of two domains                             |
| `domainComplement`    | Complement of a domain                           |
| `domainDifference`    | Difference of two domains (A \\ B)               |
| `domainIsEmpty`       | Check if domain is empty                         |
| `domainIsUniversal`   | Check if domain is universal (ℝ)                 |
| `containsValue`       | Check if numeric value is in domain              |
| `domainExcludePoints` | Add excluded points to domain                    |
| `getBuiltinDomain`    | Get domain for a builtin function                |
| `getBuiltinRange`     | Get range for a builtin function                 |
| `hasRestrictedDomain` | Check if function has restricted domain          |
| `hasRestrictedRange`  | Check if function has restricted (bounded) range |

> **Deprecated**: `formatDomainInterval` → use `formatInterval`, `formatDomainCondition` → use `formatCondition`

## File Structure

```
src/lib/mathAST/domain/
├── types.ts       # Domain type definitions (re-exports from intervals)
├── factory.ts     # Factory functions (re-exports from intervals)
├── algebra.ts     # Domain algebra (delegates to intervals)
├── builtins.ts    # Built-in function domains and ranges
├── compute.ts     # Domain computation
├── range.ts       # Range (image) computation
├── preimage.ts    # Inequality solving
├── validate.ts    # Validation functions
├── format.ts      # Formatting functions (delegates to intervals)
├── errors.ts      # DomainError class
├── index.ts       # Public exports
└── __tests__/     # 574 tests (comprehensive edge cases)

src/lib/math/intervals/  (upstream module)
├── types.ts       # EndpointValue = MathNode, IntervalSet
├── factory.ts     # fromNumber(), interval factories
├── algebra.ts     # intersect, union, complement, etc.
└── format.ts      # formatEndpointValue, formatInterval
```

## See Also

- [Evaluation](./evaluation.md) - Numeric evaluation
- [CLI & REPL](./cli.md) - Command-line interface
- [Types & Nodes](./types.md) - MathAST node types
