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

Expressions are normalized to polynomial form:

```
Polynomial = sum of Terms
Term = coefficient * product of Powers
Power = base ^ exponent

Example: 2x^2 + 3xy - 5
= Term(2, {x: 2}) + Term(3, {x: 1, y: 1}) + Term(-5, {})
```

### Core Types

```typescript
// Rational number (BigInt-based)
interface Rational {
	n: bigint; // Numerator
	d: bigint; // Denominator (always positive)
}

// Monomial: product of variable powers
interface Monomial {
	readonly powers: ReadonlyMap<string, number>;
}

// Term: coefficient * monomial
interface Term {
	readonly coefficient: AlgebraicNumber;
	readonly monomial: Monomial;
}

// Normal form (polynomial)
type NormalForm = readonly Term[];
```

### Algebraic Numbers

Coefficients can be exact algebraic expressions:

```typescript
// Algebraic number: rational + radical part
interface AlgebraicNumber {
	rational: Rational;
	radical?: RadicalPart;
}

// Radical: coefficient * sqrt(radicand)
interface RadicalPart {
	coefficient: Rational;
	radicand: bigint;
}

// Examples:
// 3/4 -> { n: 3n, d: 4n }
// 2 + 3*sqrt(5) -> { rational: {n: 2n, d: 1n}, radical: {coefficient: {n: 3n, d: 1n}, radicand: 5n} }
```

## Normalization API

### `normalize(node: MathNode): NormalForm`

Convert AST to canonical form:

```typescript
import { normalize } from '$lib/mathAST/normal';

normalize(parseLatex('x + x'));
// [{ coefficient: 2, monomial: { powers: Map{ x: 1 } } }]

normalize(parseLatex('x^2 - y^2'));
// [
//   { coefficient: 1, monomial: { powers: Map{ x: 2 } } },
//   { coefficient: -1, monomial: { powers: Map{ y: 2 } } }
// ]
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
import {
	createMonomial,
	monomialDegree,
	monomialMultiply,
	monomialEquals,
	monomialContains
} from '$lib/mathAST/normal';

// Create monomial: x^2 * y
const m = createMonomial({ x: 2, y: 1 });

// Total degree
monomialDegree(m); // 3

// Multiply monomials
const m2 = createMonomial({ y: 1, z: 2 });
monomialMultiply(m, m2);
// x^2 * y^2 * z^2

// Check if variable present
monomialContains(m, 'x'); // true
monomialContains(m, 'z'); // false
```

## Term Operations

```typescript
import {
	createTerm,
	termMultiply,
	termNegate,
	termsCanCombine,
	combineTerms
} from '$lib/mathAST/normal';

// Create term: 3x^2
const t1 = createTerm({ n: 3n, d: 1n }, { x: 2 });

// Create term: 2x^2
const t2 = createTerm({ n: 2n, d: 1n }, { x: 2 });

// Check if combinable (same monomial)
termsCanCombine(t1, t2); // true

// Combine: 3x^2 + 2x^2 = 5x^2
combineTerms([t1, t2]);
// [{ coefficient: 5, monomial: x^2 }]
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

## Limitations

Not all expressions can be normalized:

```typescript
// Works: polynomials, rational expressions
normalize(parseLatex('x^2 + 2x + 1')); // OK
normalize(parseLatex('(x+1)/(x-1)')); // OK

// Limited: transcendental functions
normalize(parseLatex('sin(x)')); // treated as variable

// Complex: nested radicals
normalize(parseLatex('sqrt(sqrt(x))')); // limited simplification
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
