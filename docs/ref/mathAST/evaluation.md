# Evaluation & Substitution

Numeric evaluation and variable substitution for MathAST expressions.

## Overview

The evaluation system provides:

- **Substitution**: Replace variables with values or expressions
- **Evaluation**: Compute numeric results
- **Unit-aware evaluation**: Evaluate with unit propagation and validation
- **Function bindings**: Define custom functions
- **Exact arithmetic**: BigInt-based rational numbers

## Quick Start

```typescript
import { evaluate, substitute, getVariables } from '$lib/mathAST';

// Parse and evaluate
const ast = parseLatex('x^2 + 3x - 5');

// Evaluate with bindings
const result = evaluate(ast, {
	variables: { x: 2 }
});
// result.value = 5 (2^2 + 3*2 - 5)

// Substitute to get new expression
const substituted = substitute(ast, { x: MathAST.number('2') });
// Returns AST for: 2^2 + 3*2 - 5

// Get free variables
const vars = getVariables(ast);
// Set { 'x' }
```

## Substitution

### Basic Substitution

```typescript
import { substitute } from '$lib/mathAST';

const ast = parseLatex('x + y');

// Substitute with AST nodes
const result = substitute(ast, {
	x: MathAST.number('5'),
	y: MathAST.variable('z')
});
// Returns AST for: 5 + z
```

### Variable Bindings

```typescript
type EvalBindings = {
	[variableName: string]: MathNode;
};

// Multiple substitutions
substitute(ast, {
	x: MathAST.number('2'),
	y: MathAST.number('3'),
	z: MathAST.add(MathAST.variable('a'), MathAST.number('1'))
});
```

### Substitution Options

```typescript
interface SubstituteOptions {
	recursive?: boolean; // Substitute in result (default: false)
}

// Non-recursive (default)
substitute(parseLatex('x + x'), { x: MathAST.variable('y') });
// y + y

// Recursive (substitutes in result)
substitute(
	parseLatex('x + x'),
	{ x: MathAST.variable('y'), y: MathAST.number('5') },
	{ recursive: true }
);
// 5 + 5
```

## Numeric Evaluation

### Basic Evaluation

```typescript
import { evaluate, toLatex } from '$lib/mathAST';

const ast = parseLatex('2 + 3 * 4');
const result = evaluate(ast);
// result.value is the simplified MathNode
// toLatex(result.node) = '14'

// With substitution before evaluation
const ast2 = parseLatex('x^2 + 1');
const substituted = substitute(ast2, { x: 3 });
const result2 = evaluate(substituted);
// toLatex(result2.node) = '10'
```

### Evaluation Result

```typescript
interface EvalResult {
	value: MathNode | number | ComplexValueResult; // Computed value
	node: MathNode; // Simplified AST representation
	exact: boolean; // True if exact mode
}

// Exact mode (default): value is a simplified MathNode
const result = evaluate(parseLatex('1/3 + 1/6'));
// result.value is MathNode for 1/2
// toLatex(result.node) = '\\dfrac{1}{2}'
// result.exact = true

// Decimal mode: value is a number
const result2 = evaluate(parseLatex('sin(1)'), { mode: 'decimal' });
// result2.value = 0.8414709848...
// result2.exact = false
```

### Evaluation Options

```typescript
interface EvalOptions {
	mode?: 'exact' | 'decimal';
	functions?: FunctionBindings;
}

// Exact mode (default) - returns simplified MathNode
evaluate(parseLatex('1/3 + 1/6'), { mode: 'exact' });
// Returns MathNode representing 1/2

// Decimal mode - returns number
evaluate(parseLatex('1/3 + 1/6'), { mode: 'decimal' });
// Returns 0.5
```

### Exact Symbolic Evaluation

In exact mode, `evaluate` uses the normalization system to produce truly exact results:

```typescript
// Fractions are kept exact
const result = evaluate(parseLatex('1/3 * 3'));
// toLatex(result.node) = '1'

// Radicals are preserved symbolically
const result2 = evaluate(parseLatex('\\sqrt{2}'));
// toLatex(result2.node) = '\\sqrt{2}'
// result2.exact = true (truly exact!)

// Radicals are simplified when possible
const result3 = evaluate(parseLatex('\\sqrt{4}'));
// toLatex(result3.node) = '2'

const result4 = evaluate(parseLatex('\\sqrt{18}'));
// toLatex(result4.node) = '3 \\sqrt{2}'
```

This is a significant improvement over the previous implementation which would approximate
irrational values. Now `evaluate` with `mode: 'exact'` returns **true exact values** via
the normalization/denormalization pipeline.

### Supported Functions

Built-in functions for evaluation:

```typescript
// Trigonometric
sin(x), cos(x), tan(x)
asin(x), acos(x), atan(x)

// Hyperbolic
sinh(x), cosh(x), tanh(x)

// Exponential/Logarithmic
exp(x), ln(x), log(x)

// Power
sqrt(x), cbrt(x)
x^n (for any n)

// Other
abs(x), floor(x), ceil(x), round(x)

// Statistical (min/max only - others via .stats command in REPL)
min(...), max(...)

// Complex numbers (see below)
cabs(z), conj(z), Re(z), Im(z), arg(z)
cis(θ), frompolar(r, θ)
rootofunity(n, k), nthroot(z, n, k), principalroot(z, n)
```

## Complex Number Evaluation

The evaluator fully supports complex numbers with automatic promotion from reals.

### Complex Arithmetic (Exact Mode)

In exact mode, complex arithmetic is performed symbolically:

```typescript
// Complex numbers are represented symbolically
const ast = parseLatex('(2 + 3\\imaginaryI) + (1 - \\imaginaryI)');
const result = evaluate(ast, { mode: 'exact' });
// toLatex(result.node) = '3 + 2 \\imaginaryI'

// Powers of i are simplified
evaluate(parseLatex('\\imaginaryI^2'), { mode: 'exact' });
// toLatex(result.node) = '-1'

evaluate(parseLatex('\\imaginaryI^4'), { mode: 'exact' });
// toLatex(result.node) = '1'

// Multiplication works symbolically
evaluate(parseLatex('(1 + \\imaginaryI)^2'), { mode: 'exact' });
// toLatex(result.node) = '2 \\imaginaryI'
```

**Note**: Complex denominator rationalization is implemented. Expressions like `1/i` are reduced to `-i`,
and complex fractions like `(2+3i)/(1-i)` are reduced to the form `a + bi`.

### Complex Functions

In exact mode, complex functions stay as function nodes (symbolic):

```typescript
// These functions stay symbolic in exact mode
cabs(z); // Modulus: |a + bi| = √(a² + b²)
conj(z); // Conjugate: conj(a + bi) = a - bi
Re(z); // Real part
Im(z); // Imaginary part
arg(z); // Argument (phase angle)

// Example: functions stay as nodes
const result = evaluate(parseLatex('\\cabs(3 + 4\\imaginaryI)'), { mode: 'exact' });
// result.node.type = 'function', result.node.name = 'cabs'

// In decimal mode, they evaluate numerically
const result2 = evaluate(parseLatex('\\cabs(3 + 4\\imaginaryI)'), { mode: 'decimal' });
// result2.value = 5 (√(9 + 16))
```

### Principal Argument Convention

The argument function returns the **principal value** in the interval **(-π, π]**:

| z                 | arg(z) |
| ----------------- | ------ |
| 1 (positive real) | 0      |
| i                 | π/2    |
| -1                | π      |
| -i                | -π/2   |
| 1+i               | π/4    |
| -1-i              | -3π/4  |

This convention is used consistently across all complex functions including logarithms and nth roots.

### Polar/Exponential Form

```typescript
// cis function: cis(θ) = cos(θ) + i·sin(θ)
evaluate(parseLatex('\\cis(\\frac{\\pi}{4})'));
// √2/2 + i·√2/2

// From polar: frompolar(r, θ) = r·cis(θ)
evaluate(parseLatex('\\frompolar(2, \\frac{\\pi}{3})'));
// 2·(cos(π/3) + i·sin(π/3)) = 1 + i√3

// Complex exponential: exp(a + bi) = eᵃ·(cos(b) + i·sin(b))
evaluate(parseLatex('\\exp(\\imaginaryI \\cdot \\pi)'));
// e^(iπ) = -1 (Euler's identity)

// Complex logarithm (principal value)
evaluate(parseLatex('\\ln(-1)'));
// ln(-1) = iπ

evaluate(parseLatex('\\ln(\\imaginaryI)'));
// ln(i) = iπ/2
```

### Complex Powers

Complex exponentiation uses the formula z^w = exp(w·ln(z)):

```typescript
// Integer powers
evaluate(parseLatex('\\imaginaryI^2')); // -1
evaluate(parseLatex('\\imaginaryI^4')); // 1

// Fractional powers (principal value)
evaluate(parseLatex('(-1)^{0.5}')); // i
evaluate(parseLatex('(-8)^{\\frac{1}{3}}')); // 1 + i√3 (principal cube root)

// Complex exponent
evaluate(parseLatex('\\imaginaryI^{\\imaginaryI}'));
// i^i = e^(i·ln(i)) = e^(i·iπ/2) = e^(-π/2) ≈ 0.2079
```

### Nth Roots of Complex Numbers

Three functions for computing nth roots (educational focus).

**Note**: In exact mode, these functions stay as function nodes because computing
nth roots of complex numbers requires trigonometric evaluation. Use decimal mode
for numeric results.

```typescript
// In exact mode, functions stay symbolic
const result = evaluate(parseLatex('\\rootofunity(4, 1)'), { mode: 'exact' });
// result.node.type = 'function', result.node.name = 'rootofunity'

// In decimal mode, they evaluate numerically
// rootofunity(n, k) - k-th nth root of unity: e^{2πik/n}
evaluate(parseLatex('\\rootofunity(4, 1)'), { mode: 'decimal' }); // e^{iπ/2} = i
evaluate(parseLatex('\\rootofunity(3, 1)'), { mode: 'decimal' }); // e^{2πi/3} = -1/2 + i√3/2

// nthroot(z, n, k) - k-th nth root of z
// Formula: |z|^{1/n} · e^{i(arg(z) + 2πk)/n}
evaluate(parseLatex('\\nthroot(8, 3, 0)'), { mode: 'decimal' }); // 2 (principal cube root)
evaluate(parseLatex('\\nthroot(8, 3, 1)'), { mode: 'decimal' }); // -1 + i√3
evaluate(parseLatex('\\nthroot(8, 3, 2)'), { mode: 'decimal' }); // -1 - i√3

// principalroot(z, n) - convenience for k=0
evaluate(parseLatex('\\principalroot(-1, 2)'), { mode: 'decimal' }); // i
```

#### Parameter Constraints

| Function              | Parameters               | Constraints                         |
| --------------------- | ------------------------ | ----------------------------------- |
| `rootofunity(n, k)`   | n, k integers            | n > 0, k can be any integer (wraps) |
| `nthroot(z, n, k)`    | z complex, n, k integers | n > 0, 0 ≤ k < n                    |
| `principalroot(z, n)` | z complex, n integer     | n > 0                               |

#### Mathematical Properties

```typescript
// All n roots of unity sum to 0 (for n > 1)
// ω⁰ + ω¹ + ... + ω^{n-1} = 0
evaluate(parseLatex('\\rootofunity(3,0) + \\rootofunity(3,1) + \\rootofunity(3,2)'));
// 1 + (-1/2 + i√3/2) + (-1/2 - i√3/2) = 0

// (k-th root)^n = original number
// nthroot(z, n, k)^n = z
evaluate(parseLatex('\\nthroot(8, 3, 1)^3')); // 8

// ω^n = 1 for any root of unity
evaluate(parseLatex('\\rootofunity(5, 2)^5')); // 1
```

## Variable Analysis

```typescript
import { getVariables, hasVariable, hasAllBindings, getMissingBindings } from '$lib/mathAST';

const ast = parseLatex('x^2 + 3xy - z');

// Get all free variables
const vars = getVariables(ast);
// Set { 'x', 'y', 'z' }

// Check for specific variable
hasVariable(ast, 'x'); // true
hasVariable(ast, 'w'); // false

// Check if all variables have bindings
hasAllBindings(ast, { x: 1, y: 2, z: 3 }); // true
hasAllBindings(ast, { x: 1, y: 2 }); // false

// Get missing variables
getMissingBindings(ast, { x: 1 });
// ['y', 'z']
```

## Function Bindings

Define custom functions for evaluation:

```typescript
import { substitute, applyFunction, FunctionDefinition } from '$lib/mathAST';

// Define a function
const fDef: FunctionDefinition = {
	expression: parseLatex('x^2 + 1'),
	parameters: ['x'],
	derivative: parseLatex('2x'), // Optional
	inverse: parseLatex('sqrt(x-1)') // Optional
};

// Apply function to argument
const f_of_3 = applyFunction(fDef, [MathAST.number('3')]);
// Returns AST for: 3^2 + 1 = 10

// Use in evaluation
evaluate(parseLatex('f(2)'), {
	functions: { f: fDef }
});
// Returns 5 (2^2 + 1)
```

### Function Bindings Type

```typescript
interface FunctionDefinition {
	expression: MathNode;
	parameters: string[];
	derivative?: MathNode;
	inverse?: MathNode;
}

type FunctionBindings = Record<string, FunctionDefinition>;
```

### Composition

Handle function composition `(f o g)(x) = f(g(x))`:

```typescript
import { applyComposition } from '$lib/mathAST';

const fDef = { expression: parseLatex('x^2'), parameters: ['x'] };
const gDef = { expression: parseLatex('x+1'), parameters: ['x'] };

// (f o g)(3) = f(g(3)) = f(4) = 16
const result = applyComposition(
	MathAST.compose(MathAST.variable('f'), MathAST.variable('g')),
	[MathAST.number('3')],
	{ f: fDef, g: gDef }
);
```

### Undefined Functions

```typescript
import { getUndefinedFunctions, FunctionBindingError } from '$lib/mathAST';

const ast = parseLatex('f(x) + g(y)');

// Get undefined function names
const undefined = getUndefinedFunctions(ast, {});
// ['f', 'g']

// Throws when evaluating undefined function
try {
	evaluate(ast, { variables: { x: 1, y: 2 } });
} catch (e) {
	if (e instanceof FunctionBindingError) {
		console.error('Missing function:', e.functionName);
	}
}
```

## Special Cases

### Pi Constant

```typescript
// Pi is automatically recognized
evaluate(parseLatex('\\pi'));
// Returns Math.PI

evaluate(parseLatex('2\\pi'));
// Returns 2 * Math.PI
```

### Complex Expressions

```typescript
// Nested expressions work
const ast = parseLatex('\\frac{\\sin(x)}{x}');
evaluate(ast, { variables: { x: Math.PI / 2 } });
// Returns 2/pi approx 0.6366...

// Polynomials
const poly = parseLatex('x^3 - 2x^2 + 5x - 3');
evaluate(poly, { variables: { x: 2 } });
// Returns 7
```

### Division by Zero

```typescript
evaluate(parseLatex('1/0'));
// Returns Infinity

evaluate(parseLatex('0/0'));
// Returns NaN
```

## Integration with Pattern Matching

Combine with pattern matching for symbolic computation:

```typescript
import { evaluate, matches, P } from '$lib/mathAST';

const expr = parseLatex('x^2 + 2x + 1');

// Check if it's a perfect square
const perfectSquarePattern = P.add(
	P.add(P.pow(P._('a'), P.num(2)), P.mul(P.num(2), P.mul(P._('a'), P._('b')))),
	P.pow(P._('b'), P.num(2))
);

if (matches(perfectSquarePattern, expr)) {
	// Expression is (a + b)^2
}

// Evaluate the factored form
const factored = parseLatex('(x+1)^2');
evaluate(factored, { variables: { x: 3 } });
// Returns 16
```

## Performance Tips

1. **Reuse bindings objects** for multiple evaluations
2. **Pre-parse expressions** that are evaluated repeatedly
3. **Use exact mode** only when precision matters
4. **Cache function definitions** for repeated use

```typescript
// Efficient repeated evaluation
const ast = parseLatex('x^2 + 3x - 5');
const xValues = [1, 2, 3, 4, 5];
const results = xValues.map((x) => evaluate(ast, { variables: { x } }).value);
```

## Error Handling

```typescript
import { FunctionBindingError } from '$lib/mathAST';

try {
	evaluate(ast, options);
} catch (e) {
	if (e instanceof FunctionBindingError) {
		console.error(`Unknown function: ${e.functionName}`);
	} else if (e instanceof Error) {
		console.error(`Evaluation error: ${e.message}`);
	}
}
```

## Input Validation with Zod

Runtime validation of evaluation bindings using Zod schemas:

### Validation Functions

```typescript
import {
	validateVariableName,
	validateNumericValue,
	validateEvalBindings,
	VariableNameSchema,
	NumericValueSchema,
	EvalBindingsSchema
} from '$lib/mathAST';

// Validate variable names (returns { success, data?, error? })
validateVariableName('x'); // { success: true, data: 'x' }
validateVariableName('123'); // { success: false, error: ... }
validateVariableName(''); // { success: false, error: ... }

// Validate numeric values (rejects NaN, Infinity)
validateNumericValue(42); // { success: true, data: 42 }
validateNumericValue(NaN); // { success: false, error: ... }
validateNumericValue(Infinity); // { success: false, error: ... }

// Validate complete bindings object
validateEvalBindings({ x: 1, y: 2 }); // { success: true, data: { x: 1, y: 2 } }
validateEvalBindings({ x: NaN }); // { success: false, error: ... }
```

### Available Schemas

```typescript
// Variable name: alphanumeric starting with letter/underscore
const VariableNameSchema = z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/);

// Numeric value: finite number (not NaN or Infinity)
const NumericValueSchema = z.number().refine((n) => Number.isFinite(n), 'Value must be finite');

// Numeric value with bounds
const BoundedNumericSchema = z.number().finite().min(-1e10).max(1e10);

// Evaluation bindings: record of variable names to values
const EvalBindingsSchema = z.record(VariableNameSchema, NumericValueSchema);
```

### Use Cases

```typescript
// Validate user input before evaluation
function safeEvaluate(ast: MathNode, userBindings: unknown) {
	const result = validateEvalBindings(userBindings);
	if (!result.success) {
		throw new Error(`Invalid bindings: ${result.error.message}`);
	}
	return evaluate(ast, { variables: result.data });
}

// In API endpoints
const schema = z.object({
	expression: z.string().max(1000),
	variables: EvalBindingsSchema
});
const parsed = schema.safeParse(await request.json());
```

## Unit-Aware Evaluation

Evaluate expressions with unit propagation and dimensional validation.

### Basic Usage

```typescript
import { evaluateWithUnits } from '$lib/mathAST';

// Simple quantity
const expr = parseLatex('5~\\unit{km}');
const result = evaluateWithUnits(expr);
// result.value = 5
// result.unit = km (coefficient: 1000)

// Addition with same units
const sum = parseLatex('5~\\unit{m} + 3~\\unit{m}');
const result2 = evaluateWithUnits(sum);
// result2.value = 8
// result2.unit = m
```

### Conversion Modes

Three modes control how units are converted:

```typescript
type UnitConversionMode = 'first' | 'si' | 'best';
```

#### Mode 'first' (default)

Converts to the first unit encountered:

```typescript
const expr = parseLatex('5~\\unit{km} + 3000~\\unit{m}');
evaluateWithUnits(expr, { conversionMode: 'first' });
// value: 8, unit: km (first unit)

const expr2 = parseLatex('500~\\unit{m} + 2~\\unit{km}');
evaluateWithUnits(expr2, { conversionMode: 'first' });
// value: 2500, unit: m (first unit)
```

#### Mode 'si'

Normalizes to SI base units:

```typescript
const expr = parseLatex('5~\\unit{km} + 3000~\\unit{m}');
evaluateWithUnits(expr, { conversionMode: 'si' });
// value: 8000, unit: m (SI base)

const time = parseLatex('1~\\unit{h} + 30~\\unit{min}');
evaluateWithUnits(time, { conversionMode: 'si' });
// value: 5400, unit: s (SI base)
```

#### Mode 'best'

Chooses the most readable unit (value in range 0.1-1000):

```typescript
const expr = parseLatex('0.005~\\unit{km} + 3~\\unit{m}');
evaluateWithUnits(expr, { conversionMode: 'best' });
// value: 8, unit: m (more readable than 0.008 km)

const large = parseLatex('5000~\\unit{m}');
evaluateWithUnits(large, { conversionMode: 'best' });
// value: 5, unit: km (more readable than 5000 m)
```

### Derived Units

Multiplication and division create derived units:

```typescript
// Area: m * m = m^2
const area = parseLatex('4~\\unit{m} \\times 3~\\unit{m}');
const result = evaluateWithUnits(area);
// value: 12, unit: m^2

// Velocity: m / s = m.s^-1
const velocity = parseLatex('100~\\unit{m} / 10~\\unit{s}');
const result2 = evaluateWithUnits(velocity);
// value: 10, unit: m/s

// Dimensionless: m / m = 1
const ratio = parseLatex('10~\\unit{m} / 2~\\unit{m}');
const result3 = evaluateWithUnits(ratio);
// value: 5, unit: dimensionless
```

### Error Handling

Throws `DimensionalEvaluationError` for incompatible units:

```typescript
import { evaluateWithUnits, DimensionalEvaluationError } from '$lib/mathAST';

try {
	// Cannot add meters and seconds
	evaluateWithUnits(parseLatex('5~\\unit{m} + 3~\\unit{s}'));
} catch (e) {
	if (e instanceof DimensionalEvaluationError) {
		console.error(e.message);
		// Access structured errors
		e.errors.forEach(({ code, message }) => {
			console.error(`${code}: ${message}`);
		});
	}
}
```

### Result Type

```typescript
interface EvalResultWithUnit {
	value: Rational | number; // Computed value
	node: MathNode; // Result as AST
	exact: boolean; // True if no approximation
	unit: Unit; // Result unit (always present)
	originalUnit?: Unit; // Original unit if converted
}
```

### Options

```typescript
interface EvalWithUnitsOptions {
	mode?: 'exact' | 'decimal'; // Arithmetic mode
	precision?: number; // Decimal precision
	conversionMode?: 'first' | 'si' | 'best'; // Unit conversion
	variableUnits?: Map<string, Unit>; // Units for variables
	functions?: FunctionBindings; // Custom functions
}
```

### With Functions

Unit-aware evaluation works with functions:

```typescript
// sqrt halves exponents: sqrt(m^2) = m
const expr = parseLatex('\\sqrt{4~\\unit{m}^2}');
const result = evaluateWithUnits(expr);
// value: 2, unit: m

// abs preserves units
const expr2 = parseLatex('|{-5}|~\\unit{m}');
const result2 = evaluateWithUnits(expr2);
// value: 5, unit: m
```

## See Also

- [Units System](./units.md) - Unit representation and conversion
- [Pattern Matching](./patterns.md) - Symbolic pattern matching
- [Normalization](./normalization.md) - Canonical form conversion
- [Calculus](./calculus.md) - Differentiation and Taylor series
