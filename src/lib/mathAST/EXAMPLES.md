# MathAST LaTeX Generator Examples

Quick examples demonstrating how to use the LaTeX generator.

## Basic Usage

```typescript
import { MathAST, toLatex } from '$lib/mathAST';

// Create an expression: x^2 + 5
const expr = MathAST.add(
	MathAST.power(MathAST.variable('x'), MathAST.number('2')),
	MathAST.number('5')
);

// Generate LaTeX
const latex = toLatex(expr);
console.log(latex); // "x^2 + 5"
```

## Using the Generator Class

```typescript
import { LatexGenerator } from '$lib/mathAST';

// Create a generator with options
const generator = new LatexGenerator({
	renderMetadata: true // Enable color and style rendering
});

// Create colored expression
const expr = MathAST.variable('x', { color: 'red', style: 'bold' });
const latex = generator.generate(expr);
console.log(latex); // "\textcolor{red}{\mathbf{x}}"
```

## Common Patterns

### Fractions

```typescript
// Simple fraction: a/b
const frac = MathAST.fraction(MathAST.variable('a'), MathAST.variable('b'));
toLatex(frac); // "\frac{a}{b}"

// Inline division: a / b
const inline = MathAST.divide(MathAST.variable('a'), MathAST.variable('b'), 'inline');
toLatex(inline); // "a / b"
```

### Trigonometric Functions

```typescript
// sin(x)
const sinExpr = MathAST.sin(MathAST.variable('x'));
toLatex(sinExpr); // "\sin\left( x \right)"

// sin^2(x)
const sin2 = MathAST.power(MathAST.sin(MathAST.variable('x')), MathAST.number('2'));
toLatex(sin2); // "\sin\left( x \right)^2"
```

### Greek Letters

```typescript
// α + β = γ
const greekSum = MathAST.equals(
	MathAST.add(MathAST.greek('alpha'), MathAST.greek('beta')),
	MathAST.greek('gamma')
);
toLatex(greekSum); // "\alpha + \beta = \gamma"

// Uppercase: Δ
const delta = MathAST.greek('Delta');
toLatex(delta); // "\Delta"

// Roman uppercase: Α (Alpha)
const alpha = MathAST.greek('Alpha');
toLatex(alpha); // "A"
```

### Delimiters

```typescript
// Parentheses: (x + y)
const paren = MathAST.parentheses(MathAST.add(MathAST.variable('x'), MathAST.variable('y')));
toLatex(paren); // "\left( x + y \right)"

// Absolute value: |x|
const abs = MathAST.delimiter('absolute', MathAST.variable('x'), 'absolute');
toLatex(abs); // "\left| x \right|"
```

### Relations

```typescript
// Equality: x = 5
const eq = MathAST.equals(MathAST.variable('x'), MathAST.number('5'));
toLatex(eq); // "x = 5"

// Inequality: x < 10
const lt = MathAST.lessThan(MathAST.variable('x'), MathAST.number('10'));
toLatex(lt); // "x < 10"

// Set membership: x ∈ ℝ
const elem = MathAST.elementOf(MathAST.variable('x'), MathAST.symbol('Re'));
toLatex(elem); // "x \in \Re"
```

### Complex Expressions

```typescript
// Quadratic equation: ax^2 + bx + c = 0
const quadratic = MathAST.equals(
	MathAST.add(
		MathAST.add(
			MathAST.implicitMultiply(
				MathAST.variable('a'),
				MathAST.power(MathAST.variable('x'), MathAST.number('2'))
			),
			MathAST.implicitMultiply(MathAST.variable('b'), MathAST.variable('x'))
		),
		MathAST.variable('c')
	),
	MathAST.number('0')
);
toLatex(quadratic); // "a x^2 + b x + c = 0"

// Logarithm with base: log₂(8) = 3
const logExpr = MathAST.equals(
	MathAST.log(MathAST.number('8'), MathAST.number('2')),
	MathAST.number('3')
);
toLatex(logExpr); // "\log_2\left( 8 \right) = 3"
```

## Variable Handling

```typescript
// Single character: x
toLatex(MathAST.variable('x')); // "x"

// Multi-character: velocity
toLatex(MathAST.variable('velocity')); // "\mathit{velocity}"
```

## Metadata Rendering

```typescript
const generator = new LatexGenerator({ renderMetadata: true });

// Color
const red = MathAST.variable('x', { color: 'red' });
generator.generate(red); // "\textcolor{red}{x}"

// Style
const bold = MathAST.variable('x', { style: 'bold' });
generator.generate(bold); // "\mathbf{x}"

// Both
const redBold = MathAST.variable('x', { color: 'blue', style: 'bold' });
generator.generate(redBold); // "\textcolor{blue}{\mathbf{x}}"
```

## Subscripts and Superscripts

```typescript
// Simple superscript: x^2
const pow = MathAST.power(MathAST.variable('x'), MathAST.number('2'));
toLatex(pow); // "x^2"

// Multi-character superscript: x^{10}
const pow10 = MathAST.power(MathAST.variable('x'), MathAST.number('10'));
toLatex(pow10); // "x^{10}"

// Subscript: x_i
const sub = MathAST.subscript(MathAST.variable('x'), MathAST.variable('i'));
toLatex(sub); // "x_i"

// Complex subscript: x_{i+1}
const complexSub = MathAST.subscript(
	MathAST.variable('x'),
	MathAST.add(MathAST.variable('i'), MathAST.number('1'))
);
toLatex(complexSub); // "x_{i + 1}"
```

## Mathematical Symbols

```typescript
// Infinity: ∞
toLatex(MathAST.symbol('infinity')); // "\infty"

// Empty set: ∅
toLatex(MathAST.symbol('emptyset')); // "\emptyset"

// Partial derivative: ∂
toLatex(MathAST.symbol('partial')); // "\partial"

// Operators
toLatex(MathAST.symbol('pm')); // "\pm"
toLatex(MathAST.symbol('cdot')); // "\cdot"
toLatex(MathAST.symbol('times')); // "\times"
```

## Integration with ASCIIMath Transpiler

```typescript
import { parse } from '$lib/transpilers/asciimath-to-latex';
import { toLatex } from '$lib/mathAST';

// Parse AsciiMath to MathAST
const ast = parse('x^2 + 5');

// Convert to LaTeX
const latex = toLatex(ast);
console.log(latex); // "x^2 + 5"
```
