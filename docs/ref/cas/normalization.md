# Normalization and Simplification

## Overview

Normalization converts expressions to a **canonical form** that enables:

1. **Equivalence testing** - Two mathematically equal expressions have the same normal form
2. **Simplification** - The normalized form can be denormalized to a simplified expression
3. **Hashing** - Canonical hashes for fast comparison

## Normal Form Structure

```typescript
interface NormalForm {
	numerator: NormalTerm[]; // Polynomial numerator
	denominator: NormalTerm[]; // Polynomial denominator
	hash: string; // Canonical hash
}

interface NormalTerm {
	coefficient: AlgebraicCoefficient;
	monomial: SymbolicFactor[];
}

interface AlgebraicCoefficient {
	terms: RadicalTerm[];
}

interface RadicalTerm {
	rational: Rational; // Exact fraction n/d
	radicals: Radical[]; // sqrt(n), cbrt(n), etc.
}

interface Radical {
	radicand: bigint;
	index: bigint; // 2 for sqrt, 3 for cbrt
}

interface Rational {
	n: bigint; // Numerator
	d: bigint; // Denominator (always positive)
}

interface SymbolicFactor {
	base: MathNode; // Variable, function, etc.
	exponent: Rational; // Rational exponent
}
```

## Normalization Algorithm

### Entry Point

```typescript
import { normalize } from '$lib/mathAST/normal';

const expr = parseLatex('2x + 3x');
const normal = normalize(expr);
// normal.hash === hash of "5x"
```

### Algorithm Flow

```
Input MathNode
     │
     ▼
┌─────────────────┐
│ Simplify Rules  │ ──▶ Pre-process with pattern rules
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Normalize Node  │ ──▶ Recursive normalization
└────────┬────────┘
         │
         ├─────────────────────────────────────────────┐
         ▼                                             ▼
┌─────────────────┐                          ┌─────────────────┐
│ Numbers         │                          │ Variables       │
│ → Rational term │                          │ → Monomial term │
└─────────────────┘                          └─────────────────┘
         │                                             │
         └─────────────────┬───────────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Combine Terms   │ ──▶ Add like terms
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Sort & Hash     │ ──▶ Canonical ordering
                  └────────┬────────┘
                           │
                           ▼
                      NormalForm
```

### Node-by-Node Processing

```typescript
function normalizeNode(node: MathNode): NormalForm {
	switch (node.type) {
		case 'number':
			// Parse to Rational, create term with empty monomial
			return normalFormFromRational(parseNumberToRational(node.value));

		case 'variable':
			// Create term with coefficient 1 and variable^1
			return normalFormFromVariable(node.name);

		case 'addition':
			// Normalize both sides, add polynomials
			const leftForm = normalizeNode(node.left);
			const rightForm = normalizeNode(node.right);
			return addNormalForms(leftForm, rightForm);

		case 'subtraction':
			return subNormalForms(normalizeNode(node.left), normalizeNode(node.right));

		case 'multiplication':
			return mulNormalForms(normalizeNode(node.left), normalizeNode(node.right));

		case 'division':
			return divNormalForms(normalizeNode(node.numerator), normalizeNode(node.denominator));

		case 'superscript':
			// Handle integer powers specially
			const intExp = getPositiveIntExponent(node.superscript);
			if (intExp !== null) {
				return powNormalForm(normalizeNode(node.base), intExp);
			}
			// Symbolic power - treat as opaque
			return normalizeOpaqueNode(node);

		case 'function':
			return normalizeFunction(node);

		// ... other cases
	}
}
```

## Polynomial Operations

### Adding Polynomials

```typescript
// (a/b) + (c/d) = (ad + bc) / bd
function addNormalForms(a: NormalForm, b: NormalForm): NormalForm {
	if (isOnePolynomial(a.denominator) && isOnePolynomial(b.denominator)) {
		// Simple case: just add numerators
		return normalFormFromPolynomial(addPolynomials(a.numerator, b.numerator));
	}

	// General case with cross-multiplication
	const ad = mulPolynomials(a.numerator, b.denominator);
	const bc = mulPolynomials(b.numerator, a.denominator);
	const numerator = addPolynomials(ad, bc);
	const denominator = mulPolynomials(a.denominator, b.denominator);

	return normalFormFromFraction(numerator, denominator);
}
```

### Combining Like Terms

```typescript
function addPolynomials(p1: NormalTerm[], p2: NormalTerm[]): NormalTerm[] {
	const termMap = new Map<string, NormalTerm>();

	for (const term of [...p1, ...p2]) {
		const monomialKey = hashMonomial(term.monomial);
		const existing = termMap.get(monomialKey);

		if (existing) {
			// Combine coefficients
			termMap.set(monomialKey, {
				coefficient: addAlgebraic(existing.coefficient, term.coefficient),
				monomial: term.monomial
			});
		} else {
			termMap.set(monomialKey, term);
		}
	}

	// Filter out zero terms and sort
	return [...termMap.values()].filter((t) => !isZeroCoefficient(t.coefficient)).sort(compareTerms);
}
```

## Canonical Ordering

Terms are sorted to ensure identical expressions produce identical hashes:

```typescript
function compareTerms(a: NormalTerm, b: NormalTerm): number {
	// Compare monomials first (by degree and variable order)
	const monomialCmp = compareMonomials(a.monomial, b.monomial);
	if (monomialCmp !== 0) return monomialCmp;

	// Then compare coefficients
	return compareCoefficients(a.coefficient, b.coefficient);
}

function compareMonomials(a: SymbolicFactor[], b: SymbolicFactor[]): number {
	// Higher total degree first
	const degreeA = totalDegree(a);
	const degreeB = totalDegree(b);
	if (degreeA !== degreeB) return degreeB - degreeA;

	// Then alphabetically by variable
	for (let i = 0; i < Math.min(a.length, b.length); i++) {
		const cmp = compareFactors(a[i], b[i]);
		if (cmp !== 0) return cmp;
	}

	return a.length - b.length;
}
```

## Hashing

Canonical hashes enable O(1) equivalence checking:

```typescript
function hashNormalForm(form: NormalForm): string {
	const numHash = hashPolynomial(form.numerator);
	const denHash = hashPolynomial(form.denominator);

	if (isOnePolynomial(form.denominator)) {
		return numHash;
	}
	return `(${numHash})/(${denHash})`;
}

function hashPolynomial(terms: NormalTerm[]): string {
	if (terms.length === 0) return '0';

	return terms.map((t) => hashTerm(t)).join('+');
}

function hashTerm(term: NormalTerm): string {
	const coeffStr = hashCoefficient(term.coefficient);
	const monomialStr = hashMonomial(term.monomial);

	if (monomialStr === '') return coeffStr;
	if (coeffStr === '1') return monomialStr;
	return `${coeffStr}*${monomialStr}`;
}
```

## Radical Simplification

Square roots and other radicals are simplified:

```typescript
function simplifyRadical(radicand: bigint, index: bigint): SimplifiedRadical {
	// sqrt(72) = sqrt(36 * 2) = 6 * sqrt(2)

	let coefficient = 1n;
	let remaining = radicand;

	// Factor out perfect powers
	for (let p = 2n; p * p <= remaining; p++) {
		let power = 0n;
		while (remaining % p === 0n) {
			remaining /= p;
			power++;
		}
		// Extract complete powers
		coefficient *= p ** (power / index);
		// Keep remainder under radical
		remaining *= p ** (power % index);
	}

	return { coefficient, radicand: remaining };
}

// Examples:
// sqrt(72) → 6 * sqrt(2)
// sqrt(16) → 4
// cbrt(54) → 3 * cbrt(2)
```

## Denormalization

Convert back to a readable MathNode:

```typescript
import { denormalize } from '$lib/mathAST/normal';

const expr = parseLatex('2x + 3x');
const normal = normalize(expr);
const simplified = denormalize(normal);
// simplified is now the AST for "5x"
```

### Denormalization Algorithm

```typescript
function denormalize(form: NormalForm): MathNode {
	const numNode = denormalizePolynomial(form.numerator);
	const denNode = denormalizePolynomial(form.denominator);

	if (isOnePolynomial(form.denominator)) {
		return numNode;
	}

	return divide(numNode, denNode, 'fraction');
}

function denormalizePolynomial(terms: NormalTerm[]): MathNode {
	if (terms.length === 0) {
		return number('0');
	}

	let result = denormalizeTerm(terms[0]);

	for (let i = 1; i < terms.length; i++) {
		const termNode = denormalizeTerm(terms[i]);
		result = add(result, termNode);
	}

	return result;
}
```

## Simplification Rules

Pre-processing rules before normalization:

```typescript
// src/lib/mathAST/normal/rules/

// Arithmetic rules
const arithmeticRules = [
	{ pattern: 'x + 0', result: 'x' },
	{ pattern: '0 + x', result: 'x' },
	{ pattern: 'x * 1', result: 'x' },
	{ pattern: '1 * x', result: 'x' },
	{ pattern: 'x * 0', result: '0' },
	{ pattern: 'x - x', result: '0' }
	// ...
];

// Power rules
const powerRules = [
	{ pattern: 'x^0', result: '1' },
	{ pattern: 'x^1', result: 'x' },
	{ pattern: '1^n', result: '1' },
	{ pattern: '0^n', result: '0', condition: 'n > 0' }
	// ...
];

// Transcendental rules
const transcendentalRules = [
	{ pattern: 'ln(1)', result: '0' },
	{ pattern: 'ln(e)', result: '1' },
	{ pattern: 'exp(0)', result: '1' },
	{ pattern: 'sin(0)', result: '0' },
	{ pattern: 'cos(0)', result: '1' }
	// ...
];
```

## Equivalence Testing

### Using Exp API

```typescript
const a = Exp.parse('(a + b)^2');
const b = Exp.parse('a^2 + 2ab + b^2');

console.log(a.isEquivalent(b)); // true
console.log(a.hash === b.hash); // true
```

### Direct Comparison

```typescript
import { normalFormsEquivalent, normalize } from '$lib/mathAST/normal';

const form1 = normalize(ast1);
const form2 = normalize(ast2);

if (normalFormsEquivalent(form1, form2)) {
	console.log('Expressions are equivalent');
}
```

## Limitations

1. **Transcendental Functions** - Functions like `sin`, `cos` are treated as opaque (not expanded)

2. **Complex Expressions** - Very complex nested expressions may produce large normal forms

3. **Symbolic Powers** - Non-integer exponents are kept symbolic

4. **No Factorization** - The algorithm doesn't factor polynomials

## Testing

```bash
pnpm test:client src/lib/mathAST/normal
```

Test files:

```
src/lib/mathAST/normal/__tests__/
├── normalize.test.ts       # Main normalization tests
├── equivalence.test.ts     # Equivalence testing
├── polynomial.test.ts      # Polynomial operations
├── algebraic.test.ts       # Algebraic coefficients
├── rational.test.ts        # Rational arithmetic
├── radical.test.ts         # Radical simplification
├── monomial.test.ts        # Monomial operations
├── term.test.ts            # Term operations
├── compare.test.ts         # Ordering tests
└── rules.test.ts           # Simplification rules
```
