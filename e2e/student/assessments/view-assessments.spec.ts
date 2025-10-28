/**
 * E2E Tests for Student Assessment List View
 * ============================================
 *
 * Tests the student assessment list functionality:
 * - Viewing assigned assessments
 * - Assessment states (not started, in progress, completed, expired)
 * - Assessment information display
 * - Assessment actions (start, continue, view results)
 * - Empty states
 * - Status badges and filtering
 *
 * Author: Claude Code
 * Date: 2025-10-28
 */

import { test, expect, type Page } from '@playwright/test';
import { loginAsStudent } from '../../helpers/auth-helpers';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const ASSESSMENTS_URL = '/dashboard/student/assessments';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Navigate to student assessments page
 */
async function navigateToAssessments(page: Page): Promise<void> {
	await page.goto(ASSESSMENTS_URL);
	await page.waitForSelector('h1:has-text("Mes Évaluations")', { state: 'visible' });
	await page.waitForLoadState('networkidle');
}

/**
 * Get count of assessment cards
 */
async function getAssessmentCount(page: Page): Promise<number> {
	const cards = page.locator('[data-testid="assessment-card"]');
	return await cards.count();
}

/**
 * Get assessment card by title
 */
function _getAssessmentCard(page: Page, title: string): ReturnType<typeof page.locator> {
	return page.locator('[data-testid="assessment-card"]').filter({ hasText: title });
}

/**
 * Check if empty state is visible
 */
async function _isEmptyStateVisible(page: Page): Promise<boolean> {
	const emptyState = page.locator('text=/Aucune évaluation/i');
	return await emptyState.isVisible();
}

/**
 * Get assessment titles in current view
 */
async function _getAssessmentTitles(page: Page): Promise<string[]> {
	const cards = page.locator('[data-testid="assessment-card"]');
	const count = await cards.count();
	const titles: string[] = [];

	for (let i = 0; i < count; i++) {
		const card = cards.nth(i);
		const title = await card.locator('h3, [class*="Title"]').first().textContent();
		if (title) {
			titles.push(title.trim());
		}
	}

	return titles;
}

/**
 * Get status badge for an assessment card
 */
async function _getStatusBadge(
	page: Page,
	assessmentCard: ReturnType<typeof page.locator>
): Promise<string | null> {
	const badge = assessmentCard.locator('[class*="Badge"]').first();
	if (await badge.isVisible()) {
		return await badge.textContent();
	}
	return null;
}

// ============================================================================
// TEST SUITE
// ============================================================================

test.describe('Student Assessment List View', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsStudent(page);
	});

	// ========================================================================
	// TEST 1: Load Assessment List Page
	// ========================================================================

	test('should load assessment list page successfully', async ({ page }) => {
		await navigateToAssessments(page);

		// Verify page header
		await expect(page.locator('h1:has-text("Mes Évaluations")')).toBeVisible();

		// Verify subtitle
		await expect(
			page.locator('text=/Vos évaluations assignées par vos professeurs/i')
		).toBeVisible();

		// Page should load without errors
		await expect(page).toHaveURL(ASSESSMENTS_URL);
	});

	// ========================================================================
	// TEST 2: Empty State - No Assessments
	// ========================================================================

	test('should show empty state when no assessments are assigned', async ({ page }) => {
		await navigateToAssessments(page);

		const count = await getAssessmentCount(page);

		if (count === 0) {
			// Should show empty state
			await expect(page.locator('text=/Aucune évaluation/i')).toBeVisible();
			await expect(page.locator("text=/n'ont pas encore assigné d'évaluations/i")).toBeVisible();

			// Should show empty state icon
			const emptyIcon = page.locator('svg').filter({ hasText: '' }).first();
			await expect(emptyIcon).toBeVisible();
		}
	});

	// ========================================================================
	// TEST 3: View Available Assessments
	// ========================================================================

	test('should display list of assigned assessments', async ({ page }) => {
		await navigateToAssessments(page);

		const count = await getAssessmentCount(page);

		test.skip(count === 0, 'No assessments available for testing');

		// Verify assessments are displayed
		expect(count).toBeGreaterThan(0);

		// Each assessment should have basic information
		const firstCard = page.locator('[data-testid="assessment-card"]').first();

		// Should have title
		const title = firstCard.locator('h3, [class*="Title"]');
		await expect(title.first()).toBeVisible();
		const titleText = await title.first().textContent();
		expect(titleText?.trim()).not.toBe('');

		// Should have grade badge
		const gradeBadge = firstCard.locator('text=/6eme|5eme|4eme|3eme/i');
		await expect(gradeBadge.first()).toBeVisible();
	});

	// ========================================================================
	// TEST 4: Assessment Sections (To Do, Completed, Expired)
	// ========================================================================

	test('should organize assessments into sections by status', async ({ page }) => {
		await navigateToAssessments(page);

		const count = await getAssessmentCount(page);
		test.skip(count === 0, 'No assessments available for testing');

		// Check for section headers
		const toDoSection = page.locator('h2:has-text("À faire")');
		const completedSection = page.locator('h2:has-text("Terminées")');
		const expiredSection = page.locator('h2:has-text("Expirées")');

		// At least one section should be visible
		const hasToDoSection = await toDoSection.isVisible();
		const hasCompletedSection = await completedSection.isVisible();
		const hasExpiredSection = await expiredSection.isVisible();

		expect(hasToDoSection || hasCompletedSection || hasExpiredSection).toBe(true);
	});

	// ========================================================================
	// TEST 5: Assessment Status Badge Display
	// ========================================================================

	test('should display status badge for each assessment', async ({ page }) => {
		await navigateToAssessments(page);

		const count = await getAssessmentCount(page);
		test.skip(count === 0, 'No assessments available for testing');

		const firstCard = page.locator('[data-testid="assessment-card"]').first();

		// Should have a status badge (À faire, En cours, Terminé, Expiré)
		const statusBadge = firstCard
			.locator('[class*="Badge"]')
			.filter({ hasText: /À faire|En cours|Terminé|Expiré/i });

		// Check if status badge exists
		const hasBadge = (await statusBadge.count()) > 0;
		expect(hasBadge).toBe(true);
	});

	// ========================================================================
	// TEST 6: Assessment Information Display
	// ========================================================================

	test('should display assessment information correctly', async ({ page }) => {
		await navigateToAssessments(page);

		const count = await getAssessmentCount(page);
		test.skip(count === 0, 'No assessments available for testing');

		const firstCard = page.locator('[data-testid="assessment-card"]').first();

		// Should display title
		const title = firstCard.locator('h3, [class*="Title"]');
		await expect(title.first()).toBeVisible();

		// Should display grade level
		const grade = firstCard.locator('text=/6eme|5eme|4eme|3eme/i');
		await expect(grade.first()).toBeVisible();

		// Should display question count
		const questionCount = firstCard.locator('text=/question/i');
		expect(await questionCount.count()).toBeGreaterThan(0);

		// May display deadline (optional)
		const deadline = firstCard.locator('text=/échéance|deadline/i');
		if ((await deadline.count()) > 0) {
			await expect(deadline.first()).toBeVisible();
		}
	});

	// ========================================================================
	// TEST 7: Start Assessment Button (Not Started)
	// ========================================================================

	test('should show "Commencer" button for not started assessments', async ({ page }) => {
		await navigateToAssessments(page);

		const count = await getAssessmentCount(page);
		test.skip(count === 0, 'No assessments available for testing');

		// Look for "À faire" section
		const toDoSection = page.locator('h2:has-text("À faire")');

		if (await toDoSection.isVisible()) {
			// Get first assessment in "À faire" section
			const toDoCards = page
				.locator('[data-testid="assessment-card"]')
				.filter({ has: page.locator('text=/À faire|Commencer/i') });

			if ((await toDoCards.count()) > 0) {
				const firstToDoCard = toDoCards.first();

				// Should have "Commencer" button
				const startButton = firstToDoCard.locator('button:has-text("Commencer")');
				await expect(startButton).toBeVisible();
				await expect(startButton).toBeEnabled();
			}
		}
	});

	// ========================================================================
	// TEST 8: Continue Assessment Button (In Progress)
	// ========================================================================

	test('should show "Reprendre" button for in-progress assessments', async ({ page }) => {
		await navigateToAssessments(page);

		const count = await getAssessmentCount(page);
		test.skip(count === 0, 'No assessments available for testing');

		// Look for in-progress assessments
		const inProgressCards = page
			.locator('[data-testid="assessment-card"]')
			.filter({ has: page.locator('text=/En cours|Reprendre/i') });

		if ((await inProgressCards.count()) > 0) {
			const firstInProgressCard = inProgressCards.first();

			// Should have "Reprendre" button
			const continueButton = firstInProgressCard.locator('button:has-text("Reprendre")');
			await expect(continueButton).toBeVisible();
			await expect(continueButton).toBeEnabled();
		}
	});

	// ========================================================================
	// TEST 9: View Results Button (Completed)
	// ========================================================================

	test('should show "Voir les résultats" button for completed assessments', async ({ page }) => {
		await navigateToAssessments(page);

		const count = await getAssessmentCount(page);
		test.skip(count === 0, 'No assessments available for testing');

		// Look for "Terminées" section
		const completedSection = page.locator('h2:has-text("Terminées")');

		if (await completedSection.isVisible()) {
			// Get first completed assessment
			const completedCards = page
				.locator('[data-testid="assessment-card"]')
				.filter({ has: page.locator('text=/Terminé|résultats/i') });

			if ((await completedCards.count()) > 0) {
				const firstCompletedCard = completedCards.first();

				// Should have "Voir les résultats" button
				const resultsButton = firstCompletedCard.locator('button:has-text("Voir les résultats")');
				await expect(resultsButton).toBeVisible();
				await expect(resultsButton).toBeEnabled();
			}
		}
	});

	// ========================================================================
	// TEST 10: Expired Assessment Display
	// ========================================================================

	test('should show disabled button for expired assessments', async ({ page }) => {
		await navigateToAssessments(page);

		const count = await getAssessmentCount(page);
		test.skip(count === 0, 'No assessments available for testing');

		// Look for "Expirées" section
		const expiredSection = page.locator('h2:has-text("Expirées")');

		if (await expiredSection.isVisible()) {
			// Get first expired assessment
			const expiredCards = page
				.locator('[data-testid="assessment-card"]')
				.filter({ has: page.locator('text=/Expiré/i') });

			if ((await expiredCards.count()) > 0) {
				const firstExpiredCard = expiredCards.first();

				// Should have disabled "Expiré" button
				const expiredButton = firstExpiredCard.locator('button:has-text("Expiré")');
				await expect(expiredButton).toBeVisible();
				await expect(expiredButton).toBeDisabled();
			}
		}
	});

	// ========================================================================
	// TEST 11: Score Display (Completed Assessments)
	// ========================================================================

	test('should display score for completed assessments', async ({ page }) => {
		await navigateToAssessments(page);

		const count = await getAssessmentCount(page);
		test.skip(count === 0, 'No assessments available for testing');

		// Look for completed assessments
		const completedSection = page.locator('h2:has-text("Terminées")');

		if (await completedSection.isVisible()) {
			const completedCards = page
				.locator('[data-testid="assessment-card"]')
				.filter({ has: page.locator('text=/Terminé/i') });

			if ((await completedCards.count()) > 0) {
				const firstCompletedCard = completedCards.first();

				// Should display score (e.g., "8/10")
				const scoreDisplay = firstCompletedCard.locator('text=/\\d+\\/10|Meilleure note/i');
				expect(await scoreDisplay.count()).toBeGreaterThan(0);
			}
		}
	});

	// ========================================================================
	// TEST 12: Attempts Count Display
	// ========================================================================

	test('should display attempts count and remaining attempts', async ({ page }) => {
		await navigateToAssessments(page);

		const count = await getAssessmentCount(page);
		test.skip(count === 0, 'No assessments available for testing');

		const firstCard = page.locator('[data-testid="assessment-card"]').first();

		// Look for attempts information
		const attemptsInfo = firstCard.locator('text=/tentative/i');

		if ((await attemptsInfo.count()) > 0) {
			await expect(attemptsInfo.first()).toBeVisible();

			// Check if remaining attempts are shown
			const remainingAttempts = firstCard.locator('text=/restante/i');
			if ((await remainingAttempts.count()) > 0) {
				await expect(remainingAttempts.first()).toBeVisible();
			}
		}
	});

	// ========================================================================
	// TEST 13: Grid Layout Responsiveness
	// ========================================================================

	test('should display assessments in grid layout', async ({ page }) => {
		await navigateToAssessments(page);

		const count = await getAssessmentCount(page);
		test.skip(count === 0, 'No assessments available for testing');

		// Check if cards are in a grid container
		const gridContainer = page
			.locator('[class*="grid"]')
			.filter({ has: page.locator('[data-testid="assessment-card"]').first() });

		expect(await gridContainer.count()).toBeGreaterThan(0);
	});

	// ========================================================================
	// TEST 14: Deadline Display
	// ========================================================================

	test('should display deadline when set', async ({ page }) => {
		await navigateToAssessments(page);

		const count = await getAssessmentCount(page);
		test.skip(count === 0, 'No assessments available for testing');

		// Look for assessments with deadlines
		const cardsWithDeadline = page
			.locator('[data-testid="assessment-card"]')
			.filter({ has: page.locator('text=/échéance|deadline|jours|heures/i') });

		if ((await cardsWithDeadline.count()) > 0) {
			const firstCardWithDeadline = cardsWithDeadline.first();

			// Should display deadline in a readable format
			const deadlineText = firstCardWithDeadline.locator('text=/échéance|\\d+ jour|\\d+ heure/i');
			await expect(deadlineText.first()).toBeVisible();
		}
	});

	// ========================================================================
	// TEST 15: Click Assessment Card Navigation
	// ========================================================================

	test('should navigate when assessment action button is clicked', async ({ page }) => {
		await navigateToAssessments(page);

		const count = await getAssessmentCount(page);
		test.skip(count === 0, 'No assessments available for testing');

		// Find an assessment with an action button
		const cardWithButton = page
			.locator('[data-testid="assessment-card"]')
			.filter({ has: page.locator('button:not([disabled])') })
			.first();

		if ((await cardWithButton.count()) > 0) {
			// Find the enabled button
			const actionButton = cardWithButton.locator('button:not([disabled])').first();
			await actionButton.click();

			// Should navigate away from list page
			await page.waitForURL((url) => !url.pathname.includes('/dashboard/student/assessments'), {
				timeout: 5000
			});

			// URL should change to either test page or results page
			const currentUrl = page.url();
			const isTestPage = currentUrl.includes('/automaths/test');
			const isResultsPage = currentUrl.includes('/results');

			expect(isTestPage || isResultsPage).toBe(true);
		}
	});

	// ========================================================================
	// TEST 16: Multiple Assessments Sorting
	// ========================================================================

	test('should display assessments with proper section grouping', async ({ page }) => {
		await navigateToAssessments(page);

		const count = await getAssessmentCount(page);
		test.skip(count < 2, 'Need at least 2 assessments for sorting test');

		// Get all visible section headers
		const sections = [
			{ name: 'À faire', selector: 'h2:has-text("À faire")' },
			{ name: 'Terminées', selector: 'h2:has-text("Terminées")' },
			{ name: 'Expirées', selector: 'h2:has-text("Expirées")' }
		];

		// Track order of sections
		const visibleSections: string[] = [];

		for (const section of sections) {
			const sectionElement = page.locator(section.selector);
			if (await sectionElement.isVisible()) {
				visibleSections.push(section.name);
			}
		}

		// Sections should appear in logical order: À faire → Terminées → Expirées
		if (visibleSections.includes('À faire') && visibleSections.includes('Terminées')) {
			const toDoIndex = visibleSections.indexOf('À faire');
			const completedIndex = visibleSections.indexOf('Terminées');
			expect(toDoIndex).toBeLessThan(completedIndex);
		}

		if (visibleSections.includes('Terminées') && visibleSections.includes('Expirées')) {
			const completedIndex = visibleSections.indexOf('Terminées');
			const expiredIndex = visibleSections.indexOf('Expirées');
			expect(completedIndex).toBeLessThan(expiredIndex);
		}
	});
});

// ============================================================================
// E2E TEST SETUP INSTRUCTIONS
// ============================================================================

/**
 * To run these E2E tests:
 *
 * 1. Configure test environment variables:
 *    - TEST_STUDENT_EMAIL: Valid student email
 *    - TEST_STUDENT_PASSWORD: Valid student password
 *
 * 2. Ensure test database has:
 *    - At least one student account with assigned assessments
 *    - Mix of assessment states (not started, in progress, completed, expired) for comprehensive testing
 *
 * 3. Start the development server:
 *    pnpm dev -- --port 5175
 *
 * 4. Run E2E tests:
 *    pnpm test:e2e student/assessments/view-assessments
 *
 * 5. Run with headed browser (for debugging):
 *    pnpm test:e2e --headed student/assessments/view-assessments
 *
 * NOTE: Tests are conditional and will skip if no assessments are available.
 * Some tests check for optional features (deadlines, attempts) and skip if not present.
 */
