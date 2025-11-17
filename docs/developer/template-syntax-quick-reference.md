# Template Syntax Quick Reference

Quick reference for developers working with UbuMaths template systems.

**Last Updated**: 2025-11-17

---

## Two Syntaxes Explained

UbuMaths currently uses **two different template syntaxes**:

1. **Questions Syntax** - Single-brace (`{@:var}`) - Used in database
2. **Markdown Syntax** - Double-brace (`{{var}}`) - Used in shared library

**Why?** Historical reasons. An adapter bridges them at runtime.

**For developers**: Know which syntax you're working with!

---

## Questions Syntax (Single-Brace)

**Used in**:

- Database templates (`question_templates` table)
- Seed template files
- Question creation UI
- Migration from old system

### Variable References

```typescript
{@:varName}        // Reference to variable 'varName'
{@:a}              // Reference to variable 'a'
{@:max}            // Reference to variable 'max'
```

### Random Numbers

```typescript
// Integer range
{#:1-10}                    // Random integer 1 to 10
{#:-5-5}                    // Random integer -5 to 5
{#:1-{@:max}}              // Random with variable upper bound

// Decimal by digits
{#:2.3}                     // 2 digits before, 3 after decimal
{#:1.2}                     // e.g., 7.89

// Decimal range with step
{#:0.5-9.99:0.01}          // Random decimal 0.5 to 9.99, step 0.01

// Exclusions
{#:1-10!5}                  // Random 1-10 excluding 5
{#:1-20!5-7}               // Excluding 5, 6, 7
{#:1-100!{@:a}}            // Excluding variable 'a'
{#:1-50!5,7-9,{@:x}}       // Multiple exclusions
```

### Evaluation

```typescript
{eval:a+b}                        // Evaluate expression
{eval:{@:a}+{@:b}}               // With variable references
{eval:sqrt({@:a}^2+{@:b}^2)}     // Complex expression
{eval:({@:num1}+{@:num2})/{@:den}}  // Nested operations
```

### Complete Example

```typescript
// Database template
{
  "statement": [{
    "type": "text",
    "content": "Calculate {@:a} + {@:b}"
  }],
  "variables": [
    { "name": "a", "expression": "{#:1-10}" },
    { "name": "b", "expression": "{#:1-10}" },
    { "name": "sum", "expression": "{eval:{@:a}+{@:b}}" }
  ],
  "answer": "{@:sum}"
}
```

---

## Markdown Syntax (Double-Brace)

**Used in**:

- Shared parameterization library
- Exercises module
- Direct library usage
- Markdown documentation standards

### Variable References

```typescript
{
	{
		varName;
	}
} // Reference to variable 'varName'
{
	{
		a;
	}
} // Reference to variable 'a'
{
	{
		max;
	}
} // Reference to variable 'max'
```

### Random Numbers

```typescript
// Integer range (explicit)
{{random:1-10}}              // Random integer 1 to 10
{{random:-5-5}}              // Random integer -5 to 5
{{random:1-{{max}}}}         // Random with variable upper bound

// Integer range (shorthand)
{{1-10}}                     // Shorthand for random:1-10
{{-5-5}}                     // Shorthand for random:-5-5

// Decimal by digits (explicit)
{{random:2.3}}               // 2 digits before, 3 after decimal

// Decimal by digits (shorthand)
{{2.3}}                      // Shorthand for random:2.3
{{1.2}}                      // e.g., 7.89

// Decimal range with step
{{random:0.5-9.99:0.01}}    // Random decimal with step
{{0.5-9.99:0.01}}           // Shorthand version

// Exclusions (explicit)
{{random:1-10!5}}            // Random 1-10 excluding 5
{{random:1-20!5-7}}         // Excluding range 5-7

// Exclusions (shorthand)
{{1-10!5}}                   // Shorthand for random:1-10!5
{{1-100!{{a}}}}             // Excluding variable
{{1-50!5,7-9,{{x}}}}        // Multiple exclusions
```

### Evaluation

```typescript
{{eval:a+b}}                          // Evaluate expression
{{eval:{{a}}+{{b}}}}                 // With variable references
{{eval:sqrt({{a}}^2+{{b}}^2)}}       // Complex expression
{{eval:({{num1}}+{{num2}})/{{den}}}} // Nested operations
```

### Complete Example

```typescript
// Shared library usage
{
  "statement": [{
    "type": "text",
    "content": "Calculate {{a}} + {{b}}"
  }],
  "variables": [
    { "name": "a", "expression": "{{random:1-10}}" },
    { "name": "b", "expression": "{{random:1-10}}" },
    { "name": "sum", "expression": "{{eval:{{a}}+{{b}}}}" }
  ],
  "answer": "{{sum}}"
}
```

---

## Conversion Between Syntaxes

### Questions → Markdown

```typescript
import { convertToMarkdownSyntax } from '$lib/questions/generator/syntax-adapter';

// Basic conversions
convertToMarkdownSyntax('{@:a}'); // → '{{a}}'
convertToMarkdownSyntax('{#:1-10}'); // → '{{random:1-10}}'
convertToMarkdownSyntax('{eval:a+b}'); // → '{{eval:a+b}}'

// Nested conversions
convertToMarkdownSyntax('{#:1-{@:max}}'); // → '{{random:1-{{max}}}}'
convertToMarkdownSyntax('{eval:{@:a}+{@:b}}'); // → '{{eval:{{a}}+{{b}}}}'

// Complex template
const questionsTemplate = 'Calculate {@:a} + {@:b} = {eval:{@:a}+{@:b}}';
const markdownTemplate = convertToMarkdownSyntax(questionsTemplate);
// → 'Calculate {{a}} + {{b}} = {{eval:{{a}}+{{b}}}}'
```

### Markdown → Questions

```typescript
import { convertToQuestionsSyntax } from '$lib/questions/generator/syntax-adapter';

// Basic conversions
convertToQuestionsSyntax('{{a}}'); // → '{@:a}'
convertToQuestionsSyntax('{{random:1-10}}'); // → '{#:1-10}'
convertToQuestionsSyntax('{{1-10}}'); // → '{#:1-10}' (shorthand normalized)
convertToQuestionsSyntax('{{eval:a+b}}'); // → '{eval:a+b}'

// Nested conversions
convertToQuestionsSyntax('{{random:1-{{max}}}}'); // → '{#:1-{@:max}}'
convertToQuestionsSyntax('{{eval:{{a}}+{{b}}}}'); // → '{eval:{@:a}+{@:b}}'
```

### Auto-Detection

```typescript
import { detectSyntax, normalizeToMarkdown } from '$lib/questions/generator/syntax-adapter';

// Detect what syntax is being used
detectSyntax('{@:a}'); // → 'questions'
detectSyntax('{{a}}'); // → 'markdown'
detectSyntax('{@:a} and {{b}}'); // → 'mixed'
detectSyntax('Plain text'); // → 'none'

// Normalize to Markdown (safe for any input)
normalizeToMarkdown('{@:a}'); // → '{{a}}'
normalizeToMarkdown('{{a}}'); // → '{{a}}' (unchanged)
normalizeToMarkdown('{@:a} and {{b}}'); // → '{{a}} and {{b}}'
normalizeToMarkdown('Plain text'); // → 'Plain text' (unchanged)
```

---

## When to Use Which Syntax

### Use Questions Syntax When:

1. **Creating database templates**:

   ```typescript
   // In template creation UI or seed files
   const template = {
   	statement: 'Calculate {@:a} + {@:b}',
   	variables: [{ name: 'a', expression: '{#:1-10}' }]
   };
   ```

2. **Writing seed templates**:

   ```typescript
   // In seed files that will be inserted into database
   INSERT INTO question_templates (variations) VALUES
   ('[{"statement": [{"type": "text", "content": "Calculate {@:a}"}]}]');
   ```

3. **Following database patterns**:
   ```typescript
   // When reading/modifying existing templates from DB
   const dbTemplate = await supabase.from('question_templates').select('variations').single();
   // dbTemplate.variations uses {@:var} syntax
   ```

### Use Markdown Syntax When:

1. **Using shared library directly**:

   ```typescript
   import { resolveVariables } from '$lib/shared/parameterization';

   const variables = [
   	{ name: 'a', expression: '{{random:1-10}}' } // Markdown syntax
   ];
   const resolved = resolveVariables(variables);
   ```

2. **Creating exercises**:

   ```typescript
   // Exercises module uses Markdown syntax
   const exercise = {
   	content: 'Solve {{a}} + {{b}}',
   	variables: [{ name: 'a', expression: '{{1-10}}' }]
   };
   ```

3. **Writing documentation**:

   ```markdown
   # Example

   Use `{{varName}}` to reference variables.
   Use `{{random:1-10}}` for random numbers.
   ```

---

## Common Patterns

### Nested Variable References

```typescript
// Questions syntax
{
  name: 'max',
  expression: '10'
},
{
  name: 'a',
  expression: '{#:1-{@:max}}'  // Uses max variable
}

// Markdown syntax
{
  name: 'max',
  expression: '10'
},
{
  name: 'a',
  expression: '{{random:1-{{max}}}}'  // Uses max variable
}
```

### Exclusion of Previous Values

```typescript
// Questions syntax
{
  name: 'a',
  expression: '{#:1-10}'
},
{
  name: 'b',
  expression: '{#:1-10!{@:a}}'  // Exclude value of 'a'
}

// Markdown syntax
{
  name: 'a',
  expression: '{{random:1-10}}'
},
{
  name: 'b',
  expression: '{{random:1-10!{{a}}}}'  // Exclude value of 'a'
}
```

### Complex Evaluation

```typescript
// Questions syntax
{
  name: 'a',
  expression: '{#:1-10}'
},
{
  name: 'b',
  expression: '{#:1-10}'
},
{
  name: 'result',
  expression: '{eval:({@:a}+{@:b})^2}'  // (a+b)²
}

// Markdown syntax
{
  name: 'a',
  expression: '{{random:1-10}}'
},
{
  name: 'b',
  expression: '{{random:1-10}}'
},
{
  name: 'result',
  expression: '{{eval:({{a}}+{{b}})^2}}'  // (a+b)²
}
```

### LaTeX with Variables

```typescript
// Questions syntax
{
	statement: [
		{
			type: 'text',
			content: 'Simplify: $$\\frac{{@:num}}{{@:den}}$$'
		}
	];
}

// Markdown syntax
{
	statement: [
		{
			type: 'text',
			content: 'Simplify: $$\\frac{{{num}}}{{{den}}}$$'
		}
	];
}
```

---

## Anti-Patterns (Don't Do This)

### Mixing Syntaxes in Same Template

```typescript
// ❌ DON'T: Mix syntaxes
{
  statement: "Calculate {@:a} + {{b}}",  // MIXED - will break!
  variables: [
    { name: 'a', expression: '{#:1-10}' },
    { name: 'b', expression: '{{random:1-10}}' }  // MIXED - will break!
  ]
}

// ✅ DO: Use consistent syntax
{
  statement: "Calculate {@:a} + {@:b}",
  variables: [
    { name: 'a', expression: '{#:1-10}' },
    { name: 'b', expression: '{#:1-10}' }
  ]
}
```

### Manual Conversion in Application Code

```typescript
// ❌ DON'T: Manually replace strings
const converted = template.replace(/{@:(\w+)}/g, '{{$1}}');

// ✅ DO: Use the adapter
import { convertToMarkdownSyntax } from '$lib/questions';
const converted = convertToMarkdownSyntax(template);
```

### Forgetting Evaluation Syntax

```typescript
// ❌ DON'T: Forget {eval:} wrapper
{
  name: 'sum',
  expression: '{@:a}+{@:b}'  // Will be "5+3" not "8"
}

// ✅ DO: Use {eval:} to evaluate
{
  name: 'sum',
  expression: '{eval:{@:a}+{@:b}}'  // Will be "8"
}
```

---

## Testing Your Templates

### Test Questions Syntax

```typescript
import { generateInstance } from '$lib/questions';

const template = {
	type: 'numerical_exact',
	variations: [
		{
			statement: [{ type: 'text', content: 'Calculate {@:a} + {@:b}' }],
			variables: [
				{ name: 'a', expression: '{#:1-10}' },
				{ name: 'b', expression: '{#:1-10}' }
			],
			answer: '{eval:{@:a}+{@:b}}'
		}
	],
	precision: { type: 'none' },
	grades: ['6'],
	theme: 'arithmetic',
	domain: 'numbers',
	level: 1,
	status: 'active'
};

const result = generateInstance(template, 42);
console.log(result.instance.statement[0].content);
// Should show: "Calculate 7 + 3" (resolved!)
// NOT: "Calculate {@:a} + {@:b}" (unresolved)
```

### Test Markdown Syntax

```typescript
import { resolveVariables } from '$lib/shared/parameterization';

const variables = [
	{ name: 'a', expression: '{{random:1-10}}' },
	{ name: 'b', expression: '{{random:1-10}}' }
];

const resolved = resolveVariables(variables, 42);
console.log(resolved);
// Should show: [{ name: 'a', value: '7' }, { name: 'b', value: '3' }]
```

---

## Troubleshooting

### Templates Not Resolving

**Problem**: Variables show as `{@:a}` instead of numbers.

**Cause**: Database uses Questions syntax but shared library expects Markdown.

**Solution**: Adapter should handle this automatically. If not working:

1. Check adapter is imported:

   ```typescript
   // In variable-resolver.ts
   import { convertToMarkdownSyntax } from './syntax-adapter';
   ```

2. Verify conversion is applied:

   ```typescript
   const converted = convertToMarkdownSyntax(expression);
   ```

3. Run tests:
   ```bash
   pnpm test:unit syntax-adapter
   ```

### Wrong Syntax in Tests

**Problem**: Tests fail because they use wrong syntax.

**Cause**: Tests use Markdown syntax but should use Questions syntax (to match database).

**Solution**: Update tests to use Questions syntax:

```typescript
// ❌ BEFORE (wrong for database tests)
const template = {
	statement: 'Calculate {{a}} + {{b}}',
	variables: [{ name: 'a', expression: '{{1-10}}' }]
};

// ✅ AFTER (correct for database tests)
const template = {
	statement: 'Calculate {@:a} + {@:b}',
	variables: [{ name: 'a', expression: '{#:1-10}' }]
};
```

### Performance Issues

**Problem**: Template generation is slow.

**Cause**: Adapter adds ~5ms overhead per generation.

**Solutions**:

1. **Accept it**: 5ms is usually acceptable
2. **Batch**: Generate multiple instances at once
3. **Cache**: Pre-convert frequently-used templates
4. **Migrate**: Long-term, consider database migration to Markdown syntax

---

## Quick Decision Tree

```
Are you working with...
├─ Database templates?
│  └─ Use Questions syntax: {@:var}, {#:1-10}
│
├─ Shared library directly?
│  └─ Use Markdown syntax: {{var}}, {{random:1-10}}
│
├─ Exercises module?
│  └─ Use Markdown syntax: {{var}}, {{random:1-10}}
│
├─ Not sure?
│  └─ Check existing code in that module
│     ├─ See {@:}? → Questions syntax
│     └─ See {{}}? → Markdown syntax
│
└─ Converting between syntaxes?
   └─ Use adapter functions from syntax-adapter.ts
```

---

## Related Documentation

- **Complete Status**: `.claude/template-system-status.md` - Phase 1 completion details
- **Architecture**: `docs/claude/architecture.md` - Template system section
- **User Guide**: `docs/features/questions/syntax-guide.md` - User-facing syntax reference
- **API Reference**: `QUESTIONS_API.md` - Complete API documentation

---

**Last Updated**: 2025-11-17
**Version**: 1.0.0
