# Exercise CRUD - Usage Examples

Quick reference guide for using the updated Exercise CRUD operations with variables and distribution modes.

---

## Creating Exercises

### Static Exercise (No Variables)

```typescript
import { createExercise } from '$lib/server/exercises';

const result = await createExercise(
	supabase,
	{
		title: 'Pythagorean Theorem',
		statement_md: 'If $a=3$ and $b=4$, find $c$ where $c^2 = a^2 + b^2$',
		solution_md: 'Using the theorem: $c^2 = 3^2 + 4^2 = 9 + 16 = 25$, so $c = 5$',
		difficulty: 2,
		tags: ['geometry', 'triangles'],
		topic: 'Géométrie'
	},
	userId
);
```

### Parameterized Exercise (On-Demand)

```typescript
const result = await createExercise(
	supabase,
	{
		title: 'Addition Practice',
		statement_md: 'Calculate ${{a}} + {{b}}$',
		solution_md: 'The answer is ${{eval:a+b}}$',
		variables: [
			{ name: 'a', expression: '{{1-10}}' },
			{ name: 'b', expression: '{{1-10}}' }
		],
		distribution_mode: 'on_demand', // New values each time
		difficulty: 1,
		tags: ['addition', 'arithmetic']
	},
	userId
);
```

### Parameterized Exercise (Per-Student)

```typescript
const result = await createExercise(
	supabase,
	{
		title: 'Personalized Homework',
		statement_md: 'Solve: ${{a}}x + {{b}} = {{c}}$',
		solution_md: 'Solution: $x = \\frac{{{c}} - {{b}}}{{{a}}} = {{eval:(c-b)/a}}$',
		variables: [
			{ name: 'a', expression: '{{2-9}}' },
			{ name: 'b', expression: '{{1-20}}' },
			{ name: 'c', expression: '{{eval:a*5+b}}' } // Ensures integer solution
		],
		distribution_mode: 'per_student', // Each student gets unique values
		difficulty: 2,
		tags: ['algebra', 'equations']
	},
	userId
);
```

### Parameterized Exercise (Per-Group)

```typescript
const result = await createExercise(
	supabase,
	{
		title: 'Class Assignment',
		statement_md: 'Find the area of a rectangle with width {{w}} cm and height {{h}} cm',
		solution_md: 'Area = {{w}} × {{h}} = {{eval:w*h}} cm²',
		variables: [
			{ name: 'w', expression: '{{5-15}}' },
			{ name: 'h', expression: '{{10-25}}' }
		],
		distribution_mode: 'per_group', // All students in assignment see same values
		difficulty: 1,
		tags: ['geometry', 'area']
	},
	userId
);
```

---

## Updating Exercises

### Update Content Only

```typescript
import { updateExercise } from '$lib/server/exercises';

await updateExercise(
	supabase,
	exerciseId,
	{
		title: 'Updated Title',
		statement_md: 'New statement...',
		solution_md: 'New solution...'
	},
	userId
);
```

### Add Variables to Static Exercise

```typescript
await updateExercise(
	supabase,
	exerciseId,
	{
		variables: [
			{ name: 'a', expression: '{{1-10}}' },
			{ name: 'b', expression: '{{1-10}}' }
		],
		statement_md: 'Calculate {{a}} + {{b}}',
		solution_md: 'Answer: {{eval:a+b}}',
		distribution_mode: 'on_demand'
	},
	userId
);
```

### Update Variables Only

```typescript
await updateExercise(
	supabase,
	exerciseId,
	{
		variables: [
			{ name: 'a', expression: '{{5-20}}' }, // Changed range
			{ name: 'b', expression: '{{5-20}}' }
		]
	},
	userId
);
```

### Change Distribution Mode

```typescript
await updateExercise(
	supabase,
	exerciseId,
	{
		distribution_mode: 'per_student' // Changed from on_demand
	},
	userId
);
```

### Remove Variables (Convert to Static)

```typescript
await updateExercise(
	supabase,
	exerciseId,
	{
		variables: [], // Empty array removes variables
		statement_md: 'Static content with no {{}} syntax',
		solution_md: 'Static solution',
		distribution_mode: 'on_demand'
	},
	userId
);
```

---

## Fetching Exercises

### Get Single Exercise

```typescript
import { getExercise } from '$lib/server/exercises';

const { data, error } = await getExercise(supabase, exerciseId);

if (data) {
	console.log('Variables:', data.variables);
	console.log('Distribution mode:', data.distribution_mode);
}
```

### List All Exercises

```typescript
import { getExercises } from '$lib/server/exercises';

const { data, count, totalPages } = await getExercises(
	supabase,
	{}, // No filters
	{ page: 1, limit: 50 }
);
```

### Filter by Difficulty and Tags

```typescript
const { data } = await getExercises(supabase, {
	difficulty: 2,
	tags: ['algebra', 'equations']
});
```

### Filter Parameterized Exercises Only

```typescript
const { data } = await getExercises(supabase, {
	parameterized: true // Only exercises with variables
});
```

### Filter Static Exercises Only

```typescript
const { data } = await getExercises(supabase, {
	parameterized: false // Only exercises without variables
});
```

### Combined Filters

```typescript
const { data } = await getExercises(
	supabase,
	{
		difficulty: 1,
		tags: ['addition'],
		parameterized: true,
		topic: 'Arithmétique'
	},
	{ page: 1, limit: 20 }
);
```

### Get Teacher's Exercises

```typescript
import { getTeacherExercises } from '$lib/server/exercises';

const { data } = await getTeacherExercises(supabase, teacherId, { parameterized: true });
```

---

## Generating Instances

### On-Demand Mode (Random Values)

```typescript
import { generateExerciseInstanceServer } from '$lib/server/exercises';

const result = await generateExerciseInstanceServer(supabase, exerciseId, userId);

if (result.success) {
	console.log('Statement:', result.instance.statement_md);
	console.log('Solution:', result.instance.solution_md);
	console.log('Variables:', result.instance.resolvedVariables);
	console.log('Seed:', result.instance.seed);
}
```

### Per-Student Mode (Deterministic)

```typescript
// Student A sees their unique values
const resultA = await generateExerciseInstanceServer(supabase, exerciseId, studentIdA);

// Student B sees different unique values
const resultB = await generateExerciseInstanceServer(supabase, exerciseId, studentIdB);

// Student A always gets the same values on subsequent requests
const resultA2 = await generateExerciseInstanceServer(supabase, exerciseId, studentIdA);
// resultA.instance.statement_md === resultA2.instance.statement_md ✅
```

### Per-Group Mode (Shared Values)

```typescript
// All students in same assignment see same values
const result1 = await generateExerciseInstanceServer(supabase, exerciseId, student1Id, {
	groupId: assignmentId
});

const result2 = await generateExerciseInstanceServer(supabase, exerciseId, student2Id, {
	groupId: assignmentId
});

// Both see identical values
// result1.instance.statement_md === result2.instance.statement_md ✅
```

### With AST Parsing

```typescript
const result = await generateExerciseInstanceServer(supabase, exerciseId, userId, {
	parseAST: true
});

if (result.success) {
	console.log('Statement AST:', result.instance.statement_ast);
	console.log('Solution AST:', result.instance.solution_ast);
	// Use AST for rendering
}
```

### Override Seed (Testing/Debugging)

```typescript
const result = await generateExerciseInstanceServer(supabase, exerciseId, userId, { seed: 12345 });
// Reproducible instance with specific seed
```

---

## Checking if Exercise is Parameterized

```typescript
import { isExerciseParameterizedServer } from '$lib/server/exercises';

const hasVariables = await isExerciseParameterizedServer(supabase, exerciseId);

if (hasVariables) {
	// Generate instance
	const instance = await generateExerciseInstanceServer(supabase, exerciseId, userId);
} else {
	// Use static content directly
	const { data } = await getExercise(supabase, exerciseId);
}
```

---

## Error Handling

### Create/Update Validation Errors

```typescript
const result = await createExercise(
	supabase,
	{
		// ...
		distribution_mode: 'invalid_mode', // ❌
		variables: 'not-an-array' // ❌
	},
	userId
);

if (result.error) {
	console.error('Validation error:', result.error.message);
	// "Invalid distribution_mode: invalid_mode. Must be one of: on_demand, per_student, per_group"
	// "Invalid variables: Variables must be an array"
}
```

### Instance Generation Errors

```typescript
const result = await generateExerciseInstanceServer(supabase, 'non-existent-id', userId);

if (!result.success) {
	console.error('Errors:', result.errors);
	// ['Exercise not found']
}

// Missing groupId for per-group mode
const result2 = await generateExerciseInstanceServer(
	supabase,
	exerciseIdWithPerGroupMode,
	userId
	// Missing groupId option ❌
);

if (!result2.success) {
	console.error('Errors:', result2.errors);
	// ['Group ID required for per-group distribution mode. Please provide groupId in options.']
}
```

### Variable Errors (Caught by Generator)

```typescript
// Exercise with circular dependency
const result = await generateExerciseInstanceServer(supabase, exerciseIdWithCircularDeps, userId);

if (!result.success) {
	console.error('Errors:', result.errors);
	// ['Circular dependency detected: a → b → a']
}

// Exercise with undefined variable reference
if (!result.success) {
	console.error('Errors:', result.errors);
	// ['Undefined variable: {{c}}']
}
```

---

## API Endpoint Integration

### GET /api/exercises/[id]/instance

```typescript
// src/routes/api/exercises/[id]/instance/+server.ts
import { json } from '@sveltejs/kit';
import { generateExerciseInstanceServer } from '$lib/server/exercises';

export async function GET({ params, locals, url }) {
	const groupId = url.searchParams.get('groupId') || undefined;
	const parseAST = url.searchParams.get('parseAST') === 'true';

	const result = await generateExerciseInstanceServer(
		locals.supabase,
		params.id,
		locals.session.user.id,
		{ groupId, parseAST }
	);

	if (!result.success) {
		return json({ errors: result.errors }, { status: 400 });
	}

	return json(result.instance);
}
```

### POST /api/exercises (Create)

```typescript
// src/routes/api/exercises/+server.ts
import { json } from '@sveltejs/kit';
import { createExercise } from '$lib/server/exercises';

export async function POST({ request, locals }) {
	const body = await request.json();

	const result = await createExercise(
		locals.supabase,
		{
			title: body.title,
			statement_md: body.statement_md,
			solution_md: body.solution_md,
			variables: body.variables,
			distribution_mode: body.distribution_mode,
			difficulty: body.difficulty,
			tags: body.tags,
			topic: body.topic
		},
		locals.session.user.id
	);

	if (result.error) {
		return json({ error: result.error.message }, { status: 400 });
	}

	return json(result.data, { status: 201 });
}
```

---

## Server Load Function Integration

### Load Exercise with Instance

```typescript
// src/routes/(protected)/exercises/[id]/+page.server.ts
import { getExercise, generateExerciseInstanceServer } from '$lib/server/exercises';

export const load = async ({ params, locals }) => {
	// Fetch exercise template
	const { data: exercise } = await getExercise(locals.supabase, params.id);

	if (!exercise) {
		throw error(404, 'Exercise not found');
	}

	// Generate instance if parameterized
	let instance = null;
	if (exercise.variables && exercise.variables.length > 0) {
		const result = await generateExerciseInstanceServer(
			locals.supabase,
			params.id,
			locals.session.user.id,
			{ parseAST: true }
		);

		if (result.success) {
			instance = result.instance;
		}
	}

	return {
		exercise,
		instance
	};
};
```

---

## Form Action Integration

### Create Exercise Form

```typescript
// src/routes/(protected)/exercises/create/+page.server.ts
import { createExercise } from '$lib/server/exercises';
import { fail } from '@sveltejs/kit';

export const actions = {
	create: async ({ request, locals }) => {
		const formData = await request.formData();

		const variablesJson = formData.get('variables');
		const variables = variablesJson ? JSON.parse(variablesJson) : undefined;

		const result = await createExercise(
			locals.supabase,
			{
				title: formData.get('title'),
				statement_md: formData.get('statement_md'),
				solution_md: formData.get('solution_md'),
				variables,
				distribution_mode: formData.get('distribution_mode') || 'on_demand',
				difficulty: parseInt(formData.get('difficulty')),
				tags: JSON.parse(formData.get('tags') || '[]')
			},
			locals.session.user.id
		);

		if (result.error) {
			return fail(400, {
				error: result.error.message,
				values: Object.fromEntries(formData)
			});
		}

		return { success: true, exerciseId: result.data.id };
	}
};
```

---

## Complete Workflow Example

### Creating and Using a Parameterized Exercise

```typescript
// 1. Teacher creates parameterized exercise
const createResult = await createExercise(
	supabase,
	{
		title: 'Linear Equations Practice',
		statement_md: 'Solve: ${{a}}x + {{b}} = {{c}}$',
		solution_md: 'Solution: $x = \\frac{{{c}} - {{b}}}{{{a}}} = {{answer}}$',
		variables: [
			{ name: 'a', expression: '{{2-9}}' },
			{ name: 'b', expression: '{{-10-10}}' },
			{ name: 'c', expression: '{{eval:a*5+b}}' },
			{ name: 'answer', expression: '{{eval:(c-b)/a}}' }
		],
		distribution_mode: 'per_student',
		difficulty: 2,
		tags: ['algebra', 'equations'],
		topic: 'Algèbre'
	},
	teacherId
);

const exerciseId = createResult.data.id;

// 2. Student A gets their unique instance
const instanceA = await generateExerciseInstanceServer(supabase, exerciseId, studentIdA);

console.log('Student A sees:', instanceA.instance.statement_md);
// "Solve: $3x + 5 = 20$"

// 3. Student B gets different unique instance
const instanceB = await generateExerciseInstanceServer(supabase, exerciseId, studentIdB);

console.log('Student B sees:', instanceB.instance.statement_md);
// "Solve: $7x - 3 = 32$"

// 4. Student A returns later - gets same instance
const instanceA2 = await generateExerciseInstanceServer(supabase, exerciseId, studentIdA);

console.log('Student A sees again:', instanceA2.instance.statement_md);
// "Solve: $3x + 5 = 20$" (same as before!)

// 5. Teacher can update variable ranges
await updateExercise(
	supabase,
	exerciseId,
	{
		variables: [
			{ name: 'a', expression: '{{5-15}}' }, // Increased range
			{ name: 'b', expression: '{{-20-20}}' },
			{ name: 'c', expression: '{{eval:a*10+b}}' }, // Larger numbers
			{ name: 'answer', expression: '{{eval:(c-b)/a}}' }
		]
	},
	teacherId
);

// 6. New students get values from updated ranges
const instanceC = await generateExerciseInstanceServer(supabase, exerciseId, studentIdC);

console.log('Student C sees:', instanceC.instance.statement_md);
// "Solve: $12x - 8 = 112$" (values from new range)
```

---

## Best Practices

1. **Always handle errors:**

   ```typescript
   if (result.error || !result.success) {
   	// Handle error appropriately
   }
   ```

2. **Validate variables before creating:**

   ```typescript
   // Variables must have name and expression
   variables: [
   	{ name: 'a', expression: '{{1-10}}' }, // ✅
   	{ name: 'b' } // ❌ Missing expression
   ];
   ```

3. **Use appropriate distribution mode:**
   - `on_demand`: Practice mode, infinite variety
   - `per_student`: Homework, personalized but consistent
   - `per_group`: Class work, everyone sees same problem

4. **Parse AST only when needed:**

   ```typescript
   // For display: parseAST: true
   // For storage/logging: parseAST: false (faster)
   ```

5. **Check parameterization before generating:**
   ```typescript
   const hasVariables = await isExerciseParameterizedServer(supabase, id);
   if (hasVariables) {
   	// Generate instance
   } else {
   	// Use static content
   }
   ```
