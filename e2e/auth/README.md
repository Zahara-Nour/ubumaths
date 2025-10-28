# Authentication E2E Tests

95 comprehensive tests covering authentication and authorization.

**Status**: ✅ Ready to run

---

## 📚 Full Documentation

**[Authentication & Authorization E2E Tests →](/docs/development/testing/e2e-auth-tests.md)**

Complete documentation with test details, helper functions, and troubleshooting.

---

## Quick Links

- **Login flows** (32 tests) - `login.spec.ts`
  - Successful/failed login attempts
  - UI interactions and validation
  - Security (cookies, CSRF, rate limiting)

- **Logout flows** (23 tests) - `logout.spec.ts`
  - Successful logout and redirects
  - Session clearing and invalidation
  - Post-logout behavior

- **Protected routes & RBAC** (40 tests) - `protected-routes.spec.ts`
  - Unauthenticated access prevention
  - Teacher/Student/Admin role permissions
  - Role switching and edge cases

---

## Run Tests

```bash
# Run all auth tests
pnpm test:e2e e2e/auth/

# Run specific test file
pnpm test:e2e e2e/auth/login.spec.ts
pnpm test:e2e e2e/auth/logout.spec.ts
pnpm test:e2e e2e/auth/protected-routes.spec.ts

# Run with UI (interactive)
pnpm test:e2e e2e/auth/ --ui

# Run specific browser
pnpm test:e2e e2e/auth/ --project=chromium
```

---

**For complete documentation, see [E2E Auth Tests →](/docs/development/testing/e2e-auth-tests.md)**
