# Custom ESLint Rules for UbuMaths

This directory contains custom ESLint rules specific to UbuMaths security and code quality standards.

## Available Rules

### `require-zod-validation`

**Status**: ✅ Active (enforced as ERROR)

**Purpose**: Ensures all API endpoints validate user input with Zod schemas before processing.

**Why**: Prevents security vulnerabilities and runtime errors by enforcing type-safe validation of all user-provided data.

#### Rule Details

This rule detects when:

- `await request.json()` is called without subsequent Zod validation
- `url.searchParams.get()` is used without Zod validation
- Raw data variables are used directly without validation

The rule only applies to files in `src/routes/api/**/*.ts` and skips test files.

#### Examples

❌ **Incorrect:**

```typescript
// Missing validation - will trigger error
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { userId } = body; // No validation!
	return json({ userId });
};
```

```typescript
// Missing query validation - will trigger error
export const GET: RequestHandler = async ({ url }) => {
	const limit = url.searchParams.get('limit');
	return json({ limit }); // No validation!
};
```

✅ **Correct:**

```typescript
import { z } from 'zod';

const schema = z.object({
	userId: z.string().uuid()
});

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const validation = schema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { userId } = validation.data;
	return json({ userId });
};
```

```typescript
import { z } from 'zod';

const querySchema = z.object({
	limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(100))
});

export const GET: RequestHandler = async ({ url }) => {
	const queryRaw = {
		limit: url.searchParams.get('limit')
	};
	const validation = querySchema.safeParse(queryRaw);

	if (!validation.success) {
		return json({ error: validation.error.issues[0].message }, { status: 400 });
	}

	return json(validation.data);
};
```

#### When the Rule Applies

The rule **ONLY** checks files that meet **ALL** these criteria:

1. File path matches `src/routes/api/**/*.ts`
2. File imports `zod` (indicates it should have validation)
3. File uses `await request.json()` OR `url.searchParams`
4. File is not a test file (`.test.ts` or `.spec.ts`)

#### Edge Cases Handled

✅ **Read-only endpoints** (no validation needed):

```typescript
// No Zod import = rule doesn't apply
export const POST: RequestHandler = async ({ params }) => {
	const exerciseId = params.id; // URL params are safe
	return json({ id: exerciseId });
};
```

✅ **Using `.parse()` instead of `.safeParse()`**:

```typescript
// Both .parse() and .safeParse() are accepted
const data = schema.parse(body); // Throws on error
```

✅ **Test files**:

```typescript
// api-routes.test.ts - rule is skipped
describe('API tests', () => {
	it('should work', async () => {
		const body = await request.json(); // OK in tests
	});
});
```

#### Configuration

The rule is already configured in `eslint.config.js`:

```javascript
{
  files: ['src/routes/api/**/*.ts'],
  plugins: {
    custom: {
      rules: {
        'require-zod-validation': requireZodValidation
      }
    }
  },
  rules: {
    'custom/require-zod-validation': 'error'
  }
}
```

#### Testing the Rule

Run the test suite:

```bash
node eslint-rules/require-zod-validation.test.js
```

Or add to package.json:

```json
{
	"scripts": {
		"test:lint-rules": "node eslint-rules/require-zod-validation.test.js"
	}
}
```

#### Limitations and Known Issues

1. **Indirect validation not detected**: If validation happens in a separate function, the rule may not detect it.

   ```typescript
   // May trigger false positive
   const body = await request.json();
   validateAndProcess(body); // Validation inside helper function
   ```

   **Workaround**: Validate inline or add eslint-disable comment with justification.

2. **Validation in parent scope**: If validation is done at the start of a function and data is used later, tracking may not work perfectly.

3. **Complex data flows**: If data is passed through multiple variables, the rule may lose track.

   ```typescript
   const body = await request.json();
   const data = body; // Aliasing
   const validation = schema.safeParse(data); // May not link properly
   ```

   **Workaround**: Validate immediately after parsing:

   ```typescript
   const validation = schema.safeParse(await request.json());
   ```

#### Maintenance

**Adding new patterns to detect**:

Edit `/Users/david/Coding/js/ubumaths/eslint-rules/require-zod-validation.js` and add test cases to `/Users/david/Coding/js/ubumaths/eslint-rules/require-zod-validation.test.js`.

**Disabling the rule for specific files**:

```typescript
/* eslint-disable custom/require-zod-validation */
// Reason: This endpoint only reads data, no user input validation needed
export const GET: RequestHandler = async ({ locals }) => {
	// ... implementation
};
/* eslint-enable custom/require-zod-validation */
```

Or for a specific line:

```typescript
const body = await request.json(); // eslint-disable-line custom/require-zod-validation -- Legacy endpoint, validation handled by middleware
```

**Always include a reason** when disabling the rule.

#### Related Documentation

- **Zod Validation Patterns**: See existing API files in `src/routes/api/`
- **Security Best Practices**: [docs/contributing/security-guidelines.md](../docs/contributing/security-guidelines.md) (if exists)
- **API Development**: [CLAUDE.md](../CLAUDE.md#-important-efficient-linting-strategy)

## Future Rules (Ideas)

These rules could be implemented in the future:

### `require-validation-success-check`

Ensure that after calling `.safeParse()`, the code checks `validation.success`:

```typescript
// Detect missing success check
const validation = schema.safeParse(data);
// Should have: if (!validation.success) { ... }
```

### `forbid-type-assertions-on-request-data`

Prevent unsafe type assertions:

```typescript
// ❌ Forbidden
const data: MyType = await request.json();

// ✅ Required
const validation = schema.safeParse(await request.json());
```

### `require-specific-error-messages`

Ensure Zod validation errors are properly surfaced:

```typescript
// ❌ Generic error
throw error(400);

// ✅ Specific error from Zod
throw error(400, validation.error.issues[0].message);
```

### `require-admin-auth-check`

For admin API endpoints, require role verification:

```typescript
// Detect routes in /api/admin/ without role check
if (profile.role !== 'admin') {
	throw error(403, 'Forbidden');
}
```

---

## Contributing

When adding new custom rules:

1. Create the rule in `eslint-rules/<rule-name>.js`
2. Add comprehensive tests in `eslint-rules/<rule-name>.test.js`
3. Update `eslint.config.js` to register the rule
4. Document the rule in this README
5. Test against real codebase: `pnpm lint`
6. Update CLAUDE.md if the rule affects development workflow

## Architecture

```
eslint-rules/
├── README.md                      # This file
├── require-zod-validation.js      # Rule implementation
└── require-zod-validation.test.js # Rule tests
```

Rules are imported in `eslint.config.js` and applied to specific file patterns.

## Testing Strategy

All custom rules must have:

1. **Unit tests** with valid and invalid cases
2. **Integration testing** against real API files
3. **Documentation** of edge cases and limitations
4. **Examples** of correct and incorrect patterns

Run full lint to verify:

```bash
pnpm lint
```

Specific API files:

```bash
pnpm eslint src/routes/api/messages/send/+server.ts --cache
```

---

**Last Updated**: 2025-10-28
**Maintained by**: UbuMaths Development Team
