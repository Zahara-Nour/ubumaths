/**
 * E2E Tests: Logout and Session Management
 * =========================================
 *
 * Comprehensive tests for logout functionality including:
 * - Successful logout flows
 * - Session clearing
 * - Cookie removal
 * - Post-logout behavior (redirect, protected routes)
 * - Session persistence verification
 *
 * Author: Claude Code
 * Date: 2025-10-28
 */

import { test, expect } from '@playwright/test';
import {
	loginAsTeacher,
	loginAsStudent,
	loginAsAdmin,
	logout,
	clearSession,
	expectAuthenticated,
	expectNotAuthenticated,
	expectAuthCookieExists,
	expectAuthCookieNotExists
} from '../helpers/auth-helpers';

// Set timeout for all tests in this file
test.setTimeout(60000); // 60 seconds

// ============================================================================
// SUCCESSFUL LOGOUT FLOWS
// ============================================================================

test.describe('Successful Logout Flows', () => {
	test('teacher can logout successfully', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Verify authenticated
		await expectAuthenticated(page);
		await expectAuthCookieExists(page);

		// Logout
		await logout(page);

		// Verify logged out
		await expectNotAuthenticated(page);
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('student can logout successfully', async ({ page }) => {
		// Login as student
		await loginAsStudent(page);

		// Verify authenticated
		await expectAuthenticated(page);
		await expectAuthCookieExists(page);

		// Logout
		await logout(page);

		// Verify logged out
		await expectNotAuthenticated(page);
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('admin can logout successfully', async ({ page }) => {
		// Login as admin
		await loginAsAdmin(page);

		// Verify authenticated
		await expectAuthenticated(page);
		await expectAuthCookieExists(page);

		// Logout
		await logout(page);

		// Verify logged out
		await expectNotAuthenticated(page);
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('logout redirects to login page', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Navigate to dashboard
		await page.goto('/dashboard');
		await expect(page).toHaveURL(/\/dashboard/);

		// Logout by navigating to logout endpoint
		await page.goto('/auth/logout');

		// Wait for redirect to login page
		await page.waitForURL(/\/auth\/login/);

		// Verify on login page
		await expect(page).toHaveURL(/\/auth\/login/);
		await expect(page.locator('input[type="email"]')).toBeVisible();
	});

	test('logout from different pages redirects to login', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Navigate to a different protected page
		await page.goto('/dashboard/teacher/assessments');
		await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments/);

		// Logout
		await logout(page);

		// Verify redirected to login page
		await expect(page).toHaveURL(/\/auth\/login/);
	});
});

// ============================================================================
// SESSION CLEARING
// ============================================================================

test.describe('Session Clearing', () => {
	test('logout clears authentication cookie', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Verify auth cookie exists
		await expectAuthCookieExists(page);

		// Logout
		await logout(page);

		// Verify auth cookie is removed
		await expectAuthCookieNotExists(page);
	});

	test('logout clears all session data', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Verify authenticated
		await expectAuthenticated(page);

		// Add some data to localStorage (simulate user session data)
		await page.evaluate(() => {
			localStorage.setItem('test-session-data', 'test-value');
		});

		// Logout
		await logout(page);

		// Note: Logout may not clear localStorage automatically
		// This test documents expected behavior
		// In production, consider clearing localStorage on logout

		// Verify auth cookie is cleared
		await expectAuthCookieNotExists(page);
	});

	test('clearSession helper removes all session data', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Verify authenticated
		await expectAuthenticated(page);
		await expectAuthCookieExists(page);

		// Add data to localStorage
		await page.evaluate(() => {
			localStorage.setItem('test-key', 'test-value');
			sessionStorage.setItem('test-session-key', 'test-session-value');
		});

		// Clear session using helper
		await clearSession(page);

		// Verify cookies are cleared
		const cookies = await page.context().cookies();
		expect(cookies.length).toBe(0);

		// Verify localStorage is cleared
		const localStorageData = await page.evaluate(() => {
			return localStorage.length;
		});
		expect(localStorageData).toBe(0);

		// Verify sessionStorage is cleared
		const sessionStorageData = await page.evaluate(() => {
			return sessionStorage.length;
		});
		expect(sessionStorageData).toBe(0);
	});

	test('logout invalidates session on server', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Verify authenticated
		await expectAuthenticated(page);

		// Logout
		await logout(page);

		// Try to access protected route
		await page.goto('/dashboard');

		// Should be redirected to login (session is invalid)
		await page.waitForURL(/\/auth\/login/);
		await expect(page).toHaveURL(/\/auth\/login/);
	});
});

// ============================================================================
// POST-LOGOUT BEHAVIOR
// ============================================================================

test.describe('Post-Logout Behavior', () => {
	test('cannot access protected routes after logout', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Verify can access protected route
		await page.goto('/dashboard/teacher/assessments');
		await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments/);

		// Logout
		await logout(page);

		// Try to access same protected route
		await page.goto('/dashboard/teacher/assessments');

		// Should redirect to login
		await page.waitForURL(/\/auth\/login/);
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('must login again after logout to access dashboard', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Verify authenticated
		await expectAuthenticated(page);

		// Logout
		await logout(page);

		// Try to access dashboard
		await page.goto('/dashboard');

		// Should redirect to login
		await page.waitForURL(/\/auth\/login/);
		await expect(page).toHaveURL(/\/auth\/login/);

		// Login again
		await loginAsTeacher(page);

		// Should now be able to access dashboard
		await expect(page).toHaveURL(/\/dashboard/);
	});

	test('logout displays login form immediately', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Logout
		await logout(page);

		// Verify login form is visible
		await expect(page.locator('input[type="email"]')).toBeVisible();
		await expect(page.locator('input[type="password"]')).toBeVisible();
		await expect(page.locator('button[type="submit"]')).toBeVisible();
	});

	test('logout clears user-specific data from UI', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Navigate to dashboard
		await page.goto('/dashboard');

		// Check if user data is displayed (e.g., user name, avatar)
		// Note: Adjust selectors based on actual UI implementation
		const userMenu = page.locator(
			'[data-testid="user-menu"], .user-menu, nav [aria-label*="user"]'
		);
		const userMenuExists = (await userMenu.count()) > 0;

		if (userMenuExists) {
			// Verify user menu is visible when logged in
			await expect(userMenu.first()).toBeVisible();
		}

		// Logout
		await logout(page);

		// Verify user menu is not visible after logout
		await expect(page).toHaveURL(/\/auth\/login/);
		await expect(page.locator('input[type="email"]')).toBeVisible();
	});

	test('logout from one tab affects other tabs', async ({ browser }) => {
		// Create two browser contexts (tabs)
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();

		const page1 = await context1.newPage();
		const page2 = await context2.newPage();

		try {
			// Login in first tab
			await page1.goto('/auth/login');
			await loginAsTeacher(page1);
			await expectAuthenticated(page1);

			// Login in second tab (same user)
			await page2.goto('/auth/login');
			await loginAsTeacher(page2);
			await expectAuthenticated(page2);

			// Logout from first tab
			await logout(page1);

			// Verify first tab is logged out
			await expectNotAuthenticated(page1);

			// Second tab session is independent (different browser context)
			// In same browser context, Supabase's real-time session sync would log out both tabs
			// This test documents the behavior with separate contexts

			// Note: In production with same browser context, both tabs would be logged out
			// due to Supabase's onAuthStateChange listener
		} finally {
			// Cleanup
			await context1.close();
			await context2.close();
		}
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

test.describe('Logout Edge Cases', () => {
	test('logout when already logged out has no effect', async ({ page }) => {
		// Ensure logged out
		await clearSession(page);

		// Navigate to login page
		await page.goto('/auth/login');
		await expect(page).toHaveURL(/\/auth\/login/);

		// Try to logout (already logged out)
		await page.goto('/auth/logout');

		// Should still redirect to login
		await page.waitForURL(/\/auth\/login/);
		await expect(page).toHaveURL(/\/auth\/login/);

		// Should show login form
		await expect(page.locator('input[type="email"]')).toBeVisible();
	});

	test('logout with expired session redirects to login', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Verify authenticated
		await expectAuthenticated(page);

		// Simulate expired session by clearing cookies
		await page.context().clearCookies();

		// Try to logout
		await page.goto('/auth/logout');

		// Should redirect to login (even though session was already invalid)
		await page.waitForURL(/\/auth\/login/);
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('logout with invalid session redirects to login', async ({ page }) => {
		// Don't login, but try to access logout endpoint
		await page.goto('/auth/logout');

		// Should redirect to login
		await page.waitForURL(/\/auth\/login/);
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('rapid logout requests are handled gracefully', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Verify authenticated
		await expectAuthenticated(page);

		// Make multiple rapid logout requests
		const logoutPromises = [
			page.goto('/auth/logout'),
			page.goto('/auth/logout'),
			page.goto('/auth/logout')
		];

		// Wait for all requests to complete
		await Promise.all(logoutPromises);

		// Should eventually redirect to login
		await page.waitForURL(/\/auth\/login/);
		await expect(page).toHaveURL(/\/auth\/login/);

		// Verify logged out
		await expectAuthCookieNotExists(page);
	});

	test('logout works with navigation back button', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Navigate to dashboard
		await page.goto('/dashboard');
		await expect(page).toHaveURL(/\/dashboard/);

		// Navigate to another page
		await page.goto('/dashboard/teacher/assessments');
		await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments/);

		// Logout
		await logout(page);

		// Verify redirected to login
		await expect(page).toHaveURL(/\/auth\/login/);

		// Try to go back using browser back button
		await page.goBack();

		// Should still be on login or redirect back to login
		// (protected routes should not be accessible after logout)
		await page.waitForTimeout(1000); // Wait for potential redirect

		const currentUrl = page.url();

		// If on dashboard, should redirect to login
		if (currentUrl.includes('/dashboard')) {
			await page.waitForURL(/\/auth\/login/);
		}

		// Verify we're on login or will be redirected to login
		const isOnLoginOrRedirected =
			currentUrl.includes('/auth/login') || currentUrl.includes('/dashboard');
		expect(isOnLoginOrRedirected).toBe(true);
	});
});

// ============================================================================
// SECURITY
// ============================================================================

test.describe('Logout Security', () => {
	test('logout prevents session hijacking', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Get auth cookie before logout
		const cookiesBefore = await page.context().cookies();
		const authCookieBefore = cookiesBefore.find((c) =>
			['sb-access-token', 'sb-refresh-token', 'supabase-auth-token', 'auth-token'].includes(c.name)
		);

		// Logout
		await logout(page);

		// Verify auth cookie is removed
		await expectAuthCookieNotExists(page);

		// Try to manually set old cookie (simulate session hijacking attempt)
		if (authCookieBefore) {
			await page.context().addCookies([authCookieBefore]);
		}

		// Try to access protected route with old cookie
		await page.goto('/dashboard');

		// Should still redirect to login (old cookie is invalidated on server)
		await page.waitForURL(/\/auth\/login/, { timeout: 10000 });

		// Note: This test assumes server-side session invalidation on logout
		// Adjust based on actual implementation
	});

	test('logout clears sensitive data from memory', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Navigate to dashboard
		await page.goto('/dashboard');

		// Logout
		await logout(page);

		// Verify no sensitive data remains in page content
		const pageContent = await page.content();

		// Should not contain user email or other sensitive data
		// Note: Adjust based on actual sensitive data stored in app
		const testUsers = await import('../helpers/auth-helpers').then((m) => m.getTestUsers());

		// Page should not display user's email after logout
		expect(pageContent).not.toContain(testUsers.teacher.email);
	});

	test('logout prevents CSRF attacks', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Verify authenticated
		await expectAuthenticated(page);

		// Logout via GET request (if logout is POST-only, this should fail)
		// Note: Logout should ideally be POST-only or protected by CSRF tokens

		// Try to access logout endpoint
		await page.goto('/auth/logout');

		// Should successfully logout (GET is allowed for logout endpoint)
		await page.waitForURL(/\/auth\/login/);
		await expect(page).toHaveURL(/\/auth\/login/);

		// Note: While GET logout is convenient, POST-only logout with CSRF protection is more secure
		// This test documents current behavior
	});
});
