# Phase 3 Migration - Quick Start Guide

## TL;DR - Run the Migration

```bash
# 1. Validate logic (optional)
pnpm tsx scripts/test-sanitize-migration.ts

# 2. Test in staging FIRST
# (Update .env to point to staging)
pnpm migrate:sanitize

# 3. Verify staging results
# (Check database, test UI)

# 4. Run in production
# (Update .env to point to production)
pnpm migrate:sanitize | tee migration-$(date +%Y%m%d-%H%M%S).log

# 5. Verify production results
# (Check database, test UI, monitor for issues)
```

## Required Environment Variables

Your `.env` file must contain:

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Critical**: Use service role key (not anon key) to bypass RLS policies.

## Expected Output

```
======================================================================
Starting Notification Sanitization Migration
======================================================================

Initializing Supabase client...
✓ Supabase client initialized

Counting active notifications...
✓ Found 1234 active notifications to process

Processing batch 1/13 (notifications 1-100)...
  ✓ Sanitized notification abc-123 (removed 45 bytes, 12%)

Progress: 100/1234 (8%)
  Modified: 23, Unchanged: 77, Errors: 0

======================================================================
Migration Complete
======================================================================

Total processed: 1234
Modified: 23
Unchanged: 1211
Errors: 0

Success rate: 100%
Modification rate: 2%
```

## What Happens

1. **Connects** to Supabase using service role key
2. **Fetches** all active notifications (WHERE deleted_at IS NULL)
3. **Sanitizes** each notification's message field
4. **Updates** database only if content changed
5. **Logs** all modifications with statistics

## Safety Features

- ✅ **Non-destructive**: Only updates changed content
- ✅ **Batch processing**: Handles large datasets efficiently
- ✅ **Error handling**: Continues processing if individual notifications fail
- ✅ **Detailed logging**: Audit trail of all modifications
- ✅ **Safe to re-run**: Can be executed multiple times without issues

## What Gets Sanitized

### Kept (Safe HTML)

- `<p>`, `<br>`, `<strong>`, `<em>`, `<ul>`, `<li>`, etc.

### Removed (Dangerous)

- `<script>`, `<iframe>`, `<form>`
- Event handlers (`onclick`, `onerror`, etc.)
- All attributes (including `href`, `style`, `class`)
- `javascript:` and `data:` URLs

## Quick Verification

After migration, check:

```sql
-- Sample modified notifications
SELECT id, message, created_at
FROM notifications
WHERE created_at < '2025-11-10'
ORDER BY created_at DESC
LIMIT 20;
```

Then test UI:

- View teacher dashboard notifications
- View student dashboard notifications
- Confirm formatting preserved, XSS removed

## Troubleshooting

| Problem               | Solution                                    |
| --------------------- | ------------------------------------------- |
| Missing env variables | Check `.env` has required keys              |
| Permission denied     | Use service role key (not anon key)         |
| Connection timeout    | Check network, verify Supabase is active    |
| High error rate       | Review logs, check specific notifications   |
| Broken formatting     | Review sanitization rules, adjust if needed |

## Files

- **Main script**: `scripts/sanitize-existing-notifications.ts`
- **Test script**: `scripts/test-sanitize-migration.ts`
- **Documentation**: `scripts/README-sanitize-notifications.md`
- **Summary**: `scripts/MIGRATION-PHASE3-SUMMARY.md`
- **Checklist**: `scripts/CHECKLIST-phase3-migration.md`

## Need Help?

1. Read `scripts/README-sanitize-notifications.md` (comprehensive guide)
2. Review `scripts/MIGRATION-PHASE3-SUMMARY.md` (technical details)
3. Use `scripts/CHECKLIST-phase3-migration.md` (step-by-step)

## Critical Reminders

- ⚠️ **Always test in staging first** (never run directly in production)
- ⚠️ **Use service role key** (not anon key)
- ⚠️ **Back up production database** before running (recommended)
- ⚠️ **Run during low-traffic period** (minimize impact)
- ⚠️ **Save logs for audit** (use `tee` to capture output)

---

**Status**: ✅ Production Ready
**Last Validated**: 2025-11-10
**Version**: 1.0.0
