# Question Variations Test Update Guide

## Overview

The existing test files need to be updated to work with the new variations structure. The validator and generator have been updated to handle `variations`, but the test files still use the old single-field structure.

## Test Files to Update

1. **`src/lib/questions/validators/template-validator.test.ts`** (667 lines)
2. **`src/lib/questions/generator/instance-generator.test.ts`** (needs checking)

## Key Changes Required

### Old Structure (Pre-Variations)
```typescript
const template: QuestionTemplate = {
  id: 'test-1',
  type: 'numerical_exact',
  statement: [{ type: 'text', content: 'Calculate 2 + 3' }],
  variables: [],
  answer: '5',
  // ...
};
```

### New Structure (With Variations)
```typescript
const template: QuestionTemplate = {
  id: 'test-1',
  type: 'numerical_exact',
  variations: [
    {
      statement: [{ type: 'text', content: 'Calculate 2 + 3' }],
      variables: [],
      answer: '5'
    }
  ],
  grades: ['6'],
  theme: 'Arithmétique',
  domain: 'Addition',
  level: 1,
  // ...
};
```

## Update Pattern

For each test:

1. **Wrap per-variation fields in `variations` array**:
   - `statement` → `variations[0].statement`
   - `variables` → `variations[0].variables`
   - `answer` → `variations[0].answer`
   - `correction` → `variations[0].correction`
   - `blanks` → `variations[0].blanks`
   - `choices` → `variations[0].choices`

2. **Keep shared fields at template level**:
   - `type` (stays at template level)
   - `grades` (stays at template level)
   - `precision` (stays at template level)
   - `transformType` (stays at template level)
   - `multipleAnswers` (stays at template level)
   - `theme`, `domain`, `subdomain`, `level` (stays at template level)

## Example Test Update

### Before (Old Structure)
```typescript
it('should validate simple numerical exact template', () => {
  const template: QuestionTemplate = {
    id: 'test-1',
    type: 'numerical_exact',
    statement: [{ type: 'text', content: 'Calculate 2 + 3' }],
    variables: [],
    answer: '5',
    precision: { type: 'none' },
    grades: ['6'],
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'test-user'
  };

  const result = validateTemplate(template);

  expect(result.valid).toBe(true);
  expect(result.errors).toEqual([]);
});
```

### After (With Variations)
```typescript
it('should validate simple numerical exact template', () => {
  const template: QuestionTemplate = {
    id: 'test-1',
    type: 'numerical_exact',
    variations: [
      {
        statement: [{ type: 'text', content: 'Calculate 2 + 3' }],
        variables: [],
        answer: '5'
      }
    ],
    precision: { type: 'none' },
    grades: ['6'],
    theme: 'Arithmétique',
    domain: 'Addition',
    level: 1,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'test-user'
  };

  const result = validateTemplate(template);

  expect(result.valid).toBe(true);
  expect(result.errors).toEqual([]);
});
```

## New Tests to Add

### 1. Variation Array Validation

```typescript
describe('validateTemplate - Variation Validation', () => {
  it('should fail on missing variations array', () => {
    const template: any = {
      id: 'test',
      type: 'numerical_exact',
      precision: { type: 'none' },
      grades: ['6'],
      theme: 'Test',
      domain: 'Test',
      level: 1
    };

    const result = validateTemplate(template);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('variations'))).toBe(true);
  });

  it('should fail on empty variations array', () => {
    const template: QuestionTemplate = {
      id: 'test',
      type: 'numerical_exact',
      variations: [],
      precision: { type: 'none' },
      grades: ['6'],
      theme: 'Test',
      domain: 'Test',
      level: 1,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'test-user'
    };

    const result = validateTemplate(template);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('at least 1 variation'))).toBe(true);
  });

  it('should validate template with multiple variations', () => {
    const template: QuestionTemplate = {
      id: 'test',
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
            { name: 'b', expression: '{#:1-9}' }
          ],
          answer: '{eval:{@:a}-{@:b}}'
        }
      ],
      precision: { type: 'none' },
      grades: ['6'],
      theme: 'Arithmétique',
      domain: 'Opérations',
      level: 1,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'test-user'
    };

    const result = validateTemplate(template);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should fail if any variation is invalid', () => {
    const template: QuestionTemplate = {
      id: 'test',
      type: 'numerical_exact',
      variations: [
        {
          statement: [{ type: 'text', content: 'Valid variation' }],
          variables: [],
          answer: '5'
        },
        {
          statement: [], // Invalid: empty statement
          variables: [],
          answer: '10'
        }
      ],
      precision: { type: 'none' },
      grades: ['6'],
      theme: 'Test',
      domain: 'Test',
      level: 1,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'test-user'
    };

    const result = validateTemplate(template);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Variation 2'))).toBe(true);
  });
});
```

### 2. Variation Selection Tests (instance-generator.test.ts)

```typescript
describe('generateInstance - Variation Selection', () => {
  it('should select variation deterministically with seed', () => {
    const template: QuestionTemplate = {
      id: 'test',
      type: 'numerical_exact',
      variations: [
        {
          statement: [{ type: 'text', content: 'First' }],
          variables: [],
          answer: '1'
        },
        {
          statement: [{ type: 'text', content: 'Second' }],
          variables: [],
          answer: '2'
        },
        {
          statement: [{ type: 'text', content: 'Third' }],
          variables: [],
          answer: '3'
        }
      ],
      precision: { type: 'none' },
      grades: ['6'],
      theme: 'Test',
      domain: 'Test',
      level: 1,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'test-user'
    };

    // Test that same seed always produces same variation
    const result1 = generateInstance(template, 12);
    const result2 = generateInstance(template, 12);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    if (result1.success && result2.success) {
      expect(result1.instance.selectedVariationIndex).toBe(result2.instance.selectedVariationIndex);
      expect(result1.instance.answer).toBe(result2.instance.answer);
    }
  });

  it('should use modulo to select variation index', () => {
    const template: QuestionTemplate = {
      id: 'test',
      type: 'numerical_exact',
      variations: [
        { statement: [{ type: 'text', content: 'V0' }], variables: [], answer: '0' },
        { statement: [{ type: 'text', content: 'V1' }], variables: [], answer: '1' },
        { statement: [{ type: 'text', content: 'V2' }], variables: [], answer: '2' }
      ],
      precision: { type: 'none' },
      grades: ['6'],
      theme: 'Test',
      domain: 'Test',
      level: 1,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'test-user'
    };

    // Seed 0 → index 0, seed 1 → index 1, seed 2 → index 2, seed 3 → index 0
    const result0 = generateInstance(template, 0);
    const result1 = generateInstance(template, 1);
    const result2 = generateInstance(template, 2);
    const result3 = generateInstance(template, 3);

    expect(result0.success && result0.instance.selectedVariationIndex).toBe(0);
    expect(result1.success && result1.instance.selectedVariationIndex).toBe(1);
    expect(result2.success && result2.instance.selectedVariationIndex).toBe(2);
    expect(result3.success && result3.instance.selectedVariationIndex).toBe(0);
  });

  it('should handle negative seeds correctly', () => {
    const template: QuestionTemplate = {
      id: 'test',
      type: 'numerical_exact',
      variations: [
        { statement: [{ type: 'text', content: 'V0' }], variables: [], answer: '0' },
        { statement: [{ type: 'text', content: 'V1' }], variables: [], answer: '1' }
      ],
      precision: { type: 'none' },
      grades: ['6'],
      theme: 'Test',
      domain: 'Test',
      level: 1,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'test-user'
    };

    // Should use Math.abs(seed) % variations.length
    const resultNeg5 = generateInstance(template, -5);
    const resultPos5 = generateInstance(template, 5);

    expect(resultNeg5.success && resultPos5.success).toBe(true);

    if (resultNeg5.success && resultPos5.success) {
      expect(resultNeg5.instance.selectedVariationIndex).toBe(resultPos5.instance.selectedVariationIndex);
    }
  });
});
```

## Running Tests

After updating the tests:

```bash
# Run all question tests
pnpm test:unit questions

# Run specific test file
pnpm test:unit template-validator.test.ts

# Run in watch mode
pnpm test:unit --watch questions
```

## Status

- **Validator Updated**: ✅ (handles variations array)
- **Generator Updated**: ✅ (selects variation by index)
- **Tests Updated**: ⏳ Pending (this guide provides the update pattern)

## Estimated Effort

- **template-validator.test.ts**: ~2-3 hours (95+ test cases to update)
- **instance-generator.test.ts**: ~1-2 hours (check + add new tests)
- **New variation tests**: ~1 hour (add tests from examples above)

**Total**: ~4-6 hours for complete test coverage
