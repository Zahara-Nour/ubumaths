# Notification Sanitization Migration

## Overview

This migration script sanitizes all existing notifications in the database that were created **before** server-side HTML sanitization was implemented (Phase 1).

**Script**: `scripts/sanitize-existing-notifications.ts`
**Command**: `pnpm migrate:sanitize`

## Why This Migration Is Needed

### The Problem

Before Phase 1 (server-side sanitization), notifications were stored in the database without any HTML sanitization. This means:

- User-submitted HTML could contain XSS attack vectors (`<script>` tags, event handlers, etc.)
- Malicious actors could have injected dangerous content
- Existing notifications pose a **stored XSS vulnerability**

### The Solution

This migration:

1. Fetches all active notifications from the database
2. Runs each notification's `message` field through `sanitizeNotificationHtml()`
3. Updates the database only if the content changed
4. Logs all modifications for audit purposes

## Prerequisites

### Required Environment Variables

The script requires these environment variables in your `.env` file:

```bash
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important**: The service role key is required because the script needs to bypass Row Level Security (RLS) policies to update all notifications in bulk.

### Development Environment

- Node.js (18+)
- TypeScript/TSX
- Access to Supabase project (staging or production)

## Usage

### Run the Migration

```bash
pnpm migrate:sanitize
```

### Expected Output

```
======================================================================
Starting Notification Sanitization Migration
======================================================================

Timestamp: 2025-11-10T10:30:00.000Z
Batch size: 100
Progress logging interval: every 50 notifications

Initializing Supabase client...
✓ Supabase client initialized

Counting active notifications...
✓ Found 1234 active notifications to process

Starting sanitization...

Processing batch 1/13 (notifications 1-100)...
  ✓ Sanitized notification abc-123 (removed 45 bytes, 12%)
  ✓ Sanitized notification def-456 (removed 23 bytes, 5%)

Progress: 100/1234 (8%)
  Modified: 23, Unchanged: 77, Errors: 0

Processing batch 2/13 (notifications 101-200)...
...

======================================================================
Migration Complete
======================================================================

Total processed: 1234
Modified: 23
Unchanged: 1211
Errors: 0

Duration: 5.43s (5430ms)

Success rate: 100%
Modification rate: 2%

Next steps:
1. Review modified notifications in the database
2. Verify that sanitization preserved intended content
3. If satisfied, this migration is complete

======================================================================
```

## Safety Features

### 1. Non-Destructive Updates

The script only updates notifications where the sanitized content differs from the original. If a notification is already safe, it's left untouched.

### 2. Detailed Logging

Every modification is logged with:

- Notification ID
- Number of bytes removed
- Percentage of content removed

### 3. Error Handling

If an individual notification fails to process:

- The error is logged
- The script continues with the next notification
- Failed notifications are counted separately

### 4. Soft-Delete Exclusion

The script only processes active notifications (where `deleted_at IS NULL`). Soft-deleted notifications are ignored.

### 5. Batch Processing

Notifications are processed in batches of 100 to:

- Prevent memory issues with large datasets
- Allow progress monitoring
- Enable graceful interruption if needed

## Testing Strategy

### Test in Staging First

**ALWAYS** test the migration in a staging environment before running in production:

```bash
# 1. Point .env to staging Supabase project
PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=staging-service-role-key

# 2. Run migration
pnpm migrate:sanitize

# 3. Verify results in staging database
```

### Manual Verification

After running the migration:

1. **Check modified notifications**:

   ```sql
   SELECT id, message, created_at
   FROM notifications
   WHERE created_at < '2025-11-10'  -- Before sanitization implementation
   ORDER BY created_at DESC
   LIMIT 50;
   ```

2. **Verify content integrity**:
   - Ensure legitimate HTML formatting is preserved (`<strong>`, `<em>`, etc.)
   - Confirm dangerous tags are removed (`<script>`, `<iframe>`, etc.)
   - Check that text content is intact

3. **Test rendering**:
   - View notifications in the UI
   - Verify they display correctly
   - Confirm no XSS vulnerabilities remain

## What Gets Sanitized?

### Allowed Tags (Preserved)

These safe HTML tags are kept:

- `<p>`, `<br>` - Paragraphs and line breaks
- `<strong>`, `<b>`, `<em>`, `<i>`, `<u>` - Text formatting
- `<mark>` - Highlighting
- `<ul>`, `<ol>`, `<li>` - Lists
- `<blockquote>` - Quotes
- `<hr>` - Horizontal rules

### Removed Elements

These dangerous elements are stripped:

- `<script>` - JavaScript execution
- `<iframe>` - Embedding external content
- `<form>`, `<input>` - Form inputs (phishing vectors)
- `<link>`, `<style>` - CSS injection
- Event handlers (`onclick`, `onerror`, etc.)
- All attributes (including `href`, `style`, `class`)
- `javascript:` and `data:` URLs

### Examples

**Before sanitization**:

```html
<p onclick="malicious()">Click me</p>
<script>
	alert('xss');
</script>
```

**After sanitization**:

```html
<p>Click me</p>
```

**Before sanitization**:

```html
<p><strong>Important:</strong> Please <em>review</em> your homework.</p>
```

**After sanitization** (unchanged):

```html
<p><strong>Important:</strong> Please <em>review</em> your homework.</p>
```

## Performance Considerations

### Expected Performance

- **Small datasets** (< 1,000 notifications): < 5 seconds
- **Medium datasets** (1,000-10,000): 30-60 seconds
- **Large datasets** (10,000+): 1-5 minutes

### Optimization Tips

1. **Run during low-traffic periods** to minimize database load
2. **Monitor database CPU/memory** during execution
3. **Consider increasing batch size** for very large datasets (edit `BATCH_SIZE` constant)
4. **Run in parallel** if you have multiple isolated tenants

## Troubleshooting

### Missing Environment Variables

**Error**: `Missing required environment variables`

**Solution**:

```bash
# Verify .env file exists and contains:
PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# Test loading environment:
node -e "require('dotenv').config(); console.log(process.env.PUBLIC_SUPABASE_URL)"
```

### Connection Timeout

**Error**: `Failed to fetch notifications batch: timeout`

**Solution**:

- Check network connectivity to Supabase
- Verify Supabase project is active
- Reduce `BATCH_SIZE` to process smaller chunks

### Permission Denied

**Error**: `Failed to update notification: permission denied`

**Solution**:

- Verify you're using the **service role key** (not anon key)
- Check key is correct in `.env` file
- Confirm key has full database access

### High Error Rate

**Symptom**: Many notifications fail to process

**Solution**:

1. Review error logs for patterns
2. Check if specific notification IDs are problematic
3. Manually inspect failing notifications in database
4. Consider excluding problematic notifications and fixing manually

## Post-Migration Checklist

After running the migration successfully:

- [ ] Review sample of modified notifications in database
- [ ] Test notification rendering in UI (teacher and student views)
- [ ] Verify no XSS vulnerabilities remain (manual security test)
- [ ] Document number of notifications modified (for audit log)
- [ ] Update security documentation to reflect completed migration
- [ ] Archive migration script output logs
- [ ] Consider this migration complete (one-time operation)

## Rollback Plan

If the migration causes issues:

### Option 1: Database Backup Restore

If you backed up before migration:

```bash
# Restore from backup (Supabase CLI)
supabase db restore backup_name
```

### Option 2: Selective Rollback

If only specific notifications are problematic:

```sql
-- Manually revert specific notifications
UPDATE notifications
SET message = 'original_content'
WHERE id = 'problematic_notification_id';
```

### Option 3: Re-run Phase 1

Server-side sanitization (Phase 1) is still active, so:

- New notifications are always sanitized
- Re-saving existing notifications will sanitize them
- Migration can be safely re-run if needed

## Security Notes

### Service Role Key Security

**CRITICAL**: The service role key has **full database access**, bypassing all RLS policies.

**Best Practices**:

- Never commit service role key to git
- Store in `.env` file (gitignored)
- Rotate key immediately if exposed
- Use staging key for testing, production key only for production migration
- Revoke temporary access after migration if key was shared

### Audit Logging

The script logs all modifications, creating an audit trail:

- Notification ID
- Bytes removed
- Timestamp of sanitization

**Recommendation**: Save script output for security audit records:

```bash
pnpm migrate:sanitize | tee migration-$(date +%Y%m%d-%H%M%S).log
```

## Support

### Questions or Issues?

1. Review this documentation thoroughly
2. Check script comments for implementation details
3. Test in staging environment first
4. Contact security team for production approval

### Related Documentation

- **Phase 1**: Server-side sanitization implementation
- **Phase 2**: Client-side integration (Tiptap editor)
- **Security Guidelines**: `docs/security/xss-prevention.md`

## Script Metadata

- **Author**: Claude Code
- **Created**: 2025-11-10
- **Version**: 1.0.0
- **Status**: Production-ready
- **Type**: One-time migration (safe to re-run)
