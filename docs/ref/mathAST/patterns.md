# Pattern Matching & Rules

Declarative pattern matching and rule-based expression transformation.

## Overview

The pattern matching system enables:

- **Structure verification**: Check if expressions match specific forms
- **Subexpression extraction**: Capture parts using wildcards
- **Rule transformations**: Define rewrite rules like `x + 0 -> x`
- **Simplification engines**: Apply rules recursively

## Quick Start

```typescript
import { P, match, matches, applyRules, arithmeticRules } from '$lib/mathAST/pattern';
import { parseLatex } from '$lib/mathAST';

// Check if expression matches pattern
const expr = parseLatex('2x + 5');
const isLinear = matches(P.add(P.mul(P._('a'), P._('x')), P._('b')), expr);
// true

// Extract bindings
const result = match(P.add(P._('left'), P._('right')), expr);
if (result.success) {
	result.bindings.get('left'); // multiplication node
	result.bindings.get('right'); // number(5)
}

// Apply simplification rules
const toSimplify = parseLatex('(x + 0) * 1');
const simplified = applyRules(arithmeticRules, toSimplify);
// Returns: x
```

## Pattern Construction

### The P Namespace

All patterns are built using the `P` namespace:

```typescript
import { P } from '$lib/mathAST/pattern';

// Wildcard (matches anything)
P._('x');

// Wildcard with constraint
P._('n', P.isNumber());

// Literal number
P.num(0);
P.num(1);
P.num(42);

// Literal variable
P.var('x');
P.var('alpha');
```

### Wildcards

Wildcards match any expression and bind it to a name:

```typescript
// Match any expression, bind to 'x'
P._('x');

// Match with constraint
P._('n', P.isNumber()); // Must be a number
P._('v', P.isVariable()); // Must be a variable
P._('k', P.isInteger()); // Must be an integer
P._('p', P.isPositive()); // Must be positive
P._('z', P.isNonzero()); // Must be nonzero
P._('c', P.isFreeOf('x')); // Must not contain x
```

### Structural Patterns

```typescript
// Binary operations
P.add(left, right); // Addition
P.sub(left, right); // Subtraction
P.mul(left, right); // Multiplication
P.div(num, den); // Division
P.pow(base, exp); // Power

// Unary operations
P.neg(operand); // Negation (-x)
P.pos(operand); // Positive (+x)
P.paren(content); // Parentheses

// Functions
P.func('sin', [arg]);
P.func('log', [arg, base]);

// Subscript
P.subscript(base, sub);

// Relations
P.rel('=', left, right);
P.rel('<', left, right);
P.rel('any', left, right); // Any relation type
```

### Combined Examples

```typescript
// Pattern: ax^2 + bx + c
const quadratic = P.add(
	P.add(P.mul(P._('a'), P.pow(P._('x'), P.num(2))), P.mul(P._('b'), P._('x'))),
	P._('c')
);

// Pattern: sin^2(x) + cos^2(x)
const pythagorean = P.add(
	P.pow(P.func('sin', [P._('x')]), P.num(2)),
	P.pow(P.func('cos', [P._('x')]), P.num(2))
);

// Pattern: x/x (self-division, but x != 0)
const selfDiv = P.div(P._('x', P.isNonzero()), P._('x'));
```

## Pattern Strings

Alternative syntax using parseable strings:

```typescript
import { parsePattern, P } from '$lib/mathAST/pattern';

// These are equivalent:
const p1 = parsePattern('_x + 0');
const p2 = P.add(P._('x'), P.num(0));

// Also available as P.parse()
const p3 = P.parse('_x + 0');

// With constraints
parsePattern('_n:number * _x'); // n must be a number
parsePattern('_k:integer'); // k must be an integer
parsePattern('_p:positive'); // p must be positive
parsePattern('_z:nonzero'); // z must be nonzero
```

### Pattern String Syntax

| Syntax                  | Description                           |
| ----------------------- | ------------------------------------- |
| `_x`                    | Wildcard named 'x'                    |
| `_x:number`             | Wildcard constrained to numbers       |
| `_x:integer`            | Wildcard constrained to integers      |
| `_x:positive`           | Wildcard constrained to positive      |
| `_x:negative`           | Wildcard constrained to negative      |
| `_x:nonzero`            | Wildcard constrained to nonzero       |
| `_x:variable`           | Wildcard constrained to variables     |
| `_x:integerType`        | Wildcard with integer type inference  |
| `_x:rationalType`       | Wildcard with rational type inference |
| `_x:realType`           | Wildcard with real type inference     |
| `_x:transcendentalType` | Wildcard with transcendental type     |
| `5`, `3.14`             | Literal numbers                       |
| `+`, `-`, `*`, `/`      | Operators                             |
| `^`                     | Power                                 |
| `sin(_x)`               | Function                              |
| `(_x + _y)`             | Grouping                              |

## Constraints

### Type Constraints

```typescript
P.isType('number'); // Only numbers
P.isType('variable'); // Only variables
P.isType('number', 'variable'); // Numbers OR variables

P.isNumber(); // Shorthand
P.isVariable(); // Shorthand
```

### Value Constraints

```typescript
P.isPositive(); // Positive values
P.isNegative(); // Negative values
P.isNonzero(); // Nonzero values
P.isInteger(); // Integer numbers
```

### Structural Constraints

```typescript
P.isFreeOf('x'); // Doesn't contain x
P.isFreeOf('x', 'y'); // Doesn't contain x or y

// Custom constraint
P.custom((node) => node.type === 'number' && parseFloat(node.value) > 10, 'greater than 10');
```

### Numeric Type Constraints

Match expressions by their inferred numeric type:

```typescript
// Integer type (5, -3, but not 5.5 or 1/2)
P._('n', P.isIntegerType());

// Rational type (includes integers: 5, 1/2, 3/4)
P._('q', P.isRationalType());

// Algebraic type (includes rational and √2, ∛5)
P._('a', P.isAlgebraicType());

// Real type (includes all above + π, e)
P._('r', P.isRealType());

// Transcendental type (π, e, sin(1), ln(2))
P._('t', P.isTranscendentalType());

// Complex type (includes all)
P._('z', P.isComplexType());

// With strict mode (exact type, not subtypes)
P._('n', P.isIntegerType(true)); // Only integer, not "rational that happens to be integer"
```

These constraints use the numeric type inference system. See [Numeric Types](./numtype.md) for details.

### Logical Constraints

```typescript
// AND: all must match
P.and(P.isInteger(), P.isPositive());

// OR: any must match
P.or(P.isNumber(), P.isVariable());

// NOT: must not match
P.not(P.isNumber());
```

## Matching Functions

### `match(pattern, node)`

Returns detailed result with bindings:

```typescript
import { match, P } from '$lib/mathAST/pattern';

const pattern = P.add(P._('x'), P._('y'));
const node = parseLatex('a + 5');

const result = match(pattern, node);

if (result.success) {
	result.bindings.get('x'); // variable('a')
	result.bindings.get('y'); // number('5')
} else {
	console.log('No match');
}
```

### `matches(pattern, node)`

Returns boolean only:

```typescript
import { matches, P } from '$lib/mathAST/pattern';

if (matches(P.add(P._('x'), P.num(0)), node)) {
	// Node is of form: something + 0
}
```

### `tryMatch(pattern, node)`

Returns bindings or undefined:

```typescript
import { tryMatch, P } from '$lib/mathAST/pattern';

const bindings = tryMatch(P.add(P._('a'), P._('b')), node);
if (bindings) {
	const a = bindings.get('a');
	const b = bindings.get('b');
}
```

## Same-Value Matching

Wildcards with the same name must match identical expressions:

```typescript
// Pattern: x + x (same value twice)
const pattern = P.add(P._('x'), P._('x'));

matches(pattern, parseLatex('a + a')); // true
matches(pattern, parseLatex('a + b')); // false
matches(pattern, parseLatex('2x + 2x')); // true

// Pattern: x / x (self-division)
const selfDiv = P.div(P._('x'), P._('x'));
matches(selfDiv, parseLatex('(a+1)/(a+1)')); // true
```

## Commutative Matching

Addition and multiplication automatically try both orders:

```typescript
// Pattern: 0 + x
const pattern = P.add(P.num(0), P._('x'));

// Matches both orders
matches(pattern, parseLatex('0 + a')); // true (direct)
matches(pattern, parseLatex('a + 0')); // true (swapped)
```

Subtraction and division do NOT swap (not commutative):

```typescript
const pattern = P.sub(P._('x'), P.num(0));
matches(pattern, parseLatex('a - 0')); // true
matches(pattern, parseLatex('0 - a')); // false
```

## Rule System

### Creating Rules

```typescript
import { P, createRule } from '$lib/mathAST/pattern';

// Basic rule: pattern -> replacement
const additiveIdentity = P.rule(
	P.add(P._('x'), P.num(0)), // Pattern
	P._('x'), // Replacement
	{ name: 'additive-identity' }
);

// Using createRule function
const rule = createRule(P.add(P._('x'), P.num(0)), P._('x'), { name: 'additive-identity' });
```

### Rule Options

```typescript
interface RuleOptions {
	name?: string; // Rule name for debugging
	priority?: number; // Higher = applied first
	condition?: (bindings: Map<string, MathNode>) => boolean;
}

// Rule with condition
const selfDivision = P.rule(P.div(P._('x'), P._('x')), P.num(1), {
	name: 'self-division',
	condition: (bindings) => {
		const x = bindings.get('x');
		// Don't apply if x is 0
		return !(x?.type === 'number' && x.value === '0');
	}
});

// Rule with priority
const multiplyZero = P.rule(
	P.mul(P.num(0), P._('x')),
	P.num(0),
	{ name: 'multiply-zero', priority: 10 } // High priority
);
```

### Function Replacement

```typescript
// Replace with computed result
const zeroMinus = P.rule(
	P.sub(P.num(0), P._('x')),
	(bindings) => MathAST.opposite(bindings.get('x')!),
	{ name: 'zero-minus' }
);
// 0 - x  ->  -x
```

## Applying Rules

### `applyRule(rule, node)`

Applies rule to top-level only:

```typescript
import { applyRule } from '$lib/mathAST/pattern';

const rule = P.rule(P.add(P._('x'), P.num(0)), P._('x'));
const node = parseLatex('a + 0');

const result = applyRule(rule, node);
// Returns: variable('a')
```

### `applyRuleDeep(rule, node)`

Applies rule recursively (bottom-up):

```typescript
import { applyRuleDeep } from '$lib/mathAST/pattern';

const rule = P.rule(P.add(P._('x'), P.num(0)), P._('x'));
const node = parseLatex('(a + 0) + (b + 0)');

const result = applyRuleDeep(rule, node);
// Returns: a + b (both inner additions simplified)
```

### `applyRules(rules, node, maxIterations?)`

Applies multiple rules until no changes:

```typescript
import { applyRules } from '$lib/mathAST/pattern';

const rules = [
	P.rule(P.add(P._('x'), P.num(0)), P._('x')),
	P.rule(P.mul(P._('x'), P.num(1)), P._('x')),
	P.rule(P.pow(P._('x'), P.num(1)), P._('x'))
];

const node = parseLatex('(x + 0)^1 * 1');
const result = applyRules(rules, node);
// Returns: x

// With iteration limit (prevents infinite loops)
applyRules(rules, node, 100);
```

## Built-in Rule Sets

### `arithmeticRules`

Basic identity and zero rules:

```typescript
import { arithmeticRules } from '$lib/mathAST/pattern';

// Included rules:
// - 0 + x -> x (additive identity, left)
// - x + 0 -> x (additive identity, right)
// - x - 0 -> x (subtractive identity)
// - 0 - x -> -x (zero minus)
// - x - x -> 0 (self subtraction)
// - 1 * x -> x (multiplicative identity, left)
// - x * 1 -> x (multiplicative identity, right)
// - 0 * x -> 0 (multiplicative zero, left)
// - x * 0 -> 0 (multiplicative zero, right)
// - x / 1 -> x (division by one)
// - 0 / x -> 0 (zero divided, x != 0)
// - x / x -> 1 (self division, x != 0)
// - --x -> x (double negation)
// - +x -> x (positive identity)

applyRules(arithmeticRules, parseLatex('(a + 0) * 1 + 0'));
// Returns: a
```

### `powerRules`

Exponent simplifications:

```typescript
import { powerRules } from '$lib/mathAST/pattern';

// Included rules:
// - x^1 -> x (power of one)
// - x^0 -> 1 (power of zero, x != 0)
// - 1^x -> 1 (one to any power)
// - 0^x -> 0 (zero to positive power)

applyRules(powerRules, parseLatex('x^1 * y^0'));
// Returns: x * 1
```

### `allRules`

Combined set of all built-in rules:

```typescript
import { allRules } from '$lib/mathAST/pattern';

applyRules(allRules, parseLatex('(x + 0)^1 * 1 + 0'));
// Returns: x
```

## The Exp Class

Fluent wrapper for common operations:

```typescript
import { Exp } from '$lib/mathAST';

// Create from LaTeX or custom
const expr = Exp.parse('x^2 + 2x + 1');

// Match and extract
if (expr.matches(P.add(P._('a'), P._('b')))) {
	const bindings = expr.extract(P.add(P._('a'), P._('b')));
	// bindings.get('a'), bindings.get('b')
}

// Simplify with rules
const simplified = expr.simplifyWith(allRules);
console.log(simplified.latex);

// Chain operations
Exp.parse('(x + 0) * 1').simplifyWith(arithmeticRules).toLatex();
// "x"
```

## Instantiation

Create expressions from patterns and bindings:

```typescript
import { instantiate } from '$lib/mathAST/pattern';

const pattern = P.add(P._('x'), P._('y'));
const bindings = new Map([
	['x', MathAST.number('5')],
	['y', MathAST.variable('a')]
]);

const expr = instantiate(pattern, bindings);
// Returns: add(number('5'), variable('a'))
```

## Custom Rules Example

```typescript
import { P, applyRules } from '$lib/mathAST/pattern';

// Custom rules for trig identities
const trigRules = [
	// sin^2(x) + cos^2(x) -> 1
	P.rule(
		P.add(P.pow(P.func('sin', [P._('x')]), P.num(2)), P.pow(P.func('cos', [P._('x')]), P.num(2))),
		P.num(1),
		{ name: 'pythagorean-identity' }
	),

	// tan(x) -> sin(x)/cos(x)
	P.rule(P.func('tan', [P._('x')]), P.div(P.func('sin', [P._('x')]), P.func('cos', [P._('x')])), {
		name: 'tan-definition'
	}),

	// Double angle: sin(2x) -> 2*sin(x)*cos(x)
	P.rule(
		P.func('sin', [P.mul(P.num(2), P._('x'))]),
		P.mul(P.num(2), P.mul(P.func('sin', [P._('x')]), P.func('cos', [P._('x')]))),
		{ name: 'sin-double-angle' }
	)
];

// Apply custom rules
const expr = parseLatex('\\sin^2(\\theta) + \\cos^2(\\theta)');
const result = applyRules(trigRules, expr);
// Returns: number('1')
```

## Pattern vs Node Types

Patterns are NOT MathNodes. They're templates:

```typescript
// This is a Pattern
const pattern = P.add(P._('x'), P.num(0));

// This is a MathNode
const node = MathAST.add(MathAST.variable('x'), MathAST.number('0'));

// Can't mix them
// pattern.left // Error: patterns don't have .left
// match(node, otherNode) // Error: first arg must be Pattern
```

## See Also

- [Numeric Types](./numtype.md) - Type inference for numeric constraints
- [Evaluation](./evaluation.md) - Numeric evaluation
- [Normalization](./normalization.md) - Canonical forms
- [Source README](../../../src/lib/mathAST/pattern/README.md) - Additional examples
