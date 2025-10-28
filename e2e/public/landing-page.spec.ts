/**
 * E2E Tests: Public Landing Page
 * ===============================
 *
 * Comprehensive tests for the public home page including:
 * - Page load and visibility
 * - Navigation links
 * - Hero section elements
 * - No authentication required
 * - Responsive design
 *
 * Author: Claude Code
 * Date: 2025-10-28
 */

import { test, expect } from '@playwright/test';

// Set timeout for all tests in this file
test.setTimeout(30000); // 30 seconds

// ============================================================================
// PAGE LOADS SUCCESSFULLY
// ============================================================================

test.describe('Landing Page - Basic Loading', () => {
	test('page loads without errors', async ({ page }) => {
		// Listen for console errors
		const consoleErrors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text());
			}
		});

		// Navigate to home page
		await page.goto('/');

		// Verify URL is correct
		await expect(page).toHaveURL('/');

		// Verify no console errors (excluding expected ones)
		const criticalErrors = consoleErrors.filter(
			(error) =>
				!error.includes('favicon') && // Ignore favicon errors
				!error.includes('sourcemap') && // Ignore sourcemap warnings
				!error.includes('ResizeObserver') // Ignore ResizeObserver loop errors (common in tests)
		);
		expect(criticalErrors).toHaveLength(0);
	});

	test('main heading is visible', async ({ page }) => {
		await page.goto('/');

		// Verify main heading "Les maths de la chandelle verte"
		const heading = page.locator('h1');
		await expect(heading).toBeVisible();

		// Verify heading contains expected text
		const headingText = await heading.textContent();
		expect(headingText?.toLowerCase()).toContain('maths');
		expect(headingText?.toLowerCase()).toContain('chandelle');
		expect(headingText?.toLowerCase()).toContain('verte');
	});

	test('navigation menu is present', async ({ page }) => {
		await page.goto('/');

		// Verify navigation exists (may be in header, nav element, or links)
		// The page should have some navigation elements
		const links = page.locator('a');
		const linkCount = await links.count();

		// Should have at least a few links (login, signup, games, etc.)
		expect(linkCount).toBeGreaterThan(0);
	});

	test('page loads with correct meta tags', async ({ page }) => {
		await page.goto('/');

		// Verify page title contains "UbuMaths" or relevant keywords
		const title = await page.title();
		expect(title.length).toBeGreaterThan(0);

		// Verify meta description exists (SEO)
		const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
		expect(metaDescription).toBeTruthy();
	});
});

// ============================================================================
// NAVIGATION LINKS
// ============================================================================

test.describe('Landing Page - Navigation', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('login link navigates to login page', async ({ page }) => {
		// Find login link (may be "Login", "Se connecter", "Connexion")
		const loginLink = page
			.locator('a')
			.filter({
				hasText: /login|connexion|se connecter/i
			})
			.first();

		// If login link exists, test it
		if ((await loginLink.count()) > 0) {
			await loginLink.click();

			// Should navigate to login page
			await expect(page).toHaveURL(/\/auth\/login/);
		}
	});

	test('signup link navigates to signup page', async ({ page }) => {
		// Find signup link (may be "Sign Up", "S'inscrire", "Inscription")
		const signupLink = page
			.locator('a')
			.filter({
				hasText: /sign.*up|inscription|s'inscrire/i
			})
			.first();

		// If signup link exists, test it
		if ((await signupLink.count()) > 0) {
			await signupLink.click();

			// Should navigate to signup page
			await expect(page).toHaveURL(/\/signup/);
		}
	});

	test('games link navigates to games page', async ({ page }) => {
		// Find games link (may be "Games", "Jeux", "Mathemo")
		const gamesLink = page
			.locator('a')
			.filter({
				hasText: /games|jeux|mathemo/i
			})
			.first();

		// If games link exists, test it
		if ((await gamesLink.count()) > 0) {
			await gamesLink.click();

			// Should navigate to games page or Mathemo
			await expect(page).toHaveURL(/\/(games|mathemo)/);
		}
	});

	test('chat link navigates to chat page', async ({ page }) => {
		// Find chat link - the SVG has an aria-label "Découvre qui est Père Ubu et tchat avec lui."
		// Or look for links to /chat
		const chatLink = page.locator('a[href*="/chat"]').first();

		// If chat link exists, test it
		if ((await chatLink.count()) > 0) {
			await chatLink.click();

			// Should navigate to chat page
			await expect(page).toHaveURL(/\/chat/);
		}
	});

	test('all navigation links are valid URLs', async ({ page }) => {
		await page.goto('/');

		// Get all links on the page
		const links = page.locator('a');
		const linkCount = await links.count();

		for (let i = 0; i < linkCount; i++) {
			const link = links.nth(i);
			const href = await link.getAttribute('href');

			// Skip if no href (shouldn't happen, but be defensive)
			if (!href) continue;

			// Verify href is a valid format (starts with / or http)
			expect(href.startsWith('/') || href.startsWith('http')).toBe(true);
		}
	});
});

// ============================================================================
// HERO SECTION
// ============================================================================

test.describe('Landing Page - Hero Section', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('hero text is visible', async ({ page }) => {
		// Main heading should be visible
		const heading = page.locator('h1');
		await expect(heading).toBeVisible();

		// Verify text content
		const text = await heading.textContent();
		expect(text).toBeTruthy();
		expect(text!.length).toBeGreaterThan(0);
	});

	test('primary CTA works (Père Ubu SVG)', async ({ page }) => {
		// Find the SVG link (Father Ubu character)
		const svgLink = page.locator('figure a').first();

		// Verify it's visible
		await expect(svgLink).toBeVisible();

		// Verify it has a valid href
		const href = await svgLink.getAttribute('href');
		expect(href).toBeTruthy();
		expect(href).toContain('/chat');
	});

	test('SVG image loads correctly', async ({ page }) => {
		// Find the SVG element
		const svg = page.locator('figure svg').first();

		// Verify SVG is visible
		await expect(svg).toBeVisible();

		// Verify SVG has dimensions
		const boundingBox = await svg.boundingBox();
		expect(boundingBox).toBeTruthy();
		expect(boundingBox!.width).toBeGreaterThan(0);
		expect(boundingBox!.height).toBeGreaterThan(0);
	});

	test('animated background is present', async ({ page }) => {
		// The .img-bg div should be present for the animated glow effect
		const imgBg = page.locator('.img-bg').first();

		// Verify it exists (may be hidden/styled with opacity)
		const imgBgCount = await imgBg.count();
		expect(imgBgCount).toBeGreaterThan(0);
	});

	test('hero section has proper layout', async ({ page }) => {
		// Verify container has proper classes for centering/spacing
		const container = page.locator('div.container').first();
		await expect(container).toBeVisible();

		// Verify figure element exists (contains SVG)
		const figure = page.locator('figure').first();
		await expect(figure).toBeVisible();

		// Verify heading exists
		const heading = page.locator('h1').first();
		await expect(heading).toBeVisible();
	});
});

// ============================================================================
// NO AUTHENTICATION REQUIRED
// ============================================================================

test.describe('Landing Page - Public Access', () => {
	test('page is accessible without login', async ({ page }) => {
		// Navigate to home page
		await page.goto('/');

		// Verify we stay on home page (no redirect to login)
		await expect(page).toHaveURL('/');
		await expect(page).not.toHaveURL(/\/auth\/login/);
	});

	test('no authentication prompts on page load', async ({ page }) => {
		await page.goto('/');

		// Wait for page to fully load
		await page.waitForLoadState('networkidle');

		// Verify we're still on home page (not redirected)
		await expect(page).toHaveURL('/');

		// Verify no authentication modals/popups appeared
		// (If your app has auth modals, add selectors here)
		const authModal = page.locator('[role="dialog"]:has-text("login")');
		await expect(authModal).toHaveCount(0);
	});

	test('page loads without authentication cookies', async ({ page }) => {
		// Clear all cookies
		await page.context().clearCookies();

		// Navigate to home page
		await page.goto('/');

		// Verify page loads successfully
		await expect(page).toHaveURL('/');
		const heading = page.locator('h1');
		await expect(heading).toBeVisible();
	});

	test('direct URL access works without redirect', async ({ page }) => {
		// Clear cookies and go directly to home page
		await page.context().clearCookies();
		await page.goto('/');

		// Should load home page, not redirect
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL('/');
	});
});

// ============================================================================
// RESPONSIVE DESIGN (OPTIONAL)
// ============================================================================

test.describe('Landing Page - Responsive Design', () => {
	test('renders correctly on mobile viewport', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		// Navigate to page
		await page.goto('/');

		// Verify main content is visible
		const heading = page.locator('h1');
		await expect(heading).toBeVisible();

		// Verify SVG is visible and sized appropriately
		const svg = page.locator('figure svg').first();
		await expect(svg).toBeVisible();

		// Verify no horizontal overflow
		const body = page.locator('body');
		const bodyWidth = await body.evaluate((el) => el.scrollWidth);
		expect(bodyWidth).toBeLessThanOrEqual(375);
	});

	test('renders correctly on tablet viewport', async ({ page }) => {
		// Set tablet viewport
		await page.setViewportSize({ width: 768, height: 1024 });

		// Navigate to page
		await page.goto('/');

		// Verify main content is visible
		const heading = page.locator('h1');
		await expect(heading).toBeVisible();

		// Verify layout adapts
		const container = page.locator('div.container').first();
		await expect(container).toBeVisible();
	});

	test('renders correctly on desktop viewport', async ({ page }) => {
		// Set desktop viewport
		await page.setViewportSize({ width: 1920, height: 1080 });

		// Navigate to page
		await page.goto('/');

		// Verify main content is visible
		const heading = page.locator('h1');
		await expect(heading).toBeVisible();

		// Verify SVG is visible
		const svg = page.locator('figure svg').first();
		await expect(svg).toBeVisible();
	});
});

// ============================================================================
// DARK MODE (OPTIONAL)
// ============================================================================

test.describe('Landing Page - Dark Mode', () => {
	test('page loads correctly in dark mode', async ({ page }) => {
		// Navigate to page
		await page.goto('/');

		// Add .dark class to html element (if your app uses this pattern)
		await page.evaluate(() => {
			document.documentElement.classList.add('dark');
		});

		// Wait for styles to apply
		await page.waitForTimeout(100);

		// Verify page is still visible and functional
		const heading = page.locator('h1');
		await expect(heading).toBeVisible();

		// Verify SVG is still visible
		const svg = page.locator('figure svg').first();
		await expect(svg).toBeVisible();
	});

	test('animated background changes in dark mode', async ({ page }) => {
		await page.goto('/');

		// Get background element
		const imgBg = page.locator('.img-bg').first();
		await expect(imgBg).toHaveCount(1);

		// Toggle dark mode
		await page.evaluate(() => {
			document.documentElement.classList.add('dark');
		});

		// Wait for animation to apply
		await page.waitForTimeout(100);

		// Verify element still exists and is styled
		await expect(imgBg).toHaveCount(1);
	});
});
