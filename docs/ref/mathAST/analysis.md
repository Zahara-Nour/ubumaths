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
	// User-defined periodic functions
	registerPeriodicFunction,
	unregisterPeriodicFunction,
	clearPeriodicFunctionRegistry,
	getRegisteredPeriodicFunctions,
	isRegisteredPeriodicFunction,
	type PeriodicityResult,
	type PeriodicityStep,
	type PeriodicityRule,
	type PeriodicityOptions,
	type UserPeriodicFunction,
	type RegisterFunctionOptions,

	// Coefficient extraction utilities
	extractLinearForm,
	extractCoefficientAndVariable,
	type LinearForm,
	type ExtractedTerm
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

Detects notable algebraic structures and identities (identités remarquables).

> **Note:** For trigonometric and hyperbolic identities (sin²+cos²=1, angle formulas, etc.), see [Identities](./identities.md).

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

Detects whether expressions are periodic and computes their **minimal** period.
Includes **pedagogical explanations** (in French) for each step of the analysis.

### `detectPeriodicity(node, options?)`

Returns detailed periodicity analysis with symbolic period and pedagogical steps.

```typescript
import { parseLatex } from '$lib/mathAST';
import { detectPeriodicity } from '$lib/mathAST/analysis';

// Basic trigonometric functions
detectPeriodicity(parseLatex('\\sin(x)'));
// → { isPeriodic: true, period: 2π (symbolic), periodNumeric: 6.283..., variable: 'x', steps: [...] }

detectPeriodicity(parseLatex('\\tan(x)'));
// → { isPeriodic: true, period: π (symbolic), periodNumeric: 3.141..., variable: 'x', steps: [...] }

// Scaled arguments: sin(kx) has period 2π/k
detectPeriodicity(parseLatex('\\sin(2x)'));
// → { isPeriodic: true, period: π (symbolic), periodNumeric: 3.141..., steps: [...] }

// Minimal period detection (half-period antisymmetry)
detectPeriodicity(parseLatex('\\sin^2(x)'));
// → { isPeriodic: true, period: π (symbolic), periodNumeric: 3.141..., steps: [...] }

detectPeriodicity(parseLatex('\\sin(x)\\cos(x)'));
// → { isPeriodic: true, period: π (symbolic), periodNumeric: 3.141..., steps: [...] }

// Function compositions
detectPeriodicity(parseLatex('\\sin(\\sin(x))'));
// → { isPeriodic: true, period: 2π, periodNumeric: 6.283..., steps: [...] }

detectPeriodicity(parseLatex('\\exp(\\sin(x))'));
// → { isPeriodic: true, period: 2π, periodNumeric: 6.283..., steps: [...] }

// Non-periodic functions
detectPeriodicity(parseLatex('x^2'));
// → { isPeriodic: false, period: null, steps: [] }

detectPeriodicity(parseLatex('\\sin(x^2)'));
// → { isPeriodic: false, period: null, steps: [] } (x² is not periodic)

// With options
detectPeriodicity(parseLatex('\\sin(x)'), { variable: 'x', verbosity: 'detailed' });
```

**Options:** `PeriodicityOptions`

```typescript
interface PeriodicityOptions {
	variable?: string; // Variable to check (auto-detected if single)
	verbosity?: Verbosity; // 'result' | 'summarized' | 'detailed' (default: 'summarized')
}
```

**Returns:** `PeriodicityResult`

```typescript
interface PeriodicityResult {
	isPeriodic: boolean;
	period: MathNode | null; // Symbolic period (e.g., π, 2π, 2π/3)
	periodNumeric: number | null; // Numeric approximation
	variable: string;
	confidence: 'proven' | 'heuristic';
	reason?: string;
	steps?: readonly PeriodicityStep[]; // Pedagogical explanations
	// Domain integration (new)
	domain?: Domain; // Domain of definition
	discontinuities?: PeriodicExclusion; // Periodic discontinuities
	isContinuous?: boolean; // Whether function is continuous on its domain
}
```

### Pedagogical Steps

Each step explains one rule applied during periodicity detection:

```typescript
interface PeriodicityStep {
	id: number;
	rule: PeriodicityRule;
	description: string; // French explanation
	detail?: string; // LaTeX formula
	verbosityLevel: Verbosity;
}

type PeriodicityRule =
	| 'base_period' // Période de base de la fonction
	| 'user_function' // Fonction utilisateur définie
	| 'scaling' // Dilatation de l'argument
	| 'translation' // Translation (période inchangée)
	| 'even_power' // Puissance paire → période ÷ 2
	| 'odd_power' // Puissance impaire → période inchangée
	| 'product_antisymmetry' // sin·cos → période ÷ 2
	| 'quotient_antisymmetry' // sin/cos → période ÷ 2
	| 'absolute_value' // |sin| → période ÷ 2
	| 'step_function' // floor, ceil → période 1
	| 'composition' // sin(sin(x)) hérite
	| 'exponential' // a^{sin(x)} hérite
	| 'sum_lcm' // sin + cos → PPCM
	| 'constant_offset' // sin + 1 → inchangée
	| 'constant_factor' // 2·sin → inchangée
	| 'domain_exclusion' // Discontinuités périodiques
	| 'not_periodic';
```

**Example:**

```typescript
const result = detectPeriodicity(parseLatex('\\sin^2(x)'));
console.log(result.steps);
// [
//   { id: 1, rule: 'base_period', description: 'Période de base de la fonction',
//     detail: '\\sin(x) a pour période de base 2\\pi' },
//   { id: 2, rule: 'even_power', description: 'Puissance paire : la période est divisée par 2',
//     detail: 'Puissance 2 (paire) : f(x + T/2) = -f(x) donc f^2(x + T/2) = f^2(x). Période 2\\pi → \\pi' }
// ]
```

### Verbosity Levels

| Level          | Description                               | Use Case                         |
| -------------- | ----------------------------------------- | -------------------------------- |
| `'result'`     | No steps returned                         | Performance-critical computation |
| `'summarized'` | Important steps only (default)            | Pedagogical display              |
| `'detailed'`   | All steps including micro-transformations | Debugging, advanced users        |

### Helper Functions

```typescript
// Boolean check
isPeriodic(parseLatex('\\sin(x)')); // true
isPeriodic(parseLatex('x^2')); // false

// Get period as MathNode (symbolic)
getPeriod(parseLatex('\\sin(x)')); // 2π node (multiplication)
getPeriod(parseLatex('\\sin^2(x)')); // π node (constant)
getPeriod(parseLatex('x^2')); // null

// Get numeric period
getPeriodNumeric(parseLatex('\\sin(x)')); // 6.283185...
getPeriodNumeric(parseLatex('\\tan(x)')); // 3.141592...
getPeriodNumeric(parseLatex('\\sin^2(x)')); // 3.141592... (minimal period)
```

### Minimal Period Detection

Functions with **half-period antisymmetry** (f(x + T/2) = -f(x)) have reduced period when squared or multiplied:

| Expression      | Period | Reason                                       |
| --------------- | ------ | -------------------------------------------- |
| `sin(x)`        | 2π     | Base period                                  |
| `sin²(x)`       | **π**  | sin(x + π) = -sin(x) → sin²(x + π) = sin²(x) |
| `cos²(x)`       | **π**  | Same antisymmetry property                   |
| `sin(x)·cos(x)` | **π**  | Both antisymmetric → product has period π    |
| `sin(x)/cos(x)` | **π**  | Both antisymmetric → quotient has period π   |
| `sin³(x)`       | 2π     | Odd power preserves antisymmetry             |
| `tan²(x)`       | π      | tan has no antisymmetry, period unchanged    |

### Absolute Value

If f(x) has half-period antisymmetry (f(x + T/2) = -f(x)), then |f(x)| has period T/2:

| Expression    | Period  | Reason                                    |
| ------------- | ------- | ----------------------------------------- |
| `\|sin(x)\|`  | **π**   | \|sin(x + π)\| = \|-sin(x)\| = \|sin(x)\| |
| `\|cos(x)\|`  | **π**   | Same antisymmetry property                |
| `\|sin(2x)\|` | **π/2** | Period of sin(2x) is π, halved            |
| `\|tan(x)\|`  | π       | tan has no antisymmetry, unchanged        |

### Step Functions (floor, ceil, frac)

Step functions have period 1 (or scaled):

| Expression      | Period | Reason                       |
| --------------- | ------ | ---------------------------- |
| `floor(x)`      | 1      | Staircase pattern            |
| `ceil(x)`       | 1      | Staircase pattern            |
| `frac(x)`       | 1      | Truly periodic: x - floor(x) |
| `floor(2x)`     | 0.5    | Period = 1 / 2               |
| `floor(x/3)`    | 3      | Period = 1 × 3               |
| `floor(sin(x))` | 2π     | Composition with periodic    |

### Function Compositions

For f(g(x)) where g(x) is periodic with period T, the composition f(g(x)) also has period T:

| Expression    | Period | Reason                     |
| ------------- | ------ | -------------------------- |
| `sin(sin(x))` | 2π     | Inner sin(x) has period 2π |
| `cos(sin(x))` | 2π     | Inner sin(x) has period 2π |
| `sin(tan(x))` | π      | Inner tan(x) has period π  |
| `exp(sin(x))` | 2π     | Inner sin(x) has period 2π |
| `2^{cos(x)}`  | 2π     | Inner cos(x) has period 2π |
| `sin(x²)`     | ❌     | x² is not periodic         |
| `sin(eˣ)`     | ❌     | eˣ is not periodic         |

### Periodicity Rules

| Expression        | Period | Reason          |
| ----------------- | ------ | --------------- |
| `sin(x)`          | 2π     | Base period     |
| `cos(x)`          | 2π     | Base period     |
| `tan(x)`          | π      | Base period     |
| `sin(2x)`         | π      | Period = 2π / 2 |
| `cos(πx)`         | 2      | Period = 2π / π |
| `sin(x) + cos(x)` | 2π     | LCM of periods  |
| `sin(x) + 1`      | 2π     | Constant offset |

### Domain Integration

Periodicity detection now includes domain of definition analysis:

```typescript
// Continuous function
const sinResult = detectPeriodicity(parseLatex('\\sin(x)'));
// → {
//     isPeriodic: true,
//     period: 2π,
//     domain: { kind: 'universal' },  // defined everywhere
//     discontinuities: undefined,
//     isContinuous: true
// }

// Function with discontinuities
const tanResult = detectPeriodicity(parseLatex('\\tan(x)'));
// → {
//     isPeriodic: true,
//     period: π,
//     domain: { kind: 'periodic_exclusion', basePoint: π/2, period: π },
//     discontinuities: { kind: 'periodic_exclusion', basePoint: π/2, period: π },
//     isContinuous: false
// }

// Scaled discontinuities
const tan2xResult = detectPeriodicity(parseLatex('\\tan(2x)'));
// → {
//     isPeriodic: true,
//     period: π/2,
//     discontinuities: { basePoint: π/4, period: π/2 },  // scaled!
//     isContinuous: false
// }
```

| Function           | Domain           | Discontinuities |
| ------------------ | ---------------- | --------------- |
| `sin(x)`, `cos(x)` | ℝ (universal)    | None            |
| `tan(x)`           | ℝ \ {π/2 + kπ}   | x = π/2 + kπ    |
| `cot(x)`           | ℝ \ {kπ}         | x = kπ          |
| `sec(x)`           | ℝ \ {π/2 + kπ}   | x = π/2 + kπ    |
| `csc(x)`           | ℝ \ {kπ}         | x = kπ          |
| `tan(2x)`          | ℝ \ {π/4 + kπ/2} | x = π/4 + kπ/2  |

### Known Periodic Functions

| Function           | Base Period | Has Antisymmetry |
| ------------------ | ----------- | ---------------- |
| sin, cos, sec, csc | 2π          | Yes (at π)       |
| tan, cot           | π           | No               |

**Note:** Hyperbolic functions (sinh, cosh, etc.) are NOT periodic on ℝ.

### User-Defined Periodic Functions (Extensibility)

Register custom periodic functions to extend the detection system:

```typescript
import {
	registerPeriodicFunction,
	unregisterPeriodicFunction,
	clearPeriodicFunctionRegistry,
	getRegisteredPeriodicFunctions,
	isRegisteredPeriodicFunction
} from '$lib/mathAST/analysis';
import { PI, TWO_PI } from '$lib/mathAST/factory';
```

#### `registerPeriodicFunction(name, period, options?)`

Register a user-defined periodic function.

```typescript
// Simple function with numeric period
registerPeriodicFunction('sawtooth', 1);

// Function with symbolic period (π)
registerPeriodicFunction('myTrig', PI);

// Function with antisymmetry (like sin)
// When squared, period will be halved
registerPeriodicFunction('wave', TWO_PI, { hasHalfPeriodAntisymmetry: true });

// Function with description for pedagogical output
registerPeriodicFunction('heartbeat', 1, {
	description: 'Fonction de battement cardiaque'
});
```

**Options:** `RegisterFunctionOptions`

```typescript
interface RegisterFunctionOptions {
	hasHalfPeriodAntisymmetry?: boolean; // f(x + T/2) = -f(x), default: false
	description?: string; // Custom description for pedagogical steps
}
```

**Example with detection:**

```typescript
import { func, variable } from '$lib/mathAST/factory';

registerPeriodicFunction('myWave', 1);
const expr = func('myWave', [variable('x')]);

detectPeriodicity(expr);
// → { isPeriodic: true, periodNumeric: 1, steps: [{ rule: 'user_function', ... }] }

// Scaling works automatically
const scaled = func('myWave', [parseLatex('2x')]);
detectPeriodicity(scaled);
// → { isPeriodic: true, periodNumeric: 0.5, ... }
```

#### `unregisterPeriodicFunction(name)`

Remove a registered function.

```typescript
unregisterPeriodicFunction('myWave'); // Returns true if existed
```

#### `clearPeriodicFunctionRegistry()`

Remove all registered functions (useful for testing).

```typescript
clearPeriodicFunctionRegistry();
```

#### `getRegisteredPeriodicFunctions()`

Get all registered functions as a readonly map.

```typescript
const registered = getRegisteredPeriodicFunctions();
for (const [name, config] of registered) {
	console.log(
		`${name}: period = ${config.period}, antisymmetry = ${config.hasHalfPeriodAntisymmetry}`
	);
}
```

#### `isRegisteredPeriodicFunction(name)`

Check if a function is registered.

```typescript
isRegisteredPeriodicFunction('myWave'); // true or false
```

#### User Function Priority

User-registered functions take priority over built-in functions. This allows overriding:

```typescript
// Override sin with custom period (for testing)
registerPeriodicFunction('sin', number('1'));
detectPeriodicity(parseLatex('\\sin(x)'));
// → { periodNumeric: 1, ... } (uses user-defined period)

// Restore original behavior
unregisterPeriodicFunction('sin');
```

#### Antisymmetry for Minimal Period

If `hasHalfPeriodAntisymmetry: true`, even powers and products with other antisymmetric functions will have halved periods:

```typescript
registerPeriodicFunction('wave', TWO_PI, { hasHalfPeriodAntisymmetry: true });

// wave²(x) has period π (not 2π)
const squared = func('wave', [variable('x')], { power: number('2') });
detectPeriodicity(squared);
// → { periodNumeric: Math.PI, ... }

// wave(x) · sin(x) has period π
// (both antisymmetric with same period)
```

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

## Coefficient Utilities

Shared utilities for extracting coefficients from expressions. Used internally by linear-combination, polynomial-analysis, and periodicity modules.

### `extractLinearForm(node, variable)`

Extracts linear form (ax + b) from an expression.

```typescript
import { extractLinearForm } from '$lib/mathAST/analysis';

extractLinearForm(parseLatex('2x + 1'), 'x');
// → { coefficient: number('2'), offset: number('1') }

extractLinearForm(parseLatex('x'), 'x');
// → { coefficient: number('1'), offset: null }

extractLinearForm(parseLatex('x^2'), 'x');
// → null (not linear)
```

### `extractCoefficientAndVariable(term, variables)`

Extracts coefficient and variable from a product term.

```typescript
import { extractCoefficientAndVariable } from '$lib/mathAST/analysis';

extractCoefficientAndVariable(parseLatex('2x'), ['x', 'y']);
// → { coefficient: number('2'), variableName: 'x' }

extractCoefficientAndVariable(parseLatex('\\sqrt{2}y'), ['x', 'y']);
// → { coefficient: sqrt(2), variableName: 'y' }
```

---

## See Also

- [Identities](./identities.md) - Trigonometric and hyperbolic identity transformations
- [Domain](./domain.md) - Domain of definition computation and validation
- [Pattern Matching](./patterns.md) - For complex structural matching
- [Normalization](./normalization.md) - For polynomial equivalence checking
- [Types](./types.md) - MathNode type definitions
