# Exercise System: Improvements & Recommendations

Analysis of potential improvements for the Exercise system across architecture, security, performance, UX, and features.

---

## Table of Contents

1. [Architecture Improvements](#architecture-improvements)
2. [Security Improvements](#security-improvements)
3. [Performance Improvements](#performance-improvements)
4. [UX Improvements](#ux-improvements)
5. [Feature Improvements](#feature-improvements)
6. [Priority Matrix](#priority-matrix)

---

## Architecture Improvements

### 1. Separate Variations from Legacy Format

**Current State**: The system supports both legacy format (`statement_md`/`solution_md` at exercise level) and the new variations format. This dual support adds complexity to the codebase.

**Recommendation**: Consider a migration strategy to convert legacy exercises to the variations format (with a single "default" variation).

```typescript
// Migration example
function migrateLegacyToVariations(exercise: Exercise): Exercise {
	if (!isVariationsExercise(exercise)) {
		return {
			...exercise,
			variations: [
				{
					label: 'default',
					statement_md: exercise.statement_md,
					solution_md: exercise.solution_md,
					variables: exercise.variables
				}
			],
			shared: undefined,
			// Clear legacy fields
			statement_md: '',
			solution_md: '',
			variables: undefined
		};
	}
	return exercise;
}
```

**Impact**: High (simplifies generator logic, validation, and UI)

---

### 2. Extract Variable Resolution to Dedicated Service

**Current State**: Variable resolution logic is embedded in `instance-generator.ts`.

**Recommendation**: Create a dedicated `VariableResolutionService` with:

- Caching for repeated resolutions
- Better error handling with specific error types
- Support for custom expression evaluators

```typescript
// Proposed structure
class VariableResolutionService {
	resolveVariables(variables: Variable[], seed: number): ResolvedVariable[];
	validateVariables(variables: Variable[]): ValidationResult;
	detectCircularDependencies(variables: Variable[]): CircularDependencyResult;
	evaluateExpression(expression: string, context: Record<string, number>): number;
}
```

**Impact**: Medium (improves testability and extensibility)

---

### 3. Event-Driven Completion Tracking

**Current State**: Completion tracking is synchronous and blocks the main request.

**Recommendation**: Use database triggers or background jobs for:

- Updating completion statistics
- Sending notifications
- Analytics aggregation

```sql
-- Example: Trigger for stats update
CREATE TRIGGER update_exercise_stats
    AFTER INSERT OR UPDATE ON exercise_completions
    FOR EACH ROW
    EXECUTE FUNCTION update_exercise_completion_stats();
```

**Impact**: Medium (improves response times for student actions)

---

### 4. Add Versioning for Exercise Content

**Current State**: Exercise updates overwrite previous content with no history.

**Recommendation**: Implement content versioning:

```sql
CREATE TABLE exercise_versions (
    id UUID PRIMARY KEY,
    exercise_id UUID REFERENCES exercises(id),
    version_number INTEGER,
    statement_md TEXT,
    solution_md TEXT,
    variables JSONB,
    variations JSONB,
    created_at TIMESTAMPTZ,
    created_by UUID
);
```

**Benefits**:

- Restore previous versions
- Audit trail for changes
- Compare versions

**Impact**: Medium (adds complexity but enables powerful features)

---

### 5. Decouple Rendering from Data Model

**Current State**: `ExerciseDisplay.svelte` handles both data fetching and rendering logic.

**Recommendation**: Split into:

- `ExerciseDataProvider` (handles fetching, caching, instance generation)
- `ExerciseRenderer` (pure presentation component)

**Impact**: Low-Medium (improves component reusability)

---

## Security Improvements

### 1. Rate Limiting for Share Tokens

**Current State**: No rate limiting on share token access.

**Vulnerability**: Attackers could brute-force token guessing.

**Recommendation**: Implement rate limiting:

```typescript
// In +page.server.ts for /exercice/[slug]
const rateLimiter = new RateLimiter({
	maxRequests: 10,
	windowMs: 60000, // 1 minute
	keyGenerator: (event) => event.getClientAddress()
});

if (!rateLimiter.check(event)) {
	throw error(429, 'Too many requests');
}
```

**Additional measures**:

- Increase token length from 16 to 24 characters
- Add token attempt logging for suspicious activity
- Consider CAPTCHA after failed attempts

**Impact**: High (critical security improvement)

---

### 2. Content Sanitization for Markdown

**Current State**: User-submitted markdown is rendered with potential XSS vectors.

**Recommendation**: Ensure markdown sanitization:

```typescript
// Before rendering
import DOMPurify from 'dompurify';

const sanitizedHtml = DOMPurify.sanitize(renderedMarkdown, {
	ALLOWED_TAGS: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'code', 'pre'],
	ALLOWED_ATTR: ['class', 'id']
});
```

**Impact**: High (prevents XSS attacks)

---

### 3. Validate Resource URLs

**Current State**: Resource URLs (videos, PDFs, links) are validated as URLs but not for malicious content.

**Recommendation**: Add URL allowlist/blocklist:

```typescript
const ALLOWED_DOMAINS = [
	'youtube.com',
	'youtu.be',
	'vimeo.com',
	'geogebra.org',
	// Internal storage
	'your-supabase-project.supabase.co'
];

function validateResourceUrl(url: string): boolean {
	const parsed = new URL(url);
	return ALLOWED_DOMAINS.some(
		(domain) => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
	);
}
```

**Impact**: Medium (prevents malicious redirects)

---

### 4. Audit Logging for Sensitive Operations

**Current State**: Limited logging for security-relevant actions.

**Recommendation**: Add audit log table:

```sql
CREATE TABLE exercise_audit_log (
    id UUID PRIMARY KEY,
    exercise_id UUID,
    action TEXT, -- 'create', 'update', 'delete', 'share', 'assign'
    actor_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ
);
```

**Impact**: Medium (enables security investigations)

---

### 5. Token Expiration Enforcement

**Current State**: Token expiration is checked, but expired tokens remain in database.

**Recommendation**: Add cleanup job:

```sql
-- Scheduled function to clean expired tokens
CREATE FUNCTION cleanup_expired_share_tokens()
RETURNS void AS $$
BEGIN
    UPDATE exercise_share_tokens
    SET is_active = false
    WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron
SELECT cron.schedule('cleanup-tokens', '0 * * * *', 'SELECT cleanup_expired_share_tokens()');
```

**Impact**: Low (housekeeping)

---

## Performance Improvements

### 1. Implement Caching Layer

**Current State**: Every exercise view hits the database.

**Recommendation**: Add Redis/Vercel KV caching:

```typescript
// Cache frequently accessed exercises
const CACHE_TTL = 300; // 5 minutes

async function getExerciseCached(id: string): Promise<Exercise> {
	const cached = await cache.get(`exercise:${id}`);
	if (cached) return JSON.parse(cached);

	const exercise = await getExercise(supabase, id);
	await cache.set(`exercise:${id}`, JSON.stringify(exercise), CACHE_TTL);
	return exercise;
}
```

**Cache invalidation**:

- On exercise update
- On exercise delete

**Impact**: High (significant latency reduction for popular exercises)

---

### 2. Optimize Full-Text Search

**Current State**: FTS uses `to_tsvector` on multiple columns with `websearch` config.

**Recommendation**:

- Pre-compute tsvector in dedicated column (already done)
- Add GIN index (already done)
- Consider using `to_tsquery` with prefix matching for autocomplete

```sql
-- For autocomplete
SELECT * FROM exercises
WHERE fts_column @@ to_tsquery('french', 'pythag:*');
```

**Impact**: Medium (improves search experience)

---

### 3. Lazy Load Variation Content

**Current State**: All variations are loaded even when viewing a single one.

**Recommendation**: Load variation content on demand:

```typescript
// API endpoint: GET /api/exercises/[id]/variations/[index]
async function getExerciseVariation(
	exerciseId: string,
	variationIndex: number
): Promise<ExerciseVariation>;
```

**Impact**: Low (minor improvement for exercises with many variations)

---

### 4. Batch Instance Generation

**Current State**: Each student request generates instance individually.

**Recommendation**: Pre-generate instances for `per_student` mode:

```typescript
// Background job after assignment creation
async function preGenerateInstances(exerciseId: string, studentIds: string[]): Promise<void> {
	const exercise = await getExercise(exerciseId);

	for (const studentId of studentIds) {
		const seed = generateStudentSeed(exerciseId, studentId);
		const instance = generateExerciseInstance(exercise, { seed });
		await cacheInstance(exerciseId, studentId, instance);
	}
}
```

**Impact**: Medium (improves student experience for large classes)

---

### 5. Database Query Optimization

**Current State**: Some queries use multiple round-trips.

**Specific improvements**:

```sql
-- 1. Add composite index for common queries
CREATE INDEX idx_exercises_teacher_topic_difficulty
ON exercises(created_by, topic, difficulty);

-- 2. Use materialized view for statistics
CREATE MATERIALIZED VIEW exercise_stats_mv AS
SELECT
    exercise_id,
    COUNT(*) as total_assigned,
    COUNT(completed_at) as total_completed,
    AVG(view_count) as avg_views
FROM exercise_completions
GROUP BY exercise_id;

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY exercise_stats_mv;
```

**Impact**: Medium (database-level optimization)

---

### 6. Pagination for Large Results

**Current State**: Pagination implemented but could use cursor-based for large datasets.

**Recommendation**: Add cursor-based pagination option:

```typescript
interface CursorPaginationParams {
	cursor?: string; // Base64-encoded (created_at, id)
	limit: number;
	direction: 'forward' | 'backward';
}

// More efficient for large offsets
```

**Impact**: Low (only matters for teachers with 1000+ exercises)

---

## UX Improvements

### 1. Drag-and-Drop Variable Ordering

**Current State**: Variables are edited in a simple list.

**Recommendation**: Add drag-and-drop reordering since variable order matters for dependencies.

**Implementation**: Use `@dnd-kit/core` or similar.

**Impact**: Medium (improves teacher experience)

---

### 2. Real-time Collaboration

**Current State**: No support for multiple editors.

**Recommendation**: Implement real-time collaboration using Supabase Realtime:

```typescript
// Subscribe to exercise changes
supabase
	.channel('exercise-editing')
	.on('broadcast', { event: 'edit' }, (payload) => {
		// Update UI with changes from other editors
	})
	.subscribe();
```

**Impact**: Low-Medium (nice-to-have for team environments)

---

### 3. Exercise Preview Mode

**Current State**: Teachers must save to see rendered exercise.

**Recommendation**: Add live preview panel that:

- Renders markdown in real-time
- Shows sample variable resolution
- Allows cycling through random instances

**Impact**: High (significantly improves authoring experience)

---

### 4. Undo/Redo for Exercise Editor

**Current State**: No undo support.

**Recommendation**: Implement undo stack:

```typescript
interface EditorState {
	content: ExerciseFormData;
	timestamp: number;
}

const undoStack: EditorState[] = [];
const redoStack: EditorState[] = [];

function pushState(state: ExerciseFormData) {
	undoStack.push({ content: state, timestamp: Date.now() });
	redoStack.length = 0; // Clear redo on new action
}
```

**Impact**: Medium (prevents accidental data loss)

---

### 5. Bulk Actions in Exercise List

**Current State**: Single-exercise operations only.

**Recommendation**: Add bulk actions:

- Bulk delete
- Bulk export
- Bulk assign to class
- Bulk change visibility

**Impact**: Medium (time-saver for teachers with many exercises)

---

### 6. Exercise Templates Library

**Current State**: Basic template support exists but underutilized.

**Recommendation**: Build curated template library with:

- Categories (Algebra, Geometry, etc.)
- Difficulty filters
- Preview before use
- One-click copy to own exercises

**Impact**: High (accelerates exercise creation)

---

### 7. Keyboard Shortcuts

**Current State**: Limited keyboard navigation.

**Recommendation**: Add shortcuts:
| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save exercise |
| `Ctrl+P` | Preview |
| `Ctrl+Shift+V` | Add variation |
| `Ctrl+/` | Toggle solution visibility |
| `Tab` | Navigate between fields |

**Impact**: Low-Medium (power user feature)

---

### 8. Progress Indicators for Students

**Current State**: Basic completion tracking.

**Recommendation**: Add visual progress:

- Progress bar on exercise list
- "X of Y completed" badge
- Streak tracking
- Time spent indicator

**Impact**: Medium (improves student motivation)

---

## Feature Improvements

### 1. Exercise Difficulty Auto-Suggestion

**Current State**: Teacher manually selects difficulty.

**Recommendation**: Use ML-based suggestion based on:

- Variable ranges (larger = harder)
- Content complexity (word count, formula depth)
- Historical completion rates

```typescript
async function suggestDifficulty(exercise: Exercise): Promise<1 | 2 | 3> {
	const features = extractFeatures(exercise);
	return classifyDifficulty(features);
}
```

**Impact**: Low-Medium (nice-to-have)

---

### 2. Exercise Cloning

**Current State**: Must recreate similar exercises from scratch.

**Recommendation**: Add "Duplicate" button that:

- Copies all content
- Generates new slug
- Sets as draft
- Opens in editor

**Impact**: High (common teacher request)

---

### 3. Conditional Content

**Current State**: All students see same structure.

**Recommendation**: Add conditional blocks based on student level:

```markdown
{{#if student.grade == '3'}}
Simplify: $\frac{{{a}}}{{{b}}}$
{{else}}
Simplify and reduce: $\frac{{{a}}}{{{b}}}$
{{/if}}
```

**Impact**: Medium (enables differentiated instruction)

---

### 4. Answer Input Fields

**Current State**: Exercises are self-graded by showing solution.

**Recommendation**: Add interactive answer fields:

- Text input
- Multiple choice
- Math input (via MathLive)
- Drag-and-drop matching

```typescript
interface AnswerField {
	id: string;
	type: 'text' | 'number' | 'math' | 'choice' | 'match';
	expectedAnswer: string | string[];
	tolerance?: number; // For numeric answers
}
```

**Impact**: High (transforms exercises into interactive assessments)

---

### 5. Exercise Collections/Playlists

**Current State**: Exercises are standalone or in worksheets.

**Recommendation**: Add lightweight collections:

- Named groups of exercises
- Shareable by link
- Progress tracking per collection
- Suggested order

**Impact**: Medium (organizational feature)

---

### 6. Exercise Analytics Dashboard

**Current State**: Basic completion stats.

**Recommendation**: Rich analytics for teachers:

- Completion rates over time
- Average time spent
- Difficulty correlation with completion
- Most/least completed exercises
- Class comparison

**Impact**: Medium (data-driven insights)

---

### 7. Spaced Repetition Integration

**Current State**: No learning optimization.

**Recommendation**: Track student mastery and suggest review:

```typescript
interface ExerciseMastery {
	exerciseId: string;
	studentId: string;
	masteryLevel: number; // 0-100
	lastAttemptAt: Date;
	nextReviewAt: Date; // Calculated via spaced repetition algorithm
}
```

**Impact**: High (significant learning improvement)

---

### 8. Exercise Comments/Discussion

**Current State**: No student-teacher communication on exercises.

**Recommendation**: Add comment thread:

- Students can ask questions
- Teachers can provide hints
- Threaded replies
- Optional notifications

**Impact**: Medium (improves student support)

---

### 9. Print/PDF Export Improvements

**Current State**: Basic PDF generation via Typst.

**Recommendation**: Enhanced export options:

- Customizable headers/footers
- Multiple exercises per page
- With/without solutions options
- Class roster with individualized instances

**Impact**: Medium (common teacher need)

---

### 10. Mobile-Optimized Experience

**Current State**: Desktop-first design.

**Recommendation**: Responsive improvements:

- Touch-friendly controls
- Swipe between exercises
- Offline support (PWA)
- Camera input for handwritten answers

**Impact**: High (accessibility)

---

## Priority Matrix

### Immediate (High Impact, Low Effort)

| Item                           | Category | Impact | Effort |
| ------------------------------ | -------- | ------ | ------ |
| Rate limiting for share tokens | Security | High   | Low    |
| Exercise cloning               | Feature  | High   | Low    |
| Exercise preview mode          | UX       | High   | Medium |
| Content sanitization           | Security | High   | Low    |

### Short-term (High Impact, Medium Effort)

| Item                 | Category    | Impact | Effort |
| -------------------- | ----------- | ------ | ------ |
| Caching layer        | Performance | High   | Medium |
| Answer input fields  | Feature     | High   | High   |
| Undo/redo for editor | UX          | Medium | Medium |
| Bulk actions         | UX          | Medium | Medium |

### Medium-term (Medium Impact, Variable Effort)

| Item                             | Category     | Impact | Effort |
| -------------------------------- | ------------ | ------ | ------ |
| Event-driven completion tracking | Architecture | Medium | Medium |
| Exercise versioning              | Architecture | Medium | High   |
| Spaced repetition                | Feature      | High   | High   |
| Analytics dashboard              | Feature      | Medium | High   |

### Long-term (Strategic)

| Item                     | Category | Impact | Effort |
| ------------------------ | -------- | ------ | ------ |
| Real-time collaboration  | UX       | Medium | High   |
| Mobile optimization      | UX       | High   | High   |
| ML difficulty suggestion | Feature  | Low    | High   |
| Conditional content      | Feature  | Medium | High   |

---

## Implementation Notes

### Dependencies Between Improvements

```
Caching Layer ──► Event-driven tracking
       │
       ▼
Pre-generate instances

Answer Input Fields ──► Spaced Repetition
       │
       ▼
Analytics Dashboard

Exercise Versioning ──► Real-time Collaboration
```

### Recommended Starting Points

1. **Security first**: Rate limiting and content sanitization
2. **Quick wins**: Exercise cloning, preview mode
3. **Foundation**: Caching layer for future scaling
4. **Differentiation**: Answer input fields for interactivity

---

## See Also

- [Technical Guide](./README.md)
- [Database Schema](../../architecture/database-schema.md)
- [Security Standards](../../claude/quality-standards.md)
