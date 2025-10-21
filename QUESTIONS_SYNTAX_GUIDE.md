# Question Bank - Syntax Guide

Quick reference for template expression syntax.

---

## Variable References

**Syntax:** `{@:varName}`

**Usage:** Reference a previously defined variable.

**Examples:**

```latex
$${@:a} + {@:b}$$           → Replace with variable values
{@:max}                     → Use in any expression
Calculate {@:a}^2           → LaTeX with variable
```

**Rules:**

- Variables must be defined before use (declaration order)
- Variable names: alphanumeric and underscore only

---

## Random Numbers

### Integer Range

**Syntax:** `{#:min-max}`

**Examples:**

```typescript
{#:1-10}                    → Random integer 1 to 10
{#:-5-5}                    → Random integer -5 to 5
{#:{@:min}-{@:max}}         → Variable bounds
{#:1-{@:limit}}             → Min literal, max variable
```

### Decimal by Digits

**Syntax:** `{#:digitsBefore.digitsAfter}`

**Examples:**

```typescript
{#:2.3}                     → 2 digits before, 3 after (e.g., 45.123)
{#:1.2}                     → 1 before, 2 after (e.g., 7.89)
{#:{@:before}.{@:after}}    → Variable digits
{#:2.{@:precision}}         → Before literal, after variable
```

### Decimal Range with Step

**Syntax:** `{#:min-max:step}`

**Examples:**

```typescript
{#:0.5-9.99:0.01}           → Decimal 0.5 to 9.99 by 0.01
{#:0-1:0.1}                 → 0, 0.1, 0.2, ..., 1.0
{#:{@:min}-{@:max}:0.5}     → Variable range with step
```

### Exclusions

**Syntax:** `{#:base!exclusions}`

**Single Values:**

```typescript
{#:1-10!5}                  → 1 to 10 except 5
{#:1-20!5,7}                → Except 5 and 7
{#:1-100!{@:a}}             → Except variable 'a'
```

**Ranges:**

```typescript
{#:1-20!5-7}                → Except 5, 6, 7
{#:1-100!10-20,50}          → Except 10-20 and 50
{#:1-100!{@:min}-{@:max}}   → Except variable range
```

**Mixed:**

```typescript
{#:1-50!5,7-9,{@:x}}        → Except 5, 7-9, and variable x
{#:1-100!{@:a},{@:b}-{@:c}} → Multiple variables
```

---

## Mathematical Evaluation

**Syntax:** `{eval:expression}`

**Usage:** Evaluate mathematical expression using MathLive Compute Engine.

**Examples:**

```typescript
{eval:3+4}                  → "7"
{eval:2^3}                  → "8"
{eval:{@:a}*{@:b}}          → Multiply variables
{eval:({@:a})^2-{@:b}}      → Complex expression
{eval:\frac{1}{2}}          → LaTeX expressions
```

**Supported:**

- Arithmetic: `+`, `-`, `*`, `/`, `^`
- Functions: `\sqrt{}`, `\frac{}{}`
- Variables (after substitution)
- Parentheses for grouping

### How `{eval:}` Works - Resolution Process

**IMPORTANT:** All variable references (`{@:}`) and random expressions (`{#:}`) inside an `{eval:}` expression are **fully resolved BEFORE** being passed to MathLive's Compute Engine. The engine only receives a clean mathematical expression with actual numbers.

**Three-Stage Pipeline:**

1. **Stage 1 - Replace Variable References:**

   ```typescript
   // Replace all {@:varName} with their resolved values
   '{eval:{@:a}+{@:b}}' → '{eval:5+7}' (if a=5, b=7)
   ```

2. **Stage 2 - Generate Random Numbers:**

   ```typescript
   // Generate random numbers and replace {#:...} expressions
   '{eval:{#:1-10}*2}' → '{eval:7*2}' (if random=7)
   ```

3. **Stage 3 - Evaluate with MathLive:**
   ```typescript
   // Extract expression, evaluate, replace with result
   '{eval:5+7}' → Extract '5+7' → Compute Engine → '12'
   ```

**Complete Example:**

Given this variable definition:

```typescript
{ name: 'sum', expression: '{eval:{@:a}+{@:b}}' }
```

If `a = 5` and `b = 7`, the resolution process is:

1. **Initial:** `{eval:{@:a}+{@:b}}`
2. **After variable replacement:** `{eval:5+7}`
3. **After eval processing:**
   - Extract `5+7` from `{eval:5+7}`
   - Pass `"5+7"` to MathLive's Compute Engine
   - Engine returns `12`
   - Replace entire `{eval:5+7}` with `"12"`
4. **Final result:** `"12"`

**Key Point:** The Compute Engine NEVER sees the original `{@:a}` or `{#:...}` syntax - it only receives pure mathematical expressions like `"5+7"` or `"sqrt(25)"` with actual numbers.

---

## LaTeX Expressions

**Syntax:** `$$expression$$`

**Usage:** Delimit mathematical expressions in text.

**Examples:**

```latex
Calculate $$3 + 4$$
Simplify $$\frac{{@:a}}{{@:b}}$$
Solve $${@:a}x^2 + {@:b}x + {@:c} = 0$$
```

**Can contain:**

- Variable references: `{@:varName}`
- Random numbers: `{#:1-10}`
- Evaluations: `{eval:...}`

---

## Complete Examples

### Example 1: Simple Addition

```json
{
	"variables": [
		{ "name": "a", "expression": "{#:1-20}" },
		{ "name": "b", "expression": "{#:1-20}" }
	],
	"statement": [{ "type": "text", "content": "Calculate: $${@:a} + {@:b}$$" }],
	"answer": "{eval:{@:a}+{@:b}}"
}
```

### Example 2: Variable Bounds

```json
{
	"variables": [
		{ "name": "maxValue", "expression": "10" },
		{ "name": "a", "expression": "{#:1-{@:maxValue}}" },
		{ "name": "b", "expression": "{#:1-{@:maxValue}}" }
	],
	"statement": [{ "type": "text", "content": "Calculate: $${@:a} \\times {@:b}$$" }],
	"answer": "{eval:{@:a}*{@:b}}"
}
```

### Example 3: Exclusion of Previous Value

```json
{
	"variables": [
		{ "name": "a", "expression": "{#:1-10}" },
		{ "name": "b", "expression": "{#:1-10!{@:a}}" }
	],
	"statement": [{ "type": "text", "content": "Calculate: $${@:a}^2 - {@:b}^2$$" }],
	"answer": "{eval:({@:a})^2-({@:b})^2}"
}
```

### Example 4: Fraction Simplification

```json
{
	"variables": [
		{ "name": "gcd", "expression": "{#:2-5}" },
		{ "name": "a", "expression": "{#:2-9}" },
		{ "name": "b", "expression": "{#:2-9!{@:a}}" },
		{ "name": "num", "expression": "{eval:{@:a}*{@:gcd}}" },
		{ "name": "den", "expression": "{eval:{@:b}*{@:gcd}}" }
	],
	"statement": [{ "type": "text", "content": "Simplify: $$\\frac{{@:num}}{{@:den}}$$" }],
	"answer": "\\frac{{@:a}}{{@:b}}"
}
```

### Example 5: Decimal with Step

```json
{
	"variables": [
		{ "name": "min", "expression": "0.5" },
		{ "name": "max", "expression": "9.99" },
		{ "name": "value", "expression": "{#:{@:min}-{@:max}:0.01}" }
	],
	"statement": [{ "type": "text", "content": "Round $${@:value}$$ to 2 decimal places" }],
	"answer": "{eval:round({@:value}, 2)}"
}
```

---

## Resolution Order

**Within a variable expression:**

1. `{@:otherVar}` → Replace with resolved value
2. `{#:...}` → Generate random number
3. `{eval:...}` → Evaluate expression

**Example flow:**

```typescript
// Variable definition
{ name: 'c', expression: '{eval:{@:a}+{#:1-5}}' }

// Resolution steps (if a=7):
// 1. Replace {@:a}    → "{eval:7+{#:1-5}}"
// 2. Generate {#:1-5} → "{eval:7+3}"
// 3. Evaluate         → "10"
```

---

## Common Patterns

### Random with Constraints

```typescript
// Non-zero divisor
{ name: 'divisor', expression: '{#:1-10!0}' }

// Different from previous
{ name: 'a', expression: '{#:1-10}' }
{ name: 'b', expression: '{#:1-10!{@:a}}' }

// Within specific range excluding middle
{ name: 'x', expression: '{#:1-100!40-60}' }
```

### Evaluated vs. Raw

```typescript
// Keep as expression
{ name: 'expr', expression: '{@:a}^2 + {@:b}' }
// → "3^2 + 5" (LaTeX preserved)

// Evaluate to number
{ name: 'result', expression: '{eval:{@:a}^2 + {@:b}}' }
// → "14" (evaluated)
```

### Multiple Choice Distractors

```typescript
// Correct answer
{ name: 'correct', expression: '{eval:{@:a}+{@:b}}' }

// Wrong answers (common mistakes)
{ name: 'wrong1', expression: '{eval:{@:a}*{@:b}}' }      // Multiply instead of add
{ name: 'wrong2', expression: '{eval:{@:a}-{@:b}}' }      // Subtract instead of add
{ name: 'wrong3', expression: '{eval:{@:correct}+1}' }    // Off by one
```

---

## Error Prevention

### ❌ Common Mistakes

```typescript
// Variable not yet defined
{ name: 'a', expression: '{@:b}' }  // b doesn't exist
{ name: 'b', expression: '5' }

// Circular reference
{ name: 'a', expression: '{@:b}' }
{ name: 'b', expression: '{@:a}' }

// Invalid range (min >= max)
{ name: 'x', expression: '{#:10-5}' }

// Using variable in its own definition
{ name: 'a', expression: '{@:a} + 1' }
```

### ✅ Best Practices

```typescript
// Define dependencies first
{ name: 'max', expression: '20' }
{ name: 'a', expression: '{#:1-{@:max}}' }

// Use meaningful names
{ name: 'numerator', expression: '{#:1-100}' }
{ name: 'denominator', expression: '{#:1-10!0}' }

// Document complex expressions
{
  name: 'discriminant',
  expression: '{eval:({@:b})^2-4*{@:a}*{@:c}}'
  // Δ = b² - 4ac
}
```

---

## Template Variations

**Purpose:** Allow a single template to generate multiple types of related problems.

### Overview

Templates can have **multiple variations**, each with its own:

- Statement
- Variables
- Answer
- Correction
- Blanks (for fill-in-blanks)
- Choices (for multiple choice)

When generating a question instance, one variation is selected either:

- **Deterministically** using a seed: `Math.abs(seed) % variations.length`
- **Randomly** if no seed is provided

### Basic Example

**Single Variation Template** (Old Style):

```typescript
{
  type: 'numerical_exact',
  statement: [{ type: 'text', content: 'Calculate {@:a} + {@:b}' }],
  variables: [
    { name: 'a', expression: '{#:1-10}' },
    { name: 'b', expression: '{#:1-10}' }
  ],
  answer: '{eval:{@:a}+{@:b}}',
  grades: ['6']
}
```

**Multi-Variation Template** (New Style):

```typescript
{
  type: 'numerical_exact',
  variations: [
    {
      statement: [{ type: 'text', content: 'Calculate {@:a} + {@:b}' }],
      variables: [
        { name: 'a', expression: '{#:1-10}' },
        { name: 'b', expression: '{#:1-10}' }
      ],
      answer: '{eval:{@:a}+{@:b}}'
    },
    {
      statement: [{ type: 'text', content: 'Calculate {@:a} - {@:b}' }],
      variables: [
        { name: 'a', expression: '{#:10-20}' },
        { name: 'b', expression: '{#:1-{@:a}}' }
      ],
      answer: '{eval:{@:a}-{@:b}}'
    }
  ],
  grades: ['6']
}
```

### Advanced Example: Operations Template

**4 Variations** (addition, subtraction, multiplication, division):

```typescript
{
  type: 'numerical_exact',
  variations: [
    {
      statement: [{ type: 'text', content: 'Calculate: $${@:a} + {@:b}$$' }],
      variables: [
        { name: 'a', expression: '{#:10-50}' },
        { name: 'b', expression: '{#:10-50}' }
      ],
      answer: '{eval:{@:a}+{@:b}}'
    },
    {
      statement: [{ type: 'text', content: 'Calculate: $${@:a} - {@:b}$$' }],
      variables: [
        { name: 'a', expression: '{#:20-99}' },
        { name: 'b', expression: '{#:10-{@:a}}' }
      ],
      answer: '{eval:{@:a}-{@:b}}'
    },
    {
      statement: [{ type: 'text', content: 'Calculate: $${@:a} \\times {@:b}$$' }],
      variables: [
        { name: 'a', expression: '{#:2-12}' },
        { name: 'b', expression: '{#:2-12}' }
      ],
      answer: '{eval:{@:a}*{@:b}}'
    },
    {
      statement: [{ type: 'text', content: 'Calculate: $${@:dividend} \\div {@:divisor}$$' }],
      variables: [
        { name: 'divisor', expression: '{#:2-9}' },
        { name: 'quotient', expression: '{#:2-12}' },
        { name: 'dividend', expression: '{eval:{@:divisor}*{@:quotient}}' }
      ],
      answer: '{@:quotient}'
    }
  ],
  precision: { type: 'none' },
  grades: ['CM1', 'CM2', '6'],
  theme: 'Arithmétique',
  domain: 'Opérations',
  level: 1
}
```

### Variation Selection

**With Seed** (Deterministic):

```typescript
// Template with 4 variations
seed = 0  → Variation 1 (index 0)
seed = 1  → Variation 2 (index 1)
seed = 2  → Variation 3 (index 2)
seed = 3  → Variation 4 (index 3)
seed = 4  → Variation 1 (index 0)  // Wraps around
seed = 100 → Variation 1 (100 % 4 = 0)
```

**Without Seed** (Random):

```typescript
// Generates random seed internally
// Different variation on each call
```

### Per-Variation vs Shared Fields

**Per-Variation** (inside each variation):

- `statement` - Question text/images
- `variables` - Variable definitions
- `answer` - Expected answer
- `correction` - Optional correction steps
- `blanks` - For fill-in-blanks (position + expectedAnswer)
- `choices` - For multiple choice (content + isCorrect)

**Shared** (at template level):

- `type` - Question type
- `grades` - Target grade levels
- `theme`, `domain`, `subdomain` - Categorization
- `level` - Difficulty
- `precision` - Numerical precision (numerical questions)
- `transformType` - Transform type (algebraic questions)
- `multipleAnswers` - Allow multiple correct answers (QCM)
- `delay` - Time limit in seconds

### Best Practices

✅ **DO:**

- Use variations for related problem types (addition/subtraction, different shapes, etc.)
- Keep variations within the same conceptual theme
- Test each variation in preview before saving
- Add corrections to help students understand

❌ **DON'T:**

- Mix completely unrelated concepts (make separate templates instead)
- Create templates with 0 variations (minimum 1 required)
- Duplicate identical variations (just use 1)
- Mix per-variation fields at template level

### Example Use Cases

**Good Variations** (related concepts):

- Arithmetic: Addition, subtraction, multiplication, division
- Fractions: Addition, subtraction, simplification
- Geometry: Rectangle, triangle, circle areas
- Equations: Linear, quadratic, cubic
- Factorization: Common factor, difference of squares, trinomial

**Bad Variations** (unrelated):

- ❌ Variation 1: Arithmetic addition, Variation 2: Pythagorean theorem
- ❌ Variation 1: Fraction simplification, Variation 2: Probability
- ❌ Variation 1: Algebra factorization, Variation 2: Geometry angles

---

## Quick Reference Card

| Syntax              | Purpose                 | Example           |
| ------------------- | ----------------------- | ----------------- |
| `{@:name}`          | Variable reference      | `{@:a}`           |
| `{#:1-10}`          | Random integer          | `{#:5-15}`        |
| `{#:2.3}`           | Random decimal (digits) | `{#:1.2}`         |
| `{#:0.5-9.99:0.01}` | Random decimal (range)  | `{#:0-1:0.1}`     |
| `{#:1-10!5}`        | Exclude single value    | `{#:1-20!10}`     |
| `{#:1-20!5-7}`      | Exclude range           | `{#:1-50!10-20}`  |
| `{#:1-100!{@:a}}`   | Exclude variable        | `{#:1-10!{@:x}}`  |
| `{eval:3+4}`        | Evaluate expression     | `{eval:{@:a}^2}`  |
| `$$...$$`           | LaTeX math              | `$$\frac{1}{2}$$` |

---

**For complete API documentation, see `QUESTIONS_API.md`**
