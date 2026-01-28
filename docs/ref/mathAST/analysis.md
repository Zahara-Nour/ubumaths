# Expression Analysis

The analysis module provides tools for extracting structural information from mathematical expressions.

## Import

```typescript
import {
	// Linear combinations
	extractLinearCombination,
	isLinearCombination,
	getCoefficient,
	equalLinearCombinations,
	type LinearCombinationResult,

	// Expression classification
	classifyExpression,
	getPolynomialDegree,
	isPolynomialIn,
	containsTranscendental,
	getTranscendentalType,
	containsRadical,
	isRationalIn,
	calculateComplexity,
	type ExpressionCategory,
	type ExpressionClassification,

	// Polynomial analysis
	analyzePolynomial,
	getPolynomialCoefficients,
	isMonomial,
	isBinomial,
	isTrinomial,
	getTermCount,
	type MonomialInfo,
	type PolynomialAnalysis,

	// Structure detection
	detectStructure,
	isDifferenceOfSquares,
	isPerfectSquareTrinomial,
	isSumOfCubes,
	isDifferenceOfCubes,
	isQuadraticForm,
	isFactoredForm,
	hasCommonFactor,
	type DetectedStructure,

	// Symmetry detection
	detectSymmetry,
	isEven,
	isOdd,
	hasNoSymmetry,
	type SymmetryType,
	type SymmetryResult,

	// Periodicity detection
	detectPeriodicity,
	isPeriodic,
	getPeriod,
	getPeriodNumeric,
	type PeriodicityResult
} from '$lib/mathAST/analysis';
```

---

## Expression Classification

Classifies expressions by their mathematical category.

### `classifyExpression(node, variable?)`

Returns detailed classification of an expression.

```typescript
import { parseLatex } from '$lib/mathAST';
import { classifyExpression } from '$lib/mathAST/analysis';

// Polynomial
classifyExpression(parseLatex('x^2 + 2x + 1'), 'x');
// → { category: 'polynomial', polynomialDegree: 2, ... }

// Trigonometric
classifyExpression(parseLatex('\\sin(x)'), 'x');
// → { category: 'trigonometric', hasTranscendental: true, ... }

// Rational
classifyExpression(parseLatex('\\frac{x}{x+1}'), 'x');
// → { category: 'rational', polynomialDegree: null, ... }
```

**Returns:** `ExpressionClassification`

```typescript
interface ExpressionClassification {
	category: ExpressionCategory;
	subCategories: readonly ExpressionCategory[];
	variables: readonly string[];
	polynomialDegree: number | null;
	degreeInVariable?: Map<string, number>;
	complexity: number;
	isConstant: boolean;
	hasTranscendental: boolean;
	transcendentalType: 'trigonometric' | 'exponential' | 'logarithmic' | null;
}

type ExpressionCategory =
	| 'constant'
	| 'polynomial'
	| 'rational'
	| 'radical'
	| 'trigonometric'
	| 'exponential'
	| 'logarithmic'
	| 'algebraic'
	| 'transcendental'
	| 'mixed'
	| 'unknown';
```

### Helper Functions

```typescript
// Polynomial degree (null if not polynomial)
getPolynomialDegree(parseLatex('x^2 + x'), 'x'); // 2
getPolynomialDegree(parseLatex('\\sin(x)'), 'x'); // null

// Boolean checks
isPolynomialIn(parseLatex('x^2 + 1'), 'x'); // true
containsTranscendental(parseLatex('\\sin(x)')); // true
containsRadical(parseLatex('\\sqrt{x}')); // true
isRationalIn(parseLatex('\\frac{x}{x+1}'), 'x'); // true

// Get transcendental type
getTranscendentalType(parseLatex('\\sin(x)')); // 'trigonometric'
getTranscendentalType(parseLatex('\\exp(x)')); // 'exponential'
getTranscendentalType(parseLatex('\\ln(x)')); // 'logarithmic'

// Structural complexity score
calculateComplexity(parseLatex('x')); // low
calculateComplexity(parseLatex('\\frac{x^2+1}{\\sqrt{x+1}}')); // high
```

---

## Polynomial Analysis

Detailed analysis of polynomial expressions.

### `analyzePolynomial(node, variable)`

Returns complete polynomial analysis including coefficients.

```typescript
import { analyzePolynomial } from '$lib/mathAST/analysis';

const result = analyzePolynomial(parseLatex('2x^2 + 3x + 1'), 'x');
// result.isPolynomial → true
// result.degree → 2
// result.termCount → 3
// result.leadingCoefficient → number('2')
// result.constantTerm → number('1')
// result.coefficients → Map { 2 → number('2'), 1 → number('3'), 0 → number('1') }
```

**Returns:** `PolynomialAnalysis`

```typescript
interface PolynomialAnalysis {
	isPolynomial: boolean;
	error?: string;
	variable: string;
	degree: number;
	termCount: number;
	leadingCoefficient: MathNode;
	constantTerm: MathNode;
	monomials: readonly MonomialInfo[];
	coefficients: ReadonlyMap<number, MathNode>;
}

interface MonomialInfo {
	coefficient: MathNode;
	degree: number;
	term: MathNode;
	variables: readonly string[];
}
```

### `getPolynomialCoefficients(node, variable)`

Returns map of degree → coefficient, or `null` if not polynomial.

```typescript
const coeffs = getPolynomialCoefficients(parseLatex('x^2 + 2x + 1'), 'x');
// coeffs.get(2) → number('1')
// coeffs.get(1) → number('2')
// coeffs.get(0) → number('1')
```

### Term Count Classifiers

```typescript
isMonomial(parseLatex('3x^2')); // true (1 term)
isBinomial(parseLatex('x + 1')); // true (2 terms)
isTrinomial(parseLatex('x^2 + 2x + 1')); // true (3 terms)
getTermCount(parseLatex('a + b + c + d')); // 4
```

---

## Structure Detection

Detects notable algebraic structures and identities.

### `detectStructure(node)`

Returns all detected structures in the expression.

```typescript
import { detectStructure } from '$lib/mathAST/analysis';

const structures = detectStructure(parseLatex('x^2 - 4'));
// Returns both 'difference_of_squares' and 'quadratic_form'
```

### Individual Structure Detectors

#### Difference of Squares: a² - b²

```typescript
const result = isDifferenceOfSquares(parseLatex('x^2 - 9'));
// result.type → 'difference_of_squares'
// result.a → variable('x')
// result.b → number('3')  (since 9 = 3²)
```

#### Perfect Square Trinomial: a² ± 2ab + b²

```typescript
const result = isPerfectSquareTrinomial(parseLatex('x^2 + 2x + 1'));
// result.type → 'perfect_square_trinomial'
// result.a → variable('x')
// result.b → number('1')
// result.sign → '+'  (for (a + b)²)
```

#### Sum/Difference of Cubes: a³ ± b³

```typescript
isSumOfCubes(parseLatex('x^3 + 8'));
// → { a: variable('x'), b: number('2') }  (since 8 = 2³)

isDifferenceOfCubes(parseLatex('x^3 - 27'));
// → { a: variable('x'), b: number('3') }  (since 27 = 3³)
```

#### Quadratic Form: ax² + bx + c

```typescript
const result = isQuadraticForm(parseLatex('2x^2 + 3x + 1'));
// result.variable → 'x'
// result.a → number('2')
// result.b → number('3')
// result.c → number('1')
```

#### Factored Form: (x - r₁)(x - r₂)

```typescript
const result = isFactoredForm(parseLatex('(x - 1)(x + 2)'));
// result.variable → 'x'
// result.factors → [delimiter containing (x-1), delimiter containing (x+2)]
// result.roots → [number('1'), opposite(number('2'))]
```

#### Common Factor: k(...)

```typescript
const result = hasCommonFactor(parseLatex('4x + 8'));
// result.factor → number('4')
// result.remainder → (x + 2) as MathNode
```

### Structure Types

| Structure                  | Pattern       | Example      |
| -------------------------- | ------------- | ------------ |
| `difference_of_squares`    | a² - b²       | x² - 9       |
| `perfect_square_trinomial` | a² ± 2ab + b² | x² + 2x + 1  |
| `sum_of_cubes`             | a³ + b³       | x³ + 8       |
| `difference_of_cubes`      | a³ - b³       | x³ - 27      |
| `quadratic_form`           | ax² + bx + c  | 2x² + 3x + 1 |
| `factored_form`            | (x-r₁)(x-r₂)  | (x-1)(x+2)   |
| `common_factor`            | k(...)        | 4x + 8       |

---

## Linear Combination Extraction

Extracts coefficients from linear combinations of the form:

```
a₁·x₁ + a₂·x₂ + ... + aₙ·xₙ
```

where coefficients can be any MathNode (not just numbers).

### `extractLinearCombination(node, variables)`

```typescript
// Numeric coefficients
const result = extractLinearCombination(parseLatex('2x + 3y'), ['x', 'y']);
// result.coefficients.get('x') → number('2')
// result.coefficients.get('y') → number('3')

// Symbolic coefficients
const result2 = extractLinearCombination(parseLatex('\\sqrt{2}x + \\pi y'), ['x', 'y']);
// result2.coefficients.get('x') → sqrt(2) as MathNode
// result2.coefficients.get('y') → π as MathNode
```

**Returns:** `LinearCombinationResult`

```typescript
interface LinearCombinationResult {
	coefficients: ReadonlyMap<string, MathNode>;
	variables: readonly string[];
	isLinear: boolean;
	error?: string;
}
```

### Helper Functions

```typescript
// Check if valid linear combination
isLinearCombination(parseLatex('2x + 3y'), ['x', 'y']); // true
isLinearCombination(parseLatex('xy'), ['x', 'y']); // false (product)
isLinearCombination(parseLatex('x + 1'), ['x']); // false (constant term)

// Get single coefficient
getCoefficient(parseLatex('2x + 3y'), 'x', ['y']); // → number('2')

// Compare linear combinations
equalLinearCombinations(parseLatex('2x + 3y'), parseLatex('3y + 2x'), ['x', 'y']); // true
```

### Supported Coefficient Types

| Expression | Variable | Extracted Coefficient              |
| ---------- | -------- | ---------------------------------- |
| `x`        | x        | `number('1')`                      |
| `-x`       | x        | `number('-1')`                     |
| `2x`       | x        | `number('2')`                      |
| `√2·x`     | x        | `func('sqrt', [number('2')])`      |
| `πy`       | y        | `greek('pi')`                      |
| `x/2`      | x        | `divide(number('1'), number('2'))` |
| `cos(3)x`  | x        | `func('cos', [number('3')])`       |

### Rejected Expressions

| Expression | Reason                               |
| ---------- | ------------------------------------ |
| `xy`       | Product of two variables (quadratic) |
| `x²`       | Power of variable (quadratic)        |
| `x + 1`    | Contains constant term               |
| `1/x`      | Variable in denominator              |
| `sin(x)`   | Variable inside function             |

---

---

## Symmetry Detection

Detects whether expressions are even, odd, or neither.

### `detectSymmetry(node, variable?)`

Returns detailed symmetry analysis.

```typescript
import { parseLatex } from '$lib/mathAST';
import { detectSymmetry } from '$lib/mathAST/analysis';

// Even functions: f(-x) = f(x)
detectSymmetry(parseLatex('x^2'));
// → { symmetry: 'even', variable: 'x', confidence: 'proven' }

detectSymmetry(parseLatex('\\cos(x)'));
// → { symmetry: 'even', variable: 'x', confidence: 'heuristic' }

// Odd functions: f(-x) = -f(x)
detectSymmetry(parseLatex('x^3'));
// → { symmetry: 'odd', variable: 'x', confidence: 'proven' }

detectSymmetry(parseLatex('\\sin(x)'));
// → { symmetry: 'odd', variable: 'x', confidence: 'heuristic' }

// No symmetry
detectSymmetry(parseLatex('x^2 + x'));
// → { symmetry: 'none', variable: 'x', confidence: 'proven' }
```

**Returns:** `SymmetryResult`

```typescript
type SymmetryType = 'even' | 'odd' | 'none' | 'unknown';

interface SymmetryResult {
	symmetry: SymmetryType;
	variable: string;
	confidence: 'proven' | 'heuristic';
	reason?: string;
}
```

### Helper Functions

```typescript
// Boolean checks
isEven(parseLatex('x^2')); // true
isEven(parseLatex('\\cos(x)')); // true
isEven(parseLatex('x^3')); // false

isOdd(parseLatex('x^3')); // true
isOdd(parseLatex('\\sin(x)')); // true
isOdd(parseLatex('x^2')); // false

hasNoSymmetry(parseLatex('x^2 + x')); // true
hasNoSymmetry(parseLatex('x + 1')); // true
```

### Symmetry Rules

| Expression | Type | Reason                      |
| ---------- | ---- | --------------------------- |
| `x²`       | even | Even power                  |
| `x³`       | odd  | Odd power                   |
| `cos(x)`   | even | Known even function         |
| `sin(x)`   | odd  | Known odd function          |
| `x·sin(x)` | even | odd × odd = even            |
| `x·cos(x)` | odd  | odd × even = odd            |
| `x² + x`   | none | even + odd = none           |
| `cos(x³)`  | even | even function of odd = even |

### Known Functions

| Even                | Odd                                    |
| ------------------- | -------------------------------------- |
| cos, cosh, abs, sec | sin, sinh, tan, tanh, cot, csc, arcsin |

### Domain Symmetry Requirement

A function can only be even or odd if its domain is symmetric about the origin.

```typescript
// sqrt(x) has domain [0, +∞[ - NOT symmetric
detectSymmetry(parseLatex('\\sqrt{x}'));
// → { symmetry: 'none', reason: 'Domain is not symmetric...' }

// ln(x) has domain ]0, +∞[ - NOT symmetric
detectSymmetry(parseLatex('\\ln(x)'));
// → { symmetry: 'none', reason: 'Domain is not symmetric...' }

// ln(x²) has domain ℝ \ {0} - symmetric, and function is even
detectSymmetry(parseLatex('\\ln(x^2)'));
// → { symmetry: 'even', ... }

// 1/x has domain ℝ \ {0} - symmetric, and function is odd
detectSymmetry(parseLatex('\\frac{1}{x}'));
// → { symmetry: 'odd', ... }
```

---

## Periodicity Detection

Detects whether expressions are periodic and computes their period.

### `detectPeriodicity(node, variable?)`

Returns detailed periodicity analysis.

```typescript
import { parseLatex } from '$lib/mathAST';
import { detectPeriodicity } from '$lib/mathAST/analysis';

// Basic trigonometric functions
detectPeriodicity(parseLatex('\\sin(x)'));
// → { isPeriodic: true, periodNumeric: 6.283..., variable: 'x' }

detectPeriodicity(parseLatex('\\tan(x)'));
// → { isPeriodic: true, periodNumeric: 3.141..., variable: 'x' }

// Scaled arguments: sin(kx) has period 2π/k
detectPeriodicity(parseLatex('\\sin(2x)'));
// → { isPeriodic: true, periodNumeric: 3.141..., ... }

detectPeriodicity(parseLatex('\\cos(\\pi x)'));
// → { isPeriodic: true, periodNumeric: 2, ... }

// Non-periodic functions
detectPeriodicity(parseLatex('x^2'));
// → { isPeriodic: false, period: null }
```

**Returns:** `PeriodicityResult`

```typescript
interface PeriodicityResult {
	isPeriodic: boolean;
	period: MathNode | null;
	periodNumeric: number | null;
	variable: string;
	confidence: 'proven' | 'heuristic';
	reason?: string;
}
```

### Helper Functions

```typescript
// Boolean check
isPeriodic(parseLatex('\\sin(x)')); // true
isPeriodic(parseLatex('x^2')); // false

// Get period as MathNode
getPeriod(parseLatex('\\sin(x)')); // 2π node
getPeriod(parseLatex('x^2')); // null

// Get numeric period
getPeriodNumeric(parseLatex('\\sin(x)')); // 6.283185...
getPeriodNumeric(parseLatex('\\tan(x)')); // 3.141592...
getPeriodNumeric(parseLatex('\\sin(2x)')); // 3.141592...
```

### Periodicity Rules

| Expression        | Period | Reason                |
| ----------------- | ------ | --------------------- |
| `sin(x)`          | 2π     | Base period           |
| `cos(x)`          | 2π     | Base period           |
| `tan(x)`          | π      | Base period           |
| `sin(2x)`         | π      | Period = 2π / 2       |
| `cos(πx)`         | 2      | Period = 2π / π       |
| `sin(x) + cos(x)` | 2π     | LCM of periods        |
| `sin(x) * cos(x)` | 2π     | LCM of periods        |
| `sin²(x)`         | 2π     | Same as base function |

### Known Periodic Functions

| Function           | Base Period |
| ------------------ | ----------- |
| sin, cos, sec, csc | 2π          |
| tan, cot           | π           |

**Note:** Hyperbolic functions (sinh, cosh, etc.) are NOT periodic on ℝ.

---

## Domain Analysis

The analysis module re-exports the complete domain module for convenience.

```typescript
import {
	// Domain computation
	computeDomain,
	computeRange,

	// Domain factories
	positiveReals,
	nonNegativeReals,
	nonZeroReals,

	// Validation
	isInDomain,
	getDomainViolations

	// ... and all other domain exports
} from '$lib/mathAST/analysis';
```

For complete domain documentation, see [Domain](./domain.md).

---

## See Also

- [Domain](./domain.md) - Domain of definition computation and validation
- [Pattern Matching](./patterns.md) - For complex structural matching
- [Normalization](./normalization.md) - For polynomial equivalence checking
- [Types](./types.md) - MathNode type definitions
