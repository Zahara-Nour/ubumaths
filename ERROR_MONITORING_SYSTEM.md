# Error Monitoring System Documentation

## Overview

The UbuMaths error monitoring system is a comprehensive, custom-built solution that captures, logs, and tracks errors across the entire application stack. Built entirely on Supabase (PostgreSQL), it provides admin-only access to error logs with full context, automatic deduplication, and integration with the existing notification system.

## Features

✅ **Comprehensive Coverage**

- Client-side JavaScript errors (browser errors, unhandled promises)
- Server-side API errors (endpoint failures, database issues)
- Form validation errors
- Performance issues (slow requests, large payloads)

✅ **Privacy & Security**

- Automatic sanitization of sensitive data
- Student data protection built-in
- Admin-only access via RLS policies
- Configurable data retention

✅ **Smart Error Management**

- Automatic deduplication (error signatures)
- Occurrence tracking (frequency analysis)
- Batch sending (reduces API calls)
- Rate limiting (prevents spam)

✅ **Admin Dashboard**

- Real-time error statistics
- Filterable error list
- Detailed error view with full context
- Resolution workflow

✅ **Alerting**

- Critical error notifications (via existing notification system)
- Integrates with internal messaging for urgent issues
- Automatic admin notifications

---

## Architecture

### Database Schema

#### `error_logs` Table

Main error storage with full context.

**Key Fields:**

- `error_type`: Type of error (client_js, server_api, validation, performance, database)
- `severity`: Severity level (info, warning, error, critical)
- `message`: Error message
- `stack_trace`: Full stack trace (sanitized)
- `user_id`, `user_role`: User context
- `url`, `file_path`, `line_number`: Location information
- `browser_name`, `os_name`, `device_type`: Browser context
- `request_method`, `status_code`, `response_time`: Server context
- `context`: Additional JSONB data
- `resolved`: Resolution status

#### `error_occurrences` Table

Tracks error frequency with deduplication.

**Key Fields:**

- `error_signature`: Unique hash for deduplication
- `occurrence_count`: Number of times this error occurred
- `first_seen`, `last_seen`: Time tracking
- `is_resolved`: Resolution status

### Components

```
error-monitoring/
├── Database
│   ├── error_logs (main storage)
│   └── error_occurrences (deduplication)
├── Server
│   ├── src/lib/server/errorMonitoring.ts (utilities)
│   ├── src/routes/api/errors/* (API endpoints)
│   └── src/hooks.server.ts (automatic capture)
├── Client
│   ├── src/lib/utils/errorMonitoring.ts (browser capture)
│   └── src/hooks.client.ts (initialization)
└── UI
    ├── src/routes/(protected)/dashboard/admin/errors (dashboard)
    └── src/routes/(protected)/dashboard/admin/errors/[id] (details)
```

---

## Usage Guide

### For Developers

#### Automatic Error Capture

Most errors are captured automatically:

```typescript
// Browser errors - captured automatically
throw new Error('Something went wrong');

// Unhandled promise rejections - captured automatically
Promise.reject('Failed to load data');

// Server errors - captured automatically
export const GET: RequestHandler = async () => {
	throw error(500, 'Database connection failed');
};
```

#### Manual Error Capture

For try-catch blocks or custom error tracking:

```typescript
import { captureError } from '$lib/utils/errorMonitoring';

try {
	await riskyOperation();
} catch (err) {
	captureError(err, {
		severity: 'warning',
		context: { operation: 'riskyOperation', userId: '...' },
		tags: ['payment', 'critical']
	});
	// Handle error gracefully
}
```

#### Validation Error Tracking

Track form validation errors:

```typescript
import { captureValidationError } from '$lib/utils/errorMonitoring';

function validateForm(data) {
	if (!data.email) {
		captureValidationError('email', 'Email is required', data);
		return { valid: false, error: 'Email is required' };
	}
	return { valid: true };
}
```

#### Performance Monitoring

Track slow operations:

```typescript
import { capturePerformance } from '$lib/utils/errorMonitoring';

const start = performance.now();
await heavyOperation();
const duration = performance.now() - start;

// Only logs if duration > 1000ms
capturePerformance('heavyOperation', duration, 1000, {
	recordCount: 5000
});
```

### For Admins

#### Accessing the Dashboard

1. Navigate to `/dashboard/admin/errors`
2. View error statistics (total, unresolved, critical, recent)
3. Filter errors by type, severity, status, or search message
4. Click any error to view full details

#### Error Detail View

For each error, view:

- Full error message and stack trace
- Location (URL, file, line number)
- User context (ID, role, session)
- Browser/device information
- Request details (method, status, headers)
- Performance metrics (response time)
- Additional context (custom data)

#### Resolving Errors

1. Open error detail page
2. Review error information
3. Add resolution notes (optional)
4. Click "Marquer comme résolu"
5. Error is marked as resolved and removed from active list

---

## Configuration

### Rate Limiting

Client-side rate limit: **10 errors per minute**

To adjust:

```typescript
// src/lib/utils/errorMonitoring.ts
const CONFIG = {
	MAX_ERRORS_PER_MINUTE: 10, // Change this value
	BATCH_SIZE: 5,
	BATCH_TIMEOUT: 10000
};
```

### Performance Thresholds

Server-side slow request threshold: **3 seconds**

To adjust:

```typescript
// src/hooks.server.ts
if (responseTime > 3000) {
	// Change this value
	// Log slow request
}
```

### Data Retention

Default: **90 days** for resolved errors

To cleanup old errors:

```typescript
// Manually via API
await fetch('/api/errors/cleanup', {
	method: 'POST',
	body: JSON.stringify({ days_old: 90 })
});
```

Or set up a Vercel cron job:

```json
{
	"crons": [
		{
			"path": "/api/errors/cleanup",
			"schedule": "0 2 * * *"
		}
	]
}
```

---

## Privacy & Security

### Automatic Sanitization

The system automatically sanitizes:

- **Passwords** (removed from context)
- **Tokens** (removed from headers/body)
- **API Keys** (removed from context)
- **Email addresses** (redacted from stack traces)
- **Session data** (sensitive fields removed)

### Student Data Protection

- No student form data is logged in raw format
- File upload paths are sanitized
- Query parameters with tokens are removed
- PII is never stored in error contexts

### Access Control

- **RLS Policies**: Only admins can view/manage errors
- **Service Role**: API can log errors without user context
- **No Student Access**: Students cannot see any error data
- **No Teacher Access**: Teachers cannot access error logs (configurable)

---

## API Reference

### POST /api/errors/log

Log a new error (client or server)

**Request:**

```json
{
	"error_type": "client_js",
	"severity": "error",
	"message": "Cannot read property 'x' of undefined",
	"url": "/dashboard/student",
	"stack_trace": "Error: ...",
	"file_path": "MyComponent.svelte",
	"line_number": 42,
	"context": { "additionalData": "..." }
}
```

**Response:**

```json
{
	"success": true,
	"id": "uuid"
}
```

### GET /api/errors

Get list of error logs (admin only)

**Query Parameters:**

- `type` - Filter by error type
- `severity` - Filter by severity
- `resolved` - Filter by resolution status (true/false)
- `search` - Search in error message
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset

**Response:**

```json
{
  "errors": [...],
  "count": 123
}
```

### GET /api/errors/[id]

Get single error detail (admin only)

**Response:**

```json
{
  "error": {
    "id": "uuid",
    "error_type": "client_js",
    "severity": "error",
    "message": "...",
    ...
  }
}
```

### PUT /api/errors/[id]

Resolve error (admin only)

**Request:**

```json
{
	"notes": "Fixed by updating validation logic"
}
```

**Response:**

```json
{
	"success": true
}
```

### GET /api/errors/stats

Get error statistics (admin only)

**Query Parameters:**

- `hours` - Time window (default: 24)

**Response:**

```json
{
	"stats": {
		"total_errors": 150,
		"unresolved_errors": 42,
		"critical_errors": 3,
		"errors_last_hour": 8,
		"unique_errors": 25,
		"most_common_error_type": "client_js"
	}
}
```

### GET /api/errors/occurrences

Get deduplicated error occurrences (admin only)

**Query Parameters:** Same as `/api/errors`

**Response:**

```json
{
  "occurrences": [...],
  "count": 25
}
```

### POST /api/errors/cleanup

Cleanup old resolved errors (admin only)

**Request:**

```json
{
	"days_old": 90
}
```

**Response:**

```json
{
	"success": true,
	"deleted_count": 1234
}
```

---

## Database Functions

### `generate_error_signature(type, message, file, line)`

Generates SHA-256 hash for error deduplication.

### `upsert_error_occurrence(signature, log_id, type, severity, ...)`

Creates or updates error occurrence record, returns occurrence count.

### `cleanup_old_errors(days_old)`

Removes resolved errors older than specified days.

### `get_error_stats(hours)`

Returns error statistics for admin dashboard.

### `resolve_error(error_log_id, resolved_by, notes)`

Marks single error as resolved (admin only).

### `resolve_error_by_signature(signature, resolved_by, notes)`

Bulk resolves all errors matching signature (admin only).

---

## Notifications

### Critical Error Alerts

When a **critical** error occurs, the system automatically:

1. Creates a system notification
2. Targets all admins
3. Sets priority to "urgent"
4. Includes link to error detail page

**Notification Example:**

```
🚨 Erreur Critique Détectée

Type: server_api
Message: Database connection timeout
URL: /api/students
Rôle utilisateur: teacher

[Voir les détails]
```

### Daily Digest (Optional)

Set up a cron job for daily error summaries:

```json
{
	"crons": [
		{
			"path": "/api/errors/daily-digest",
			"schedule": "0 9 * * *"
		}
	]
}
```

---

## Troubleshooting

### Errors not appearing in dashboard

1. **Check RLS policies**: Ensure you're logged in as admin
2. **Check migration**: Run `pnpm db:migrate` to apply migration 100
3. **Check API endpoint**: Test `/api/errors/log` with Postman
4. **Check browser console**: Look for error monitoring initialization message

### Too many errors being logged

1. **Adjust rate limiting**: Lower `MAX_ERRORS_PER_MINUTE` in client config
2. **Increase batch size**: Reduce API calls by increasing `BATCH_SIZE`
3. **Filter out known issues**: Add error patterns to ignore list

### Performance impact

The error monitoring system is designed to be lightweight:

- **Client**: Batch sending (every 10s or 5 errors)
- **Server**: Async logging (doesn't block responses)
- **Database**: Indexed queries for fast retrieval
- **Privacy**: Minimal data sanitization overhead

---

## Migration Guide

### Applying the Migration

```bash
# Push migration to Supabase
pnpm db:migrate

# Or manually via Supabase Dashboard
# Copy contents of: supabase/migrations/100_create_error_monitoring_system.sql
```

### Updating Database Types

After migration:

```bash
# Generate new types from database
npx supabase gen types typescript --local > src/lib/types/database.ts
```

---

## Examples

### Example 1: Custom Error with Context

```typescript
import { captureError } from '$lib/utils/errorMonitoring';

async function processPayment(orderId: string) {
	try {
		const result = await paymentGateway.charge(orderId);
		return result;
	} catch (err) {
		captureError(err, {
			severity: 'critical',
			context: {
				orderId,
				gateway: 'stripe',
				timestamp: Date.now()
			},
			tags: ['payment', 'financial']
		});
		throw err;
	}
}
```

### Example 2: Performance Tracking

```typescript
import { capturePerformance } from '$lib/utils/errorMonitoring';

async function loadStudentData(classId: string) {
	const start = performance.now();

	const students = await db.query('SELECT * FROM profiles WHERE class_id = ?', [classId]);

	const duration = performance.now() - start;

	// Only logs if query takes > 500ms
	capturePerformance('loadStudentData', duration, 500, {
		classId,
		studentCount: students.length
	});

	return students;
}
```

### Example 3: Server-Side Manual Logging

```typescript
import { logError } from '$lib/server/errorMonitoring';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const data = await request.json();
		// Process data...
	} catch (err) {
		await logError(locals.supabase, {
			error_type: 'server_api',
			severity: 'error',
			message: err.message,
			url: '/api/data/process',
			stack_trace: err.stack,
			request_method: 'POST',
			context: {
				bodySize: JSON.stringify(data).length
			}
		});
		throw error(500, 'Processing failed');
	}
};
```

---

## Future Enhancements

Potential improvements for the error monitoring system:

1. **Error Grouping**: Group similar errors by patterns
2. **Trend Analysis**: Chart errors over time
3. **Email Alerts**: Send email notifications for critical errors
4. **Slack Integration**: Post critical errors to Slack channel
5. **Source Maps**: Decode minified stack traces
6. **Error Search**: Full-text search across all error fields
7. **User Error Reports**: Allow users to report bugs
8. **Error Replay**: Capture user actions before error

---

## Support

For questions or issues with the error monitoring system:

1. Check this documentation
2. Review the migration file: `supabase/migrations/100_create_error_monitoring_system.sql`
3. Check server utilities: `src/lib/server/errorMonitoring.ts`
4. Check client utilities: `src/lib/utils/errorMonitoring.ts`

---

## Changelog

### Version 1.0 (2025-10-23)

**Initial Release**

- ✅ Complete database schema (error_logs, error_occurrences)
- ✅ Server-side utilities and API endpoints
- ✅ Client-side automatic error capture
- ✅ Admin dashboard and detail pages
- ✅ Critical error notifications
- ✅ Privacy & sanitization system
- ✅ Rate limiting and deduplication
- ✅ Comprehensive documentation
