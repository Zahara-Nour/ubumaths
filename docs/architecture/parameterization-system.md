# Parameterization System Architecture

Architectural overview of the shared parameterization library used by Questions and Exercises features.

**Version:** 2.2.0
**Date:** 2025-11-25

---

## Table of Contents

- [System Overview](#system-overview)
- [Component Architecture](#component-architecture)
- [Design Decisions](#design-decisions)
- [3-Stage Resolution Pipeline](#3-stage-resolution-pipeline)
- [Random Number Generation](#random-number-generation)
- [Random Syntax Quick Reference](#random-syntax-quick-reference-v220)
- [Circular Dependency Detection](#circular-dependency-detection)
- [Integration Points](#integration-points)
- [Performance Characteristics](#performance-characteristics)
- [Migration Strategy](#migration-strategy)

---

## System Overview

### Purpose

The Shared Parameterization Library provides a unified, content-agnostic system for:

1. **Variable Resolution** - Define variables that reference other variables
2. **Random Number Generation** - Generate reproducible random values with constraints
3. **Expression Evaluation** - Evaluate mathematical expressions using MathLive
4. **Validation** - Detect circular dependencies and syntax errors

### Scope

The library is used by:

- **Questions Feature** - Mathematical question templates with parameterized content
- **Exercises Feature** - Exercise content with variable substitution

### Design Principles

1. **Content-Agnostic** - No feature-specific types, logic, or dependencies
2. **Markdown Syntax Only** - Simple, readable `{{}}` syntax for all features
3. **Composable** - Each layer (parser, resolver, validator) can be used independently
4. **Testable** - 447 tests with 99%+ coverage
5. **Type-Safe** - Full TypeScript support with discriminated unions
6. **Reproducible** - Seeded random generation for deterministic results

---

## Component Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Features Layer                           │
│                                                             │
│  ┌───────────────────┐         ┌───────────────────┐      │
│  │ Questions Feature │         │ Exercises Feature │      │
│  │  • Templates      │         │  • Content        │      │
│  │  • Instances      │         │  • Solutions      │      │
│  └─────────┬─────────┘         └─────────┬─────────┘      │
│            │                              │                 │
└────────────┼──────────────────────────────┼─────────────────┘
             │                              │
             └──────────────┬───────────────┘
                            │
              ┌─────────────▼────────────────┐
              │                              │
              │  Shared Parameterization     │
              │  Library                     │
              │                              │
              │  ┌────────────────────────┐  │
              │  │   Parser Layer         │  │
              │  │  ┌──────────────────┐  │  │
              │  │  │  Tokenizer       │  │  │
              │  │  │  • Extract tokens│  │  │
              │  │  │  • Markdown      │  │  │
              │  │  └──────────────────┘  │  │
              │  │  ┌──────────────────┐  │  │
              │  │  │  Variable Parser │  │  │
              │  │  │  • {{var}}       │  │  │
              │  │  └──────────────────┘  │  │
              │  │  ┌──────────────────┐  │  │
              │  │  │  Random Parser   │  │  │
              │  │  │  • {{1..10}}      │  │  │
              │  │  │  • {{random:}}   │  │  │
              │  │  │  • All formats   │  │  │
              │  │  └──────────────────┘  │  │
              │  │  ┌──────────────────┐  │  │
              │  │  │  Eval Parser     │  │  │
              │  │  │  • {{eval:expr}} │  │  │
              │  │  │  • Modifiers     │  │  │
              │  │  └──────────────────┘  │  │
              │  └────────────────────────┘  │
              │              │               │
              │  ┌───────────▼────────────┐  │
              │  │   Resolver Layer       │  │
              │  │  ┌──────────────────┐  │  │
              │  │  │ Variable Resolver│  │  │
              │  │  │  • 3-stage       │  │  │
              │  │  │  • Pipeline      │  │  │
              │  │  └──────────────────┘  │  │
              │  │  ┌──────────────────┐  │  │
              │  │  │ Random Generator │  │  │
              │  │  │  • Seeded PRNG   │  │  │
              │  │  │  • Exclusions    │  │  │
              │  │  └──────────────────┘  │  │
              │  │  ┌──────────────────┐  │  │
              │  │  │  Text Resolver   │  │  │
              │  │  │  • Replace vars  │  │  │
              │  │  └──────────────────┘  │  │
              │  └────────────────────────┘  │
              │              │               │
              │  ┌───────────▼────────────┐  │
              │  │   Validator Layer      │  │
              │  │  ┌──────────────────┐  │  │
              │  │  │ Circular Deps    │  │  │
              │  │  │  • DFS algorithm │  │  │
              │  │  │  • Path tracking │  │  │
              │  │  └──────────────────┘  │  │
              │  │  ┌──────────────────┐  │  │
              │  │  │Variable Validator│  │  │
              │  │  │  • Syntax check  │  │  │
              │  │  │  • Range check   │  │  │
              │  │  └──────────────────┘  │  │
              │  └────────────────────────┘  │
              │                              │
              └──────────────┬───────────────┘
                             │
                ┌────────────▼──────────────┐
                │   MathLive Compute Engine │
                │   • Expression evaluation │
                └───────────────────────────┘
```

### Module Structure

```
src/lib/custom-markdown/parameterization/
├── index.ts                      # Public API exports
│
├── parser/                       # Parser Layer
│   ├── tokenizer.ts             # Extract tokens from text
│   ├── variable-parser.ts       # Parse {{var}}
│   ├── random-parser.ts         # Parse {{1..10}} or {{random:...}}
│   └── eval-parser.ts           # Parse {{eval:expr}}
│
├── resolver/                     # Resolver Layer
│   ├── variable-resolver.ts     # 3-stage variable resolution
│   ├── random-generator.ts      # Seeded random number generation
│   └── text-resolver.ts         # Resolve variables in text
│
└── validator/                    # Validator Layer
    ├── circular-dependency.ts   # DFS cycle detection
    └── variable-validator.ts    # Comprehensive validation
```

**Note**: Types are defined in `src/lib/custom-markdown/types/parameterization.ts`

---

## Design Decisions

### Why Content-Agnostic?

**Problem:** Original implementation was tightly coupled to Questions feature with `QuestionVariable`, `QuestionTemplate`, etc.

**Solution:** Extract into shared library with generic types:

- `QuestionVariable` → `Variable`
- `QuestionTemplate` → (not in shared lib)
- Feature-specific types stay in features

**Benefits:**

- ✅ Reusable by Exercises feature
- ✅ Easier to test in isolation
- ✅ Clear separation of concerns
- ✅ Future features can use it

**Trade-offs:**

- ⚠️ Features must map their types to shared types
- ⚠️ Some feature-specific validation happens at feature level

### Why Markdown Syntax?

**Decision:** Use clean, readable `{{var}}` syntax inspired by common templating languages.

**Benefits:**

- ✅ Easy to read and write
- ✅ Familiar to developers (Handlebars, Mustache, Liquid)
- ✅ Works well in markdown editors and documents
- ✅ Clear visual distinction from code
- ✅ Consistent across all features (Questions and Exercises)

**Syntax:**

- Variables: `{{var}}`
- Random: `{{random:1..10}}` or `{{1..10}}`
- Eval: `{{eval:expr}}` or `{{eval:expr|modifiers}}`

**Historical Note:** The system previously supported dual syntax (`{@:}` / `{{}}`) but was simplified to Markdown-only in Phase 5 for consistency and maintainability.

### Why 3-Stage Resolution?

**Problem:** Variable expressions can contain:

1. References to other variables: `{{a}}`
2. Random number specs: `{{random:1..10}}` or `{{1..10}}`
3. Eval expressions: `{{eval:a+b}}`

These need to be resolved in a specific order.

**Solution:** 3-stage pipeline that processes each variable through:

1. **Stage 1: Replace Variable References** - `{{var}}` → resolved value
2. **Stage 2: Generate Random Numbers** - `{{random:1..10}}` → actual number
3. **Stage 3: Evaluate Expressions** - `{{eval:a+b}}` → calculated result

**Example:**

```typescript
// Input: { name: 'result', expression: '{{eval:{{a}}+{{random:1-5}}}}' }
// Assume: a = 7 (already resolved)

// Stage 1: Replace {{a}} → '7'
//   '{{eval:{{a}}+{{random:1-5}}}}' → '{{eval:7+{{random:1-5}}}}'

// Stage 2: Generate {{random:1-5}} → random value (e.g., 3)
//   '{{eval:7+{{random:1-5}}}}' → '{{eval:7+3}}'

// Stage 3: Evaluate {{eval:7+3}} → 10
//   '{{eval:7+3}}' → '10'

// Final: '10'
```

**Why This Order?**

- Variables must be resolved before random generation (for variable bounds: `{{random:{{min}}..{{max}}}}`)
- Random numbers must be generated before evaluation (for `{{eval:{{random:1..10}}+5}}`)
- Evaluation must be last (for `{{eval:{{a}}+{{b}}}}`)

**Benefits:**

- ✅ Handles complex nested expressions correctly
- ✅ Clear, predictable behavior
- ✅ Each stage is independent and testable
- ✅ Easy to add new stages if needed

### Why DFS for Circular Dependencies?

**Problem:** Variables can reference each other, creating cycles:

```typescript
a → b → c → a  // Circular!
```

**Solution:** Depth-First Search (DFS) with recursion stack tracking.

**Algorithm:**

1. Build dependency graph: `variable → [dependencies]`
2. For each unvisited variable, run DFS
3. Track recursion stack to detect back edges (cycles)
4. When cycle found, reconstruct path from recursion stack

**Why DFS vs BFS or Tarjan's?**

| Algorithm    | Time   | Space | Path Reconstruction | Simplicity |
| ------------ | ------ | ----- | ------------------- | ---------- |
| DFS          | O(V+E) | O(V)  | Easy                | ⭐⭐⭐⭐⭐ |
| BFS          | O(V+E) | O(V)  | Hard                | ⭐⭐⭐     |
| Tarjan's SCC | O(V+E) | O(V)  | Medium              | ⭐⭐       |

**Choice:** DFS - simplest implementation, easy to reconstruct cycle path, same complexity.

**Benefits:**

- ✅ O(V+E) time complexity (optimal)
- ✅ Easy to understand and maintain
- ✅ Provides detailed cycle path for error messages
- ✅ Handles multiple disconnected components

**Example Output:**

```typescript
// Detects: a → b → c → a
{
  valid: false,
  errors: [{
    type: 'circular-dependency',
    message: 'Circular dependency detected: a → b → c → a',
    variable: 'a',
    path: ['a', 'b', 'c', 'a']
  }]
}
```

---

## 3-Stage Resolution Pipeline

### Detailed Flow

```
INPUT: Variable definition
  { name: 'result', expression: '{{eval:{{a}}+{{random:1-5}}}}' }

CONTEXT: Previously resolved variables
  [{ name: 'a', value: '7' }]

┌─────────────────────────────────────────────────────────────┐
│ STAGE 1: Replace Variable References                       │
├─────────────────────────────────────────────────────────────┤
│ 1. Tokenize expression: '{{eval:{{a}}+{{random:1-5}}}}'    │
│ 2. Filter variable tokens: [{{a}}]                          │
│ 3. For each token (reverse order):                          │
│    - Parse: {{a}} → 'a'                                     │
│    - Lookup: resolvedVariables.find(v => v.name === 'a')    │
│    - Replace: '{{eval:{{a}}+{{random:1-5}}}}' →            │
│              '{{eval:7+{{random:1-5}}}}'                    │
│                                                             │
│ OUTPUT: '{{eval:7+{{random:1-5}}}}'                         │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGE 2: Generate Random Numbers                           │
├─────────────────────────────────────────────────────────────┤
│ 1. Tokenize: '{{eval:7+{{random:1-5}}}}'                   │
│ 2. Filter random tokens: [{{random:1-5}}]                   │
│ 3. For each token (reverse order):                          │
│    - Parse: {{random:1-5}} → { type: 'integer', ... }      │
│    - Generate: generateRandomNumber(spec, seed) → 3         │
│    - Replace: '{{eval:7+{{random:1-5}}}}' → '{{eval:7+3}}' │
│                                                             │
│ OUTPUT: '{{eval:7+3}}'                                      │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGE 3: Evaluate Expressions                              │
├─────────────────────────────────────────────────────────────┤
│ 1. Tokenize: '{{eval:7+3}}'                                │
│ 2. Filter eval tokens: [{{eval:7+3}}]                       │
│ 3. For each token (reverse order):                          │
│    - Parse: {{eval:7+3}} → '7+3'                           │
│    - Resolve vars in expression (if any): '7+3' (none)      │
│    - Evaluate: evaluateExpression('7+3') → 10               │
│    - Replace: '{{eval:7+3}}' → '10'                        │
│                                                             │
│ OUTPUT: '10'                                                │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
                 FINAL RESULT: '10'
```

### Stage 1: Variable Reference Replacement

**Input:** Expression with variable references
**Output:** Expression with variable values substituted

**Process:**

1. Tokenize expression to find all `{{var}}` tokens
2. For each token (reverse order to preserve positions):
   - Parse variable name
   - Lookup in resolved variables
   - Replace token with resolved value
   - Throw error if variable not found

**Example:**

```typescript
// Input
expression: '{{a}} + {{b}}'
resolved: [{ name: 'a', value: '5' }, { name: 'b', value: '10' }]

// Process
tokens: [{{a}}, {{b}}]
replace {{b}}: '{{a}} + 10'
replace {{a}}: '5 + 10'

// Output
'5 + 10'
```

**Handles:**

- Simple references: `{{a}}`
- Nested in random: `{{random:{{min}}..{{max}}}}`
- Nested in eval: `{{eval:{{a}}+{{b}}}}`
- Multiple references: `{{a}} + {{b}} - {{c}}`

### Stage 2: Random Number Generation

**Input:** Expression with random specs
**Output:** Expression with actual random numbers

**Process:**

1. Tokenize expression to find all `{{random:...}}` or shorthand `{{1..10}}` tokens
2. For each token (reverse order):
   - Parse random specification
   - Resolve variable bounds/exclusions using resolved variables
   - Generate random number with seed
   - Replace token with generated value

**Example:**

```typescript
// Input
expression: '{{random:1..10}}'
seed: 12345

// Process
parse: { type: 'integer', min: 1, max: 10, exclusions: [] }
generate: 7 (deterministic with seed)
replace: '7'

// Output
'7'
```

**With variable bounds:**

```typescript
// Input
expression: '{{random:{{min}}..{{max}}}}'
resolved: [{ name: 'min', value: '1' }, { name: 'max', value: '100' }]

// Process (after Stage 1 already replaced variables)
expression: '{{random:1-100}}'
parse: { type: 'integer', min: 1, max: 100, exclusions: [] }
generate: 42
replace: '42'

// Output
'42'
```

**Handles:**

- Integer range: `{{1..10}}` or `{{1..10}}`
- Negative ranges: `{{-3..-1}}` (double-dot clearer with negatives)
- Relative integers: `{{2..9;±}}` → union of {-9..-2} ∪ {2..9}
- Decimal by digits: `{{2.3}}` (2 digits before, 3 after)
- Decimal range: `{{1..1.6}}` (auto-step=0.1) or `{{0.5..9.99:0.01}}` (explicit step)
- Exclusions: `{{1..10!5,7-9}}` or `{{1..20!5..7}}`
- Variable bounds: `{{{{min}}..{{max}}}}` or `{{{{min}}..{{max}}}}`

### Stage 3: Expression Evaluation

**Input:** Expression with eval tokens
**Output:** Expression with evaluated results

**Process:**

1. Tokenize expression to find all `{{eval:...}}` tokens
2. For each token (reverse order):
   - Parse eval expression
   - Resolve any remaining variable references inside expression
   - Pass clean expression to MathLive Compute Engine
   - Replace token with evaluation result

**Example:**

```typescript
// Input
expression: '{{eval:5+10}}'

// Process
parse: '5+10'
evaluate: evaluateExpression('5+10') → 15
replace: '15'

// Output
'15'
```

**With variable references (resolved in Stage 3):**

```typescript
// Input (after Stage 1 and 2)
expression: '{{eval:5+10}}'  // Already resolved

// But if eval contains variables:
expression: '{{eval:{{a}}+{{b}}}}'
resolved: [{ name: 'a', value: '5' }, { name: 'b', value: '10' }]

// Process
parse: '{{a}}+{{b}}'
resolve vars: '5+10'
evaluate: evaluateExpression('5+10') → 15
replace: '15'

// Output
'15'
```

**Handles:**

- Simple expressions: `{{eval:3+4}}`
- With variables: `{{eval:{{a}}+{{b}}}}`
- Complex expressions: `{{eval:({{a}})^2-{{b}}}}`
- LaTeX expressions: `{{eval:\frac{1}{2}}}`
- With modifiers: `{{eval:1/3;d}}`, `{{eval:x;+,()}}`

### Eval Expression Modifiers

**Added:** 2025-11-25

Eval expressions support optional modifiers to control output formatting:

**Syntax:** `{{eval:expression;modifiers}}`

**Modifier Types:**

| Short | Long         | Effect                     | Example                       |
| ----- | ------------ | -------------------------- | ----------------------------- |
| `d`   | `decimal`    | Force decimal output       | `{{eval:1/3;d}}` → "0.333..." |
| `+`   | `positive`   | Add + sign for positive    | `{{eval:5;+}}` → "+5"         |
| `()`  | `bracket`    | Bracket negative values    | `{{eval:-3;()}}` → "(-3)"     |
| `'`   | `derivative` | Take derivative (reserved) | Future feature                |

**Modifier Parsing:**

```typescript
interface ParsedEvalExpression {
	expression: string; // The math expression
	modifiers: EvalModifiers; // Optional formatting modifiers
}

interface EvalModifiers {
	decimal?: boolean; // d: Force decimal
	addPositive?: boolean; // +: Add + sign
	bracketNegative?: boolean; // (): Wrap negatives
	derivative?: boolean; // ': Derivative (reserved)
}
```

**Implementation Details:**

1. **Modifier Detection:** Parser uses semicolon separator to distinguish modifiers from expression content:
   - `{{eval:|x|}}` → No modifiers (LaTeX absolute value)
   - `{{eval:|x|;d}}` → Decimal modifier (after semicolon)
   - Valid modifiers: Only contain `d`, `+`, `()`, `'`, and word variants

2. **Modifier Application:** Applied after evaluation in Stage 3:

   ```typescript
   // Evaluate expression
   const numericResult = evaluateExpression(expression);

   // Apply modifiers
   if (modifiers.decimal) {
   	result = result.toFixed(precision);
   }
   if (modifiers.addPositive && result >= 0) {
   	result = `+${result}`;
   }
   if (modifiers.bracketNegative && result < 0) {
   	result = `(${result})`;
   }
   ```

3. **Combined Modifiers:** Multiple modifiers applied in order:
   - Decimal conversion (if needed)
   - Positive sign addition
   - Negative bracketing

**Use Cases:**

- **Temperature formatting:** `{{eval:{{temp}};+}}` → "+15" or "-5"
- **Equation coefficients:** `{{eval:{{b}};+,()}}` → "+3" or "(-3)"
- **Decimal results:** `{{eval:{{a}}/{{b}};d}}` → "0.333..." instead of fraction

---

## Random Number Generation

### Seeded PRNG

Uses Linear Congruential Generator (LCG) for reproducibility:

```typescript
function seededRandom(seed: number): number {
	// LCG parameters (Park and Miller)
	const a = 1103515245;
	const c = 12345;
	const m = 2147483648; // 2^31

	seed = (a * seed + c) % m;
	return seed / m; // Normalize to [0, 1)
}
```

**Properties:**

- **Deterministic:** Same seed → same sequence
- **Uniform distribution:** Equal probability across range
- **Fast:** O(1) per number
- **Reproducible:** Essential for testing and debugging

### Integer Range Generation

```typescript
// Generate integer in [min, max] with exclusions
function generateInteger(min: number, max: number, exclusions: number[], seed: number): number {
	const validNumbers = [];
	for (let i = min; i <= max; i++) {
		if (!exclusions.includes(i)) {
			validNumbers.push(i);
		}
	}

	if (validNumbers.length === 0) {
		throw new Error('No valid numbers after exclusions');
	}

	const random = seededRandom(seed);
	const index = Math.floor(random * validNumbers.length);
	return validNumbers[index];
}
```

### Decimal Generation

**By Digits:**

```typescript
// Generate decimal with specified digits before/after decimal point
// Example: digitsBefore=2, digitsAfter=3 → "45.123"

function generateDecimalByDigits(digitsBefore: number, digitsAfter: number, seed: number): string {
	const beforeMax = Math.pow(10, digitsBefore) - 1;
	const afterMax = Math.pow(10, digitsAfter) - 1;

	const beforePart = generateInteger(1, beforeMax, [], seed);
	const afterPart = generateInteger(0, afterMax, [], seed + 1);

	const afterStr = String(afterPart).padStart(digitsAfter, '0');
	return `${beforePart}.${afterStr}`;
}
```

**By Range with Step:**

```typescript
// Generate decimal in range with step
// Example: min=0.5, max=9.99, step=0.01

function generateDecimalRange(
	min: number,
	max: number,
	step: number,
	exclusions: number[],
	seed: number
): number {
	const validNumbers = [];
	for (let i = min; i <= max; i += step) {
		const rounded = Math.round(i / step) * step; // Avoid floating point errors
		if (!exclusions.includes(rounded)) {
			validNumbers.push(rounded);
		}
	}

	const random = seededRandom(seed);
	const index = Math.floor(random * validNumbers.length);
	return validNumbers[index];
}
```

### Exclusion Handling

Exclusions are resolved from the RandomSpec during generation:

```typescript
interface Exclusion {
	type: 'value' | 'range';
	value?: NumberOrVariable; // For type 'value'
	min?: NumberOrVariable; // For type 'range'
	max?: NumberOrVariable; // For type 'range'
}

// Resolve exclusions to actual numbers
function resolveExclusions(
	exclusions: Exclusion[],
	resolvedVariables: ResolvedVariable[]
): number[] {
	const excludedNumbers: number[] = [];

	for (const exclusion of exclusions) {
		if (exclusion.type === 'value') {
			const value = resolveNumberOrVariable(exclusion.value, resolvedVariables);
			excludedNumbers.push(value);
		} else if (exclusion.type === 'range') {
			const min = resolveNumberOrVariable(exclusion.min, resolvedVariables);
			const max = resolveNumberOrVariable(exclusion.max, resolvedVariables);
			for (let i = min; i <= max; i++) {
				excludedNumbers.push(i);
			}
		}
	}

	return excludedNumbers;
}
```

**Example:**

```typescript
// Exclusion: {#:1-20!5,7-9,{@:a}}
// Assume: a = 12

exclusions: [
	{ type: 'value', value: { type: 'number', value: 5 } },
	{ type: 'range', min: { type: 'number', value: 7 }, max: { type: 'number', value: 9 } },
	{ type: 'value', value: { type: 'variable', name: 'a' } }
];

resolveExclusions(exclusions, [{ name: 'a', value: '12' }]);
// → [5, 7, 8, 9, 12]
```

### Relative Integer Generation (v2.2.0)

**Purpose:** Generate random integers from symmetric positive/negative ranges, excluding zero.

**Syntax:** `{{min..max;±}}` where min and max are positive integers

**Semantics:** Generates from union of {-max..-min} ∪ {min..max}

**Example:**

```typescript
// {{2..9;±}} generates from:
// {-9, -8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9}
// Never generates: -1, 0, or 1

// With exclusion: {{2..9;±!5}}
// Excludes both +5 and -5
```

**Use Cases:**

- Non-zero coefficients in equations
- Non-trivial factors in factorization problems
- Signed integers without zero

### Auto-Step Inference (v2.2.0)

When using decimal ranges without an explicit step, the step is inferred from the decimal places:

```typescript
// Auto-step examples:
{{1..1.6}}      // step = 0.1 (1 decimal in max)
{{1..1.25}}     // step = 0.01 (2 decimals in max)
{{0.5..2.5}}    // step = 0.1 (1 decimal in both)
{{1.25..2}}     // step = 0.01 (2 decimals in min)

// Explicit step overrides auto-step:
{{1..2:0.5}}    // step = 0.5 (explicit)
```

**Algorithm:**

```typescript
function inferStep(minStr: string, maxStr: string): number {
	const minDecimals = (minStr.split('.')[1] || '').length;
	const maxDecimals = (maxStr.split('.')[1] || '').length;
	const precision = Math.max(minDecimals, maxDecimals);
	return precision === 0 ? 1 : Math.pow(10, -precision);
}
```

---

## Random Syntax Quick Reference (v2.2.0)

### Range Separators

| Separator           | Example      | Result     | Notes                             |
| ------------------- | ------------ | ---------- | --------------------------------- |
| `-` (dash)          | `{{3..5}}`   | 3, 4, 5    | Traditional, backward compatible  |
| `..` (double-dot)   | `{{3..5}}`   | 3, 4, 5    | Clearer, especially for negatives |
| `..` with negatives | `{{-3..-1}}` | -3, -2, -1 | Much clearer than `{{-3..-1}}`    |

### Integer Ranges

| Syntax           | Description                  |
| ---------------- | ---------------------------- |
| `{{1..10}}`      | Integer 1 to 10              |
| `{{1..10}}`      | Integer 1 to 10 (double-dot) |
| `{{-5..5}}`      | Integer -5 to 5              |
| `{{-3..-1}}`     | Negative integers -3 to -1   |
| `{{1..10!5}}`    | 1 to 10 excluding 5          |
| `{{1..10!3..5}}` | 1 to 10 excluding 3, 4, 5    |

### Relative Integers (±)

| Syntax         | Generated Values                 |
| -------------- | -------------------------------- |
| `{{2..9;±}}`   | {-9..-2} ∪ {2..9}                |
| `{{1..9;±}}`   | {-9..-1} ∪ {1..9} (all non-zero) |
| `{{2..9;±!5}}` | Same but excludes ±5             |

### Decimal by Digits

| Syntax    | Description              | Example Output |
| --------- | ------------------------ | -------------- |
| `{{2.3}}` | 2 digits before, 3 after | 45.123         |
| `{{1.2}}` | 1 digit before, 2 after  | 7.42           |
| `{{0.1}}` | 0 digits before, 1 after | 0.3            |

### Decimal Ranges

| Syntax               | Step            | Example Values           |
| -------------------- | --------------- | ------------------------ |
| `{{1..1.6}}`         | 0.1 (auto)      | 1, 1.1, 1.2, ..., 1.6    |
| `{{1..1.25}}`        | 0.01 (auto)     | 1, 1.01, 1.02, ..., 1.25 |
| `{{0.5..9.99:0.01}}` | 0.01 (explicit) | 0.5, 0.51, ..., 9.99     |
| `{{1..2:0.5}}`       | 0.5 (explicit)  | 1, 1.5, 2                |

### Variables and Exclusions

| Syntax                            | Description                  |
| --------------------------------- | ---------------------------- |
| `{{{{min}}..{{max}}}}`            | Variable bounds              |
| `{{1..10!{{a}}}}`                 | Exclude variable value       |
| `{{{{min}}..{{max}};±!{{excl}}}}` | Full relative with variables |

---

## Circular Dependency Detection

### Dependency Graph

Build a directed graph where each variable points to its dependencies:

```typescript
// Variables
[
  { name: 'a', expression: '{@:b}' },
  { name: 'b', expression: '{@:c}' },
  { name: 'c', expression: '{@:a}' }
]

// Graph
{
  'a' → ['b'],
  'b' → ['c'],
  'c' → ['a']
}
```

### Dependency Extraction

Extract dependencies from all token types:

```typescript
function getVariableNames(expression: string): string[] {
	const tokens = tokenize(expression);
	const names: string[] = [];

	for (const token of tokens) {
		if (token.type === 'variable') {
			// Direct reference: {{a}}
			names.push(parseVariableReference(token.content));
		} else if (token.type === 'random') {
			// Inside random spec: {{random:{{min}}..{{max}}!{{exclude}}}}
			const spec = parseRandomSpec(token.content);
			if (spec.type === 'integer' || spec.type === 'decimal-range') {
				if (spec.min.type === 'variable') names.push(spec.min.name);
				if (spec.max.type === 'variable') names.push(spec.max.name);
			}
			for (const exclusion of spec.exclusions) {
				if (exclusion.type === 'value' && exclusion.value.type === 'variable') {
					names.push(exclusion.value.name);
				}
				// ... handle range exclusions
			}
		} else if (token.type === 'eval') {
			// Inside eval: {{eval:{{a}}+{{b}}}}
			const expr = parseEvalExpression(token.content);
			names.push(...getVariableNames(expr)); // Recursive
		}
	}

	return names;
}
```

### DFS Cycle Detection

```typescript
function findCycle(
	node: string,
	graph: Map<string, string[]>,
	visited: Set<string>,
	recStack: Set<string>,
	path: string[]
): string[] | null {
	// Mark as visiting
	visited.add(node);
	recStack.add(node);
	path.push(node);

	const neighbors = graph.get(node) || [];

	for (const neighbor of neighbors) {
		if (!visited.has(neighbor)) {
			// Continue DFS
			const cycle = findCycle(neighbor, graph, visited, recStack, path);
			if (cycle) return cycle;
		} else if (recStack.has(neighbor)) {
			// Back edge detected → cycle found
			const cycleStart = path.indexOf(neighbor);
			const cyclePath = path.slice(cycleStart);
			cyclePath.push(neighbor); // Complete the cycle
			return cyclePath;
		}
	}

	// Backtrack
	recStack.delete(node);
	path.pop();
	return null;
}
```

**Example Execution:**

```typescript
// Graph: a → b → c → a

findCycle('a', graph, {}, {}, [])
  visited: {a}
  recStack: {a}
  path: [a]

  neighbor: b (not visited)
    findCycle('b', graph, {a}, {a}, [a])
      visited: {a, b}
      recStack: {a, b}
      path: [a, b]

      neighbor: c (not visited)
        findCycle('c', graph, {a, b}, {a, b}, [a, b])
          visited: {a, b, c}
          recStack: {a, b, c}
          path: [a, b, c]

          neighbor: a (visited AND in recStack) → CYCLE!
            cycleStart: path.indexOf('a') = 0
            cyclePath: path.slice(0) = [a, b, c]
            cyclePath.push('a') = [a, b, c, a]
            return [a, b, c, a]
```

---

## Integration Points

### Questions Feature Integration

```typescript
// src/lib/questions/generator/instance-generator.ts

import { resolveVariables, resolveText } from '$lib/custom-markdown';

export function generateInstance(template: QuestionTemplate, seed?: number): QuestionInstance {
	// Map QuestionVariable[] to Variable[]
	const variables = template.variations[variationIndex].variables.map((v) => ({
		name: v.name,
		expression: v.expression
	}));

	// Resolve using shared library
	const resolved = resolveVariables(variables, seed);

	// Resolve statement
	const statement = template.variations[variationIndex].statement.map((field) => {
		if (field.type === 'text') {
			return {
				type: 'text',
				content: resolveText(field.content, resolved)
			};
		}
		return field; // Images unchanged
	});

	// Resolve answer
	const answer = resolveText(template.variations[variationIndex].answer, resolved);

	return { statement, answer /* ... */ };
}
```

### Exercises Feature Integration

```typescript
// src/lib/exercises/generator.ts

import { resolveVariables, resolveText } from '$lib/custom-markdown';

export function generateExerciseInstance(exercise: Exercise, seed?: number): ExerciseInstance {
	// Map exercise variables to shared Variable type
	const variables = exercise.variables.map((v) => ({
		name: v.name,
		expression: v.expression
	}));

	// Resolve using shared library
	const resolved = resolveVariables(variables, seed);

	// Resolve content
	const content = resolveText(exercise.content, resolved);
	const solution = resolveText(exercise.solution, resolved);

	return { content, solution /* ... */ };
}
```

### MathLive Integration

The shared library uses MathLive's Compute Engine for expression evaluation:

```typescript
// src/lib/math/compute-engine/wrapper.ts

import { ComputeEngine } from '@cortexjs/compute-engine';

const ce = new ComputeEngine();

export function evaluateExpression(expr: string): number {
	try {
		const result = ce.parse(expr).N().value;
		if (typeof result === 'number') {
			return result;
		}
		throw new Error(`Evaluation did not return a number: ${result}`);
	} catch (error) {
		throw new Error(`Failed to evaluate "${expr}": ${error.message}`);
	}
}
```

**Integration Point:**

- Shared library calls `evaluateExpression()` in Stage 3 of resolution pipeline
- Expression is already fully resolved (no `{@:}` or `{#:}` tokens)
- MathLive only sees clean mathematical expressions with numbers

---

## Performance Characteristics

### Time Complexity

| Operation                | Complexity | Notes                                        |
| ------------------------ | ---------- | -------------------------------------------- |
| **Tokenize**             | O(n)       | n = text length, single pass                 |
| **Parse Token**          | O(1)       | Fixed parsing per token                      |
| **Resolve Variable**     | O(v × t)   | v = variables, t = avg tokens per expression |
| **Generate Random**      | O(r)       | r = range size (for exclusions)              |
| **Detect Circular Deps** | O(V + E)   | V = variables, E = dependencies              |
| **Validate Variables**   | O(V + E)   | Same as circular deps                        |

### Space Complexity

| Structure              | Complexity | Notes                    |
| ---------------------- | ---------- | ------------------------ |
| **Token Array**        | O(t)       | t = total tokens in text |
| **Dependency Graph**   | O(V + E)   | V = variables, E = edges |
| **Resolved Variables** | O(V)       | One entry per variable   |
| **Exclusion Array**    | O(e)       | e = excluded values      |

### Real-World Performance

Based on benchmarks with typical question templates:

| Metric                     | Typical | Max Tested |
| -------------------------- | ------- | ---------- |
| **Variables per template** | 5-10    | 50         |
| **Resolution time**        | <10ms   | <50ms      |
| **Validation time**        | <5ms    | <20ms      |
| **Memory usage**           | <1MB    | <5MB       |

### Optimization Strategies

1. **Reverse Token Replacement** - Replace tokens from end to start preserves positions
2. **Seeded PRNG** - Fast O(1) random generation vs crypto-secure
3. **DFS over BFS** - Less memory, same time complexity
4. **Early Validation** - Catch errors before resolution
5. **Lazy Evaluation** - Only resolve variables when needed (future)

---

## Migration History

### Phase 1: Extract from Questions (✅ Complete)

**Goals:**

- Create shared library in `src/lib/shared/parameterization/`
- Support dual syntax (Questions + Markdown)
- Achieve 99%+ test coverage
- Zero breaking changes to Questions feature

**Completed:**

- ✅ Extracted parser layer (tokenizer, parsers, converter)
- ✅ Extracted resolver layer (variable resolver, random generator, text resolver)
- ✅ Extracted validator layer (circular dependency detector, variable validator)
- ✅ Created 447 comprehensive tests
- ✅ Added dual syntax support

### Phase 2: Refactor Questions (✅ Complete)

**Goals:**

- Refactor Questions to use shared library
- Maintain backward compatibility
- Preserve all existing functionality
- Update UI with syntax selector

**Completed:**

- ✅ Updated Questions to import from shared library
- ✅ Added syntax parameter to all calls
- ✅ Migrated ContentField resolution to use shared resolver
- ✅ Added syntax selector to question editor UI
- ✅ All 367 Questions tests still passing

### Phase 3: Integrate with Exercises (✅ Complete)

**Goals:**

- Add variable system to Exercises feature
- Use Markdown syntax by default
- Reuse all shared library functionality

**Completed:**

- ✅ Created Exercises variable UI
- ✅ Integrated shared library for exercise generation
- ✅ Added exercise-specific documentation

### Phase 4: Simplify to Markdown-Only (✅ Complete)

**Goals:**

- Remove dual syntax complexity
- Migrate all Questions content to Markdown syntax
- Simplify codebase and documentation

**Completed:**

- ✅ Database migration (removed syntax column from question_templates)
- ✅ Code migration (removed syntax parameters, syntax converter)
- ✅ Test migration (447 tests updated to Markdown syntax)
- ✅ UI migration (removed syntax selector from question editor)
- ✅ Documentation migration (all docs updated to Markdown syntax)

### Phase 5: Production Release (✅ Complete)

**Goals:**

- Finalize documentation
- Verify all references to dual syntax removed
- Update version numbers to 2.0.0

**Completed:**

- ✅ Updated all documentation files
- ✅ Removed all dual syntax references
- ✅ Version bumped to 2.0.0
- ✅ System marked as Production Ready

## Future Enhancements

**Potential Enhancements:**

- Token caching for performance
- More random number formats
- Custom functions in eval
- Variable scoping
- Conditional expressions

---

## Future Considerations

### Potential Enhancements

1. **Token Caching**

   ```typescript
   // Cache tokenization results for repeated use
   const tokenCache = new Map<string, Token[]>();
   ```

2. **More Random Formats**
   - Random from list: `{{choice:apple,banana,orange}}`
   - Weighted random: `{{weighted:1:5,2:3,3:2}}`
   - Normal distribution: `{{normal:mean=10,stddev=2}}`

3. **Variable Scoping**

   ```typescript
   // Local vs global variables
   { name: 'a', expression: '5', scope: 'global' }
   { name: 'temp', expression: '{{a}}*2', scope: 'local' }
   ```

4. **Conditional Expressions**

   ```typescript
   // If-then-else in expressions
   {{if:{{a}}>5:{{b}}:{{c}}}}
   ```

5. **Custom Functions**
   ```typescript
   // Register custom functions
   registerFunction('gcd', (a, b) => /* ... */);
   // Use in expressions
   {{eval:gcd(12,8)}}
   ```

### Backward Compatibility

When adding new features:

1. **Never break existing syntax** - Add new, don't modify old
2. **Version API** - Consider versioned exports if needed
3. **Feature detection** - Check token type before processing
4. **Graceful degradation** - Unknown tokens treated as literals
5. **Comprehensive testing** - Test old syntax still works

---

## Resources

- **Custom Markdown Module:** [`/src/lib/custom-markdown/`](/src/lib/custom-markdown/)
- **Parameterization Types:** [`/src/lib/custom-markdown/types/parameterization.ts`](/src/lib/custom-markdown/types/parameterization.ts)
- **Questions Documentation:** [`/docs/features/questions/`](/docs/features/questions/)
- **Exercises Documentation:** [`/docs/features/exercises/`](/docs/features/exercises/)
- **MathLive Compute Engine:** https://cortexjs.io/compute-engine/

---

**Version:** 2.1.0
**Last Updated:** 2025-11-25
**Status:** Production Ready
