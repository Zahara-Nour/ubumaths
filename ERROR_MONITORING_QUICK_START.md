# Error Monitoring - Quick Start Guide

## ✅ Installation Complete!

Your error monitoring system is **fully operational** and actively capturing errors.

---

## 🚀 Quick Test

### Option 1: Test Page (Recommended)

1. **Navigate to**: `http://localhost:5173/dashboard/admin/errors/test`
2. Click the test buttons to trigger different error types
3. **View results**: `http://localhost:5173/dashboard/admin/errors`

### Option 2: Trigger Test Error Manually

Add this button anywhere in your app:

```svelte
<button onclick={() => { throw new Error('Test Error'); }}>
  Test Error Monitoring
</button>
```

### Option 3: API Test

```bash
curl -X POST http://localhost:5173/api/errors/log \
  -H "Content-Type: application/json" \
  -d '{
    "error_type": "client_js",
    "severity": "critical",
    "message": "Test critical error",
    "url": "/test"
  }'
```

---

## 📊 Accessing the Dashboard

### Admin Dashboard

**URL**: `/dashboard/admin/errors`

**Features**:
- 📈 Statistics (total, unresolved, critical, recent)
- 🔍 Filters (type, severity, status, search)
- 📋 Error list (deduplicated)
- 🔎 Detailed error view
- ✅ Resolution workflow

### Test Page

**URL**: `/dashboard/admin/errors/test`

**Use this to**:
- Trigger test errors
- Verify system is working
- Demo error capture

---

## 🎯 What's Being Monitored

### ✅ Automatic Capture (Already Working)

**Client-Side**:
- JavaScript errors (`throw new Error()`)
- Unhandled promise rejections
- Syntax errors
- Reference errors

**Server-Side**:
- API endpoint errors
- Load function errors
- Form action errors
- Slow requests (>3 seconds)

**Context Captured**:
- User ID & role
- Browser & OS info
- URL & file location
- Stack traces
- Performance metrics

### 🔒 Privacy Protected

Automatically sanitized:
- ❌ Passwords
- ❌ Tokens & API keys
- ❌ Session data
- ❌ Email addresses (in stack traces)
- ❌ Sensitive form data

---

## 💻 Developer Usage

### Automatic (No Code Needed)

Most errors are captured automatically:

```typescript
// These are captured automatically:
throw new Error('Something went wrong');
await Promise.reject('Failed');
nonExistentVariable.method(); // ReferenceError
```

### Manual Capture (Try-Catch Blocks)

```typescript
import { captureError } from '$lib/utils/errorMonitoring';

try {
  await riskyOperation();
} catch (err) {
  captureError(err, {
    severity: 'critical',
    context: { userId, orderId: '123' },
    tags: ['payment', 'urgent']
  });
  // Handle error gracefully
}
```

### Validation Errors

```typescript
import { captureValidationError } from '$lib/utils/errorMonitoring';

if (!email) {
  captureValidationError('email', 'Email is required', formData);
}
```

### Performance Tracking

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

---

## 🔧 Configuration

### Rate Limiting

**Location**: `src/lib/utils/errorMonitoring.ts:37`

```typescript
const CONFIG = {
  MAX_ERRORS_PER_MINUTE: 10, // Change this
  BATCH_SIZE: 5,
  BATCH_TIMEOUT: 10000
};
```

### Performance Threshold

**Location**: `src/hooks.server.ts:22`

```typescript
if (responseTime > 3000) { // Change this (milliseconds)
  // Log slow request
}
```

### Data Retention

**API**: `POST /api/errors/cleanup`

```json
{
  "days_old": 90
}
```

**Cron Job** (optional):
```json
{
  "crons": [{
    "path": "/api/errors/cleanup",
    "schedule": "0 2 * * *"
  }]
}
```

---

## 📱 Notifications

### Critical Errors

When a **critical** error occurs:

✅ Automatic notification to all admins
✅ Priority: Urgent
✅ Link to error detail page
✅ Shows in notification dropdown

**Format**:
```
🚨 Erreur Critique Détectée

Type: server_api
Message: Database connection failed
URL: /api/students

[Voir les détails]
```

---

## 🐛 Troubleshooting

### Errors not appearing?

1. **Check you're logged in as admin**
   - Dashboard requires `role = 'admin'`
   - Check: `SELECT role FROM profiles WHERE id = 'your-id'`

2. **Check migration was applied**
   ```bash
   pnpm db:migrate
   ```

3. **Check browser console**
   - Look for: `[Error Monitoring] Initializing...`
   - Should appear on page load

4. **Test the API directly**
   ```bash
   curl -X POST http://localhost:5173/api/errors/log \
     -H "Content-Type: application/json" \
     -d '{"error_type":"client_js","severity":"error","message":"Test","url":"/test"}'
   ```

### RLS Issues

The system uses **service role key** to bypass RLS, so:
- ✅ Works for authenticated users
- ✅ Works for unauthenticated users
- ✅ Works from any context

---

## 📚 Full Documentation

For complete details, see: **`ERROR_MONITORING_SYSTEM.md`**

Includes:
- Complete API reference
- Database schema details
- Privacy & security
- Advanced usage
- Examples

---

## 🎉 You're All Set!

Your error monitoring system is:
- ✅ **Installed** - Database, functions, indexes created
- ✅ **Configured** - Service role key configured
- ✅ **Active** - Capturing errors right now
- ✅ **Tested** - Test error logged successfully

**Next Steps**:
1. Visit: `/dashboard/admin/errors/test`
2. Click test buttons
3. View results in: `/dashboard/admin/errors`
4. Add link to admin navigation (optional)

---

## 🆘 Need Help?

1. Check `ERROR_MONITORING_SYSTEM.md` (full docs)
2. Check `ERROR_MONITORING_QUICK_START.md` (this file)
3. Test page: `/dashboard/admin/errors/test`
4. API test: `curl -X POST http://localhost:5173/api/errors/log ...`

---

**Status**: 🟢 OPERATIONAL

The system is actively monitoring your application!
