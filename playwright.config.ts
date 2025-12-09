import { defineConfig, devices } from '@playwright/test';

/**
 * Enhanced Playwright Configuration for UbuMaths E2E Tests
 * ========================================================
 *
 * Configuration optimized for comprehensive e2e testing including:
 * - Multi-browser testing (Chromium, Firefox, WebKit)
 * - Retry logic for flaky tests
 * - Screenshot and trace capture on failures
 * - Parallel test execution
 * - Test isolation and cleanup
 * - Extended timeout for rate limiting and database tests
 */

export default defineConfig({
	testDir: './e2e',

	// Maximum time one test can run for
	// Increased to 120s for rate limiting tests (database-based, no Redis)
	timeout: 120 * 1000, // 120 seconds

	// Test execution configuration
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,

	// Reporter configuration
	reporter: [
		['html', { outputFolder: 'playwright-report' }],
		['list'],
		process.env.CI ? ['github'] : ['list']
	],

	// Shared settings for all tests
	use: {
		// Base URL for navigation
		baseURL: 'http://localhost:4173',

		// Capture trace on first retry
		trace: 'on-first-retry',

		// Capture screenshot on failure
		screenshot: 'only-on-failure',

		// Video recording on failure
		video: 'retain-on-failure',

		// Navigation timeout
		navigationTimeout: 30 * 1000,

		// Action timeout
		actionTimeout: 10 * 1000
	},

	// Browser projects
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] }
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] }
		}

		// Mobile testing (optional - uncomment if needed)
		// {
		//   name: 'Mobile Chrome',
		//   use: { ...devices['Pixel 5'] }
		// },
		// {
		//   name: 'Mobile Safari',
		//   use: { ...devices['iPhone 12'] }
		// }
	],

	// Web server configuration
	webServer: {
		command: 'pnpm build && pnpm preview',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000 // 2 minutes for build
	}
});
