# Question Bank System - Code Organization

Comprehensive guide to the codebase structure, file organization, and coding patterns used in the Question Bank System.

**Last Updated:** 2025-10-19
**Dev Server:** http://localhost:5174

---

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [File Naming Conventions](#file-naming-conventions)
3. [Code Organization Patterns](#code-organization-patterns)
4. [Component Architecture](#component-architecture)
5. [TypeScript Types](#typescript-types)
6. [API Endpoints](#api-endpoints)
7. [Testing Files](#testing-files)
8. [Documentation Files](#documentation-files)

---

## Directory Structure

```
src/lib/questions/
├── types.ts                        # TypeScript type definitions
├── parser/                          # Variable & expression parsing
│   ├── tokenizer.ts                # Find variable/eval/random expressions
│   ├── random-parser.ts            # Parse {#:min-max} expressions
│   ├── variable-parser.ts          # Extract variable names
│   ├── eval-parser.ts              # Extract {eval:} expressions
│   ├── tokenizer.test.ts           # Unit tests
│   ├── random-parser.test.ts
│   ├── variable-parser.test.ts
│   └── eval-parser.test.ts
├── generator/                       # Instance generation logic
│   ├── random-generator.ts         # Generate random numbers with seeds
│   ├── variable-resolver.ts        # Resolve 3-stage variable pipeline
│   ├── content-resolver.ts         # Resolve variables in text/image fields
│   ├── choice-shuffler.ts          # Shuffle QCM choices (Fisher-Yates)
│   ├── instance-generator.ts       # Main orchestrator
│   ├── random-generator.test.ts    # Unit tests
│   ├── variable-resolver.test.ts
│   ├── content-resolver.test.ts
│   ├── choice-shuffler.test.ts
│   └── instance-generator.test.ts
└── validators/                      # Validation logic
    ├── template-validator.ts       # Validate template structure
    ├── circular-dependency.ts      # Detect circular variable dependencies
    ├── template-validator.test.ts
    └── circular-dependency.test.ts

src/lib/components/
├── QuestionDisplay.svelte           # Student/admin display (775 lines)
├── QuestionTemplateForm.svelte      # 5-tab form orchestrator
└── QuestionPreview.svelte           # Admin preview with generation

src/routes/(protected)/dashboard/admin/questions/
├── +page.svelte                     # Questions list page
├── +page.server.ts                  # Load function (fetch templates)
├── create/
│   ├── +page.svelte                # Create question page
│   └── +page.server.ts             # Create form action
├── [id]/
│   ├── edit/
│   │   ├── +page.svelte            # Edit question page
│   │   └── +page.server.ts         # Edit/update form actions
│   └── preview/
│       └── +page.svelte            # Preview demo page (411 lines)

src/routes/api/questions/
├── templates/
│   ├── +server.ts                  # GET list, POST create
│   └── [id]/
│       └── +server.ts              # GET, PUT, DELETE single template
└── generate/
    └── [id]/
        └── +server.ts              # POST generate instance

supabase/migrations/
└── XXX_create_question_templates.sql  # Database schema
```

---

## File Naming Conventions

### Component Files

- **Format:** `PascalCase.svelte`
- **Examples:**
  - `QuestionDisplay.svelte` - Student-facing display
  - `QuestionTemplateForm.svelte` - Form orchestrator
  - `QuestionPreview.svelte` - Admin preview

### Route Files (SvelteKit)

- **Pages:** `+page.svelte` - UI component
- **Server:** `+page.server.ts` - Load functions and form actions
- **Layouts:** `+layout.svelte` - Shared layout wrapper
- **API:** `+server.ts` - API endpoint handlers

### Utility Files

- **Format:** `kebab-case.ts`
- **Examples:**
  - `random-generator.ts`
  - `template-validator.ts`
  - `circular-dependency.ts`

### Test Files

- **Unit Tests:** `*.test.ts`
- **Component Tests:** `*.spec.ts` or `*.svelte.test.ts`
- **Examples:**
  - `tokenizer.test.ts`
  - `QuestionDisplay.svelte.spec.ts`

---

## Code Organization Patterns

### Svelte Component Structure

All Svelte 5 components follow this organization:

```svelte
<!--
Component Documentation Header
===============================

Brief description
Features list
Props interface
Usage examples
-->

<script lang="ts">
  // ===========================
  // IMPORTS
  // ===========================
  import { ... } from '...';

  // ===========================
  // TYPES & INTERFACES
  // ===========================
  interface Props { ... }

  // ===========================
  // PROPS & DERIVED STATE
  // ===========================
  let { prop1, prop2 }: Props = $props();
  const derived = $derived(...);

  // ===========================
  // STATE MANAGEMENT
  // ===========================
  let localState = $state(...);
  let anotherState = $state(...);

  // ===========================
  // LIFECYCLE
  // ===========================
  $effect(() => { ... });

  // ===========================
  // HELPER FUNCTIONS
  // ===========================
  function helperFunction() { ... }

  // ===========================
  // EVENT HANDLERS
  // ===========================
  function handleClick() { ... }
  function handleSubmit() { ... }
</script>

<!--
═══════════════════════════════════════════════════════════════════════════════
TEMPLATE
═══════════════════════════════════════════════════════════════════════════════
-->

<!-- ========== SECTION NAME ========== -->
<div>
	<!-- Inline comments for complex logic -->
</div>

<!--
═══════════════════════════════════════════════════════════════════════════════
END OF COMPONENT
═══════════════════════════════════════════════════════════════════════════════
-->
```

### TypeScript Module Structure

Utility modules follow this pattern:

```typescript
/**
 * Module Name
 * ===========
 *
 * Description and purpose
 */

// ===========================
// IMPORTS
// ===========================
import { ... } from '...';

// ===========================
// TYPES
// ===========================
export interface SomeType { ... }
export type SomeUnion = 'a' | 'b';

// ===========================
// CONSTANTS
// ===========================
const CONSTANT_VALUE = 42;

// ===========================
// MAIN FUNCTIONS
// ===========================

/**
 * Function description
 *
 * @param param1 - Parameter description
 * @returns Return value description
 */
export function mainFunction(param1: string): ReturnType {
  // Implementation
}

// ===========================
// HELPER FUNCTIONS
// ===========================

/**
 * Helper function (not exported)
 */
function helperFunction() {
  // Implementation
}
```

---

## Component Architecture

### QuestionDisplay Component

**File:** `src/lib/components/QuestionDisplay.svelte` (775 lines)

**Purpose:** Universal question display component for both flashcard and interactive modes.

**Sections:**

1. **Header Comment** (lines 1-22)
   - Component description
   - Features list
   - Props interface

2. **Imports** (lines 24-46)
   - Types
   - UI components
   - Input components
   - Icons
   - Confetti library

3. **Props** (lines 48-76)
   - Required: `mode`, `instance`
   - Optional callbacks and configuration

4. **State Management** (lines 78-112)
   - Answer state
   - Submission tracking
   - Statistics tracking
   - Flip state
   - Height management

5. **Initialization** (lines 138-186)
   - Timer start
   - Height calculation (ResizeObserver)
   - Type-specific state initialization

6. **Helper Functions** (lines 188-236)
   - `hasValidInput()` - Input validation
   - `getTimeSpent()` - Time tracking
   - `prepareAnswerValue()` - Type-specific formatting

7. **Event Handlers** (lines 238-347)
   - `handleSubmit()` - Answer validation
   - `handleFlip()` - Card flip animation
   - `completeQuestion()` - Statistics emission
   - `handleAnswerChange()` - Real-time callbacks

8. **Template** (lines 360-602)
   - Flip container (3D transform)
   - Front face (question + input)
   - Back face (correction)
   - Flip button

**Key Design Patterns:**

- **Dual mode:** Flashcard (view-only) and Interactive (answer validation)
- **Client-side validation:** Uses MathLive Compute Engine for sophisticated validation
- **FlipCard animation:** 3D transforms with height management
- **Type-specific inputs:** Specialized components for each question type
- **Statistics tracking:** Time, attempts, answer history
- **Reactive state:** Uses Svelte 5 `$state` and `$derived` runes
- **ResizeObserver:** Smooth height transitions during flip

### Preview Demo Page

**File:** `src/routes/(protected)/dashboard/admin/questions/[id]/preview/+page.svelte`

**Purpose:** Admin testing page for question templates with real instance generation.

**Sections:**

1. **Header Comment** (lines 1-14)
2. **Imports** (lines 17-29)
   - QuestionDisplay from main component path
   - AnswerData type import
3. **Props & Derived** (lines 31-36)
4. **State Management** (lines 38-54)
   - Instance generation state
   - Display options (showCorrection, readonly)
5. **Lifecycle** (lines 56-65)
6. **Event Handlers** (lines 67-142)
   - `generateInstance()` - API call
   - `handleRegenerate()` - Random seed
   - `handleAnswerSubmit()` - Toast notifications
   - `handleBack()` - Navigation
7. **Template**
   - Page header
   - Controls card (seed, options)
   - QuestionDisplay component
   - Debug info

**Key Design Patterns:**

- **Client-side validation:** Uses QuestionDisplay's built-in validation
- **Seed reproducibility:** Same seed = same instance
- **Toast feedback:** Success/error messages on answer submission
- **Loading states:** Spinner during generation
- **Debug info:** Helpful for testing (answer preview, variables)
- **Mode switching:** Toggle between interactive/flashcard modes

---

## TypeScript Types

### Core Types Location

**File:** `src/lib/questions/types.ts`

### Type Organization

```typescript
// ===========================
// QUESTION TYPES
// ===========================
export type QuestionType =
  | 'numerical_exact'
  | 'numerical_decimal'
  | 'numerical_rounded'
  | 'algebraic_transform'
  | 'fill_in_blanks'
  | 'multiple_choice';

// ===========================
// CONTENT TYPES
// ===========================
export type ContentField = {
  type: 'text' | 'image';
  content: string;
};

// ===========================
// PRECISION TYPES
// ===========================
export type PrecisionType = /* ... */;

// ===========================
// VARIABLE TYPES
// ===========================
export interface Variable { /* ... */ }

// ===========================
// TEMPLATE TYPES
// ===========================
export interface QuestionTemplate { /* ... */ }

// ===========================
// INSTANCE TYPES
// ===========================
export interface QuestionInstance { /* ... */ }

// ===========================
// RESULT TYPES
// ===========================
export type GenerationResult = /* ... */;
```

### Naming Conventions

- **Interfaces:** `PascalCase` (e.g., `QuestionTemplate`)
- **Types:** `PascalCase` (e.g., `QuestionType`)
- **Type unions:** Singular name (e.g., `QuestionType` not `QuestionTypes`)
- **Enums:** `PascalCase` for enum, `SCREAMING_SNAKE_CASE` for values

### Database vs. TypeScript Field Names

**Database (snake_case):**

```sql
CREATE TABLE question_templates (
  transform_type TEXT,
  multiple_answers BOOLEAN
);
```

**TypeScript (camelCase):**

```typescript
interface QuestionTemplate {
	transformType?: string;
	multipleAnswers?: boolean;
}
```

**Mapping happens in API endpoints:**

```typescript
// Writing to database
const { data } = await supabase.from('question_templates').insert({
	transform_type: templateData.transformType,
	multiple_answers: templateData.multipleAnswers
});
```

---

## API Endpoints

### Endpoint Structure

All API endpoints follow this pattern:

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params, url }) => {
	// 1. Authentication check
	const user = locals.user;
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// 2. Extract parameters
	const id = params.id;
	const query = url.searchParams.get('param');

	// 3. Database query
	const { data, error: dbError } = await supabase.from('table').select('*').eq('id', id);

	// 4. Error handling
	if (dbError) {
		throw error(500, 'Database error');
	}

	if (!data) {
		throw error(404, 'Not found');
	}

	// 5. Return response
	return json({ success: true, data });
};
```

### HTTP Status Codes

| Code | Usage              | Example                |
| ---- | ------------------ | ---------------------- |
| 200  | Success (GET, PUT) | Template retrieved     |
| 201  | Created (POST)     | Template created       |
| 400  | Bad Request        | Validation failed      |
| 401  | Unauthorized       | No auth session        |
| 403  | Forbidden          | Wrong permissions      |
| 404  | Not Found          | Template doesn't exist |
| 500  | Server Error       | Database failure       |

### Response Format

**Success:**

```typescript
{
  success: true,
  data: { ... } | [ ... ]
}
```

**Error:**

```typescript
{
  success: false,
  errors: ['Error message 1', 'Error message 2']
}
```

---

## Testing Files

### Test File Organization

Each module has a corresponding `.test.ts` file:

```
src/lib/questions/parser/
├── tokenizer.ts           # Implementation
└── tokenizer.test.ts      # Tests
```

### Test Structure Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from './module';

describe('Module Name - Feature Group', () => {
	describe('functionToTest', () => {
		it('should handle basic case', () => {
			const input = 'test';
			const result = functionToTest(input);
			expect(result).toBe('expected');
		});

		it('should handle edge case', () => {
			// Test edge cases
		});

		it('should throw on invalid input', () => {
			expect(() => functionToTest(null)).toThrow();
		});
	});
});
```

### Test Coverage

**Current Status:**

- ✅ **Parser tests:** 4 files (100% coverage)
- ✅ **Generator tests:** 5 files (100% coverage)
- ✅ **Validator tests:** 2 files (100% coverage)
- 🔜 **Component tests:** Pending (QuestionDisplay, Preview)
- 🔜 **E2E tests:** Pending (full workflow)

---

## Documentation Files

### Documentation Structure

```
Root Directory
├── CLAUDE.md                              # Project overview & conventions
├── QUESTIONS_API_COMPLETE.md              # Complete API reference
├── QUESTIONS_API_TESTING.md               # API testing guide (curl examples)
├── QUESTIONS_QUICK_START.md               # 5-minute quick start
├── QUESTIONS_UI_TESTING.md                # UI testing guide
├── QUESTIONS_UI_COMPLETE.md               # UI phase summary
├── QUESTIONS_CODE_ORGANIZATION.md         # This file
└── DATABASE_SCHEMA.md                     # Database structure
```

### When to Update Documentation

**Add to QUESTIONS_API_COMPLETE.md:**

- New API endpoint
- Changed response format
- New field in database

**Add to QUESTIONS_CODE_ORGANIZATION.md:**

- New file/module
- Changed directory structure
- New coding pattern

**Add to QUESTIONS_UI_TESTING.md:**

- New component
- New testing scenario
- Changed UI behavior

**Add to QUESTIONS_QUICK_START.md:**

- New question type
- Simplified workflow
- Common pitfall solutions

---

## Code Comments Best Practices

### Header Comments

**All files must have a header comment:**

```typescript
/**
 * File Name
 * =========
 *
 * Brief description of purpose
 * Key features or algorithms
 */
```

### Function Documentation

**Use JSDoc format:**

```typescript
/**
 * Function description
 *
 * More detailed explanation if needed.
 *
 * @param param1 - Parameter description
 * @param param2 - Another parameter
 * @returns Return value description
 *
 * @example
 * const result = myFunction('input');
 * // result = 'output'
 */
function myFunction(param1: string, param2?: number): string {
	// Implementation
}
```

### Section Comments

**Use visual separators:**

```typescript
// ===========================
// SECTION NAME
// ===========================
```

**For HTML templates:**

```svelte
<!-- ========== SECTION NAME ========== -->
```

**For major template sections:**

```svelte
<!--
═══════════════════════════════════════════════════════════════════════════════
MAJOR SECTION
═══════════════════════════════════════════════════════════════════════════════
-->
```

### Inline Comments

**Use sparingly for complex logic:**

```typescript
// Calculate row span based on entry duration (1 row = 1 hour)
const rowSpan = Math.floor((endTime - startTime) / 3600);
```

### TODO Comments

**Format:**

```typescript
// TODO: Brief description
// TODO: [Priority] Longer description with context
```

**Examples:**

```typescript
// TODO: Replace with server-side validation
// TODO: [High] Add LaTeX rendering support using MathLive
// TODO: [Low] Consider caching for performance
```

---

## Import Organization

### Order of Imports

1. **SvelteKit/Svelte imports**
2. **Third-party libraries**
3. **Internal types**
4. **Internal components**
5. **Internal utilities**

**Example:**

```typescript
// SvelteKit
import { page } from '$app/state';
import { goto } from '$app/navigation';

// Third-party
import { ArrowLeft, RefreshCw } from 'lucide-svelte';

// Internal types
import type { QuestionInstance } from '$lib/questions/types';

// Internal components
import QuestionDisplay from '$lib/components/questions/QuestionDisplay.svelte';
import { Button } from '$lib/components/ui/button';

// Internal utilities
import { toaster } from '$lib/stores/toaster.svelte';
```

---

## Svelte 5 Runes Patterns

### State Management

```svelte
// Simple state
let count = $state(0);

// Derived state (computed)
let doubled = $derived(count * 2);

// Derived with function
let computed = $derived.by(() => {
  return complexCalculation();
});

// Props
let { prop1, prop2 = 'default' }: Props = $props();

// Bindable prop (two-way binding)
let { value = $bindable() } = $props();
```

### Effects

```svelte
// Run on every reactive change
$effect(() => {
  console.log('Count changed:', count);
});

// Run before DOM update
$effect.pre(() => {
  // Pre-render logic
});

// Cleanup on unmount
$effect(() => {
  const interval = setInterval(...);

  return () => {
    clearInterval(interval);
  };
});
```

### Event Handlers

```svelte
<!-- Svelte 5: lowercase -->
<button onclick={handleClick}>Click</button>
<input oninput={handleInput} />

<!-- NOT Svelte 4 syntax -->
<!-- <button on:click={handleClick}> -->
```

---

## File Size Guidelines

### Recommended Limits

| File Type    | Soft Limit | Hard Limit | Action if Exceeded          |
| ------------ | ---------- | ---------- | --------------------------- |
| Component    | 400 lines  | 600 lines  | Split into sub-components   |
| Utility      | 200 lines  | 400 lines  | Split into multiple modules |
| Test file    | 300 lines  | 500 lines  | Group related tests         |
| API endpoint | 150 lines  | 250 lines  | Extract business logic      |

### Current File Sizes

| File                     | Lines | Status                             |
| ------------------------ | ----- | ---------------------------------- |
| `QuestionDisplay.svelte` | 487   | ✅ Acceptable (complex component)  |
| `Preview +page.svelte`   | 411   | ✅ Acceptable (page with controls) |
| `instance-generator.ts`  | ~150  | ✅ Good                            |
| `tokenizer.test.ts`      | 264   | ✅ Good (test file)                |

---

## Performance Considerations

### Code Splitting

- Pages lazy-load via SvelteKit routing
- Large utilities imported only where needed
- Components imported as needed (no barrel exports)

### Bundle Size

**Keep track of:**

- QuestionDisplay component (~15KB compiled)
- API response sizes (<10KB per instance)
- Total page bundle size (<200KB initial load)

**Monitoring:**

```bash
pnpm build
# Check .svelte-kit/output/client
```

---

## Security Patterns

### Input Validation

**Always validate:**

- User input fields
- URL parameters
- Form data

**Example:**

```typescript
if (!templateId || typeof templateId !== 'string') {
	throw error(400, 'Invalid template ID');
}
```

### RLS (Row Level Security)

**Database policies enforce:**

- Teachers can only see their own templates
- Students can only see assigned questions
- Admins have full access

**Example policy:**

```sql
CREATE POLICY "Teachers can view their own templates"
ON question_templates FOR SELECT
USING (auth.uid() = created_by);
```

### XSS Prevention

**Use `{@html}` only with sanitized content:**

```svelte
<!-- Safe: renderContent() does not execute scripts -->
{@html renderContent(instance.statement)}

<!-- Unsafe: Direct user input -->
<!-- {@html userInput} -->
```

---

## Debugging Tips

### Console Logging Conventions

```typescript
// Development logging
console.log('[QuestionDisplay] Answer submitted:', answer);

// Error logging
console.error('[API] Generation failed:', error);

// Warning logging
console.warn('[Validation] Circular dependency detected:', cycle);
```

### Debug Sections

**Components can include debug info:**

```svelte
{#if import.meta.env.DEV}
	<div class="debug-info">
		<pre>{JSON.stringify(instance, null, 2)}</pre>
	</div>
{/if}
```

---

## Future Improvements

### Code Quality

- [ ] Add ESLint rules for Svelte 5
- [ ] Set up Prettier config
- [ ] Add Husky pre-commit hooks
- [ ] Configure dependency analysis

### Testing

- [ ] Add component tests (Testing Library)
- [ ] Add E2E tests (Playwright)
- [ ] Set up CI/CD pipeline
- [ ] Add visual regression testing

### Documentation

- [ ] Add inline examples to all public functions
- [ ] Generate API docs from TypeScript
- [ ] Create video tutorials
- [ ] Add troubleshooting flowcharts

---

## Quick Reference

### Common Tasks

**Add new question type:**

1. Update `QuestionType` in `types.ts`
2. Add parser logic if needed
3. Add generator logic in `instance-generator.ts`
4. Add UI input in `QuestionDisplay.svelte`
5. Add validation in `template-validator.ts`
6. Add tests
7. Update documentation

**Add new API endpoint:**

1. Create `+server.ts` file
2. Add authentication check
3. Add validation logic
4. Add database queries
5. Add error handling
6. Add tests
7. Update `QUESTIONS_API_COMPLETE.md`

**Add new component:**

1. Create `.svelte` file
2. Add header documentation
3. Define Props interface
4. Organize code sections
5. Add section comments
6. Add JSDoc to functions
7. Add to component library

---

## Resources

### Internal Links

- [API Documentation](QUESTIONS_API_COMPLETE.md)
- [Quick Start Guide](QUESTIONS_QUICK_START.md)
- [UI Testing Guide](QUESTIONS_UI_TESTING.md)
- [Database Schema](../../../DATABASE_SCHEMA.md)

### External References

- [Svelte 5 Docs](https://svelte-5-preview.vercel.app/)
- [SvelteKit Docs](https://kit.svelte.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Vitest Docs](https://vitest.dev/)

---

**Last Updated:** 2025-10-19
**Maintainer:** Development Team
**Questions?** See [QUESTIONS_QUICK_START.md](QUESTIONS_QUICK_START.md) or create an issue
