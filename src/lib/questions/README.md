# Question Bank System

A comprehensive system for creating and managing mathematical question templates with variable support, random generation, and automatic instance creation.

---

## Overview

The Question Bank System allows educators to create reusable question templates that generate unique instances with randomized values while maintaining pedagogical structure.

### Key Features

- **6 Question Types:** numerical (exact/decimal/rounded), algebraic transforms, fill-in-blanks, multiple choice
- **Variable System:** Define variables with dependencies and references
- **Random Generation:** Full support for random numbers with variables in bounds
- **Complex Exclusions:** Exclude values, ranges, and variables from random generation
- **Mathematical Evaluation:** Integrate MathLive Compute Engine for expression evaluation
- **Circular Dependency Detection:** Automatic validation prevents infinite loops
- **Seeded Random:** Reproducible question instances for testing and debug

---

## Quick Start

### Creating a Simple Template

```typescript
import { generateInstance } from '$lib/questions';
import type { QuestionTemplate } from '$lib/questions/types';

const template: QuestionTemplate = {
  id: 'uuid',
  type: 'numerical_exact',
  statement: [
    { type: 'text', content: 'Calculate: $${@:a} + {@:b}$$' }
  ],
  variables: [
    { name: 'a', expression: '{#:1-10}' },
    { name: 'b', expression: '{#:1-10}' }
  ],
  answer: '{eval:{@:a}+{@:b}}',
  grades: ['6'],
  delay: 30
};

// Generate instance
const result = generateInstance(template);

if (result.success) {
  console.log(result.instance.statement[0].content);
  // Output: "Calculate: $$7 + 3$$"

  console.log(result.instance.answer);
  // Output: "10"
}
```

### Using Advanced Features

```typescript
const advancedTemplate: QuestionTemplate = {
  id: 'uuid',
  type: 'numerical_exact',
  statement: [
    { type: 'text', content: 'Simplify: $$\\frac{{@:num}}{{@:den}}$$' }
  ],
  variables: [
    { name: 'gcd', expression: '{#:2-5}' },                    // Random GCD
    { name: 'a', expression: '{#:2-9}' },                       // Numerator base
    { name: 'b', expression: '{#:2-9!{@:a}}' },                 // Denominator ≠ a
    { name: 'num', expression: '{eval:{@:a}*{@:gcd}}' },        // Actual numerator
    { name: 'den', expression: '{eval:{@:b}*{@:gcd}}' }         // Actual denominator
  ],
  answer: '\\frac{{@:a}}{{@:b}}',
  precision: { type: 'none' },
  grades: ['6', '5'],
  delay: 60
};
```

---

## Syntax Reference

### Variable References

```typescript
{@:varName}    // Reference a variable
```

### Random Numbers

```typescript
{#:1-10}                    // Integer 1 to 10
{#:-5-5}                    // Integer -5 to 5
{#:{@:min}-{@:max}}         // Variable bounds
{#:2.3}                     // Decimal (2 before, 3 after)
{#:{@:before}.{@:after}}    // Variable digits
{#:0.5-9.99:0.01}           // Decimal range with step
```

### Exclusions

```typescript
{#:1-10!5}                  // Exclude 5
{#:1-20!5,7}                // Exclude 5 and 7
{#:1-20!5-7}                // Exclude range 5-7
{#:1-100!{@:a}}             // Exclude variable value
{#:1-50!5,7-9,{@:x}}        // Mix values, ranges, variables
```

### Mathematical Evaluation

```typescript
{eval:3+4}                  // Simple arithmetic
{eval:{@:a}^2}              // With variables
{eval:({@:a})^2-{@:b}}      // Complex expressions
{eval:\frac{1}{2}}          // LaTeX expressions
```

### LaTeX Math

```typescript
$$expression$$              // Delimit math in text
$${@:a} + {@:b}$$          // Can contain variables
$$\frac{{@:num}}{{@:den}}$$ // Can contain any syntax
```

**Full syntax guide:** See `QUESTIONS_SYNTAX_GUIDE.md`

---

## Architecture

### Modules

```
src/lib/questions/
├── types.ts                   # Type definitions
├── index.ts                   # Public API
├── parser/                    # Expression parsers
│   ├── tokenizer.ts
│   ├── random-parser.ts
│   ├── variable-parser.ts
│   └── eval-parser.ts
├── generator/                 # Instance generation
│   ├── instance-generator.ts
│   ├── variable-resolver.ts
│   ├── random-generator.ts
│   ├── content-resolver.ts
│   └── choice-shuffler.ts
├── validators/                # Template validation
│   ├── template-validator.ts
│   └── circular-dependency.ts
└── compute-engine/            # MathLive integration
    └── wrapper.ts
```

### Data Flow

```
Template (DB)
    │
    ├─> Validate structure
    │
    ├─> Detect circular dependencies
    │
    ├─> Resolve variables (declaration order)
    │    ├─> Replace {@:otherVar}
    │    ├─> Generate {#:random}
    │    └─> Evaluate {eval:expression}
    │
    ├─> Resolve content fields
    │
    ├─> Shuffle choices (QCM)
    │
    └─> Instance (JSON)
```

---

## API Usage

### Parsers

```typescript
import {
  parseRandomExpression,
  extractVariableReferences,
  extractEvalExpressions
} from '$lib/questions';

// Parse random expression
const spec = parseRandomExpression('{#:1-10!5}');
// → { type: 'integer', min: 1, max: 10, exclusions: [...] }

// Extract variable references
const refs = extractVariableReferences('Calculate {@:a} + {@:b}');
// → [{ name: 'a', ... }, { name: 'b', ... }]

// Extract eval expressions
const evals = extractEvalExpressions('{eval:3+4} and {eval:{@:a}^2}');
// → [{ expression: '3+4', ... }, { expression: '{@:a}^2', ... }]
```

### Generators

```typescript
import {
  generateInstance,
  resolveVariables,
  generateRandomNumber
} from '$lib/questions';

// Generate complete instance
const result = generateInstance(template, 42); // Optional seed

// Resolve variables only
const resolved = resolveVariables(template.variables, 42);

// Generate single random number
const randomSpec = { type: 'integer', min: 1, max: 10, exclusions: [] };
const value = generateRandomNumber(randomSpec, [], 42);
```

### Validators

```typescript
import {
  validateTemplate,
  detectCircularDependencies
} from '$lib/questions';

// Validate template structure
const errors = validateTemplate(template);
if (errors.length > 0) {
  console.error('Invalid template:', errors);
}

// Detect circular references
const cycles = detectCircularDependencies(template.variables);
if (cycles.length > 0) {
  console.error('Circular dependencies:', cycles);
}
```

### Compute Engine

```typescript
import {
  evaluateExpression,
  simplifyExpression,
  areEquivalent
} from '$lib/questions';

// Evaluate LaTeX
const result = evaluateExpression('3+4');        // → 7
const fraction = evaluateExpression('\\frac{1}{2}'); // → 0.5

// Simplify expression
const simplified = simplifyExpression('2x + 3x'); // → "5x"

// Check equivalence
const equiv = areEquivalent('1/2', '0.5');       // → true
```

---

## Database Schema

### Table: `question_templates`

```sql
CREATE TABLE question_templates (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  statement JSONB NOT NULL,
  variables JSONB,
  answer JSONB NOT NULL,
  options JSONB,
  precision JSONB,
  grades TEXT[] NOT NULL,
  delay INTEGER,
  correction JSONB,
  transform_type TEXT,
  blanks JSONB,
  choices JSONB,
  multiple_answers BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);
```

**RLS Policies:**
- Admins: Full CRUD access
- Teachers: Read-only access

---

## REST API

### Endpoints

```
GET    /api/questions/templates          # List templates (with filters)
POST   /api/questions/templates          # Create template (admin only)
GET    /api/questions/templates/[id]     # Get single template
PUT    /api/questions/templates/[id]     # Update template (admin only)
DELETE /api/questions/templates/[id]     # Delete template (admin only)
POST   /api/questions/generate/[id]      # Generate instance
```

### Example Requests

**List templates:**
```bash
GET /api/questions/templates?type=numerical_exact&grades=6,5&limit=10&offset=0
```

**Create template:**
```bash
POST /api/questions/templates
Content-Type: application/json

{
  "type": "numerical_exact",
  "statement": [...],
  "variables": [...],
  "answer": "...",
  "grades": ["6"]
}
```

**Generate instance:**
```bash
POST /api/questions/generate/uuid
Content-Type: application/json

{
  "seed": 42  // Optional
}
```

---

## Type Definitions

### Core Types

```typescript
// Question types
type QuestionType =
  | 'numerical_exact'
  | 'numerical_decimal'
  | 'numerical_rounded'
  | 'algebraic_transform'
  | 'fill_in_blanks'
  | 'multiple_choice';

// Grade levels
type GradeLevel =
  | 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2'
  | '6' | '5' | '4' | '3' | '2'
  | 'SPE_1' | 'SPE_T' | 'T_EXP' | 'T_COMP' | 'STMG';

// Content field
type ContentField =
  | { type: 'text'; content: string }
  | { type: 'image'; url: string; alt?: string };

// Precision
type PrecisionType =
  | { type: 'none' }
  | { type: 'decimal'; digits: number }
  | { type: 'significant'; digits: number }
  | { type: 'magnitude'; digits: number }
  | { type: 'tolerance'; tolerance: number; mode: 'absolute' | 'relative' };
```

**Full types:** See `src/lib/questions/types.ts`

---

## Testing

### Unit Tests (to be written)

```bash
# Run all question system tests
pnpm test:unit questions

# Run specific test suite
pnpm test:unit random-parser
pnpm test:unit variable-resolver
pnpm test:unit instance-generator
```

### Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { parseRandomExpression } from '$lib/questions';

describe('Random Parser', () => {
  it('should parse integer range', () => {
    const spec = parseRandomExpression('{#:1-10}');
    expect(spec.type).toBe('integer');
    expect(spec.min).toBe(1);
    expect(spec.max).toBe(10);
  });

  it('should parse exclusions', () => {
    const spec = parseRandomExpression('{#:1-20!5,7-9}');
    expect(spec.exclusions).toHaveLength(3);
  });
});
```

---

## Best Practices

### Variable Naming

✅ **Good:**
```typescript
{ name: 'numerator', expression: '{#:1-100}' }
{ name: 'denominator', expression: '{#:1-10!0}' }
{ name: 'result', expression: '{eval:{@:numerator}/{@:denominator}}' }
```

❌ **Bad:**
```typescript
{ name: 'x', expression: '{#:1-100}' }
{ name: 'y', expression: '{#:1-10!0}' }
{ name: 'z', expression: '{eval:{@:x}/{@:y}}' }
```

### Dependency Order

✅ **Good:**
```typescript
{ name: 'max', expression: '20' }
{ name: 'a', expression: '{#:1-{@:max}}' }
```

❌ **Bad:**
```typescript
{ name: 'a', expression: '{#:1-{@:max}}' }  // max not yet defined
{ name: 'max', expression: '20' }
```

### Error Prevention

```typescript
// ✅ Avoid division by zero
{ name: 'divisor', expression: '{#:1-10!0}' }

// ✅ Ensure different values
{ name: 'a', expression: '{#:1-10}' }
{ name: 'b', expression: '{#:1-10!{@:a}}' }

// ✅ Validate range
if (min >= max) throw new Error('Invalid range');
```

---

## Troubleshooting

### Common Errors

**Error:** "Variable X not found or not yet resolved"
- **Cause:** Variable used before definition
- **Fix:** Reorder variables in declaration order

**Error:** "Circular reference detected: a -> b -> a"
- **Cause:** Variables reference each other in a loop
- **Fix:** Remove circular dependency

**Error:** "Invalid range: min (10) must be less than max (5)"
- **Cause:** Variable bounds resolved to invalid range
- **Fix:** Check variable values and constraints

**Error:** "Unable to generate random number after 10000 attempts"
- **Cause:** Too many exclusions or impossible constraints
- **Fix:** Reduce exclusions or expand range

---

## Performance Tips

1. **Use pagination** for large template lists
2. **Cache parsed templates** (future optimization)
3. **Limit variable depth** (avoid deep recursion)
4. **Index database** on frequently queried fields
5. **Use seeded random** for reproducible instances

---

## Contributing

When adding new features:

1. **Add types** in `types.ts`
2. **Implement parser** if new syntax
3. **Add generator logic** in appropriate module
4. **Write unit tests** for all new code
5. **Update documentation** (this file + syntax guide)
6. **Test edge cases** (circular deps, invalid input, etc.)

---

## Resources

- **Syntax Guide:** `QUESTIONS_SYNTAX_GUIDE.md`
- **Implementation Status:** `QUESTIONS_IMPLEMENTATION_STATUS.md`
- **MathLive Docs:** https://cortexjs.io/compute-engine/
- **API Reference:** (to be created) `QUESTIONS_API.md`

---

**Version:** 1.0.0 (Phase 1 & 2 Complete)
**Last Updated:** 2025-01-19
