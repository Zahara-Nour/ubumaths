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
| min      | ℝ           | Piecewise         |
| max      | ℝ           | Piecewise         |
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
- **Monotonicity**: Uses function properties for accurate bounds
- **Endpoint preservation**: Open/closed status maintained through operations

```typescript
// x + 1 on [0, +∞[ → [1, +∞[
computeRange(parseLatex('x + 1'), 'x', { domain: nonNegativeReals() });

// x^2 on ℝ → [0, +∞[ (even power)
computeRange(parseLatex('x^2'), 'x');

// sin(x^2) → [-1, 1] (composition)
computeRange(parseLatex('\\sin{x^2}'), 'x');
```

### Composition Propagation

For composed functions `f(g(x))`, the system correctly chains ranges:

```typescript
// sin(cos(x)): cos(x) → [-1, 1], then sin([-1, 1]) → [-0.84, 0.84]
computeRange(parseLatex('\\sin{\\cos{x}}'), 'x');

// sqrt(4): evaluates to single point {2}
computeRange(parseLatex('\\sqrt{4}'), 'x');

// ln(exp(x)): exp(x) → ]0, +∞[, then ln(]0, +∞[) → ℝ
computeRange(parseLatex('\\ln{e^x}'), 'x');
```

### Endpoint Type Preservation

Arithmetic operations preserve open/closed endpoint types:

```typescript
// ]0, 1] + [1, 2[ = ]1, 3[
// Open + Open = Open, Open + Closed = Open, Closed + Closed = Closed
```

### Advanced Range Analysis

The range computation includes several advanced features for accurate results:

#### Quadratic Detection

Expressions of the form `ax² + bx + c` are detected and analyzed using the vertex formula:

```typescript
// x² on [-2, 3]: vertex at x=0, range is [0, max(4, 9)] = [0, 9]
computeRange(parseLatex('x^2'), 'x', { domain: closedInterval(-2, 3) });

// x² - 4x + 3 on [0, 4]: vertex at x=2, y=-1
computeRange(parseLatex('x^2 - 4x + 3'), 'x', { domain: closedInterval(0, 4) });
```

#### Piecewise Function Handling

Functions like `abs`, `min`, and `max` are handled algebraically (not by sampling):

```typescript
// |x| on [-3, 2]: range is [0, 3]
computeRange(parseLatex('|x|'), 'x', { domain: closedInterval(-3, 2) });

// min(x, 2) on [0, 5]: range is [0, 2]
computeRange(parseLatex('\\min(x, 2)'), 'x', { domain: closedInterval(0, 5) });

// max(x², 1) on [-2, 2]: range is [1, 4]
computeRange(parseLatex('\\max(x^2, 1)'), 'x', { domain: closedInterval(-2, 2) });
```

#### Rational Powers

Expressions like `x^(p/q)` are detected and handled with proper domain restrictions:

```typescript
// x^(1/2) = √x on [0, 4]: range is [0, 2]
computeRange(parseLatex('x^{1/2}'), 'x', { domain: closedInterval(0, 4) });

// x^(2/3) on [-8, 27]: range is [0, 9]
computeRange(parseLatex('x^{2/3}'), 'x', { domain: closedInterval(-8, 27) });
```

#### Periodic Function Optimization

For trigonometric functions, if the input domain spans at least one full period, the full range is returned:

```typescript
// sin(x) on [0, 2π]: full period → range is [-1, 1]
computeRange(parseLatex('\\sin{x}'), 'x', { domain: closedInterval(0, 2 * Math.PI) });

// tan(x) on [0, π]: full period → range is ℝ
computeRange(parseLatex('\\tan{x}'), 'x', { domain: closedInterval(0, Math.PI) });
```

#### Critical Point Analysis

For complex expressions on bounded domains, derivatives are used to find extrema:

```typescript
// Uses critical points when algebraic patterns aren't detected
// Evaluates at domain endpoints and critical points within the domain
```

The intervals module provides these arithmetic operations:

```typescript
import { add, subtract, multiply, divide, negate, scale } from '$lib/math/intervals';

const a = closedInterval(fromNumber(1), fromNumber(3)); // [1, 3]
const b = closedInterval(fromNumber(2), fromNumber(4)); // [2, 4]

add(a, b); // [3, 7] - Minkowski sum
subtract(a, b); // [-3, 1] - Minkowski difference
multiply(a, b); // [2, 12] - Four-corners multiplication
divide(a, b); // [0.25, 1.5] - Four-corners division
negate(a); // [-3, -1] - Negation
scale(a, 2); // [2, 6] - Scalar multiplication
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

### Range Helpers (Advanced)

| Function                         | Description                             |
| -------------------------------- | --------------------------------------- |
| `extractQuadratic`               | Detect ax² + bx + c pattern             |
| `extractRationalPower`           | Detect x^(p/q) pattern                  |
| `computeQuadraticRange`          | Range using vertex formula              |
| `computeAbsRange`                | Algebraic \|f(x)\| range                |
| `computeMinRange`                | Piecewise min(a, b) range               |
| `computeMaxRange`                | Piecewise max(a, b) range               |
| `computeRationalPowerRange`      | Range for x^(p/q) expressions           |
| `findCriticalPoints`             | Find derivative zeros                   |
| `computeRangeWithCriticalPoints` | Range using critical point analysis     |
| `spansFullPeriod`                | Check if domain covers full trig period |
| `getFunctionPeriod`              | Get period of trigonometric function    |

> **Deprecated**: `formatDomainInterval` → use `formatInterval`, `formatDomainCondition` → use `formatCondition`

## File Structure

```
src/lib/mathAST/domain/
├── types.ts         # Domain type definitions (re-exports from intervals)
├── factory.ts       # Factory functions (re-exports from intervals)
├── algebra.ts       # Domain algebra (delegates to intervals)
├── builtins.ts      # Built-in function domains and ranges
├── compute.ts       # Domain computation
├── range.ts         # Range (image) computation
├── range-helpers.ts # Advanced range analysis (quadratic, piecewise, critical points)
├── preimage.ts      # Inequality solving
├── validate.ts      # Validation functions
├── format.ts        # Formatting functions (delegates to intervals)
├── errors.ts        # DomainError class
├── index.ts         # Public exports
└── __tests__/       # 750+ tests (comprehensive edge cases)

src/lib/math/intervals/  (upstream module)
├── types.ts       # EndpointValue = MathNode, IntervalSet
├── factory.ts     # fromNumber(), interval factories
├── algebra.ts     # intersect, union, complement, etc.
└── format.ts      # formatEndpointValue, formatInterval
```

## Future Improvements

This section documents potential enhancements and extensions for the domain module.

### High Priority

#### Enhanced Pedagogical Steps

Enrich the `DomainStep` type with more detailed reasoning for educational purposes:

```typescript
interface EnhancedDomainStep {
	type: 'restriction' | 'intersection' | 'union' | 'simplification';
	expression: string; // Expression concerned
	constraint: string; // Applied constraint
	reasoning: string; // French explanation
	intermediateResult: Domain; // Intermediate result
	rule: string; // Mathematical rule used
}

// Example for sqrt(ln(x)):
// Step 1: "ln(x) est défini pour x > 0" → ]0, +∞[
// Step 2: "sqrt(u) est défini pour u ≥ 0, donc ln(x) ≥ 0"
// Step 3: "ln(x) ≥ 0 équivaut à x ≥ 1" → [1, +∞[
```

#### Interactive Validation

For exercises where students must find the domain:

```typescript
interface DomainValidation {
	isCorrect: boolean;
	score: number; // 0-100%
	feedback: string[]; // Pedagogical messages
	missingParts: Domain; // What's missing
	extraParts: Domain; // What's extra
	hints: string[]; // Progressive hints
}

function validateStudentDomain(
	studentAnswer: string, // "x > 0 et x ≠ 1"
	correctDomain: Domain,
	expression: MathNode
): DomainValidation;
```

#### Common Mistake Detection

Detect and explain typical student errors:

```typescript
interface CommonMistake {
	type: 'forgot_denominator' | 'wrong_direction' | 'missing_case' | 'sign_error';
	description: string;
	correction: string;
}

function detectCommonMistakes(
	studentDomain: Domain,
	correctDomain: Domain,
	expression: MathNode
): CommonMistake[];
```

### Medium Priority

#### Rational Preimage Solving

Extend preimage solving to rational expressions:

```typescript
// Currently: linear, quadratic, cubic
// Extension: rational expressions like (x-1)/(x+2)

function solveRationalInequality(
	numerator: MathNode,
	denominator: MathNode,
	relation: '>=' | '>' | '<=' | '<',
	variable: string
): Domain;

// Example: ln((x-1)/(x+2)) requires (x-1)/(x+2) > 0
// Sign table analysis → ]-∞, -2[ ∪ ]1, +∞[
```

#### Trigonometric Preimage Solving

Handle trigonometric arguments:

```typescript
// sqrt(sin(x)) requires sin(x) >= 0
// Solution: x ∈ [2kπ, π + 2kπ] for k ∈ ℤ

function solveTrigonometricInequality(
	funcName: 'sin' | 'cos' | 'tan',
	argument: MathNode,
	relation: '>=' | '>' | '<=' | '<',
	bound: number,
	variable: string
): Domain; // Returns PeriodicExclusion or union of periodic intervals
```

#### LaTeX Export

Format domains in LaTeX for MathLive integration:

```typescript
function formatDomainLatex(domain: Domain, variable: string): string;
// Examples:
// positiveReals() → "D_f = \\mathbb{R}^{*+}" or "]0, +\\infty["
// nonZeroReals() → "D_f = \\mathbb{R} \\setminus \\{0\\}"

function formatDomainMathML(domain: Domain, variable: string): string;

function formatDomainSetBuilder(domain: Domain, variable: string): string;
// Example: "{x ∈ ℝ | x > 0 ∧ x ≠ 1}"
```

#### Derivability Domain

Compute domain where the function is differentiable (more restricted than definition domain):

```typescript
interface DerivabilityResult {
	domain: Domain;
	nonDerivablePoints: Array<{
		point: EndpointValue;
		reason: 'cusp' | 'corner' | 'vertical_tangent' | 'discontinuity';
	}>;
}

function computeDerivabilityDomain(expr: MathNode, variable: string): DerivabilityResult;

// Example: |x| is defined on ℝ but not derivable at x = 0 (corner)
```

### Low Priority

#### Parametric Domains

For exercises involving parameters ("study according to a"):

```typescript
interface ParametricDomain {
	kind: 'parametric';
	parameter: string; // 'a'
	cases: Array<{
		condition: string; // "a > 0"
		domain: Domain;
	}>;
}

// Example: sqrt(ax + b)
// If a > 0: [-b/a, +∞[
// If a < 0: ]-∞, -b/a]
// If a = 0 and b >= 0: ℝ
// If a = 0 and b < 0: ∅
```

#### Multivariate Domains

For functions ℝ² → ℝ:

```typescript
interface MultiVariableDomain {
	kind: 'multivariate';
	variables: string[]; // ['x', 'y']
	constraints: Constraint2D[]; // x² + y² < 1, y > 0, etc.
}

function computeDomain2D(expr: MathNode, variables: [string, string]): MultiVariableDomain;

// Example: ln(1 - x² - y²)
// Domain: open disk x² + y² < 1
```

#### Domain Visualization

Integration with a graphing system:

```typescript
interface DomainVisualization {
	// For single-variable functions
	numberLine: {
		intervals: Array<{ start: number; end: number; included: [boolean, boolean] }>;
		excludedPoints: number[];
	};

	// For two-variable functions
	region2D?: {
		boundaries: Curve[];
		fillCondition: string;
	};
}

function visualizeDomain(domain: Domain): DomainVisualization;
```

### Performance Optimizations

#### Domain Caching

Memoization for repeated expressions:

```typescript
const domainCache = new WeakMap<MathNode, DomainResult>();

function computeDomainCached(
	expr: MathNode,
	variable: string,
	options?: DomainOptions
): DomainResult;
```

#### Lazy Evaluation

Compute domains only when needed:

```typescript
interface LazyDomain {
	compute(): Domain;
	readonly isComputed: boolean;
	readonly cachedResult?: Domain;
}
```

### Integration Enhancements

#### Continuity Analysis

Combine domain with continuity information:

```typescript
interface ContinuityInfo {
	domain: Domain;
	discontinuities: Array<{
		point: EndpointValue;
		type: 'removable' | 'jump' | 'infinite' | 'oscillating';
		leftLimit?: number;
		rightLimit?: number;
	}>;
}

function analyzeContinuity(expr: MathNode, variable: string): ContinuityInfo;
```

### Priority Summary

| Priority | Feature                        | Educational Value | Complexity |
| -------- | ------------------------------ | ----------------- | ---------- |
| 🔴 High  | Enhanced pedagogical steps     | ⭐⭐⭐⭐⭐        | Medium     |
| 🔴 High  | Interactive validation         | ⭐⭐⭐⭐⭐        | Medium     |
| 🔴 High  | Common mistake detection       | ⭐⭐⭐⭐⭐        | Medium     |
| 🟠 Med   | Rational preimage solving      | ⭐⭐⭐⭐          | Medium     |
| 🟠 Med   | LaTeX export                   | ⭐⭐⭐⭐          | Low        |
| 🟠 Med   | Derivability domain            | ⭐⭐⭐⭐          | Medium     |
| 🟡 Low   | Parametric domains             | ⭐⭐⭐            | High       |
| 🟡 Low   | Trigonometric preimage solving | ⭐⭐⭐            | High       |
| 🟡 Low   | Multivariate domains           | ⭐⭐              | High       |
| ⚪ Opt   | Domain visualization           | ⭐⭐⭐            | High       |
| ⚪ Opt   | Caching/lazy evaluation        | ⭐                | Low        |

## See Also

- [Evaluation](./evaluation.md) - Numeric evaluation
- [CLI & REPL](./cli.md) - Command-line interface
- [Types & Nodes](./types.md) - MathAST node types
