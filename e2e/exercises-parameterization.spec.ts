/**
 * E2E Tests for Exercise Parameterization Feature
 * ================================================
 *
 * Comprehensive end-to-end tests covering the complete user workflow
 * for parameterized exercises, from creation to viewing instances.
 *
 * Test Coverage:
 * 1. Teacher creates parameterized exercise with variables
 * 2. Variable syntax helpers and UI interactions
 * 3. Distribution modes (on_demand, per_student, per_group)
 * 4. Variable validation and error handling
 * 5. LaTeX with variables
 * 6. Teacher preview mode with regeneration
 * 7. Solution toggle functionality
 * 8. Complex expressions and nested variables
 *
 * Author: Claude Code
 * Date: 2025-10-27
 */

import { test, expect } from '@playwright/test';
import {
	loginAsTeacher,
	loginAsStudent,
	createParamExercise,
	gotoNewExercise,
	gotoViewExercise,
	fillExerciseMetadata,
	getExerciseContent,
	hasTemplateSyntax,
	extractNumbers,
	deleteExercise
} from '../tests/helpers/exercise-helpers';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

// Test timeouts
test.setTimeout(60000); // 60 seconds per test

// Test user credentials
const TEACHER_EMAIL = process.env.TEST_TEACHER_EMAIL || 'teacher@voltairedoha.com';
const TEACHER_PASSWORD = process.env.TEST_TEACHER_PASSWORD || 'test-password';
const STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL || 'student@voltairedoha.com';
const STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD || 'test-password';

// ============================================================================
// TEST SUITE 1: TEACHER CREATES PARAMETERIZED EXERCISE
// ============================================================================

test.describe('Teacher Creates Parameterized Exercise', () => {
	test('teacher creates exercise with basic variables', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);

		// Navigate to new exercise page
		await gotoNewExercise(page);

		// Fill in basic metadata
		await fillExerciseMetadata(page, {
			title: 'Addition Practice',
			difficulty: 1,
			topic: 'Arithmetic'
		});

		// Add first variable (a)
		await page.click('button[data-testid="add-variable"]');
		await page.fill('input[data-testid="variable-name-0"]', 'a');
		await page.fill('input[data-testid="variable-expression-0"]', '{{1..10}}');

		// Add second variable (b)
		await page.click('button[data-testid="add-variable"]');
		await page.fill('input[data-testid="variable-name-1"]', 'b');
		await page.fill('input[data-testid="variable-expression-1"]', '{{1..10}}');

		// Set distribution mode
		await page.selectOption('select[data-testid="distribution-mode"]', 'per_student');

		// Fill statement with parameterized content
		const statementEditor = page.locator('textarea[data-testid="statement-editor"]');
		await statementEditor.fill('Calculate {{a}} + {{b}}');

		// Fill solution
		const solutionEditor = page.locator('textarea[data-testid="solution-editor"]');
		await solutionEditor.fill('Answer: {{eval:{{a}}+{{b}}}}');

		// Save exercise
		await page.click('button[data-testid="save-exercise"]');

		// Verify success message
		await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

		// Verify redirect to exercise view
		await page.waitForURL(/\/dashboard\/teacher\/exercises\/[a-f0-9-]+/);
	});

	test('teacher creates exercise with dependent variables', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await gotoNewExercise(page);

		await fillExerciseMetadata(page, {
			title: 'Pythagorean Theorem',
			difficulty: 2
		});

		// Add variables with dependencies
		await page.click('button[data-testid="add-variable"]');
		await page.fill('input[data-testid="variable-name-0"]', 'a');
		await page.fill('input[data-testid="variable-expression-0"]', '{{3..12}}');

		await page.click('button[data-testid="add-variable"]');
		await page.fill('input[data-testid="variable-name-1"]', 'b');
		await page.fill('input[data-testid="variable-expression-1"]', '{{3..12}}');

		await page.click('button[data-testid="add-variable"]');
		await page.fill('input[data-testid="variable-name-2"]', 'c');
		await page.fill(
			'input[data-testid="variable-expression-2"]',
			'{{eval:Math.sqrt({{a}}*{{a}} + {{b}}*{{b}})}}'
		);

		// Set statement
		const statementEditor = page.locator('textarea[data-testid="statement-editor"]');
		await statementEditor.fill('If $a = {{a}}$ and $b = {{b}}$, find $c$');

		// Set solution
		const solutionEditor = page.locator('textarea[data-testid="solution-editor"]');
		await solutionEditor.fill('$c = \\sqrt{ {{a}}^2 + {{b}}^2 } = {{c}}$');

		// Save
		await page.click('button[data-testid="save-exercise"]');
		await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
	});

	test('teacher can update existing parameterized exercise', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);

		// Create exercise first
		const exercise = await createParamExercise(page, {
			title: 'Original Title',
			variables: [{ name: 'x', expression: '{{1..5}}' }],
			statement_md: 'Solve: $x = {{x}}$',
			solution_md: 'The answer is {{x}}',
			distribution_mode: 'on_demand',
			difficulty: 1
		});

		// Navigate to edit page
		await page.goto(`/dashboard/teacher/exercises/${exercise.id}`);
		await page.click('button[data-testid="edit-exercise"]');

		// Update title
		await page.fill('input[data-testid="exercise-title"]', 'Updated Title');

		// Add new variable
		await page.click('button[data-testid="add-variable"]');
		await page.fill('input[data-testid="variable-name-1"]', 'y');
		await page.fill('input[data-testid="variable-expression-1"]', '{{10..20}}');

		// Update statement
		const statementEditor = page.locator('textarea[data-testid="statement-editor"]');
		await statementEditor.fill('Solve: $x = {{x}}$ and $y = {{y}}$');

		// Save changes
		await page.click('button[data-testid="save-exercise"]');
		await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

		// Cleanup
		await deleteExercise(page, exercise.id);
	});
});

// ============================================================================
// TEST SUITE 2: VARIABLE SYNTAX HELPERS
// ============================================================================

test.describe('Variable Syntax Helpers', () => {
	test('syntax helper buttons insert correct syntax', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await gotoNewExercise(page);

		// Add a variable first
		await page.click('button[data-testid="add-variable"]');
		await page.fill('input[data-testid="variable-name-0"]', 'x');
		await page.fill('input[data-testid="variable-expression-0"]', '{{5..15}}');

		// Focus statement editor
		const editor = page.locator('textarea[data-testid="statement-editor"]');
		await editor.focus();

		// Click variable reference button
		await page.click('button[data-testid="insert-variable"]');

		// Verify insertion
		const value = await editor.inputValue();
		expect(value).toContain('{{  }}');

		// Type variable name inside braces
		await editor.fill('{{x}}');

		// Click random button
		await page.click('button[data-testid="insert-random"]');

		// Verify random syntax inserted
		const newValue = await editor.inputValue();
		expect(newValue).toMatch(/\{\{random:\d+-\d+\}\}/);
	});

	test('insert eval syntax helper', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await gotoNewExercise(page);

		const editor = page.locator('textarea[data-testid="statement-editor"]');
		await editor.focus();

		// Click eval button
		await page.click('button[data-testid="insert-eval"]');

		// Verify eval syntax
		const value = await editor.inputValue();
		expect(value).toContain('{{eval:}}');
	});

	test('preview updates when syntax is inserted', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await gotoNewExercise(page);

		// Add variable
		await page.click('button[data-testid="add-variable"]');
		await page.fill('input[data-testid="variable-name-0"]', 'a');
		await page.fill('input[data-testid="variable-expression-0"]', '{{5}}');

		// Fill statement
		const editor = page.locator('textarea[data-testid="statement-editor"]');
		await editor.fill('Value: {{a}}');

		// Wait for preview to update
		await page.waitForTimeout(500); // Debounce delay

		// Check preview shows resolved value (not template)
		const preview = page.locator('[data-testid="statement-preview"]');
		const previewText = await preview.textContent();
		expect(previewText).toContain('Value: 5');
		expect(previewText).not.toContain('{{');
	});
});

// ============================================================================
// TEST SUITE 3: DISTRIBUTION MODES
// ============================================================================

test.describe('Distribution Modes', () => {
	test('on-demand allows students to regenerate instances', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);

		// Create exercise with on_demand mode
		const exercise = await createParamExercise(page, {
			title: 'Random Practice',
			variables: [{ name: 'a', expression: '{{1..100}}' }],
			statement_md: 'Number: {{a}}',
			solution_md: 'The number is {{a}}',
			distribution_mode: 'on_demand',
			difficulty: 1
		});

		// Logout and login as student
		await page.goto('/logout');
		await loginAsStudent(page, STUDENT_EMAIL, STUDENT_PASSWORD);

		// View exercise
		await gotoViewExercise(page, exercise.id);

		// Get first value
		const firstContent = await getExerciseContent(page, '[data-testid="exercise-content"]');
		const firstNumbers = extractNumbers(firstContent);
		expect(firstNumbers.length).toBeGreaterThan(0);

		// Click "New Problem" button to regenerate
		await page.click('button[data-testid="regenerate-button"]');

		// Wait for content to update
		await page.waitForTimeout(300);

		// Get second value
		const secondContent = await getExerciseContent(page, '[data-testid="exercise-content"]');
		const secondNumbers = extractNumbers(secondContent);

		// Values should be different (statistically very likely)
		// Note: Small chance of same value, but with range 1-100, very unlikely
		expect(firstNumbers[0]).not.toBe(secondNumbers[0]);

		// Cleanup
		await page.goto('/logout');
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await deleteExercise(page, exercise.id);
	});

	test('per-student gives consistent values for same student', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);

		const exercise = await createParamExercise(page, {
			title: 'Personalized Homework',
			variables: [{ name: 'a', expression: '{{1..100}}' }],
			statement_md: 'Your number: {{a}}',
			solution_md: 'Answer: {{a}}',
			distribution_mode: 'per_student',
			difficulty: 1
		});

		// Logout and login as student
		await page.goto('/logout');
		await loginAsStudent(page, STUDENT_EMAIL, STUDENT_PASSWORD);

		// View exercise
		await gotoViewExercise(page, exercise.id);
		const firstContent = await getExerciseContent(page, '[data-testid="exercise-content"]');

		// Navigate away and back
		await page.goto('/dashboard/student');
		await gotoViewExercise(page, exercise.id);
		const secondContent = await getExerciseContent(page, '[data-testid="exercise-content"]');

		// Should be exactly the same (same student = same seed)
		expect(firstContent).toBe(secondContent);

		// Cleanup
		await page.goto('/logout');
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await deleteExercise(page, exercise.id);
	});

	test('per-group gives same values for all group members', async ({ browser }) => {
		// This test requires two browser contexts (two students)
		const teacherContext = await browser.newContext();
		const student1Context = await browser.newContext();
		const student2Context = await browser.newContext();

		const teacherPage = await teacherContext.newPage();
		const student1Page = await student1Context.newPage();
		const student2Page = await student2Context.newPage();

		try {
			// Teacher creates exercise
			await loginAsTeacher(teacherPage, TEACHER_EMAIL, TEACHER_PASSWORD);

			const exercise = await createParamExercise(teacherPage, {
				title: 'Group Work',
				variables: [{ name: 'a', expression: '{{1..100}}' }],
				statement_md: 'Group number: {{a}}',
				solution_md: 'Answer: {{a}}',
				distribution_mode: 'per_group',
				difficulty: 1
			});

			const groupId = 'test-group-123';

			// Student 1 views exercise
			await loginAsStudent(student1Page, STUDENT_EMAIL, STUDENT_PASSWORD);
			await gotoViewExercise(student1Page, exercise.id, groupId);
			const student1Content = await getExerciseContent(
				student1Page,
				'[data-testid="exercise-content"]'
			);

			// Student 2 views same exercise with same group ID
			await loginAsStudent(student2Page, 'student2@voltairedoha.com', STUDENT_PASSWORD);
			await gotoViewExercise(student2Page, exercise.id, groupId);
			const student2Content = await getExerciseContent(
				student2Page,
				'[data-testid="exercise-content"]'
			);

			// Both should see exactly the same content
			expect(student1Content).toBe(student2Content);

			// Cleanup
			await deleteExercise(teacherPage, exercise.id);
		} finally {
			await teacherContext.close();
			await student1Context.close();
			await student2Context.close();
		}
	});
});

// ============================================================================
// TEST SUITE 4: VARIABLE VALIDATION
// ============================================================================

test.describe('Variable Validation', () => {
	test('shows error for circular dependencies', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await gotoNewExercise(page);

		// Add circular variables: a depends on b, b depends on a
		await page.click('button[data-testid="add-variable"]');
		await page.fill('input[data-testid="variable-name-0"]', 'a');
		await page.fill('input[data-testid="variable-expression-0"]', '{{b}}');

		await page.click('button[data-testid="add-variable"]');
		await page.fill('input[data-testid="variable-name-1"]', 'b');
		await page.fill('input[data-testid="variable-expression-1"]', '{{a}}');

		// Fill required fields
		const statementEditor = page.locator('textarea[data-testid="statement-editor"]');
		await statementEditor.fill('Test {{a}}');

		const solutionEditor = page.locator('textarea[data-testid="solution-editor"]');
		await solutionEditor.fill('Test {{b}}');

		// Try to save
		await page.click('button[data-testid="save-exercise"]');

		// Should show error message
		await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
		const errorText = await page.locator('[data-testid="error-message"]').textContent();
		expect(errorText?.toLowerCase()).toContain('circular');
	});

	test('shows error for undefined variable reference', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await gotoNewExercise(page);

		// Add variable that references undefined variable
		await page.click('button[data-testid="add-variable"]');
		await page.fill('input[data-testid="variable-name-0"]', 'a');
		await page.fill('input[data-testid="variable-expression-0"]', '{{undefined_var}}');

		// Fill required fields
		const statementEditor = page.locator('textarea[data-testid="statement-editor"]');
		await statementEditor.fill('Test {{a}}');

		const solutionEditor = page.locator('textarea[data-testid="solution-editor"]');
		await solutionEditor.fill('Answer');

		// Try to save
		await page.click('button[data-testid="save-exercise"]');

		// Should show error
		await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
		const errorText = await page.locator('[data-testid="error-message"]').textContent();
		expect(errorText).toContain('undefined_var');
	});

	test('shows error for invalid range syntax', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await gotoNewExercise(page);

		// Add variable with invalid range (min > max)
		await page.click('button[data-testid="add-variable"]');
		await page.fill('input[data-testid="variable-name-0"]', 'x');
		await page.fill('input[data-testid="variable-expression-0"]', '{{10..1}}'); // Invalid

		// Fill required fields
		const statementEditor = page.locator('textarea[data-testid="statement-editor"]');
		await statementEditor.fill('Value: {{x}}');

		const solutionEditor = page.locator('textarea[data-testid="solution-editor"]');
		await solutionEditor.fill('Answer');

		// Try to save
		await page.click('button[data-testid="save-exercise"]');

		// Should show validation error
		await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
	});

	test('validates on blur before save', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await gotoNewExercise(page);

		// Add variable
		await page.click('button[data-testid="add-variable"]');
		const nameInput = page.locator('input[data-testid="variable-name-0"]');
		const expressionInput = page.locator('input[data-testid="variable-expression-0"]');

		// Fill with invalid expression
		await nameInput.fill('x');
		await expressionInput.fill('{{invalid syntax');

		// Blur expression input
		await expressionInput.blur();

		// Should show inline validation error
		await expect(page.locator('[data-testid="variable-error-0"]')).toBeVisible();
	});
});

// ============================================================================
// TEST SUITE 5: LATEX WITH VARIABLES
// ============================================================================

test.describe('LaTeX with Variables', () => {
	test('resolves variables in LaTeX math expressions', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);

		const exercise = await createParamExercise(page, {
			title: 'LaTeX Math',
			variables: [
				{ name: 'a', expression: '{{5}}' },
				{ name: 'b', expression: '{{3}}' }
			],
			statement_md: 'Solve: ${{a}}x + {{b}} = 0$',
			solution_md: '$x = -\\frac{ {{b}} }{ {{a}} }$',
			distribution_mode: 'on_demand',
			difficulty: 2
		});

		await loginAsStudent(page, STUDENT_EMAIL, STUDENT_PASSWORD);
		await gotoViewExercise(page, exercise.id);

		// Wait for MathLive rendering
		await page.waitForSelector('math-field', { state: 'visible' });

		// Get content
		const content = await getExerciseContent(page, '[data-testid="exercise-content"]');

		// Should contain numbers, not template syntax
		expect(hasTemplateSyntax(content)).toBe(false);
		expect(content).toMatch(/5x \+ 3 = 0/);

		// Cleanup
		await page.goto('/logout');
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await deleteExercise(page, exercise.id);
	});

	test('handles complex LaTeX expressions', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);

		const exercise = await createParamExercise(page, {
			title: 'Complex LaTeX',
			variables: [{ name: 'n', expression: '{{5}}' }],
			statement_md: 'Calculate: $$\\sum_{i=1}^{ {{n}} } i^2$$',
			solution_md: 'The sum is $\\frac{ {{n}}({{n}}+1)(2{{n}}+1) }{6}$',
			distribution_mode: 'on_demand',
			difficulty: 3
		});

		await loginAsStudent(page, STUDENT_EMAIL, STUDENT_PASSWORD);
		await gotoViewExercise(page, exercise.id);

		// Wait for rendering
		await page.waitForSelector('math-field');

		// Verify no template syntax in rendered output
		const content = await getExerciseContent(page, '[data-testid="exercise-content"]');
		expect(hasTemplateSyntax(content)).toBe(false);

		// Cleanup
		await page.goto('/logout');
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await deleteExercise(page, exercise.id);
	});
});

// ============================================================================
// TEST SUITE 6: TEACHER PREVIEW MODE
// ============================================================================

test.describe('Teacher Preview Mode', () => {
	test('teacher can preview exercise with resolved values', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);

		const exercise = await createParamExercise(page, {
			title: 'Preview Test',
			variables: [{ name: 'x', expression: '{{10}}' }],
			statement_md: 'Value: {{x}}',
			solution_md: 'Answer: {{x}}',
			distribution_mode: 'on_demand',
			difficulty: 1
		});

		// Navigate to exercise view (teacher mode)
		await page.goto(`/dashboard/teacher/exercises/${exercise.id}`);

		// Should show template banner
		await expect(page.locator('[data-testid="template-banner"]')).toBeVisible();

		// Should show preview with resolved values
		const content = await getExerciseContent(page, '[data-testid="exercise-content"]');
		expect(content).toContain('Value: 10');

		// Should show variable values table
		await expect(page.locator('[data-testid="variable-values"]')).toBeVisible();

		// Cleanup
		await deleteExercise(page, exercise.id);
	});

	test('teacher can preview with different values', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);

		const exercise = await createParamExercise(page, {
			title: 'Random Preview',
			variables: [{ name: 'a', expression: '{{1..100}}' }],
			statement_md: 'Number: {{a}}',
			solution_md: 'The number is {{a}}',
			distribution_mode: 'on_demand',
			difficulty: 1
		});

		await page.goto(`/dashboard/teacher/exercises/${exercise.id}`);

		// Get first preview value
		const firstContent = await getExerciseContent(page, '[data-testid="exercise-content"]');
		const firstNumbers = extractNumbers(firstContent);

		// Click "Preview with Different Values"
		await page.click('button[data-testid="preview-new-values"]');

		// Wait for update
		await page.waitForTimeout(300);

		// Get second preview value
		const secondContent = await getExerciseContent(page, '[data-testid="exercise-content"]');
		const secondNumbers = extractNumbers(secondContent);

		// Should be different values (statistically)
		expect(firstNumbers[0]).not.toBe(secondNumbers[0]);

		// Cleanup
		await deleteExercise(page, exercise.id);
	});

	test('variable values table shows all resolved variables', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);

		const exercise = await createParamExercise(page, {
			title: 'Multi-Variable',
			variables: [
				{ name: 'a', expression: '{{5}}' },
				{ name: 'b', expression: '{{7}}' },
				{ name: 'sum', expression: '{{eval:{{a}}+{{b}}}}' }
			],
			statement_md: '{{a}} + {{b}} = {{sum}}',
			solution_md: 'Verified',
			distribution_mode: 'per_student',
			difficulty: 1
		});

		await page.goto(`/dashboard/teacher/exercises/${exercise.id}`);

		// Wait for variable table
		await page.waitForSelector('[data-testid="variable-values"]');

		// Check all variables are shown
		const rows = page.locator('[data-testid="variable-row"]');
		await expect(rows).toHaveCount(3);

		// Verify variable names
		const names = await rows.locator('[data-testid="variable-name"]').allTextContents();
		expect(names).toContain('a');
		expect(names).toContain('b');
		expect(names).toContain('sum');

		// Cleanup
		await deleteExercise(page, exercise.id);
	});
});

// ============================================================================
// TEST SUITE 7: SOLUTION TOGGLE
// ============================================================================

test.describe('Solution Toggle', () => {
	test('solution is hidden by default', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);

		const exercise = await createParamExercise(page, {
			title: 'Toggle Test',
			variables: [{ name: 'x', expression: '{{5}}' }],
			statement_md: 'Calculate {{x}} + 2',
			solution_md: 'Answer: {{eval:{{x}}+2}}',
			distribution_mode: 'on_demand',
			difficulty: 1
		});

		await loginAsStudent(page, STUDENT_EMAIL, STUDENT_PASSWORD);
		await gotoViewExercise(page, exercise.id);

		// Solution should be hidden initially
		const solutionContent = page.locator('[data-testid="solution-content"]');
		await expect(solutionContent).not.toBeVisible();

		// Show solution button should be visible
		await expect(page.locator('button[data-testid="toggle-solution"]')).toBeVisible();

		// Cleanup
		await page.goto('/logout');
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await deleteExercise(page, exercise.id);
	});

	test('solution can be shown and hidden', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);

		const exercise = await createParamExercise(page, {
			title: 'Toggle Test',
			variables: [{ name: 'a', expression: '{{7}}' }],
			statement_md: 'Calculate {{a}} + 5',
			solution_md: 'Answer: {{eval:{{a}}+5}}',
			distribution_mode: 'on_demand',
			difficulty: 1
		});

		await loginAsStudent(page, STUDENT_EMAIL, STUDENT_PASSWORD);
		await gotoViewExercise(page, exercise.id);

		const solutionContent = page.locator('[data-testid="solution-content"]');
		const toggleButton = page.locator('button[data-testid="toggle-solution"]');

		// Initially hidden
		await expect(solutionContent).not.toBeVisible();

		// Click "Show Solution"
		await toggleButton.click();

		// Should be visible now
		await expect(solutionContent).toBeVisible();
		const solutionText = await solutionContent.textContent();
		expect(solutionText).toContain('12'); // 7 + 5

		// Click "Hide Solution"
		await toggleButton.click();

		// Should be hidden again
		await expect(solutionContent).not.toBeVisible();

		// Cleanup
		await page.goto('/logout');
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await deleteExercise(page, exercise.id);
	});

	test('solution shows resolved variables', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);

		const exercise = await createParamExercise(page, {
			title: 'Solution Variables',
			variables: [
				{ name: 'x', expression: '{{3}}' },
				{ name: 'y', expression: '{{4}}' }
			],
			statement_md: 'Find the hypotenuse if a={{x}} and b={{y}}',
			solution_md:
				'$c = \\sqrt{ {{x}}^2 + {{y}}^2 } = {{eval:Math.sqrt({{x}}*{{x}}+{{y}}*{{y}})}}$',
			distribution_mode: 'on_demand',
			difficulty: 2
		});

		await loginAsStudent(page, STUDENT_EMAIL, STUDENT_PASSWORD);
		await gotoViewExercise(page, exercise.id);

		// Show solution
		await page.click('button[data-testid="toggle-solution"]');

		// Verify solution has no template syntax
		const solutionText = await getExerciseContent(page, '[data-testid="solution-content"]');
		expect(hasTemplateSyntax(solutionText)).toBe(false);
		expect(solutionText).toContain('5'); // sqrt(3^2 + 4^2) = 5

		// Cleanup
		await page.goto('/logout');
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await deleteExercise(page, exercise.id);
	});
});

// ============================================================================
// TEST SUITE 8: COMPLEX EXPRESSIONS
// ============================================================================

test.describe('Complex Expressions', () => {
	test('handles nested eval expressions', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);

		const exercise = await createParamExercise(page, {
			title: 'Nested Eval',
			variables: [
				{ name: 'a', expression: '{{2}}' },
				{ name: 'b', expression: '{{3}}' },
				{ name: 'product', expression: '{{eval:{{a}}*{{b}}}}' },
				{ name: 'doubled', expression: '{{eval:{{product}}*2}}' }
			],
			statement_md: 'If a={{a}} and b={{b}}, then 2(a×b)={{doubled}}',
			solution_md: 'Calculation: {{a}} × {{b}} = {{product}}, then 2 × {{product}} = {{doubled}}',
			distribution_mode: 'on_demand',
			difficulty: 2
		});

		await loginAsStudent(page, STUDENT_EMAIL, STUDENT_PASSWORD);
		await gotoViewExercise(page, exercise.id);

		// Extract numbers from content
		const content = await getExerciseContent(page, '[data-testid="exercise-content"]');
		const numbers = extractNumbers(content);

		// Verify: a=2, b=3, product=6, doubled=12
		expect(numbers).toContain(2);
		expect(numbers).toContain(3);
		expect(numbers).toContain(12);

		// Cleanup
		await page.goto('/logout');
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await deleteExercise(page, exercise.id);
	});

	test('handles mathematical functions in expressions', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);

		const exercise = await createParamExercise(page, {
			title: 'Math Functions',
			variables: [
				{ name: 'x', expression: '{{16}}' },
				{ name: 'sqrt_x', expression: '{{eval:Math.sqrt({{x}})}}' },
				{ name: 'log_x', expression: '{{eval:Math.log10({{x}})}}' }
			],
			statement_md: 'If x={{x}}, find $\\sqrt{x}$ and $\\log_{10}(x)$',
			solution_md: '$\\sqrt{ {{x}} } = {{sqrt_x}}$ and $\\log_{10}({{x}}) \\approx {{log_x}}$',
			distribution_mode: 'on_demand',
			difficulty: 3
		});

		await loginAsStudent(page, STUDENT_EMAIL, STUDENT_PASSWORD);
		await gotoViewExercise(page, exercise.id);

		// Verify no template syntax
		const content = await getExerciseContent(page, '[data-testid="exercise-content"]');
		expect(hasTemplateSyntax(content)).toBe(false);

		// Cleanup
		await page.goto('/logout');
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await deleteExercise(page, exercise.id);
	});

	test('handles exclusion ranges', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);

		const exercise = await createParamExercise(page, {
			title: 'Exclusion Test',
			variables: [
				{ name: 'x', expression: '{{1..10!5}}' } // 1-10 excluding 5
			],
			statement_md: 'Value: {{x}} (not 5)',
			solution_md: 'The value is {{x}}',
			distribution_mode: 'on_demand',
			difficulty: 1
		});

		await loginAsStudent(page, STUDENT_EMAIL, STUDENT_PASSWORD);

		// Generate multiple instances to verify exclusion works
		for (let i = 0; i < 10; i++) {
			await gotoViewExercise(page, exercise.id);
			const content = await getExerciseContent(page, '[data-testid="exercise-content"]');
			const numbers = extractNumbers(content);

			// Should never be 5
			expect(numbers[0]).not.toBe(5);

			// Should be in range 1-10
			expect(numbers[0]).toBeGreaterThanOrEqual(1);
			expect(numbers[0]).toBeLessThanOrEqual(10);

			// Regenerate
			if (i < 9) {
				await page.click('button[data-testid="regenerate-button"]');
				await page.waitForTimeout(200);
			}
		}

		// Cleanup
		await page.goto('/logout');
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await deleteExercise(page, exercise.id);
	});

	test('verifies computed values are mathematically correct', async ({ page }) => {
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);

		const exercise = await createParamExercise(page, {
			title: 'Verification Test',
			variables: [
				{ name: 'a', expression: '{{2..9}}' },
				{ name: 'b', expression: '{{1..9}}' },
				{ name: 'c', expression: '{{eval:{{a}}*{{b}}}}' }
			],
			statement_md: 'If $a = {{a}}$ and $b = {{b}}$, then $c = {{c}}$',
			solution_md: 'Verified: {{a}} × {{b}} = {{c}}',
			distribution_mode: 'on_demand',
			difficulty: 1
		});

		await loginAsStudent(page, STUDENT_EMAIL, STUDENT_PASSWORD);
		await gotoViewExercise(page, exercise.id);

		// Extract values
		const content = await getExerciseContent(page, '[data-testid="exercise-content"]');

		// Parse: "If a = 7 and b = 3, then c = 21"
		const aMatch = content.match(/a = (\d+)/);
		const bMatch = content.match(/b = (\d+)/);
		const cMatch = content.match(/c = (\d+)/);

		expect(aMatch).toBeTruthy();
		expect(bMatch).toBeTruthy();
		expect(cMatch).toBeTruthy();

		const a = parseInt(aMatch![1]);
		const b = parseInt(bMatch![1]);
		const c = parseInt(cMatch![1]);

		// Verify c = a * b
		expect(c).toBe(a * b);

		// Cleanup
		await page.goto('/logout');
		await loginAsTeacher(page, TEACHER_EMAIL, TEACHER_PASSWORD);
		await deleteExercise(page, exercise.id);
	});
});
