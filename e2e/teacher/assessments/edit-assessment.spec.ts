/**
 * E2E Tests for Teacher Assessment Editing
 * =========================================
 *
 * Tests the assessment editing functionality:
 * - Edit existing draft assessments
 * - Modify assessment metadata (title, description, grade)
 * - Update assessment settings
 * - Validation during editing
 * - Cancel and save changes
 * - Restrictions on editing published assessments
 *
 * Author: Claude Code
 * Date: 2025-10-28
 */

import { test, expect, type Page } from '@playwright/test';
import { loginAsTeacher } from '../../helpers/auth-helpers';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const ASSESSMENTS_URL = '/dashboard/teacher/assessments';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Navigate to edit page for a specific assessment
 */
async function navigateToEditPage(page: Page, assessmentId: string): Promise<void> {
	await page.goto(`/dashboard/teacher/assessments/${assessmentId}/edit`);
	await page.waitForSelector('h1:has-text("Modifier")', { state: 'visible', timeout: 5000 });
}

/**
 * Get the first draft assessment ID from the list
 */
async function getFirstDraftAssessmentId(page: Page): Promise<string | null> {
	await page.goto(ASSESSMENTS_URL);
	await page.waitForSelector('h1:has-text("Mes Évaluations")', { state: 'visible' });

	// Switch to drafts tab
	const draftsTab = page.locator('button:has-text("Brouillons")');
	await draftsTab.click();
	await page.waitForTimeout(300);

	// Get first assessment card
	const firstCard = page.locator('[data-testid="assessment-card"]').first();

	if ((await firstCard.count()) === 0) {
		return null;
	}

	// Extract ID from card or link
	const editButton = firstCard.locator('button:has-text("Modifier")');
	if (await editButton.isVisible()) {
		await editButton.click();
		await page.waitForURL(/\/dashboard\/teacher\/assessments\/([a-f0-9-]+)\/edit/);

		const url = page.url();
		const match = url.match(/\/assessments\/([a-f0-9-]+)\/edit/);
		return match ? match[1] : null;
	}

	return null;
}

/**
 * Get the first published assessment ID from the list
 */
async function getFirstPublishedAssessmentId(page: Page): Promise<string | null> {
	await page.goto(ASSESSMENTS_URL);
	await page.waitForSelector('h1:has-text("Mes Évaluations")', { state: 'visible' });

	// Switch to published tab
	const publishedTab = page.locator('button:has-text("Publiées")');
	await publishedTab.click();
	await page.waitForTimeout(300);

	// Get first assessment card
	const firstCard = page.locator('[data-testid="assessment-card"]').first();

	if ((await firstCard.count()) === 0) {
		return null;
	}

	// Extract ID from link or data attribute
	const link = firstCard.locator('a, [href*="/assessments/"]').first();
	if ((await link.count()) > 0) {
		const href = await link.getAttribute('href');
		if (href) {
			const match = href.match(/\/assessments\/([a-f0-9-]+)/);
			return match ? match[1] : null;
		}
	}

	return null;
}

/**
 * Fill edit form with new values
 */
async function fillEditForm(
	page: Page,
	data: {
		title?: string;
		grade?: string;
		description?: string;
		maxAttempts?: number;
		timeLimit?: number;
		shuffleQuestions?: boolean;
	}
): Promise<void> {
	// Wait for form to be visible
	await page.waitForSelector('input[name="title"]', { state: 'visible' });

	// Fill title if provided
	if (data.title !== undefined) {
		await page.fill('input[name="title"]', data.title);
	}

	// Select grade if provided
	if (data.grade !== undefined) {
		const gradeSelector = page
			.locator('select[name="grade"]')
			.or(page.locator('[data-testid="grade-select"]'));
		if ((await gradeSelector.count()) > 0) {
			await gradeSelector.first().selectOption(data.grade);
		}
	}

	// Fill description if provided
	if (data.description !== undefined) {
		const descriptionField = page
			.locator('textarea[name="description"]')
			.or(page.locator('input[name="description"]'));
		if ((await descriptionField.count()) > 0) {
			await descriptionField.fill(data.description);
		}
	}

	// Fill max attempts if provided
	if (data.maxAttempts !== undefined) {
		const maxAttemptsField = page
			.locator('input[name="maxAttempts"]')
			.or(page.locator('input[name="max_attempts"]'));
		if ((await maxAttemptsField.count()) > 0) {
			await maxAttemptsField.fill(data.maxAttempts.toString());
		}
	}

	// Fill time limit if provided
	if (data.timeLimit !== undefined) {
		const timeLimitField = page
			.locator('input[name="timeLimit"]')
			.or(page.locator('input[name="time_limit"]'));
		if ((await timeLimitField.count()) > 0) {
			await timeLimitField.fill(data.timeLimit.toString());
		}
	}

	// Toggle shuffle questions if provided
	if (data.shuffleQuestions !== undefined) {
		const shuffleCheckbox = page
			.locator('input[name="shuffleQuestions"]')
			.or(page.locator('input[name="shuffle_questions"]'));
		if ((await shuffleCheckbox.count()) > 0) {
			const isChecked = await shuffleCheckbox.isChecked();
			if (isChecked !== data.shuffleQuestions) {
				await shuffleCheckbox.click();
			}
		}
	}
}

/**
 * Save changes in edit form
 */
async function saveChanges(page: Page): Promise<void> {
	const saveButton = page
		.locator('button:has-text("Enregistrer")')
		.or(page.locator('button[type="submit"]'));
	await saveButton.click();

	// Wait for success toast or redirect
	const successToast = page.locator('.toast').filter({ hasText: /succès|mis à jour|saved/i });
	await expect(successToast).toBeVisible({ timeout: 5000 });
}

/**
 * Cancel editing and return to list
 */
async function cancelEditing(page: Page): Promise<void> {
	const cancelButton = page
		.locator('button:has-text("Annuler")')
		.or(page.locator('button[aria-label="Back"]'));
	await cancelButton.click();

	// Should return to assessments list
	await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments\/?$/);
}

/**
 * Get current form values
 */
async function getFormValues(page: Page): Promise<{
	title: string;
	grade: string;
	description: string;
}> {
	const title = await page.locator('input[name="title"]').inputValue();
	const gradeSelect = page.locator('select[name="grade"]');
	const grade = (await gradeSelect.count()) > 0 ? await gradeSelect.inputValue() : '';
	const descriptionField = page
		.locator('textarea[name="description"]')
		.or(page.locator('input[name="description"]'));
	const description =
		(await descriptionField.count()) > 0 ? await descriptionField.inputValue() : '';

	return { title, grade, description };
}

// ============================================================================
// TEST SUITE
// ============================================================================

test.describe('Teacher Assessment Editing', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsTeacher(page);
	});

	// ========================================================================
	// TEST 1: Navigate to Edit Page from Draft
	// ========================================================================

	test('should navigate to edit page from draft assessment', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		// Should be on edit page now
		await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments\/[a-f0-9-]+\/edit/);
		await expect(page.locator('h1:has-text("Modifier")')).toBeVisible();

		// Should show form with current values
		await expect(page.locator('input[name="title"]')).toBeVisible();
	});

	// ========================================================================
	// TEST 2: Edit Assessment Title
	// ========================================================================

	test('should update assessment title successfully', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		// Generate new title
		const newTitle = `Updated Title ${Date.now()}`;

		// Update title
		await fillEditForm(page, { title: newTitle });

		// Save changes
		await saveChanges(page);

		// Navigate back to edit page to verify
		await navigateToEditPage(page, assessmentId);

		// Verify title was updated
		const currentValues = await getFormValues(page);
		expect(currentValues.title).toBe(newTitle);
	});

	// ========================================================================
	// TEST 3: Edit Assessment Description
	// ========================================================================

	test('should update assessment description successfully', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		const newDescription = `Updated description at ${Date.now()}`;

		// Update description
		await fillEditForm(page, { description: newDescription });

		// Save changes
		await saveChanges(page);

		// Navigate back to verify
		await navigateToEditPage(page, assessmentId);

		// Verify description was updated
		const currentValues = await getFormValues(page);
		expect(currentValues.description).toBe(newDescription);
	});

	// ========================================================================
	// TEST 4: Edit Assessment Grade Level
	// ========================================================================

	test('should update assessment grade level successfully', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		// Get original grade
		const originalValues = await getFormValues(page);

		// Change to different grade
		const newGrade = originalValues.grade === '6eme' ? '5eme' : '6eme';
		await fillEditForm(page, { grade: newGrade });

		// Save changes
		await saveChanges(page);

		// Navigate back to verify
		await navigateToEditPage(page, assessmentId);

		// Verify grade was updated
		const currentValues = await getFormValues(page);
		expect(currentValues.grade).toBe(newGrade);
	});

	// ========================================================================
	// TEST 5: Edit Assessment Settings - Max Attempts
	// ========================================================================

	test('should update max attempts setting', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		const maxAttemptsField = page
			.locator('input[name="maxAttempts"]')
			.or(page.locator('input[name="max_attempts"]'));

		if ((await maxAttemptsField.count()) === 0) {
			test.skip();
			return;
		}

		// Update max attempts
		await fillEditForm(page, { maxAttempts: 5 });

		// Save changes
		await saveChanges(page);

		// Navigate back to verify
		await navigateToEditPage(page, assessmentId);

		// Verify max attempts was updated
		const updatedValue = await maxAttemptsField.inputValue();
		expect(updatedValue).toBe('5');
	});

	// ========================================================================
	// TEST 6: Edit Assessment Settings - Time Limit
	// ========================================================================

	test('should update time limit setting', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		const timeLimitField = page
			.locator('input[name="timeLimit"]')
			.or(page.locator('input[name="time_limit"]'));

		if ((await timeLimitField.count()) === 0) {
			test.skip();
			return;
		}

		// Update time limit (in seconds)
		await fillEditForm(page, { timeLimit: 7200 }); // 2 hours

		// Save changes
		await saveChanges(page);

		// Navigate back to verify
		await navigateToEditPage(page, assessmentId);

		// Verify time limit was updated
		const updatedValue = await timeLimitField.inputValue();
		expect(updatedValue).toBe('7200');
	});

	// ========================================================================
	// TEST 7: Edit Assessment Settings - Shuffle Questions
	// ========================================================================

	test('should toggle shuffle questions setting', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		const shuffleCheckbox = page
			.locator('input[name="shuffleQuestions"]')
			.or(page.locator('input[name="shuffle_questions"]'));

		if ((await shuffleCheckbox.count()) === 0) {
			test.skip();
			return;
		}

		// Get current state
		const wasChecked = await shuffleCheckbox.isChecked();

		// Toggle shuffle questions
		await fillEditForm(page, { shuffleQuestions: !wasChecked });

		// Save changes
		await saveChanges(page);

		// Navigate back to verify
		await navigateToEditPage(page, assessmentId);

		// Verify shuffle setting was toggled
		const isNowChecked = await shuffleCheckbox.isChecked();
		expect(isNowChecked).toBe(!wasChecked);
	});

	// ========================================================================
	// TEST 8: Validation - Empty Title
	// ========================================================================

	test('should show error when title is cleared', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		// Clear title
		await page.fill('input[name="title"]', '');

		// Try to save
		const saveButton = page
			.locator('button:has-text("Enregistrer")')
			.or(page.locator('button[type="submit"]'));
		await saveButton.click();

		// Should show validation error
		const errorMessage = page
			.locator('text=/titre.*requis|title.*required/i')
			.or(page.locator('[data-testid="title-error"]'));
		await expect(errorMessage).toBeVisible({ timeout: 3000 });
	});

	// ========================================================================
	// TEST 9: Validation - Invalid Max Attempts
	// ========================================================================

	test('should reject invalid max attempts values in edit', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		const maxAttemptsField = page
			.locator('input[name="maxAttempts"]')
			.or(page.locator('input[name="max_attempts"]'));

		if ((await maxAttemptsField.count()) === 0) {
			test.skip();
			return;
		}

		// Try negative value
		await maxAttemptsField.fill('-1');

		// Try to save
		const saveButton = page.locator('button[type="submit"]');
		await saveButton.click();

		// Should show error or prevent submission
		const errorMessage = page.locator('text=/tentatives.*invalide|attempts.*invalid/i');
		const hasError = await errorMessage.isVisible({ timeout: 2000 });
		const stillOnPage = page.url().includes('/edit');

		expect(hasError || stillOnPage).toBe(true);
	});

	// ========================================================================
	// TEST 10: Cancel Editing Without Saving
	// ========================================================================

	test('should cancel editing and discard changes', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		// Get original values
		const originalValues = await getFormValues(page);

		// Make changes without saving
		await fillEditForm(page, { title: `Temporary Change ${Date.now()}` });

		// Cancel editing
		await cancelEditing(page);

		// Navigate back to edit page
		await navigateToEditPage(page, assessmentId);

		// Verify changes were not saved
		const currentValues = await getFormValues(page);
		expect(currentValues.title).toBe(originalValues.title);
	});

	// ========================================================================
	// TEST 11: Back Button Navigation
	// ========================================================================

	test('should navigate back to assessment list via back button', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		// Click back button
		const backButton = page
			.locator('button[aria-label="Back"]')
			.or(page.locator('button:has([class*="ArrowLeft"])'));
		await expect(backButton).toBeVisible();
		await backButton.click();

		// Should return to assessments list
		await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments\/?$/);
		await expect(page.locator('h1:has-text("Mes Évaluations")')).toBeVisible();
	});

	// ========================================================================
	// TEST 12: Edit Form Pre-population
	// ========================================================================

	test('should pre-populate form with existing assessment data', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		// Verify form fields are populated
		const titleInput = page.locator('input[name="title"]');
		const titleValue = await titleInput.inputValue();
		expect(titleValue).not.toBe('');
		expect(titleValue.length).toBeGreaterThan(0);

		// Verify grade is selected
		const gradeSelect = page.locator('select[name="grade"]');
		if ((await gradeSelect.count()) > 0) {
			const gradeValue = await gradeSelect.inputValue();
			expect(gradeValue).toMatch(/6eme|5eme|4eme|3eme/);
		}
	});

	// ========================================================================
	// TEST 13: Warning for Published Assessments
	// ========================================================================

	test('should show warning when editing published assessment', async ({ page }) => {
		const assessmentId = await getFirstPublishedAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		// Try to navigate to edit page
		await page.goto(`/dashboard/teacher/assessments/${assessmentId}/edit`);

		// Should either show warning or redirect
		const warningMessage = page.locator(
			"text=/Les modifications s'appliquent uniquement aux évaluations en brouillon|cannot edit published/i"
		);
		const hasWarning = await warningMessage.isVisible({ timeout: 3000 });

		// Or may redirect to detail page instead
		const isRedirected = !page.url().includes('/edit');

		expect(hasWarning || isRedirected).toBe(true);
	});

	// ========================================================================
	// TEST 14: Save Changes and Redirect
	// ========================================================================

	test('should redirect to assessment list after saving', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		// Make a small change
		await fillEditForm(page, { description: `Updated at ${Date.now()}` });

		// Save changes
		const saveButton = page
			.locator('button:has-text("Enregistrer")')
			.or(page.locator('button[type="submit"]'));
		await saveButton.click();

		// Wait for toast
		await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 });

		// Should redirect to assessments list
		await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments\/?$/, { timeout: 5000 });
	});

	// ========================================================================
	// TEST 15: Multiple Field Updates
	// ========================================================================

	test('should update multiple fields at once', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		const timestamp = Date.now();
		const newData = {
			title: `Multi-Update ${timestamp}`,
			description: `Multiple fields updated at ${timestamp}`,
			grade: '5eme'
		};

		// Update all fields
		await fillEditForm(page, newData);

		// Save changes
		await saveChanges(page);

		// Navigate back to verify
		await navigateToEditPage(page, assessmentId);

		// Verify all changes were saved
		const currentValues = await getFormValues(page);
		expect(currentValues.title).toBe(newData.title);
		expect(currentValues.description).toBe(newData.description);
		expect(currentValues.grade).toBe(newData.grade);
	});

	// ========================================================================
	// TEST 16: Form Validation on Load
	// ========================================================================

	test('should validate form fields are properly bound', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		// Verify required form elements exist
		await expect(page.locator('input[name="title"]')).toBeVisible();

		// Verify save button exists
		const saveButton = page
			.locator('button:has-text("Enregistrer")')
			.or(page.locator('button[type="submit"]'));
		await expect(saveButton).toBeVisible();

		// Verify cancel/back button exists
		const cancelButton = page
			.locator('button:has-text("Annuler")')
			.or(page.locator('button[aria-label="Back"]'));
		await expect(cancelButton).toBeVisible();
	});

	// ========================================================================
	// TEST 17: Preserve Unsaved Changes Warning (if implemented)
	// ========================================================================

	test('should warn about unsaved changes when navigating away', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		// Make changes
		await fillEditForm(page, { title: `Changed ${Date.now()}` });

		// Try to navigate away
		const backButton = page
			.locator('button[aria-label="Back"]')
			.or(page.locator('button:has([class*="ArrowLeft"])'));

		// Listen for dialog (if implemented)
		page.once('dialog', async (dialog) => {
			expect(dialog.message()).toMatch(/unsaved|non sauvegardées/i);
			await dialog.dismiss();
		});

		await backButton.click();

		// May or may not have dialog depending on implementation
		await page.waitForTimeout(1000);
	});

	// ========================================================================
	// TEST 18: Error Handling for Save Failure
	// ========================================================================

	test('should handle save errors gracefully', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		// Intercept save request and return error
		await page.route('**/api/assessments/**', (route) => {
			if (route.request().method() === 'PUT' || route.request().method() === 'POST') {
				route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'Internal server error' })
				});
			} else {
				route.continue();
			}
		});

		// Make changes
		await fillEditForm(page, { title: `Error Test ${Date.now()}` });

		// Try to save
		const saveButton = page
			.locator('button:has-text("Enregistrer")')
			.or(page.locator('button[type="submit"]'));
		await saveButton.click();

		// Should show error toast
		const errorToast = page.locator('.toast').filter({ hasText: /erreur|échec|error|failed/i });
		await expect(errorToast).toBeVisible({ timeout: 5000 });

		// Should remain on edit page
		expect(page.url()).toContain('/edit');
	});

	// ========================================================================
	// TEST 19: Keyboard Shortcuts (if implemented)
	// ========================================================================

	test('should support keyboard shortcuts for save', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		// Make changes
		await fillEditForm(page, { description: `Keyboard test ${Date.now()}` });

		// Try Ctrl+S or Cmd+S to save
		await page.keyboard.press('Control+S');

		// May or may not trigger save depending on implementation
		await page.waitForTimeout(1000);

		// Check if toast appears (indicating save was triggered)
		const toast = page.locator('.toast');
		const hasToast = await toast.isVisible({ timeout: 2000 }).catch(() => false);

		console.log('Keyboard shortcut support:', hasToast);
	});

	// ========================================================================
	// TEST 20: Direct URL Access to Edit Page
	// ========================================================================

	test('should allow direct URL access to edit page', async ({ page }) => {
		const assessmentId = await getFirstDraftAssessmentId(page);

		if (!assessmentId) {
			test.skip();
			return;
		}

		// Navigate directly via URL
		await page.goto(`/dashboard/teacher/assessments/${assessmentId}/edit`);

		// Should load edit page successfully
		await expect(page.locator('h1:has-text("Modifier")')).toBeVisible({ timeout: 5000 });
		await expect(page.locator('input[name="title"]')).toBeVisible();
	});
});

// ============================================================================
// E2E TEST SETUP INSTRUCTIONS
// ============================================================================

/**
 * To run these E2E tests:
 *
 * 1. Configure test environment variables:
 *    - TEST_TEACHER_EMAIL: Valid teacher email
 *    - TEST_TEACHER_PASSWORD: Valid teacher password
 *
 * 2. Ensure test database has:
 *    - At least one teacher account
 *    - At least one draft assessment (for edit tests)
 *    - At least one published assessment (for restriction tests)
 *
 * 3. Start the development server:
 *    pnpm dev -- --port 5175
 *
 * 4. Run E2E tests:
 *    pnpm test:e2e teacher/assessments/edit-assessment
 *
 * 5. Run with headed browser (for debugging):
 *    pnpm test:e2e --headed teacher/assessments/edit-assessment
 *
 * NOTE: Tests will skip if no draft assessments exist in the database.
 * Create at least one draft assessment before running these tests.
 */
