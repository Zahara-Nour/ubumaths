# CRON Endpoints API Reference

This document describes the CRON job endpoints used for automated maintenance tasks.

## Authentication

All CRON endpoints require Bearer token authentication.

### Request Format

```http
POST /api/notifications/cleanup
Authorization: Bearer <CRON_SECRET>
```

### Security

- **Token source**: `CRON_SECRET` environment variable
- **Minimum length**: 16 characters (32+ recommended)
- **Comparison**: Constant-time comparison prevents timing attacks
- **Fail-secure**: Endpoints disabled if `CRON_SECRET` not configured

### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Missing Authorization header | No `Authorization` header provided |
| 401 | Invalid Authorization header format | Header doesn't match `Bearer <token>` format |
| 401 | Invalid token | Token doesn't match `CRON_SECRET` |
| 503 | CRON endpoints disabled | `CRON_SECRET` not configured (fail-secure) |

---

## POST /api/cache/cleanup

Cleanup expired server-side cache entries.

### Schedule

**Daily at 2 AM UTC** (configured in `vercel.json`)

### Retention Policy

Deletes cache entries where `expires_at < NOW()`

### Request

```http
POST /api/cache/cleanup
Authorization: Bearer <CRON_SECRET>
```

### Response (200 OK)

```json
{
  "success": true,
  "deleted_count": 15,
  "message": "Cleaned up 15 expired cache entries"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether cleanup completed successfully |
| `deleted_count` | number | Number of cache entries deleted |
| `message` | string | Human-readable result message |

### Error Response (500)

```json
{
  "success": false,
  "error": "Cleanup failed: <error details>"
}
```

### Job Tracking

Execution logged to `background_job_runs` table:
- **Job name**: `cleanup_expired_cache`
- **Metadata**: `{ deleted_count: N }`
- **Status**: `success` | `failed`

### Example

```bash
curl -X POST https://ubumaths.vercel.app/api/cache/cleanup \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

---

## POST /api/notifications/cleanup

Cleanup expired notifications (hard delete).

### Schedule

**Daily at 3 AM UTC** (configured in `vercel.json`)

### Retention Policy

Deletes notifications where:
- `dismissed_at IS NOT NULL` AND `dismissed_at < NOW() - INTERVAL '30 days'`

**Important**: Unread notifications are NEVER auto-deleted.

### Request

```http
POST /api/notifications/cleanup
Authorization: Bearer <CRON_SECRET>
```

### Response (200 OK)

```json
{
  "success": true,
  "deletedCount": 42,
  "message": "Cleaned up 42 expired notification(s)"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether cleanup completed successfully |
| `deletedCount` | number | Number of notifications deleted |
| `message` | string | Human-readable result message |

### Error Response (500)

```json
{
  "success": false,
  "error": "<error details>"
}
```

### Job Tracking

Execution logged to `background_job_runs` table:
- **Job name**: `cleanup_old_notifications`
- **Metadata**: `{ deleted_count: N }`
- **Status**: `success` | `failed`

### Example

```bash
curl -X POST https://ubumaths.vercel.app/api/notifications/cleanup \
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

### Test Cache Cleanup

```bash
curl -X POST http://localhost:5175/api/cache/cleanup \
  -H "Authorization: Bearer $CRON_SECRET" -v
```

### Test Notifications Cleanup

```bash
curl -X POST http://localhost:5175/api/notifications/cleanup \
  -H "Authorization: Bearer $CRON_SECRET" -v
```

### Verify Authentication

```bash
# Should fail with 401
curl -X POST http://localhost:5175/api/cache/cleanup -v

# Should fail with 401
curl -X POST http://localhost:5175/api/cache/cleanup \
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
[CRON AUTH] ✅ Valid token { url: '/api/cache/cleanup', method: 'POST', timestamp: '2025-01-10T02:00:00.000Z' }
```

**Failed authentication**:
```
[CRON AUTH] Invalid token (value mismatch) { url: '/api/cache/cleanup', method: 'POST', timestamp: '2025-01-10T02:00:00.000Z' }
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

| Threat | Mitigation | Status |
|--------|------------|--------|
| Unauthorized execution | Bearer token authentication | ✅ Implemented |
| Timing attacks | Constant-time comparison | ✅ Implemented |
| Token brute-force | 128-bit entropy minimum | ✅ Implemented |
| Misconfiguration exposure | Fail-secure design | ✅ Implemented |
| Information disclosure | Minimal error details | ✅ Implemented |

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

---

## Related Documentation

- [Environment Variables Guide](../development/environment-variables.md#cron-secret)
- [CRON Authentication Implementation](../security/cron-authentication.md)
- [Notifications System](../features/notifications-system.md)
