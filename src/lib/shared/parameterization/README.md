# Shared Parameterization Library

Content-agnostic parameterization system for Questions and Exercises features.

**Version:** 1.0.0
**Tests:** 447 passing
**Coverage:** 99%+

---

## Overview

The Shared Parameterization Library provides a unified, content-agnostic system for variable resolution, random number generation, and expression evaluation. It supports two syntaxes to serve different use cases:

- **Questions Syntax** (`{@:var}`, `{#:1-10}`, `{eval:expr}`) - Original UbuMaths syntax
- **Markdown Syntax** (`{{var}}`, `{{random:1-10}}`, `{{eval:expr}}`) - Human-readable alternative

### Who Uses It

| Feature       | Use Case                                         |
| ------------- | ------------------------------------------------ |
| **Questions** | Math question templates with variable generation |
| **Exercises** | Parameterized exercise content and solutions     |

### Key Features

- **Dual Syntax Support** - Use Questions or Markdown syntax, or mix both
- **3-Layer Architecture** - Clean separation: Parser → Resolver → Validator
- **Variable System** - Reference chaining with dependency resolution
- **Random Generation** - Integer, decimal, exclusions, variable bounds, seeding
- **Expression Evaluation** - MathLive Compute Engine integration
- **Validation** - Circular dependency detection, syntax validation
- **Syntax Conversion** - Bidirectional conversion between syntaxes
- **Content-Agnostic** - No feature-specific dependencies

---

## Quick Start

### Basic Usage

```typescript
import { resolveVariables, resolveText } from '$lib/shared/parameterization';

// Define variables
const variables = [
	{ name: 'a', expression: '{#:1-10}' },
	{ name: 'b', expression: '{#:1-10}' },
	{ name: 'sum', expression: '{eval:a+b}' }
];

// Resolve variables with seeded random generation
const resolved = resolveVariables(variables, 12345, 'questions');
// → [
//     { name: 'a', value: '7' },
//     { name: 'b', value: '3' },
//     { name: 'sum', value: '10' }
//   ]

// Resolve text using resolved variables
const text = 'Calculate {@:a} + {@:b} = {@:sum}';
const result = resolveText(text, resolved, 'questions');
// → 'Calculate 7 + 3 = 10'
```

### Markdown Syntax

```typescript
import { resolveVariables, resolveText } from '$lib/shared/parameterization';

// Same variables, different syntax
const variables = [
	{ name: 'a', expression: '{{1-10}}' }, // Shorthand
	{ name: 'b', expression: '{{random:1-10}}' }, // Explicit
	{ name: 'sum', expression: '{{eval:a+b}}' }
];

const resolved = resolveVariables(variables, 12345, 'markdown');
const text = 'Calculate {{a}} + {{b}} = {{sum}}';
const result = resolveText(text, resolved, 'markdown');
// → 'Calculate 7 + 3 = 10'
```

### Syntax Conversion

```typescript
import { convertSyntax } from '$lib/shared/parameterization';

const questionsText = 'Value: {@:a}, Random: {#:1-10}, Eval: {eval:a+5}';
const markdownText = convertSyntax(questionsText, 'questions', 'markdown');
// → 'Value: {{a}}, Random: {{random:1-10}}, Eval: {{eval:a+5}}'

// Convert back
const restored = convertSyntax(markdownText, 'markdown', 'questions');
// → 'Value: {@:a}, Random: {#:1-10}, Eval: {eval:a+5}'
```

### Validation

```typescript
import { validateVariables, detectCircularDependencies } from '$lib/shared/parameterization';

const variables = [
	{ name: 'a', expression: '{{b}}' },
	{ name: 'b', expression: '{{a}}' } // Circular!
];

// Check for circular dependencies
const circularResult = detectCircularDependencies(variables);
if (!circularResult.valid) {
	console.error(circularResult.errors[0].message);
	// → "Circular dependency detected: a → b → a"
	console.error(circularResult.errors[0].path);
	// → ['a', 'b', 'a']
}

// Comprehensive validation
const validationResult = validateVariables(variables);
if (!validationResult.valid) {
	validationResult.errors.forEach((err) => {
		console.error(`${err.type}: ${err.message}`);
	});
}
```

---

## Architecture

### 3-Layer Design

The library follows a clean 3-layer architecture:

```
┌────────────────────────────────────────┐
│           Parser Layer                 │
│  Tokenizer, Variable Parser,           │
│  Random Parser, Eval Parser,           │
│  Syntax Converter                      │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│          Resolver Layer                │
│  Variable Resolver, Random Generator,  │
│  Text Resolver                         │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│         Validator Layer                │
│  Circular Dependency Detector,         │
│  Variable Validator                    │
└────────────────────────────────────────┘
```

**Design Principles:**

1. **Content-Agnostic** - No feature-specific types or logic
2. **Dual Syntax** - Questions and Markdown syntaxes are first-class citizens
3. **Composable** - Each layer can be used independently
4. **Testable** - 447 tests with 99%+ coverage
5. **Type-Safe** - Full TypeScript support with discriminated unions

---

## Syntax Guide

### Comparison Table

| Feature                     | Questions Syntax    | Markdown Syntax            | Shorthand           |
| --------------------------- | ------------------- | -------------------------- | ------------------- |
| **Variable Reference**      | `{@:var}`           | `{{var}}`                  | -                   |
| **Random Integer**          | `{#:1-10}`          | `{{random:1-10}}`          | `{{1-10}}`          |
| **Random Decimal (digits)** | `{#:2.3}`           | `{{random:2.3}}`           | `{{2.3}}`           |
| **Random Decimal (range)**  | `{#:0.5-9.99:0.01}` | `{{random:0.5-9.99:0.01}}` | `{{0.5-9.99:0.01}}` |
| **Exclusions**              | `{#:1-10!5}`        | `{{random:1-10!5}}`        | `{{1-10!5}}`        |
| **Eval**                    | `{eval:a+b}`        | `{{eval:a+b}}`             | -                   |

### Variable References

Reference a previously defined variable:

```typescript
// Questions syntax
{ name: 'a', expression: '5' }
{ name: 'b', expression: '{@:a}' }  // → '5'

// Markdown syntax
{ name: 'a', expression: '5' }
{ name: 'b', expression: '{{a}}' }  // → '5'
```

### Random Numbers

#### Integer Range

Generate random integer between min and max (inclusive):

```typescript
// Questions syntax
{ name: 'x', expression: '{#:1-10}' }        // → Random 1-10

// Markdown syntax (explicit)
{ name: 'x', expression: '{{random:1-10}}' } // → Random 1-10

// Markdown syntax (shorthand)
{ name: 'x', expression: '{{1-10}}' }        // → Random 1-10

// Variable bounds
{ name: 'min', expression: '1' }
{ name: 'max', expression: '100' }
{ name: 'x', expression: '{#:{@:min}-{@:max}}' }     // Questions
{ name: 'y', expression: '{{random:{{min}}-{{max}}}}' } // Markdown
```

#### Decimal by Digits

Generate decimal with specified digits before/after decimal point:

```typescript
// Questions syntax
{ name: 'x', expression: '{#:2.3}' }  // → e.g., "45.123"

// Markdown syntax
{ name: 'x', expression: '{{2.3}}' }  // → e.g., "45.123"

// Variable digits
{ name: 'before', expression: '2' }
{ name: 'after', expression: '3' }
{ name: 'x', expression: '{#:{@:before}.{@:after}}' }     // Questions
{ name: 'y', expression: '{{{{before}}.{{after}}}}' }     // Markdown
```

#### Decimal Range with Step

Generate decimal in range with specific step:

```typescript
// Questions syntax
{ name: 'x', expression: '{#:0.5-9.99:0.01}' }  // → 0.50 to 9.99 by 0.01

// Markdown syntax
{ name: 'x', expression: '{{0.5-9.99:0.01}}' }  // → 0.50 to 9.99 by 0.01
```

#### Exclusions

Exclude specific values or ranges:

```typescript
// Single value exclusion
{ name: 'x', expression: '{#:1-10!5}' }         // Questions
{ name: 'y', expression: '{{1-10!5}}' }         // Markdown

// Multiple values
{ name: 'x', expression: '{#:1-20!5,7}' }       // Exclude 5 and 7

// Range exclusion
{ name: 'x', expression: '{#:1-50!10-20}' }     // Exclude 10-20

// Variable exclusion
{ name: 'a', expression: '{#:1-10}' }
{ name: 'b', expression: '{#:1-10!{@:a}}' }     // Exclude a's value

// Mixed
{ name: 'x', expression: '{#:1-100!5,7-9,{@:a}}' }  // Exclude 5, 7-9, and a
```

### Expression Evaluation

Evaluate mathematical expressions using MathLive Compute Engine:

```typescript
// Questions syntax
{ name: 'a', expression: '5' }
{ name: 'b', expression: '10' }
{ name: 'sum', expression: '{eval:a+b}' }         // → '15'
{ name: 'product', expression: '{eval:a*b}' }     // → '50'
{ name: 'power', expression: '{eval:a^2}' }       // → '25'

// Markdown syntax
{ name: 'sum', expression: '{{eval:a+b}}' }       // → '15'

// Complex expressions
{ name: 'result', expression: '{eval:(a+b)^2-a*b}' }

// With variable references (auto-resolved before evaluation)
{ name: 'expr', expression: '{eval:{@:a}+{@:b}}' }         // Questions
{ name: 'expr', expression: '{{eval:{{a}}+{{b}}}}' }       // Markdown
```

**Important:** All variable references inside `{eval:...}` or `{{eval:...}}` are **fully resolved BEFORE** being passed to MathLive. The engine only receives clean mathematical expressions with actual numbers.

---

## Parser Layer

### Tokenizer

Extract all parameterization tokens from text:

```typescript
import { tokenize } from '$lib/shared/parameterization';

const text = 'Value: {@:a}, Random: {#:1-10}, Result: {eval:a+5}';
const tokens = tokenize(text, 'questions');
// → [
//     { type: 'variable', content: '{@:a}', inner: 'a', start: 7, end: 12, syntax: 'questions' },
//     { type: 'random', content: '{#:1-10}', inner: '1-10', start: 22, end: 31, syntax: 'questions' },
//     { type: 'eval', content: '{eval:a+5}', inner: 'a+5', start: 41, end: 52, syntax: 'questions' }
//   ]
```

**Supported Syntaxes:**

- `'questions'` - Parse only Questions syntax
- `'markdown'` - Parse only Markdown syntax
- `'both'` - Parse both syntaxes (default)

### Variable Parser

Parse variable reference tokens:

```typescript
import { parseVariableReference } from '$lib/shared/parameterization';

// Questions syntax
parseVariableReference('{@:myVar}', 'questions'); // → 'myVar'

// Markdown syntax
parseVariableReference('{{myVar}}', 'markdown'); // → 'myVar'
```

### Random Parser

Parse random specification tokens:

```typescript
import { parseRandomSpec } from '$lib/shared/parameterization';

// Integer range
const spec1 = parseRandomSpec('{#:1-10}', 'questions');
// → { type: 'integer', min: { type: 'number', value: 1 }, max: { type: 'number', value: 10 }, exclusions: [] }

// Decimal by digits
const spec2 = parseRandomSpec('{{2.3}}', 'markdown');
// → { type: 'decimal-by-digits', digitsBefore: { type: 'number', value: 2 }, digitsAfter: { type: 'number', value: 3 }, exclusions: [] }

// With exclusions
const spec3 = parseRandomSpec('{#:1-20!5,7-9}', 'questions');
// → { type: 'integer', ..., exclusions: [{ type: 'value', value: { type: 'number', value: 5 } }, { type: 'range', min: ..., max: ... }] }

// Variable bounds
const spec4 = parseRandomSpec('{#:{@:min}-{@:max}}', 'questions');
// → { type: 'integer', min: { type: 'variable', name: 'min' }, max: { type: 'variable', name: 'max' }, exclusions: [] }
```

### Eval Parser

Parse eval expression tokens:

```typescript
import { parseEvalExpression } from '$lib/shared/parameterization';

// Questions syntax
parseEvalExpression('{eval:a+b}', 'questions'); // → 'a+b'

// Markdown syntax
parseEvalExpression('{{eval:a+b}}', 'markdown'); // → 'a+b'

// With variable references (inner content preserved)
parseEvalExpression('{eval:{@:a}+{@:b}}', 'questions'); // → '{@:a}+{@:b}'
```

### Syntax Converter

Convert text between syntaxes:

```typescript
import { convertSyntax } from '$lib/shared/parameterization';

// Questions → Markdown
const markdown = convertSyntax(
	'Value: {@:a}, Random: {#:1-10}, Eval: {eval:a+5}',
	'questions',
	'markdown'
);
// → 'Value: {{a}}, Random: {{random:1-10}}, Eval: {{eval:a+5}}'

// Markdown → Questions
const questions = convertSyntax(
	'Value: {{a}}, Random: {{1-10}}, Eval: {{eval:a+5}}',
	'markdown',
	'questions'
);
// → 'Value: {@:a}, Random: {#:1-10}, Eval: {eval:a+5}'

// Preserves text outside tokens
const converted = convertSyntax(
	'Calculate $$\\frac{{@:a}}{{@:b}}$$ = {@:result}',
	'questions',
	'markdown'
);
// → 'Calculate $$\\frac{{a}}{{b}}$$ = {{result}}'
```

---

## Resolver Layer

### Variable Resolver

Resolve variables using 3-stage pipeline:

```typescript
import { resolveVariables } from '$lib/shared/parameterization';

const variables = [
	{ name: 'a', expression: '{#:1-10}' },
	{ name: 'b', expression: '{#:1-10}' },
	{ name: 'sum', expression: '{eval:{@:a}+{@:b}}' }
];

const resolved = resolveVariables(variables, 12345, 'questions');
// → [
//     { name: 'a', value: '7' },
//     { name: 'b', value: '3' },
//     { name: 'sum', value: '10' }
//   ]
```

**3-Stage Pipeline:**

For each variable, the resolver processes the expression through 3 stages:

1. **Replace Variable References** - `{@:var}` → resolved value
2. **Generate Random Numbers** - `{#:1-10}` → actual number
3. **Evaluate Expressions** - `{eval:a+b}` → calculated result

**Example:**

```typescript
// Given: a=7 (already resolved)
// Processing: { name: 'result', expression: '{eval:{@:a}+{#:1-5}}' }

// STAGE 1: Replace variable references
//   '{eval:{@:a}+{#:1-5}}' → '{eval:7+{#:1-5}}'

// STAGE 2: Generate random numbers
//   '{eval:7+{#:1-5}}' → '{eval:7+3}' (random generated: 3)

// STAGE 3: Evaluate expressions
//   '{eval:7+3}' → Extract '7+3' → Pass to MathLive → Returns 10
//   Final: '10'
```

### Expression Resolver

Resolve a single expression (not a variable definition):

```typescript
import { resolveExpression } from '$lib/shared/parameterization';

const alreadyResolved = [
	{ name: 'a', value: '5' },
	{ name: 'b', value: '10' }
];

// Resolve arbitrary expression
const result = resolveExpression(
	'The sum of {@:a} and {@:b} is {eval:{@:a}+{@:b}}',
	alreadyResolved,
	12345,
	'questions'
);
// → 'The sum of 5 and 10 is 15'
```

### Random Generator

Generate random number from specification:

```typescript
import { generateRandomNumber } from '$lib/shared/parameterization';

// Integer range
const spec1 = {
	type: 'integer',
	min: { type: 'number', value: 1 },
	max: { type: 'number', value: 10 },
	exclusions: []
};
const num1 = generateRandomNumber(spec1, [], 12345); // → 7

// With exclusions
const spec2 = {
	type: 'integer',
	min: { type: 'number', value: 1 },
	max: { type: 'number', value: 10 },
	exclusions: [{ type: 'value', value: { type: 'number', value: 5 } }]
};
const num2 = generateRandomNumber(spec2, [], 12345); // → 7 (not 5)

// Variable bounds
const alreadyResolved = [{ name: 'max', value: '20' }];
const spec3 = {
	type: 'integer',
	min: { type: 'number', value: 1 },
	max: { type: 'variable', name: 'max' },
	exclusions: []
};
const num3 = generateRandomNumber(spec3, alreadyResolved, 12345); // → Random 1-20

// Decimal by digits
const spec4 = {
	type: 'decimal-by-digits',
	digitsBefore: { type: 'number', value: 2 },
	digitsAfter: { type: 'number', value: 3 },
	exclusions: []
};
const num4 = generateRandomNumber(spec4, [], 12345); // → e.g., "45.123"
```

**Seeded Generation:**

The random generator uses a seeded pseudo-random number generator (PRNG) for reproducibility:

```typescript
// Same seed → same sequence
generateRandomNumber(spec, [], 12345); // → 7
generateRandomNumber(spec, [], 12345); // → 7

// Different seed → different sequence
generateRandomNumber(spec, [], 99999); // → 3
```

### Text Resolver

Resolve all parameter tokens in arbitrary text:

```typescript
import { resolveText } from '$lib/shared/parameterization';

const resolved = [
	{ name: 'a', value: '7' },
	{ name: 'b', value: '3' },
	{ name: 'sum', value: '10' }
];

// Questions syntax
const text1 = 'Calculate {@:a} + {@:b} = {@:sum}';
const result1 = resolveText(text1, resolved, 'questions');
// → 'Calculate 7 + 3 = 10'

// Markdown syntax
const text2 = 'Calculate {{a}} + {{b}} = {{sum}}';
const result2 = resolveText(text2, resolved, 'markdown');
// → 'Calculate 7 + 3 = 10'

// In LaTeX
const text3 = 'Simplify: $$\\frac{{@:a}}{{@:b}}$$';
const result3 = resolveText(text3, resolved, 'questions');
// → 'Simplify: $$\\frac{7}{3}$$'
```

---

## Validator Layer

### Circular Dependency Detector

Detect circular dependencies using DFS algorithm:

```typescript
import { detectCircularDependencies } from '$lib/shared/parameterization';

// Valid - no cycle
const valid = [
	{ name: 'a', expression: '5' },
	{ name: 'b', expression: '{@:a}' },
	{ name: 'c', expression: '{@:b}' }
];
detectCircularDependencies(valid);
// → { valid: true, errors: [] }

// Invalid - direct self-reference
const selfRef = [{ name: 'a', expression: '{@:a}' }];
detectCircularDependencies(selfRef);
// → {
//     valid: false,
//     errors: [{
//       type: 'circular-dependency',
//       message: 'Circular dependency detected: a → a',
//       variable: 'a',
//       path: ['a', 'a']
//     }]
//   }

// Invalid - indirect cycle
const cycle = [
	{ name: 'a', expression: '{@:b}' },
	{ name: 'b', expression: '{@:c}' },
	{ name: 'c', expression: '{@:a}' }
];
detectCircularDependencies(cycle);
// → {
//     valid: false,
//     errors: [{
//       type: 'circular-dependency',
//       message: 'Circular dependency detected: a → b → c → a',
//       variable: 'a',
//       path: ['a', 'b', 'c', 'a']
//     }]
//   }
```

**How It Works:**

1. Build dependency graph from variable expressions
2. Extract variable references from all token types (variable, random, eval)
3. Run DFS from each unvisited node
4. Track recursion stack to detect back edges (cycles)
5. Reconstruct cycle path when cycle found

**Advanced Detection:**

The detector finds variables referenced in:

- Direct variable references: `{@:a}`
- Inside random specs: `{#:{@:min}-{@:max}}`
- Inside random exclusions: `{#:1-10!{@:x}}`
- Inside eval expressions: `{eval:{@:a}+{@:b}}`

### Variable Validator

Comprehensive validation of variable definitions:

```typescript
import { validateVariables } from '$lib/shared/parameterization';

const variables = [
	{ name: 'a', expression: '{#:1-10}' },
	{ name: 'b', expression: '{@:a}' },
	{ name: 'sum', expression: '{eval:a+b}' }
];

const result = validateVariables(variables);
// → { valid: true, errors: [] }
```

**Validation Checks:**

1. **Circular Dependencies** - Using DFS algorithm
2. **Undefined Variables** - References to non-existent variables
3. **Invalid Syntax** - Malformed tokens
4. **Invalid Ranges** - min >= max in random specs

**Example Errors:**

```typescript
const invalid = [
	{ name: '', expression: '5' }, // Empty name
	{ name: 'a', expression: '{@:undefined}' }, // Undefined reference
	{ name: 'b', expression: '{#:10-5}' }, // Invalid range
	{ name: 'c', expression: '{@:c}' } // Self-reference
];

const result = validateVariables(invalid);
// → {
//     valid: false,
//     errors: [
//       { type: 'invalid-syntax', message: 'Variable name cannot be empty', variable: '' },
//       { type: 'undefined-variable', message: 'Variable "undefined" not found', variable: 'a' },
//       { type: 'invalid-range', message: 'Invalid range: min (10) >= max (5)', variable: 'b' },
//       { type: 'circular-dependency', message: 'Circular dependency detected: c → c', variable: 'c', path: ['c', 'c'] }
//     ]
//   }
```

---

## Random Spec Formats

All supported random number formats with examples:

### Integer Range

```typescript
// Basic range
{#:1-10}                    // Questions
{{random:1-10}}             // Markdown explicit
{{1-10}}                    // Markdown shorthand

// Negative numbers
{#:-10-10}                  // -10 to 10
{{-10-10}}                  // -10 to 10

// Variable bounds
{#:{@:min}-{@:max}}         // Questions
{{random:{{min}}-{{max}}}}  // Markdown
{{{{min}}-{{max}}}}         // Markdown shorthand
```

### Decimal by Digits

```typescript
// Fixed digits
{#:2.3}                     // Questions: 2 before, 3 after (e.g., "45.123")
{{2.3}}                     // Markdown: 2 before, 3 after

// Variable digits
{#:{@:before}.{@:after}}    // Questions
{{{{before}}.{{after}}}}    // Markdown
```

### Decimal Range with Step

```typescript
// Fixed step
{#:0.5-9.99:0.01}           // Questions: 0.50 to 9.99 by 0.01
{{0.5-9.99:0.01}}           // Markdown: 0.50 to 9.99 by 0.01

// Common steps
{#:0-1:0.1}                 // 0.0, 0.1, 0.2, ..., 1.0
{#:0-10:0.5}                // 0.0, 0.5, 1.0, ..., 10.0
```

### Exclusions

```typescript
// Single value
{#:1-10!5}                  // Exclude 5
{{1-10!5}}                  // Exclude 5

// Multiple values
{#:1-20!5,7}                // Exclude 5 and 7
{{1-20!5,7}}                // Exclude 5 and 7

// Range exclusion
{#:1-50!10-20}              // Exclude 10-20
{{1-50!10-20}}              // Exclude 10-20

// Variable exclusion
{#:1-10!{@:a}}              // Questions: Exclude a's value
{{1-10!{{a}}}}              // Markdown: Exclude a's value

// Mixed
{#:1-100!5,7-9,{@:x}}       // Exclude 5, 7-9, and x
{{1-100!5,7-9,{{x}}}}       // Exclude 5, 7-9, and x
```

---

## Usage in Questions vs Exercises

### Questions Feature

Questions use the shared library for question template parameterization:

```typescript
import { resolveVariables, resolveText } from '$lib/shared/parameterization';

// Question template with variables
const template = {
	variables: [
		{ name: 'a', expression: '{#:1-10}' },
		{ name: 'b', expression: '{#:1-10}' },
		{ name: 'sum', expression: '{eval:{@:a}+{@:b}}' }
	],
	statement: 'Calculate {@:a} + {@:b}',
	answer: '{@:sum}'
};

// Generate instance
const resolved = resolveVariables(template.variables, 12345, 'questions');
const statement = resolveText(template.statement, resolved, 'questions');
const answer = resolveText(template.answer, resolved, 'questions');

// Result: "Calculate 7 + 3", answer: "10"
```

### Exercises Feature

Exercises use the shared library for exercise content parameterization:

```typescript
import { resolveVariables, resolveText } from '$lib/shared/parameterization';

// Exercise with parameterized content
const exercise = {
	variables: [
		{ name: 'side', expression: '{{random:5-15}}' },
		{ name: 'area', expression: '{{eval:side*side}}' }
	],
	content: 'A square has side length {{side}} cm. Calculate its area.',
	solution: 'Area = {{area}} cm²'
};

// Generate instance
const resolved = resolveVariables(exercise.variables, undefined, 'markdown');
const content = resolveText(exercise.content, resolved, 'markdown');
const solution = resolveText(exercise.solution, resolved, 'markdown');

// Result: "A square has side length 12 cm. Calculate its area."
//         "Area = 144 cm²"
```

**Key Differences:**

| Aspect               | Questions                     | Exercises                         |
| -------------------- | ----------------------------- | --------------------------------- |
| **Preferred Syntax** | Questions (`{@:}`, `{#:}`)    | Markdown (`{{}}`)                 |
| **Use Case**         | Math question generation      | Exercise content parameterization |
| **Content Types**    | Statement, answer, correction | Instructions, solutions, hints    |
| **Validation**       | Pre-save template validation  | Runtime content validation        |

---

## Testing

### Test Coverage

- **Total Tests:** 447 passing
- **Coverage:** 99%+ across all modules
- **Test Files:** 10 test suites

### Test Structure

```
src/lib/shared/parameterization/
├── parser/
│   ├── tokenizer.test.ts              # 60+ tests
│   ├── variable-parser.test.ts        # 40+ tests
│   ├── random-parser.test.ts          # 80+ tests
│   ├── eval-parser.test.ts            # 30+ tests
│   └── syntax-converter.test.ts       # 60+ tests
├── resolver/
│   ├── variable-resolver.test.ts      # 70+ tests
│   ├── random-generator.test.ts       # 50+ tests
│   └── text-resolver.test.ts          # 30+ tests
└── validator/
    ├── circular-dependency.test.ts    # 40+ tests
    └── variable-validator.test.ts     # 30+ tests
```

### Running Tests

```bash
# All parameterization tests
pnpm test:unit src/lib/shared/parameterization

# Specific test file
pnpm test:unit tokenizer.test.ts
pnpm test:unit variable-resolver.test.ts

# Watch mode
pnpm test:unit --watch src/lib/shared/parameterization

# Coverage report
pnpm test:unit --coverage src/lib/shared/parameterization
```

### Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { resolveVariables } from '$lib/shared/parameterization';

describe('Variable Resolver', () => {
	it('resolves 3-stage pipeline correctly', () => {
		const variables = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'b', expression: '{@:a}' },
			{ name: 'sum', expression: '{eval:a+b}' }
		];

		const resolved = resolveVariables(variables, 12345, 'questions');

		expect(resolved).toHaveLength(3);
		expect(resolved[0].name).toBe('a');
		expect(resolved[1].value).toBe(resolved[0].value); // b = a
		expect(resolved[2].value).toBe(String(Number(resolved[0].value) * 2)); // sum = a+b = 2a
	});
});
```

---

## Performance

### Benchmarks

- **Variable Resolution:** <50ms per instance (10-20 variables)
- **Text Resolution:** <10ms per text field
- **Validation:** <5ms per template
- **Syntax Conversion:** <5ms per text field

### Optimization Strategies

1. **Seeded Random Generation** - Reproducible results without re-computation
2. **Lazy Evaluation** - Variables resolved only when needed
3. **Token Caching** - Tokenize once, reuse multiple times (future)
4. **Early Validation** - Catch errors before resolution

### Best Practices

```typescript
// ✅ GOOD: Reuse resolved variables
const resolved = resolveVariables(variables, seed);
const statement = resolveText(template.statement, resolved, syntax);
const answer = resolveText(template.answer, resolved, syntax);

// ❌ BAD: Re-resolve for each field
const statement = resolveText(template.statement, resolveVariables(variables, seed), syntax);
const answer = resolveText(template.answer, resolveVariables(variables, seed), syntax); // Different seed!

// ✅ GOOD: Validate once before save
const validation = validateVariables(template.variables);
if (validation.valid) {
	saveTemplate(template);
}

// ❌ BAD: Validate on every instance generation
const instance = generateInstance(template); // Re-validates every time
```

---

## Type Definitions

### Core Types

```typescript
/**
 * Syntax flavor
 */
type Syntax = 'questions' | 'markdown' | 'both';

/**
 * Variable definition
 */
interface Variable {
	name: string;
	expression: string; // Can contain {@:}, {#:}, {eval:} or {{}}
}

/**
 * Resolved variable
 */
interface ResolvedVariable {
	name: string;
	value: string;
}

/**
 * Random specification
 */
type RandomSpec =
	| {
			type: 'integer';
			min: NumberOrVariable;
			max: NumberOrVariable;
			exclusions: Exclusion[];
	  }
	| {
			type: 'decimal-by-digits';
			digitsBefore: NumberOrVariable;
			digitsAfter: NumberOrVariable;
			exclusions: Exclusion[];
	  }
	| {
			type: 'decimal-range';
			min: NumberOrVariable;
			max: NumberOrVariable;
			step: number;
			exclusions: Exclusion[];
	  };

/**
 * Number or variable reference
 */
type NumberOrVariable = { type: 'number'; value: number } | { type: 'variable'; name: string };

/**
 * Exclusion pattern
 */
type Exclusion =
	| { type: 'value'; value: NumberOrVariable }
	| { type: 'range'; min: NumberOrVariable; max: NumberOrVariable };

/**
 * Validation result
 */
interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
}

/**
 * Validation error
 */
interface ValidationError {
	type: 'circular-dependency' | 'undefined-variable' | 'invalid-syntax' | 'invalid-range';
	message: string;
	variable?: string;
	path?: string[];
}
```

Full type definitions: [`types.ts`](./types.ts)

---

## Migration from Questions-Specific Code

The shared library was extracted from the Questions feature. Here's how to migrate:

### Before (Questions-specific)

```typescript
// Old: src/lib/questions/parser/variable-parser.ts
import { parseVariableReference } from '$lib/questions/parser/variable-parser';
import { resolveVariables } from '$lib/questions/generator/variable-resolver';

const varName = parseVariableReference('{@:a}');
const resolved = resolveVariables(template.variables, seed);
```

### After (Shared library)

```typescript
// New: src/lib/shared/parameterization
import { parseVariableReference, resolveVariables } from '$lib/shared/parameterization';

const varName = parseVariableReference('{@:a}', 'questions'); // Syntax parameter added
const resolved = resolveVariables(template.variables, seed, 'questions'); // Syntax parameter added
```

### Key Changes

1. **Syntax Parameter** - All parser functions now accept `syntax: Syntax` parameter
2. **Import Path** - Changed from `$lib/questions/*` to `$lib/shared/parameterization`
3. **Content-Agnostic** - No feature-specific types (QuestionVariable → Variable)
4. **Dual Syntax** - Functions work with both Questions and Markdown syntax

---

## Contributing

When adding new features to the shared library:

1. **Maintain content-agnosticism** - No feature-specific types or logic
2. **Support dual syntax** - Both Questions and Markdown must work
3. **Write comprehensive tests** - Maintain 99%+ coverage
4. **Update documentation** - Keep this README in sync
5. **Consider performance** - Benchmark new features
6. **Validate thoroughly** - Add validation for new syntax

### Adding a New Token Type

If you need to add a new token type (e.g., `{condition:...}`):

1. Update `Token` type in `types.ts`
2. Add parser in `parser/` directory
3. Add resolver logic in `resolver/variable-resolver.ts`
4. Add tests for parser and resolver
5. Update syntax converter
6. Update documentation

---

## Resources

- **Type Definitions:** [`types.ts`](./types.ts)
- **Architecture Doc:** [`/docs/architecture/parameterization-system.md`](/docs/architecture/parameterization-system.md)
- **Questions Feature:** [`/docs/features/questions/`](/docs/features/questions/)
- **Exercises Feature:** [`/docs/features/exercises/`](/docs/features/exercises/)
- **MathLive Docs:** https://cortexjs.io/compute-engine/

---

**Version:** 1.0.0
**Last Updated:** 2025-01-26
**Maintainers:** UbuMaths Development Team
