# Claude Code Configuration

Instructions permanentes pour tous les agents Claude Code travaillant sur UbuMaths.

**Dernière mise à jour** : 2025-10-31
**Statut** : 🟢 Active

---

## 🎯 Mission & Standards

### Primary Objective
Développer UbuMaths en respectant les **4 règles critiques** :

1. **Input Validation** : ALL user input MUST be validated with Zod
2. **MySelect Component** : ALWAYS use MySelect for dropdowns (NEVER Shadcn Select or `<select>`)
3. **Svelte 5 Runes** : Use modern runes (`$state`, `$derived`, `$effect`, `$props`)
4. **TypeScript** : NEVER use `any` type (`@typescript-eslint/no-explicit-any` enforced)

### Quality Standards
- **0 errors** : Maintain 0 ESLint & TypeScript errors
- **Tests required** : All new code must have tests, 100% pass rate
- **Pre-commit hook** : Automatic lint-staged on `git commit`

---

## 📚 Documentation Structure

### Two-Level System

**Quick-start** : `/CLAUDE.md` (~300 lignes)
- Essential commands & critical rules
- Links to detailed docs

**Detailed docs** : `/docs/claude/` (~1,200 lignes)
- `README.md` - Index
- `architecture.md` - Structure, routing, performance
- `best-practices.md` - Svelte 5, TypeScript
- `ui-components.md` - Shadcn, MySelect, Tailwind
- `database.md` - Supabase, migrations
- `quality-standards.md` ⭐ - Tests, linting, Zod validation (MOST IMPORTANT)

### Documentation Workflow

**Before starting any task:**
1. Read `/CLAUDE.md` for quick-start
2. Read relevant sections in `/docs/claude/`
3. Check `/docs/features/` for feature-specific docs
4. Follow `/docs/contributing/documentation-guide.md`

**When creating documentation:**
- Follow structure defined in `/docs/contributing/documentation-guide.md`
- Use two-level system (quick-start vs detailed)
- NO duplication between files
- Include navigation links
- Keep CLAUDE.md under 300 lines

---

## 🛠️ Development Standards

### Tech Stack
- **Frontend** : Svelte 5 (runes), TypeScript (strict), Tailwind CSS 4, Shadcn-svelte
- **Backend** : SvelteKit, Supabase (PostgreSQL + Auth)
- **Tools** : pnpm, Vite, Vitest, Playwright, ESLint, Prettier

### Commands
```bash
pnpm dev -- --port 5175    # Claude port (ALWAYS use 5175)
pnpm check                 # Type checking
pnpm lint                  # ESLint (cached)
pnpm test:unit             # Unit tests
```

### Port Usage
- **5175** : Claude Code port ✅ ALWAYS USE
- **5173** : User port ❌ NEVER USE
- **54321** : Supabase local (Docker)

---

## 🔒 Critical Rules (NEVER VIOLATE)

### 1. Input Validation with Zod

**❌ NEVER:**
```typescript
const body = await request.json();
const { userId, amount } = body; // NO runtime validation!
```

**✅ ALWAYS:**
```typescript
import { z } from 'zod';

const schema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().positive().max(1000)
});

const validation = schema.safeParse(await request.json());
if (!validation.success) {
  throw error(400, validation.error.issues[0].message);
}
const { userId, amount } = validation.data; // Type-safe AND validated
```

**Location** : `src/lib/server/validation/`
**Complete guide** : `docs/claude/quality-standards.md#input-validation-with-zod`

---

### 2. MySelect Component

**✅ Use:**
```typescript
import MySelect from '$lib/components/MySelect.svelte';
```

**❌ NEVER use:**
- `import * as Select from '$lib/components/ui/select'` (Shadcn Select)
- Native `<select>` elements

**Why?** SSR-compatible, consistent API, Svelte 5 runes
**Complete guide** : `docs/claude/ui-components.md#myselect-component`

---

### 3. Svelte 5 Runes

**✅ DO:**
```svelte
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
  let { title } = $props();
</script>
```

**❌ DON'T:**
```svelte
<script>
  export let myProp;     // ❌ Use $props()
  $: computed = x * 2;   // ❌ Use $derived()
</script>
```

**Complete guide** : `docs/claude/best-practices.md#svelte-5-runes`

---

### 4. Never Use `any` Type

**❌ NEVER:**
```typescript
const data: any = fetchData();
function handleEvent(event: any) {}
```

**✅ ALWAYS:**
```typescript
import type { Database } from '$lib/types/database';
type User = Database['public']['Tables']['users']['Row'];

const data: User = fetchData();
function handleEvent(event: MouseEvent) {}
```

**Complete guide** : `docs/claude/best-practices.md#typescript-best-practices`

---

## 📋 Pre-Commit Checklist

Before committing code:

- [ ] All `request.json()` calls have Zod validation
- [ ] All query parameters are validated
- [ ] All numeric inputs have bounds (`.min()`, `.max()`, `.finite()`)
- [ ] All arrays have size limits (`.max()`)
- [ ] All UUIDs validated (`.uuid()`)
- [ ] Tests exist and pass (`pnpm test:unit`)
- [ ] No `any` types used
- [ ] Using MySelect (not Shadcn Select or `<select>`)
- [ ] Svelte 5 runes (not Svelte 4 patterns)
- [ ] Lint passes (`pnpm lint`)

---

## 🗃️ Database (Supabase)

### Migration Workflow

1. **Claude creates** `.sql` in `supabase/migrations/` (format: `<timestamp>_<description>.sql`)
2. **User pushes** via `pnpm db:migrate`
3. **Update** `src/lib/types/database.ts` and `docs/architecture/database-schema.md`

**Important:**
- NEVER modify schema in Supabase Dashboard
- ALWAYS create timestamped migrations
- Keep documentation synchronized

**Complete guide** : `docs/claude/database.md`

---

## 🧪 Testing Standards

### Requirements
- **All new code** must have tests
- **100% pass rate** required
- **Test types** : Unit (Vitest), E2E (Playwright), Database triggers (Docker)

### Commands
```bash
pnpm test:unit             # Run unit tests
pnpm test:triggers         # Run database trigger tests (Docker)
```

**Complete guide** : `docs/claude/quality-standards.md#testing`

---

## 🚀 Performance Patterns

### Optimistic UI + Debouncing

```typescript
let optimistic = $state<Record<string, number>>({});
let debounceTimer: ReturnType<typeof setTimeout>;

function handleUpdate(id: string, delta: number) {
  // 1. Optimistic update (instant UI)
  optimistic[id] = (optimistic[id] || 0) + delta;

  // 2. Debounce server update (batch changes)
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    await updateServer(id, optimistic[id]);
    optimistic[id] = 0;
  }, 500);
}
```

**Complete guide** : `docs/claude/architecture.md#performance-patterns`

---

## 📖 Documentation for Agents

### documentation-writer agent

**When creating/updating docs:**
1. Read `/docs/contributing/documentation-guide.md` FIRST
2. Follow two-level system (quick-start vs detailed)
3. Update both levels if necessary
4. NO duplication between files
5. Include navigation links
6. Keep CLAUDE.md under 300 lines

**Structure to respect:**
```
CLAUDE.md                  # Quick-start (~300 lignes)
docs/claude/               # Detailed docs (~1,200 lignes)
  ├── README.md
  ├── architecture.md
  ├── best-practices.md
  ├── ui-components.md
  ├── database.md
  └── quality-standards.md
```

### Other agents

**All agents must:**
- Read this file (`.claude/config.md`) at start
- Follow the 4 critical rules
- Check relevant docs in `/docs/claude/`
- Respect quality standards (0 errors, tests required)
- Use pre-commit checklist

---

## 🔗 Quick Links

- **Quick-start** : [/CLAUDE.md](../CLAUDE.md)
- **Detailed docs** : [/docs/claude/](../docs/claude/README.md)
- **Quality standards** : [/docs/claude/quality-standards.md](../docs/claude/quality-standards.md) ⭐⭐⭐
- **Documentation guide** : [/docs/contributing/documentation-guide.md](../docs/contributing/documentation-guide.md)
- **Master index** : [/docs/README.md](../docs/README.md)

---

## ⚠️ Common Mistakes to Avoid

### For ALL agents

❌ **DON'T:**
- Create new files in `docs/claude/` without justification
- Duplicate information between `CLAUDE.md` and `docs/claude/`
- Put implementation details in `CLAUDE.md` (keep it under 300 lines)
- Use `any` type in TypeScript
- Use Shadcn Select or native `<select>` (use MySelect)
- Use Svelte 4 patterns (use Svelte 5 runes)
- Skip Zod validation for user input
- Create session summaries at project root (use `docs/archive/`)

✅ **DO:**
- Read documentation BEFORE starting
- Follow two-level system (quick-start vs detailed)
- Respect the 4 critical rules
- Maintain 0 errors
- Write tests for new code
- Use pre-commit checklist

---

**This configuration is mandatory for all Claude Code agents working on UbuMaths.**

**Last updated** : 2025-10-31
**Maintained by** : UbuMaths team
