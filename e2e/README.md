# Exercise Parameterization E2E Tests

**Author**: Claude Code
**Date**: 2025-10-27
**Status**: Complete - Ready for execution

---

## Overview

Comprehensive end-to-end test suite for the Exercise Parameterization feature using Playwright. Tests cover the complete user workflow from creating parameterized exercises to viewing instances with different distribution modes.

## Test Files

### Main Test Suite

- **File**: `/e2e/exercises-parameterization.spec.ts`
- **Tests**: 25 comprehensive scenarios
- **Coverage**: Teacher creation, student viewing, all distribution modes, validation, LaTeX, preview

### Helper Functions

- **File**: `/tests/helpers/exercise-helpers.ts`
- **Purpose**: Reusable utilities for exercise E2E tests
- **Functions**: Authentication, exercise creation, navigation, assertions, cleanup

---

## Test Coverage

### 1. Teacher Creates Parameterized Exercise (3 tests)

Tests teacher workflow for creating exercises with variables:

✅ **Basic Variables**

- Creates exercise with two simple variables (`{{1-10}}`)
- Sets distribution mode
- Fills statement and solution with `{{}}` syntax
- Verifies save success and redirect

✅ **Dependent Variables**

- Creates variables that reference each other
- Tests Pythagorean theorem with `{{eval:Math.sqrt(...)}}`
- Verifies dependency resolution

✅ **Update Existing Exercise**

- Edits existing parameterized exercise
- Adds new variables
- Updates statement
- Verifies changes saved

**Key Assertions**:

- Success message appears
- URL redirects to exercise view
- No template syntax in preview

---

### 2. Variable Syntax Helpers (3 tests)

Tests UI helper buttons for inserting variable syntax:

✅ **Insert Variable Reference**

- Clicks "Insert Variable" button
- Verifies `{{  }}` syntax inserted
- Tests typing variable name inside braces

✅ **Insert Random Syntax**

- Clicks "Insert Random" button
- Verifies `{{random:1-10}}` pattern inserted

✅ **Insert Eval Syntax**

- Clicks "Insert Eval" button
- Verifies `{{eval:}}` inserted
- Tests preview updates with evaluation

**Key Assertions**:

- Correct syntax inserted at cursor
- Preview updates after debounce (500ms)
- No template syntax in preview after resolution

---

### 3. Distribution Modes (3 tests)

Tests all three distribution modes with different seeding strategies:

✅ **On-Demand (Random)**

- Student views exercise multiple times
- Clicks "New Problem" to regenerate
- Verifies different values each time
- **Seeding**: Random each time

✅ **Per-Student (Deterministic)**

- Student views exercise
- Navigates away and back
- Verifies same values for same student
- **Seeding**: Based on student_id

✅ **Per-Group (Shared)**

- Two students in same group
- Both view exercise with same groupId
- Verifies identical values
- **Seeding**: Based on group_id/assignment_id

**Key Assertions**:

- On-demand: Values change on regenerate
- Per-student: Values consistent across sessions
- Per-group: Values identical for all group members

---

### 4. Variable Validation (4 tests)

Tests error handling and validation for invalid variable configurations:

✅ **Circular Dependencies**

- Creates variables: `a={{b}}`, `b={{a}}`
- Attempts to save
- Verifies error message contains "circular"

✅ **Undefined Variable Reference**

- Creates variable: `a={{undefined_var}}`
- Attempts to save
- Verifies error shows "undefined_var"

✅ **Invalid Range Syntax**

- Creates variable: `{{10-1}}` (min > max)
- Attempts to save
- Verifies validation error

✅ **Inline Validation on Blur**

- Types invalid expression
- Blurs input field
- Verifies inline error appears before save

**Key Assertions**:

- Error messages displayed
- Save blocked when invalid
- Inline validation provides immediate feedback

---

### 5. LaTeX with Variables (2 tests)

Tests variable resolution within LaTeX mathematical expressions:

✅ **Inline and Block Math**

- Creates exercise: `${{a}}x + {{b}} = 0$`
- Verifies numbers replace `{{}}` in rendered output
- Checks MathLive rendering

✅ **Complex LaTeX**

- Creates summation: `$$\sum_{i=1}^{ {{n}} } i^2$$`
- Verifies variable replaced in LaTeX
- No template syntax in rendered math

**Key Assertions**:

- MathLive `<math-field>` elements visible
- No `{{}}` syntax in rendered content
- Mathematical expressions display correctly

---

### 6. Teacher Preview Mode (3 tests)

Tests teacher-specific preview functionality:

✅ **Preview with Resolved Values**

- Teacher views exercise template
- Sees banner indicating template mode
- Views preview with one set of random values
- Variable values table visible

✅ **Preview with Different Values**

- Teacher clicks "Preview with Different Values"
- New random values generated
- Preview updates with new instance
- Values change (statistical check)

✅ **Variable Values Table**

- Creates exercise with 3 variables
- Views variable values table
- Verifies all variables listed
- Checks names and values displayed

**Key Assertions**:

- Template banner visible for teachers
- Preview shows resolved content
- Variable table shows all variables
- "Preview New Values" generates different instance

---

### 7. Solution Toggle (3 tests)

Tests solution visibility controls:

✅ **Hidden by Default**

- Student views exercise
- Solution content not visible
- "Show Solution" button visible

✅ **Show and Hide**

- Clicks "Show Solution"
- Solution becomes visible
- Clicks "Hide Solution"
- Solution hidden again

✅ **Solution Contains Resolved Variables**

- Shows solution
- Verifies no template syntax
- Checks computed values correct

**Key Assertions**:

- Solution initially hidden
- Toggle button works
- Solution has resolved variables
- No `{{}}` in solution text

---

### 8. Complex Expressions (4 tests)

Tests advanced variable features and mathematical operations:

✅ **Nested Eval Expressions**

- Creates chain: `product={{eval:a*b}}`, `doubled={{eval:product*2}}`
- Verifies all variables resolve correctly
- Checks mathematical accuracy

✅ **Mathematical Functions**

- Uses `Math.sqrt()`, `Math.log10()` in expressions
- Verifies functions execute
- Results appear in content

✅ **Exclusion Ranges**

- Creates variable: `{{1-10!5}}` (exclude 5)
- Generates 10 instances
- Verifies 5 never appears
- All values in range 1-10

✅ **Mathematical Verification**

- Creates: `c={{eval:a*b}}`
- Extracts a, b, c from rendered content
- Verifies `c === a * b`
- Tests mathematical correctness

**Key Assertions**:

- Nested expressions evaluate in order
- Math functions work correctly
- Exclusions respected
- Computed values mathematically accurate

---

## Running Tests

### Prerequisites

1. **Local Supabase running**:

   ```bash
   npx supabase start
   ```

2. **Test data seeded**:

   ```bash
   npx tsx tests/seed-test-data.ts
   ```

3. **Test users created** (teacher and student accounts)

4. **Environment variables** (`.env.test` or shell):
   ```bash
   TEST_TEACHER_EMAIL=teacher@voltairedoha.com
   TEST_TEACHER_PASSWORD=test-password
   TEST_STUDENT_EMAIL=student@voltairedoha.com
   TEST_STUDENT_PASSWORD=test-password
   ```

### Run All Exercise Tests

```bash
# Run all parameterization tests
pnpm test:e2e -- exercises-parameterization

# Run with visible browser (debug mode)
pnpm test:e2e -- exercises-parameterization --headed

# Run specific test suite
pnpm test:e2e -- exercises-parameterization -g "Distribution Modes"

# Run single test
pnpm test:e2e -- exercises-parameterization -g "on-demand allows students to regenerate"
```

### Run in Different Browsers

```bash
# Chromium (default)
pnpm test:e2e -- exercises-parameterization --project=chromium

# Firefox
pnpm test:e2e -- exercises-parameterization --project=firefox

# WebKit (Safari)
pnpm test:e2e -- exercises-parameterization --project=webkit
```

### Debug Failed Tests

```bash
# Run with debugger
pnpm test:e2e -- exercises-parameterization --debug

# Generate HTML report
pnpm test:e2e -- exercises-parameterization --reporter=html

# View report
npx playwright show-report
```

### Cleanup After Tests

```bash
# Run cleanup script
npx tsx tests/cleanup-test-data.ts

# Or manually delete test exercises in UI
```

---

## Test Data Requirements

### Test Users

The tests require two user accounts:

1. **Teacher Account**:
   - Email: `teacher@voltairedoha.com` (or env variable)
   - Password: `test-password` (or env variable)
   - Role: Teacher

2. **Student Account**:
   - Email: `student@voltairedoha.com` (or env variable)
   - Password: `test-password` (or env variable)
   - Role: Student

3. **Second Student** (for per-group tests):
   - Email: `student2@voltairedoha.com`
   - Password: `test-password`
   - Role: Student

### Database Setup

Tests create and delete exercises dynamically, but require:

- Supabase local instance running
- Migrations applied (`pnpm db:migrate`)
- RLS policies configured for test users

---

## Helper Functions Reference

### Authentication

```typescript
// Login as teacher
await loginAsTeacher(page, email, password);

// Login as student
await loginAsStudent(page, email, password);
```

### Exercise Creation

```typescript
// Create parameterized exercise
const exercise = await createParamExercise(page, {
	title: 'Test Exercise',
	variables: [{ name: 'x', expression: '{{1-10}}' }],
	statement_md: 'Value: {{x}}',
	solution_md: 'Answer: {{x}}',
	distribution_mode: 'per_student',
	difficulty: 1
});

// Create static exercise
const staticExercise = await createStaticExercise(page, {
	title: 'Static Exercise',
	statement_md: 'Calculate 2 + 3',
	solution_md: 'Answer: 5',
	difficulty: 1
});
```

### Navigation

```typescript
// Go to new exercise page
await gotoNewExercise(page);

// Go to edit exercise
await gotoEditExercise(page, exerciseId);

// Go to view exercise (student)
await gotoViewExercise(page, exerciseId);

// With group ID
await gotoViewExercise(page, exerciseId, groupId);
```

### Content Extraction

```typescript
// Get exercise content
const content = await getExerciseContent(page, '[data-testid="exercise-content"]');

// Extract numbers from text
const numbers = extractNumbers(content); // [7, 3, 10]

// Check for template syntax
const hasTemplates = hasTemplateSyntax(content); // false (good)
```

### Cleanup

```typescript
// Delete single exercise
await deleteExercise(page, exerciseId);

// Delete multiple exercises
await deleteExercises(page, [id1, id2, id3]);
```

---

## Test Selectors (data-testid)

The tests expect these `data-testid` attributes in the UI:

### Form Inputs

- `exercise-title` - Title input
- `difficulty` - Difficulty select
- `topic` - Topic input
- `distribution-mode` - Distribution mode select
- `statement-editor` - Statement textarea
- `solution-editor` - Solution textarea

### Variable Editor

- `add-variable` - Add variable button
- `variable-name-{index}` - Variable name input
- `variable-expression-{index}` - Variable expression input
- `variable-row` - Variable table row
- `variable-values` - Variable values table
- `variable-error-{index}` - Inline validation error

### Syntax Helpers

- `insert-variable` - Insert `{{}}` button
- `insert-random` - Insert `{{random:}}` button
- `insert-eval` - Insert `{{eval:}}` button

### Actions

- `save-exercise` - Save button
- `edit-exercise` - Edit button
- `regenerate-button` - New problem button
- `toggle-solution` - Show/hide solution button
- `preview-new-values` - Preview with new values button

### Content Display

- `exercise-content` - Main exercise content
- `exercise-statement` - Statement section
- `solution-content` - Solution section
- `template-banner` - Template mode banner

### Messages

- `success-message` - Success toast
- `error-message` - Error toast

---

## Troubleshooting

### Tests Fail with "Element not found"

**Cause**: Selectors don't match UI implementation

**Fix**:

1. Check that `data-testid` attributes are added to components
2. Verify selector names match test expectations
3. Use `await page.pause()` to inspect DOM

### Tests Fail with Authentication Error

**Cause**: Test users don't exist or wrong credentials

**Fix**:

1. Verify test user accounts created in Supabase
2. Check environment variables set correctly
3. Confirm passwords match

### Tests Timeout

**Cause**: Slow network or database queries

**Fix**:

1. Increase timeout: `test.setTimeout(90000)` (90 seconds)
2. Check Supabase is running locally (not remote)
3. Add more `waitFor` calls for async operations

### Variable Values Don't Change

**Cause**: Caching or deterministic seeding

**Fix**:

1. For `on_demand` tests, verify mode is set correctly
2. Check regenerate button clicks are registered
3. Add `await page.waitForTimeout(300)` after regenerate

### LaTeX Not Rendering

**Cause**: MathLive not loaded or math syntax incorrect

**Fix**:

1. Wait for `<math-field>` elements: `await page.waitForSelector('math-field')`
2. Check LaTeX syntax is valid
3. Verify MathLive script loaded in app

### Per-Group Tests Fail

**Cause**: Second student account doesn't exist

**Fix**:

1. Create `student2@voltairedoha.com` account
2. Ensure both students have same role
3. Verify groupId parameter passed correctly

---

## CI/CD Integration

### GitHub Actions Workflow

Add to `.github/workflows/test-exercises.yml`:

```yaml
name: Test Exercise Parameterization

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e-exercises:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start Supabase
        uses: supabase/setup-cli@v1

      - name: Run Supabase locally
        run: npx supabase start

      - name: Seed test data
        run: npx tsx tests/seed-test-data.ts
        env:
          PUBLIC_SUPABASE_URL: http://localhost:54321
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

      - name: Run E2E tests
        run: pnpm test:e2e -- exercises-parameterization
        env:
          TEST_TEACHER_EMAIL: teacher@test.com
          TEST_TEACHER_PASSWORD: test-password
          TEST_STUDENT_EMAIL: student@test.com
          TEST_STUDENT_PASSWORD: test-password

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

      - name: Cleanup
        if: always()
        run: npx tsx tests/cleanup-test-data.ts
```

---

## Test Maintenance

### Adding New Tests

1. **Choose appropriate test suite** (or create new `describe` block)
2. **Follow naming convention**: `test('should do something', async ({ page }) => {...})`
3. **Use helper functions** from `/tests/helpers/exercise-helpers.ts`
4. **Always cleanup**: Delete created exercises with `deleteExercise(page, id)`
5. **Add assertions**: Use `expect()` for all verifications
6. **Document**: Add comments explaining complex test logic

### Updating Tests After UI Changes

1. **Check selectors**: Update `data-testid` attributes if components change
2. **Update helpers**: Modify helper functions if API changes
3. **Re-run tests**: Verify all tests pass after changes
4. **Update docs**: Keep this README in sync with test changes

### Performance Optimization

- Use `page.request.post()` for API calls instead of UI interactions
- Parallelize independent tests
- Cache authenticated sessions when possible
- Use `--workers` flag to run tests in parallel:
  ```bash
  pnpm test:e2e -- exercises-parameterization --workers=4
  ```

---

## Test Statistics

- **Total Tests**: 25 comprehensive scenarios
- **Test Files**: 1 main spec file
- **Helper Functions**: 15+ reusable utilities
- **Coverage Areas**: 8 major feature areas
- **Estimated Runtime**: 5-8 minutes (sequential)
- **Browsers Tested**: Chromium, Firefox, WebKit

---

## Related Documentation

- [Parameterization System Overview](/docs/architecture/parameterization-system.md)
- [Exercise Types Guide](/docs/features/exercises/parameterization-types-guide.md)
- [Instance Generator](/docs/features/exercises/INSTANCE_GENERATOR.md)
- [Shared Parameterization Library](/src/lib/shared/parameterization/README.md)
- [Playwright Documentation](https://playwright.dev/)

---

## Support

For questions or issues with these tests:

1. Check this README first
2. Review test code comments
3. Inspect failed test screenshots in `playwright-report/`
4. Check Playwright trace viewer: `npx playwright show-trace trace.zip`

---

**Last Updated**: 2025-10-27
**Maintained By**: Development Team
**Status**: Production Ready ✅
