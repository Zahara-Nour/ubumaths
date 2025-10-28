# E2E Tests

Comprehensive end-to-end tests for UbuMaths.

**Total**: 283 tests across 12 files
**Status**: ✅ Ready to run

---

## 📚 Documentation

For complete documentation, see:

- **[E2E Testing Guide](/docs/development/testing/e2e-testing-guide.md)** - Master guide with full test coverage
- **[Auth Tests](/docs/development/testing/e2e-auth-tests.md)** - Authentication & RBAC (95 tests)
- **[Teacher Tests](/docs/development/testing/e2e-teacher-tests.md)** - Assessment management (50 tests)
- **[Student Tests](/docs/development/testing/e2e-student-tests.md)** - Assessment taking (56 tests)
- **[Testing Overview](/docs/development/testing/README.md)** - Complete testing documentation

---

## 🚀 Quick Start

### Prerequisites

1. **Install Playwright**:

   ```bash
   npx playwright install
   ```

2. **Create test users** in Supabase (see [E2E Testing Guide](/docs/development/testing/e2e-testing-guide.md#prerequisites))

3. **Set environment variables** (`.env.test`):
   ```bash
   TEST_TEACHER_EMAIL=teacher@voltairedoha.com
   TEST_TEACHER_PASSWORD=test-password-secure-123
   TEST_STUDENT_EMAIL=student@voltairedoha.com
   TEST_STUDENT_PASSWORD=test-password-secure-123
   TEST_ADMIN_EMAIL=admin@voltairedoha.com
   TEST_ADMIN_PASSWORD=test-password-secure-123
   ```

### Run Tests

```bash
# Run all e2e tests
pnpm test:e2e

# Run with UI (interactive debugging)
pnpm test:e2e --ui

# Run specific category
pnpm test:e2e e2e/auth/                     # Authentication tests
pnpm test:e2e e2e/teacher/assessments/      # Teacher features
pnpm test:e2e e2e/student/assessments/      # Student features
pnpm test:e2e e2e/public/                   # Public features

# Run specific test file
pnpm test:e2e e2e/auth/login.spec.ts

# Run with headed browser (debugging)
pnpm test:e2e --headed e2e/auth/login.spec.ts

# Generate HTML report
pnpm test:e2e
npx playwright show-report
```

---

## 📁 Test Structure

```
e2e/
├── helpers/
│   └── auth-helpers.ts              # Authentication utilities
│
├── auth/                             # 95 tests
│   ├── login.spec.ts                # Login flows (32 tests)
│   ├── logout.spec.ts               # Logout flows (23 tests)
│   ├── protected-routes.spec.ts     # RBAC (40 tests)
│   └── README.md                    # Brief guide
│
├── teacher/assessments/              # 50 tests
│   ├── create-assessment.spec.ts    # Creation flow (10 tests)
│   ├── view-assessments.spec.ts     # List view (20 tests)
│   ├── edit-assessment.spec.ts      # Edit flow (20 tests)
│   └── README.md                    # Brief guide
│
├── student/assessments/              # 56 tests
│   ├── view-assessments.spec.ts     # List view (16 tests)
│   ├── take-assessment.spec.ts      # Taking test (16 tests)
│   ├── view-results.spec.ts         # Results view (24 tests)
│   └── README.md                    # Brief guide
│
└── public/                           # 82 tests
    ├── landing-page.spec.ts         # Landing page (24 tests)
    └── games/
        ├── mathemo.spec.ts          # Mathemo game (26 tests)
        └── trio.spec.ts             # Trio game (32 tests)
```

---

## 🎯 Test Coverage Summary

| Category                       | Tests   | Coverage                              |
| ------------------------------ | ------- | ------------------------------------- |
| Authentication & Authorization | 95      | Login, logout, RBAC, protected routes |
| Teacher Features               | 50      | Create, view, edit assessments        |
| Student Features               | 56      | View, take, results for assessments   |
| Public Features                | 82      | Landing page, games (Mathemo, Trio)   |
| **Total**                      | **283** | **Complete user workflows**           |

---

## 📖 Documentation Links

### Detailed Guides

- [E2E Testing Guide](/docs/development/testing/e2e-testing-guide.md) - Complete guide with all test details
- [Authentication Tests](/docs/development/testing/e2e-auth-tests.md) - Login, logout, RBAC tests
- [Teacher Tests](/docs/development/testing/e2e-teacher-tests.md) - Teacher assessment workflow
- [Student Tests](/docs/development/testing/e2e-student-tests.md) - Student assessment workflow

### Related Documentation

- [Testing Overview](/docs/development/testing/README.md) - All testing types
- [Project Documentation](/docs/README.md) - Main documentation index
- [CLAUDE.md](/CLAUDE.md) - Development guide

---

## 🔧 Troubleshooting

### Tests fail with "Cannot find page"

- Ensure app is built: `pnpm build`
- Check preview server is running on port 4173

### Authentication tests fail

- Verify test users exist in Supabase
- Check environment variables are set correctly

### Selectors don't match

- Run with `--headed` mode to see actual UI
- Add `data-testid` attributes for stable selectors

### Tests are flaky

- Add explicit waits (`waitForSelector`)
- Increase timeout in configuration

For more troubleshooting, see [E2E Testing Guide](/docs/development/testing/e2e-testing-guide.md#-troubleshooting).

---

**See [E2E Testing Guide](/docs/development/testing/e2e-testing-guide.md) for complete documentation**
