# Grade Access Control Model

> Prerequisite-based permission system for educational content access.

---

## Overview

The Grade System uses a **prerequisite-based access model** where students can access content from:

1. Their current grade
2. All prerequisite (lower) grades

This reflects educational reality: a 6eme student has mastered CM2 content and can review it.

---

## Access Rules

### Core Principle

```
A student in grade X can access content for grade Y if and only if:
  Y is in the transitive closure of X's prerequisites (including X itself)
```

### Visual Representation

```
                    ACCESS DIRECTION
                    ◄─────────────────
                    (can access lower)

┌────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   CP ──► CE1 ──► CE2 ──► CM1 ──► CM2 ──► 6 ──► 5 ──► 4 ──► 3 ──► 2    │
│                                                                    │    │
│                                         ┌──────────────────────────┘    │
│                                         │                               │
│                                         ├──► 1_GEN ──► T_GEN            │
│                                         │              └──► T_COMP      │
│                                         ├──► 1_SPE ──► T_SPE            │
│                                         │              └──► T_EXP       │
│                                         └──► 1_STMG ──► T_STMG          │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘

                    ACCESS DIRECTION
                    ─────────────────►
                    (cannot access higher)
```

---

## Access Examples

### Linear Progression (CP to 3eme)

| User Grade | Can Access                | Cannot Access   |
| ---------- | ------------------------- | --------------- |
| `CP`       | CP                        | CE1+            |
| `CE1`      | CP, CE1                   | CE2+            |
| `6`        | CP, CE1, CE2, CM1, CM2, 6 | 5, 4, 3, 2, ... |
| `3`        | CP through 3              | 2+              |

### High School (with tracks)

| User Grade | Can Access                        | Cannot Access       |
| ---------- | --------------------------------- | ------------------- |
| `2`        | CP through 2                      | All 1ere, Terminale |
| `1_GEN`    | CP through 2, 1_GEN               | 1*SPE, 1_STMG, T*\* |
| `1_SPE`    | CP through 2, 1_SPE               | 1*GEN, 1_STMG, T*\* |
| `T_SPE`    | CP through 2, 1_SPE, T_SPE        | 1_GEN, T_GEN, T_EXP |
| `T_EXP`    | CP through 2, 1_SPE, T_SPE, T_EXP | T_GEN, T_COMP       |

### Cross-Track Access

**Important:** Students in one track CANNOT access content from other tracks:

```typescript
hasAccessToGrade('T_SPE', 'T_GEN'); // false - different tracks
hasAccessToGrade('T_GEN', 'T_SPE'); // false - different tracks
hasAccessToGrade('1_SPE', '1_STMG'); // false - different tracks
```

**Exception:** 2nde is shared by all tracks:

```typescript
hasAccessToGrade('T_SPE', '2'); // true - common prerequisite
hasAccessToGrade('T_GEN', '2'); // true - common prerequisite
```

---

## Implementation

### Core Function

```typescript
// src/lib/utils/grades.ts

export function hasAccessToGrade(userGrade: GradeCode, contentGrade: GradeCode): boolean {
	const accessible = getAccessibleGrades(userGrade);
	return accessible.includes(contentGrade);
}

export function getAccessibleGrades(grade: GradeCode): GradeCode[] {
	// Check cache first
	if (accessibleCache.has(grade)) {
		return accessibleCache.get(grade)!;
	}

	// BFS traversal of prerequisite graph
	const accessible: GradeCode[] = [];
	const visited = new Set<GradeCode>();
	const queue: GradeCode[] = [grade];

	while (queue.length > 0) {
		const current = queue.shift()!;
		if (visited.has(current)) continue;

		visited.add(current);
		accessible.push(current);

		// Add all prerequisites to queue
		for (const prereq of GRADES[current].prerequisites) {
			if (!visited.has(prereq)) {
				queue.push(prereq);
			}
		}
	}

	// Cache result
	accessibleCache.set(grade, accessible);
	return accessible;
}
```

### Caching Strategy

```typescript
const accessibleCache = new Map<GradeCode, GradeCode[]>();

// Cache is populated on first access
// Results are immutable (grade prerequisites don't change)
// Clear for testing only
export function clearGradeCache(): void {
	accessibleCache.clear();
}
```

---

## Use Cases

### 1. Filter Exercises for Student

```typescript
async function getExercisesForStudent(studentGrade: GradeCode, supabase: SupabaseClient) {
	const accessible = getAccessibleGrades(studentGrade);

	const { data } = await supabase.from('exercises').select('*').overlaps('grades', accessible);

	return data;
}
```

### 2. Validate Content Access

```typescript
// In API middleware
function requireContentAccess(userGrade: GradeCode, contentGrade: GradeCode) {
	if (!hasAccessToGrade(userGrade, contentGrade)) {
		throw error(403, "Vous n'avez pas acces a ce contenu");
	}
}
```

### 3. UI Grade Filter

```svelte
<script>
	import { getAccessibleGrades } from '$lib/utils/grades';

	let { studentGrade } = $props();

	const availableGrades = $derived(getAccessibleGrades(studentGrade));
</script>

<select>
	{#each availableGrades as grade}
		<option value={grade}>{formatGradeShort(grade)}</option>
	{/each}
</select>
```

### 4. Zod Validation

```typescript
import { gradeAccessSchema } from '$lib/server/validation/grades';

// Validate in API
const result = gradeAccessSchema.safeParse({
	userGrade: session.user.grade,
	contentGrade: body.targetGrade
});

if (!result.success) {
	throw error(403, result.error.issues[0].message);
}
```

---

## Special Cases

### 2nde: The Branching Point

2nde is unique because it has NO single successor:

```typescript
getNextGrade('2'); // null - 3 possible paths

// After 2nde, student chooses:
// - 1_GEN (general without math specialty)
// - 1_SPE (math specialty)
// - 1_STMG (management/business)
```

**Implication:** Content targeting "2nde" is accessible to ALL lycee students.

### Terminale Options

- **T_EXP** (Maths Expert): Additional option for T_SPE students

  - Prerequisites: 1_SPE (not T_SPE)
  - Can access: Everything T_SPE can + T_EXP specific content

- **T_COMP** (Maths Complementaires): Option for general track
  - Prerequisites: 1_GEN
  - Can access: Everything T_GEN can + T_COMP specific content

```typescript
// T_EXP student access
hasAccessToGrade('T_EXP', '1_SPE'); // true
hasAccessToGrade('T_EXP', 'T_SPE'); // true
hasAccessToGrade('T_EXP', 'T_EXP'); // true
hasAccessToGrade('T_EXP', 'T_COMP'); // false (different track)
```

---

## Database Queries

### PostgreSQL Array Overlap

```sql
-- Get exercises accessible to 6eme student
SELECT * FROM exercises
WHERE grades && ARRAY['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6'];

-- Using function
SELECT * FROM exercises
WHERE grades && get_accessible_grades('6');
```

### With Supabase Client

```typescript
const accessible = getAccessibleGrades(userGrade);

const { data } = await supabase.from('exercises').select('*').overlaps('grades', accessible);
```

---

## Access Control Matrix

Complete access matrix for reference:

| Grade  | Accessible Grades Count | Notes                      |
| ------ | ----------------------- | -------------------------- |
| CP     | 1                       | Entry point                |
| CE1    | 2                       |                            |
| CE2    | 3                       |                            |
| CM1    | 4                       |                            |
| CM2    | 5                       |                            |
| 6      | 6                       | End of Cycle 3             |
| 5      | 7                       |                            |
| 4      | 8                       |                            |
| 3      | 9                       | End of Cycle 4             |
| 2      | 10                      | Branching point            |
| 1_GEN  | 11                      |                            |
| 1_SPE  | 11                      |                            |
| 1_STMG | 11                      |                            |
| T_GEN  | 12                      |                            |
| T_SPE  | 12                      |                            |
| T_EXP  | 13                      | Most access (Maths Expert) |
| T_COMP | 13                      |                            |
| T_STMG | 12                      |                            |

---

## Security Considerations

### 1. Always Validate on Server

```typescript
// Never trust client-side grade claims
export const load = async ({ locals }) => {
	const userGrade = locals.profile?.grade; // From authenticated session
	const accessible = getAccessibleGrades(userGrade);
	// ...
};
```

### 2. Use RLS Policies

```sql
-- Example RLS policy for exercises
CREATE POLICY "Users can view exercises for accessible grades"
ON exercises FOR SELECT
USING (
  grades && get_accessible_grades(auth.jwt() ->> 'grade')
);
```

### 3. Validate in API Routes

```typescript
// In +server.ts
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireAuth(locals);

	// Validate content access
	const content = await getContent(params.id);
	if (!hasAccessToGrade(profile.grade, content.grade)) {
		throw error(403, 'Access denied');
	}

	return json(content);
};
```

---

## Testing

### Unit Tests

```typescript
describe('hasAccessToGrade', () => {
	it('allows access to own grade', () => {
		expect(hasAccessToGrade('6', '6')).toBe(true);
	});

	it('allows access to prerequisites', () => {
		expect(hasAccessToGrade('6', 'CM2')).toBe(true);
		expect(hasAccessToGrade('6', 'CP')).toBe(true);
	});

	it('denies access to future grades', () => {
		expect(hasAccessToGrade('6', '5')).toBe(false);
	});

	it('denies cross-track access', () => {
		expect(hasAccessToGrade('T_SPE', 'T_GEN')).toBe(false);
	});
});
```

### Run Tests

```bash
pnpm test:client src/lib/utils/grades.test.ts
```
