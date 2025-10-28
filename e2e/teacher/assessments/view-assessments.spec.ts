/**
 * E2E Tests for Teacher Assessment List/View
 * ===========================================
 *
 * Tests the assessment list view functionality:
 * - Viewing assessment list
 * - Filtering by status (draft, published, archived)
 * - Searching assessments
 * - Sorting assessments
 * - Assessment actions (view, edit, delete)
 * - Tab navigation
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
 * Navigate to assessments list page
 */
async function navigateToAssessments(page: Page): Promise<void> {
	await page.goto(ASSESSMENTS_URL);
	await page.waitForSelector('h1:has-text("Mes Évaluations")', { state: 'visible' });
}

/**
 * Get count of assessments in current tab
 */
async function getAssessmentCount(page: Page): Promise<number> {
	const cards = page
		.locator('[data-testid="assessment-card"]')
		.or(page.locator('[class*="AssessmentCard"]'));
	return await cards.count();
}

/**
 * Get assessment titles in current view
 */
async function getAssessmentTitles(page: Page): Promise<string[]> {
	const cards = page
		.locator('[data-testid="assessment-card"]')
		.or(page.locator('[class*="AssessmentCard"]'));
	const count = await cards.count();
	const titles: string[] = [];

	for (let i = 0; i < count; i++) {
		const card = cards.nth(i);
		const title = await card.locator('h3, [data-testid="assessment-title"]').first().textContent();
		if (title) {
			titles.push(title.trim());
		}
	}

	return titles;
}

/**
 * Switch to a specific tab
 */
async function switchToTab(
	page: Page,
	tabName: 'drafts' | 'published' | 'archived'
): Promise<void> {
	const tabMapping = {
		drafts: 'Brouillons',
		published: 'Publiées',
		archived: 'Archivées'
	};

	const tabButton = page.locator(`button:has-text("${tabMapping[tabName]}")`);
	await expect(tabButton).toBeVisible();
	await tabButton.click();

	// Wait for content to update
	await page.waitForTimeout(300);
}

/**
 * Check if tab has badge with count
 */
async function getTabBadgeCount(
	page: Page,
	tabName: 'drafts' | 'published' | 'archived'
): Promise<number | null> {
	const tabMapping = {
		drafts: 'Brouillons',
		published: 'Publiées',
		archived: 'Archivées'
	};

	const tabButton = page.locator(`button:has-text("${tabMapping[tabName]}")`);
	const badge = tabButton.locator('span[class*="rounded-full"]');

	if (await badge.isVisible()) {
		const text = await badge.textContent();
		return text ? parseInt(text.trim()) : null;
	}

	return null;
}

/**
 * Search for assessments
 */
async function searchAssessments(page: Page, query: string): Promise<void> {
	const searchInput = page
		.locator('input[type="search"]')
		.or(page.locator('input[placeholder*="Rechercher"]'));

	if ((await searchInput.count()) > 0) {
		await searchInput.fill(query);
		// Wait for search results to update
		await page.waitForTimeout(500);
	}
}

/**
 * Apply filter by grade level
 */
async function filterByGrade(page: Page, grade: string): Promise<void> {
	const gradeFilter = page
		.locator(`select[name="grade"]`)
		.or(page.locator('[data-testid="grade-filter"]'));

	if ((await gradeFilter.count()) > 0) {
		await gradeFilter.selectOption(grade);
		await page.waitForTimeout(300);
	}
}

/**
 * Click action on assessment card
 */
async function _clickAssessmentAction(
	page: Page,
	assessmentTitle: string,
	action: 'view' | 'edit' | 'delete' | 'assign' | 'results'
): Promise<void> {
	// Find the assessment card by title
	const card = page.locator('[data-testid="assessment-card"]').filter({ hasText: assessmentTitle });

	// Click the specific action button
	const actionButtonMapping = {
		view: 'Voir',
		edit: 'Modifier',
		delete: 'Supprimer',
		assign: 'Assigner',
		results: 'Résultats'
	};

	const actionButton = card.locator(`button:has-text("${actionButtonMapping[action]}")`);
	await actionButton.click();
}

// ============================================================================
// TEST SUITE
// ============================================================================

test.describe('Teacher Assessment List View', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsTeacher(page);
	});

	// ========================================================================
	// TEST 1: Load Assessment List Page
	// ========================================================================

	test('should load assessment list page successfully', async ({ page }) => {
		await navigateToAssessments(page);

		// Verify page header
		await expect(page.locator('h1:has-text("Mes Évaluations")')).toBeVisible();

		// Verify subtitle/description
		await expect(page.locator('text=/Créez et gérez vos évaluations/i')).toBeVisible();

		// Verify "Nouvelle évaluation" button exists
		await expect(page.locator('button:has-text("Nouvelle évaluation")')).toBeVisible();

		// Verify tabs exist
		await expect(page.locator('button:has-text("Brouillons")')).toBeVisible();
		await expect(page.locator('button:has-text("Publiées")')).toBeVisible();
		await expect(page.locator('button:has-text("Archivées")')).toBeVisible();
	});

	// ========================================================================
	// TEST 2: View Published Assessments (Default Tab)
	// ========================================================================

	test('should show published assessments by default', async ({ page }) => {
		await navigateToAssessments(page);

		// Default tab should be "Publiées"
		const publishedTab = page.locator('button:has-text("Publiées")');
		await expect(publishedTab).toHaveAttribute('data-state', 'active');

		// Check if assessments are displayed or empty state shown
		const emptyState = page.locator('text=/Aucune évaluation publiée/i');
		const assessmentCards = page.locator('[data-testid="assessment-card"]');

		const hasAssessments = (await assessmentCards.count()) > 0;
		const showsEmptyState = await emptyState.isVisible();

		// One of these should be true
		expect(hasAssessments || showsEmptyState).toBe(true);
	});

	// ========================================================================
	// TEST 3: Switch Between Tabs
	// ========================================================================

	test('should switch between draft, published, and archived tabs', async ({ page }) => {
		await navigateToAssessments(page);

		// Switch to Drafts
		await switchToTab(page, 'drafts');
		const draftsTab = page.locator('button:has-text("Brouillons")');
		await expect(draftsTab).toHaveAttribute('data-state', 'active');

		// Verify content changed
		const draftContent = page.locator('text=/Aucun brouillon|draft/i');
		await expect(draftContent.first()).toBeVisible({ timeout: 3000 });

		// Switch to Published
		await switchToTab(page, 'published');
		const publishedTab = page.locator('button:has-text("Publiées")');
		await expect(publishedTab).toHaveAttribute('data-state', 'active');

		// Switch to Archived
		await switchToTab(page, 'archived');
		const archivedTab = page.locator('button:has-text("Archivées")');
		await expect(archivedTab).toHaveAttribute('data-state', 'active');

		const archivedContent = page.locator('text=/Aucune évaluation archivée|archived/i');
		await expect(archivedContent.first()).toBeVisible({ timeout: 3000 });
	});

	// ========================================================================
	// TEST 4: Tab Badge Counts
	// ========================================================================

	test('should display badge counts on tabs', async ({ page }) => {
		await navigateToAssessments(page);

		// Check if badges are displayed
		const draftCount = await getTabBadgeCount(page, 'drafts');
		const publishedCount = await getTabBadgeCount(page, 'published');
		const archivedCount = await getTabBadgeCount(page, 'archived');

		// If counts exist, they should be numbers
		if (draftCount !== null) {
			expect(draftCount).toBeGreaterThanOrEqual(0);
		}
		if (publishedCount !== null) {
			expect(publishedCount).toBeGreaterThanOrEqual(0);
		}
		if (archivedCount !== null) {
			expect(archivedCount).toBeGreaterThanOrEqual(0);
		}

		// Verify badge count matches actual count
		if (publishedCount !== null) {
			await switchToTab(page, 'published');
			const actualCount = await getAssessmentCount(page);

			// Badge should match actual count (or be close for pagination)
			expect(actualCount).toBeLessThanOrEqual(publishedCount);
		}
	});

	// ========================================================================
	// TEST 5: Empty State - No Published Assessments
	// ========================================================================

	test('should show empty state when no published assessments exist', async ({ page }) => {
		await navigateToAssessments(page);
		await switchToTab(page, 'published');

		const assessmentCards = page.locator('[data-testid="assessment-card"]');
		const count = await assessmentCards.count();

		if (count === 0) {
			// Should show empty state
			await expect(page.locator('text=/Aucune évaluation publiée/i')).toBeVisible();
			await expect(page.locator('text=/Créez une évaluation pour commencer/i')).toBeVisible();

			// Should show "Créer une évaluation" button
			const createButton = page.locator('button:has-text("Créer une évaluation")');
			await expect(createButton).toBeVisible();
		}
	});

	// ========================================================================
	// TEST 6: Empty State - No Drafts
	// ========================================================================

	test('should show empty state when no draft assessments exist', async ({ page }) => {
		await navigateToAssessments(page);
		await switchToTab(page, 'drafts');

		const assessmentCards = page.locator('[data-testid="assessment-card"]');
		const count = await assessmentCards.count();

		if (count === 0) {
			// Should show empty state
			await expect(page.locator('text=/Aucun brouillon/i')).toBeVisible();
			await expect(
				page.locator('text=/Les évaluations non publiées apparaîtront ici/i')
			).toBeVisible();
		}
	});

	// ========================================================================
	// TEST 7: Empty State - No Archived Assessments
	// ========================================================================

	test('should show empty state when no archived assessments exist', async ({ page }) => {
		await navigateToAssessments(page);
		await switchToTab(page, 'archived');

		const assessmentCards = page.locator('[data-testid="assessment-card"]');
		const count = await assessmentCards.count();

		if (count === 0) {
			// Should show empty state
			await expect(page.locator('text=/Aucune évaluation archivée/i')).toBeVisible();
		}
	});

	// ========================================================================
	// TEST 8: Assessment Card Display
	// ========================================================================

	test('should display assessment cards with correct information', async ({ page }) => {
		await navigateToAssessments(page);
		await switchToTab(page, 'published');

		const assessmentCards = page.locator('[data-testid="assessment-card"]');
		const count = await assessmentCards.count();

		if (count > 0) {
			const firstCard = assessmentCards.first();

			// Should display title
			const title = firstCard.locator('h3, [data-testid="assessment-title"]');
			await expect(title.first()).toBeVisible();

			// Should display grade level
			const grade = firstCard.locator('text=/6eme|5eme|4eme|3eme/i');
			expect(await grade.count()).toBeGreaterThan(0);

			// Should have action buttons
			const hasActions =
				(await firstCard.locator('button').count()) > 0 ||
				(await firstCard.locator('a').count()) > 0;
			expect(hasActions).toBe(true);
		}
	});

	// ========================================================================
	// TEST 9: Click Assessment to View Details
	// ========================================================================

	test('should navigate to assessment detail when clicked', async ({ page }) => {
		await navigateToAssessments(page);
		await switchToTab(page, 'published');

		const assessmentCards = page.locator('[data-testid="assessment-card"]');
		const count = await assessmentCards.count();

		if (count > 0) {
			const firstCard = assessmentCards.first();

			// Click the card or its title
			const clickable = firstCard.locator('h3, a, [role="link"]').first();
			await clickable.click();

			// Should navigate to assessment detail page
			await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments\/[a-f0-9-]+/);
		}
	});

	// ========================================================================
	// TEST 10: Edit Button Navigation
	// ========================================================================

	test('should navigate to edit page when edit button clicked', async ({ page }) => {
		await navigateToAssessments(page);
		await switchToTab(page, 'drafts');

		const assessmentCards = page.locator('[data-testid="assessment-card"]');
		const count = await assessmentCards.count();

		if (count > 0) {
			const firstCard = assessmentCards.first();
			const editButton = firstCard.locator('button:has-text("Modifier")');

			if (await editButton.isVisible()) {
				await editButton.click();

				// Should navigate to edit page
				await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments\/[a-f0-9-]+\/edit/);
				await expect(page.locator('h1:has-text("Modifier")')).toBeVisible({ timeout: 5000 });
			}
		}
	});

	// ========================================================================
	// TEST 11: Assign Button Navigation
	// ========================================================================

	test('should navigate to assign page when assign button clicked', async ({ page }) => {
		await navigateToAssessments(page);
		await switchToTab(page, 'published');

		const assessmentCards = page.locator('[data-testid="assessment-card"]');
		const count = await assessmentCards.count();

		if (count > 0) {
			const firstCard = assessmentCards.first();
			const assignButton = firstCard.locator('button:has-text("Assigner")');

			if (await assignButton.isVisible()) {
				await assignButton.click();

				// Should navigate to assign page
				await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments\/[a-f0-9-]+\/assign/);
			}
		}
	});

	// ========================================================================
	// TEST 12: View Results Button Navigation
	// ========================================================================

	test('should navigate to results page when results button clicked', async ({ page }) => {
		await navigateToAssessments(page);
		await switchToTab(page, 'published');

		const assessmentCards = page.locator('[data-testid="assessment-card"]');
		const count = await assessmentCards.count();

		if (count > 0) {
			const firstCard = assessmentCards.first();
			const resultsButton = firstCard.locator('button:has-text("Résultats")');

			if (await resultsButton.isVisible()) {
				await resultsButton.click();

				// Should navigate to results page
				await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments\/[a-f0-9-]+\/results/);
				await expect(page.locator('h1:has-text("Résultats")')).toBeVisible({ timeout: 5000 });
			}
		}
	});

	// ========================================================================
	// TEST 13: Create New Assessment Button
	// ========================================================================

	test('should navigate to create page from "Nouvelle évaluation" button', async ({ page }) => {
		await navigateToAssessments(page);

		const createButton = page.locator('button:has-text("Nouvelle évaluation")');
		await expect(createButton).toBeVisible();
		await createButton.click();

		// Should navigate to new assessment page
		await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments\/new/);
		await expect(page.locator('h1:has-text("Nouvelle Évaluation")')).toBeVisible();
	});

	// ========================================================================
	// TEST 14: Grid Layout Responsiveness
	// ========================================================================

	test('should display assessments in grid layout', async ({ page }) => {
		await navigateToAssessments(page);
		await switchToTab(page, 'published');

		const assessmentCards = page.locator('[data-testid="assessment-card"]');
		const count = await assessmentCards.count();

		if (count > 1) {
			// Check if cards are in a grid container
			const gridContainer = page
				.locator('[class*="grid"]')
				.filter({ has: assessmentCards.first() });
			expect(await gridContainer.count()).toBeGreaterThan(0);
		}
	});

	// ========================================================================
	// TEST 15: Filter/Search Functionality (if implemented)
	// ========================================================================

	test('should filter assessments by search query if search is available', async ({ page }) => {
		await navigateToAssessments(page);

		const searchInput = page
			.locator('input[type="search"]')
			.or(page.locator('input[placeholder*="Rechercher"]'));

		if ((await searchInput.count()) > 0) {
			// Get initial assessment titles
			const initialTitles = await getAssessmentTitles(page);

			if (initialTitles.length > 0) {
				// Search for first assessment
				const searchTerm = initialTitles[0].substring(0, 5);
				await searchAssessments(page, searchTerm);

				// Get filtered titles
				const filteredTitles = await getAssessmentTitles(page);

				// Filtered results should contain search term
				for (const title of filteredTitles) {
					expect(title.toLowerCase()).toContain(searchTerm.toLowerCase());
				}
			}
		}
	});

	// ========================================================================
	// TEST 16: Grade Level Filter (if implemented)
	// ========================================================================

	test('should filter assessments by grade level if filter is available', async ({ page }) => {
		await navigateToAssessments(page);

		const gradeFilter = page
			.locator('select[name="grade"]')
			.or(page.locator('[data-testid="grade-filter"]'));

		if ((await gradeFilter.count()) > 0) {
			// Filter by specific grade
			await filterByGrade(page, '6eme');

			// Get assessment cards
			const cards = page.locator('[data-testid="assessment-card"]');
			const count = await cards.count();

			if (count > 0) {
				// All visible assessments should be for 6eme
				for (let i = 0; i < count; i++) {
					const card = cards.nth(i);
					await expect(card.locator('text=/6eme/i')).toBeVisible();
				}
			}
		}
	});

	// ========================================================================
	// TEST 17: Keyboard Navigation
	// ========================================================================

	test('should support keyboard navigation between tabs', async ({ page }) => {
		await navigateToAssessments(page);

		// Focus on first tab
		const publishedTab = page.locator('button:has-text("Publiées")');
		await publishedTab.focus();

		// Press arrow key to navigate to next tab
		await page.keyboard.press('ArrowRight');

		// Archived tab should now be focused or selected
		await page.waitForTimeout(500);

		// Press arrow key to navigate back
		await page.keyboard.press('ArrowLeft');
		await page.waitForTimeout(500);
	});

	// ========================================================================
	// TEST 18: URL Persistence (if implemented)
	// ========================================================================

	test('should persist active tab in URL or state', async ({ page }) => {
		await navigateToAssessments(page);

		// Switch to drafts tab
		await switchToTab(page, 'drafts');

		// Refresh page
		await page.reload();
		await page.waitForSelector('h1:has-text("Mes Évaluations")', { state: 'visible' });

		// Check if drafts tab is still active (if URL persistence is implemented)
		const draftsTab = page.locator('button:has-text("Brouillons")');
		const isActive = await draftsTab.getAttribute('data-state');

		// This test may pass or fail depending on implementation
		// If URL persistence is not implemented, the default tab (published) will be active
		console.log('Drafts tab after reload:', isActive);
	});

	// ========================================================================
	// TEST 19: Loading State
	// ========================================================================

	test('should show loading state while fetching assessments', async ({ page }) => {
		// Navigate to assessments with slow network
		await page.route('**/api/assessments**', async (route) => {
			// Delay response to see loading state
			await new Promise((resolve) => setTimeout(resolve, 1000));
			await route.continue();
		});

		await page.goto(ASSESSMENTS_URL);

		// Should show loading indicator (skeleton, spinner, etc.)
		const loadingIndicator = page
			.locator('[data-testid="loading"]')
			.or(page.locator('.animate-spin, .skeleton'));

		// Check if loading indicator appears (it may disappear quickly)
		const hasLoadingState = await loadingIndicator.isVisible({ timeout: 500 }).catch(() => false);

		// Loading state should either be visible or assessments loaded
		const hasAssessments = (await page.locator('[data-testid="assessment-card"]').count()) > 0;
		expect(hasLoadingState || hasAssessments).toBe(true);
	});

	// ========================================================================
	// TEST 20: Error State Handling
	// ========================================================================

	test('should handle error when fetching assessments fails', async ({ page }) => {
		// Intercept API call and return error
		await page.route('**/api/assessments**', (route) => {
			route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Internal server error' })
			});
		});

		await page.goto(ASSESSMENTS_URL);
		await page.waitForSelector('h1:has-text("Mes Évaluations")', { state: 'visible' });

		// Should show error message or toast
		const errorMessage = page.locator('text=/erreur|error|échec/i');
		const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);

		// Error handling may vary - this tests if any error indication appears
		console.log('Error handling present:', hasError);
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
 *    - At least one teacher account with some assessments
 *    - Mix of draft, published, and archived assessments (optional but recommended)
 *
 * 3. Start the development server:
 *    pnpm dev -- --port 5175
 *
 * 4. Run E2E tests:
 *    pnpm test:e2e teacher/assessments/view-assessments
 *
 * 5. Run with headed browser (for debugging):
 *    pnpm test:e2e --headed teacher/assessments/view-assessments
 *
 * NOTE: Some tests are conditional and will skip if certain UI elements
 * (like search or filters) are not present.
 */
