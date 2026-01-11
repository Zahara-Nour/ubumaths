# Matrix Operations

Complete matrix support for MathAST expressions.

## Overview

The matrix module provides:

- **Matrix AST node**: Represents matrices of arbitrary dimensions with symbolic elements
- **Factory functions**: Create matrices, vectors, identity, and zero matrices
- **Type guards**: Detect matrix types and shapes
- **Parsing**: LaTeX (`\begin{pmatrix}`) and custom syntax (`[[...]]`)
- **Generation**: Output to LaTeX and custom formats
- **Operations**: Arithmetic, transpose, trace, determinant, inverse
- **Pedagogical steps**: Step-by-step explanations for determinant and inverse

---

## Table of Contents

1. [MatrixNode Type](#matrixnode-type)
2. [Factory Functions](#factory-functions)
3. [Type Guards](#type-guards)
4. [Parsing](#parsing)
5. [LaTeX Generation](#latex-generation)
6. [Matrix Operations](#matrix-operations)
7. [Pedagogical Steps](#pedagogical-steps)
8. [Error Handling](#error-handling)
9. [Limitations](#limitations)

---

## MatrixNode Type

### Node Structure

```typescript
interface MatrixNode extends BaseNode {
	readonly type: 'matrix';
	readonly rows: readonly (readonly MathNode[])[];
	readonly matrixType: MatrixType;
}
```

### Matrix Types

The `MatrixType` determines how the matrix is rendered in LaTeX:

| Type            | LaTeX Environment     | Delimiters | Usage              |
| --------------- | --------------------- | ---------- | ------------------ | --- | ------------ | --- | ----- |
| `'plain'`       | `\begin{matrix}`      | None       | Bare matrix        |
| `'pmatrix'`     | `\begin{pmatrix}`     | `( )`      | Standard (default) |
| `'bmatrix'`     | `\begin{bmatrix}`     | `[ ]`      | Linear algebra     |
| `'Bmatrix'`     | `\begin{Bmatrix}`     | `{ }`      | Sets               |
| `'vmatrix'`     | `\begin{vmatrix}`     | `          |                    | `   | Determinants |
| `'Vmatrix'`     | `\begin{Vmatrix}`     | `          |                    |     |              | `   | Norms |
| `'smallmatrix'` | `\begin{smallmatrix}` | None       | Inline             |

```typescript
import type { MatrixType, MatrixNode } from '$lib/mathAST';
```

---

## Factory Functions

### matrix()

Create a matrix from a 2D array of MathNodes.

```typescript
import { matrix, number } from '$lib/mathAST';

// 2x2 matrix with parentheses
const A = matrix(
	[
		[number('1'), number('2')],
		[number('3'), number('4')]
	],
	{ matrixType: 'pmatrix' }
);

// 2x3 matrix with brackets
const B = matrix(
	[
		[number('1'), number('0'), number('2')],
		[number('4'), number('-1'), number('3')]
	],
	{ matrixType: 'bmatrix' }
);
```

**Options:**

```typescript
interface MatrixOptions {
	matrixType?: MatrixType; // Default: 'pmatrix'
	metadata?: NodeMetadata;
}
```

### rowVector()

Create a 1×N row vector.

```typescript
import { rowVector, number } from '$lib/mathAST';

const v = rowVector([number('1'), number('2'), number('3')]);
// [[1, 2, 3]] - 1 row, 3 columns
```

### columnVector()

Create an N×1 column vector.

```typescript
import { columnVector, number } from '$lib/mathAST';

const v = columnVector([number('1'), number('2'), number('3')]);
// [[1], [2], [3]] - 3 rows, 1 column
```

### identityMatrix()

Create an N×N identity matrix.

```typescript
import { identityMatrix } from '$lib/mathAST';

const I3 = identityMatrix(3);
// [[1,0,0], [0,1,0], [0,0,1]]

const I2_brackets = identityMatrix(2, { matrixType: 'bmatrix' });
```

### zeroMatrix()

Create an M×N matrix of zeros.

```typescript
import { zeroMatrix } from '$lib/mathAST';

const Z = zeroMatrix(2, 3); // 2×3 matrix of zeros
const Z2 = zeroMatrix(3); // 3×3 square matrix of zeros
```

---

## Type Guards

### isMatrix()

Check if a node is a matrix.

```typescript
import { isMatrix } from '$lib/mathAST';

if (isMatrix(node)) {
	console.log(`Matrix with ${node.rows.length} rows`);
}
```

### isRowVector()

Check if a matrix is a 1×N row vector.

```typescript
import { isRowVector } from '$lib/mathAST';

const v = rowVector([number('1'), number('2')]);
isRowVector(v); // true
```

### isColumnVector()

Check if a matrix is an N×1 column vector.

```typescript
import { isColumnVector } from '$lib/mathAST';

const v = columnVector([number('1'), number('2')]);
isColumnVector(v); // true
```

### isSquareMatrix()

Check if a matrix is N×N.

```typescript
import { isSquareMatrix } from '$lib/mathAST';

const A = matrix([
	[number('1'), number('2')],
	[number('3'), number('4')]
]);
isSquareMatrix(A); // true

const B = matrix([[number('1'), number('2'), number('3')]]);
isSquareMatrix(B); // false
```

---

## Parsing

### LaTeX Syntax

Parse matrices from LaTeX environments:

```typescript
import { parseLatex } from '$lib/mathAST';

// Standard pmatrix
const A = parseLatex('\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}');

// Bracket matrix
const B = parseLatex('\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}');

// Determinant notation
const det = parseLatex('\\begin{vmatrix} 1 & 2 \\\\ 3 & 4 \\end{vmatrix}');

// With expressions
const C = parseLatex('\\begin{pmatrix} x+1 & 2x \\\\ \\sin(x) & e^x \\end{pmatrix}');
```

**Supported environments:**

- `matrix`, `pmatrix`, `bmatrix`
- `Bmatrix`, `vmatrix`, `Vmatrix`
- `smallmatrix`

### Custom Syntax

Parse matrices from bracket notation:

```typescript
import { parseCustom } from '$lib/mathAST';

const A = parseCustom('[[1,2],[3,4]]');

// With expressions
const B = parseCustom('[[x+1, 2*x], [sin(x), exp(x)]]');

// Row vector
const v = parseCustom('[[1, 2, 3]]');
```

---

## LaTeX Generation

Generate LaTeX from matrix nodes:

```typescript
import { toLatex, matrix, number } from '$lib/mathAST';

const A = matrix(
	[
		[number('1'), number('2')],
		[number('3'), number('4')]
	],
	{ matrixType: 'pmatrix' }
);

toLatex(A);
// \begin{pmatrix}1 & 2 \\ 3 & 4\end{pmatrix}

// Custom syntax
import { toCustom } from '$lib/mathAST';
toCustom(A);
// [[1,2],[3,4]]
```

---

## Matrix Operations

All operations are in `$lib/mathAST/matrix/operations`.

### getDimensions()

Get matrix dimensions.

```typescript
import { getDimensions } from '$lib/mathAST';

const dim = getDimensions(A);
console.log(dim.rows, dim.cols); // 2, 3
```

### matrixAdd() / matrixSubtract()

Element-wise addition and subtraction.

```typescript
import { matrixAdd, matrixSubtract } from '$lib/mathAST';

const C = matrixAdd(A, B); // A + B
const D = matrixSubtract(A, B); // A - B
```

**Throws:** `MatrixDimensionError` if dimensions don't match.

### scalarMultiply()

Multiply a matrix by a scalar.

```typescript
import { scalarMultiply, number } from '$lib/mathAST';

const B = scalarMultiply(number('2'), A); // 2 * A
```

### matrixMultiply()

Matrix multiplication.

```typescript
import { matrixMultiply } from '$lib/mathAST';

const C = matrixMultiply(A, B); // A * B (m×n * n×p = m×p)
```

**Throws:** `MatrixDimensionError` if inner dimensions don't match.

### transpose()

Matrix transposition.

```typescript
import { transpose } from '$lib/mathAST';

const At = transpose(A); // A^T
```

### trace()

Sum of diagonal elements (square matrices only).

```typescript
import { trace } from '$lib/mathAST';

const tr = trace(A); // a_11 + a_22 + ... + a_nn
```

**Throws:** `MatrixOperationError` if matrix is not square.

### determinant()

Compute the determinant.

```typescript
import { determinant } from '$lib/mathAST';

const det = determinant(A); // Returns MathNode
```

**Algorithm:**

- 1×1: Direct value
- 2×2: `ad - bc` formula
- 3×3+: Cofactor expansion along first row

**Throws:** `MatrixOperationError` if matrix is not square.

### inverse()

Compute the matrix inverse.

```typescript
import { inverse } from '$lib/mathAST';

const Ainv = inverse(A); // A^{-1}
```

**Algorithm:**

- 2×2: Direct formula `(1/det) × adj(A)`
- 3×3+: Gauss-Jordan elimination with partial pivoting

**Throws:** `MatrixOperationError` if matrix is singular or not square.

---

## Pedagogical Steps

Both `determinant()` and `inverse()` support step-by-step explanations in French.

### API with Steps

```typescript
import { determinant, inverse } from '$lib/mathAST';
import type { MatrixOperationResult, MatrixStep } from '$lib/mathAST';

// Without options: returns result only (backward compatible)
const det = determinant(A); // MathNode

// With options: returns result + steps
const result = determinant(A, { verbosity: 'summarized' });
// result.result: MathNode
// result.steps: MatrixStep[]
```

### Verbosity Levels

| Level          | Description                                      |
| -------------- | ------------------------------------------------ |
| `'result'`     | No steps (empty array)                           |
| `'summarized'` | Key steps only (size, formula, result)           |
| `'detailed'`   | All intermediate steps (minors, cofactors, etc.) |

### Determinant Steps

```typescript
const result = determinant(A, { verbosity: 'detailed' });

for (const step of result.steps) {
	console.log(step.rule); // 'det-2x2-formula', 'compute-minor', etc.
	console.log(step.description); // French description
}
```

**Step rules for determinant:**

- `identify-matrix-size`: "La matrice est de taille NxN"
- `det-1x1`: For 1×1 matrices
- `det-2x2-formula`: "det = a × d - b × c"
- `det-cofactor-expansion`: For larger matrices
- `compute-minor`: Minor calculation (detailed only)
- `compute-cofactor`: Cofactor with sign (detailed only)
- `sum-cofactors`: Sum of terms
- `det-result`: Final result

### Inverse Steps

```typescript
const result = inverse(A, { verbosity: 'detailed' });

for (const step of result.steps) {
	console.log(step.rule); // 'row-swap', 'row-scale', etc.
	console.log(step.matrixState); // LaTeX of augmented matrix
}
```

**Step rules for inverse:**

- `check-determinant`: Verify det ≠ 0
- `inverse-2x2-formula`: For 2×2 matrices
- `augment-identity`: Form [A|I]
- `row-swap`: L_i ↔ L_j
- `row-scale`: L_i ← k × L_i
- `row-add`: L_i ← L_i + k × L_j
- `extract-inverse`: Extract right half
- `inverse-result`: Final inverse matrix

### MatrixStep Type

```typescript
interface MatrixStep {
	readonly id: number;
	readonly rule: MatrixRule;
	readonly description: string; // French description
	readonly before: MathNode;
	readonly after: MathNode;
	readonly verbosityLevel: Verbosity;
	readonly matrixState?: string; // LaTeX for augmented matrix
}
```

### Example: 3×3 Determinant with Steps

```typescript
import { matrix, number, determinant, toLatex } from '$lib/mathAST';

const M = matrix([
	[number('1'), number('2'), number('3')],
	[number('0'), number('1'), number('4')],
	[number('5'), number('6'), number('0')]
]);

const result = determinant(M, { verbosity: 'summarized' });

console.log('Determinant:', toLatex(result.result));

for (const step of result.steps) {
	console.log(`[${step.rule}] ${step.description}`);
}

// Output:
// [identify-matrix-size] La matrice est de taille 3x3
// [det-cofactor-expansion] On developpe le determinant 3x3 selon la premiere ligne
// [sum-cofactors] det = 1 x -24 + -2 x -20 + 3 x -5 = 1
// [det-result] det(A) = 1
```

### Example: 2×2 Inverse with Detailed Steps

```typescript
const A = matrix(
	[
		[number('4'), number('7')],
		[number('2'), number('6')]
	],
	{ matrixType: 'pmatrix' }
);

const result = inverse(A, { verbosity: 'detailed' });

for (const step of result.steps) {
	console.log(`[${step.rule}] ${step.description}`);
}

// Output:
// [check-determinant] det(A) = 10 != 0, donc la matrice est inversible
// [inverse-2x2-formula] A^{-1} = (1/10) x adj(A) ou adj(A) = [[d,-b],[-c,a]]
// [inverse-result] A^{-1} = (1/10) x [[6, -7], [-2, 4]]
```

---

## Error Handling

### MatrixDimensionError

Thrown when matrix dimensions are incompatible.

```typescript
import { matrixAdd, MatrixDimensionError } from '$lib/mathAST';

try {
	matrixAdd(A, B); // A is 2×3, B is 3×2
} catch (e) {
	if (e instanceof MatrixDimensionError) {
		console.log(e.expectedRows, e.expectedCols);
		console.log(e.actualRows, e.actualCols);
	}
}
```

### MatrixOperationError

Thrown when an operation is invalid.

```typescript
import { inverse, determinant, MatrixOperationError } from '$lib/mathAST';

try {
	inverse(singularMatrix);
} catch (e) {
	if (e instanceof MatrixOperationError) {
		console.log(e.operation); // 'inverse'
		console.log(e.details); // 'Singular matrix'
	}
}

try {
	determinant(nonSquareMatrix);
} catch (e) {
	if (e instanceof MatrixOperationError) {
		console.log(e.operation); // 'determinant'
		console.log(e.details); // 'Matrix must be square'
	}
}
```

---

## Limitations

### Numeric Only

Current operations work only with numeric matrices. Symbolic matrix algebra (e.g., `A * B` where elements are variables) is not yet supported.

```typescript
// Works
const A = matrix([
	[number('1'), number('2')],
	[number('3'), number('4')]
]);
determinant(A); // -2

// Not yet supported
const B = matrix([
	[variable('a'), variable('b')],
	[variable('c'), variable('d')]
]);
determinant(B); // Throws: Non-numeric element
```

### Size Limit

Practical size limit is 5×5 due to:

- Cofactor expansion is O(n!) for determinant
- Memory for augmented matrices

For larger matrices, consider numeric libraries.

### No Eigenvalues

Eigenvalue/eigenvector computation is not implemented.

---

## Module Exports

```typescript
// From $lib/mathAST
export {
	// Factory
	matrix,
	rowVector,
	columnVector,
	identityMatrix,
	zeroMatrix,

	// Guards
	isMatrix,
	isRowVector,
	isColumnVector,
	isSquareMatrix,

	// Operations
	getDimensions,
	matrixAdd,
	matrixSubtract,
	scalarMultiply,
	matrixMultiply,
	transpose,
	trace,
	determinant,
	inverse,

	// Errors
	MatrixDimensionError,
	MatrixOperationError,

	// Types
	type MatrixNode,
	type MatrixType,
	type MatrixOptions,
	type MatrixDimensions,
	type MatrixStep,
	type MatrixRule,
	type MatrixOperationOptions,
	type MatrixOperationResult
};

// From $lib/mathAST/matrix (direct import)
export { createMatrixStepRecorder, MatrixStepRecorderImpl } from './step-recorder';
```

---

## See Also

- [Types Reference](./types.md) - MathNode union type
- [Factory & Transforms](./factory-transforms.md) - Node creation patterns
- [Parsing](./parsing.md) - Parser architecture
- [Improvements](./improvements.md) - Future enhancements
