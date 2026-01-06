# TinyCAS (Legacy System)

## Overview

TinyCAS is the original Computer Algebra System that powers many mathematical operations in UbuMaths. While MathAST provides the modern, TypeScript-first interface, TinyCAS remains in use for certain operations.

## Location

```
extern/new-tinymath/packages/tinycas/
├── src/
│   ├── index.ts          # Main exports
│   └── math/
│       ├── math.ts       # Expression construction
│       ├── lexer.ts      # Tokenization
│       ├── parser.ts     # Pratt parser
│       ├── node.ts       # Node factory functions
│       ├── types.ts      # Type definitions
│       ├── normal.ts     # Normal form computation
│       ├── transform.ts  # Expression transformations
│       ├── evaluate.ts   # Numeric evaluation
│       ├── compare.ts    # Expression ordering
│       ├── output.ts     # String/LaTeX output
│       ├── unit.ts       # Physical units
│       └── fraction.ts   # Rational arithmetic
└── utils/
    └── utils.ts          # Utility functions
```

## Basic Usage

```typescript
import math from 'tinycas';

// Parse an expression
const expr = math('2x + 3x');

// Get string representation
console.log(expr.string); // "2x+3x"

// Get LaTeX
console.log(expr.latex); // "2 x + 3 x"

// Evaluate
const value = expr.eval({ x: 5 });
console.log(value); // 25

// Simplify
const simplified = expr.simplify();
console.log(simplified.string); // "5x"
```

## Expression Types

### Type Constants

```typescript
// From types.ts
export const TYPE_NUMBER = 'number';
export const TYPE_SYMBOL = 'symbol';
export const TYPE_IDENTIFIER = 'identifier';
export const TYPE_HOLE = '?';
export const TYPE_BOOLEAN = 'boolean';
export const TYPE_TEMPLATE = 'template';

// Operations
export const TYPE_SUM = '+';
export const TYPE_DIFFERENCE = '-';
export const TYPE_PRODUCT = '*';
export const TYPE_PRODUCT_IMPLICIT = '';
export const TYPE_PRODUCT_POINT = '.';
export const TYPE_DIVISION = ':';
export const TYPE_QUOTIENT = '/';
export const TYPE_POWER = '^';
export const TYPE_OPPOSITE = 'opposite';
export const TYPE_POSITIVE = 'positive';

// Functions
export const TYPE_RADICAL = 'sqrt';
export const TYPE_COS = 'cos';
export const TYPE_SIN = 'sin';
export const TYPE_TAN = 'tan';
export const TYPE_LN = 'ln';
export const TYPE_LOG = 'log';
export const TYPE_EXP = 'exp';
export const TYPE_FLOOR = 'floor';
export const TYPE_GCD = 'pgcd';
export const TYPE_MOD = 'mod';
export const TYPE_ABS = 'abs';

// Relations
export const TYPE_EQUALITY = '=';
export const TYPE_UNEQUALITY = '!=';
export const TYPE_INEQUALITY_LESS = '<';
export const TYPE_INEQUALITY_LESSOREQUAL = '<=';
export const TYPE_INEQUALITY_MORE = '>';
export const TYPE_INEQUALITY_MOREOREQUAL = '>=';

// Other
export const TYPE_BRACKET = '()';
export const TYPE_PERCENTAGE = '%';
export const TYPE_SEGMENT_LENGTH = 'segment';
export const TYPE_UNIT = 'unit';
export const TYPE_ERROR = 'error';
export const TYPE_LIMIT = 'limit';
```

### Node Interface

```typescript
interface Node {
	type: string;
	string: string;
	latex: string;

	// Tree access
	children: Node[];
	first: Node;
	last: Node;

	// Type checking
	isNumber(): boolean;
	isSymbol(): boolean;
	isSum(): boolean;
	isProduct(): boolean;
	isQuotient(): boolean;
	isPower(): boolean;
	isOpposite(): boolean;
	isZero(): boolean;
	isOne(): boolean;
	isMinusOne(): boolean;
	isInt(): boolean;
	isPositive(): boolean;
	isNegative(): boolean;

	// Operations
	add(other: Node): Node;
	sub(other: Node): Node;
	mult(other: Node): Node;
	div(other: Node): Node;
	pow(other: Node): Node;
	opposite(): Node;
	inverse(): Node;

	// Comparison
	equals(other: Node): boolean;
	compareTo(other: Node): -1 | 0 | 1;
	isLowerThan(other: Node): boolean;
	isGreaterThan(other: Node): boolean;

	// Normal form
	normal: Normal;

	// Evaluation
	eval(bindings?: Record<string, number>): number;

	// Output
	toString(options?: ToStringArg): string;
	toLatex(options?: ToLatexArg): string;
	toTexmacs(options?: ToTexmacsArg): string;
}
```

## Node Factory

```typescript
import {
	number,
	symbol,
	sum,
	difference,
	product,
	quotient,
	power,
	opposite,
	bracket,
	radical,
	cos,
	sin,
	tan,
	ln,
	log,
	exp
} from 'tinycas/node';

// Create nodes
const x = symbol('x');
const two = number(2);
const xSquared = power(x, two);
const expr = sum(xSquared, x);
```

## Lexer

### Token Types

```typescript
const TokenTypes = {
	NUMBER: 'NUMBER',
	SYMBOL: 'SYMBOL',
	OPERATOR: 'OPERATOR',
	FUNCTION: 'FUNCTION',
	LPAREN: 'LPAREN',
	RPAREN: 'RPAREN',
	LBRACE: 'LBRACE',
	RBRACE: 'RBRACE',
	COMMA: 'COMMA',
	SEMICOLON: 'SEMICOLON',
	EQUALS: 'EQUALS',
	LESS: 'LESS',
	GREATER: 'GREATER',
	CARET: 'CARET',
	UNDERSCORE: 'UNDERSCORE',
	PERCENT: 'PERCENT',
	QUESTION: 'QUESTION',
	EOF: 'EOF'
};
```

### Tokenization

```typescript
function lexer(input: string): Token[] {
	const tokens: Token[] = [];
	let pos = 0;

	while (pos < input.length) {
		// Skip whitespace
		if (/\s/.test(input[pos])) {
			pos++;
			continue;
		}

		// Numbers
		if (/\d/.test(input[pos])) {
			let num = '';
			while (/[\d.]/.test(input[pos])) {
				num += input[pos++];
			}
			tokens.push({ type: 'NUMBER', value: num });
			continue;
		}

		// Symbols (letters)
		if (/[a-zA-Z]/.test(input[pos])) {
			let sym = '';
			while (/[a-zA-Z\d_]/.test(input[pos])) {
				sym += input[pos++];
			}
			tokens.push({ type: 'SYMBOL', value: sym });
			continue;
		}

		// Operators
		tokens.push({ type: 'OPERATOR', value: input[pos++] });
	}

	tokens.push({ type: 'EOF' });
	return tokens;
}
```

## Parser (Pratt)

### Precedence Table

```typescript
const precedence: Record<string, number> = {
	'=': 10,
	'!=': 10,
	'<': 10,
	'<=': 10,
	'>': 10,
	'>=': 10,
	'+': 20,
	'-': 20,
	'*': 30,
	':': 30,
	'/': 30,
	'^': 40
};
```

### Parser Structure

```typescript
class Parser {
	tokens: Token[];
	pos: number;

	parse(): Node {
		return this.parseExpression(0);
	}

	parseExpression(minPrecedence: number): Node {
		let left = this.parsePrefix();

		while (this.precedence() > minPrecedence) {
			left = this.parseInfix(left);
		}

		return left;
	}

	parsePrefix(): Node {
		const token = this.consume();

		switch (token.type) {
			case 'NUMBER':
				return number(parseFloat(token.value));

			case 'SYMBOL':
				if (this.peek().type === 'LPAREN') {
					return this.parseFunction(token.value);
				}
				return symbol(token.value);

			case 'OPERATOR':
				if (token.value === '-') {
					return opposite(this.parseExpression(35));
				}
				if (token.value === '+') {
					return this.parseExpression(35);
				}
				break;

			case 'LPAREN':
				const inner = this.parseExpression(0);
				this.expect('RPAREN');
				return bracket(inner);
		}
	}

	parseInfix(left: Node): Node {
		const op = this.consume().value;
		const prec = precedence[op];

		switch (op) {
			case '+':
				return sum(left, this.parseExpression(prec));
			case '-':
				return difference(left, this.parseExpression(prec));
			case '*':
				return product(left, this.parseExpression(prec));
			case '/':
				return quotient(left, this.parseExpression(prec));
			case '^':
				return power(left, this.parseExpression(prec - 1)); // Right associative
			// ...
		}
	}
}
```

## Normal Form

### Structure

```typescript
interface Normal {
	n: Nlist; // Numerator polynomial
	d: Nlist; // Denominator polynomial
	unit?: Unit; // Optional unit
}

// Nlist is a sorted list of [coefficient, base] pairs
type Nlist = Array<[Normal | Node, Node | Nlist]>;
```

### Normalization Algorithm

```typescript
function computeNormal(node: Node): Normal {
	switch (node.type) {
		case TYPE_NUMBER:
			return { n: [[node, one]], d: oneList };

		case TYPE_SYMBOL:
			return { n: [[one, node]], d: oneList };

		case TYPE_SUM:
			const leftN = node.first.normal;
			const rightN = node.last.normal;
			return addNormals(leftN, rightN);

		case TYPE_PRODUCT:
			return multNormals(node.first.normal, node.last.normal);

		case TYPE_QUOTIENT:
			return divNormals(node.first.normal, node.last.normal);

		case TYPE_POWER:
			return powNormal(node.first.normal, node.last);

		// ... other cases
	}
}
```

## Comparison and Ordering

```typescript
// compare.ts - defines canonical ordering

const priorityList = [
	TYPE_NUMBER,
	TYPE_SYMBOL,
	TYPE_IDENTIFIER,
	TYPE_HOLE,
	TYPE_BOOLEAN,
	TYPE_TEMPLATE,
	TYPE_POSITIVE,
	TYPE_OPPOSITE,
	TYPE_PERCENTAGE,
	TYPE_SEGMENT_LENGTH,
	TYPE_BRACKET,
	// Functions...
	TYPE_COS,
	TYPE_SIN,
	TYPE_TAN,
	TYPE_LN,
	TYPE_LOG,
	TYPE_EXP,
	TYPE_RADICAL,
	TYPE_FLOOR,
	TYPE_GCD,
	TYPE_MOD,
	// Operations...
	TYPE_SUM,
	TYPE_DIFFERENCE,
	TYPE_PRODUCT,
	TYPE_PRODUCT_IMPLICIT,
	TYPE_PRODUCT_POINT,
	TYPE_DIVISION,
	TYPE_QUOTIENT,
	TYPE_POWER,
	// Relations...
	TYPE_EQUALITY,
	TYPE_UNEQUALITY,
	TYPE_INEQUALITY_LESS,
	TYPE_INEQUALITY_LESSOREQUAL,
	TYPE_INEQUALITY_MORE,
	TYPE_INEQUALITY_MOREOREQUAL,
	TYPE_ERROR
];

function compare(node1: Node, node2: Node): -1 | 0 | 1 {
	if (node1.type === node2.type) {
		// Same type: compare by value/children
		if (node1.isNumber()) {
			return node1.value < node2.value ? -1 : node1.value > node2.value ? 1 : 0;
		}
		// ... compare children recursively
	}

	// Different types: use priority list
	return priorityList.indexOf(node1.type) < priorityList.indexOf(node2.type) ? -1 : 1;
}
```

## Evaluation

```typescript
// evaluate.ts

function evaluate(node: Node, bindings: Record<string, number> = {}): number {
	switch (node.type) {
		case TYPE_NUMBER:
			return node.value.toNumber();

		case TYPE_SYMBOL:
			if (node.symbol in bindings) {
				return bindings[node.symbol];
			}
			if (node.symbol === 'pi') return Math.PI;
			if (node.symbol === 'e') return Math.E;
			throw new Error(`Undefined symbol: ${node.symbol}`);

		case TYPE_SUM:
			return evaluate(node.first, bindings) + evaluate(node.last, bindings);

		case TYPE_DIFFERENCE:
			return evaluate(node.first, bindings) - evaluate(node.last, bindings);

		case TYPE_PRODUCT:
		case TYPE_PRODUCT_IMPLICIT:
		case TYPE_PRODUCT_POINT:
			return evaluate(node.first, bindings) * evaluate(node.last, bindings);

		case TYPE_QUOTIENT:
		case TYPE_DIVISION:
			return evaluate(node.first, bindings) / evaluate(node.last, bindings);

		case TYPE_POWER:
			return Math.pow(evaluate(node.first, bindings), evaluate(node.last, bindings));

		case TYPE_OPPOSITE:
			return -evaluate(node.first, bindings);

		case TYPE_RADICAL:
			return Math.sqrt(evaluate(node.first, bindings));

		case TYPE_SIN:
			return Math.sin(evaluate(node.first, bindings));

		case TYPE_COS:
			return Math.cos(evaluate(node.first, bindings));

		// ... other cases
	}
}
```

## Transformations

```typescript
// transform.ts

function simplify(node: Node): Node {
	// Apply simplification rules
	return applyRules(node, simplificationRules);
}

function expand(node: Node): Node {
	// Expand products: (a+b)(c+d) → ac + ad + bc + bd
	return applyRules(node, expansionRules);
}

function factor(node: Node): Node {
	// Factor expressions
	return applyRules(node, factorizationRules);
}

function substitute(node: Node, bindings: Record<string, Node>): Node {
	if (node.isSymbol() && node.symbol in bindings) {
		return bindings[node.symbol];
	}
	// Recursively substitute in children
	return node.map((child) => substitute(child, bindings));
}
```

## Units

```typescript
// unit.ts

interface Unit {
	u: Node; // Unit expression
	_normal: Normal; // Normal form for conversion

	mult(other: Unit): Unit;
	div(other: Unit): Unit;
	pow(n: Node): Unit;
	isConvertibleTo(other: Unit): boolean;
	getCoefTo(other: Unit): Node;
}

// Base unit table
const baseUnits: Record<string, [number, string]> = {
	km: [1000, 'm'],
	hm: [100, 'm'],
	dam: [10, 'm'],
	m: [1, 'm'],
	dm: [0.1, 'm'],
	cm: [0.01, 'm'],
	mm: [0.001, 'm']
	// ... volumes, masses, time, etc.
};

function unit(u: string | Node, normal?: Normal): Unit {
	if (typeof u === 'string') {
		const [coef, base] = baseUnits[u];
		normal = number(coef).mult(symbol(base)).normal;
	}
	// Create unit with conversion factor
}
```

## Fraction Arithmetic

```typescript
// fraction.ts - using Decimal.js for precision

interface Fraction {
	n: Decimal; // Numerator
	d: Decimal; // Denominator
	s: 1 | -1; // Sign

	add(f: Fraction): Fraction;
	sub(f: Fraction): Fraction;
	mult(f: Fraction): Fraction;
	div(f: Fraction): Fraction;
	reduce(): Fraction;
	isLowerThan(f: Fraction): boolean;
	isGreaterThan(f: Fraction): boolean;
}

function createFraction({ n, d, s }: CreateFractionArg): Fraction {
	return Object.assign(Object.create(pFraction), { n, d, s });
}

function fraction(arg: string | number | Decimal): Fraction {
	if (typeof arg === 'number' || Decimal.isDecimal(arg)) {
		const fDecimal = new Decimal(arg).toFraction();
		return createFraction({
			n: fDecimal[0].abs(),
			d: fDecimal[1],
			s: fDecimal[0].s
		}).reduce();
	}
	// Parse string fraction
}
```

## Output Generation

```typescript
// output.ts

function text(node: Node, options: ToStringArg): string {
	switch (node.type) {
		case TYPE_NUMBER:
			let s = node.input;
			if (options.comma) s = s.replace('.', ',');
			return s;

		case TYPE_SYMBOL:
			return node.symbol;

		case TYPE_SUM:
			return node.children.map((c) => c.toString(options)).join('+');

		case TYPE_QUOTIENT:
			return node.first.toString(options) + '/' + node.last.toString(options);

		// ... other cases
	}
}

function latex(node: Node, options: ToLatexArg): string {
	switch (node.type) {
		case TYPE_QUOTIENT:
			return `\\dfrac{${node.first.toLatex(options)}}{${node.last.toLatex(options)}}`;

		case TYPE_RADICAL:
			return `\\sqrt{${node.first.toLatex(options)}}`;

		case TYPE_POWER:
			return `${node.first.toLatex(options)}^{${node.last.toLatex(options)}}`;

		// ... other cases
	}
}
```

## Usage in UbuMaths

TinyCAS is primarily used via the `math()` function:

```typescript
import math from 'tinycas';

// In question generation
const expression = math('$e{2;9}x + $e{1;5}');
const generated = expression.generate(); // Random values

// In answer validation
const expected = math('5x');
const student = math(studentAnswer);
if (expected.equals(student)) {
	// Correct!
}

// In calculations
const result = math('2/3 + 1/4').eval();
```

## Migration to MathAST

New code should prefer MathAST for:

- Better TypeScript support
- Immutable AST
- More modular architecture
- Comprehensive testing
- Modern API design

TinyCAS remains for:

- Legacy code compatibility
- Template expressions (`$e`, `$l`, etc.)
- Specific question generation features
