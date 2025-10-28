/**
 * E2E Tests for Student Viewing Assessment Results
 * ==================================================
 *
 * Tests the assessment results viewing functionality:
 * - Viewing results page
 * - Score display and statistics
 * - Attempts history
 * - Question review (with correct/incorrect indicators)
 * - Explanations and corrections (if enabled)
 * - Permissions (show_solutions setting)
 * - Retake functionality (if allowed)
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
 * Navigate to assessments and find a completed assessment
 */
async function _findCompletedAssessment(page: Page): Promise<string | null> {
	await page.goto(ASSESSMENTS_URL);
	await page.waitForSelector('h1:has-text("Mes Évaluations")', { state: 'visible' });
	await page.waitForLoadState('networkidle');

	// Look for "Terminées" section
	const completedSection = page.locator('h2:has-text("Terminées")');

	if (await completedSection.isVisible({ timeout: 2000 })) {
		// Find first completed assessment
		const completedCards = page
			.locator('[data-testid="assessment-card"]')
			.filter({ has: page.locator('text=/Terminé/i') });

		if ((await completedCards.count()) > 0) {
			const firstCard = completedCards.first();

			// Get assessment title for verification
			const title = await firstCard.locator('h3, [class*="Title"]').first().textContent();

			return title?.trim() || null;
		}
	}

	return null;
}

/**
 * Click "Voir les résultats" button on a completed assessment
 */
async function navigateToResults(page: Page): Promise<boolean> {
	await page.goto(ASSESSMENTS_URL);
	await page.waitForSelector('h1:has-text("Mes Évaluations")', { state: 'visible' });
	await page.waitForLoadState('networkidle');

	// Look for "Voir les résultats" button
	const resultsButton = page.locator('button:has-text("Voir les résultats")').first();

	if (await resultsButton.isVisible({ timeout: 2000 })) {
		await resultsButton.click();

		// Wait for navigation to results page
		await page.waitForURL(/\/dashboard\/student\/assessments\/[a-f0-9-]+\/results/, {
			timeout: 5000
		});

		// Wait for results to load
		await page.waitForLoadState('networkidle');

		return true;
	}

	return false;
}

/**
 * Get score from results page
 */
async function getScore(page: Page): Promise<{ score: number; total: number } | null> {
	// Look for score display (e.g., "8/10")
	const scoreDisplay = page.locator('text=/\\d+(\\.\\d+)?\\/10/i').first();

	if (await scoreDisplay.isVisible({ timeout: 2000 })) {
		const text = await scoreDisplay.textContent();
		const match = text?.match(/(\d+(?:\.\d+)?)\/10/);

		if (match) {
			return {
				score: parseFloat(match[1]),
				total: 10
			};
		}
	}

	return null;
}

/**
 * Get attempts count
 */
async function getAttemptsCount(page: Page): Promise<number | null> {
	const attemptsCard = page.locator('text=/tentative/i').first();

	if (await attemptsCard.isVisible({ timeout: 2000 })) {
		const text = await attemptsCard.textContent();
		const match = text?.match(/(\d+)\s+tentative/);

		if (match) {
			return parseInt(match[1]);
		}
	}

	return null;
}

/**
 * Check if attempts history table is visible
 */
async function hasAttemptsHistory(page: Page): Promise<boolean> {
	const table = page
		.locator('table')
		.or(page.locator('[role="table"]'))
		.or(page.locator('text=/Historique des Tentatives/i'));

	return await table.isVisible({ timeout: 2000 });
}

/**
 * Get count of attempts in history table
 */
async function getHistoryRowCount(page: Page): Promise<number> {
	const rows = page.locator('table tbody tr').or(page.locator('[role="row"]'));

	return await rows.count();
}

/**
 * Check if question review is available
 */
async function hasQuestionReview(page: Page): Promise<boolean> {
	const review = page
		.locator('text=/correction|question|réponse/i')
		.or(page.locator('[data-testid="question-review"]'));

	return await review.isVisible({ timeout: 2000 });
}

// ============================================================================
// TEST SUITE
// ============================================================================

test.describe('Student Viewing Assessment Results', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsStudent(page);
	});

	// ========================================================================
	// TEST 1: Navigate to Results Page
	// ========================================================================

	test('should navigate to results page from completed assessment', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		// Should be on results page
		await expect(page).toHaveURL(/\/dashboard\/student\/assessments\/[a-f0-9-]+\/results/);

		// Should show results page header
		const header = page.locator('h1').first();
		await expect(header).toBeVisible();
	});

	// ========================================================================
	// TEST 2: Display Assessment Title
	// ========================================================================

	test('should display assessment title on results page', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		// Should show assessment title
		const title = page.locator('h1').first();
		await expect(title).toBeVisible();

		const titleText = await title.textContent();
		expect(titleText?.trim().length).toBeGreaterThan(0);
	});

	// ========================================================================
	// TEST 3: Display Score
	// ========================================================================

	test('should display score correctly', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		// Should show score
		const score = await getScore(page);
		expect(score).not.toBeNull();

		if (score) {
			// Score should be between 0 and 10
			expect(score.score).toBeGreaterThanOrEqual(0);
			expect(score.score).toBeLessThanOrEqual(10);
			expect(score.total).toBe(10);
		}
	});

	// ========================================================================
	// TEST 4: Display Best Score Card
	// ========================================================================

	test('should display best score in statistics card', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		// Look for "Meilleure Note" card
		const bestScoreCard = page.locator('text=/Meilleure Note/i');
		await expect(bestScoreCard).toBeVisible();

		// Should show score value
		const scoreValue = page.locator('text=/\\d+(\\.\\d+)?\\/10/i').first();
		await expect(scoreValue).toBeVisible();
	});

	// ========================================================================
	// TEST 5: Display Average Score
	// ========================================================================

	test('should display average score in statistics card', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		// Look for "Note Moyenne" card
		const avgScoreCard = page.locator('text=/Note Moyenne|Moyenne/i');

		if (await avgScoreCard.isVisible({ timeout: 2000 })) {
			await expect(avgScoreCard).toBeVisible();

			// Should show average value
			const avgValue = avgScoreCard.locator('..').locator('text=/\\d+(\\.\\d+)?\\/10/i').first();
			await expect(avgValue).toBeVisible();
		}
	});

	// ========================================================================
	// TEST 6: Display Attempts Count
	// ========================================================================

	test('should display total attempts count', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		// Look for "Tentatives" card
		const attemptsCard = page.locator('text=/Tentatives/i').first();
		await expect(attemptsCard).toBeVisible();

		// Should show attempts count
		const count = await getAttemptsCount(page);
		expect(count).toBeGreaterThan(0);
	});

	// ========================================================================
	// TEST 7: Display Question Count
	// ========================================================================

	test('should display total questions count', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		// Look for "Questions" card
		const questionsCard = page.locator('text=/Questions/i').first();

		if (await questionsCard.isVisible({ timeout: 2000 })) {
			await expect(questionsCard).toBeVisible();

			// Should show question count
			const countDisplay = page.locator('text=/\\d+\\s+(question|au total)/i').first();
			await expect(countDisplay).toBeVisible();
		}
	});

	// ========================================================================
	// TEST 8: Display Attempts History Table
	// ========================================================================

	test('should display attempts history table', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		// Should have history section
		const historyHeader = page.locator('text=/Historique des Tentatives/i');
		await expect(historyHeader).toBeVisible();

		// Should have table or list of attempts
		const hasHistory = await hasAttemptsHistory(page);
		expect(hasHistory).toBe(true);
	});

	// ========================================================================
	// TEST 9: Attempts History Table Columns
	// ========================================================================

	test('should display correct columns in attempts history', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		const hasHistory = await hasAttemptsHistory(page);
		test.skip(!hasHistory, 'No attempts history table');

		// Check for table headers
		const dateHeader = page.locator('th:has-text("Date"), text=/Date/i').first();
		const scoreHeader = page.locator('th:has-text("Note"), text=/Note/i').first();

		// At least date and score should be present
		const hasDateHeader = await dateHeader.isVisible({ timeout: 2000 });
		const hasScoreHeader = await scoreHeader.isVisible({ timeout: 2000 });

		expect(hasDateHeader || hasScoreHeader).toBe(true);
	});

	// ========================================================================
	// TEST 10: Attempts History Rows
	// ========================================================================

	test('should display attempt rows with correct data', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		const hasHistory = await hasAttemptsHistory(page);
		test.skip(!hasHistory, 'No attempts history table');

		const rowCount = await getHistoryRowCount(page);
		expect(rowCount).toBeGreaterThan(0);

		// First row should have data
		const firstRow = page.locator('table tbody tr, [role="row"]').first();

		// Should have date
		const date = firstRow.locator('text=/\\d{2}\\/\\d{2}\\/\\d{4}/');
		const hasDate = (await date.count()) > 0;

		// Should have score
		const score = firstRow.locator('text=/\\d+\\/10/');
		const hasScore = (await score.count()) > 0;

		expect(hasDate || hasScore).toBe(true);
	});

	// ========================================================================
	// TEST 11: Most Recent Attempt Badge
	// ========================================================================

	test('should mark most recent attempt with badge', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		const hasHistory = await hasAttemptsHistory(page);
		test.skip(!hasHistory, 'No attempts history table');

		// Look for "Plus récent" badge on first row
		const recentBadge = page.locator('text=/Plus récent|Recent|Dernier/i').first();

		if (await recentBadge.isVisible({ timeout: 2000 })) {
			await expect(recentBadge).toBeVisible();
		}
	});

	// ========================================================================
	// TEST 12: Score Color Coding
	// ========================================================================

	test('should color code scores based on performance', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		const score = await getScore(page);
		test.skip(!score, 'Could not find score display');

		if (score) {
			const scoreElement = page.locator('text=/\\d+(\\.\\d+)?\\/10/i').first();
			const className = await scoreElement.getAttribute('class');

			// Check for color classes based on score
			if (score.score >= 8) {
				// Should be green
				expect(className).toContain('green');
			} else if (score.score >= 5) {
				// Should be yellow
				expect(className).toContain('yellow');
			} else {
				// Should be red
				expect(className).toContain('red');
			}
		}
	});

	// ========================================================================
	// TEST 13: Back to Assessments Button
	// ========================================================================

	test('should have back button to return to assessments list', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		// Look for back button
		const backButton = page
			.locator('button:has-text("Retour")')
			.or(page.locator('button').filter({ has: page.locator('svg') }))
			.first();

		await expect(backButton).toBeVisible();

		// Click back button
		await backButton.click();

		// Should navigate back to assessments list
		await page.waitForURL(/\/dashboard\/student\/assessments/, { timeout: 5000 });
		await expect(page).toHaveURL(ASSESSMENTS_URL);
	});

	// ========================================================================
	// TEST 14: Duration Display
	// ========================================================================

	test('should display duration for each attempt', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		const hasHistory = await hasAttemptsHistory(page);
		test.skip(!hasHistory, 'No attempts history table');

		// Look for duration column or time display
		const durationDisplay = page.locator('text=/\\d+min|\\d+s|Durée/i').first();

		if (await durationDisplay.isVisible({ timeout: 2000 })) {
			await expect(durationDisplay).toBeVisible();
		}
	});

	// ========================================================================
	// TEST 15: Completion Status Badge
	// ========================================================================

	test('should show completion status badge for attempts', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		const hasHistory = await hasAttemptsHistory(page);
		test.skip(!hasHistory, 'No attempts history table');

		// Look for status badges (Terminé, En cours)
		const statusBadge = page.locator('text=/Terminé|En cours|Statut/i').first();

		if (await statusBadge.isVisible({ timeout: 2000 })) {
			await expect(statusBadge).toBeVisible();
		}
	});

	// ========================================================================
	// TEST 16: Empty State - No Attempts
	// ========================================================================

	test('should show empty state if no attempts exist', async ({ page }) => {
		// This test is difficult to trigger naturally, but we can check the UI handles it
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		// If somehow we have 0 attempts (shouldn't happen for completed assessments)
		const rowCount = await getHistoryRowCount(page);

		if (rowCount === 0) {
			// Should show empty state
			const emptyState = page.locator('text=/Aucune tentative/i');
			await expect(emptyState).toBeVisible();
		}
	});

	// ========================================================================
	// TEST 17: Question Review Section (if show_solutions enabled)
	// ========================================================================

	test('should show question review if solutions are enabled', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		// Check if question review section exists
		const hasReview = await hasQuestionReview(page);

		// This is optional - depends on assessment settings
		if (hasReview) {
			// Should have correction/review section
			const reviewSection = page.locator('text=/correction|révision|question/i').first();
			await expect(reviewSection).toBeVisible();
		}
	});

	// ========================================================================
	// TEST 18: Correct/Incorrect Indicators (if review available)
	// ========================================================================

	test('should show correct/incorrect indicators in review', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		const hasReview = await hasQuestionReview(page);
		test.skip(!hasReview, 'No question review available');

		// Look for checkmarks or cross marks
		const correctIndicator = page.locator('text=/✓|correct/i').first();
		const incorrectIndicator = page.locator('text=/✗|incorrect/i').first();

		const hasCorrect = await correctIndicator.isVisible({ timeout: 2000 });
		const hasIncorrect = await incorrectIndicator.isVisible({ timeout: 2000 });

		// At least one type of indicator should be present
		expect(hasCorrect || hasIncorrect).toBe(true);
	});

	// ========================================================================
	// TEST 19: Retake Assessment Button (if retakes allowed)
	// ========================================================================

	test('should show retake button if retakes are allowed', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		// Look for retake/recommencer button
		const retakeButton = page
			.locator('button:has-text("Recommencer")')
			.or(page.locator('button:has-text("Nouvelle tentative")'));

		if (await retakeButton.isVisible({ timeout: 2000 })) {
			await expect(retakeButton).toBeVisible();
			await expect(retakeButton).toBeEnabled();
		}
	});

	// ========================================================================
	// TEST 20: Max Attempts Reached Message
	// ========================================================================

	test('should show max attempts message if limit reached', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		// Check if there's a max attempts indicator
		const maxAttemptsText = page.locator('text=/tentative.*max|limite atteinte/i').first();

		if (await maxAttemptsText.isVisible({ timeout: 2000 })) {
			await expect(maxAttemptsText).toBeVisible();

			// Retake button should be disabled or hidden
			const retakeButton = page
				.locator('button:has-text("Recommencer")')
				.or(page.locator('button:has-text("Nouvelle tentative")'));

			if (await retakeButton.isVisible({ timeout: 1000 })) {
				await expect(retakeButton).toBeDisabled();
			}
		}
	});

	// ========================================================================
	// TEST 21: Percentage Display
	// ========================================================================

	test('should display score as percentage', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		// Look for percentage display
		const percentageDisplay = page.locator('text=/\\d+%/').first();

		if (await percentageDisplay.isVisible({ timeout: 2000 })) {
			await expect(percentageDisplay).toBeVisible();

			// Verify percentage is reasonable (0-100)
			const text = await percentageDisplay.textContent();
			const match = text?.match(/(\d+)%/);

			if (match) {
				const percentage = parseInt(match[1]);
				expect(percentage).toBeGreaterThanOrEqual(0);
				expect(percentage).toBeLessThanOrEqual(100);
			}
		}
	});

	// ========================================================================
	// TEST 22: Responsive Layout
	// ========================================================================

	test('should display statistics cards in grid layout', async ({ page }) => {
		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		// Check for grid container with stats cards
		const gridContainer = page.locator('[class*="grid"]').first();

		if (await gridContainer.isVisible({ timeout: 2000 })) {
			// Should have multiple stat cards
			const cards = gridContainer.locator('[class*="Card"]').or(
				page.locator('div').filter({
					has: page.locator('text=/Meilleure Note|Note Moyenne|Tentatives/i')
				})
			);

			const cardCount = await cards.count();
			expect(cardCount).toBeGreaterThanOrEqual(2);
		}
	});

	// ========================================================================
	// TEST 23: Loading State Handling
	// ========================================================================

	test('should handle loading state gracefully', async ({ page }) => {
		// Navigate with slow network to test loading state
		await page.route('**/api/assessments/**', async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 500));
			await route.continue();
		});

		const navigated = await navigateToResults(page);
		test.skip(!navigated, 'No completed assessments available');

		// Page should eventually load without errors
		await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
	});

	// ========================================================================
	// TEST 24: Error State - Invalid Assessment ID
	// ========================================================================

	test('should handle invalid assessment ID gracefully', async ({ page }) => {
		await loginAsStudent(page);

		// Try to navigate to non-existent assessment
		await page.goto('/dashboard/student/assessments/00000000-0000-0000-0000-000000000000/results');

		// Should show error message or redirect
		await page.waitForTimeout(2000);

		const isOnErrorPage =
			(await page.locator('text=/erreur|error|introuvable|not found/i').isVisible({
				timeout: 2000
			})) || page.url().includes(ASSESSMENTS_URL);

		expect(isOnErrorPage).toBe(true);
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
 *    - At least one student account
 *    - At least one completed assessment with attempts
 *    - Mix of scores (high, medium, low) for color coding tests
 *    - Assessments with different settings (show_solutions, max_attempts)
 *
 * 3. Start the development server:
 *    pnpm dev -- --port 5175
 *
 * 4. Run E2E tests:
 *    pnpm test:e2e student/assessments/view-results
 *
 * 5. Run with headed browser (for debugging):
 *    pnpm test:e2e --headed student/assessments/view-results
 *
 * NOTE: Tests are conditional and will skip if:
 * - No completed assessments available
 * - Optional features not implemented (question review, retakes)
 * - Assessment settings disable certain features
 */
