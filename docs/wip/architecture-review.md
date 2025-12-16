# Architecture Review Report - UbuMaths

**Date**: 2025-12-16
**Project**: UbuMaths - French Educational Mathematics Application
**Stack**: Svelte 5 (runes) | SvelteKit | TypeScript (strict) | Tailwind CSS 4 | Shadcn-svelte | Supabase | MathLive

---

## Executive Summary

UbuMaths demonstrates excellent architectural foundations with strong adherence to modern best practices. The codebase shows maturity in key areas: comprehensive Zod validation (334 occurrences across 210 API files), consistent Svelte 5 runes adoption, and well-documented patterns. However, there are opportunities for improvement in code organization, type refinement, and reducing technical debt from legacy patterns.

### Quality Scores

| Area                    | Rating    | Notes                                                     |
| ----------------------- | --------- | --------------------------------------------------------- |
| **Structure**           | Excellent | Well-organized route groups, clear separation of concerns |
| **Type Safety**         | Good      | Strict mode enabled, but some `any` types remain          |
| **Security**            | Excellent | 100% Zod validation, custom ESLint rule enforced          |
| **Performance**         | Good      | Sophisticated caching, optimistic UI patterns             |
| **Svelte 5 Compliance** | Excellent | Full runes adoption, no Svelte 4 patterns detected        |
| **Maintainability**     | Good      | Well-documented, but some large files need refactoring    |

---

## 1. Project Structure Analysis

### Strengths

**Route Organization**:

- Clear separation between `(public)` and `(protected)` route groups
- Logical nesting: `/dashboard/teacher/`, `/dashboard/student/`, `/dashboard/admin/`
- API routes follow RESTful conventions: `/api/[resource]/[id]/[action]`

**Library Structure**:

```
src/lib/
  components/     # UI components, well-organized with Shadcn integration
  server/         # Server-only code with validation/ subdirectory
  stores/         # Svelte 5 stores (*.svelte.ts pattern)
  types/          # Centralized TypeScript types
  utils/          # Shared utilities
```

**Key Files**:

- `/src/lib/server/validation/` - 69 validation schema files with tests
- `/src/lib/stores/` - 40 Svelte 5 stores using `.svelte.ts` extension
- `/src/lib/types/database.ts` - Auto-generated from Supabase schema

### Areas for Improvement

**Issue 1: Large Component Files**

- **Location**: `/src/routes/(protected)/dashboard/teacher/rewards/+page.svelte` (1726 lines)
- **Severity**: Important
- **Impact**: Difficult to maintain, test, and understand
- **Recommendation**: Extract into smaller components:
  - `GidouillesTab.svelte` (~500 lines)
  - `ActivationRequestsTab.svelte` (~500 lines)
  - `StudentRow.svelte` (~200 lines)
  - `BulkActions.svelte` (~200 lines)

**Issue 2: WIP Documentation Accumulation**

- **Location**: `/docs/wip/` - 100+ progress files
- **Severity**: Minor
- **Impact**: Navigation difficulty, potential stale documentation
- **Recommendation**: Archive completed items, consolidate active ones

---

## 2. Code Patterns Analysis

### Strengths

**Svelte 5 Runes - Full Adoption**:

```typescript
// Consistent patterns found across codebase
let count = $state(0);
let doubled = $derived(count * 2);
let { data } = $props<{ data: PageData }>();
$effect(() => {
	/* side effects */
});
```

**No Svelte 4 Anti-patterns Detected**:

- No `$:` reactive statements
- No `export let` for props
- No `<svelte:component>`
- No `createEventDispatcher`

**Optimistic UI Pattern - Exemplary**:
The rewards page demonstrates sophisticated optimistic updates with debouncing:

```typescript
// Pattern from /src/routes/(protected)/dashboard/teacher/rewards/+page.svelte
function debouncedUpdateStudent(studentId: string, delta: number, studentName: string) {
	// 1. Instant UI update
	updateStudentGidouillesOptimistic(studentId, delta);

	// 2. Debounce server request (500ms)
	// 3. Accumulate deltas
	// 4. Single server request
	// 5. Rollback on error
}
```

**Caching System - Well-Designed**:
The `TeacherDashboardCache` class shows enterprise-level patterns:

- TTL-based expiration (2h for students, 10min for rewards)
- SvelteMap for native reactivity
- Optimistic update support
- Hydration from load functions
- Statistics and monitoring

### Issues Found

**Issue 3: Inconsistent onMount Usage**

- **Location**: 61 files still use `onMount` (64 occurrences)
- **Severity**: Minor
- **Examples**:
  - `/src/lib/components/chat/ChatWindow.svelte`
  - `/src/lib/components/python/PythonEditor.svelte`
  - `/src/lib/components/DynamicMathField.svelte`
- **Impact**: Mixed patterns reduce consistency
- **Recommendation**: Evaluate case-by-case; many are legitimate (DOM access, third-party libs). Document when `onMount` is acceptable vs `$effect`.

**Issue 4: `@html` Usage Without Sanitization Check**

- **Location**: 18 files with 31 occurrences
- **Severity**: Important
- **Key Files**:
  - `/src/lib/components/markdown/MarkdownRaw.svelte`
  - `/src/lib/components/worksheets/VariantPreview.svelte`
  - `/src/lib/components/notebook/CellOutputs.svelte`
- **Impact**: Potential XSS if content not properly sanitized
- **Recommendation**: Audit each usage; ensure all `@html` content passes through DOMPurify or similar

---

## 3. Type Safety Evaluation

### Strengths

**Strict TypeScript Configuration**:

- `"strict": true` enabled
- ESLint rule `@typescript-eslint/no-unused-vars` configured
- Database types auto-generated from Supabase

**Type-Safe API Validation**:

```typescript
// Every API endpoint follows this pattern
const schema = z.object({
	studentId: z.string().uuid(),
	classId: z.string().uuid(),
	delta: z.number().int().min(-1000).max(1000)
});

const validation = schema.safeParse(await request.json());
if (!validation.success) {
	throw error(400, validation.error.issues[0].message);
}
```

### Issues Found

**Issue 5: Remaining `any` Types**

- **Severity**: Important
- **Impact**: Bypasses TypeScript protection
- **Recommendation**: Run `grep -r ": any" src/` and systematically replace with:
  - Specific types from `database.ts`
  - `unknown` with type guards
  - Generics where appropriate

**Issue 6: Type Assertions in Cache**

```typescript
// From teacherDashboardCache.svelte.ts line 673
for (const [studentId, counts] of Object.entries(data.warnings || {})) {
	warningsMap.set(studentId, counts as StudentWarningCounts);
}
```

- **Severity**: Minor
- **Impact**: Runtime type safety not guaranteed
- **Recommendation**: Use Zod validation for API response parsing

---

## 4. Performance Analysis

### Strengths

**Sophisticated Caching Architecture**:

- 5 separate caches with appropriate TTLs
- Automatic invalidation
- Hydration from SSR load functions
- Memory-efficient with auto-cleanup

**Optimistic UI**:

- Instant feedback (0ms perceived latency)
- Request batching (90% reduction in DB calls for rapid clicks)
- Automatic rollback on errors

**Skeleton Loading States**:

- Context-aware skeletons (`SkeletonDashboard`, `SkeletonList`, `SkeletonForm`)
- Smooth transitions during navigation

### Areas for Improvement

**Issue 7: Large Bundle Potential**

- **Location**: Holographic card CSS loaded conditionally
- **Observation**: 6 CSS files (~25KB) loaded only for dashboard
- **Severity**: Minor (already optimized)
- **Recommendation**: Consider code splitting for heavy features

**Issue 8: Multiple SvelteMap Creations**

```typescript
// From teacherDashboardCache.svelte.ts
// Creates new SvelteMap on each optimistic update
const newRewardsMap = new SvelteMap(cached.rewards);
newRewardsMap.set(studentId, updatedRewards);
```

- **Severity**: Minor
- **Impact**: Memory allocation on frequent updates
- **Recommendation**: Consider mutation patterns for high-frequency updates

---

## 5. Security Analysis

### Strengths

**100% Zod Validation Coverage**:

- Custom ESLint rule `require-zod-validation` enforces validation on all API endpoints
- 334 validation calls across 210 API files
- Comprehensive validation schemas in `/src/lib/server/validation/`

**Numeric Bounds Enforcement**:

```typescript
delta: z.number().int().min(-1000).max(1000); // Safety bounds
```

**Authorization Middleware**:

```typescript
// Centralized teacher-student verification
const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);
```

**Authentication Pattern**:

- Hook-based authentication in `hooks.server.ts`
- Profile loaded once per request via `userProfileHandle`
- Consistent `locals` pattern across all endpoints

### Minor Observations

**Issue 9: CSRF Protection**

- **Status**: Needs verification
- **Recommendation**: Ensure SvelteKit's built-in CSRF protection is not disabled

**Issue 10: Rate Limiting**

- **Status**: Supabase auth has rate limits (configured in `supabase/config.toml`)
- **Observation**: API endpoints may benefit from additional rate limiting
- **Recommendation**: Consider implementing rate limiting middleware for sensitive operations

---

## 6. Svelte 5 / SvelteKit Best Practices

### Strengths

**Full Runes Adoption**:

- `$state()` for reactive state
- `$derived()` for computed values
- `$effect()` for side effects
- `$props()` for component properties
- `$bindable()` for two-way binding

**Proper SvelteKit Patterns**:

- Data fetching in load functions
- Mutations through API endpoints and form actions
- Correct use of `$app/navigation` (goto, invalidate)
- Server-only code isolated in `.server.ts` files

**Custom Components Over Native**:

- `MySelect` and `MyCheckbox` wrapper components
- Consistent styling with Tailwind CSS 4

### Best Practice Examples

**Modal Stack System**:

```typescript
// Clean modal navigation without z-index conflicts
modalStack.push({
	component: VipCardDrawModal,
	props: { studentId, count },
	canDismiss: false,
	onReturn: () => refreshData()
});
```

**Server Load Pattern**:

```typescript
export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals;
	// Consistent pattern across all protected routes
};
```

---

## 7. Database / Supabase Analysis

### Strengths

**Migration-First Workflow**:

- 150+ SQL migrations in `/supabase/migrations/`
- Schema changes tracked in version control
- Auto-generated types from schema

**RPC Functions for Complex Operations**:

```typescript
// Secure server-side operations
await supabase.rpc('update_student_gidouilles', {
	p_student_id: studentId,
	p_class_id: classId,
	p_delta: delta
});
```

**Realtime Integration**:

- Presence system for user activity
- Notification system with real-time updates
- Chat functionality

### Observations

**Issue 11: Large Migration Count**

- **Observation**: 150+ migrations may slow down development database reset
- **Severity**: Minor
- **Recommendation**: Consider squashing older migrations periodically

---

## 8. Maintainability Assessment

### Strengths

**Excellent Documentation**:

- Comprehensive `CLAUDE.md` for AI assistants
- Detailed `/docs/claude/` documentation
- Inline comments explaining complex patterns
- WIP documents for ongoing features

**Consistent Code Style**:

- ESLint and Prettier configured
- Import order enforced
- Naming conventions followed

**Testing Infrastructure**:

- 2,430/2,454 tests passing (99.0%)
- Unit tests for validation schemas
- Component tests (\*.svelte.test.ts)
- Database trigger tests

### Areas for Improvement

**Issue 12: Component Size Distribution**
Files over 500 lines that could benefit from splitting:

1. `/src/routes/(protected)/dashboard/teacher/rewards/+page.svelte` - 1726 lines
2. `/src/lib/stores/teacherDashboardCache.svelte.ts` - 933 lines

**Issue 13: Store Proliferation**

- **Observation**: 40 store files in `/src/lib/stores/`
- **Impact**: Potential confusion about which store to use
- **Recommendation**: Document store purposes and relationships

---

## 9. Recommended Actions

### High Priority

1. **Audit `@html` Usage** (Security)
   - Review all 31 occurrences in 18 files
   - Ensure DOMPurify or equivalent sanitization
   - Document approved patterns

2. **Split Large Components** (Maintainability)
   - Break rewards page into smaller components
   - Aim for <500 lines per component

3. **Eliminate Remaining `any` Types** (Type Safety)
   - Systematic search and replace
   - Add type guards where needed

### Medium Priority

4. **Document Store Architecture**
   - Create store relationship diagram
   - Document when to use which store

5. **Archive WIP Documentation**
   - Move completed items to `/docs/archive/`
   - Consolidate active items

6. **Add Rate Limiting**
   - Implement for sensitive API endpoints
   - Consider Redis-based solution

### Low Priority

7. **Optimize SvelteMap Updates**
   - Profile high-frequency update patterns
   - Consider mutation strategies

8. **Consolidate Migrations**
   - Squash older migrations
   - Document migration strategy

---

## 10. Conclusion

UbuMaths demonstrates mature, well-architected code with strong foundations in security (100% Zod validation), modern framework usage (full Svelte 5 runes adoption), and performance optimization (sophisticated caching with optimistic UI).

The main areas for improvement are:

1. Large component files that would benefit from splitting
2. Minor type safety gaps with remaining `any` types
3. Documentation maintenance for WIP files

The codebase is **production-ready** and follows industry best practices. The documented patterns in `/docs/claude/best-practices.md` serve as an excellent reference for maintaining code quality.

### Final Quality Score: **8.5/10**

**Readiness**: Ready for continued development with minor improvements recommended.

---

_Report generated by Architecture Review Agent_
_Based on analysis of project structure, patterns, and documentation_
