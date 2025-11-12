# CRON Endpoints API Reference

This document describes the CRON job endpoints used for automated maintenance tasks.

## Authentication

All CRON endpoints require authentication using one of two methods:

1. **Vercel automatic**: `x-vercel-cron: 1` header (production)
2. **Manual testing**: `Authorization: Bearer <CRON_SECRET>` header (development/testing)

### Request Format

**Production (Vercel automatic):**

```http
POST /api/cleanup/all
x-vercel-cron: 1
```

**Manual testing:**

```http
POST /api/cleanup/all
Authorization: Bearer <CRON_SECRET>
```

### Security

- **Token source**: `CRON_SECRET` environment variable
- **Minimum length**: 16 characters (32+ recommended)
- **Comparison**: Constant-time comparison prevents timing attacks
- **Fail-secure**: Endpoints disabled if `CRON_SECRET` not configured

### Error Responses

| Status | Error                               | Description                                  |
| ------ | ----------------------------------- | -------------------------------------------- |
| 401    | Missing Authorization header        | No `Authorization` header provided           |
| 401    | Invalid Authorization header format | Header doesn't match `Bearer <token>` format |
| 401    | Invalid token                       | Token doesn't match `CRON_SECRET`            |
| 503    | CRON endpoints disabled             | `CRON_SECRET` not configured (fail-secure)   |

---

## POST /api/cleanup/all

**Unified cleanup endpoint** that handles both cache and notifications cleanup.

### Schedule

**Daily at 2 AM UTC** (configured in `vercel.json`)

### What It Cleans

1. **Cache entries**: Deletes where `expires_at < NOW()`
2. **Notifications**: Deletes where `dismissed_at IS NOT NULL` AND `dismissed_at < NOW() - INTERVAL '30 days'`

**Important**: Unread notifications are NEVER auto-deleted.

### Request

**Production (Vercel):**

```http
POST /api/cleanup/all
x-vercel-cron: 1
```

**Manual testing:**

```http
POST /api/cleanup/all
Authorization: Bearer <CRON_SECRET>
```

### Response (200 OK)

```json
{
	"success": true,
	"cache": {
		"deleted": 15,
		"message": "Cleaned up 15 expired cache entries"
	},
	"notifications": {
		"deleted": 42,
		"message": "Cleaned up 42 expired notification(s)"
	}
}
```

### Response Fields

| Field                   | Type    | Description                                 |
| ----------------------- | ------- | ------------------------------------------- |
| `success`               | boolean | Whether overall cleanup completed           |
| `cache.deleted`         | number  | Number of cache entries deleted             |
| `cache.message`         | string  | Human-readable cache cleanup result         |
| `notifications.deleted` | number  | Number of notifications deleted             |
| `notifications.message` | string  | Human-readable notifications cleanup result |

### Partial Success Response (200 OK)

If one cleanup fails, the other continues:

```json
{
	"success": false,
	"cache": {
		"deleted": 0,
		"error": "Database connection failed"
	},
	"notifications": {
		"deleted": 42,
		"message": "Cleaned up 42 expired notification(s)"
	}
}
```

### Error Response (500)

```json
{
	"success": false,
	"error": "Both cleanups failed: <error details>"
}
```

### Job Tracking

Execution logged to `background_job_runs` table:

- **Job name**: `cleanup_all`
- **Metadata**: `{ cache_deleted: N, notifications_deleted: M }`
- **Status**: `success` | `failed` | `partial`

### Example

**Production (Vercel automatically adds header):**

```bash
# Vercel calls this automatically at 2 AM UTC
# No manual execution needed in production
```

**Manual testing:**

```bash
curl -X POST https://ubumaths.vercel.app/api/cleanup/all \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

---

## Manual Testing

For local development or manual triggers:

### Setup

```bash
# Export CRON_SECRET from .env
export CRON_SECRET=$(grep CRON_SECRET .env | cut -d '=' -f2)
```

### Test Unified Cleanup

```bash
curl -X POST http://localhost:5175/api/cleanup/all \
  -H "Authorization: Bearer $CRON_SECRET" -v
```

### Verify Authentication

```bash
# Should fail with 401
curl -X POST http://localhost:5175/api/cleanup/all -v

# Should fail with 401
curl -X POST http://localhost:5175/api/cleanup/all \
  -H "Authorization: Bearer wrong-token" -v
```

---

## Monitoring

### Vercel Dashboard

1. Go to **Vercel Dashboard** → **Deployments**
2. Select latest deployment → **Functions** tab
3. Find cleanup function → View logs
4. Filter for `[CRON AUTH]` to see authentication events

### Log Patterns

**Successful authentication**:

```
[CRON AUTH] ✅ Valid token { url: '/api/cleanup/all', method: 'POST', timestamp: '2025-01-10T02:00:00.000Z' }
```

**Failed authentication**:

```
[CRON AUTH] Invalid token (value mismatch) { url: '/api/cleanup/all', method: 'POST', timestamp: '2025-01-10T02:00:00.000Z' }
```

**Configuration error**:

```
[CRON AUTH] CRON_SECRET not configured - CRON endpoints are disabled
```

### Alerting

Set up alerts for:

- **401 errors** on CRON endpoints (authentication failures)
- **503 errors** (CRON_SECRET not configured)
- **500 errors** (cleanup failures)
- **Partial success** (one cleanup succeeded, one failed)
- **Multiple 401s in short period** (potential brute-force attack)

---

## Security Considerations

### Secret Management

- Use 32+ character hex strings for production
- Rotate secrets every 90 days (recommended)
- Use different secrets per environment
- Never commit secrets to version control
- Monitor authentication logs weekly

### Threat Model

| Threat                    | Mitigation                  | Status         |
| ------------------------- | --------------------------- | -------------- |
| Unauthorized execution    | Bearer token authentication | ✅ Implemented |
| Timing attacks            | Constant-time comparison    | ✅ Implemented |
| Token brute-force         | 128-bit entropy minimum     | ✅ Implemented |
| Misconfiguration exposure | Fail-secure design          | ✅ Implemented |
| Information disclosure    | Minimal error details       | ✅ Implemented |

### Compliance

- **Authentication**: RFC 6750 Bearer Token
- **Cryptography**: Node.js `crypto.timingSafeEqual()`
- **Logging**: PII-free audit trail
- **Fail-secure**: Rejects by default

---

## Troubleshooting

See `docs/development/environment-variables.md#cron-secret` for complete troubleshooting guide.

**Quick fixes**:

1. **401 Unauthorized**: Check `CRON_SECRET` matches between Vercel env vars and your request
2. **503 Service Unavailable**: Add `CRON_SECRET` to Vercel environment variables
3. **No CRON execution**: Verify schedule in `vercel.json` and check Vercel function logs
4. **Partial success**: Check database connectivity and RPC function status in Supabase

---

## Migration Notes

### From Separate Endpoints (Pre-2025-11-12)

Previously, cache and notifications cleanup were handled by separate endpoints:

- **OLD**: `/api/cache/cleanup` (deleted)
- **OLD**: `/api/notifications/cleanup` (deleted)
- **NEW**: `/api/cleanup/all` (unified)

**Why the change?**

- Vercel free tier allows only 2 cron jobs
- Consolidation frees up 1 cron slot for future use
- Single job tracking record instead of two
- Resilient: if one cleanup fails, the other continues

**Migration steps for manual testing:**

```bash
# OLD (no longer works)
curl -X POST http://localhost:5175/api/cache/cleanup \
  -H "Authorization: Bearer $CRON_SECRET"

# NEW (use this instead)
curl -X POST http://localhost:5175/api/cleanup/all \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Related Documentation

- [Environment Variables Guide](../development/environment-variables.md#cron-secret)
- [CRON Authentication Implementation](../security/cron-authentication.md)
- [Notifications System](../features/notifications-system.md)
