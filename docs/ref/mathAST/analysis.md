# Expression Analysis

The analysis module provides tools for extracting structural information from mathematical expressions.

## Linear Combination Extraction

Extracts coefficients from linear combinations of the form:

```
a₁·x₁ + a₂·x₂ + ... + aₙ·xₙ
```

where coefficients can be any MathNode (not just numbers).

### Import

```typescript
import {
	extractLinearCombination,
	isLinearCombination,
	getCoefficient,
	equalLinearCombinations,
	type LinearCombinationResult
} from '$lib/mathAST/analysis';
```

### Basic Usage

```typescript
import { parseLatex } from '$lib/mathAST';
import { extractLinearCombination } from '$lib/mathAST/analysis';

// Numeric coefficients
const result = extractLinearCombination(parseLatex('2x + 3y'), ['x', 'y']);
// result.coefficients.get('x') → number('2')
// result.coefficients.get('y') → number('3')

// Symbolic coefficients
const result2 = extractLinearCombination(parseLatex('\\sqrt{2}x + \\pi y'), ['x', 'y']);
// result2.coefficients.get('x') → sqrt(2) as MathNode
// result2.coefficients.get('y') → π as MathNode

// Function coefficients
const result3 = extractLinearCombination(parseLatex('\\cos(3)x + \\ln(5)y'), ['x', 'y']);
// result3.coefficients.get('x') → cos(3) as MathNode
// result3.coefficients.get('y') → ln(5) as MathNode
```

### API Reference

#### `extractLinearCombination(node, variables)`

Extracts coefficients from a linear combination.

**Parameters:**

- `node: MathNode` - The expression to analyze
- `variables: readonly string[]` - Variable names to look for (e.g., `['x', 'y', 'z']`)

**Returns:** `LinearCombinationResult`

```typescript
interface LinearCombinationResult {
	/** Map from variable name to its coefficient (as MathNode) */
	readonly coefficients: ReadonlyMap<string, MathNode>;

	/** The variables that were looked for (in order) */
	readonly variables: readonly string[];

	/** Whether the expression is a valid linear combination */
	readonly isLinear: boolean;

	/** Error message if isLinear is false */
	readonly error?: string;
}
```

#### `isLinearCombination(node, variables)`

Checks if an expression is a valid linear combination.

```typescript
isLinearCombination(parseLatex('2x + 3y'), ['x', 'y']); // true
isLinearCombination(parseLatex('xy'), ['x', 'y']); // false (product)
isLinearCombination(parseLatex('x^2'), ['x']); // false (power)
isLinearCombination(parseLatex('x + 1'), ['x']); // false (constant term)
```

#### `getCoefficient(node, variable, otherVariables?)`

Gets the coefficient for a specific variable.

```typescript
const node = parseLatex('2x + 3y');
getCoefficient(node, 'x', ['y']); // → number('2')
getCoefficient(node, 'y', ['x']); // → number('3')
```

#### `equalLinearCombinations(a, b, variables)`

Compares if two linear combinations have structurally equal coefficients.

```typescript
const a = parseLatex('2x + 3y');
const b = parseLatex('3y + 2x');
equalLinearCombinations(a, b, ['x', 'y']); // true (same coefficients)
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
| `2x/3`     | x        | `divide(number('2'), number('3'))` |
| `cos(3)x`  | x        | `func('cos', [number('3')])`       |
| `ln(5)y`   | y        | `func('ln', [number('5')])`        |
| `f(a)z`    | z        | `func('f', [variable('a')])`       |

### Features

- **Symbolic coefficients**: Coefficients are returned as MathNode, not just numbers
- **Like term combining**: `x + 2x` → coefficient of x is `3`
- **Sign handling**: `-x + y` correctly gives coefficient `-1` for x
- **Fraction support**: `x/2` and `2x/3` work correctly
- **Function coefficients**: `cos(3)x`, `ln(5)y`, `f(a)z` all supported
- **Missing variables**: Variables not present get coefficient `0`

### Rejected Expressions

The following are NOT valid linear combinations:

| Expression | Reason                               |
| ---------- | ------------------------------------ |
| `xy`       | Product of two variables (quadratic) |
| `x²`       | Power of variable (quadratic)        |
| `x + 1`    | Contains constant term               |
| `1/x`      | Variable in denominator              |
| `sin(x)`   | Variable inside function             |

### Use Cases

#### Equation System Coefficients

```typescript
// Extract coefficients for system: 2x + 3y = 5, x - y = 1
const eq1 = parseLatex('2x + 3y');
const eq2 = parseLatex('x - y');

const coeffs1 = extractLinearCombination(eq1, ['x', 'y']);
const coeffs2 = extractLinearCombination(eq2, ['x', 'y']);

// Build coefficient matrix
const matrix = [
	[coeffs1.coefficients.get('x'), coeffs1.coefficients.get('y')],
	[coeffs2.coefficients.get('x'), coeffs2.coefficients.get('y')]
];
```

#### Vector Space Linear Combinations

```typescript
// Check if expression is in span of basis vectors
const expr = parseLatex('a \\vec{u} + b \\vec{v} + c \\vec{w}');
const result = extractLinearCombination(expr, ['\\vec{u}', '\\vec{v}', '\\vec{w}']);

if (result.isLinear) {
	// Expression is a valid linear combination of the basis
}
```

#### Polynomial Coefficient Extraction

```typescript
// For polynomial ax² + bx + c, extract coefficients of powers
// (Note: requires treating x², x, 1 as "variables")
const poly = parseLatex('2x^2 + 3x + 5');
// This module is for LINEAR combinations; for polynomials,
// use the normalization module instead
```

## Future Additions

The analysis module is designed to be extended with:

- **Polynomial analysis**: Degree, leading coefficient, factor extraction
- **Expression classification**: Polynomial, rational, trigonometric, etc.
- **Structure detection**: Quadratic form, difference of squares, etc.

## See Also

- [Pattern Matching](./patterns.md) - For more complex structural matching
- [Normalization](./normalization.md) - For polynomial equivalence checking
- [Types](./types.md) - MathNode type definitions
