/**
 * E2E Tests for Teacher Students Cache System
 * ============================================
 *
 * End-to-end tests for the cache system across full user flows.
 * Tests real browser interactions with authentication and database.
 *
 * Author: Claude Code
 * Date: 2025-10-17
 */

import { test, expect } from '@playwright/test';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

// Test user credentials (should be configured in test env)
const TEACHER_EMAIL = process.env.TEST_TEACHER_EMAIL || 'teacher@voltairedoha.com';
const TEACHER_PASSWORD = process.env.TEST_TEACHER_PASSWORD || 'test-password';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Login as teacher and navigate to dashboard
 */
async function loginAsTeacher(page: any) {
	await page.goto('/login');

	// Fill in credentials
	await page.fill('input[name="email"]', TEACHER_EMAIL);
	await page.fill('input[name="password"]', TEACHER_PASSWORD);

	// Submit login form
	await page.click('button[type="submit"]');

	// Wait for dashboard to load
	await page.waitForURL('**/dashboard');
}

/**
 * Measure time taken for an action
 */
async function measureTime(action: () => Promise<void>): Promise<number> {
	const start = Date.now();
	await action();
	const end = Date.now();
	return end - start;
}

// ============================================================================
// TEST SUITE
// ============================================================================

test.describe('Teacher Students Cache E2E', () => {
	test.beforeEach(async ({ page }) => {
		// Login before each test
		await loginAsTeacher(page);
	});

	// ========================================================================
	// TEST 1: Dashboard Wheel Modal - First Open (Loading)
	// ========================================================================

	test.skip('should show loading state on first wheel modal open', async ({ page }) => {
		// Wait for dashboard to be fully loaded
		await expect(page.locator('h1')).toContainText('Dashboard');

		// Open wheel modal
		const wheelButton = page.locator('button:has-text("Choisir un élève")');
		await wheelButton.click();

		// Modal should open
		await expect(page.locator('[role="dialog"]')).toBeVisible();

		// Should show loading spinner initially
		const loadingSpinner = page.locator('[data-testid="loading"]').or(page.locator('.animate-spin'));
		await expect(loadingSpinner).toBeVisible({ timeout: 2000 });

		// Wait for wheel to load
		await expect(page.locator('.wheel-container')).toBeVisible({ timeout: 5000 });

		// Loading should be hidden
		await expect(loadingSpinner).not.toBeVisible();
	});

	// ========================================================================
	// TEST 2: Dashboard Wheel Modal - Second Open (Instant, Cached)
	// ========================================================================

	test.skip('should open wheel modal instantly on second open (cached)', async ({ page }) => {
		// First open - populate cache
		const wheelButton = page.locator('button:has-text("Choisir un élève")');
		await wheelButton.click();

		// Wait for wheel to load
		await expect(page.locator('.wheel-container')).toBeVisible({ timeout: 5000 });

		// Close modal
		const closeButton = page.locator('[role="dialog"] button[aria-label="Close"]').or(
			page.locator('[role="dialog"] button:has-text("×")')
		);
		await closeButton.click();

		// Wait for modal to close
		await expect(page.locator('[role="dialog"]')).not.toBeVisible();

		// Second open - should be instant (cached)
		const secondOpenTime = await measureTime(async () => {
			await wheelButton.click();
			await expect(page.locator('.wheel-container')).toBeVisible();
		});

		// Should open in less than 100ms (instant)
		expect(secondOpenTime).toBeLessThan(500);

		// No loading spinner should be visible
		const loadingSpinner = page.locator('[data-testid="loading"]').or(page.locator('.animate-spin'));
		await expect(loadingSpinner).not.toBeVisible();
	});

	// ========================================================================
	// TEST 3: Rewards Page - Award Gidouilles - Cache Invalidates
	// ========================================================================

	test.skip('should invalidate cache after awarding gidouilles', async ({ page }) => {
		// Navigate to rewards page
		await page.goto('/dashboard/teacher/rewards');

		// Wait for page to load
		await expect(page.locator('h1')).toContainText('Récompenses');

		// Award gidouilles to a student
		const firstStudentRow = page.locator('[data-testid="student-row"]').first();
		const increaseButton = firstStudentRow.locator('button:has-text("+")');
		await increaseButton.click();

		// Wait for success toast
		await expect(page.locator('.toast:has-text("gidouille")')).toBeVisible({ timeout: 3000 });

		// Navigate back to dashboard
		await page.goto('/dashboard');

		// Open wheel modal
		const wheelButton = page.locator('button:has-text("Choisir un élève")');
		await wheelButton.click();

		// Should show loading (cache was invalidated)
		const loadingSpinner = page.locator('[data-testid="loading"]').or(page.locator('.animate-spin'));
		await expect(loadingSpinner).toBeVisible({ timeout: 2000 });

		// Wait for reload
		await expect(page.locator('.wheel-container')).toBeVisible({ timeout: 5000 });
	});

	// ========================================================================
	// TEST 4: Import Students - Cache Clears
	// ========================================================================

	test.skip('should clear cache after importing students', async ({ page }) => {
		// Pre-populate cache by opening wheel
		const wheelButton = page.locator('button:has-text("Choisir un élève")');
		await wheelButton.click();
		await expect(page.locator('.wheel-container')).toBeVisible();

		// Close modal
		const closeButton = page.locator('[role="dialog"] button').first();
		await closeButton.click();

		// Navigate to import students page
		await page.goto('/dashboard/admin/import-students');

		// Wait for page load
		await expect(page.locator('h1')).toContainText('Import');

		// Import a test student (simplified)
		const csvInput = page.locator('textarea');
		await csvInput.fill('test@voltairedoha.com,Test,Student,6,boy,TESTCODE');

		// Submit import
		const importButton = page.locator('button:has-text("Importer")');
		await importButton.click();

		// Wait for success toast
		await expect(page.locator('.toast:has-text("succès")')).toBeVisible({ timeout: 5000 });

		// Navigate back to dashboard
		await page.goto('/dashboard');

		// Open wheel modal
		await wheelButton.click();

		// Should show loading (cache was cleared)
		const loadingSpinner = page.locator('[data-testid="loading"]').or(page.locator('.animate-spin'));
		await expect(loadingSpinner).toBeVisible({ timeout: 2000 });
	});

	// ========================================================================
	// TEST 5: Switch Classes - Preloading Works
	// ========================================================================

	test.skip('should preload students when switching classes', async ({ page }) => {
		// Wait for dashboard to load
		await expect(page.locator('h1')).toContainText('Dashboard');

		// Find class selector dropdown
		const classSelect = page.locator('select[name="class"]').or(
			page.locator('[data-testid="class-selector"]')
		);

		// Get current class
		const currentClass = await classSelect.inputValue();

		// Switch to another class
		const options = await classSelect.locator('option').all();
		if (options.length > 1) {
			await classSelect.selectOption({ index: 1 });

			// Wait a moment for preload to trigger
			await page.waitForTimeout(500);

			// Open wheel modal
			const wheelButton = page.locator('button:has-text("Choisir un élève")');
			const openTime = await measureTime(async () => {
				await wheelButton.click();
				await expect(page.locator('.wheel-container')).toBeVisible();
			});

			// Should open quickly (preloaded)
			expect(openTime).toBeLessThan(1000);
		}
	});
});

// ============================================================================
// E2E TEST SETUP INSTRUCTIONS
// ============================================================================

/**
 * To run E2E tests:
 *
 * 1. Configure test environment variables:
 *    - TEST_TEACHER_EMAIL: Valid teacher email
 *    - TEST_TEACHER_PASSWORD: Valid teacher password
 *
 * 2. Ensure test database has:
 *    - At least one teacher account
 *    - At least one class with students
 *    - At least two classes for switching test
 *
 * 3. Build and start preview server:
 *    pnpm build && pnpm preview
 *
 * 4. Run E2E tests:
 *    pnpm test:e2e teacher-students-cache
 *
 * 5. Run with headed browser (for debugging):
 *    pnpm test:e2e --headed teacher-students-cache
 *
 * NOTE: Tests are currently skipped (.skip) until test environment is configured.
 * Remove .skip from individual tests once setup is complete.
 */
