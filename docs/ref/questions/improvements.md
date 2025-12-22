# Questions System - Improvement Recommendations

> Detailed analysis of potential improvements across architecture, security, performance, UX, and features.

---

## 1. Architecture Improvements

### 1.1 Type Safety Gaps

**Current State**: The system uses `as unknown as` casts when converting between database rows and application types (`src/routes/api/questions/generate/[id]/+server.ts:24-48`).

**Issue**: This bypasses TypeScript's type checking and can lead to runtime errors if the database schema drifts from the expected types.

**Recommendations**:

- Create proper type guards with runtime validation using Zod
- Generate database types from the schema automatically
- Use a mapping function with explicit field validation

```typescript
// Recommended approach
function parseDbQuestionTemplate(row: unknown): QuestionTemplate | null {
	const result = questionTemplateDbSchema.safeParse(row);
	if (!result.success) {
		console.error('Invalid template from DB:', result.error);
		return null;
	}
	return mapDbToAppType(result.data);
}
```

### 1.2 Shared vs Per-Variation Logic Complexity

**Current State**: The `resolveVariationWithShared()` function in `instance-generator.ts:73-102` handles complex merging logic between shared defaults and per-variation overrides.

**Issue**: The merging semantics differ by field type (some use `||`, others use `??`, variables are merged). This creates cognitive overhead and potential for bugs.

**Recommendations**:

- Document the merge strategy for each field explicitly in types
- Consider a more explicit inheritance model using composition
- Add comprehensive unit tests for edge cases

### 1.3 Validation Schema Divergence

**Current State**: The Zod schemas in `src/lib/server/validation/questions.ts` define slightly different question types than `types.ts`:

```typescript
// validation/questions.ts
export const questionTypeSchema = z.enum([
	'multiple_choice',
	'numerical',
	'algebraic',
	'fill_blanks',
	'ordering',
	'matrix',
	'true_false'
]);

// types.ts
export type QuestionType =
	| 'numerical_exact'
	| 'numerical_decimal'
	| 'numerical_rounded'
	| 'numerical_with_unit'
	| 'algebraic_transform'
	| 'fill_in_blanks'
	| 'multiple_choice';
```

**Recommendations**:

- Unify the type definitions - use a single source of truth
- Generate Zod schemas from TypeScript types or vice versa
- Add tests that verify schema/type alignment

### 1.4 Missing Dependency Injection

**Current State**: Components and generators directly import singletons (stores, compute engine).

**Recommendations**:

- Introduce dependency injection for better testability
- Use SvelteKit's `$app/stores` pattern for context-based injection

---

## 2. Security Improvements

### 2.1 Input Validation Completeness

**Current State**: API endpoints validate input with Zod, but some fields use `z.unknown()`:

```typescript
// src/lib/server/validation/questions.ts:76
options: z.unknown().optional().nullable(),
```

**Risk**: The `options` field accepts arbitrary JSON, which could lead to:

- Storage of unexpected data
- Injection of malicious content
- Schema drift

**Recommendations**:

- Define strict schemas for all nested objects
- Validate `options.constraints`, `options.unitOptions` explicitly
- Add maximum depth/size limits for JSONB fields

```typescript
export const validationOptionsSchema = z
	.object({
		allowEquivalent: z.boolean().optional(),
		allowDifferentForms: z.boolean().optional(),
		canonicalForm: z.enum(['fraction', 'decimal', 'scientific']).optional(),
		constraints: constraintOptionsSchema.optional(),
		shuffleChoices: z.boolean().optional()
	})
	.strict();
```

### 2.2 Expression Evaluation Sandboxing

**Current State**: The `validation-rule-evaluator.ts` evaluates mathematical expressions via Compute Engine:

```typescript
function evaluateSafeExpression(expr: string): number {
	const result = evaluateExpression(expr);
	// ...
}
```

**Risk**: While Compute Engine is safer than `eval()`, complex expressions could:

- Cause CPU-intensive computations (DoS)
- Potentially access unexpected functionality

**Recommendations**:

- Add timeout for expression evaluation
- Limit expression complexity (nesting depth, term count)
- Whitelist allowed functions
- Add rate limiting for generation endpoint

### 2.3 Template Injection Prevention

**Current State**: Variable expressions like `{{eval:...}}` are evaluated with user-defined content.

**Risk**: A malicious admin could craft templates that behave unexpectedly when resolved.

**Recommendations**:

- Validate variable expressions during template creation
- Sandbox expression evaluation with a strict AST parser
- Log template creation/modification for audit

### 2.4 RLS Policy Audit

**Current State**: RLS allows teachers to read all templates but only admins can modify.

**Recommendations**:

- Add audit logging for template modifications
- Consider adding `created_by` checks for draft templates (only creator can edit)
- Implement soft-delete with archival for compliance

---

## 3. Performance Improvements

### 3.1 Template Caching Strategy

**Current State**: `questionTemplatesCache` loads all published templates into memory with no TTL:

```typescript
// No TTL - cache persists until invalidated
if (!force && this.cache.lastFetched && this.cache.templates.length > 0) {
	return;
}
```

**Issue**: As the template count grows, this approach has problems:

- Memory pressure with large template counts
- Stale data if another admin modifies templates
- Initial load time increases

**Recommendations**:

- Implement LRU cache with size limits
- Add periodic background refresh (e.g., every 5 minutes)
- Use incremental sync via `updated_at` comparison
- Consider server-side caching with Redis

### 3.2 Instance Generation Optimization

**Current State**: Each instance generation:

1. Fetches template from database
2. Validates template structure
3. Resolves all variables
4. Evaluates expressions via Compute Engine

**Recommendations**:

- Cache parsed templates in memory (with TTL)
- Pre-compile variable resolution graphs
- Consider web worker for heavy computations in browser
- Batch generation endpoint for multiple instances

### 3.3 Database Query Optimization

**Current State**: The categories endpoint fetches all templates then maps:

```typescript
// src/routes/api/questions/categories/all/+server.ts:29-36
const { data: templates } = await supabase
  .from('question_templates')
  .select('id, theme, domain, subdomain, level')
  .eq('status', 'published')
  .order('theme')...
```

**Recommendations**:

- Create a materialized view for categories with counts
- Add partial index: `WHERE status = 'published'`
- Use database-level aggregation instead of client-side mapping

```sql
CREATE MATERIALIZED VIEW question_category_stats AS
SELECT
  theme, domain, subdomain, level,
  COUNT(*) as template_count,
  array_agg(id) as template_ids
FROM question_templates
WHERE status = 'published'
GROUP BY theme, domain, subdomain, level;
```

### 3.4 Client-Side Rendering

**Current State**: FlashCard component measures heights with ResizeObserver and updates dynamically.

**Recommendations**:

- Use CSS `aspect-ratio` or `min-height` to reduce layout shifts
- Lazy-load MathLive/KaTeX for below-fold questions
- Virtualize long question lists in admin interface

---

## 4. UX Improvements

### 4.1 Admin Interface

**Current Issues**:

- No bulk operations (delete, change status, move category)
- No template duplication feature
- No version history or diff view
- No preview in edit form (must save as draft first)

**Recommendations**:

- Add inline preview panel during editing
- Implement "Duplicate template" action
- Add bulk status change (draft/published)
- Show version history with restore capability
- Add keyboard shortcuts for common actions

### 4.2 Question Creation Workflow

**Current Issues**:

- Complex form with many nested fields
- Easy to create invalid templates (validation only on save)
- No guided wizard for new users

**Recommendations**:

- Real-time validation as user types
- Wizard mode for first-time creators
- Template gallery with examples to clone
- Variable expression autocomplete
- Live preview of generated instance

### 4.3 FlashCard Experience

**Current Issues**:

- No partial credit feedback for close answers
- Limited feedback on wrong answers
- No "skip" or "I don't know" option

**Recommendations**:

- Show distance from correct answer (e.g., "off by 2")
- Progressive hints system
- "Show hint" button that reduces points
- Confidence rating before answer
- Audio feedback for correct/incorrect

### 4.4 Accessibility

**Current Issues**:

- Flip animation may cause motion sickness
- Math content may not be fully screen-reader compatible
- Color contrast in validation feedback

**Recommendations**:

- Add `prefers-reduced-motion` support
- Use MathML output alongside visual rendering
- Test with screen readers (NVDA, VoiceOver)
- Ensure all interactive elements have focus styles
- Add ARIA labels to all buttons

---

## 5. Feature Improvements

### 5.1 Missing Question Types

**Currently Missing**:

- `true_false`: Boolean questions
- `ordering`: Arrange items in correct order
- `matrix`: Grid-based input
- `matching`: Connect related items
- `graphing`: Draw functions/shapes
- `proof`: Step-by-step mathematical proofs

**Recommendations**:

- Prioritize `true_false` and `ordering` (simpler to implement)
- Design extensible type system for future additions
- Consider plugin architecture for custom question types

### 5.2 Enhanced Feedback System

**Current State**: Simple correct/incorrect with optional correction display.

**Recommendations**:

- Mistake analysis: "You multiplied instead of added"
- Similar problem suggestion on failure
- Confidence calibration tracking
- Personalized hints based on error patterns

### 5.3 Analytics & Reporting

**Currently Missing**:

- Question difficulty statistics
- Time-to-answer distributions
- Error pattern analysis
- A/B testing for variations

**Recommendations**:

- Track answer attempts with timestamps
- Calculate difficulty index per template
- Generate teacher reports on class performance
- Dashboard for question quality metrics

### 5.4 Collaborative Features

**Currently Missing**:

- Template sharing between teachers
- Comments/notes on templates
- Review workflow for template approval

**Recommendations**:

- Add "Shared with school" visibility level
- Implement review queue for community templates
- Allow teachers to fork public templates

### 5.5 Content Features

**Currently Missing**:

- Image support in question statements
- Audio/video attachments
- Interactive diagrams
- GeoGebra/Desmos integration

**Recommendations**:

- Extend TemplateMarkdown to support images
- Add file upload for question assets
- Integrate existing graphing components

### 5.6 Import/Export

**Currently Missing**:

- Export templates to JSON/XML
- Import from other platforms (Kahoot, Quizlet)
- Backup/restore functionality

**Recommendations**:

- Design portable template format
- Build importers for common formats
- Add scheduled backup feature

---

## 6. Testing Improvements

### 6.1 Current Test Coverage Gaps

**Areas needing more tests**:

- Edge cases in variable resolution (circular refs, undefined vars)
- All validation rule types
- Component interaction tests
- API error responses

### 6.2 Recommendations

- Add property-based testing for expression evaluation
- Implement visual regression tests for FlashCard
- Add E2E tests for full question lifecycle
- Test with generated edge-case templates

```typescript
// Example property-based test
test.prop([fc.integer(), fc.integer()])('sum evaluation', (a, b) => {
	const result = evaluateExpression(`${a} + ${b}`);
	expect(result).toBe(a + b);
});
```

---

## Implementation Priority Matrix

| Improvement                    | Impact | Effort | Priority |
| ------------------------------ | ------ | ------ | -------- |
| Type safety unification        | High   | Medium | P1       |
| Expression sandboxing          | High   | Medium | P1       |
| Zod schema strictness          | High   | Low    | P1       |
| Real-time validation in editor | High   | Medium | P2       |
| Template caching optimization  | Medium | Medium | P2       |
| Accessibility fixes            | High   | Medium | P2       |
| Bulk admin operations          | Medium | Medium | P2       |
| Analytics dashboard            | Medium | High   | P3       |
| New question types             | Medium | High   | P3       |
| Import/export                  | Low    | Medium | P3       |

---

## Related Documentation

- [Questions Technical Reference](./README.md)
- [Security Audit Guidelines](../../security/security-audit.md)
- [Performance Optimization](../../development/performance-optimizations.md)
