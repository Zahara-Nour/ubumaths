# Daily Summaries & Weekly Rewards Migration Guide

**Audience**: DevOps and Developers
**Status**: Production deployment guide
**Last Updated**: 2025-11-13

---

## Overview

This guide provides step-by-step instructions for deploying the Daily Summaries and Weekly Rewards system to production. The system consists of database migrations, API endpoints, Vercel cron configuration, and admin UI components.

### What You're Deploying

- **6 database migrations**: Schema changes for summaries, rewards, and history tables
- **2 API endpoints**: Cron endpoint and admin configuration endpoint
- **Vercel cron job**: Scheduled daily execution at 01:00 UTC
- **Admin UI**: School configuration modal for timezone and week setup
- **130 unit tests**: Comprehensive test coverage for all functionality

### Prerequisites

Before starting, ensure you have:

- [ ] Supabase project access (admin role)
- [ ] Vercel project access (admin role)
- [ ] Local development environment set up
- [ ] `pnpm` installed (v8+)
- [ ] Supabase CLI installed (`supabase --version`)
- [ ] Vercel CLI installed (`vercel --version`)
- [ ] Access to generate and set environment variables

---

## Pre-Deployment Checklist

### 1. Review Current System State

```bash
# Check current database schema
pnpm db:start
psql -h localhost -p 54321 -U postgres -d postgres -c "\dt public.*"

# Check for existing migrations
ls -la supabase/migrations/ | grep -E "(summary|reward|history|timezone|week)"

# Run tests
pnpm test:unit -- summaries
```

### 2. Backup Database

**Critical**: Always backup production database before migrations

```bash
# Using Supabase CLI
supabase db dump -f backup-$(date +%Y%m%d).sql

# Or using Supabase Dashboard:
# Settings → Database → Backups → Create backup
```

### 3. Review Migration Files

Verify these 6 migrations exist:

```bash
ls -1 supabase/migrations/ | grep -E "(20251113|gidouilles|bonus|week_config)"
```

Expected files:

1. `20251113134603_add_week_config_and_timezone_to_schools.sql`
2. `20251113140344_create_gidouilles_history_table.sql`
3. `20251113140345_create_bonus_history_table.sql`
4. `20251113140346_create_vip_cards_activity_table.sql` (may already exist)
5. `20251113140348_create_daily_summaries_table.sql`
6. `20251113140349_create_weekly_rewards_table.sql`

---

## Step 1: Apply Database Migrations

### Local Testing (Recommended First)

```bash
# Start local Supabase
pnpm db:start

# Apply migrations locally
pnpm db:migrate

# Verify migrations applied
psql -h localhost -p 54321 -U postgres -d postgres -c "
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('daily_summaries', 'weekly_rewards', 'gidouilles_history', 'bonus_history')
  ORDER BY table_name;
"

# Expected output:
#     table_name
# -------------------
#  bonus_history
#  daily_summaries
#  gidouilles_history
#  weekly_rewards
```

### Production Deployment

```bash
# Push migrations to production Supabase
pnpm db:migrate

# Or use Supabase Dashboard:
# Database → Migrations → Upload migration files → Apply
```

### Verify Migration Success

```sql
-- Check tables created
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('daily_summaries', 'weekly_rewards', 'gidouilles_history', 'bonus_history')
ORDER BY table_name;

-- Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename IN ('daily_summaries', 'weekly_rewards')
ORDER BY tablename, policyname;

-- Check RPC functions
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('compute_daily_summary', 'award_weekly_reward', 'process_weekly_rewards')
ORDER BY routine_name;

-- Check indexes
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('daily_summaries', 'weekly_rewards', 'gidouilles_history', 'bonus_history')
ORDER BY tablename, indexname;
```

### Rollback Procedure (If Needed)

```bash
# Create rollback migration
cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_rollback_summaries.sql << 'EOF'
-- Rollback daily summaries system

-- Drop tables (cascade to remove foreign keys)
DROP TABLE IF EXISTS public.weekly_rewards CASCADE;
DROP TABLE IF EXISTS public.daily_summaries CASCADE;
DROP TABLE IF EXISTS public.bonus_history CASCADE;
DROP TABLE IF EXISTS public.gidouilles_history CASCADE;

-- Drop RPC functions
DROP FUNCTION IF EXISTS public.compute_daily_summary CASCADE;
DROP FUNCTION IF EXISTS public.award_weekly_reward CASCADE;
DROP FUNCTION IF EXISTS public.process_weekly_rewards CASCADE;

-- Remove week_config from schools.timetable
UPDATE public.schools
SET timetable = timetable - 'week_config'
WHERE timetable IS NOT NULL AND timetable ? 'week_config';

-- Remove timezone column (if added by migration)
-- ALTER TABLE public.schools DROP COLUMN IF EXISTS timezone;
EOF

# Apply rollback
pnpm db:migrate
```

---

## Step 2: Update Database Types

### Generate Types

```bash
# Generate TypeScript types from database schema
pnpm run db:types

# Or manually:
supabase gen types typescript --local > src/lib/types/database.ts
```

### Verify Types Updated

```typescript
// src/lib/types/database.ts should now include:

export interface Database {
	public: {
		Tables: {
			daily_summaries: {
				Row: {
					id: string;
					student_id: string;
					class_id: string;
					summary_date: string;
					gidouilles_gained: number;
					gidouilles_lost: number;
					bonus_gained: number;
					bonus_used: number;
					warnings_issued: number;
					warnings_removed: number;
					vip_cards_gained: number;
					vip_cards_used: number;
					sent_at: string | null;
					created_at: string;
					updated_at: string;
				};
				// ...
			};
			weekly_rewards: {
				Row: {
					id: string;
					student_id: string;
					class_id: string;
					week_start: string;
					week_end: string;
					gidouilles_awarded: number;
					reason: string;
					created_at: string;
				};
				// ...
			};
			// ...
		};
	};
}
```

### Commit Type Changes

```bash
git add src/lib/types/database.ts
git commit -m "chore(types): update database types for daily summaries system"
```

---

## Step 3: Configure Environment Variables

### Generate CRON_SECRET

```bash
# Generate secure random secret (32 bytes = 64 hex chars)
openssl rand -hex 32

# Example output:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### Set in Vercel

**Method 1: Vercel Dashboard**

1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add new variable:
   - **Name**: `CRON_SECRET`
   - **Value**: (paste generated secret)
   - **Environments**: Production, Preview, Development
4. Save

**Method 2: Vercel CLI**

```bash
# Set for all environments
vercel env add CRON_SECRET production
vercel env add CRON_SECRET preview
vercel env add CRON_SECRET development

# Or use single command (interactive)
vercel env add CRON_SECRET
```

### Set Locally (for testing)

```bash
# Add to .env.local
echo "CRON_SECRET=your-generated-secret" >> .env.local

# Verify
grep CRON_SECRET .env.local
```

### Verify Other Required Variables

```bash
# Check all required environment variables are set
vercel env ls

# Expected variables:
# - PUBLIC_SUPABASE_URL
# - PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - CRON_SECRET (newly added)
```

---

## Step 4: Deploy API Endpoints

### Build and Test Locally

```bash
# Install dependencies
pnpm install

# Run type checking
pnpm check:fast

# Run linting
pnpm lint

# Run unit tests
pnpm test:unit -- summaries

# Build for production
pnpm build

# Verify no errors
echo $?  # Should output: 0
```

### Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Or push to main branch (if auto-deploy enabled)
git push origin main
```

### Verify Deployment

```bash
# Check deployment status
vercel ls

# Get deployment URL
vercel inspect <deployment-url>

# Test cron endpoint (manual trigger)
curl -X POST https://your-domain.com/api/cron/daily-summaries-and-rewards \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"

# Expected response (200 OK):
# {
#   "success": true,
#   "timestamp": "2025-11-13T10:30:00.000Z",
#   "classesProcessed": 0,
#   "dailySummaries": { "generated": 0, "classesProcessed": 0 },
#   "weeklyRewards": { "awarded": 0, "classesProcessed": 0 }
# }
```

---

## Step 5: Configure Vercel Cron

### Update vercel.json

Verify cron configuration exists:

```json
{
	"crons": [
		{
			"path": "/api/cron/daily-summaries-and-rewards",
			"schedule": "0 1 * * *"
		}
	]
}
```

**Schedule Format**: [Cron syntax](https://crontab.guru/)

- `0 1 * * *` = Every day at 01:00 AM UTC
- `0 */6 * * *` = Every 6 hours (for testing)
- `*/5 * * * *` = Every 5 minutes (for debugging)

### Deploy Cron Configuration

```bash
# Commit vercel.json if modified
git add vercel.json
git commit -m "chore(cron): configure daily summaries cron job"

# Deploy
vercel --prod
```

### Verify Cron Active

**Method 1: Vercel Dashboard**

1. Go to Vercel Dashboard → Your Project
2. Settings → Crons
3. Verify `daily-summaries-and-rewards` is listed
4. Check status: "Active"

**Method 2: Vercel CLI**

```bash
vercel cron ls

# Expected output:
# path                                       schedule
# /api/cron/daily-summaries-and-rewards      0 1 * * *
```

### Manual Trigger (Test)

**Vercel Dashboard**:

1. Settings → Crons
2. Find `daily-summaries-and-rewards`
3. Click "Run now"
4. Monitor logs

**curl**:

```bash
curl -X POST https://your-domain.com/api/cron/daily-summaries-and-rewards \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Step 6: Configure School Timezones

### Admin UI Method (Recommended)

1. Log in as admin
2. Navigate to Admin Dashboard
3. Go to Schools section
4. For each school:
   - Click "Configure"
   - Select timezone from dropdown
   - Choose week configuration preset (Western/Israeli/Middle East)
   - Save

### API Method (Programmatic)

```bash
# Get school ID
SCHOOL_ID="your-school-uuid"

# Get current configuration
curl -X GET "https://your-domain.com/api/admin/schools/${SCHOOL_ID}/config" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Cookie: supabase-auth-token=..."

# Update configuration
curl -X PUT "https://your-domain.com/api/admin/schools/${SCHOOL_ID}/config" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Cookie: supabase-auth-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "timezone": "Europe/Paris",
    "week_config": {
      "first_day": 1,
      "last_day": 0,
      "school_days": [1, 2, 3, 4, 5],
      "weekend_days": [6, 0]
    }
  }'
```

### Database Method (Direct SQL)

```sql
-- Update school timezone
UPDATE public.schools
SET timezone = 'Europe/Paris'
WHERE id = 'your-school-uuid';

-- Update week configuration
UPDATE public.schools
SET timetable = jsonb_set(
  COALESCE(timetable, '{"periods": []}'::jsonb),
  '{week_config}',
  '{
    "first_day": 1,
    "last_day": 0,
    "school_days": [1, 2, 3, 4, 5],
    "weekend_days": [6, 0]
  }'::jsonb
)
WHERE id = 'your-school-uuid';

-- Verify
SELECT
  id,
  name,
  timezone,
  timetable->'week_config' as week_config
FROM public.schools
WHERE id = 'your-school-uuid';
```

### Verify Configuration

```sql
-- Check all schools have timezone and week_config
SELECT
  s.id,
  s.name,
  s.timezone,
  CASE
    WHEN s.timetable IS NULL THEN 'MISSING'
    WHEN s.timetable->'week_config' IS NULL THEN 'MISSING'
    ELSE 'OK'
  END as week_config_status
FROM public.schools s
ORDER BY s.name;

-- Should show 'OK' for all schools
```

---

## Step 7: Test Manual Trigger

### Test with curl

```bash
# Set variables
DOMAIN="your-domain.com"
CRON_SECRET="your-cron-secret"

# Trigger cron job
curl -v -X POST "https://${DOMAIN}/api/cron/daily-summaries-and-rewards" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json"

# Save response
curl -X POST "https://${DOMAIN}/api/cron/daily-summaries-and-rewards" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  > cron-response.json

# Check response
cat cron-response.json | jq .
```

### Expected Responses

**Success (no classes)**:

```json
{
	"success": true,
	"timestamp": "2025-11-13T10:30:00.000Z",
	"classesProcessed": 0,
	"dailySummaries": {
		"generated": 0,
		"classesProcessed": 0
	},
	"weeklyRewards": {
		"awarded": 0,
		"classesProcessed": 0
	}
}
```

**Success (with classes)**:

```json
{
	"success": true,
	"timestamp": "2025-11-13T10:30:00.000Z",
	"classesProcessed": 45,
	"dailySummaries": {
		"generated": 320,
		"classesProcessed": 38
	},
	"weeklyRewards": {
		"awarded": 85,
		"classesProcessed": 45
	}
}
```

**Partial Failure**:

```json
{
	"success": false,
	"timestamp": "2025-11-13T10:30:00.000Z",
	"classesProcessed": 45,
	"dailySummaries": {
		"generated": 310,
		"classesProcessed": 37,
		"errors": ["Class a1b2c3d4-...: Database connection timeout"]
	},
	"weeklyRewards": {
		"awarded": 82,
		"classesProcessed": 44,
		"errors": []
	}
}
```

### Verify in Database

```sql
-- Check daily_summaries created
SELECT
  DATE(summary_date) as date,
  COUNT(*) as summaries_created,
  COUNT(sent_at) as notifications_sent
FROM public.daily_summaries
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY DATE(summary_date)
ORDER BY date DESC;

-- Check weekly_rewards created
SELECT
  week_start,
  week_end,
  COUNT(*) as rewards_awarded,
  SUM(gidouilles_awarded) as total_gidouilles
FROM public.weekly_rewards
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY week_start, week_end
ORDER BY week_start DESC;

-- Check notifications created
SELECT
  user_id,
  title,
  message,
  priority,
  created_at
FROM public.notifications
WHERE created_at >= NOW() - INTERVAL '1 hour'
AND title LIKE '%Résumé%' OR title LIKE '%Récompense%'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Step 8: Monitor First Automated Run

### Set Reminder

The cron will run at **01:00 AM UTC** the next day. Set a reminder to check logs around that time.

**Convert to your local time**:

- Europe/Paris: 02:00 or 03:00 (depending on DST)
- Asia/Jerusalem: 03:00 or 04:00 (depending on DST)
- America/New_York: 20:00 previous day or 21:00 (depending on DST)

### Monitor Vercel Logs

```bash
# Watch logs in real-time
vercel logs --follow

# Filter for cron endpoint
vercel logs --follow | grep "daily-summaries-and-rewards"

# Or use Vercel Dashboard:
# Logs tab → Filter by path: /api/cron/daily-summaries-and-rewards
```

### Check Job Runs Table

```sql
-- Check latest job runs
SELECT
  job_name,
  started_at,
  completed_at,
  status,
  metadata,
  error_message
FROM public.job_runs
WHERE job_name = 'daily_summaries_and_rewards'
ORDER BY started_at DESC
LIMIT 10;

-- Expected status: 'success' or 'partial_failure'
```

### Verify Results

```sql
-- Check summaries created today
SELECT
  DATE(summary_date) as date,
  COUNT(*) as summaries,
  COUNT(sent_at) as notifications
FROM public.daily_summaries
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY DATE(summary_date);

-- Check rewards created today (if today is last day of week)
SELECT
  COUNT(*) as rewards_awarded,
  SUM(gidouilles_awarded) as total_gidouilles
FROM public.weekly_rewards
WHERE DATE(created_at) = CURRENT_DATE;

-- Check student notifications
SELECT
  n.title,
  COUNT(*) as notification_count
FROM public.notifications n
WHERE DATE(n.created_at) = CURRENT_DATE
AND (n.title LIKE '%Résumé%' OR n.title LIKE '%Récompense%')
GROUP BY n.title;
```

---

## Troubleshooting

### Issue: Migrations Fail

**Error**: `relation "daily_summaries" already exists`

**Solution**:

```sql
-- Check if table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'daily_summaries';

-- If exists, drop and re-apply migration
DROP TABLE IF EXISTS public.daily_summaries CASCADE;

-- Re-run migration
pnpm db:migrate
```

### Issue: CRON_SECRET Not Set

**Error**: `401 Unauthorized: Invalid or missing cron token`

**Solution**:

```bash
# Verify environment variable
vercel env ls | grep CRON_SECRET

# If missing, add it
vercel env add CRON_SECRET

# Re-deploy
vercel --prod
```

### Issue: No Summaries Generated

**Symptoms**: Cron runs successfully but creates 0 summaries

**Check**:

```sql
-- 1. Are there active classes?
SELECT COUNT(*) FROM public.classes WHERE status = 'active';

-- 2. Do classes have schedules?
SELECT
  c.id,
  c.name,
  COUNT(cs.id) as schedule_count
FROM public.classes c
LEFT JOIN public.class_schedules cs ON cs.class_id = c.id
WHERE c.status = 'active'
GROUP BY c.id, c.name
HAVING COUNT(cs.id) = 0;

-- 3. Do classes have students?
SELECT
  c.id,
  c.name,
  COUNT(cm.student_id) as student_count
FROM public.classes c
LEFT JOIN public.class_members cm ON cm.class_id = c.id AND cm.status = 'active'
WHERE c.status = 'active'
GROUP BY c.id, c.name
HAVING COUNT(cm.student_id) = 0;

-- 4. Did students have activity yesterday?
SELECT
  DATE(gh.created_at) as date,
  COUNT(*) as activity_count
FROM public.gidouilles_history gh
WHERE DATE(gh.created_at) = CURRENT_DATE - INTERVAL '1 day'
GROUP BY DATE(gh.created_at);
```

**Solution**: If any checks fail, configure missing data (schedules, students, or wait for activity)

### Issue: Incorrect Timezone Calculations

**Symptoms**: "Yesterday" seems wrong, summaries for wrong day

**Check**:

```sql
-- Verify school timezone
SELECT
  id,
  name,
  timezone
FROM public.schools;

-- Test timezone calculation (in local dev)
-- Run this in your TypeScript test environment:
import { getYesterdayInTimezone } from '$lib/server/summaries';
console.log('Paris:', getYesterdayInTimezone('Europe/Paris'));
console.log('Jerusalem:', getYesterdayInTimezone('Asia/Jerusalem'));
console.log('New York:', getYesterdayInTimezone('America/New_York'));
```

**Solution**: Update school timezone to correct IANA timezone

### Issue: Rewards Not Awarded

**Symptoms**: Cron runs but no weekly rewards created

**Check**:

```sql
-- 1. Is today the last day of the week?
SELECT
  s.id,
  s.name,
  s.timezone,
  s.timetable->'week_config'->'last_day' as last_day,
  EXTRACT(DOW FROM NOW() AT TIME ZONE s.timezone) as current_day
FROM public.schools s;

-- 2. Do students have warnings this week?
SELECT
  sw.student_id,
  COUNT(*) as warning_count
FROM public.student_warnings sw
WHERE sw.deleted_at IS NULL
AND DATE(sw.created_at) >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY sw.student_id
ORDER BY warning_count DESC;

-- 3. Have rewards already been awarded this week?
SELECT
  week_start,
  week_end,
  COUNT(*) as rewards_count
FROM public.weekly_rewards
WHERE week_start >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY week_start, week_end;
```

**Solution**: Adjust based on findings (not the right day, students have warnings, or rewards already awarded)

---

## Post-Deployment Checklist

### Immediate (Day 1)

- [ ] Manual trigger test completed successfully
- [ ] Database tables created and accessible
- [ ] RLS policies verified
- [ ] Environment variables set
- [ ] Vercel cron configured and active
- [ ] School timezones configured
- [ ] Week configurations set

### Short-term (Week 1)

- [ ] First automated run succeeded
- [ ] Daily summaries being generated
- [ ] Students receiving notifications
- [ ] Weekly rewards distributed (if last day of week occurred)
- [ ] No errors in Vercel logs
- [ ] Job runs table shows "success" status

### Long-term (Month 1)

- [ ] Success rate > 95%
- [ ] Average execution time < 2 minutes
- [ ] No database performance issues
- [ ] Teachers report system working correctly
- [ ] Students receiving timely notifications
- [ ] Error monitoring shows no critical issues

---

## Rollback Plan

If critical issues occur post-deployment:

### Emergency Rollback

```bash
# 1. Disable Vercel cron (immediate)
# Vercel Dashboard → Settings → Crons → Disable

# 2. Revert deployment (if needed)
vercel rollback <previous-deployment-url>

# 3. Apply database rollback migration (if needed)
# See "Rollback Procedure" in Step 1
```

### Partial Rollback

If only database issues:

```sql
-- Disable cron processing without full rollback
-- Add a feature flag or update cron code to return early
```

If only cron issues:

```bash
# Disable cron, keep database intact
# Vercel Dashboard → Settings → Crons → Disable
```

---

## Support and Resources

### Documentation

- [User Guide (French)](../features/daily-summaries-weekly-rewards.md)
- [Admin Guide (French)](./school-configuration.md)
- [API Documentation](../api/cron-endpoints.md)
- [Technical Architecture](../architecture/daily-summaries-system.md)

### Monitoring

- **Vercel Logs**: https://vercel.com/your-project/logs
- **Supabase Dashboard**: https://supabase.com/dashboard/project/your-project
- **Error Monitoring**: Admin Dashboard → Error Monitoring

### Contact

- **Technical Issues**: Contact development team
- **Database Issues**: Contact Supabase support
- **Deployment Issues**: Contact DevOps team

---

**Last Updated**: 2025-11-13
**Version**: 1.0.0
