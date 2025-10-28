# Teacher Assessment E2E Tests

50 comprehensive tests covering teacher assessment features.

**Status**: ✅ Ready to run

---

## 📚 Full Documentation

**[Teacher Assessment E2E Tests →](/docs/development/testing/e2e-teacher-tests.md)**

Complete documentation with test details, helper functions, and troubleshooting.

---

## Quick Links

- **Create assessments** (10 tests) - `create-assessment.spec.ts`
  - Assessment creation wizard
  - Question cart integration
  - Settings configuration
  - Validation (title, duration, attempts)

- **View assessments** (20 tests) - `view-assessments.spec.ts`
  - List view with tabs (Drafts, Published, Archived)
  - Badge counts and empty states
  - Assessment cards display
  - Navigation to detail/edit/results

- **Edit assessments** (20 tests) - `edit-assessment.spec.ts`
  - Edit draft metadata
  - Update settings
  - Validation during editing
  - Restrictions on published assessments

---

## Run Tests

```bash
# Run all teacher assessment tests
pnpm test:e2e e2e/teacher/assessments

# Run specific test file
pnpm test:e2e e2e/teacher/assessments/create-assessment
pnpm test:e2e e2e/teacher/assessments/view-assessments
pnpm test:e2e e2e/teacher/assessments/edit-assessment

# Run with headed browser (debugging)
pnpm test:e2e --headed e2e/teacher/assessments

# Run specific test
pnpm test:e2e e2e/teacher/assessments --grep "should create a basic assessment"
```

---

## Prerequisites

- Teacher account in Supabase
- Questions available in Automaths
- At least one draft assessment (for edit tests)

See [full documentation](/docs/development/testing/e2e-teacher-tests.md#prerequisites) for details.

---

**For complete documentation, see [Teacher E2E Tests →](/docs/development/testing/e2e-teacher-tests.md)**
