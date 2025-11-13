# Cron Endpoints API Documentation

**Audience**: Developers and DevOps
**Last Updated**: 2025-11-13

---

## Overview

This document describes the cron endpoints used by UbuMaths for scheduled automated tasks. Currently, there is one primary cron endpoint for daily summaries and weekly rewards processing.

---

## `/api/cron/daily-summaries-and-rewards`

### Purpose

Processes daily summaries and weekly rewards for all active classes:

1. **Daily Summaries**: Generates activity summaries for students in classes that had lessons yesterday
2. **Weekly Rewards**: Awards 1 gidouille to students with zero warnings on the last day of the school week

### Schedule

- **Frequency**: Daily
- **Time**: 01:00 AM UTC (via Vercel Cron)
- **Configuration**: `vercel.json` cron schedule

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

### HTTP Methods

Both `GET` and `POST` are supported:

- **GET**: Used by Vercel Cron (default for cron jobs)
- **POST**: Used for manual triggers (testing, recovery)

### Authentication

**Required Header**:

```
Authorization: Bearer <CRON_SECRET>
```

The `CRON_SECRET` environment variable must match the token in the Authorization header.

**Security**:

- Authentication check happens BEFORE any processing
- Returns 401 Unauthorized if token is missing or invalid
- Implemented via `verifyCronAuth(request)` helper

### Request

**Endpoint**: `GET /api/cron/daily-summaries-and-rewards`

**Headers**:

```http
Authorization: Bearer <CRON_SECRET>
```

**Body**: None (GET request)

### Response

#### Success (200 OK)

All operations completed successfully:

```json
{
	"success": true,
	"timestamp": "2025-11-13T01:00:00.000Z",
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

#### Partial Success (207 Multi-Status)

Some operations failed, but processing continued:

```json
{
	"success": false,
	"timestamp": "2025-11-13T01:00:00.000Z",
	"classesProcessed": 45,
	"dailySummaries": {
		"generated": 310,
		"classesProcessed": 37,
		"errors": ["Class a1b2c3d4-... (Math 101): Database connection timeout"]
	},
	"weeklyRewards": {
		"awarded": 82,
		"classesProcessed": 44,
		"errors": ["Class e5f6g7h8-... (Physics 201): Student not found"]
	}
}
```

#### Complete Failure (500 Internal Server Error)

Critical failure before any processing:

```json
{
	"success": false,
	"error": "Failed to fetch classes: Connection refused",
	"timestamp": "2025-11-13T01:00:00.000Z",
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

#### Authentication Failure (401 Unauthorized)

Invalid or missing CRON_SECRET:

```json
{
	"error": "Unauthorized: Invalid or missing cron token"
}
```

### Processing Logic

#### Step 1: Fetch Active Classes

```typescript
const { data: classes } = await serviceClient
	.from('classes')
	.select('id, name, teacher_id, school_id, created_at, updated_at, schools(timezone, timetable)')
	.eq('status', 'active');
```

#### Step 2: Process Each Class

For each active class:

1. **Extract Configuration**:
   - Timezone: `schools.timezone` (default: 'Europe/Paris')
   - Week Config: `schools.timetable.week_config` (default: Israeli Sunday-Thursday)

2. **Calculate Yesterday**:
   - Use `getYesterdayInTimezone(timezone)` to get yesterday's date in school's timezone
   - Accounts for timezone offsets and DST

3. **Check Class Schedule**:
   - Query `class_schedules` table for classes on yesterday's day of week
   - If no class scheduled → skip daily summary

4. **Generate Daily Summary** (if class scheduled):
   - Aggregate activity from multiple history tables:
     - `gidouilles_history`: Gains/losses
     - `bonus_history`: Gains/uses
     - `student_warnings`: Issued/removed
     - `vip_cards_activity`: Gained/used
   - Create `daily_summaries` record (cache)
   - Create notification if any changes occurred

5. **Check Weekly Rewards Day**:
   - Use `getCurrentDayOfWeekInTimezone(timezone)` to get current day of week
   - Use `isWeeklyRewardsDay(weekConfig, currentDayOfWeek)` to check if today is last day of week

6. **Generate Weekly Rewards** (if rewards day):
   - Get all active students in class
   - Check each student for warnings in previous week
   - Award 1 gidouille if zero warnings
   - Create `weekly_rewards` record
   - Update `profiles.gidouilles`
   - Create notification

#### Step 3: Error Handling

- **Graceful Degradation**: Class-level errors don't stop processing of other classes
- **Error Logging**: All errors logged to console with class context
- **Partial Success**: Returns 207 Multi-Status if any class failed
- **Job Tracking**: Uses `start_job_run` / `complete_job_run` RPC functions for audit

### Database Operations

#### Service Role Client

Uses `createServiceRoleClient()` which:

- Bypasses Row Level Security (RLS)
- Has full database permissions
- Required for system-level operations across all schools

#### Atomic Operations

All database writes use:

- `ON CONFLICT DO NOTHING` to prevent duplicates
- Transactions where appropriate
- Idempotent operations (safe to retry)

#### History Tables

Six history tables are queried:

1. `gidouilles_history` - Gidouille transactions
2. `bonus_history` - Bonus transactions
3. `student_warnings` - Warning records (soft-deleted)
4. `vip_cards_activity` - VIP card gains/uses
5. `daily_summaries` - Cached daily summary data
6. `weekly_rewards` - Audit trail of weekly rewards

### Performance Characteristics

**Expected Performance**:

- ~1-2 seconds per class (with caching)
- ~45-90 seconds for 45 classes
- ~2-3 minutes for 100 classes

**Optimization**:

- Service role client (bypasses RLS overhead)
- Indexed queries on all history tables
- Batched notification creation
- Graceful error handling (continue on failure)

**Monitoring**:

- Check Vercel logs for execution time
- Monitor job_runs table for success/failure tracking
- Use Error Monitoring for runtime errors

---

## `/api/admin/schools/[schoolId]/config`

### Purpose

Admin-only endpoint for configuring school timezone and week configuration. Used by the admin UI to update school settings.

### HTTP Methods

- **GET**: Fetch current configuration
- **PUT**: Update configuration

---

### GET Configuration

#### Request

**Endpoint**: `GET /api/admin/schools/[schoolId]/config`

**Headers**:

```http
Authorization: Bearer <session_token>
Cookie: supabase-auth-token=...
```

**Parameters**:

- `schoolId` (path): UUID of the school

#### Response (200 OK)

```json
{
	"success": true,
	"school": {
		"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
		"name": "Collège Victor Hugo",
		"timezone": "Europe/Paris",
		"timetable": {
			"periods": [],
			"week_config": {
				"first_day": 1,
				"last_day": 0,
				"school_days": [1, 2, 3, 4, 5],
				"weekend_days": [6, 0]
			}
		}
	}
}
```

#### Error Responses

**401 Unauthorized**:

```json
{
	"error": "Unauthorized"
}
```

**403 Forbidden** (non-admin user):

```json
{
	"error": "Admin access required"
}
```

**404 Not Found** (invalid school ID):

```json
{
	"error": "School not found"
}
```

---

### PUT Configuration

#### Request

**Endpoint**: `PUT /api/admin/schools/[schoolId]/config`

**Headers**:

```http
Authorization: Bearer <session_token>
Cookie: supabase-auth-token=...
Content-Type: application/json
```

**Parameters**:

- `schoolId` (path): UUID of the school

**Body**:

```json
{
	"timezone": "Europe/Paris",
	"week_config": {
		"first_day": 1,
		"last_day": 0,
		"school_days": [1, 2, 3, 4, 5],
		"weekend_days": [6, 0]
	}
}
```

#### Validation

All request bodies are validated with Zod schemas:

**Schema**: `updateSchoolConfigSchema`

```typescript
const updateSchoolConfigSchema = z.object({
	timezone: z.string().min(1).max(100),
	week_config: z.object({
		first_day: z.number().int().min(0).max(6),
		last_day: z.number().int().min(0).max(6),
		school_days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
		weekend_days: z.array(z.number().int().min(0).max(6)).min(1).max(7)
	})
});
```

**Validation Rules**:

- `timezone`: Non-empty string, max 100 chars (IANA timezone identifier)
- `first_day`: Integer 0-6 (0=Sunday, 6=Saturday)
- `last_day`: Integer 0-6
- `school_days`: Array of 1-7 integers (0-6), no duplicates
- `weekend_days`: Array of 1-7 integers (0-6), no duplicates
- Combined: All 7 days must be assigned (no overlap, no gaps)

#### Response (200 OK)

```json
{
	"success": true,
	"message": "Configuration mise à jour avec succès",
	"school": {
		"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
		"name": "Collège Victor Hugo",
		"timezone": "Europe/Paris",
		"timetable": {
			"periods": [],
			"week_config": {
				"first_day": 1,
				"last_day": 0,
				"school_days": [1, 2, 3, 4, 5],
				"weekend_days": [6, 0]
			}
		}
	}
}
```

#### Error Responses

**400 Bad Request** (validation error):

```json
{
	"error": "Invalid school_days: must contain integers between 0 and 6"
}
```

**401 Unauthorized**:

```json
{
	"error": "Unauthorized"
}
```

**403 Forbidden** (non-admin user):

```json
{
	"error": "Admin access required"
}
```

**404 Not Found** (invalid school ID):

```json
{
	"error": "School not found"
}
```

**500 Internal Server Error**:

```json
{
	"error": "Failed to update school configuration"
}
```

#### Authorization

- **Role**: Admin only
- **Check**: `profile.role === 'admin'`
- **Scope**: Can update any school in the system

---

## Environment Variables

### Required Variables

**CRON_SECRET**

- **Purpose**: Authentication token for cron endpoints
- **Format**: Random secure string (minimum 32 characters recommended)
- **Example**: `cron_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`
- **Set in**: Vercel project settings → Environment Variables
- **Used by**: `verifyCronAuth()` middleware

**Supabase Variables**

- `PUBLIC_SUPABASE_URL`: Supabase project URL
- `PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key (public)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (private, bypasses RLS)

### Security Best Practices

1. **Generate Strong Secrets**: Use `openssl rand -hex 32` or similar
2. **Rotate Regularly**: Change CRON_SECRET every 90 days
3. **Limit Access**: Never commit secrets to git
4. **Use Vercel's Secret Management**: Store in environment variables, not code
5. **Audit Logs**: Monitor job_runs table for unexpected executions

---

## Testing

### Manual Trigger

You can manually trigger the cron job for testing:

```bash
# Using curl
curl -X POST https://your-domain.com/api/cron/daily-summaries-and-rewards \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Using Postman
# POST https://your-domain.com/api/cron/daily-summaries-and-rewards
# Header: Authorization: Bearer YOUR_CRON_SECRET
```

### Local Testing

```bash
# Set environment variable
export CRON_SECRET="your-local-secret"

# Start dev server
pnpm dev -- --port 5175

# Trigger endpoint
curl -X POST http://localhost:5175/api/cron/daily-summaries-and-rewards \
  -H "Authorization: Bearer your-local-secret"
```

### Vercel Testing

```bash
# Using Vercel CLI
vercel env pull .env.local

# Or manually in Vercel dashboard:
# Settings → Crons → Find job → "Run now"
```

---

## Monitoring

### Vercel Logs

**Access**: Vercel Dashboard → Project → Logs

**Filter for cron jobs**:

```
path:/api/cron/daily-summaries-and-rewards
```

**Key metrics to monitor**:

- Execution time (should be < 3 minutes)
- Success rate (should be > 95%)
- Error messages (any class failures)

### Database Audit

**Job Runs Table**:

```sql
SELECT *
FROM public.job_runs
WHERE job_name = 'daily_summaries_and_rewards'
ORDER BY started_at DESC
LIMIT 20;
```

**Recent Daily Summaries**:

```sql
SELECT
  DATE(summary_date) as date,
  COUNT(*) as summaries_created,
  COUNT(sent_at) as notifications_sent
FROM public.daily_summaries
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(summary_date)
ORDER BY date DESC;
```

**Recent Weekly Rewards**:

```sql
SELECT
  week_start,
  week_end,
  COUNT(*) as rewards_awarded,
  SUM(gidouilles_awarded) as total_gidouilles
FROM public.weekly_rewards
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY week_start, week_end
ORDER BY week_start DESC;
```

### Error Monitoring

Use UbuMaths Error Monitoring system:

- Navigate to Admin Dashboard → Error Monitoring
- Filter by: `context.endpoint = "/api/cron/daily-summaries-and-rewards"`
- Check for recurring errors or patterns

---

## Troubleshooting

### Issue: Cron job not running

**Symptoms**: No new daily_summaries or weekly_rewards records

**Check**:

1. Vercel Dashboard → Crons → Verify schedule is active
2. Vercel Logs → Check for authentication errors
3. Environment Variables → Verify CRON_SECRET is set

**Solutions**:

- Re-deploy the project to sync cron configuration
- Verify `vercel.json` cron schedule is correct
- Manually trigger to test authentication

### Issue: All classes failing

**Symptoms**: 207 Multi-Status response with all classes in errors array

**Check**:

1. Database connection (Supabase status page)
2. Service role key validity (try a direct query)
3. Recent schema changes (migrations applied?)

**Solutions**:

- Wait 5 minutes and retry (may be transient DB issue)
- Verify all migrations are applied: `pnpm db:migrate`
- Check Supabase dashboard for RLS policy changes

### Issue: Some classes failing

**Symptoms**: Partial success, specific classes repeatedly fail

**Check**:

1. School configuration (timezone, week_config)
2. Class schedule data (class_schedules table)
3. Student data (class_members, profiles)

**Solutions**:

- Verify school timezone is valid IANA timezone
- Verify class has at least one schedule entry
- Check that students are not marked as test accounts

### Issue: Notifications not appearing

**Symptoms**: daily_summaries created but students don't see them

**Check**:

1. Notifications table (were notifications created?)
2. Notification settings (are students subscribed?)
3. RLS policies (can students read their notifications?)

**Solutions**:

- Query notifications table for affected students
- Check notification `target_mode` (should be 'dropdown')
- Verify students are logged in and refreshing their page

### Issue: Incorrect timezone calculations

**Symptoms**: "Yesterday" seems wrong, rewards on wrong day

**Check**:

1. School timezone configuration
2. Server time (should always be UTC)
3. Week config (first_day, last_day)

**Solutions**:

- Verify school timezone with `SELECT timezone FROM schools WHERE id = '...'`
- Verify week_config with `SELECT timetable->'week_config' FROM schools WHERE id = '...'`
- Test timezone calculations with `getYesterdayInTimezone(timezone)` in dev

---

## Related Documentation

- [User Guide (French)](../features/daily-summaries-weekly-rewards.md)
- [Admin Guide (French)](../guides/school-configuration.md)
- [Technical Architecture](../architecture/daily-summaries-system.md)
- [Migration Guide](../guides/daily-summaries-migration.md)

---

**Last Updated**: 2025-11-13
**Version**: 1.0.0
