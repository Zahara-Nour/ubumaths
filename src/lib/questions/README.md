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
  variations: [
    {
      statement: [
        { type: 'text', content: 'Calculate: $${@:a} + {@:b}$$' }
      ],
      variables: [
        { name: 'a', expression: '{#:1-10}' },
        { name: 'b', expression: '{#:1-10}' }
      ],
      answer: '{eval:{@:a}+{@:b}}'
    }
  ],
  grades: ['6'],
  theme: 'Arithmétique',
  domain: 'Addition',
  level: 1,
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
  variations: [
    {
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
      answer: '\\frac{{@:a}}{{@:b}}'
    }
  ],
  precision: { type: 'none' },
  grades: ['6', '5'],
  theme: 'Fractions',
  domain: 'Simplification',
  level: 2,
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

**Important:** All variable references (`{@:}`) and random expressions (`{#:}`) inside an `{eval:}` expression are **fully resolved BEFORE** being passed to MathLive's Compute Engine. The engine only receives a clean mathematical expression with actual numbers.

**Resolution Process:**
1. Initial: `{eval:{@:a}+{@:b}}`
2. After variable replacement (if a=5, b=7): `{eval:5+7}`
3. Extract `5+7`, pass to Compute Engine
4. Engine returns `12`
5. Final result: `"12"`

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
    │    │
    │    ├─> Stage 1: Replace {@:otherVar} with resolved values
    │    │    Example: '{eval:{@:a}+{@:b}}' → '{eval:5+7}'
    │    │
    │    ├─> Stage 2: Generate {#:random} numbers
    │    │    Example: '{#:1-10}' → '7'
    │    │
    │    └─> Stage 3: Evaluate {eval:expression} with MathLive
    │         Example: '{eval:5+7}' → Extract '5+7'
    │                              → Pass to Compute Engine
    │                              → Returns '12'
    │
    ├─> Resolve content fields (statement, correction)
    │
    ├─> Shuffle choices (QCM)
    │
    └─> Instance (JSON)
```

**Key Point:** In Stage 3, the MathLive Compute Engine NEVER sees the original `{@:}` or `{#:}` syntax - it only receives fully resolved mathematical expressions like `"5+7"` or `"sqrt(25)"` with actual numbers.

---

## Template Variations

### Overview

Templates support **multiple variations** to generate diverse problem sets from a single template. Each variation has independent statement, variables, answer, correction, blanks, and choices. When generating an instance, one variation is selected either deterministically (using a seed) or randomly.

**Key Concept**: Variations allow related problem types to be grouped under one template. For example, an "Operations" template can have variations for addition, subtraction, multiplication, and division.

### Architecture

#### Data Structure

**Per-Variation Fields** (inside `variations` array):
- `statement: ContentField[]` - Question text/images
- `variables: QuestionVariable[]` - Variable definitions
- `answer: string | string[]` - Expected answer(s)
- `correction?: ContentField[]` - Optional solution steps
- `blanks?: { position: number; expectedAnswer: string }[]` - Fill-in-blanks
- `choices?: { content: ContentField; isCorrect: boolean }[]` - Multiple choice

**Shared Template Fields** (at template level):
- `type: QuestionType` - Question type (same for all variations)
- `grades: Grade[]` - Target grade levels
- `theme: string` - Categorization theme
- `domain: string` - Categorization domain
- `subdomain?: string` - Optional sub-domain
- `level: number` - Difficulty level
- `precision?: PrecisionType` - Numerical precision (numerical questions)
- `transformType?: AlgebraicTransformType` - Transform type (algebraic questions)
- `multipleAnswers?: boolean` - Multiple correct answers (QCM)
- `delay?: number` - Time limit in seconds

#### Variation Selection Algorithm

```typescript
// In instance-generator.ts

// Select variation index
const variationIndex = Math.abs(seed) % template.variations.length;
const variation = template.variations[variationIndex];

// Generate instance from selected variation
const instance = {
  selectedVariationIndex: variationIndex,
  statement: resolveContent(variation.statement, resolvedVars),
  answer: resolveAnswer(variation.answer, resolvedVars),
  // ...
};
```

**Properties**:
- **Deterministic**: Same seed always selects same variation
- **Uniform distribution**: Each variation equally likely over many seeds
- **Wraps around**: For N variations, seed % N gives index 0 to N-1

### Example: Single Variation Template

```typescript
const template: QuestionTemplate = {
  id: 'uuid',
  type: 'numerical_exact',
  variations: [
    {
      statement: [{ type: 'text', content: 'Calculate: $${@:a} + {@:b}$$' }],
      variables: [
        { name: 'a', expression: '{#:10-50}' },
        { name: 'b', expression: '{#:10-50}' }
      ],
      answer: '{eval:{@:a}+{@:b}}'
    }
  ],
  grades: ['6'],
  theme: 'Arithmétique',
  domain: 'Addition',
  level: 1
};

// Generate instance
const result = generateInstance(template, 42);
// Always uses variations[0] (only variation available)
```

### Example: Multi-Variation Template

```typescript
const template: QuestionTemplate = {
  id: 'uuid',
  type: 'numerical_exact',
  variations: [
    // Variation 1: Addition
    {
      statement: [{ type: 'text', content: 'Calculate: $${@:a} + {@:b}$$' }],
      variables: [
        { name: 'a', expression: '{#:10-50}' },
        { name: 'b', expression: '{#:10-50}' }
      ],
      answer: '{eval:{@:a}+{@:b}}'
    },
    // Variation 2: Subtraction
    {
      statement: [{ type: 'text', content: 'Calculate: $${@:a} - {@:b}$$' }],
      variables: [
        { name: 'a', expression: '{#:20-99}' },
        { name: 'b', expression: '{#:10-{@:a}}' }
      ],
      answer: '{eval:{@:a}-{@:b}}'
    },
    // Variation 3: Multiplication
    {
      statement: [{ type: 'text', content: 'Calculate: $${@:a} \\times {@:b}$$' }],
      variables: [
        { name: 'a', expression: '{#:2-12}' },
        { name: 'b', expression: '{#:2-12}' }
      ],
      answer: '{eval:{@:a}*{@:b}}'
    },
    // Variation 4: Division
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
};

// Generate instances
generateInstance(template, 0);  // Uses variations[0] (Addition)
generateInstance(template, 1);  // Uses variations[1] (Subtraction)
generateInstance(template, 2);  // Uses variations[2] (Multiplication)
generateInstance(template, 3);  // Uses variations[3] (Division)
generateInstance(template, 4);  // Uses variations[0] (wraps around)
generateInstance(template, 42); // Uses variations[2] (42 % 4 = 2)
```

### Implementation Details

#### instance-generator.ts

```typescript
export function generateInstance(
  template: QuestionTemplate,
  seed?: number
): GenerationResult {
  const effectiveSeed = seed ?? Math.floor(Math.random() * 1000000);

  // Select variation
  const variationIndex = Math.abs(effectiveSeed) % template.variations.length;
  const variation = template.variations[variationIndex];

  // Resolve variables for this variation only
  const resolvedVars = resolveVariables(variation.variables, effectiveSeed);

  // Generate instance from selected variation
  const instance: QuestionInstance = {
    id: generateId(),
    templateId: template.id,
    type: template.type,
    selectedVariationIndex: variationIndex,
    statement: resolveContent(variation.statement, resolvedVars),
    answer: resolveAnswer(variation.answer, resolvedVars),
    correction: variation.correction
      ? resolveContent(variation.correction, resolvedVars)
      : undefined,
    blanks: variation.blanks,
    choices: variation.choices
      ? shuffleChoices(variation.choices, effectiveSeed)
      : undefined,
    seed: effectiveSeed
  };

  return { success: true, instance };
}
```

#### template-validator.ts

```typescript
export function validateTemplate(template: QuestionTemplate): string[] {
  const errors: string[] = [];

  // Validate variations array
  if (!template.variations || template.variations.length === 0) {
    errors.push('Template must have at least one variation');
    return errors;
  }

  // Validate each variation independently
  template.variations.forEach((variation, index) => {
    const varErrors = validateVariation(variation, template.type);

    // Prefix errors with variation index
    varErrors.forEach(err => {
      errors.push(`Variation ${index + 1}: ${err}`);
    });

    // Check circular dependencies within variation
    const circularErrors = detectCircularDependencies(variation.variables);
    circularErrors.forEach(err => {
      errors.push(`Variation ${index + 1}: ${err}`);
    });
  });

  return errors;
}

function validateVariation(variation: QuestionVariation, type: QuestionType): string[] {
  const errors: string[] = [];

  // Statement required
  if (!variation.statement || variation.statement.length === 0) {
    errors.push('Statement is required');
  }

  // Answer required
  if (!variation.answer ||
      (Array.isArray(variation.answer) && variation.answer.length === 0)) {
    errors.push('Answer is required');
  }

  // Type-specific validation
  // ...

  return errors;
}
```

### Database Schema

**Migration 074** (`add_template_variations.sql`):

```sql
-- Add variations column
ALTER TABLE question_templates
ADD COLUMN variations JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Constraint: at least 1 variation
ALTER TABLE question_templates
ADD CONSTRAINT check_variations_not_empty
CHECK (jsonb_array_length(variations) > 0);

-- Migrate existing data (wrap old fields into single variation)
UPDATE question_templates
SET variations = jsonb_build_array(
  jsonb_build_object(
    'statement', statement,
    'variables', COALESCE(variables, '[]'::jsonb),
    'answer', answer,
    'correction', correction,
    'blanks', COALESCE(blanks, '[]'::jsonb),
    'choices', COALESCE(choices, '[]'::jsonb)
  )
)
WHERE variations = '[]'::jsonb;

-- Drop old columns
ALTER TABLE question_templates
DROP COLUMN statement,
DROP COLUMN variables,
DROP COLUMN answer,
DROP COLUMN correction,
DROP COLUMN blanks,
DROP COLUMN choices;
```

### Testing

#### Unit Tests

```typescript
describe('Variation Selection', () => {
  it('selects variation deterministically with seed', () => {
    const template = createTemplateWithVariations(4);

    const result0 = generateInstance(template, 0);
    expect(result0.instance.selectedVariationIndex).toBe(0);

    const result1 = generateInstance(template, 1);
    expect(result1.instance.selectedVariationIndex).toBe(1);

    const result4 = generateInstance(template, 4);
    expect(result4.instance.selectedVariationIndex).toBe(0); // Wraps
  });

  it('validates each variation independently', () => {
    const template: QuestionTemplate = {
      variations: [
        { statement: [], variables: [], answer: '5' }, // Invalid statement
        { statement: [{ type: 'text', content: 'Q' }], variables: [], answer: '' } // Invalid answer
      ],
      // ...
    };

    const errors = validateTemplate(template);
    expect(errors).toContain('Variation 1: Statement is required');
    expect(errors).toContain('Variation 2: Answer is required');
  });

  it('detects circular dependencies per variation', () => {
    const template: QuestionTemplate = {
      variations: [
        {
          variables: [
            { name: 'a', expression: '{@:b}' },
            { name: 'b', expression: '{@:a}' }
          ],
          // ...
        }
      ],
      // ...
    };

    const errors = validateTemplate(template);
    expect(errors).toContain('Variation 1: Circular reference detected: a -> b -> a');
  });
});
```

### Best Practices

**DO**:
- ✅ Use variations for related problem types (operations, shapes, equation types)
- ✅ Keep variables scoped to their variation (no cross-variation references)
- ✅ Test each variation independently
- ✅ Ensure variations share the same conceptual theme
- ✅ Document variation purpose in comments

**DON'T**:
- ❌ Mix unrelated concepts (use separate templates)
- ❌ Create templates with 0 variations (minimum 1 required)
- ❌ Reference variables from other variations (not supported)
- ❌ Forget to validate all variations before saving

### Migration from Old Structure

**Before (single-field structure)**:
```typescript
{
  type: 'numerical_exact',
  statement: [...],
  variables: [...],
  answer: '...',
  grades: ['6']
}
```

**After (variations structure)**:
```typescript
{
  type: 'numerical_exact',
  variations: [
    {
      statement: [...],
      variables: [...],
      answer: '...'
    }
  ],
  grades: ['6']
}
```

**Automatic Migration**: Migration 074 automatically wraps existing templates into single-variation format. No manual intervention required.

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

## Testing

The Question Variations System has a comprehensive test suite with **99.7% code coverage** (367 passing tests, 6 skipped).

### Running Tests

```bash
# Run all question system tests
pnpm test:unit src/lib/questions

# Run specific test file
pnpm test:unit tokenizer.test.ts
pnpm test:unit variable-resolver.test.ts

# Run tests in watch mode
pnpm test:unit --watch src/lib/questions
```

### Test Structure

```
src/lib/questions/
├── parser/
│   ├── tokenizer.test.ts          # 31 tests - Token extraction
│   ├── variable-parser.test.ts    # 31 tests - Variable reference parsing
│   ├── random-parser.test.ts      # 29 tests - Random expression parsing
│   └── eval-parser.test.ts        # 42 tests - Eval expression parsing
├── generator/
│   ├── variable-resolver.test.ts  # 39 tests - Variable resolution pipeline
│   ├── random-generator.test.ts   # 36 tests - Random number generation
│   ├── content-resolver.test.ts   # 41 tests - Content field resolution
│   ├── instance-generator.test.ts # 27 tests - Complete instance generation
│   └── choice-shuffler.test.ts    # 23 tests - Multiple choice shuffling
└── validators/
    ├── template-validator.test.ts # 34 tests - Template validation
    └── circular-dependency.test.ts # 40 tests - Dependency detection
```

### Test Coverage

- **Parser Layer:** 100% coverage - All syntax parsing tested
- **Generator Layer:** 100% coverage - All generation logic tested
- **Validator Layer:** 100% coverage - All validation rules tested
- **Integration Tests:** Complete instance generation workflow tested

### Key Test Patterns

**Testing Variable Resolution:**
```typescript
const variables: QuestionVariable[] = [
  { name: 'a', expression: '{#:1-10}' },
  { name: 'b', expression: '{eval:{@:a} * 2}' }
];

const resolved = resolveVariables(variables, 12345); // Seeded
const result = toObject(resolved); // Convert to { a: 5, b: 10 }

expect(result.b).toBe(result.a * 2);
```

**Testing Content Resolution:**
```typescript
const fields: ContentField[] = [
  { type: 'text', content: 'Value: {@:a}' },
  { type: 'image', content: 'https://example.com/{@:id}.png' }
];

const resolved = toResolvedVariables({ a: 5, id: 'diagram' });
const result = resolveContentFields(fields, resolved);

expect(result[0].content).toBe('Value: 5');
expect(result[1].content).toBe('https://example.com/diagram.png');
```

**Testing Instance Generation:**
```typescript
const template: QuestionTemplate = { /* ... */ };
const result = generateInstance(template, 12345);

expect(result.success).toBe(true);
expect(result.instance.statement).toBeDefined();
expect(result.instance.answer).toBeDefined();
```

### Recent Test Fixes (2025-01)

The test suite was recently updated to align with implementation changes:

1. **Tokenizer** - Added helper functions for extracting variables, random expressions, eval expressions, and LaTeX
2. **Variable Parser** - Standardized property names (`startIndex`/`endIndex` instead of `start`/`end`)
3. **Random Generator** - Added dual-format support for variable contexts (array and object)
4. **Random Parser** - Fixed variable bounds parsing with `splitAtTopLevel()`
5. **Eval Parser** - Standardized property naming (`fullMatch` instead of `raw`)
6. **Variable Resolver** - Fixed eval expression property access
7. **Content Resolver** - Fixed image URL variable resolution
8. **Types** - Updated `ContentField` to use `content` for both text and image fields

All tests now pass with proper expectations aligned to the actual implementation behavior.

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
