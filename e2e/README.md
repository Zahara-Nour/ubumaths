# E2E Tests

End-to-end tests for UbuMaths (Playwright), organisés par rôle.

> **Architecture des tests & règles** : [docs/ref/tests/architecture.md](/docs/ref/tests/architecture.md)
> Les e2e (`*.spec.ts`) tournent en local / à la demande (build + preview), pas dans la boucle de push.

---

## 🚀 Quick Start

### Prerequisites

1. **Install Playwright**:

   ```bash
   npx playwright install
   ```

2. **Create test users** in Supabase (voir docs/ref/tests/architecture.md)

3. **Set environment variables** in `.env.test` (git-ignored — never commit real
   credentials). Use dedicated **test** accounts, not real staff/student logins:
   ```bash
   TEST_TEACHER_EMAIL=<test-teacher-email>
   TEST_TEACHER_PASSWORD=<test-teacher-password>
   TEST_STUDENT_EMAIL=<test-student-email>
   TEST_STUDENT_PASSWORD=<test-student-password>
   TEST_ADMIN_EMAIL=<test-admin-email>
   TEST_ADMIN_PASSWORD=<test-admin-password>
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
├── helpers/                          # auth-helpers, image-helpers
├── auth/                             # login, logout, protected-routes (RBAC)
├── teacher/assessments/              # create / view / edit assessments
├── student/assessments/              # view / take / results
├── public/                           # landing-page + games/ (mathemo, trio)
├── exercises/                        # image-attributes, image-upload
│   └── exercises-parameterization.spec.ts (à la racine)
└── navadra/                          # challenge-types, error-scenarios, combat-flow
```

Chaque sous-dossier par rôle a un `README.md` court. Les fichiers se terminent par `*.spec.ts`.

---

## 📖 Documentation Links

- [Architecture des tests](/docs/ref/tests/architecture.md) - Types, conventions, runners, CI
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

---

**Voir [docs/ref/tests/architecture.md](/docs/ref/tests/architecture.md) pour l'architecture des tests.**
