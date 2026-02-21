# Pattern Matching System

Technical reference for the MathAST pattern matching engine.

**Source**: `src/lib/mathAST/pattern/`
**Tests**: `src/lib/mathAST/pattern/__tests__/`

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Pattern Builder API (P namespace)](#pattern-builder-api)
3. [Wildcards and Sequences](#wildcards-and-sequences)
4. [Constraints](#constraints)
5. [Matching Functions](#matching-functions)
6. [Matching Algorithm](#matching-algorithm)
7. [Rules and Transformations](#rules-and-transformations)
8. [Rule Sets](#rule-sets)
9. [Form Verification](#form-verification)
10. [Pattern Parser (String Syntax)](#pattern-parser)
11. [Usage Examples](#usage-examples)

---

## Architecture Overview

The pattern matching system is designed to match **Pattern** objects against **MathNode** AST expressions and extract bindings. Patterns are intentionally separate types from MathNodes -- they describe _what to match_, not mathematical expressions themselves.

### File Structure

| File             | Role                                                          |
| ---------------- | ------------------------------------------------------------- |
| `types.ts`       | All type definitions (patterns, constraints, bindings, rules) |
| `builder.ts`     | `P` namespace -- fluent API for constructing patterns         |
| `match.ts`       | Core matching algorithm                                       |
| `constraints.ts` | Constraint evaluation against MathNodes                       |
| `rule.ts`        | Rule creation, instantiation, and application                 |
| `verify.ts`      | High-level form verification (LaTeX string input)             |
| `index.ts`       | Public exports                                                |
| `rule-sets/`     | Pre-built rule collections (arithmetic, trig, etc.)           |

### Core Data Flow

```
Pattern + MathNode  -->  match()  -->  MatchResult { success, bindings }
                                            |
                                            v
Rule { pattern, replacement }  -->  instantiate()  -->  new MathNode
```

---

## Pattern Builder API

All patterns are built via the `P` namespace (imported from `$lib/mathAST/pattern`).

### Wildcards

| Builder                | Description                    | Binding           |
| ---------------------- | ------------------------------ | ----------------- |
| `P._('x')`             | Match any single expression    | `MathNode`        |
| `P._('n', constraint)` | Match with constraint          | `MathNode`        |
| `P.__('rest')`         | Sequence: 1+ elements          | `SequenceBinding` |
| `P.___('extras')`      | Optional sequence: 0+ elements | `SequenceBinding` |

### Literals

| Builder       | Description               |
| ------------- | ------------------------- |
| `P.num(0)`    | Match exact number        |
| `P.var('x')`  | Match exact variable name |
| `P.lit(node)` | Match exact MathNode      |

### Structural Patterns

| Builder                     | Matches                | Commutative?            |
| --------------------------- | ---------------------- | ----------------------- |
| `P.add(left, right)`        | `a + b`                | Yes (tries both orders) |
| `P.sub(left, right)`        | `a - b`                | No                      |
| `P.mul(left, right)`        | `a * b`                | Yes (tries both orders) |
| `P.div(num, den)`           | `a / b`                | No                      |
| `P.pow(base, exp)`          | `a ^ b`                | No                      |
| `P.neg(operand)`            | `-a`                   | --                      |
| `P.pos(operand)`            | `+a`                   | --                      |
| `P.paren(content)`          | `(a)`                  | --                      |
| `P.subscript(base, sub)`    | `a_b`                  | No                      |
| `P.rel(type, left, right)`  | `a = b`, `a < b`, etc. | No                      |
| `P.func(name, args, opts?)` | `sin(x)`, `sin^2(x)`   | --                      |

### N-ary Patterns (Flattened Matching)

| Builder               | Description                             |
| --------------------- | --------------------------------------- |
| `P.sum(...elements)`  | Flattened sum, commutative matching     |
| `P.prod(...elements)` | Flattened product, commutative matching |

These flatten the expression tree and try all permutations of term/factor assignment.

---

## Wildcards and Sequences

### Single Wildcards

A wildcard `P._('name')` matches any single `MathNode` and binds it to `name`:

```typescript
const pattern = P.add(P._('x'), P.num(0));
// Matches: a + 0, (x+1) + 0, sin(x) + 0, ...
// Bindings: { x: <the left operand> }
```

**Same-name binding consistency**: If the same wildcard name appears multiple times in a pattern, all occurrences must match structurally identical nodes:

```typescript
P.mul(P._('x'), P._('x')); // Matches x*x but NOT x*y
P.sub(P._('x'), P._('x')); // Matches a-a, always binds to 0
```

### Sequence Wildcards

Used inside `P.sum()` or `P.prod()` to capture multiple terms/factors:

```typescript
// Match "something + rest" where rest is 1+ terms
P.sum(P._('a'), P.__('rest'));
// On a+b+c: tries a->a rest->[b,c] ; a->b rest->[a,c] ; a->c rest->[a,b]

// Match with optional rest (0+ terms)
P.sum(P._('a'), P._('b'), P.___('extras'));
// On a+b: extras is empty
// On a+b+c: extras is [c]
```

**Binding types**:

- `P.__('rest')` in a sum binds to `SumSequenceBinding { kind: 'sum-sequence', terms: SignedTerm[] }`
- `P.__('rest')` in a product binds to `ProductSequenceBinding { kind: 'product-sequence', factors: MathNode[] }`

**Limitation**: Only one sequence pattern per `P.sum()`/`P.prod()`.

---

## Constraints

Constraints restrict what a wildcard can match. They are passed as the second argument to `P._()`.

### Value Constraints

| Constraint          | Matches                                 |
| ------------------- | --------------------------------------- |
| `P.isNumber()`      | Number nodes only                       |
| `P.isVariable()`    | Variable nodes only                     |
| `P.isPositive()`    | Positive values (number or inferred)    |
| `P.isNegative()`    | Negative values                         |
| `P.isNonzero()`     | Non-zero values                         |
| `P.isNonone()`      | Values != 1                             |
| `P.isInteger()`     | All integers (negative, zero, positive) |
| `P.isEven()`        | Even integers                           |
| `P.isOdd()`         | Odd integers                            |
| `P.isMultipleOf(n)` | Integers divisible by n                 |

### Comparison Constraints

| Constraint | Matches     |
| ---------- | ----------- |
| `P.gt(n)`  | Values > n  |
| `P.lt(n)`  | Values < n  |
| `P.gte(n)` | Values >= n |
| `P.lte(n)` | Values <= n |
| `P.eq(n)`  | Values = n  |
| `P.ne(n)`  | Values != n |

### Type Constraints

| Constraint                       | Matches                   |
| -------------------------------- | ------------------------- |
| `P.isType('number')`             | Specific MathNode type(s) |
| `P.isType('number', 'variable')` | Multiple types (OR)       |

### Numeric Type Constraints

Uses the numtype inference system. Default is subtype-inclusive (integer satisfies 'rational').

| Constraint                   | Matches                                    |
| ---------------------------- | ------------------------------------------ |
| `P.isIntegerType()`          | Integer expressions                        |
| `P.isRationalType()`         | Rational (includes integer)                |
| `P.isAlgebraicType()`        | Algebraic (includes rational)              |
| `P.isRealType()`             | Real (includes algebraic + transcendental) |
| `P.isTranscendentalType()`   | Transcendental (pi, e, sin(1))             |
| `P.isComplexType()`          | Complex                                    |
| `P.isNumType(type, strict?)` | Any specific numeric type                  |

Pass `true` for strict matching (exact type, not subtypes).

### Structural Constraints

| Constraint             | Matches                               |
| ---------------------- | ------------------------------------- |
| `P.isFreeOf('x')`      | Expressions not containing variable x |
| `P.isFreeOf('x', 'y')` | Free of both x and y                  |

### Domain Constraints

Match numbers within mathematical domains:

| Constraint                          | Domain                 |
| ----------------------------------- | ---------------------- |
| `P.inPositiveReals()`               | ]0, +inf[              |
| `P.inNonNegativeReals()`            | [0, +inf[              |
| `P.inUnitInterval()`                | [-1, 1]                |
| `P.inR()`                           | All reals              |
| `P.inRplus()` / `P.inRplusStar()`   | R+ / R+\*              |
| `P.inRminus()` / `P.inRminusStar()` | R- / R-\*              |
| `P.inRstar()`                       | R\* (non-zero reals)   |
| `P.inN()` / `P.inNstar()`           | Natural numbers / N\*  |
| `P.inZ()` / `P.inZstar()`           | Integers / Z\*         |
| `P.inInterval(domain)`              | Custom interval domain |

### Logical Combinators

| Constraint             | Description                |
| ---------------------- | -------------------------- |
| `P.and(c1, c2, ...)`   | All constraints must match |
| `P.or(c1, c2, ...)`    | At least one must match    |
| `P.not(c)`             | Constraint must NOT match  |
| `P.custom(fn, label?)` | Custom predicate function  |

```typescript
// Positive integer
P._('n', P.and(P.isInteger(), P.isPositive()));

// Number or variable
P._('x', P.or(P.isNumber(), P.isVariable()));

// Anything except a number
P._('x', P.not(P.isNumber()));

// Multiples of 10 (for rounding exercises)
P._('n', P.isMultipleOf(10));

// Custom: value > 10
P._(
	'n',
	P.custom((node) => {
		return node.type === 'number' && parseFloat(node.value) > 10;
	}, 'gt10')
);
```

---

## Matching Functions

### `match(pattern, node, bindings?, ctx?): MatchResult`

Core matching function. Returns `{ success: boolean, bindings: MatchBindings }`.

```typescript
const result = match(P.add(P._('x'), P.num(0)), node);
if (result.success) {
	const x = result.bindings.get('x'); // MathNode
}
```

### `tryMatch(pattern, node, ctx?): MatchBindings | undefined`

Returns bindings on success, `undefined` on failure. Most common for inline use.

```typescript
const bindings = tryMatch(P.pow(P._('base'), P._('exp')), node);
if (bindings) {
	const base = bindings.get('base');
}
```

### `matches(pattern, node, ctx?): boolean`

Boolean check only, no bindings returned.

```typescript
if (matches(P.func('sin', [P._('x')]), node)) {
	// node is sin(something)
}
```

### `nodesEqual(a, b): boolean`

Structural equality via hash comparison.

---

## Matching Algorithm

### Dispatch

The `match()` function dispatches on `pattern.type`:

1. **Wildcard**: Check constraint, check binding consistency, create binding
2. **Literal**: Structural equality via `hashMathNode()`
3. **Binary patterns**: Match children recursively; commutative ops try both orders
4. **Function**: Match name, power, then arguments sequentially
5. **N-ary (sum/product)**: Flatten then combinatorial matching

### Commutative Matching

Addition and multiplication patterns try both operand orders:

```
P.add(P._('a'), P.num(0)) against node (0 + x)
  1. Try: a=0, right=x  -> fail (0 doesn't match P._('a') constraint? no constraint, but P.num(0) doesn't match x)
     Actually: left pattern P._('a') vs node.left 0 -> a=0; right pattern P.num(0) vs node.right x -> fail
  2. Try swapped: left pattern P._('a') vs node.right x -> a=x; right pattern P.num(0) vs node.left 0 -> success!
```

### N-ary Matching (Sum/Product)

For `P.sum()` and `P.prod()`, the algorithm:

1. **Flatten** the expression (e.g., `a + b + c` becomes `[{+,a}, {+,b}, {+,c}]`)
2. **Categorize** pattern elements into singles and sequence (max 1 sequence per pattern)
3. **Combinations**: Try all C(n, k) ways to assign k terms to k single patterns
4. **Permutations**: For each combination, try all k! orderings (commutativity)
5. **Remainder**: Unassigned terms go to the sequence wildcard
6. **Constraint check**: Each remaining term must satisfy the sequence constraint (if any)

```typescript
P.sum(P._('a', P.isNumber()), P.__('rest'));
// Against: 3 + x + y
// Flatten: [{+,3}, {+,x}, {+,y}]
// Try a=3 (isNumber? yes), rest=[{+,x}, {+,y}] -> SUCCESS
// (would also try a=x, a=y but those fail isNumber)
```

### Binding Consistency

- Same wildcard name must bind to structurally identical values
- Uses hash-based comparison (`hashMathNode`)
- Bindings are merged left-to-right; conflicts cause match failure
- For sequence bindings, terms/factors are compared element by element

### Type Context

An optional `TypeContext` can be passed to enable assumption-aware matching. This allows constraints like `P.isPositive()` to work with variables that have type assumptions (e.g., "assume x > 0").

---

## Rules and Transformations

### Creating Rules

```typescript
import { P, createRule } from '$lib/mathAST/pattern';

// Pattern replacement
const rule = createRule(
	P.add(P._('x'), P.num(0)), // pattern
	P._('x'), // replacement (Pattern)
	{ name: 'additive-identity' }
);

// Function replacement (for complex transformations)
const rule2 = createRule(
	P.sub(P.num(0), P._('x')),
	(bindings) => opposite(bindings.get('x') as MathNode),
	{ name: 'zero-minus' }
);

// Or via P.rule() shorthand:
const rule3 = P.rule(P.div(P._('x'), P._('x')), P.num(1), {
	name: 'self-division',
	condition: (bindings) => {
		const x = bindings.get('x');
		return x?.type !== 'number' || x.value !== '0';
	}
});
```

### Rule Options

| Option      | Type                    | Description                              |
| ----------- | ----------------------- | ---------------------------------------- |
| `name`      | `string`                | Rule identifier (for debugging/tracking) |
| `condition` | `(bindings) => boolean` | Additional check after match             |
| `priority`  | `number`                | Higher = applied first (default: 0)      |
| `group`     | `string`                | Logical grouping                         |

### Applying Rules

| Function                                           | Behavior                                                    |
| -------------------------------------------------- | ----------------------------------------------------------- |
| `applyRule(rule, node, ctx?)`                      | Single rule, top-level only. Returns `MathNode \| null`     |
| `applyRuleDeep(rule, node, ctx?)`                  | Single rule, bottom-up recursive traversal                  |
| `applyRules(rules, node, maxIter?, ctx?)`          | Multiple rules to **fixpoint** (default max 100 iterations) |
| `applyRulesDeepOnce(rules, node, ctx?)`            | Single bottom-up pass, first matching rule wins per node    |
| `applyRulesDeepOnceTracked(rules, node, ctx?)`     | Same as above with step recording                           |
| `applyRulesWithSteps(rules, node, maxIter?, ctx?)` | Fixpoint with full step recording                           |

### Instantiation

`instantiate(pattern, bindings)` replaces wildcards in a pattern with their bound values:

```typescript
const replacement = P.add(P._('x'), P.num(1));
const bindings = new Map([['x', variable('a')]]);
const result = instantiate(replacement, bindings);
// result: a + 1
```

For sequence bindings, `instantiate` calls `unflattenSum()` or `unflattenProduct()` to rebuild the tree.

### Step Tracking

`applyRulesWithSteps()` returns `RuleApplicationResult`:

```typescript
interface RuleApplicationResult {
	result: MathNode; // Final expression
	changed: boolean; // Whether any rule fired
	steps: RuleStep[]; // All transformation steps
}

interface RuleStep {
	ruleName: string; // Which rule fired
	before: MathNode; // Sub-expression before
	after: MathNode; // Sub-expression after
}
```

This is used for pedagogical purposes (showing simplification steps to students).

---

## Rule Sets

Pre-built rules in `src/lib/mathAST/pattern/rule-sets/`:

### Core Sets

| Set                   | File                 | Examples                                       |
| --------------------- | -------------------- | ---------------------------------------------- |
| `arithmeticRules`     | `arithmetic.ts`      | x+0=x, x*1=x, x*0=0, --x=x, x-x=0, x/x=1       |
| `powerRules`          | `powers.ts`          | x^0=1, x^1=x, (x^a)^b=x^(ab), x^a\*x^b=x^(a+b) |
| `absRules`            | `abs.ts`             | \|0\|=0, \|x\|>=0, \|\|x\|\|=\|x\|             |
| `logExpRules`         | `log-exp.ts`         | ln(1)=0, ln(e)=1, e^ln(x)=x, ln(e^x)=x         |
| `sqrtRules`           | `sqrt.ts`            | sqrt(0)=0, sqrt(1)=1, sqrt(x^2)=\|x\|          |
| `trigRules`           | `trig.ts`            | sin(0)=0, cos(0)=1, tan(0)=0, sin(pi)=0        |
| `functionParityRules` | `function-parity.ts` | sin(-x)=-sin(x), cos(-x)=cos(x)                |

### Identity Sets (Trigonometric)

| Set                       | Content                             |
| ------------------------- | ----------------------------------- |
| `trigPythagoreanRules`    | sin^2+cos^2=1 and variants          |
| `trigDoubleAngleRules`    | sin(2x)=2sin(x)cos(x), etc.         |
| `trigAdditionRules`       | sin(a+b), cos(a+b) formulas         |
| `trigLinearizationRules`  | Products to sums                    |
| `trigFactorizationRules`  | Sums to products                    |
| `trigPowerReductionRules` | sin^2(x)=(1-cos(2x))/2              |
| `trigNegativeAngleRules`  | Parity rules for negative arguments |
| `trigPeriodicRules`       | Periodicity simplifications         |
| `trigCofunctionRules`     | sin(pi/2-x)=cos(x)                  |
| `trigSupplementaryRules`  | sin(pi-x)=sin(x)                    |
| `trigHalfAngleRules`      | Half-angle formulas                 |
| `allTrigRules`            | All trig identity rules combined    |

### Identity Sets (Hyperbolic)

Same structure as trig: `hypPythagoreanRules`, `hypDoubleAngleRules`, `hypAdditionRules`, `allHyperbolicRules`, etc.

### Algebraic Identity Sets

| Set                       | Content                             |
| ------------------------- | ----------------------------------- |
| `algebraicSimplifyRules`  | (a+b)^2 = a^2+2ab+b^2 (recognition) |
| `algebraicFactoringRules` | a^2-b^2 = (a+b)(a-b)                |
| `algebraicExpandingRules` | (a+b)^2 = a^2+2ab+b^2 (expansion)   |

### Combined Sets

| Set               | Description                                                               |
| ----------------- | ------------------------------------------------------------------------- |
| `allPatternRules` | All rules for standalone use (arithmetic+power+abs+log+sqrt+trig+parity)  |
| `simplifyRules`   | Rules used by the `simplify()` pipeline (abs rules requiring TypeContext) |

---

## Form Verification

The `verify.ts` module provides high-level functions for checking LaTeX strings against pattern strings.

### `verifyForm(answer, patternStr, options?): VerifyFormResult`

```typescript
import { verifyForm } from '$lib/mathAST/pattern';

const result = verifyForm('2x + 3', 'a * $x + b');
if (result.matches) {
	result.bindings; // { a: '2', b: '3' } (LaTeX strings)
	result.rawBindings; // Map with MathNode values
}
```

### `matchesForm(answer, patternStr): boolean`

Boolean shorthand.

### `extractBindings(answer, patternStr): Record<string, string> | null`

Returns bindings or null.

---

## Pattern Parser

Patterns can be constructed from strings using a Pratt parser.

### Syntax

| Syntax                  | Meaning                                      |
| ----------------------- | -------------------------------------------- |
| `x`, `a`, `n`           | Wildcards (letters are wildcards by default) |
| `x:number`              | Wildcard with constraint                     |
| `__rest`                | Sequence wildcard (1+)                       |
| `___opt`                | Optional sequence wildcard (0+)              |
| `$x`                    | Literal variable (matches exactly 'x')       |
| `0`, `42`, `3.14`       | Literal numbers                              |
| `+`, `-`, `*`, `/`, `^` | Operators                                    |
| `sin(x)`, `cos(x)`      | Functions                                    |
| `(x + y)`               | Parentheses                                  |

### Constraint Syntax

| Syntax           | Constraint          |
| ---------------- | ------------------- |
| `:number`        | `P.isNumber()`      |
| `:variable`      | `P.isVariable()`    |
| `:integer`       | `P.isInteger()`     |
| `:positive`      | `P.isPositive()`    |
| `:negative`      | `P.isNegative()`    |
| `:nonzero`       | `P.isNonzero()`     |
| `:multipleOf(n)` | `P.isMultipleOf(n)` |

### Examples

```typescript
import { parsePattern } from '$lib/mathAST/pattern';

parsePattern('x + 0'); // P.add(P._('x'), P.num(0))
parsePattern('n:number * $x'); // P.mul(P._('n', P.isNumber()), P.var('x'))
parsePattern('sin(x)'); // P.func('sin', [P._('x')])
parsePattern('a + __rest'); // P.add(P._('a'), P.__('rest'))
```

---

## Usage Examples

### Simplification Rule

```typescript
import { P, createRule, applyRuleDeep } from '$lib/mathAST/pattern';

// x + 0 -> x
const additiveIdentity = createRule(P.add(P._('x'), P.num(0)), P._('x'), {
	name: 'additive-identity'
});

const simplified = applyRuleDeep(additiveIdentity, expression);
```

### Extracting Coefficients

```typescript
import { P, tryMatch } from '$lib/mathAST/pattern';

// Extract coefficient from "coeff * sin(x)"
const pattern = P.prod(P._('coeff', P.isFreeOf('x')), P.func('sin', [P._('arg')]));

const bindings = tryMatch(pattern, node);
if (bindings) {
	const coeff = bindings.get('coeff'); // MathNode
	const arg = bindings.get('arg'); // MathNode
}
```

### Checking Expression Form

```typescript
import { P, matches } from '$lib/mathAST/pattern';

// Is this a fraction?
if (matches(P.div(P._('num'), P._('den')), node)) {
	// yes
}

// Is this a power with integer exponent?
if (matches(P.pow(P._('base'), P._('n', P.isInteger())), node)) {
	// yes
}
```

### Applying Multiple Rules to Fixpoint

```typescript
import { arithmeticRules, powerRules, applyRules } from '$lib/mathAST/pattern';

const rules = [...arithmeticRules, ...powerRules];
const simplified = applyRules(rules, expression);
// Keeps applying rules until no more changes
```

### N-ary Pattern with Sequence

```typescript
import { P, tryMatch } from '$lib/mathAST/pattern';

// Match "number + rest of sum"
const pattern = P.sum(P._('n', P.isNumber()), P.__('rest'));

const bindings = tryMatch(pattern, sumExpression);
if (bindings) {
	const n = bindings.get('n'); // The number term
	const rest = bindings.get('rest'); // SumSequenceBinding with remaining terms
}
```

### Verifying Student Answers

```typescript
import { verifyForm } from '$lib/mathAST/pattern';

// Check if answer is in the form ax + b
const result = verifyForm(studentAnswer, 'a * $x + b');
if (result.matches) {
	console.log(`a = ${result.bindings.a}, b = ${result.bindings.b}`);
}
```

---

## Performance Notes

- **Hash-based equality**: `nodesEqual()` uses `hashMathNode()` for O(1) comparison after initial hash
- **Early pruning**: Type/operator checks happen before recursive descent
- **Combinatorial cost**: N-ary matching has O(C(n,k) \* k!) worst case. In practice, patterns have few singles (k <= 3) and expressions have few terms, keeping this manageable
- **Lazy generators**: `combinations()` and `permutations()` use generators for early exit on first match
- **Fixpoint limit**: `applyRules()` defaults to max 100 iterations to prevent infinite loops
