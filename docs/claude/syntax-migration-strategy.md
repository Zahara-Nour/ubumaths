# Template Syntax Migration Strategy

**Status**: Active Dual-Syntax Support
**Last Updated**: 2025-11-19
**Related Files**: `src/lib/questions/generator/syntax-adapter.ts`

---

## 📊 Executive Summary

UbuMaths v2 supports **two template syntaxes** simultaneously for backward compatibility during the migration from TinyMath questions. A **syntax adapter** transparently converts old syntax to the new Markdown-based format at runtime.

**Timeline**:

- **2024**: Old Questions syntax (`{@:var}`, `{#:random}`)
- **2025-11**: Migration to Markdown syntax (`{{var}}`, `{{random:spec}}`)
- **Current**: Dual-syntax support active
- **Future**: Full migration, adapter removal

---

## 🔄 The Two Syntaxes

### Old "Questions" Syntax (Legacy)

Used in:

- Existing questions in database (pre-2025)
- Backward compatibility tests
- Historical TinyMath imports

```typescript
// Variable reference
{@:varName}

// Random integer
{#:1-10}

// Random with variable bounds
{#:{@:min}-{@:max}}

// Random with exclusions
{#:1-10!{@:a}}

// Evaluation
{eval:expression}
```

### New "Markdown" Syntax (Current)

Used in:

- Admin UI (created since Nov 2025)
- TinyMath migrated questions (472+ questions)
- New question templates
- Documentation

```typescript
// Variable reference
{{varName}}

// Random integer
{{random:1-10}}

// Random with variable bounds
{{random:{{min}}-{{max}}}}

// Random with exclusions
{{random:1-10!{{a}}}}

// Evaluation
{{eval:expression}}
```

**Note**: All Markdown syntax uses double braces `{{}}` for consistency, including eval expressions.

---

## 🏗️ Architecture: How Dual-Syntax Works

### Syntax Adapter (`syntax-adapter.ts`)

**Location**: `src/lib/questions/generator/syntax-adapter.ts` (301 lines)

**Purpose**: Transparently convert old syntax → new syntax before processing

```typescript
// Conversion functions
convertToMarkdownSyntax(text: string): string
convertToQuestionsSyntax(text: string): string
detectSyntax(text: string): 'questions' | 'markdown' | 'mixed' | 'none'
normalizeToMarkdown(text: string): string
```

### Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                     Template (Database)                          │
│                                                                  │
│  Can contain:                                                    │
│  - Old syntax: {@:a}, {#:1-10}                                  │
│  - New syntax: {{a}}, {{random:1-10}}                           │
│  - Mixed syntax (both in same template)                          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│         Syntax Adapter (convertToMarkdownSyntax)                │
│                                                                  │
│  Converts:                                                       │
│  - {@:var}     → {{var}}                                        │
│  - {#:1-10}    → {{random:1-10}}                                │
│  - {eval:expr} → {{eval:expr}}                                  │
│                                                                  │
│  Already Markdown? → Pass through unchanged                      │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│            Shared Parameterization Library                       │
│                                                                  │
│  Expects: Pure Markdown syntax {{variable}}                      │
│  Resolves: Variables, random, eval expressions                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    Resolved Question Instance
```

### Integration Points

**1. Content Resolution** (`content-resolver.ts:34`)

```typescript
export function resolveContentField(field: ContentField, ...): ContentField {
  // Convert Questions syntax to Markdown before resolution
  const markdownContent = convertToMarkdownSyntax(field.content);

  let resolvedContent = resolveVariableExpression(markdownContent, ...);
  // ...
}
```

**2. Variable Resolution** (`variable-resolver.ts:88-96`)

```typescript
export function resolveVariables(variables: QuestionVariable[], ...): ResolvedVariable[] {
  // Convert each variable expression to Markdown syntax
  const markdownVariables = variables.map(convertVariableToMarkdown);

  return sharedResolveVariables(markdownVariables, seed);
}
```

**3. Answer Resolution** (`content-resolver.ts:78-79`)

```typescript
export function resolveExpression(expression: string, ...): string {
  // Convert Questions syntax to Markdown before resolution
  const markdownExpression = convertToMarkdownSyntax(expression);
  // ...
}
```

---

## 📝 Syntax Conversion Rules

### Variable References

```typescript
// Old → New
{@:a}           → {{a}}
{@:max}         → {{max}}
{@:coefficient} → {{coefficient}}
```

### Random Integers

```typescript
// Old → New
{#:1-10}                → {{random:1-10}}
{#:-5-5}                → {{random:-5-5}}
{#:{@:min}-{@:max}}     → {{random:{{min}}-{{max}}}}
```

### Random Decimals

```typescript
// Old → New
{#:2.3}                 → {{random:2.3}}
{#:0.5-9.99:0.01}       → {{random:0.5-9.99:0.01}}
```

### Exclusions

```typescript
// Old → New
{#:1-10!5}              → {{random:1-10!5}}
{#:1-10!{@:a}}          → {{random:1-10!{{a}}}}
{#:1-100!5,{@:b}}       → {{random:1-100!5,{{b}}}}
```

### Evaluations

```typescript
// Old → New
{eval:a+b}              → {{eval:a+b}}
{eval:{@:a}+{@:b}}      → {{eval:{{a}}+{{b}}}}
{eval:2^3}              → {{eval:2^3}}
{eval:\frac{10}{2}}     → {{eval:\frac{10}{2}}}
```

---

## 🔍 Detection Logic

The adapter can **detect** which syntax is used:

```typescript
detectSyntax(text: string): 'questions' | 'markdown' | 'mixed' | 'none'

// Examples
detectSyntax('{@:a} + {#:1-10}')     // → 'questions'
detectSyntax('{{a}} + {{random:1-10}}') // → 'markdown'
detectSyntax('{@:a} + {{b}}')         // → 'mixed'
detectSyntax('Calculate 2 + 3')      // → 'none'
```

**Normalization**:

```typescript
normalizeToMarkdown(text: string): string

// Handles any input gracefully
normalizeToMarkdown('{@:a}')              // → '{{a}}'
normalizeToMarkdown('{{a}}')              // → '{{a}}' (unchanged)
normalizeToMarkdown('{@:a} + {{b}}')      // → '{{a}} + {{b}}'
```

---

## 📊 Current State (2025-11-19)

### Questions by Syntax

| Source                      | Syntax    | Status         | Quantity |
| --------------------------- | --------- | -------------- | -------- |
| **Admin UI (new)**          | Markdown  | ✅ Active      | ~10 seed |
| **TinyMath migrated**       | Markdown  | ✅ Complete    | 472/473  |
| **Old database**            | Questions | ⚠️ Legacy      | Unknown  |
| **Tests (backward compat)** | Questions | ℹ️ Intentional | ~50      |
| **Tests (modern)**          | Markdown  | ✅ New         | 10       |

### Test Coverage

**Backward Compatibility Tests** (`instance-generator.test.ts`):

- Uses old syntax `{@:}`, `{#:}`
- Ensures adapter works correctly
- **30+ tests** covering all question types

**Modern Syntax Tests** (`instance-generator-markdown.test.ts`):

- Uses new syntax `{{}}`, `{{random:}}`
- Tests direct Markdown input
- **10 tests** covering core patterns

---

## 🎯 Migration Strategy

### Phase 1: Setup (✅ Complete - Nov 2025)

1. ✅ Syntax adapter implemented (301 lines)
2. ✅ Admin UI generates Markdown syntax
3. ✅ TinyMath converter outputs Markdown
4. ✅ Dual-syntax tests passing

### Phase 2: Coexistence (🔄 Current)

- Both syntaxes supported simultaneously
- Adapter transparent to users
- Old questions work without modification
- New questions use modern syntax

**Benefits**:

- Zero downtime migration
- No breaking changes
- Gradual adoption
- Risk mitigation

### Phase 3: Full Migration (⏳ Future)

**When**: After all questions verified in Markdown syntax

**Steps**:

1. Audit database: Identify all old-syntax questions
2. Batch convert: Run migration script
3. Verify: Ensure all converted questions work
4. Remove adapter: Delete `syntax-adapter.ts` (-301 lines)
5. Simplify: Remove conversion calls in resolvers

**Impact**:

- Codebase simplification
- Performance improvement (no conversion overhead)
- Reduced maintenance burden

### Phase 4: Deprecation (⏳ Future)

- Update documentation to remove old syntax examples
- Archive old syntax tests
- Single source of truth: Markdown syntax only

---

## 🔧 Developer Guidelines

### Creating New Questions

**Always use Markdown syntax**:

```typescript
const template: QuestionTemplate = {
	variations: [
		{
			statement: [{ type: 'text', content: 'Calculate {{a}} + {{b}}' }],
			variables: [
				{ name: 'a', expression: '{{random:1-10}}' },
				{ name: 'b', expression: '{{random:1-10}}' }
			],
			answer: '{{eval:{{a}} + {{b}}}}'
		}
	]
};
```

### Writing Tests

**For old syntax** (backward compat):

```typescript
// File: instance-generator.test.ts
statement: [{ type: 'text', content: 'Calculate {@:a} + {@:b}' }];
```

**For new syntax**:

```typescript
// File: instance-generator-markdown.test.ts
statement: [{ type: 'text', content: 'Calculate {{a}} + {{b}}' }];
```

### Migrating Old Questions

**Manual migration**:

```typescript
import { convertToMarkdownSyntax } from '$lib/questions/generator/syntax-adapter';

// Before
const oldTemplate = {
	statement: 'Calculate {@:a} + {#:1-10}'
};

// After
const newTemplate = {
	statement: convertToMarkdownSyntax(oldTemplate.statement)
	// Result: 'Calculate {{a}} + {{random:1-10}}'
};
```

**Batch migration** (future script):

```typescript
// Update all questions in database
const questions = await getAllQuestions();

for (const q of questions) {
	if (detectSyntax(q.statement) === 'questions') {
		q.statement = convertToMarkdownSyntax(q.statement);
		q.variables = q.variables.map(convertVariableToMarkdown);
		q.answer = convertToMarkdownSyntax(q.answer);
		await updateQuestion(q);
	}
}
```

---

## ⚠️ Common Pitfalls

### 1. Double-Converting

**Problem**: Applying `convertToMarkdownSyntax()` twice

```typescript
// ❌ BAD
let text = '{{a}}'; // Already Markdown
text = convertToMarkdownSyntax(text); // Still '{{a}}' (safe)
text = convertToMarkdownSyntax(text); // Still '{{a}}' (idempotent)

// ✅ GOOD - Conversion is idempotent (safe to call multiple times)
```

### 2. Mixed Syntax in Same Field

**Problem**: Inconsistent syntax within one string

```typescript
// ⚠️ WORKS but inconsistent
statement: 'Calculate {@:a} + {{b}}';

// ✅ BETTER - Pick one syntax
statement: 'Calculate {{a}} + {{b}}';
```

### 3. Forgetting Variable Conversion

**Problem**: Converting content but not variables

```typescript
// ❌ INCOMPLETE
template.statement = convertToMarkdownSyntax(template.statement);
// But template.variables still have old syntax!

// ✅ COMPLETE
template.statement = convertToMarkdownSyntax(template.statement);
template.variables = template.variables.map(convertVariableToMarkdown);
template.answer = convertToMarkdownSyntax(template.answer);
```

---

## 📖 Related Documentation

### Core Files

- **Syntax Adapter**: `src/lib/questions/generator/syntax-adapter.ts`
- **Content Resolver**: `src/lib/questions/generator/content-resolver.ts`
- **Variable Resolver**: `src/lib/questions/generator/variable-resolver.ts`

### Tests

- **Old Syntax Tests**: `src/lib/questions/generator/instance-generator.test.ts`
- **New Syntax Tests**: `src/lib/questions/generator/instance-generator-markdown.test.ts`
- **Adapter Tests**: `src/lib/questions/generator/syntax-adapter.test.ts`

### Type Definitions

- **Question Types**: `src/lib/questions/types.ts` (updated Nov 2025)
  - All documentation now shows Markdown syntax
  - Examples use `{{variable}}` instead of `{@:variable}`

### UI Components

- **Question Form**: `src/lib/components/QuestionTemplateForm.svelte`
  - Generates Markdown syntax directly
  - Help buttons insert `{{}}`, `{{random:}}`
- **Variable Editor**: `src/lib/components/VariableEditor.svelte`
  - Help dialog shows Markdown examples

---

## 🎉 Benefits of Dual-Syntax

1. **Zero Downtime**: Old questions work immediately
2. **Risk Mitigation**: Gradual migration, not big bang
3. **User Choice**: Admins can use either syntax
4. **Backward Compatible**: All existing content preserved
5. **Forward Compatible**: New syntax ready for future
6. **Testable**: Both syntaxes have comprehensive tests
7. **Transparent**: Users don't need to know about conversion

---

## 🚀 Future Vision

**Ultimate Goal**: Single, clean Markdown syntax

When Phase 3 completes:

- ✅ All questions in Markdown format
- ✅ Syntax adapter removed
- ✅ Simplified codebase
- ✅ Better performance (no conversion overhead)
- ✅ Easier maintenance
- ✅ Clearer documentation

**Timeline**: When database audit confirms 100% Markdown coverage

---

**For Questions**: See `docs/claude/quality-standards.md` or contact the development team.
