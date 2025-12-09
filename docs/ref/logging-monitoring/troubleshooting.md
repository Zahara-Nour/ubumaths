# Troubleshooting

> Common issues, diagnostic queries, and solutions for logging and monitoring.

---

## Common Issues

### 1. Logs Not Appearing in Development

**Symptom**: `createLogger()` calls produce no output.

**Possible Causes**:

1. **Log level threshold too high**:

   ```typescript
   // This only shows errors
   const logger = createLogger('MyModule', 'error');
   logger.info('Hidden'); // Not shown
   logger.error('Shown'); // Shown
   ```

2. **Running in production mode**:

   ```bash
   # Check mode
   pnpm build && pnpm preview  # Production mode - logs disabled
   pnpm dev                     # Development mode - logs enabled
   ```

3. **Using wrong logger**:
   ```typescript
   // In production server code, use:
   import { createServerLogger } from '$lib/utils/logger';
   const logger = createServerLogger('api/endpoint'); // Works in production
   ```

**Solution**: Check log level, verify dev mode, use `createServerLogger()` for production.

---

### 2. Client Errors Not Reaching Database

**Symptom**: Browser errors don't appear in admin dashboard.

**Diagnostic Steps**:

1. **Check initialization**:

   ```typescript
   // hooks.client.ts should have:
   import { initErrorMonitoring } from '$lib/utils/errorMonitoring';
   if (browser) {
   	initErrorMonitoring();
   }
   ```

2. **Check rate limiting**:

   ```javascript
   // In browser console
   localStorage.getItem('errorRateLimit');
   // If > 10, errors are being dropped
   ```

3. **Check network tab**:
   - Look for `POST /api/errors/log`
   - Check response status (429 = rate limited)

4. **Check batching**:
   ```typescript
   // Force send queued errors
   import { flushErrors } from '$lib/utils/errorMonitoring';
   flushErrors();
   ```

**Solution**: Verify initialization, check rate limits, inspect network requests.

---

### 3. Rate Limit Always Blocking

**Symptom**: Legitimate requests getting 429 errors.

**Diagnostic Query**:

```sql
-- Check rate limit entries
SELECT *
FROM rate_limits
WHERE key LIKE 'login:%'
ORDER BY updated_at DESC
LIMIT 10;

-- Check if window expired
SELECT
  key,
  request_count,
  window_start,
  window_start + interval '15 minutes' as expires_at,
  now() > window_start + interval '15 minutes' as expired
FROM rate_limits
WHERE key = 'login:192.168.1.1';
```

**Reset Rate Limit**:

```sql
-- Delete specific entry
DELETE FROM rate_limits WHERE key = 'login:192.168.1.1';

-- Or reset counter
UPDATE rate_limits
SET request_count = 0, window_start = now()
WHERE key = 'login:192.168.1.1';
```

---

### 4. Health Check Returning 'degraded'

**Symptom**: `/api/health` returns status 'degraded'.

**Diagnostic Steps**:

1. **Check database latency**:

   ```sql
   -- Simple timing test
   EXPLAIN ANALYZE SELECT 1;
   ```

2. **Check connection pool**:

   ```sql
   -- Active connections
   SELECT count(*) FROM pg_stat_activity
   WHERE datname = 'postgres';
   ```

3. **Check Supabase status**:
   - Visit https://status.supabase.com
   - Check project dashboard

**Common Causes**:

- Database under heavy load
- Network latency issues
- Supabase free tier limits
- Cold start after inactivity

---

### 5. Error Deduplication Not Working

**Symptom**: Same error appearing multiple times in `error_occurrences`.

**Check Signature Generation**:

```sql
-- View signatures
SELECT
  error_signature,
  message,
  occurrence_count
FROM error_occurrences
ORDER BY last_seen DESC
LIMIT 20;

-- Check for similar messages
SELECT
  message,
  count(*) as entries
FROM error_occurrences
GROUP BY message
HAVING count(*) > 1;
```

**Possible Causes**:

- Dynamic values in error message (timestamps, IDs)
- Different stack traces (line numbers changed)
- Trigger not firing

**Fix Dynamic Messages**:

```typescript
// BAD: Different signature each time
throw new Error(`User ${userId} not found at ${Date.now()}`);

// GOOD: Consistent signature
throw new Error('User not found');
```

---

### 6. PII Appearing in Logs

**Symptom**: Emails or IPs visible in server logs.

**Check Logger Usage**:

```typescript
// WRONG: Using createLogger() in production code
const logger = createLogger('api/users'); // No PII redaction

// CORRECT: Using createServerLogger()
const logger = createServerLogger('api/users'); // PII redacted
```

**Verify Redaction**:

```typescript
// Test PII redaction manually
import { redactPII } from '$lib/utils/logger';

const input = { email: 'test@example.com', ip: '192.168.1.1' };
const output = redactPII(input);
console.log(output);
// { email: '[email@redacted]', ip: '192.xxx.xxx.xxx' }
```

---

### 7. Service Role Audit Warnings

**Symptom**: Console warnings about service role usage.

**Example Warning**:

```
[AUDIT] Service role client used from unexpected location: src/routes/api/users/+server.ts
```

**Solution**:

1. **If legitimate**: Add path to allowed list:

   ```typescript
   // src/lib/server/serviceRoleClient.ts
   const ALLOWED_SERVICE_ROLE_PATHS = [
   	// ...existing...
   	'src/routes/api/users/+server.ts' // Add here
   ];
   ```

2. **If not needed**: Use regular client instead:

   ```typescript
   // Instead of service role
   const { data } = await getServiceRoleClient().from('table').select();

   // Use user's client
   const { data } = await locals.supabase.from('table').select();
   ```

---

## Diagnostic Queries

### Error Statistics

```sql
-- Errors by type (last 24 hours)
SELECT
  error_type,
  severity,
  count(*) as count
FROM error_logs
WHERE created_at > now() - interval '24 hours'
GROUP BY error_type, severity
ORDER BY count DESC;

-- Error trend (last 7 days)
SELECT
  date_trunc('day', created_at) as day,
  count(*) as errors
FROM error_logs
WHERE created_at > now() - interval '7 days'
GROUP BY day
ORDER BY day;

-- Unresolved errors by age
SELECT
  CASE
    WHEN created_at > now() - interval '1 hour' THEN 'Last hour'
    WHEN created_at > now() - interval '24 hours' THEN 'Last 24h'
    WHEN created_at > now() - interval '7 days' THEN 'Last week'
    ELSE 'Older'
  END as age_bucket,
  count(*) as count
FROM error_logs
WHERE resolved = false
GROUP BY age_bucket;
```

### Rate Limit Status

```sql
-- Active rate limits
SELECT
  key,
  limit_type,
  request_count,
  window_start,
  updated_at
FROM rate_limits
WHERE window_start > now() - interval '1 hour'
ORDER BY request_count DESC
LIMIT 20;

-- Rate limit by type
SELECT
  limit_type,
  count(*) as entries,
  avg(request_count) as avg_requests
FROM rate_limits
WHERE window_start > now() - interval '24 hours'
GROUP BY limit_type;
```

### Performance Issues

```sql
-- Slow requests (last 24 hours)
SELECT
  url,
  (metadata->>'responseTime')::int as response_time_ms,
  created_at
FROM error_logs
WHERE error_type = 'performance'
  AND created_at > now() - interval '24 hours'
ORDER BY (metadata->>'responseTime')::int DESC
LIMIT 20;

-- Slow endpoints
SELECT
  url,
  count(*) as slow_count,
  avg((metadata->>'responseTime')::int) as avg_ms
FROM error_logs
WHERE error_type = 'performance'
  AND created_at > now() - interval '7 days'
GROUP BY url
ORDER BY slow_count DESC
LIMIT 10;
```

### User Presence

```sql
-- Online users
SELECT count(*) as online_users
FROM user_presence
WHERE last_seen > now() - interval '5 minutes';

-- Presence by status
SELECT
  status,
  count(*) as users
FROM user_presence
WHERE last_seen > now() - interval '24 hours'
GROUP BY status;

-- Stale presence entries
SELECT count(*) as stale_entries
FROM user_presence
WHERE last_seen < now() - interval '1 day';
```

---

## Cleanup Commands

### Clear Old Errors

```sql
-- Delete resolved errors older than 90 days
DELETE FROM error_logs
WHERE resolved = true
  AND created_at < now() - interval '90 days';

-- Delete all errors of specific type
DELETE FROM error_logs
WHERE error_type = 'client_js'
  AND resolved = true;
```

### Reset Rate Limits

```sql
-- Clear all rate limits (use with caution)
TRUNCATE rate_limits;

-- Clear specific type
DELETE FROM rate_limits
WHERE limit_type = 'login_ip';

-- Clear expired entries
DELETE FROM rate_limits
WHERE window_start < now() - interval '24 hours';
```

### Clean Stale Presence

```sql
-- Remove stale presence entries
DELETE FROM user_presence
WHERE last_seen < now() - interval '7 days';
```

---

## Monitoring Alerts

### Setup Basic Alerts

```sql
-- Create view for critical errors (useful for external monitoring)
CREATE OR REPLACE VIEW critical_error_count AS
SELECT count(*) as count
FROM error_logs
WHERE severity = 'critical'
  AND resolved = false
  AND created_at > now() - interval '1 hour';

-- Function to check threshold
CREATE OR REPLACE FUNCTION check_critical_errors()
RETURNS TABLE(alert boolean, message text) AS $$
BEGIN
  RETURN QUERY
  SELECT
    count > 5 as alert,
    format('%s critical errors in last hour', count) as message
  FROM critical_error_count;
END;
$$ LANGUAGE plpgsql;
```

### Example Cron Check

```bash
# Check critical errors via API
curl -s https://ubumaths.fr/api/admin/health-stats \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.errors.critical'
```

---

## Recovery Procedures

### After Logging System Failure

1. **Check database connectivity**:

   ```bash
   curl https://ubumaths.fr/api/health
   ```

2. **Check error_logs table exists**:

   ```sql
   SELECT * FROM error_logs LIMIT 1;
   ```

3. **Verify triggers are active**:

   ```sql
   SELECT * FROM pg_trigger WHERE tgname LIKE '%error%';
   ```

4. **Test error logging**:
   ```typescript
   // API endpoint test
   await logError(supabase, {
   	error_type: 'server_api',
   	severity: 'info',
   	message: 'Test error after recovery'
   });
   ```

### After Rate Limiter Issues

1. **Check table exists**:

   ```sql
   SELECT * FROM rate_limits LIMIT 1;
   ```

2. **Verify atomic update works**:

   ```sql
   INSERT INTO rate_limits (key, limit_type, request_count)
   VALUES ('test:123', 'login_ip', 1)
   ON CONFLICT (key) DO UPDATE
   SET request_count = rate_limits.request_count + 1;
   ```

3. **Clear if corrupted**:
   ```sql
   TRUNCATE rate_limits;
   ```

---

## Related

- [Error Monitoring](./error-monitoring.md) - Error system details
- [Rate Limiting](./rate-limiting.md) - Rate limiter reference
- [Configuration](./configuration.md) - Threshold settings
