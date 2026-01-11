# Limits Module

Symbolic limit evaluation for MathAST expressions.

## Overview

The limits module provides comprehensive symbolic limit evaluation with:

- **Multiple evaluation strategies**: Known limits, direct substitution, L'Hopital, algebraic simplification, squeeze theorem
- **One-sided limit analysis**: Left and right limits, discontinuity detection
- **Domain validation**: Automatic detection of domain restrictions with French pedagogical messages
- **Step-by-step recording**: Detailed pedagogical output for teaching

## Quick Start

```typescript
import { evaluateLimit, analyzeOneSidedLimits } from '$lib/mathAST/limits';
import { parseLatex, toLatex } from '$lib/mathAST';
import { number, variable, divide, func } from '$lib/mathAST/factory';

// Basic limit: lim(x→0) sin(x)/x = 1
const expr = divide(func('sin', [variable('x')]), variable('x'), 'fraction');
const result = evaluateLimit(expr, 'x', number('0'));

console.log(result.status); // 'exact'
console.log(toLatex(result.value)); // '1'
console.log(result.technique); // 'known-limit'
```

## Core API

### evaluateLimit

Main entry point for limit evaluation.

```typescript
function evaluateLimit(
	expr: MathNode | LimitNode,
	variable?: string,
	approach?: MathNode,
	direction?: LimitDirection,
	options?: LimitOptions
): LimitResult;
```

**Parameters:**

| Parameter   | Type                    | Description                              |
| ----------- | ----------------------- | ---------------------------------------- |
| `expr`      | `MathNode \| LimitNode` | Expression or LimitNode to evaluate      |
| `variable`  | `string`                | Variable approaching the limit point     |
| `approach`  | `MathNode`              | Point being approached (number/infinity) |
| `direction` | `LimitDirection`        | `'left'`, `'right'`, or `'both'`         |
| `options`   | `LimitOptions`          | Evaluation options                       |

**Examples:**

```typescript
// Using expression with parameters
const result = evaluateLimit(expr, 'x', number('0'), 'both');

// Using LimitNode directly
const limitNode = limit(expr, 'x', number('0'), 'right');
const result = evaluateLimit(limitNode);

// With options
const result = evaluateLimit(expr, 'x', number('0'), 'both', {
	verbosity: 'detailed',
	maxLhopitalIterations: 3
});
```

### analyzeOneSidedLimits

Evaluate left and right limits separately.

```typescript
function analyzeOneSidedLimits(
	expr: MathNode,
	variable: string,
	approach: MathNode,
	options?: LimitOptions
): OneSidedLimitResult;
```

**Example:**

```typescript
// 1/x at x=0 has different left and right limits
const expr = divide(number('1'), variable('x'), 'fraction');
const result = analyzeOneSidedLimits(expr, 'x', number('0'));

console.log(result.twoSidedExists); // false
console.log(result.left.value); // -∞
console.log(result.right.value); // +∞
```

### findKnownLimit

Check if expression matches a known limit pattern.

```typescript
function findKnownLimit(
	expr: MathNode,
	variable: string,
	approach: MathNode
): KnownLimitEntry | null;
```

## Types

### LimitResult

```typescript
interface LimitResult {
	readonly variable: string; // Variable name
	readonly approach: MathNode; // Approach point
	readonly direction: LimitDirection; // 'left' | 'right' | 'both'
	readonly status: LimitStatus; // Evaluation status
	readonly value: MathNode | null; // Limit value (null if doesn't exist)
	readonly indeterminateForm: IndeterminateForm;
	readonly technique: LimitRule; // Primary technique used
	readonly steps: readonly LimitStep[]; // Step-by-step process
	readonly error?: string; // Error message (French)
}
```

### LimitStatus

```typescript
type LimitStatus =
	| 'exact' // Exact symbolic limit found
	| 'indeterminate' // Indeterminate form detected
	| 'does-not-exist' // Limit doesn't exist
	| 'infinite' // Limit is ±∞
	| 'unsupported'; // Cannot evaluate
```

### IndeterminateForm

```typescript
type IndeterminateForm = '0/0' | '∞/∞' | '0*∞' | '∞-∞' | '0^0' | '∞^0' | '1^∞' | 'none';
```

### LimitOptions

```typescript
interface LimitOptions {
	readonly verbosity?: 'result' | 'summarized' | 'detailed';
	readonly maxLhopitalIterations?: number; // Default: 5
	readonly allowNumeric?: boolean; // Default: false
	readonly timeout?: number; // Default: 5000ms
}
```

## Evaluation Strategies

The module applies strategies in order until one succeeds:

### 1. Known Limits

Pattern-matching against a database of fundamental limits.

```typescript
// sin(x)/x → 1 as x → 0
const result = evaluateLimit(
	divide(func('sin', [variable('x')]), variable('x'), 'fraction'),
	'x',
	number('0')
);
// result.technique === 'known-limit'
```

**Supported known limits:**

| Pattern         | x → | Value | Description            |
| --------------- | --- | ----- | ---------------------- |
| `sin(x)/x`      | 0   | 1     | Limite fondamentale    |
| `tan(x)/x`      | 0   | 1     |                        |
| `(1-cos(x))/x`  | 0   | 0     |                        |
| `(1-cos(x))/x²` | 0   | 1/2   |                        |
| `(e^x - 1)/x`   | 0   | 1     | Limite exponentielle   |
| `ln(1+x)/x`     | 0   | 1     | Limite logarithmique   |
| `(a^x - 1)/x`   | 0   | ln(a) |                        |
| `1/x`           | +∞  | 0     |                        |
| `1/x`           | 0⁺  | +∞    | Limite a droite        |
| `1/x`           | 0⁻  | -∞    | Limite a gauche        |
| `x·sin(1/x)`    | 0   | 0     | Theoreme des gendarmes |
| `x²·sin(1/x)`   | 0   | 0     | Theoreme des gendarmes |
| `arcsin(x)/x`   | 0   | 1     |                        |
| `arctan(x)/x`   | 0   | 1     |                        |
| `(1+1/x)^x`     | +∞  | e     | Definition de e        |
| `x^n/e^x`       | +∞  | 0     | Croissance comparee    |
| `ln(x)/x^n`     | +∞  | 0     | Croissance comparee    |

### 2. Direct Substitution

If expression is defined at the approach point, substitute directly.

```typescript
// x + 1 → 3 as x → 2
const result = evaluateLimit(add(variable('x'), number('1')), 'x', number('2'));
// result.value = number('3')
// result.technique === 'direct-substitution'
```

### 3. L'Hopital's Rule

Applied for 0/0 or ∞/∞ indeterminate forms.

```typescript
// (e^x - 1 - x) / x² as x → 0 (0/0 form)
const expr = divide(
	subtract(subtract(func('exp', [variable('x')]), number('1')), variable('x')),
	power(variable('x'), number('2')),
	'fraction'
);
const result = evaluateLimit(expr, 'x', number('0'));
// Applies L'Hopital twice
```

**Configuration:**

```typescript
const result = evaluateLimit(expr, 'x', number('0'), 'both', {
	maxLhopitalIterations: 3 // Limit iterations to prevent infinite loops
});
```

### 4. Algebraic Simplification

Factorization and rationalization to resolve indeterminate forms.

**Factorization:**

```typescript
// (x² - 1)/(x - 1) at x=1 → factor to (x+1)(x-1)/(x-1) = x+1 → 2
const expr = divide(
	subtract(power(variable('x'), number('2')), number('1')),
	subtract(variable('x'), number('1')),
	'fraction'
);
const result = evaluateLimit(expr, 'x', number('1'));
// result.value = number('2')
```

**Rationalization:**

```typescript
// (sqrt(x+1) - 1)/x at x=0 → multiply by conjugate → 1/2
const expr = divide(
	subtract(func('sqrt', [add(variable('x'), number('1'))]), number('1')),
	variable('x'),
	'fraction'
);
const result = evaluateLimit(expr, 'x', number('0'));
// result.value = divide(number('1'), number('2'), 'fraction')
```

**Dominant term at infinity:**

```typescript
// (2x² + 3x) / (x² + 1) as x → +∞ → 2
const result = evaluateLimit(
	divide(
		add(
			multiply(number('2'), power(variable('x'), number('2'))),
			multiply(number('3'), variable('x'))
		),
		add(power(variable('x'), number('2')), number('1')),
		'fraction'
	),
	'x',
	positiveInfinity()
);
// result.value = number('2')
```

### 5. Squeeze Theorem

For bounded oscillating functions multiplied by terms going to zero.

```typescript
// x² · sin(1/x) as x → 0
// -x² ≤ x² · sin(1/x) ≤ x², both bounds → 0
const expr = multiply(
	power(variable('x'), number('2')),
	func('sin', [divide(number('1'), variable('x'), 'fraction')])
);
const result = evaluateLimit(expr, 'x', number('0'));
// result.value = number('0')
// result.technique === 'squeeze'
```

### 6. One-Sided Analysis

Automatic detection of asymmetric behavior at domain boundaries.

```typescript
// sqrt(x) at x=0: only right limit exists
const expr = func('sqrt', [variable('x')]);

// Right limit exists
const rightResult = evaluateLimit(expr, 'x', number('0'), 'right');
// rightResult.status === 'exact', value = 0

// Left limit doesn't exist (domain issue)
const leftResult = evaluateLimit(expr, 'x', number('0'), 'left');
// leftResult.status === 'does-not-exist'
// leftResult.error contains French pedagogical message
```

## Domain Validation

The module automatically validates domain accessibility and returns pedagogical error messages in French.

```typescript
// ln(x) at x = -1: not in domain
const result = evaluateLimit(func('ln', [variable('x')]), 'x', number('-1'));

console.log(result.status); // 'does-not-exist'
console.log(result.error); // "La fonction n'est pas definie au voisinage du point d'approche"
```

**Domain messages:**

| Situation            | Message (French)                                              |
| -------------------- | ------------------------------------------------------------- |
| Point outside domain | "Le point d'approche n'est pas dans le domaine de definition" |
| Left side undefined  | "La fonction n'est pas definie a gauche du point d'approche"  |
| Right side undefined | "La fonction n'est pas definie a droite du point d'approche"  |
| Both sides undefined | "La fonction n'est pas definie au voisinage du point"         |

## Step Recording

Detailed pedagogical steps for teaching.

```typescript
const result = evaluateLimit(expr, 'x', number('0'), 'both', {
	verbosity: 'detailed'
});

for (const step of result.steps) {
	console.log(`${step.rule}: ${step.description}`);
	console.log(`  Before: ${toLatex(step.before)}`);
	console.log(`  After: ${toLatex(step.after)}`);
}
```

**Step structure:**

```typescript
interface LimitStep {
	readonly id: number;
	readonly rule: LimitRule;
	readonly description: string; // French description
	readonly before: MathNode;
	readonly after: MathNode;
	readonly operand?: MathNode;
	readonly verbosityLevel: Verbosity;
	readonly technicalNote?: string;
}
```

## Discontinuity Analysis

```typescript
import { analyzeDiscontinuity } from '$lib/mathAST/limits';

const oneSided = analyzeOneSidedLimits(expr, 'x', number('0'));
const discontinuity = analyzeDiscontinuity(oneSided, functionValueAtPoint);

console.log(discontinuity.type);
// 'none' | 'removable' | 'jump' | 'infinite' | 'essential'

console.log(discontinuity.description);
// French description of the discontinuity
```

## Infinity Handling

```typescript
import { positiveInfinity, negativeInfinity } from '$lib/mathAST/factory';

// 1/x as x → +∞
const result = evaluateLimit(
	divide(number('1'), variable('x'), 'fraction'),
	'x',
	positiveInfinity()
);
// result.value = number('0')

// x² as x → -∞
const result2 = evaluateLimit(power(variable('x'), number('2')), 'x', negativeInfinity());
// result2.value = positiveInfinity()
```

## Error Handling

```typescript
import { LimitError } from '$lib/mathAST/limits';

try {
	const result = evaluateLimit(expr, 'x', number('0'));
} catch (e) {
	if (e instanceof LimitError) {
		console.log(e.code);
		// 'UNSUPPORTED_EXPRESSION' | 'INVALID_VARIABLE' |
		// 'TIMEOUT' | 'MAX_ITERATIONS' | 'INTERNAL_ERROR'
	}
}
```

## Integration with LimitNode

Create limit expressions as AST nodes:

```typescript
import { limit } from '$lib/mathAST/factory';

// Create lim(x→0) sin(x)/x
const limitNode = limit(
	divide(func('sin', [variable('x')]), variable('x'), 'fraction'),
	'x',
	number('0'),
	'both' // optional direction
);

// Evaluate directly
const result = evaluateLimit(limitNode);

// Or render to LaTeX
toLatex(limitNode);
// "\\lim_{x \\to 0} \\frac{\\sin(x)}{x}"
```

## Module Structure

```
src/lib/mathAST/limits/
├── index.ts           # Public exports
├── types.ts           # Type definitions
├── evaluate.ts        # Main evaluation logic
├── known-limits.ts    # Known limits database
├── one-sided.ts       # One-sided limit handling
├── indeterminate.ts   # Indeterminate form detection
├── lhopital.ts        # L'Hopital's rule
├── algebraic.ts       # Factorization, rationalization
├── squeeze.ts         # Squeeze theorem
└── step-recorder.ts   # Pedagogical step recording
```

## Test Coverage

The module has comprehensive test coverage:

| Test File           | Tests | Description                        |
| ------------------- | ----- | ---------------------------------- |
| `evaluate.test.ts`  | 26    | Main evaluation API                |
| `one-sided.test.ts` | 20    | One-sided limits, discontinuities  |
| `known-limits.test` | 26    | Known limit patterns               |
| `algebraic.test.ts` | 9     | Factorization, rationalization     |
| `lhopital.test.ts`  | 14    | L'Hopital's rule                   |
| `squeeze.test.ts`   | 13    | Squeeze theorem                    |
| `edge-cases.test`   | 126   | Comprehensive edge cases (87 pass) |
| **Total**           | 234   | 195 passing, 39 skipped (future)   |

## Limitations

**Not yet implemented (documented in edge-cases.test.ts):**

- Simple polynomial limits at infinity (`x → +∞`)
- Exponential/logarithmic limits at infinity (`e^x → +∞`, `ln(x) → +∞`)
- Composition limits to infinity (`1/sqrt(x) → +∞` as `x → 0⁺`)
- Absolute value limits (`|x|/x` at `x = 0`)
- Squeeze theorem at infinity

**Supported but limited:**

- L'Hopital limited to 5 iterations by default
- Complex nested compositions may return 'unsupported'

## See Also

- [Differentiation](./calculus.md) - Required for L'Hopital's rule
- [Domain Analysis](./domain.md) - Domain computation for validation
- [Evaluation](./evaluation.md) - Numeric evaluation
- [Factory](./factory-transforms.md) - Node creation helpers
