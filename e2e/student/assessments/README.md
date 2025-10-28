# Student Assessment E2E Tests

56 comprehensive tests covering student assessment features.

**Status**: ✅ Ready to run

---

## 📚 Full Documentation

**[Student Assessment E2E Tests →](/docs/development/testing/e2e-student-tests.md)**

Complete documentation with test details, helper functions, and troubleshooting.

---

## Quick Links

- **View assessments** (16 tests) - `view-assessments.spec.ts`
  - Assessment list with status badges
  - Section organization (To Do, Completed, Expired)
  - Action buttons (Start, Continue, View Results)
  - Score display and attempts info

- **Take assessment** (16 tests) - `take-assessment.spec.ts`
  - Start and navigate to test page
  - Answer different question types
  - Question navigation and progress
  - Timer functionality
  - Assessment submission and auto-save

- **View results** (24 tests) - `view-results.spec.ts`
  - Score display and color coding
  - Attempts history table
  - Best/average score cards
  - Question review (if enabled)
  - Retake functionality

---

## Run Tests

```bash
# Run all student assessment tests
pnpm test:e2e e2e/student/assessments

# Run specific test file
pnpm test:e2e e2e/student/assessments/view-assessments
pnpm test:e2e e2e/student/assessments/take-assessment
pnpm test:e2e e2e/student/assessments/view-results

# Run with headed browser (debugging)
pnpm test:e2e --headed e2e/student/assessments

# Run specific test
pnpm test:e2e e2e/student/assessments --grep "should start assessment successfully"
```

---

## Prerequisites

- Student account in Supabase
- At least one assessment assigned to test student
- Mix of assessment states (not started, in-progress, completed)

See [full documentation](/docs/development/testing/e2e-student-tests.md#prerequisites) for details.

---

**For complete documentation, see [Student E2E Tests →](/docs/development/testing/e2e-student-tests.md)**
