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
import { evaluate } from '$lib/mathAST';

const ast = parseLatex('2 + 3 * 4');
const result = evaluate(ast);
// result.value = 14

// With variables
const ast2 = parseLatex('x^2 + 1');
const result2 = evaluate(ast2, { variables: { x: 3 } });
// result2.value = 10
```

### Evaluation Result

```typescript
interface EvalResult {
	value: Rational | number; // Computed value
	node: MathNode; // Result as AST
	exact: boolean; // True if no approximation
}

const result = evaluate(parseLatex('1/3'));
// result.value = Rational { n: 1n, d: 3n }
// result.exact = true

const result2 = evaluate(parseLatex('sin(1)'));
// result2.value = 0.8414709848...
// result2.exact = false
```

### Evaluation Options

```typescript
interface EvalOptions {
	mode?: 'exact' | 'decimal';
	variables?: Record<string, number | MathNode>;
	functions?: FunctionBindings;
}

// Exact mode (default) - uses rationals
evaluate(parseLatex('1/3 + 1/6'), { mode: 'exact' });
// Returns Rational { n: 1n, d: 2n } = 1/2

// Decimal mode - uses floats
evaluate(parseLatex('1/3 + 1/6'), { mode: 'decimal' });
// Returns 0.5
```

### Exact Arithmetic

Uses BigInt-based rationals for precision:

```typescript
interface Rational {
	n: bigint; // Numerator
	d: bigint; // Denominator (always positive)
}

// Operations preserve exactness
evaluate(parseLatex('1/3 * 3'));
// Returns Rational { n: 1n, d: 1n } = 1 (exactly!)

// Irrational operations switch to decimal
evaluate(parseLatex('sqrt(2)'));
// Returns 1.4142135... (not exact)
```

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
