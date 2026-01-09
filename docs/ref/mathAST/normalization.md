# Normalization & Equivalence

Converting expressions to canonical form and checking mathematical equivalence.

## Overview

The normalization system provides:

- **Canonical polynomial representation**: Standardized form for expressions
- **Algebraic simplification**: Combine like terms, simplify radicals
- **Equivalence checking**: Determine if two expressions are mathematically equal
- **Hashing**: Canonical hashing for expression comparison

## Why Normalization?

Different expressions can represent the same value:

```
x + x        = 2x
(a+b)^2      = a^2 + 2ab + b^2
x/2 + x/2   = x
```

Normalization converts all equivalent forms to a single canonical representation.

## Quick Start

```typescript
import { normalize, denormalize, polynomialsEqual, nodesEqual } from '$lib/mathAST/normal';
import { parseLatex } from '$lib/mathAST';

// Normalize expressions
const expr1 = parseLatex('x + x');
const expr2 = parseLatex('2x');

const norm1 = normalize(expr1);
const norm2 = normalize(expr2);

// Check equivalence
polynomialsEqual(norm1, norm2); // true

// Convert back to MathNode
const node = denormalize(norm1);
// Returns AST for: 2x
```

## Normal Form Structure

### Polynomial Representation

Expressions are normalized to a fraction of polynomials:

```
NormalForm = Numerator / Denominator
Polynomial = sum of NormalTerms
NormalTerm = AlgebraicCoefficient × Monomial
Monomial = product of SymbolicFactors (base^exponent)

Example: 2x^2 + 3xy - 5
= NormalTerm(coeff=2, monomial=x²) + NormalTerm(coeff=3, monomial=xy) + NormalTerm(coeff=-5, monomial=1)
```

### Core Types

```typescript
// Rational number (BigInt-based, always reduced)
interface Rational {
	readonly n: bigint; // Numerator (sign stored here)
	readonly d: bigint; // Denominator (always positive)
}

// Simplified radical: radicand^(1/index) with no extractable perfect factors
interface SimplifiedRadical {
	readonly radicand: bigint; // e.g., 2n for √2
	readonly index: bigint; // e.g., 2n for square root, 3n for cube root
}

// Algebraic term: rational coefficient × product of radicals × optional i
// Example: 3√2 = { rational: 3, radicals: [√2] }
// Example: √6 = { rational: 1, radicals: [√6] } (result of √2 × √3)
// Example: 3i = { rational: 3, radicals: [], hasImaginaryUnit: true }
interface AlgebraicTerm {
	readonly rational: Rational;
	readonly radicals: readonly SimplifiedRadical[];
	readonly hasImaginaryUnit?: boolean; // Support for complex numbers
}

// Algebraic coefficient: SUM of algebraic terms
// Supports expressions like √3 + √5 or 2 + 3√2 - √7
interface AlgebraicCoefficient {
	readonly terms: readonly AlgebraicTerm[];
}

// Symbolic factor: MathNode base raised to rational exponent
// Example: x² = { base: Variable('x'), exponent: 2 }
interface SymbolicFactor {
	readonly base: MathNode;
	readonly exponent: Rational;
}

// Normal term: algebraic coefficient × monomial
interface NormalTerm {
	readonly coefficient: AlgebraicCoefficient;
	readonly monomial: readonly SymbolicFactor[];
}

// Complete normal form: fraction with hash
interface NormalForm {
	readonly numerator: readonly NormalTerm[];
	readonly denominator: readonly NormalTerm[];
	readonly hash: string; // Canonical identifier for equivalence
}
```

### Multi-Radical Coefficients

The system fully supports coefficients with multiple radicals:

```typescript
// √3 + √5 (single AlgebraicCoefficient with 2 terms)
{
  terms: [
    { rational: { n: 1n, d: 1n }, radicals: [{ radicand: 3n, index: 2n }] },
    { rational: { n: 1n, d: 1n }, radicals: [{ radicand: 5n, index: 2n }] }
  ]
}

// 2 + 3√2 - √7 (single AlgebraicCoefficient with 3 terms)
{
  terms: [
    { rational: { n: 2n, d: 1n }, radicals: [] },                           // 2
    { rational: { n: 3n, d: 1n }, radicals: [{ radicand: 2n, index: 2n }] }, // 3√2
    { rational: { n: -1n, d: 1n }, radicals: [{ radicand: 7n, index: 2n }] } // -√7
  ]
}

// (√3 + √5)x as a single NormalTerm
{
  coefficient: {
    terms: [
      { rational: { n: 1n, d: 1n }, radicals: [{ radicand: 3n, index: 2n }] },
      { rational: { n: 1n, d: 1n }, radicals: [{ radicand: 5n, index: 2n }] }
    ]
  },
  monomial: [{ base: Variable('x'), exponent: { n: 1n, d: 1n } }]
}
```

### Radical Arithmetic

Multiplication automatically simplifies radicals:

```typescript
// √2 × √3 = √6
mulAlgebraic(sqrt2_coeff, sqrt3_coeff);
// Result: { terms: [{ rational: 1, radicals: [{ radicand: 6n, index: 2n }] }] }

// √2 × √2 = 2 (becomes rational)
mulAlgebraic(sqrt2_coeff, sqrt2_coeff);
// Result: { terms: [{ rational: { n: 2n, d: 1n }, radicals: [] }] }

// √12 automatically simplifies to 2√3
simplifyRadical(12n, 2n);
// Result: { coefficient: 2n, radicand: 3n }
```

### Like Terms Combination

Terms with different radicals but same monomial are combined:

```typescript
// √3·x + √5·x = (√3 + √5)·x
// Before: two NormalTerms with monomial [x]
// After: one NormalTerm with multi-radical coefficient

// 3√2·x + 2√2·x = 5√2·x
// Same radical signature → coefficients are added
```

### Complex Number Support

The `hasImaginaryUnit` field enables complex number arithmetic:

```typescript
// 3i as an AlgebraicTerm
{ rational: { n: 3n, d: 1n }, radicals: [], hasImaginaryUnit: true }

// √2·i
{ rational: { n: 1n, d: 1n }, radicals: [{ radicand: 2n, index: 2n }], hasImaginaryUnit: true }

// Multiplication: i × i = -1
mulAlgebraic(i_coeff, i_coeff);
// Result: { terms: [{ rational: { n: -1n, d: 1n }, radicals: [] }] }

// Real and imaginary parts stay separate
// 3 + 2i is represented as two AlgebraicTerms in one coefficient:
{
  terms: [
    { rational: { n: 3n, d: 1n }, radicals: [] },                    // real: 3
    { rational: { n: 2n, d: 1n }, radicals: [], hasImaginaryUnit: true } // imag: 2i
  ]
}
```

**Note**: Terms with different `hasImaginaryUnit` flags cannot be combined (different signatures).

## Normalization API

### `normalize(node: MathNode): NormalForm`

Convert AST to canonical form:

```typescript
import { normalize } from '$lib/mathAST/normal';

// Simple polynomial
normalize(parseLatex('x + x'));
// {
//   numerator: [{
//     coefficient: { terms: [{ rational: { n: 2n, d: 1n }, radicals: [] }] },
//     monomial: [{ base: Variable('x'), exponent: { n: 1n, d: 1n } }]
//   }],
//   denominator: [ONE_TERM],
//   hash: "2x"
// }

// With radicals
normalize(parseLatex('\\sqrt{3} + \\sqrt{5}'));
// {
//   numerator: [{
//     coefficient: {
//       terms: [
//         { rational: { n: 1n, d: 1n }, radicals: [{ radicand: 3n, index: 2n }] },
//         { rational: { n: 1n, d: 1n }, radicals: [{ radicand: 5n, index: 2n }] }
//       ]
//     },
//     monomial: []  // constant term
//   }],
//   denominator: [ONE_TERM],
//   hash: "sqrt(3)+sqrt(5)"
// }
```

### `denormalize(form: NormalForm): MathNode`

Convert normal form back to AST:

```typescript
import { normalize, denormalize } from '$lib/mathAST/normal';

const normal = normalize(parseLatex('x + x + x'));
const node = denormalize(normal);
// Returns AST for: 3x
```

## Equivalence Checking

### `polynomialsEqual(a, b): boolean`

Check if two normal forms are equal:

```typescript
import { normalize, polynomialsEqual } from '$lib/mathAST/normal';

const e1 = normalize(parseLatex('(x+1)^2'));
const e2 = normalize(parseLatex('x^2 + 2x + 1'));

polynomialsEqual(e1, e2); // true
```

### `nodesEqual(a, b): boolean`

Check if two MathNodes represent the same expression:

```typescript
import { nodesEqual } from '$lib/mathAST/normal';

nodesEqual(parseLatex('x + 1'), parseLatex('1 + x')); // true (commutative)

nodesEqual(parseLatex('2x'), parseLatex('x + x')); // true (equivalent)
```

### Equivalence Examples

```typescript
// Commutative operations
nodesEqual(parseLatex('a + b'), parseLatex('b + a')); // true
nodesEqual(parseLatex('ab'), parseLatex('ba')); // true

// Combining like terms
nodesEqual(parseLatex('x + x'), parseLatex('2x')); // true
nodesEqual(parseLatex('3x - x'), parseLatex('2x')); // true

// Fraction simplification
nodesEqual(parseLatex('\\frac{2x}{2}'), parseLatex('x')); // true

// Polynomial expansion
nodesEqual(parseLatex('(a+b)^2'), parseLatex('a^2 + 2ab + b^2')); // true

// Distribution
nodesEqual(parseLatex('2(x+1)'), parseLatex('2x + 2')); // true
```

## Hashing

Canonical hashing for expression comparison:

```typescript
import { hashNormal } from '$lib/mathAST/normal';

const e1 = normalize(parseLatex('x + y'));
const e2 = normalize(parseLatex('y + x'));

hashNormal(e1) === hashNormal(e2); // true (same hash)
```

Useful for:

- Building expression caches
- Detecting duplicates
- Fast comparison in sets/maps

## Comparison Functions

### `compareTerms(a, b): number`

Compare two terms for sorting:

```typescript
import { compareTerms } from '$lib/mathAST/normal';

// Returns: negative if a < b, positive if a > b, 0 if equal
// Ordering: higher degree first, then alphabetically
```

### `compareNormals(a, b): number`

Compare two normal forms:

```typescript
import { compareNormals } from '$lib/mathAST/normal';

const n1 = normalize(parseLatex('x^2'));
const n2 = normalize(parseLatex('x'));

compareNormals(n1, n2); // positive (x^2 > x in ordering)
```

## Rational Arithmetic

BigInt-based exact arithmetic:

```typescript
import {
	addRational,
	subRational,
	mulRational,
	divRational,
	negRational,
	absRational,
	rationalEquals,
	rationalLessThan,
	simplifyRational,
	toDecimal
} from '$lib/mathAST/normal';

// Create rationals
const half: Rational = { n: 1n, d: 2n };
const third: Rational = { n: 1n, d: 3n };

// Arithmetic
addRational(half, third); // 5/6
mulRational(half, third); // 1/6

// Convert to decimal
toDecimal(half); // 0.5
```

## Radical Simplification

Simplify square roots:

```typescript
import { simplifyRadical } from '$lib/mathAST/normal';

// sqrt(12) = 2*sqrt(3)
simplifyRadical(12n);
// { coefficient: 2n, radicand: 3n }

// sqrt(9) = 3 (perfect square)
simplifyRadical(9n);
// { coefficient: 3n, radicand: 1n }
```

## Monomial Operations

```typescript
import { symbolicFactor, mulMonomials, monomialsEqual, hashMonomial } from '$lib/mathAST/normal';
import { MathAST } from '$lib/mathAST';

// Create symbolic factor: x^2
const x2 = symbolicFactor(MathAST.variable('x'), { n: 2n, d: 1n });

// Create monomial: x^2 * y (array of symbolic factors)
const m1 = [
	symbolicFactor(MathAST.variable('x'), { n: 2n, d: 1n }),
	symbolicFactor(MathAST.variable('y'), { n: 1n, d: 1n })
];

// Multiply monomials: x^2*y * y*z^2 = x^2*y^2*z^2
const m2 = [
	symbolicFactor(MathAST.variable('y'), { n: 1n, d: 1n }),
	symbolicFactor(MathAST.variable('z'), { n: 2n, d: 1n })
];
mulMonomials(m1, m2);
// [x^2, y^2, z^2]

// Check equality (canonical form comparison)
monomialsEqual(m1, m1); // true

// Get hash for grouping like terms
hashMonomial(m1); // deterministic string
```

## Term Operations

```typescript
import { normalTerm, mulTerms, negTerm, areLikeTerms, addLikeTerms } from '$lib/mathAST/normal';
import { algebraicFromRational } from '$lib/mathAST/normal';

// Create term: 3x^2
const coeff3 = algebraicFromRational({ n: 3n, d: 1n });
const t1 = normalTerm(coeff3, [symbolicFactor(MathAST.variable('x'), { n: 2n, d: 1n })]);

// Create term: 2x^2
const coeff2 = algebraicFromRational({ n: 2n, d: 1n });
const t2 = normalTerm(coeff2, [symbolicFactor(MathAST.variable('x'), { n: 2n, d: 1n })]);

// Check if combinable (same monomial)
areLikeTerms(t1, t2); // true

// Combine: 3x^2 + 2x^2 = 5x^2
addLikeTerms(t1, t2);
// { coefficient: { terms: [{ rational: { n: 5n, d: 1n }, radicals: [] }] }, monomial: [x^2] }

// Multiply terms
mulTerms(t1, t2);
// 6x^4

// Negate term
negTerm(t1);
// -3x^2
```

## Algebraic Coefficient Operations

```typescript
import {
	addAlgebraic,
	mulAlgebraic,
	negAlgebraic,
	algebraicFromRational,
	algebraicFromRadical,
	isZeroAlgebraic,
	isPureRational
} from '$lib/mathAST/normal';

// Create √2 coefficient
const sqrt2 = algebraicFromRadical({ radicand: 2n, index: 2n });

// Create √3 coefficient
const sqrt3 = algebraicFromRadical({ radicand: 3n, index: 2n });

// √2 + √3 (multi-radical coefficient)
const sum = addAlgebraic(sqrt2, sqrt3);
// { terms: [√2_term, √3_term] }

// √2 × √3 = √6
const product = mulAlgebraic(sqrt2, sqrt3);
// { terms: [{ rational: 1, radicals: [{ radicand: 6n, index: 2n }] }] }

// √2 × √2 = 2
const squared = mulAlgebraic(sqrt2, sqrt2);
// { terms: [{ rational: { n: 2n, d: 1n }, radicals: [] }] }
isPureRational(squared); // true

// Check if zero
isZeroAlgebraic(addAlgebraic(sqrt2, negAlgebraic(sqrt2))); // true
```

## Complete Example

```typescript
import {
	normalize,
	denormalize,
	polynomialsEqual,
	hashNormal,
	nodesEqual
} from '$lib/mathAST/normal';
import { parseLatex, toLatex } from '$lib/mathAST';

// Student answer checking
function checkAnswer(studentAnswer: string, correctAnswer: string): boolean {
	try {
		const studentAST = parseLatex(studentAnswer);
		const correctAST = parseLatex(correctAnswer);
		return nodesEqual(studentAST, correctAST);
	} catch {
		return false;
	}
}

// Examples
checkAnswer('2x + 3', '3 + 2x'); // true (commutative)
checkAnswer('x^2 + 2x + 1', '(x+1)^2'); // true (expanded form)
checkAnswer('x/2 + x/2', 'x'); // true (fraction combining)
checkAnswer('x + 1', 'x + 2'); // false

// Simplification
function simplify(latex: string): string {
	const ast = parseLatex(latex);
	const normal = normalize(ast);
	const simplified = denormalize(normal);
	return toLatex(simplified);
}

simplify('x + x + x'); // "3x"
simplify('2a + 3b - a'); // "a + 3b"
simplify('(x+1)^2 - x^2'); // "2x + 1"
```

## Pre-Simplification Rules

Before normalization, expressions are simplified using rule sets applied iteratively until a fixed point.

### Transcendental Simplification

Known values for trigonometric, logarithmic, and exponential functions:

```typescript
import {
	simplifyTranscendental,
	simplifyTrig,
	simplifyLog,
	simplifyExp
} from '$lib/mathAST/normal';

// Trigonometric values (valeurs remarquables)
// sin(0) = 0, sin(π/6) = 1/2, sin(π/4) = √2/2, sin(π/3) = √3/2, sin(π/2) = 1
// cos(0) = 1, cos(π/6) = √3/2, cos(π/4) = √2/2, cos(π/3) = 1/2, cos(π/2) = 0
// tan(0) = 0, tan(π/4) = 1, tan(π) = 0

simplifyTrig(parseLatex('\\sin(0)')); // → 0
simplifyTrig(parseLatex('\\cos(\\pi)')); // → -1
simplifyTrig(parseLatex('\\sin(\\frac{\\pi}{6})')); // → 1/2

// Logarithm identities
// ln(1) = 0, ln(e) = 1, log(1) = 0, log(10) = 1, log_b(b) = 1

simplifyLog(parseLatex('\\ln(1)')); // → 0
simplifyLog(parseLatex('\\ln(e)')); // → 1
simplifyLog(parseLatex('\\log(10)')); // → 1

// Exponential identities
// exp(0) = 1, exp(1) = e, e^0 = 1, e^1 = e

simplifyExp(parseLatex('e^0')); // → 1
simplifyExp(parseLatex('\\exp(0)')); // → 1
```

### Inverse Function Rules

The normalizer recognizes exp and ln as inverse functions:

```typescript
// exp(ln(x)) = x
normalize(parseLatex('\\exp(\\ln(x))')); // → x
normalize(parseLatex('\\exp(\\ln(x+1))')); // → x+1
normalize(parseLatex('\\exp(\\ln(x^2))')); // → x²

// ln(exp(x)) = x
normalize(parseLatex('\\ln(\\exp(x))')); // → x
normalize(parseLatex('\\ln(\\exp(2))')); // → 2
```

### Logarithm Expansion Rules

Logarithms are expanded into simpler forms during normalization:

```typescript
// ln(x^n) = n·ln(x)
normalize(parseLatex('\\ln(x^2)')); // → 2·ln(x)
normalize(parseLatex('\\ln(x^3)')); // → 3·ln(x)

// ln(x·y) = ln(x) + ln(y)
normalize(parseLatex('\\ln(xy)')); // → ln(x) + ln(y)
normalize(parseLatex('\\ln(abc)')); // → ln(a) + ln(b) + ln(c)

// ln(x/y) = ln(x) - ln(y)
normalize(parseLatex('\\frac{\\ln(x)}{\\ln(y)}')); // unchanged (not a quotient inside ln)
normalize(parseLatex('\\ln(\\frac{x}{y})')); // → ln(x) - ln(y)

// ln(n) for integers → prime factorization
normalize(parseLatex('\\ln(8)')); // → 3·ln(2)
normalize(parseLatex('\\ln(12)')); // → 2·ln(2) + ln(3)

// ln(n/d) for rationals
normalize(parseLatex('\\ln(\\frac{2}{3})')); // → ln(2) - ln(3)
```

### Exponential of Linear Combinations of Logarithms

The normalizer detects linear combinations of logarithms inside `exp` and converts them to products of powers:

```
exp(Σ aᵢ·ln(xᵢ)) = Π xᵢ^aᵢ
```

```typescript
// Basic scalar multiples
normalize(parseLatex('\\exp(2\\ln(x))')); // → x²
normalize(parseLatex('\\exp(3\\ln(2))')); // → 8

// Sums and differences
normalize(parseLatex('\\exp(\\ln(x) + \\ln(y))')); // → xy
normalize(parseLatex('\\exp(\\ln(x) - \\ln(y))')); // → x/y

// Negative exponents become divisions
normalize(parseLatex('\\exp(-\\ln(x))')); // → 1/x
normalize(parseLatex('\\exp(-2\\ln(x))')); // → 1/x²

// Self-cancellation
normalize(parseLatex('\\exp(\\ln(x) - \\ln(x))')); // → 1

// Fractional exponents (if supported)
normalize(parseLatex('\\exp(\\frac{1}{2}\\ln(x))')); // → √x
```

### Simplification Pipeline

The `simplify` function applies 4 rule sets iteratively:

```typescript
import { simplify, simplifyOnce, simplifyWithSteps } from '$lib/mathAST/normal';

// Full simplification (iterates until fixed point)
const simplified = simplify(ast);

// Single pass (apply each rule set once)
const onePass = simplifyOnce(ast);

// With step recording (for educational display)
const { result, steps } = simplifyWithSteps(ast);
```

Rule application order:

1. **Arithmetic**: `0+x=x`, `1·x=x`, `x^0=1`, `x/1=x`, constant folding
2. **Powers**: `x^a·x^b=x^(a+b)`, `(x^a)^b=x^(ab)`, `(xy)^n=x^n·y^n`
3. **Radicals**: `√(a)·√(b)=√(ab)`, `√(n²)=n`, `√0=0`, `√1=1`
4. **Transcendental**: Trig values, log identities, exp identities

## Limitations

### What Works

```typescript
// Polynomials
normalize(parseLatex('x^2 + 2x + 1')); // OK

// Rational expressions
normalize(parseLatex('(x+1)/(x-1)')); // OK

// Radicals with numeric radicands
normalize(parseLatex('\\sqrt{18}')); // → 3√2

// Complex numbers
normalize(parseLatex('(1+i)(1-i)')); // → 2

// Transcendental at known values
normalize(parseLatex('\\sin(0) + 1')); // → 1
```

### Current Limitations

```typescript
// Transcendental functions at unknown values → treated as opaque
normalize(parseLatex('sin(x)')); // sin(x) as SymbolicFactor, not simplified

// Function composition (f ∘ g) → treated as opaque SymbolicFactor
// Node type 'composition' is supported but not algebraically simplified

// Nested radicals → limited simplification
normalize(parseLatex('sqrt(sqrt(x))')); // √(√x), not x^(1/4)

// Polynomial powers require integer exponents
normalize(parseLatex('(x+1)^{1/2}')); // (x+1)^(1/2) as opaque, not expanded

// Full polynomial GCD not implemented
// Only monomial GCD is extracted from fractions
normalize(parseLatex('(x^2-1)/(x-1)')); // Does NOT simplify to x+1

// exp(complex expression) → may remain opaque if not a linear combination of ln
normalize(parseLatex('\\exp(\\ln(x)^2)')); // exp(ln(x)²), not simplified
```

**Note**: Numeric fraction equivalence IS supported:

```typescript
// Numeric fractions are properly reduced
nodesEqual(parseLatex('6/9'), parseLatex('2/3')); // true
nodesEqual(parseLatex('-4/8'), parseLatex('-1/2')); // true
nodesEqual(parseLatex('15/-25'), parseLatex('-3/5')); // true
```

For symbolic manipulation beyond polynomials, use [Pattern Matching](./patterns.md).

## Step-by-Step Recording

Record transformation steps for educational display and debugging.

### Basic Usage

```typescript
import { simplifyWithSteps, StepRecorder } from '$lib/mathAST';

const ast = parseLatex('x + 0 + x');
const { result, steps } = simplifyWithSteps(ast);

// Display steps
steps.forEach((step) => {
	console.log(`Rule: ${step.rule}`);
	console.log(`Description: ${step.description}`);
	console.log(`Before: ${toLatex(step.before)}`);
	console.log(`After: ${toLatex(step.after)}`);
	console.log('---');
});
```

### Step Interface

```typescript
interface NormalizationStep {
	readonly rule: string; // Rule identifier (e.g., 'additive-identity')
	readonly description: string; // Human-readable (French)
	readonly before: MathNode; // AST before transformation
	readonly after: MathNode; // AST after transformation
}
```

### Using StepRecorder Directly

For more control over step recording:

```typescript
import { StepRecorder, applyRules } from '$lib/mathAST';

const recorder = new StepRecorder();

// Record individual steps
recorder.recordStep('combine-like-terms', beforeAst, afterAst);

// Get all recorded steps
const steps = recorder.getSteps();

// Clear for reuse
recorder.clear();
```

### Rule Descriptions (French)

| Rule                  | Description                          |
| --------------------- | ------------------------------------ |
| `additive-identity`   | Suppression de l'élément neutre (+0) |
| `multiplicative-one`  | Suppression du facteur 1             |
| `multiply-by-zero`    | Multiplication par zéro              |
| `combine-like-terms`  | Regroupement des termes semblables   |
| `simplify-fraction`   | Simplification de la fraction        |
| `distribute`          | Distribution                         |
| `factor-common`       | Factorisation du facteur commun      |
| `power-of-power`      | Puissance de puissance               |
| `simplify-double-neg` | Simplification de la double négation |

### Educational Use

```svelte
<script lang="ts">
	import { simplifyWithSteps } from '$lib/mathAST';

	let expression = $state('x + x + 0');
	let steps = $state<NormalizationStep[]>([]);

	function simplify() {
		const ast = parseLatex(expression);
		const result = simplifyWithSteps(ast);
		steps = result.steps;
	}
</script>

<button onclick={simplify}>Simplifier</button>

{#each steps as step, i}
	<div class="step">
		<h4>Étape {i + 1}: {step.description}</h4>
		<p>
			<Katex formula={toLatex(step.before)} /> → <Katex formula={toLatex(step.after)} />
		</p>
	</div>
{/each}
```

## Performance

- Normalization: O(n log n) for polynomial with n terms
- Comparison: O(n) for normalized forms
- Hashing: O(n) single pass

Optimizations:

- BigInt rationals avoid floating-point issues
- Term sorting enables efficient comparison
- Caching normalized forms recommended for repeated checks

## See Also

- [Evaluation](./evaluation.md) - Numeric computation
- [Pattern Matching](./patterns.md) - Symbolic pattern rules
- [Calculus](./calculus.md) - Differentiation and series
