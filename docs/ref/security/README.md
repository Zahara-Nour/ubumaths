# Security Technical Guide

Comprehensive security documentation for UbuMaths.

**Last Audit**: 2025-12-09
**Overall Rating**: B+ (Good)
**Status**: 0 Critical, 0 High (after remediation), 4 Medium findings

---

## Quick Links

| Document                                    | Description                           |
| ------------------------------------------- | ------------------------------------- |
| [Authentication](authentication.md)         | Auth flows, sessions, RBAC            |
| [Input Validation](input-validation.md)     | Zod schemas, validation patterns      |
| [API Security](api-security.md)             | Endpoint protection, rate limiting    |
| [Database Security](database-security.md)   | RLS policies, service role            |
| [Frontend Security](frontend-security.md)   | XSS, CSRF, CSP                        |
| [Audit Findings](audit-findings.md)         | Current vulnerabilities & remediation |
| [Security Checklist](security-checklist.md) | Developer checklist                   |

---

## Security Architecture Overview

```
[User Browser]
    |
    |-- OAuth/Login --> [Supabase Auth] --> [Session Cookie]
    |
    |-- API Request --> [CSRF Check] --> [Auth Middleware] --> [Zod Validation]
    |                                         |
    |                                         v
    |                              [Role Check (RBAC)]
    |                                         |
    |                                         v
    |                           [Supabase Client + RLS]
    |                                         |
    |                                         v
    |                               [PostgreSQL + RLS]
    |
    |-- WebSocket --> [Supabase Realtime] --> [RLS Filtered]
```

### Defense Layers

1. **Network Layer**: HTTPS, HSTS, CSP headers
2. **Application Layer**: CSRF protection, input validation
3. **Authentication Layer**: Supabase Auth, session management
4. **Authorization Layer**: Role-based access control (RBAC)
5. **Database Layer**: Row Level Security (RLS)

---

## Key Security Controls

### Implemented (Strengths)

| Control              | Implementation              | Location                            |
| -------------------- | --------------------------- | ----------------------------------- |
| Authentication       | Centralized middleware      | `src/lib/server/middleware/auth.ts` |
| CSRF Protection      | Origin/Host validation      | `src/hooks.server.ts`               |
| Input Validation     | 65+ Zod schemas             | `src/lib/server/validation/`        |
| XSS Prevention       | DOMPurify sanitization      | `src/lib/server/sanitization.ts`    |
| CSP Headers          | Strict policy               | `src/hooks.server.ts`               |
| RLS Policies         | 100+ policies               | `supabase/migrations/`              |
| Environment Security | Zod validation on startup   | `src/lib/server/env.ts`             |
| Error Monitoring     | Rate-limited client logging | `src/lib/utils/errorMonitoring.ts`  |

### Attack Surface

| Entry Point          | Protection Level | Risk       |
| -------------------- | ---------------- | ---------- |
| Google OAuth         | High             | Low        |
| Password Login       | High             | Low        |
| API Endpoints (74+)  | High             | Low-Medium |
| WebSocket (Realtime) | High             | Low        |
| File Uploads         | Medium           | Medium     |
| Error Logging API    | Medium           | Medium     |

---

## Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                     PUBLIC INTERNET                          │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   CSP, CORS, HSTS  │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      BROWSER (Untrusted)                     │
│  - User input                                                │
│  - Local storage                                             │
│  - Client-side state                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │  CSRF, Auth Token  │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      APPLICATION SERVER                      │
│  - Auth middleware                                           │
│  - Zod validation                                            │
│  - Business logic                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │  RLS, Auth Token   │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE (Supabase)                     │
│  - Row Level Security                                        │
│  - Encrypted at rest                                         │
│  - Service role isolation                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Compliance Status

### GDPR (Educational Data)

| Requirement       | Status | Notes                   |
| ----------------- | ------ | ----------------------- |
| Data minimization | ✅     | Minimal PII in profiles |
| Access controls   | ✅     | RLS policies            |
| Right to erasure  | ✅     | CASCADE on auth.users   |
| Consent tracking  | ⚠️     | Not evaluated           |
| Data export       | ⚠️     | Not evaluated           |

### Educational Data Privacy

| Requirement                 | Status |
| --------------------------- | ------ |
| Role-based access           | ✅     |
| Teacher class isolation     | ✅     |
| Student PII protection      | ✅     |
| Cross-class data separation | ✅     |

---

## Quick Reference

### Adding a New API Endpoint

```typescript
// 1. Create Zod schema in src/lib/server/validation/
const mySchema = z.object({
	id: z.string().uuid(),
	amount: z.number().int().positive().max(1000)
});

// 2. Use auth middleware
import { requireAuth, requireRole } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	// 3. Authenticate
	const { user } = await requireAuth(locals);

	// 4. Authorize (if needed)
	await requireRole(locals, 'teacher');

	// 5. Validate input
	const body = await request.json();
	const validation = mySchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	// 6. Process with RLS-protected client
	const { data } = await locals.supabase.from('my_table').insert(validation.data);

	return json(data);
};
```

### Security Contacts

- **Security Issues**: Report via GitHub Issues (private)
- **Audit Questions**: See [audit-findings.md](audit-findings.md)
