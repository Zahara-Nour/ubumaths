# Question Syntax Audit Scripts

Tools to analyze question template syntax usage (old vs new format).

---

## 📋 Available Scripts

### 1. TypeScript Audit (Recommended)

**File**: `audit-question-syntax.ts`

**Features**:

- Detailed statistics
- Question samples by syntax type
- Actionable recommendations
- Color-coded output

**Usage**:

```bash
# Local database (requires Supabase running)
pnpm db:start
pnpm tsx scripts/audit-question-syntax.ts

# Production database (bypasses RLS with SERVICE_ROLE_KEY)
SUPABASE_URL="https://your-project.supabase.co" \
SUPABASE_ANON_KEY="<service-role-key>" \
pnpm tsx scripts/audit-question-syntax.ts
```

**Authentication**:

- **Local**: Uses default local anon key (automatic)
- **Production**: Requires `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS policies
- Script automatically tries SERVICE_ROLE_KEY first, then ANON_KEY
- If you get 0 results with production, check authentication

**Output Example**:

```
📊 SYNTAX STATISTICS
══════════════════════════════════════════

Total Questions:        485
├─ Old Syntax ({@:}):   12 (2.5%)
├─ New Syntax ({{}}):   472 (97.3%)
├─ Mixed Syntax:        1 (0.2%)
└─ No Variables:        0 (0.0%)

🎯 RECOMMENDATIONS
══════════════════════════════════════════

⚠️  Very few old syntax questions detected
📝 Consider manual migration for these questions
🔧 Review and convert using Admin UI
```

### 2. SQL Audit (Database Direct)

**File**: `audit-question-syntax.sql`

**Features**:

- Runs directly against database
- Comprehensive SQL analysis
- Syntax evolution over time
- Problematic pattern detection

**Usage via psql**:

```bash
# Local database
psql postgresql://postgres:postgres@127.0.0.1:54321/postgres \
  -f scripts/audit-question-syntax.sql

# Remote database (production)
psql $DATABASE_URL -f scripts/audit-question-syntax.sql
```

**Usage via Supabase Studio**:

1. Open Supabase Studio SQL Editor
2. Copy contents of `audit-question-syntax.sql`
3. Execute query
4. Review results

---

## 🎯 When to Run Audits

### Regular Schedule

- **Weekly**: During active migration period
- **Monthly**: After migration stabilizes
- **Before Major Releases**: Ensure syntax consistency

### Triggered Events

- ✅ After bulk question imports (e.g., TinyMath migration)
- ✅ Before removing syntax adapter
- ✅ When investigating syntax-related bugs
- ✅ After significant template updates

---

## 📊 Understanding Results

### Syntax Types

| Type             | Description                       | Action              |
| ---------------- | --------------------------------- | ------------------- |
| **Old Syntax**   | Uses `{@:var}`, `{#:random}`      | ⚠️ Needs migration  |
| **New Syntax**   | Uses `{{var}}`, `{{random:spec}}` | ✅ Modern format    |
| **Mixed Syntax** | Both in same template             | 🔧 Requires cleanup |
| **No Variables** | Static questions                  | ℹ️ No action needed |

### Recommendations

**0% Old Syntax**:

```
✅ All questions use new Markdown syntax!
✅ Safe to remove syntax adapter (syntax-adapter.ts)
✅ Can simplify codebase by removing conversion calls
```

→ **Action**: Plan Phase 3 migration (remove adapter)

**< 10 Old Syntax Questions**:

```
⚠️  Very few old syntax questions detected
📝 Consider manual migration for these questions
🔧 Review and convert using Admin UI
```

→ **Action**: Manual conversion via Admin UI

**10-50 Old Syntax Questions**:

```
⚠️  Moderate old syntax usage detected
🔄 Batch migration script recommended
📋 Review migration plan
```

→ **Action**: Create batch migration script

**> 50 Old Syntax Questions**:

```
⚠️  Significant old syntax usage detected
🐌 Gradual migration strategy recommended
📖 Continue using dual-syntax support
```

→ **Action**: Maintain current dual-syntax approach

### Mixed Syntax (Attention Required)

```
⚠️  3 questions use MIXED syntax (requires attention)
🔧 Review mixed syntax questions and standardize
```

Mixed syntax questions need manual review because:

- Inconsistent within same template
- May cause confusion for editors
- Harder to maintain long-term

**Fix**: Edit each question and standardize to new syntax

---

## 🔧 Troubleshooting

### "fetch failed" Error

**Cause**: Database not accessible

**Solutions**:

```bash
# Start local Supabase
pnpm db:start

# Or use remote database
export DATABASE_URL="postgresql://..."
pnpm tsx scripts/audit-question-syntax.ts
```

### "No question templates found"

**Causes**:

1. Database is empty
2. Wrong database URL
3. Connection permissions

**Solutions**:

1. Verify database has data: `SELECT COUNT(*) FROM question_templates;`
2. Check `SUPABASE_URL` environment variable
3. Verify Supabase local is running: `docker ps | grep supabase`

### "Cannot find module"

**Cause**: TypeScript compilation issue

**Solution**:

```bash
# Regenerate types
pnpm db:types

# Clean and rebuild
pnpm check
```

---

## 📈 Migration Workflow

### Phase 1: Initial Audit (✅ Complete)

```bash
# Run audit to establish baseline
pnpm tsx scripts/audit-question-syntax.ts
```

**Document**:

- Total questions by syntax
- Migration target count
- Estimated effort

### Phase 2: Gradual Migration (🔄 Current)

**For New Questions**:

- Admin UI automatically uses new syntax
- No action needed

**For Old Questions Being Edited**:

1. Open question in Admin UI
2. System converts automatically
3. Review and save

**Tracking**:

```bash
# Weekly audit to track progress
pnpm tsx scripts/audit-question-syntax.ts > audit-$(date +%Y-%m-%d).txt
```

### Phase 3: Batch Migration (⏳ Future)

**When**: < 50 old syntax questions remain

**Script** (to be created):

```typescript
// scripts/migrate-old-syntax.ts
import { convertToMarkdownSyntax } from '@/lib/questions/generator/syntax-adapter';

// Batch convert old syntax questions
```

**Steps**:

1. Backup database
2. Run migration script
3. Verify all questions work
4. Run audit to confirm 100% new syntax

### Phase 4: Cleanup (⏳ Future)

**When**: 0 old syntax questions

**Actions**:

1. Remove `syntax-adapter.ts` (-301 lines)
2. Remove conversion calls in resolvers
3. Update tests (remove old syntax tests)
4. Update documentation

**Verification**:

```bash
# Confirm no old syntax remains
grep -r "{@:" src/lib/questions/ --exclude="*.test.ts"
grep -r "{#:" src/lib/questions/ --exclude="*.test.ts"
```

---

## 📚 Related Documentation

- **Migration Strategy**: `docs/claude/syntax-migration-strategy.md`
- **Syntax Adapter Code**: `src/lib/questions/generator/syntax-adapter.ts`
- **Old Syntax Tests**: `src/lib/questions/generator/instance-generator.test.ts`
- **New Syntax Tests**: `src/lib/questions/generator/instance-generator-markdown.test.ts`

---

## 🎯 Quick Reference

```bash
# Run full audit (requires DB)
pnpm tsx scripts/audit-question-syntax.ts

# Check for old syntax in codebase
grep -r "{@:" src/lib/questions/ --exclude="*.test.ts"
grep -r "{#:" src/lib/questions/ --exclude="*.test.ts"

# Count questions by type
psql $DATABASE_URL -c "SELECT COUNT(*) FROM question_templates WHERE status='published';"

# Start local database
pnpm db:start

# Stop local database
pnpm db:stop
```

---

**For questions or issues**: See main documentation or contact the development team.
