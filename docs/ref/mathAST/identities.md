# Mathematical Identities

Transformation rules and structure detection for notable mathematical identities.

## Overview

This module covers three categories of identity operations:

1. **Algebraic Identity Rewriting** (`transform/algebraic-identities.ts`) - Factor/expand polynomial identities (a²-b² ↔ (a+b)(a-b), etc.)
2. **Trigonometric & Hyperbolic Identities** (`transform/`) - Function identity transformations (sin²+cos²=1, angle addition, etc.)
3. **Algebraic Structure Detection** (`analysis/structures.ts`) - Detect polynomial structures without rewriting

All identity modules share a common infrastructure (`transform/identity-engine.ts`) for rule-based transformations.

---

## Algebraic Structures (Identités Remarquables)

Detection of notable algebraic identities. See [Analysis Module](./analysis.md#structure-detection) for complete documentation.

```typescript
import {
	detectStructure,
	isDifferenceOfSquares,
	isPerfectSquareTrinomial,
	isSumOfCubes,
	isDifferenceOfCubes,
	isQuadraticForm,
	hasCommonFactor
} from '$lib/mathAST/analysis';
```

### Supported Structures

| Structure                | Pattern       | Example      | Factorization   |
| ------------------------ | ------------- | ------------ | --------------- |
| Difference of squares    | a² - b²       | x² - 9       | (a+b)(a-b)      |
| Perfect square trinomial | a² ± 2ab + b² | x² + 6x + 9  | (a ± b)²        |
| Sum of cubes             | a³ + b³       | x³ + 8       | (a+b)(a²-ab+b²) |
| Difference of cubes      | a³ - b³       | x³ - 27      | (a-b)(a²+ab+b²) |
| Quadratic form           | ax² + bx + c  | 2x² + 3x + 1 | a(x-r₁)(x-r₂)   |
| Common factor            | k(...)        | 4x + 8       | 4(x + 2)        |

### Quick Examples

```typescript
import { parseLatex } from '$lib/mathAST';
import { isDifferenceOfSquares, isPerfectSquareTrinomial } from '$lib/mathAST/analysis';

// x² - 9 = (x+3)(x-3)
const diff = isDifferenceOfSquares(parseLatex('x^2 - 9'));
// diff.a → variable('x'), diff.b → number('3')

// x² + 6x + 9 = (x+3)²
const perfect = isPerfectSquareTrinomial(parseLatex('x^2 + 6x + 9'));
// perfect.a → variable('x'), perfect.b → number('3'), perfect.sign → '+'
```

---

## Algebraic Identity Rewriting

Transform polynomial expressions using remarkable identities (factoring and expanding).

```typescript
import { factorAlgebraic, expandAlgebraic, applyAlgebraicIdentities } from '$lib/mathAST/transform';
```

### Factoring Functions

| Input Pattern | Output          | Example                |
| ------------- | --------------- | ---------------------- |
| a² - b²       | (a+b)(a-b)      | x²-9 → (x+3)(x-3)      |
| a² + 2ab + b² | (a+b)²          | x²+6x+9 → (x+3)²       |
| a² - 2ab + b² | (a-b)²          | x²-4x+4 → (x-2)²       |
| a³ + b³       | (a+b)(a²-ab+b²) | x³+8 → (x+2)(x²-2x+4)  |
| a³ - b³       | (a-b)(a²+ab+b²) | x³-27 → (x-3)(x²+3x+9) |

### Expanding Functions

| Input Pattern | Output        | Example           |
| ------------- | ------------- | ----------------- |
| (a+b)(a-b)    | a² - b²       | (x+3)(x-3) → x²-9 |
| (a+b)²        | a² + 2ab + b² | (x+2)² → x²+4x+4  |
| (a-b)²        | a² - 2ab + b² | (x-3)² → x²-6x+9  |

### Usage Examples

```typescript
import { parseLatex } from '$lib/mathAST';
import { factorAlgebraic, expandAlgebraic } from '$lib/mathAST/transform';

// Factoring
const node1 = parseLatex('x^2 - 9');
const result1 = factorAlgebraic(node1);
// result1.result → (x+3)(x-3)
// result1.changed → true
// result1.appliedRules → ['diff-squares-to-product']

// Perfect square trinomial
const node2 = parseLatex('x^2 + 6x + 9');
const result2 = factorAlgebraic(node2);
// result2.result → (x+3)²

// Expanding
const node3 = parseLatex('(a+b)^2');
const result3 = expandAlgebraic(node3);
// result3.result → a² + 2ab + b²
```

### Individual Transforms

For fine-grained control, individual transforms are exported:

```typescript
import {
	TRANSFORM_DIFF_SQUARES_TO_PRODUCT,
	TRANSFORM_PERFECT_SQUARE_TRINOMIAL,
	TRANSFORM_SUM_CUBES_TO_PRODUCT,
	TRANSFORM_DIFF_CUBES_TO_PRODUCT,
	TRANSFORM_PRODUCT_TO_DIFF_SQUARES,
	TRANSFORM_EXPAND_SUM_SQUARED,
	TRANSFORM_EXPAND_DIFF_SQUARED
} from '$lib/mathAST/transform';

// Each is a function: (node: MathNode) => MathNode | null
const result = TRANSFORM_DIFF_SQUARES_TO_PRODUCT(parseLatex('x^2 - y^2'));
```

---

## Shared Identity Engine

All identity modules (algebraic, trig, hyperbolic) share common infrastructure for rule-based transformations.

```typescript
import {
	type TransformRule,
	type TransformResult,
	getBinding,
	applyTransformsToNode,
	applyTransformsDeep,
	applyIdentityTransforms
} from '$lib/mathAST/transform';
```

### TransformRule Interface

```typescript
interface TransformRule {
	readonly name: string;
	readonly transform: (node: MathNode) => MathNode | null;
}
```

### TransformResult Interface

```typescript
interface TransformResult {
	readonly result: MathNode;
	readonly changed: boolean;
	readonly appliedRules: readonly string[];
}
```

### Key Functions

| Function                  | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| `getBinding`              | Extract MathNode binding from pattern match          |
| `applyTransformsToNode`   | Apply first matching transform to a single node      |
| `applyTransformsDeep`     | Apply transforms recursively bottom-up               |
| `applyIdentityTransforms` | Apply transforms to fixed-point with iteration limit |

---

## Trigonometric Identities

The `transform/` module provides AST-level transformations for applying standard mathematical identities. Each transformation is a pure function that takes a `MathNode` and returns either a transformed node or `null` if the pattern doesn't match.

```typescript
import {
	// Algebraic
	factorAlgebraic,
	expandAlgebraic,
	// Trigonometric
	applyTrigIdentities,
	simplifyPythagorean,
	expandDoubleAngle,
	// Hyperbolic
	applyHyperbolicIdentities
} from '$lib/mathAST/transform';
```

### Application Functions

High-level functions that apply groups of related identities:

| Function                | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `applyTrigIdentities`   | Apply all trig identities recursively            |
| `simplifyPythagorean`   | sin²+cos²=1, tan²+1=sec², cot²+1=csc²            |
| `simplifyQuotients`     | sin/cos→tan, cos/sin→cot, 1/cos→sec, 1/sin→csc   |
| `contractToDoubleAngle` | sin(a)cos(a)→½sin(2a), sin²→(1-cos(2a))/2        |
| `linearize`             | sin²→(1-cos(2x))/2, cos²→(1+cos(2x))/2           |
| `expandAddition`        | sin(a+b), cos(a+b), tan(a+b) → expanded forms    |
| `expandDoubleAngle`     | sin(2a)→2sin(a)cos(a), cos(2a)→cos²(a)-sin²(a)   |
| `expandHalfAngle`       | sin(x/2), cos(x/2), tan(x/2) → expanded forms    |
| `simplifyNegativeAngle` | sin(-a)→-sin(a), cos(-a)→cos(a), tan(-a)→-tan(a) |
| `simplifyCofunction`    | sin(π/2-a)→cos(a), cos(π/2-a)→sin(a)             |
| `simplifySupplementary` | sin(π-a)→sin(a), cos(π-a)→-cos(a)                |
| `simplifyShiftPiOver2`  | sin(a+π/2)→cos(a), cos(a+π/2)→-sin(a)            |
| `factorize`             | sin(a)+sin(b), cos(a)+cos(b) → product forms     |
| `reducePeriodic`        | sin(a+2π)→sin(a), cos(a+2π)→cos(a)               |
| `reduceHigherPowers`    | sin³, cos³, sin⁴, cos⁴ → lower degree forms      |

### Pythagorean Identities

```typescript
import { simplifyPythagorean } from '$lib/mathAST/transform';

// sin²(x) + cos²(x) → 1
simplifyPythagorean(parseLatex('\\sin^2(x) + \\cos^2(x)'));

// 1 - sin²(x) → cos²(x)
simplifyPythagorean(parseLatex('1 - \\sin^2(x)'));

// 1 - cos²(x) → sin²(x)
simplifyPythagorean(parseLatex('1 - \\cos^2(x)'));

// tan²(x) + 1 → sec²(x)
simplifyPythagorean(parseLatex('\\tan^2(x) + 1'));

// sec²(x) - 1 → tan²(x)
simplifyPythagorean(parseLatex('\\sec^2(x) - 1'));

// cot²(x) + 1 → csc²(x)
simplifyPythagorean(parseLatex('\\cot^2(x) + 1'));

// csc²(x) - 1 → cot²(x)
simplifyPythagorean(parseLatex('\\csc^2(x) - 1'));
```

### Quotient Identities

```typescript
import { simplifyQuotients } from '$lib/mathAST/transform';

// sin(x)/cos(x) → tan(x)
simplifyQuotients(parseLatex('\\frac{\\sin(x)}{\\cos(x)}'));

// cos(x)/sin(x) → cot(x)
simplifyQuotients(parseLatex('\\frac{\\cos(x)}{\\sin(x)}'));

// 1/cos(x) → sec(x)
simplifyQuotients(parseLatex('\\frac{1}{\\cos(x)}'));

// 1/sin(x) → csc(x)
simplifyQuotients(parseLatex('\\frac{1}{\\sin(x)}'));
```

### Double Angle Formulas

```typescript
import { contractToDoubleAngle, expandDoubleAngle } from '$lib/mathAST/transform';

// Contraction: sin(a)cos(a) → ½sin(2a)
contractToDoubleAngle(parseLatex('\\sin(a)\\cos(a)'));

// Contraction: sin²(a) → (1 - cos(2a))/2
contractToDoubleAngle(parseLatex('\\sin^2(a)'));

// Contraction: cos²(a) → (1 + cos(2a))/2
contractToDoubleAngle(parseLatex('\\cos^2(a)'));

// Expansion: sin(2a) → 2sin(a)cos(a)
expandDoubleAngle(parseLatex('\\sin(2a)'));

// Expansion: cos(2a) → cos²(a) - sin²(a)
expandDoubleAngle(parseLatex('\\cos(2a)'));

// Expansion: tan(2a) → 2tan(a)/(1-tan²(a))
expandDoubleAngle(parseLatex('\\tan(2a)'));
```

### Addition Formulas

```typescript
import { expandAddition } from '$lib/mathAST/transform';

// sin(a + b) → sin(a)cos(b) + cos(a)sin(b)
expandAddition(parseLatex('\\sin(a + b)'));

// sin(a - b) → sin(a)cos(b) - cos(a)sin(b)
expandAddition(parseLatex('\\sin(a - b)'));

// cos(a + b) → cos(a)cos(b) - sin(a)sin(b)
expandAddition(parseLatex('\\cos(a + b)'));

// cos(a - b) → cos(a)cos(b) + sin(a)sin(b)
expandAddition(parseLatex('\\cos(a - b)'));

// tan(a + b) → (tan(a) + tan(b))/(1 - tan(a)tan(b))
expandAddition(parseLatex('\\tan(a + b)'));

// tan(a - b) → (tan(a) - tan(b))/(1 + tan(a)tan(b))
expandAddition(parseLatex('\\tan(a - b)'));
```

### Half-Angle Formulas

```typescript
import { expandHalfAngle } from '$lib/mathAST/transform';

// sin(x/2) → ±√((1 - cos(x))/2)
expandHalfAngle(parseLatex('\\sin(\\frac{x}{2})'));

// cos(x/2) → ±√((1 + cos(x))/2)
expandHalfAngle(parseLatex('\\cos(\\frac{x}{2})'));

// tan(x/2) → sin(x)/(1 + cos(x))
expandHalfAngle(parseLatex('\\tan(\\frac{x}{2})'));
```

### Product-to-Sum (Linearization)

```typescript
import { linearize } from '$lib/mathAST/transform';

// cos(a)cos(b) → ½(cos(a-b) + cos(a+b))
linearize(parseLatex('\\cos(a)\\cos(b)'));

// sin(a)sin(b) → ½(cos(a-b) - cos(a+b))
linearize(parseLatex('\\sin(a)\\sin(b)'));

// sin(a)cos(b) → ½(sin(a+b) + sin(a-b))
linearize(parseLatex('\\sin(a)\\cos(b)'));
```

### Sum-to-Product (Factorization)

```typescript
import { factorize } from '$lib/mathAST/transform';

// sin(a) + sin(b) → 2sin((a+b)/2)cos((a-b)/2)
factorize(parseLatex('\\sin(a) + \\sin(b)'));

// sin(a) - sin(b) → 2cos((a+b)/2)sin((a-b)/2)
factorize(parseLatex('\\sin(a) - \\sin(b)'));

// cos(a) + cos(b) → 2cos((a+b)/2)cos((a-b)/2)
factorize(parseLatex('\\cos(a) + \\cos(b)'));

// cos(a) - cos(b) → -2sin((a+b)/2)sin((a-b)/2)
factorize(parseLatex('\\cos(a) - \\cos(b)'));
```

### Angle Transformation

```typescript
import {
	simplifyNegativeAngle,
	simplifyCofunction,
	simplifySupplementary,
	simplifyShiftPiOver2
} from '$lib/mathAST/transform';

// Negative angles
simplifyNegativeAngle(parseLatex('\\sin(-x)')); // → -sin(x)
simplifyNegativeAngle(parseLatex('\\cos(-x)')); // → cos(x)
simplifyNegativeAngle(parseLatex('\\tan(-x)')); // → -tan(x)

// Cofunction (π/2 - x)
simplifyCofunction(parseLatex('\\sin(\\frac{\\pi}{2} - x)')); // → cos(x)
simplifyCofunction(parseLatex('\\cos(\\frac{\\pi}{2} - x)')); // → sin(x)
simplifyCofunction(parseLatex('\\tan(\\frac{\\pi}{2} - x)')); // → cot(x)

// Supplementary (π - x)
simplifySupplementary(parseLatex('\\sin(\\pi - x)')); // → sin(x)
simplifySupplementary(parseLatex('\\cos(\\pi - x)')); // → -cos(x)
simplifySupplementary(parseLatex('\\tan(\\pi - x)')); // → -tan(x)

// Shift by π/2
simplifyShiftPiOver2(parseLatex('\\sin(x + \\frac{\\pi}{2})')); // → cos(x)
simplifyShiftPiOver2(parseLatex('\\cos(x + \\frac{\\pi}{2})')); // → -sin(x)
simplifyShiftPiOver2(parseLatex('\\tan(x + \\frac{\\pi}{2})')); // → -cot(x)
```

### Higher Powers

```typescript
import { reduceHigherPowers } from '$lib/mathAST/transform';

// sin³(x) → (3sin(x) - sin(3x))/4
reduceHigherPowers(parseLatex('\\sin^3(x)'));

// cos³(x) → (3cos(x) + cos(3x))/4
reduceHigherPowers(parseLatex('\\cos^3(x)'));

// sin⁴(x) → (3 - 4cos(2x) + cos(4x))/8
reduceHigherPowers(parseLatex('\\sin^4(x)'));

// cos⁴(x) → (3 + 4cos(2x) + cos(4x))/8
reduceHigherPowers(parseLatex('\\cos^4(x)'));
```

## Hyperbolic Identities

All hyperbolic functions follow similar patterns with appropriate sign changes.

### Application Functions

| Function                        | Description                                            |
| ------------------------------- | ------------------------------------------------------ |
| `applyHyperbolicIdentities`     | Apply all hyperbolic identities recursively            |
| `simplifyHyperbolicPythagorean` | cosh²-sinh²=1, 1-tanh²=sech², coth²-1=csch²            |
| `simplifyHyperbolicQuotients`   | sinh/cosh→tanh, cosh/sinh→coth, 1/cosh→sech            |
| `contractToDoubleAngleH`        | sinh(a)cosh(a)→½sinh(2a), sinh²→(cosh(2a)-1)/2         |
| `linearizeH`                    | sinh²→(cosh(2x)-1)/2, cosh²→(cosh(2x)+1)/2             |
| `expandAdditionH`               | sinh(a+b), cosh(a+b), tanh(a+b) → expanded forms       |
| `expandDoubleAngleH`            | sinh(2a)→2sinh(a)cosh(a), cosh(2a)→cosh²(a)+sinh²(a)   |
| `expandHalfAngleH`              | sinh(x/2), cosh(x/2), tanh(x/2) → expanded forms       |
| `simplifyNegativeArgumentH`     | sinh(-a)→-sinh(a), cosh(-a)→cosh(a), tanh(-a)→-tanh(a) |
| `factorizeH`                    | sinh(a)+sinh(b), cosh(a)+cosh(b) → product forms       |
| `reduceHigherPowersH`           | sinh³, cosh³, sinh⁴, cosh⁴ → lower degree forms        |

### Hyperbolic Pythagorean Identities

```typescript
import { simplifyHyperbolicPythagorean } from '$lib/mathAST/transform';

// cosh²(x) - sinh²(x) → 1
simplifyHyperbolicPythagorean(parseLatex('\\cosh^2(x) - \\sinh^2(x)'));

// 1 + sinh²(x) → cosh²(x)
simplifyHyperbolicPythagorean(parseLatex('1 + \\sinh^2(x)'));

// cosh²(x) - 1 → sinh²(x)
simplifyHyperbolicPythagorean(parseLatex('\\cosh^2(x) - 1'));

// 1 - tanh²(x) → sech²(x)
simplifyHyperbolicPythagorean(parseLatex('1 - \\tanh^2(x)'));

// sech²(x) + tanh²(x) → 1  (Note: sech² = 1 - tanh²)
simplifyHyperbolicPythagorean(parseLatex('\\sech^2(x) + \\tanh^2(x)'));

// coth²(x) - 1 → csch²(x)
simplifyHyperbolicPythagorean(parseLatex('\\coth^2(x) - 1'));

// coth²(x) - csch²(x) → 1
simplifyHyperbolicPythagorean(parseLatex('\\coth^2(x) - \\csch^2(x)'));

// 1 + csch²(x) → coth²(x)
simplifyHyperbolicPythagorean(parseLatex('1 + \\csch^2(x)'));
```

### Hyperbolic Quotient Identities

```typescript
import { simplifyHyperbolicQuotients } from '$lib/mathAST/transform';

// sinh(x)/cosh(x) → tanh(x)
simplifyHyperbolicQuotients(parseLatex('\\frac{\\sinh(x)}{\\cosh(x)}'));

// cosh(x)/sinh(x) → coth(x)
simplifyHyperbolicQuotients(parseLatex('\\frac{\\cosh(x)}{\\sinh(x)}'));

// 1/cosh(x) → sech(x)
simplifyHyperbolicQuotients(parseLatex('\\frac{1}{\\cosh(x)}'));

// 1/sinh(x) → csch(x)
simplifyHyperbolicQuotients(parseLatex('\\frac{1}{\\sinh(x)}'));
```

### Hyperbolic Double Angle

```typescript
import { contractToDoubleAngleH, expandDoubleAngleH } from '$lib/mathAST/transform';

// Contraction: sinh(a)cosh(a) → ½sinh(2a)
contractToDoubleAngleH(parseLatex('\\sinh(a)\\cosh(a)'));

// Expansion: sinh(2a) → 2sinh(a)cosh(a)
expandDoubleAngleH(parseLatex('\\sinh(2a)'));

// Expansion: cosh(2a) → cosh²(a) + sinh²(a)
expandDoubleAngleH(parseLatex('\\cosh(2a)'));

// Expansion: tanh(2a) → 2tanh(a)/(1+tanh²(a))
expandDoubleAngleH(parseLatex('\\tanh(2a)'));
```

### Hyperbolic Addition Formulas

```typescript
import { expandAdditionH } from '$lib/mathAST/transform';

// sinh(a + b) → sinh(a)cosh(b) + cosh(a)sinh(b)
expandAdditionH(parseLatex('\\sinh(a + b)'));

// cosh(a + b) → cosh(a)cosh(b) + sinh(a)sinh(b)
expandAdditionH(parseLatex('\\cosh(a + b)'));

// tanh(a + b) → (tanh(a) + tanh(b))/(1 + tanh(a)tanh(b))
expandAdditionH(parseLatex('\\tanh(a + b)'));
```

### Hyperbolic Half-Angle

```typescript
import { expandHalfAngleH } from '$lib/mathAST/transform';

// sinh(x/2) → ±√((cosh(x) - 1)/2)
expandHalfAngleH(parseLatex('\\sinh(\\frac{x}{2})'));

// cosh(x/2) → √((cosh(x) + 1)/2)
expandHalfAngleH(parseLatex('\\cosh(\\frac{x}{2})'));

// tanh(x/2) → sinh(x)/(1 + cosh(x))
expandHalfAngleH(parseLatex('\\tanh(\\frac{x}{2})'));
```

## Key Differences: Trig vs Hyperbolic

| Property              | Trigonometric        | Hyperbolic               |
| --------------------- | -------------------- | ------------------------ |
| Pythagorean           | sin² + cos² = 1      | cosh² - sinh² = 1        |
| Product linearization | cos·cos → ½(cos+cos) | cosh·cosh → ½(cosh+cosh) |
| Negative argument     | cos(-x) = cos(x)     | cosh(-x) = cosh(x)       |
| Double angle cos      | cos²(a) - sin²(a)    | cosh²(a) + sinh²(a)      |
| tan² identity         | tan² + 1 = sec²      | 1 - tanh² = sech²        |

## Direct Transform Access

For fine-grained control, individual transforms are exported:

```typescript
import {
	// Algebraic
	TRANSFORM_DIFF_SQUARES_TO_PRODUCT,
	TRANSFORM_PERFECT_SQUARE_TRINOMIAL,
	TRANSFORM_EXPAND_SUM_SQUARED,
	// Trigonometric
	TRANSFORM_SIN_COS_PRODUCT,
	TRANSFORM_DOUBLE_ANGLE_SIN,
	TRANSFORM_PYTHAGOREAN,
	// Hyperbolic
	TRANSFORM_SINH_COSH_PRODUCT,
	TRANSFORM_HYPERBOLIC_PYTHAGOREAN
} from '$lib/mathAST/transform';

// Each transform is a function: (node: MathNode) => MathNode | null
const result = TRANSFORM_PYTHAGOREAN(node);
```

## Return Types

All transformation functions return a `TransformResult` (with type aliases for each category):

```typescript
interface TransformResult {
	readonly result: MathNode;
	readonly changed: boolean;
	readonly appliedRules: readonly string[];
}

// Type aliases for backward compatibility
type AlgebraicTransformResult = TransformResult;
type TrigTransformResult = TransformResult;
type HyperbolicTransformResult = TransformResult;

// Usage
const { result, changed, appliedRules } = applyTrigIdentities(ast);
if (changed) {
	console.log('Applied rules:', appliedRules.join(', '));
}
```

## See Also

- [Analysis Module](./analysis.md#structure-detection) - Algebraic structure detection (complete API)
- [Pattern Matching](./patterns.md) - General pattern matching system
- [Normalization](./normalization.md) - Canonical form transformations
- [Factory Functions](./factory-transforms.md) - Creating AST nodes
