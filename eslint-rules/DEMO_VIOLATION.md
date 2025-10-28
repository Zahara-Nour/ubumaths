# Demo: Custom ESLint Rule in Action

This document demonstrates how the `custom/require-zod-validation` rule catches missing validation.

## Test Case: Missing Validation

Create a temporary API file with missing validation:

```bash
mkdir -p src/routes/api/test-rule-demo
```

**File**: `src/routes/api/test-rule-demo/+server.ts`

```typescript
import { z } from 'zod';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	// ❌ Missing validation!
	return json(body);
};
```

**Run ESLint**:

```bash
pnpm eslint src/routes/api/test-rule-demo/+server.ts --cache
```

**Expected Output**:

```
/path/to/src/routes/api/test-rule-demo/+server.ts
  7:1  error  request.json() must be followed by Zod validation (.safeParse or .parse)  custom/require-zod-validation

✖ 1 problem (1 error, 0 warnings)
```

---

## Fix: Add Zod Validation

```typescript
import { z } from 'zod';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const schema = z.object({
	message: z.string().min(1).max(100)
});

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const validation = schema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	return json({ message: validation.data.message });
};
```

**Run ESLint**:

```bash
pnpm eslint src/routes/api/test-rule-demo/+server.ts --cache
```

**Expected Output**:

```
✨ No errors!
```

---

## Cleanup

```bash
rm -rf src/routes/api/test-rule-demo
```

---

## Key Takeaways

1. ✅ Rule detects missing validation automatically
2. ✅ Clear error message with line number
3. ✅ Enforced at ERROR level (blocks commits)
4. ✅ Fast feedback (< 1s with cache)
5. ✅ Works seamlessly with existing lint workflow
