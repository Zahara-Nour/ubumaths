# Pattern Matching System

Advanced pattern matching and rule-based transformation system for MathAST expressions.

---

## Overview

The pattern matching system provides a declarative way to match, transform, and simplify mathematical expressions. It enables you to:

- **Verify expression structure** - Check if an expression matches a specific form (e.g., `2*x + 5`)
- **Extract subexpressions** - Capture parts of expressions using wildcards (e.g., extract coefficients)
- **Create transformation rules** - Define rewrite rules like `x + 0 → x` or `x^1 → x`
- **Build simplification engines** - Apply rules recursively to simplify complex expressions

### Key Concepts

**Patterns** describe what to match against. They are NOT MathNodes - they're templates that specify structural requirements and constraints.

**Wildcards** (letters like `x`, `n`) capture matching subexpressions and bind them to names for later use. Letters are wildcards by default in pattern syntax.

**Rules** combine a pattern with a replacement, defining how to transform matching expressions.

---

## Quick Start

```typescript
import { P, parsePattern, match, applyRules } from '$lib/mathAST/pattern';
import { Exp } from '$lib/mathAST';

// Check if expression matches form: 2*x + y (using pattern strings)
const expr = Exp.parse('2a + b');
const isMatch = expr.matches(parsePattern('2 * x + y'));
// true - binds x→a, y→b (letters are wildcards by default)

// Extract bindings from pattern match
const bindings = expr.extract(parsePattern('left + right'));
// bindings.get('left') => multiplication node (2*a)
// bindings.get('right') => variable node (b)

// Create and apply a simplification rule (using builder API)
const rule = P.rule(
	P.add(P._('x'), P.num(0)), // Pattern: x + 0
	P._('x'), // Replacement: x
	{ name: 'additive-identity' }
);

const simplified = Exp.parse('(a + 0) * 1').simplifyWith([rule]);
// simplified.latex => 'a \\cdot 1'
```

---

## Pattern Strings

Pattern strings provide a concise, readable syntax for creating patterns. They are an alternative to the builder API (`P` namespace) and are particularly useful for simple to moderately complex patterns.

### Overview

Instead of building patterns programmatically with the `P` namespace, you can write them as strings using familiar mathematical notation:

```typescript
// Pattern string syntax (concise) - letters are wildcards by default
parsePattern('x + 0');

// Equivalent builder API (verbose)
P.add(P._('x'), P.num(0));

// Or use the P.parse() convenience alias
P.parse('x + 0');
```

Both syntaxes produce identical patterns and can be used interchangeably based on your preference and use case.

### Wildcard Syntax

Letters are wildcards by default in pattern strings. Use colon syntax (`name:type`) for type constraints:

| Syntax       | Equivalent Builder         | Description                |
| ------------ | -------------------------- | -------------------------- |
| `x`          | `P._('x')`                 | Wildcard, matches anything |
| `x:number`   | `P._('x', P.isNumber())`   | Must match a number        |
| `x:integer`  | `P._('x', P.isInteger())`  | Must match an integer      |
| `x:positive` | `P._('x', P.isPositive())` | Must be positive           |
| `x:negative` | `P._('x', P.isNegative())` | Must be negative           |
| `x:nonzero`  | `P._('x', P.isNonzero())`  | Must be non-zero           |
| `x:variable` | `P._('x', P.isVariable())` | Must match a variable      |
| `$x`         | `P.var('x')`               | Literal variable (rare)    |
| `__x`        | `P.__('x')`                | Sequence (1+ elements)     |
| `___x`       | `P.___('x')`               | Optional sequence (0+)     |

### Operators

Pattern strings support standard mathematical operators with correct precedence:

| Operator     | Pattern Type   | Precedence  | Associativity |
| ------------ | -------------- | ----------- | ------------- |
| `+`          | Addition       | Low (10)    | Left          |
| `-`          | Subtraction    | Low (10)    | Left          |
| `*`          | Multiplication | Medium (20) | Left          |
| `/`          | Division       | Medium (25) | Left          |
| `^`          | Power          | High (40)   | Right         |
| `-x` (unary) | Opposite       | High (30)   | -             |

Parentheses can be used to override precedence: `(x + y) * z`

### Functions

All standard mathematical functions are supported:

- **Trigonometric**: `sin`, `cos`, `tan`, `arcsin`, `arccos`, `arctan`
- **Logarithmic**: `ln`, `log`, `exp`
- **Other**: `sqrt`, `abs`, `floor`, `ceil`, `round`, `sign`

Functions use standard notation: `sin(x)`, `sqrt(x^2 + y^2)`, `ln(x:positive)`

### Examples

#### Simple Identity Patterns

```typescript
// Additive identity
parsePattern('x + 0'); // matches: x + 0, a + 0, (a+b) + 0

// Multiplicative identity
parsePattern('x * 1'); // matches: x * 1, 2 * 1, (a/b) * 1

// Subtractive identity
parsePattern('x - 0'); // matches: x - 0, 5 - 0
```

#### Patterns with Constraints

```typescript
// Coefficient must be a number
parsePattern('n:number * x'); // matches: 2*x, 3.5*y, -1*z

// Denominator cannot be zero
parsePattern('x / d:nonzero'); // matches: a/b, 5/3, x/y (but ensures d≠0)

// Integer coefficient
parsePattern('k:integer * x'); // matches: 2*x, -5*y (not 2.5*x)
```

#### Complex Mathematical Patterns

```typescript
// Quadratic form
parsePattern('a * x^2 + b * x + c');
// matches: x^2 + 2x + 1, 2x^2 - 3x + 5

// Pythagorean identity
parsePattern('sin(x)^2 + cos(x)^2');
// matches: sin(x)^2 + cos(x)^2, sin(2a)^2 + cos(2a)^2

// Difference of squares
parsePattern('a^2 - b^2');
// matches: x^2 - y^2, (a+b)^2 - c^2

// Logarithm properties
parsePattern('ln(x) + ln(y)');
// matches: ln(a) + ln(b), ln(x+1) + ln(x-1)
```

#### Same-Value Matching

Wildcards with the same name must match identical expressions:

```typescript
// Doubling pattern (x + x)
parsePattern('x + x');
// matches: a + a, 2b + 2b
// does NOT match: a + b, x + y

// Self-division (x / x)
parsePattern('x / x');
// matches: a / a, (x+1) / (x+1)
// does NOT match: a / b
```

### Equivalence with Builder API

Pattern strings and the builder API are completely equivalent - use whichever is clearer for your use case:

```typescript
// These produce identical patterns:
const p1 = parsePattern('a * x^2 + b * x + c');
const p2 = P.add(
	P.add(P.mul(P._('a'), P.pow(P._('x'), P.num(2))), P.mul(P._('b'), P._('x'))),
	P._('c')
);

// Both match the same expressions
const expr = Exp.parse('2x^2 + 3x + 1');
expr.matches(p1); // true
expr.matches(p2); // true
```

**When to use pattern strings:**

- Simple to moderately complex patterns
- When readability is more important than programmatic construction
- When writing many similar patterns
- For teaching or documentation examples

**When to use builder API:**

- Very complex patterns with nested structures
- When building patterns programmatically
- When you need constraint combinators (`P.and()`, `P.or()`, `P.not()`)
- When you need custom constraints (`P.custom()`)

### Import

```typescript
import { parsePattern, P } from '$lib/mathAST/pattern';

// Using parsePattern directly
const pattern1 = parsePattern('x + 0');

// Using P.parse() alias
const pattern2 = P.parse('x + 0');

// Both are equivalent
```

---

## Pattern Builder API (`P` namespace)

All pattern construction uses the `P` namespace, which provides a fluent API for building patterns.

### Wildcards

Wildcards match any expression that satisfies optional constraints.

```typescript
// Match any expression, bind to name
P._('x'); // Any expression
P._('n', P.isNumber()); // Any number
P._('k', P.and(P.isInteger(), P.isPositive())); // Positive integer
P._('c', P.isFreeOf('x')); // Expression without x
```

### Literals

Literals match exact values.

```typescript
P.num(0); // Exactly the number 0
P.num(1); // Exactly the number 1
P.var('x'); // Exactly the variable x
P.lit(node); // Exactly the given MathNode
```

### Structural Patterns

Structural patterns match operation nodes with sub-patterns for operands.

```typescript
// Binary operations
P.add(left, right); // Addition: left + right
P.sub(left, right); // Subtraction: left - right
P.mul(left, right); // Multiplication: left * right
P.div(numerator, denominator); // Division: numerator / denominator
P.pow(base, exponent); // Power: base^exponent

// Unary operations
P.neg(operand); // Negation: -operand
P.pos(operand); // Positive: +operand
P.paren(content); // Parentheses: (content)

// Other structures
P.func(name, args); // Function: name(args...)
P.subscript(base, sub); // Subscript: base_sub
P.rel(relation, left, right); // Relation: left relation right

// Examples
P.add(P._('x'), P.num(0)); // x + 0
P.mul(P.num(2), P._('x')); // 2*x
P.pow(P._('base'), P.num(2)); // base^2
P.func('sin', [P._('x')]); // sin(x)
P.div(P._('a'), P._('b', P.isNonzero())); // a/b (b≠0)
P.rel('=', P._('x'), P._('y')); // x = y
P.rel('any', P._('left'), P._('right')); // any relation
```

### Constraints

Constraints refine wildcard matches to specific types or properties.

#### Type Constraints

```typescript
P.isType('number'); // Match number nodes only
P.isType('variable'); // Match variable nodes only
P.isType('number', 'variable'); // Match numbers OR variables
P.isNumber(); // Shorthand for isType('number')
P.isVariable(); // Shorthand for isType('variable')
```

#### Value Constraints

```typescript
P.isPositive(); // Matches positive values (e.g., 5, x+1 when positive)
P.isNegative(); // Matches negative values
P.isNonzero(); // Matches nonzero values (useful for denominators)
P.isInteger(); // Matches integer numbers
```

#### Structural Constraints

```typescript
P.isFreeOf('x'); // Expression does not contain x
P.isFreeOf('x', 'y'); // Contains neither x nor y

P.custom(
	(node) => node.type === 'number' && parseFloat(node.value) > 10,
	'greater than 10' // Optional label
);
```

#### Logical Constraints

```typescript
P.and(constraint1, constraint2); // ALL must match
P.or(constraint1, constraint2); // ANY must match
P.not(constraint); // Must NOT match

// Example: positive integers
P._('k', P.and(P.isInteger(), P.isPositive()));

// Example: numbers or variables
P._('x', P.or(P.isNumber(), P.isVariable()));

// Example: anything except zero
P._('x', P.not(P.custom((n) => n.type === 'number' && n.value === '0')));
```

---

## Matching Functions

### `match(pattern, node)`

Returns detailed match result with bindings.

```typescript
import { match, P } from '$lib/mathAST/pattern';

const pattern = P.add(P._('x'), P._('y'));
const node = add(variable('a'), number('5'));
const result = match(pattern, node);

if (result.success) {
	const x = result.bindings.get('x'); // variable('a')
	const y = result.bindings.get('y'); // number('5')
}
```

### `matches(pattern, node)`

Returns boolean - convenient for simple checks.

```typescript
import { matches, P } from '$lib/mathAST/pattern';

if (matches(P.mul(P.num(2), P._('x')), node)) {
	// node is a multiplication by 2
}
```

### `tryMatch(pattern, node)`

Returns bindings map or `undefined` if no match.

```typescript
import { tryMatch, P } from '$lib/mathAST/pattern';

const bindings = tryMatch(P.add(P._('a'), P._('b')), node);
if (bindings) {
	const a = bindings.get('a');
	const b = bindings.get('b');
}
```

### `Exp` Class Methods

The `Exp` class provides convenient pattern matching methods:

```typescript
const expr = Exp.parse('x + 0');

// Check if matches pattern
expr.matches(P.add(P._('x'), P.num(0))); // true

// Extract bindings (null if no match)
const bindings = expr.extract(P.add(P._('left'), P._('right')));
// bindings.get('left')  => variable('x')
// bindings.get('right') => number('0')
```

---

## Rule System

Rules define transformations: when a pattern matches, replace it with the result.

### Creating Rules

```typescript
import { P } from '$lib/mathAST/pattern';

// Basic rule: pattern → replacement
P.rule(
	P.add(P._('x'), P.num(0)), // Pattern
	P._('x'), // Replacement
	{ name: 'additive-identity' }
);

// Rule with condition
P.rule(P.div(P._('x'), P._('x')), P.num(1), {
	name: 'self-division',
	condition: (bindings) => {
		const x = bindings.get('x');
		return x?.type !== 'number' || x.value !== '0';
	}
});

// Rule with function replacement
P.rule(P.sub(P.num(0), P._('x')), (bindings) => opposite(bindings.get('x')!), {
	name: 'zero-minus'
});

// Rule with priority (higher = applied first)
P.rule(P.mul(P.num(0), P._('x')), P.num(0), {
	name: 'multiply-by-zero',
	priority: 10 // Higher priority rules apply first
});
```

### Applying Rules

#### `applyRule(rule, node)`

Applies rule to a single node (top-level only).

```typescript
import { applyRule } from '$lib/mathAST/pattern';

const rule = P.rule(P.add(P._('x'), P.num(0)), P._('x'));
const node = add(variable('a'), number('0'));
const result = applyRule(rule, node); // variable('a')
```

#### `applyRuleDeep(rule, node)`

Applies rule recursively (bottom-up traversal).

```typescript
import { applyRuleDeep } from '$lib/mathAST/pattern';

const rule = P.rule(P.add(P._('x'), P.num(0)), P._('x'));
const node = add(add(variable('a'), number('0')), add(variable('b'), number('0')));
const result = applyRuleDeep(rule, node);
// add(variable('a'), variable('b')) - both inner additions simplified
```

#### `applyRules(rules, node, maxIterations?)`

Applies multiple rules to fixpoint (no more changes).

- Rules sorted by priority (higher first)
- Applied recursively until no changes
- Restarts from beginning after each change

```typescript
import { applyRules } from '$lib/mathAST/pattern';

const rules = [
	P.rule(P.add(P._('x'), P.num(0)), P._('x')),
	P.rule(P.mul(P._('x'), P.num(1)), P._('x'))
];

const node = mul(add(variable('x'), number('0')), number('1'));
const result = applyRules(rules, node);
// First pass: mul(variable('x'), number('1'))
// Second pass: variable('x')
```

#### `Exp.simplifyWith(rules, maxIterations?)`

Convenient method on `Exp` class.

```typescript
const expr = Exp.parse('(x + 0) * 1');
const simplified = expr.simplifyWith([
	P.rule(P.add(P._('x'), P.num(0)), P._('x')),
	P.rule(P.mul(P._('x'), P.num(1)), P._('x'))
]);
// simplified.latex => 'x'
```

---

## Built-in Rule Sets

Pre-defined rules for common simplifications.

### `arithmeticRules`

Identity and zero rules for basic arithmetic.

```typescript
import { arithmeticRules } from '$lib/mathAST/pattern';

// Rules included:
// - 0 + x → x          (additive identity, left)
// - x + 0 → x          (additive identity, right)
// - x - 0 → x          (subtractive identity)
// - 0 - x → -x         (zero minus)
// - x - x → 0          (self subtraction)
// - 1 * x → x          (multiplicative identity, left)
// - x * 1 → x          (multiplicative identity, right)
// - 0 * x → 0          (multiplicative zero, left) [priority: 1]
// - x * 0 → 0          (multiplicative zero, right) [priority: 1]
// - x / 1 → x          (division by one)
// - 0 / x → 0          (zero divided, x ≠ 0)
// - x / x → 1          (self division, x ≠ 0)
// - --x → x            (double negation)
// - +x → x             (positive identity)

const expr = Exp.parse('(a + 0) * 1 + 0');
const simplified = expr.simplifyWith(arithmeticRules);
// simplified.latex => 'a'
```

### `powerRules`

Exponent simplifications.

```typescript
import { powerRules } from '$lib/mathAST/pattern';

// Rules included:
// - x^1 → x            (power of one)
// - x^0 → 1            (power of zero, x ≠ 0)
// - 1^x → 1            (one to any power)
// - 0^x → 0            (zero to positive power)

const expr = Exp.parse('x^1 \\cdot y^0');
const simplified = expr.simplifyWith(powerRules);
// simplified.latex => 'x \\cdot 1'
```

### `allRules`

Combined set of all built-in rules.

```typescript
import { allRules } from '$lib/mathAST/pattern';

const expr = Exp.parse('(x + 0)^1 * 1');
const simplified = expr.simplifyWith(allRules);
// simplified.latex => 'x'
```

---

## Examples

### Verifying Expression Form

Check if an expression matches a specific structure.

```typescript
import { Exp, P } from '$lib/mathAST';

const expr = Exp.parse('2x + 5');

// Is it linear form: ax + b?
const isLinear = expr.matches(P.add(P.mul(P._('a'), P._('x', P.isVariable())), P._('b')));

// Is it quadratic: ax^2 + bx + c?
const isQuadratic = expr.matches(
	P.add(
		P.add(P.mul(P._('a'), P.pow(P._('x', P.isVariable()), P.num(2))), P.mul(P._('b'), P._('x'))),
		P._('c')
	)
);
```

### Same-Value Matching

Ensure multiple occurrences bind to the same value.

```typescript
// Match x + x (doubling pattern)
const pattern = P.add(P._('x'), P._('x'));

Exp.parse('a + a').matches(pattern); // true
Exp.parse('a + b').matches(pattern); // false (different values)
Exp.parse('2a + 2a').matches(pattern); // true (2a is same both times)
```

### Creating Custom Rules

Build domain-specific simplification rules.

```typescript
import { P, Exp } from '$lib/mathAST';

// Simplify sin^2 + cos^2 → 1
const trigIdentity = P.rule(
	P.add(P.pow(P.func('sin', [P._('x')]), P.num(2)), P.pow(P.func('cos', [P._('x')]), P.num(2))),
	P.num(1),
	{ name: 'pythagorean-identity' }
);

const expr = Exp.parse('\\sin^{2}(x) + \\cos^{2}(x)');
const simplified = expr.simplifyWith([trigIdentity]);
// simplified.latex => '1'
```

### Complex Simplification

Combine multiple rules for advanced simplification.

```typescript
import { allRules, P, Exp } from '$lib/mathAST';

// Custom rule: x * x → x^2
const squareRule = P.rule(P.mul(P._('x'), P._('x')), P.pow(P._('x'), P.num(2)), {
	name: 'multiply-to-square'
});

const expr = Exp.parse('(x + 0) * (x + 0) * 1 + 0');
const rules = [...allRules, squareRule];
const simplified = expr.simplifyWith(rules);
// First: (x + 0) * (x + 0) * 1 + 0
// →      x * x * 1 + 0              (arithmetic rules)
// →      x * x + 0                  (multiply by 1)
// →      x^2 + 0                    (square rule)
// →      x^2                        (add zero)
```

### Pattern-Based Extraction

Extract coefficients and terms from expressions.

```typescript
import { Exp, P } from '$lib/mathAST';

const expr = Exp.parse('5x + 3');
const pattern = P.add(
	P.mul(P._('coeff', P.isNumber()), P._('var', P.isVariable())),
	P._('constant', P.isNumber())
);

const bindings = expr.extract(pattern);
if (bindings) {
	const coeff = bindings.get('coeff'); // number('5')
	const variable = bindings.get('var'); // variable('x')
	const constant = bindings.get('constant'); // number('3')
}
```

### Conditional Transformations

Apply rules only when conditions are met.

```typescript
import { P } from '$lib/mathAST';

// Simplify sqrt(x^2) → x only when x is positive
const sqrtSquare = P.rule(P.func('sqrt', [P.pow(P._('x'), P.num(2))]), P._('x'), {
	name: 'sqrt-square',
	condition: (bindings) => {
		const x = bindings.get('x');
		// Add logic to check if x is known positive
		return true; // Simplified for example
	}
});
```

---

## Design Notes

### Pattern vs MathNode Separation

**Patterns** and **MathNodes** are intentionally separate types:

- **MathNodes** represent actual mathematical expressions
- **Patterns** represent templates for matching expressions

This separation:

- Prevents confusion between actual expressions and match templates
- Allows pattern-specific features (wildcards, constraints)
- Makes the type system more precise (can't accidentally use pattern where node expected)

### Commutative Operations

Addition and multiplication patterns automatically try both orders:

```typescript
const pattern = P.add(P.num(0), P._('x'));

// Matches both:
add(number('0'), variable('a')); // 0 + a
add(variable('a'), number('0')); // a + 0 (swapped)
```

Subtraction and division do NOT swap (they're not commutative):

```typescript
const pattern = P.sub(P._('x'), P.num(0));

// Matches only:
subtract(variable('a'), number('0')); // a - 0

// Does NOT match:
subtract(number('0'), variable('a')); // 0 - a (different!)
```

### Fixpoint Iteration

`applyRules()` continues applying rules until no changes occur (fixpoint). This ensures complete simplification:

```typescript
// Given: ((x + 0) + 0) + 0
// Iteration 1: (x + 0) + 0    (innermost simplified)
// Iteration 2: x + 0          (middle simplified)
// Iteration 3: x              (outermost simplified)
// Iteration 4: no change      (fixpoint reached)
```

Set `maxIterations` to prevent infinite loops if rules create cycles.

---

## API Reference Summary

### Pattern Strings

```typescript
// Parse pattern from string
parsePattern(patternString: string): Pattern

// Alias via P namespace
P.parse(patternString: string): Pattern
```

### Pattern Builder (`P`)

```typescript
// Wildcards
P._(name, constraint?)

// Literals
P.num(value)
P.var(name)
P.lit(node)

// Structural
P.add(left, right)
P.sub(left, right)
P.mul(left, right)
P.div(numerator, denominator)
P.pow(base, exponent)
P.func(name, args)
P.neg(operand)
P.pos(operand)
P.paren(content)
P.subscript(base, sub)
P.rel(relation, left, right)

// Constraints
P.isType(...types)
P.isNumber()
P.isVariable()
P.isPositive()
P.isNegative()
P.isNonzero()
P.isInteger()
P.isFreeOf(...variables)
P.custom(predicate, label?)
P.and(...constraints)
P.or(...constraints)
P.not(constraint)

// Rules
P.rule(pattern, replacement, options?)
```

### Matching Functions

```typescript
match(pattern, node): MatchResult
matches(pattern, node): boolean
tryMatch(pattern, node): MatchBindings | undefined
```

### Rule Functions

```typescript
createRule(pattern, replacement, options?): Rule
applyRule(rule, node): MathNode | null
applyRuleDeep(rule, node): MathNode
applyRules(rules, node, maxIterations?): MathNode
instantiate(pattern, bindings): MathNode
```

### Exp Class Methods

```typescript
exp.matches(pattern): boolean
exp.extract(pattern): Map<string, MathNode> | null
exp.simplifyWith(rules, maxIterations?): Exp
```

### Built-in Rule Sets

```typescript
arithmeticRules: readonly Rule[]
powerRules: readonly Rule[]
allRules: readonly Rule[]
```

---

## See Also

- [MathAST Reference](../README.md) - Main mathAST documentation
- [Exp Class](../exp.ts) - Fluent wrapper API
- [Evaluation System](../eval/README.md) - Numeric evaluation
- [Normalization](../normal/README.md) - Canonical forms
