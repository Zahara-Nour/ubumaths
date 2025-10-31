# TypeScript Quick Fixes Guide

**Quick reference for fixing the 560 TypeScript errors**

---

## Common Error Patterns & Fixes

### Pattern 1: Unknown Type in State Variables

**Error**: `Property 'X' does not exist on type 'unknown'`

**Example**:

```typescript
// ❌ Broken
let selectedUser = $state<unknown>(null);
selectedUser.firstname; // Error!
```

**Fix**:

```typescript
// ✅ Fixed
import type { Profile } from '$lib/types/database';
let selectedUser = $state<Profile | null>(null);
selectedUser.firstname; // Works!
```

**Files affected**: 30+ files
**Quick search**: `grep -r "state<unknown" src/`

---

### Pattern 2: Untyped Database Query Results

**Error**: `Property 'X' does not exist on type 'unknown'`

**Example**:

```typescript
// ❌ Broken (+page.server.ts)
const { data: users } = await supabase.from('profiles').select('*');
return { users };

// Component
data.users.forEach((u) => u.firstname); // Error!
```

**Fix**:

```typescript
// ✅ Fixed (+page.server.ts)
import type { Profile } from '$lib/types/database';

const { data: users } = await supabase.from('profiles').select('*').returns<Profile[]>(); // Add type here!

return { users };

// Component - now typed automatically via PageData
data.users.forEach((u) => u.firstname); // Works!
```

**Files affected**: 50+ server files
**Quick search**: `grep -r "from('.*').select" src/routes/`

---

### Pattern 3: Implicit Any Parameters

**Error**: `Parameter 'X' implicitly has an 'any' type`

**Example**:

```typescript
// ❌ Broken
array.map((item) => item.value); // Error on 'item'!
```

**Fix**:

```typescript
// ✅ Fixed
array.map((item: MyType) => item.value);

// Or with type inference
const typedArray: MyType[] = array;
typedArray.map((item) => item.value); // item is inferred
```

**Files affected**: 5 files
**Quick search**: `grep -n "implicitly has an 'any' type" <error_output>`

---

### Pattern 4: Possibly Undefined Properties

**Error**: `'precision' is possibly 'undefined'`

**Example**:

```typescript
// ❌ Broken
function check(config: { precision?: number }) {
	return config.precision.toFixed(2); // Error!
}
```

**Fix**:

```typescript
// ✅ Fixed - Optional chaining
function check(config: { precision?: number }) {
	return config.precision?.toFixed(2) ?? '0.00';
}

// Or - Provide default
function check(config: { precision?: number }) {
	const precision = config.precision ?? 0;
	return precision.toFixed(2);
}

// Or - Type guard
function check(config: { precision?: number }) {
	if (config.precision === undefined) return '0.00';
	return config.precision.toFixed(2);
}
```

**Files affected**: 38 files
**Quick search**: `grep -r "possibly 'undefined'" <error_output>`

---

### Pattern 5: Type Assertion Without Validation

**Error**: `Conversion of type 'X' to type 'Y' may be a mistake`

**Example**:

```typescript
// ❌ Broken - Unsafe cast
const user = dbRow as Profile;
```

**Fix**:

```typescript
// ✅ Fixed - Use Zod validation
import { profileSchema } from '$lib/server/validation/users';

const validation = profileSchema.safeParse(dbRow);
if (!validation.success) {
	throw error(400, 'Invalid user data');
}
const user = validation.data; // Type-safe + validated!
```

**Files affected**: 4 files
**Quick search**: `grep -n "may be a mistake" <error_output>`

---

### Pattern 6: Missing Type Definitions

**Error**: `Module '"X"' has no exported member 'Y'`

**Example**:

```typescript
// ❌ Broken
import type { PrecisionType } from '$lib/types/exercises';
// Error: PrecisionType doesn't exist!
```

**Fix**:

```typescript
// ✅ Create the type (in src/lib/types/exercises.ts)
export interface PrecisionType {
	type: 'none' | 'absolute' | 'relative';
	value?: number;
	digits?: number;
	mode?: string;
}

// Now import works
import type { PrecisionType } from '$lib/types/exercises';
```

**Files affected**: 12 files (now fixed for game types)
**Quick search**: `grep -n "has no exported member" <error_output>`

---

## File-by-File Fix Cheatsheet

### Top Priority Files

#### 1. `src/routes/(protected)/dashboard/admin/users/+page.svelte` (85 errors)

**Changes needed**:

```typescript
// Line 31-45 - Replace unknown with Profile
import type { Profile } from '$lib/types/database';

let searchResults = $state<Profile[]>([]);
let classResults = $state<Profile[]>([]);
let selectedUser = $state<Profile | null>(null);
let editedUser = $state<Partial<Profile>>({});
```

**Estimated time**: 30 min
**Impact**: 85 errors fixed (15% of total)

---

#### 2. Message Template Files (3 files, 66 errors total)

**Server file changes** (for all 3):

```typescript
// In +page.server.ts
import type { MessageTemplate } from '$lib/types/database';

const { data: templates } = await supabase
	.from('message_templates')
	.select('*')
	.returns<MessageTemplate[]>(); // Add this!
```

**Component changes**:

```typescript
// Remove unknown types, rely on PageData inference
let { data }: { data: PageData } = $props();
// data.templates is now MessageTemplate[] automatically
```

**Estimated time**: 45 min
**Impact**: 66 errors fixed (12% of total)

---

#### 3. `src/lib/components/PrecisionEditor.svelte` (22 errors)

**Changes needed**:

```typescript
// 1. Define complete PrecisionType (in src/lib/types/exercises.ts)
export interface PrecisionType {
  type: 'none' | 'absolute' | 'relative';
  value?: number;
  digits?: number;
  mode?: string;
}

// 2. Add null checks in component
{#if precision?.digits !== undefined}
  <!-- Use precision.digits -->
{/if}

// Or provide defaults
const digits = precision?.digits ?? 2;
```

**Estimated time**: 20 min
**Impact**: 22 errors fixed (4% of total)

---

#### 4. SRS Deck Pages (3 files, 47 errors)

**Server file changes**:

```typescript
import type { SRSDeck, SRSCard } from '$lib/types/database';

const { data: decks } = await supabase
	.from('srs_decks')
	.select('*, cards:srs_cards(*)')
	.returns<(SRSDeck & { cards: SRSCard[] })[]>();
```

**Component changes**:

```typescript
// Types are inferred from PageData
let { data }: { data: PageData } = $props();
data.decks.forEach((deck) => {
	deck.cards.forEach((card) => {
		// All typed now!
	});
});
```

**Estimated time**: 45 min
**Impact**: 47 errors fixed (8% of total)

---

## Automated Fix Commands

### Find all files with unknown types:

```bash
grep -r "state<unknown" src/ | cut -d: -f1 | sort -u
```

### Find all untyped database queries:

```bash
grep -r ".from('.*').select" src/routes/ | grep -v "returns<"
```

### Count errors by file:

```bash
pnpm check 2>&1 | grep -B1 "Error:" | grep "^/" | awk -F: '{print $1}' | sort | uniq -c | sort -rn
```

---

## Testing Checklist

After each fix:

- [ ] `pnpm check` - Error count should decrease
- [ ] `pnpm lint` - Should pass (0 errors)
- [ ] `pnpm test:unit` - Should pass (99%+)
- [ ] Manual test - Load affected page in browser
- [ ] Git commit - Small, focused commit

---

## Progress Tracking

**Initial**: 575 errors
**After type exports fix**: 560 errors (-15)
**After Phase 1A** (users page): ~475 errors (-85)
**After Phase 1B** (messages): ~409 errors (-66)
**After Phase 1C** (SRS): ~362 errors (-47)
**After Phase 1D** (precision): ~340 errors (-22)
**After Phase 1E** (combat): ~313 errors (-27)

**Target**: 0 errors

---

## Common Database Types to Import

```typescript
// From src/lib/types/database.ts
import type {
	Profile, // User profiles
	Class, // Classes
	School, // Schools
	MessageTemplate, // Message templates
	Assessment, // Assessments
	Exercise, // Exercises
	QuestionTemplate, // Question templates
	SRSDeck, // SRS decks
	SRSCard, // SRS cards
	GameChallenge, // Game challenges
	GamePlayer, // Game players
	GameCombat // Combat sessions
} from '$lib/types/database';
```

---

## When in Doubt

1. **Check database schema**: `docs/architecture/database-schema.md`
2. **Look at similar files**: Find a working example
3. **Use Zod validation**: Better than type assertions
4. **Ask**: "What data am I actually receiving?"
5. **Test incrementally**: Fix one error, verify it works

---

**Good luck fixing!** 🚀
