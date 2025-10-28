# Student Assessment E2E Tests

Comprehensive end-to-end tests for student assessment features in UbuMaths.

---

## Overview

This test suite covers the complete student assessment workflow:

1. **Viewing assessments** - List of assigned assessments with status
2. **Taking assessments** - Complete assessment flow with answer submission
3. **Viewing results** - Detailed results, attempts history, and score breakdown

---

## Test Files

### 1. `view-assessments.spec.ts` (16 tests)

Tests the student assessment list view functionality:

**Coverage**:

- ✅ **Page Loading**: Verify page loads with correct header and subtitle
- ✅ **Empty States**: Handle no assessments scenario
- ✅ **Assessment Display**: Show assigned assessments with correct information
- ✅ **Section Organization**: Group by status (To Do, Completed, Expired)
- ✅ **Status Badges**: Display appropriate status for each assessment
- ✅ **Assessment Information**: Title, grade, deadline, attempts, question count
- ✅ **Action Buttons**:
  - "Commencer" for not started assessments
  - "Reprendre" for in-progress assessments
  - "Voir les résultats" for completed assessments
  - Disabled button for expired assessments
- ✅ **Score Display**: Show score on completed assessments
- ✅ **Attempts Info**: Display attempts count and remaining attempts
- ✅ **Layout**: Grid layout responsiveness
- ✅ **Navigation**: Click actions navigate to appropriate pages
- ✅ **Sorting**: Proper section ordering (To Do → Completed → Expired)

**Key Test Scenarios**:

- Loading and displaying assigned assessments
- Status-based filtering and organization
- Empty state handling
- Action button visibility and functionality
- Navigation to take/resume/view results pages

### 2. `take-assessment.spec.ts` (16 tests)

Tests the assessment taking functionality:

**Coverage**:

- ✅ **Start Assessment**: Navigate from list to test page
- ✅ **Assessment Info**: Display title and progress
- ✅ **Question Display**: Show question statement and answer options
- ✅ **Answer Questions**:
  - Multiple choice (click choice)
  - Text input (type answer)
  - Math input (MathLive integration)
- ✅ **Navigation**:
  - Submit and advance to next question
  - Skip questions without answering
  - Question navigation menu (if available)
- ✅ **Progress**: Update progress bar as questions answered
- ✅ **Timer**: Display and countdown timer (if timed)
- ✅ **Complete Assessment**: Submit after all questions
- ✅ **Submit Button**: Show on last question
- ✅ **Back Button**: Warning when leaving in progress
- ✅ **Auto-save**: Preserve progress after reload
- ✅ **Network Errors**: Handle submission failures gracefully

**Key Test Scenarios**:

- Starting a new assessment
- Answering different question types
- Question navigation and progress tracking
- Timer functionality (if timed)
- Assessment submission
- Progress persistence
- Error handling

### 3. `view-results.spec.ts` (24 tests)

Tests the assessment results viewing functionality:

**Coverage**:

- ✅ **Navigation**: Navigate from completed assessment to results page
- ✅ **Display**:
  - Assessment title
  - Score (on 10 scale)
  - Best score card
  - Average score card
  - Attempts count
  - Total questions
- ✅ **Attempts History**:
  - Table with date, score, questions, duration, status
  - "Plus récent" badge on most recent attempt
  - Correct column headers
  - Data rows with proper formatting
- ✅ **Score Color Coding**:
  - Green for ≥8/10
  - Yellow for 5-7.9/10
  - Red for <5/10
- ✅ **Actions**:
  - Back button to assessments list
  - Retake button (if retakes allowed)
  - Max attempts message (if limit reached)
- ✅ **Question Review** (if show_solutions enabled):
  - Correct/incorrect indicators
  - Explanations and corrections
- ✅ **Empty States**: Handle no attempts scenario
- ✅ **Error Handling**: Invalid assessment ID
- ✅ **Loading State**: Graceful loading
- ✅ **Layout**: Responsive grid with stat cards

**Key Test Scenarios**:

- Viewing assessment results
- Score display and color coding
- Attempts history with proper formatting
- Question review (if enabled)
- Retake functionality
- Error handling for invalid assessments

---

## Test Statistics

- **Total Tests**: 56 unique test cases
- **Total Test Runs**: 168 (56 tests × 3 browsers)
- **Lines of Code**: ~2,026 lines
- **Test Coverage**:
  - View assessments: 16 tests
  - Take assessment: 16 tests
  - View results: 24 tests

---

## Running Tests

### Run All Student Assessment Tests

```bash
pnpm test:e2e e2e/student/assessments/
```

### Run Specific Test File

```bash
pnpm test:e2e e2e/student/assessments/view-assessments.spec.ts
pnpm test:e2e e2e/student/assessments/take-assessment.spec.ts
pnpm test:e2e e2e/student/assessments/view-results.spec.ts
```

### Run with Headed Browser (Debugging)

```bash
pnpm test:e2e --headed e2e/student/assessments/view-assessments.spec.ts
```

### Run Specific Test

```bash
pnpm test:e2e --grep "should start assessment successfully"
```

---

## Test Requirements

### Prerequisites

1. **Environment Variables**:
   - `TEST_STUDENT_EMAIL`: Valid student email
   - `TEST_STUDENT_PASSWORD`: Valid student password

2. **Test Data**:
   - At least one student account in database
   - At least one assessment assigned to test student
   - Mix of assessment states for comprehensive testing:
     - Not started assessments
     - In-progress assessments
     - Completed assessments (with attempts)
     - Expired assessments (optional)

3. **Server**:
   ```bash
   pnpm dev -- --port 5175
   ```

### Test Data Setup

For comprehensive test coverage, ensure test database has:

**Assessments**:

- Different grades (6eme, 5eme, 4eme, 3eme)
- Varying question counts (3-10 questions recommended)
- Mix of question types (multiple choice, text input, math input)
- Different settings:
  - Timed vs untimed
  - Max attempts vs unlimited
  - With/without deadlines
  - Show solutions enabled/disabled

**Student Account**:

- Assigned to multiple assessments
- Has completed at least one assessment (multiple attempts ideal)
- Has at least one assessment not yet started
- Has at least one in-progress assessment (optional)

---

## Test Architecture

### Helper Functions

Each test file includes comprehensive helper functions:

- **Navigation helpers**: Navigate to pages and wait for loading
- **Interaction helpers**: Answer questions, click buttons
- **Assertion helpers**: Check scores, counts, states
- **Data extraction helpers**: Get assessment info, progress, results

### Conditional Testing

Tests use `test.skip()` to gracefully handle missing features:

```typescript
test.skip(!navigated, 'No assessments available');
test.skip(count === 0, 'No completed assessments');
```

This allows tests to pass even when optional features aren't present.

### Best Practices

- **Wait for elements**: Use `waitForSelector()` and `waitForLoadState()`
- **Timeout handling**: All visibility checks have explicit timeouts
- **Error handling**: Tests handle network failures and missing data
- **Cross-browser**: Tests run on Chromium, Firefox, and WebKit
- **TypeScript**: Fully typed with proper interfaces
- **ESLint compliant**: No errors, follows project conventions

---

## Test Coverage Report

| Feature Area         | Tests  | Status          |
| -------------------- | ------ | --------------- |
| Assessment List View | 16     | ✅ Complete     |
| Take Assessment      | 16     | ✅ Complete     |
| View Results         | 24     | ✅ Complete     |
| **Total**            | **56** | **✅ Complete** |

---

## Known Limitations

1. **MathLive Testing**: MathLive input testing is conditional - tests check for presence before interacting

2. **Network Mocking**: Some tests mock network failures to test error handling

3. **Test Data Dependency**: Tests require specific data setup (see Test Requirements)

4. **Browser-specific Features**: Some features may behave differently across browsers

---

## Future Enhancements

- Add tests for assessment retakes with different settings
- Test real-time collaboration features (if implemented)
- Test assessment analytics and insights
- Test question randomization and shuffling
- Test time limit enforcement and auto-submit
- Test offline mode and sync

---

## Troubleshooting

### Tests Failing with "No assessments available"

**Cause**: Test student has no assigned assessments.

**Solution**:

- Ensure test student has assigned assessments
- Check assessment status in database
- Verify assignment dates are valid

### Tests Timeout on Question Loading

**Cause**: Questions not loading properly.

**Solution**:

- Check that question templates are available
- Verify assessment categories are valid
- Increase timeout in test configuration

### MathLive Tests Failing

**Cause**: MathLive may not load in certain environments.

**Solution**:

- MathLive tests should skip gracefully if not present
- Check browser compatibility with MathLive
- Verify MathLive scripts are loaded

### Network Error Tests Not Working

**Cause**: Route interception not configured correctly.

**Solution**:

- Verify route interception is working
- Check that API endpoints match mock patterns
- Ensure error handling is implemented in application

---

## Maintenance

When updating student assessment features:

1. Update corresponding test files
2. Add new tests for new features
3. Update helper functions if UI changes
4. Update test data requirements in this documentation
5. Run full test suite to ensure no regressions

---

## Related Documentation

- **[E2E Testing Guide](e2e-testing-guide.md)** - Master guide for all e2e tests
- **[Auth Tests](e2e-auth-tests.md)** - Authentication & authorization tests
- **[Teacher Tests](e2e-teacher-tests.md)** - Teacher assessment tests
- **[Testing Overview](README.md)** - Complete testing documentation
- **Auth Helpers**: `/e2e/helpers/auth-helpers.ts`
- **Assessment Architecture**: `/docs/features/assessments/`
- **Component Documentation**: `/docs/architecture/components.md`

---

**Test Files**:

- `/e2e/student/assessments/view-assessments.spec.ts` (16 tests)
- `/e2e/student/assessments/take-assessment.spec.ts` (16 tests)
- `/e2e/student/assessments/view-results.spec.ts` (24 tests)

**Total**: 56 student assessment tests
**Status**: ✅ Complete and production-ready
**Last Updated**: 2025-10-28
**Author**: Claude Code
**Test Framework**: Playwright
