/**
 * Authentication E2E Test Helper Functions
 * =========================================
 *
 * Provides authentication utilities for e2e tests:
 * - Login/logout for different user roles (teacher, student, admin)
 * - Session management
 * - Authentication state verification
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type UserRole = 'teacher' | 'student' | 'admin';

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface TestUser {
	email: string;
	password: string;
	role: UserRole;
	firstname?: string;
	lastname?: string;
}

// ============================================================================
// TEST USER CREDENTIALS
// ============================================================================

/**
 * Get test user credentials from environment variables
 * Falls back to defaults if environment variables are not set
 */
export function getTestUsers(): Record<UserRole, TestUser> {
	return {
		teacher: {
			email: process.env.TEST_TEACHER_EMAIL || 'teacher@voltairedoha.com',
			password: process.env.TEST_TEACHER_PASSWORD || 'test-password-secure-123',
			role: 'teacher',
			firstname: 'John',
			lastname: 'Doe'
		},
		student: {
			email: process.env.TEST_STUDENT_EMAIL || 'student@voltairedoha.com',
			password: process.env.TEST_STUDENT_PASSWORD || 'test-password-secure-123',
			role: 'student',
			firstname: 'Alice',
			lastname: 'Smith'
		},
		admin: {
			email: process.env.TEST_ADMIN_EMAIL || 'admin@voltairedoha.com',
			password: process.env.TEST_ADMIN_PASSWORD || 'test-password-secure-123',
			role: 'admin',
			firstname: 'Admin',
			lastname: 'User'
		}
	};
}

// ============================================================================
// LOGIN HELPERS
// ============================================================================

/**
 * Generic login function
 *
 * @param page - Playwright page object
 * @param email - User email
 * @param password - User password
 * @param expectedRedirect - Expected URL pattern after successful login
 */
export async function login(
	page: Page,
	email: string,
	password: string,
	expectedRedirect?: string | RegExp
): Promise<void> {
	// Navigate to login page
	await page.goto('/auth/login');

	// Wait for login form to be visible
	await page.waitForSelector('input[type="email"]', { state: 'visible' });

	// Fill credentials
	await page.fill('input[type="email"]', email);
	await page.fill('input[type="password"]', password);

	// Submit form
	await page.click('button[type="submit"]');

	// Wait for navigation to complete
	if (expectedRedirect) {
		await page.waitForURL(expectedRedirect);
	} else {
		// Wait for any navigation away from login page
		await page.waitForURL((url) => !url.pathname.includes('/auth/login'));
	}
}

/**
 * Login as a teacher user
 *
 * @param page - Playwright page object
 * @param email - Optional custom teacher email
 * @param password - Optional custom teacher password
 *
 * @example
 * ```typescript
 * test('teacher workflow', async ({ page }) => {
 *   await loginAsTeacher(page);
 *   // Now at /dashboard
 * });
 * ```
 */
export async function loginAsTeacher(page: Page, email?: string, password?: string): Promise<void> {
	const testUsers = getTestUsers();
	const teacherEmail = email || testUsers.teacher.email;
	const teacherPassword = password || testUsers.teacher.password;

	await login(page, teacherEmail, teacherPassword, /\/dashboard/);
}

/**
 * Login as a student user
 *
 * @param page - Playwright page object
 * @param email - Optional custom student email
 * @param password - Optional custom student password
 *
 * @example
 * ```typescript
 * test('student workflow', async ({ page }) => {
 *   await loginAsStudent(page);
 *   // Now at /dashboard
 * });
 * ```
 */
export async function loginAsStudent(page: Page, email?: string, password?: string): Promise<void> {
	const testUsers = getTestUsers();
	const studentEmail = email || testUsers.student.email;
	const studentPassword = password || testUsers.student.password;

	await login(page, studentEmail, studentPassword, /\/dashboard/);
}

/**
 * Login as an admin user
 *
 * @param page - Playwright page object
 * @param email - Optional custom admin email
 * @param password - Optional custom admin password
 *
 * @example
 * ```typescript
 * test('admin workflow', async ({ page }) => {
 *   await loginAsAdmin(page);
 *   // Now at /dashboard
 * });
 * ```
 */
export async function loginAsAdmin(page: Page, email?: string, password?: string): Promise<void> {
	const testUsers = getTestUsers();
	const adminEmail = email || testUsers.admin.email;
	const adminPassword = password || testUsers.admin.password;

	await login(page, adminEmail, adminPassword, /\/dashboard/);
}

// ============================================================================
// LOGOUT HELPERS
// ============================================================================

/**
 * Logout the current user
 *
 * @param page - Playwright page object
 *
 * @example
 * ```typescript
 * test('logout flow', async ({ page }) => {
 *   await loginAsTeacher(page);
 *   await logout(page);
 *   // Now at /auth/login
 * });
 * ```
 */
export async function logout(page: Page): Promise<void> {
	// Navigate to logout endpoint
	await page.goto('/auth/logout');

	// Wait for redirect to login page
	await page.waitForURL(/\/auth\/login/);
}

// ============================================================================
// AUTHENTICATION STATE VERIFICATION
// ============================================================================

/**
 * Verify user is authenticated and on dashboard
 *
 * @param page - Playwright page object
 */
export async function expectAuthenticated(page: Page): Promise<void> {
	// Should be on dashboard or a protected route
	await expect(page).toHaveURL(/\/dashboard/);

	// Should not see login form
	await expect(page.locator('input[type="email"]')).not.toBeVisible();
}

/**
 * Verify user is NOT authenticated (on login page)
 *
 * @param page - Playwright page object
 */
export async function expectNotAuthenticated(page: Page): Promise<void> {
	// Should be on login or public page
	const url = page.url();
	const isPublic =
		url.includes('/auth/login') || url.includes('/signup') || url.includes('/auth/reset-password');

	if (!isPublic) {
		// If accessing protected route, should redirect to login
		await page.waitForURL(/\/auth\/login/);
	}
}

/**
 * Verify protected route redirects to login when not authenticated
 *
 * @param page - Playwright page object
 * @param protectedRoute - Protected route to test
 *
 * @example
 * ```typescript
 * test('protected routes require auth', async ({ page }) => {
 *   await expectProtectedRouteRedirects(page, '/dashboard/teacher/assessments');
 *   // Should now be at /auth/login
 * });
 * ```
 */
export async function expectProtectedRouteRedirects(
	page: Page,
	protectedRoute: string
): Promise<void> {
	// Try to navigate to protected route
	await page.goto(protectedRoute);

	// Should redirect to login
	await page.waitForURL(/\/auth\/login/);
}

// ============================================================================
// ROLE-BASED ACCESS VERIFICATION
// ============================================================================

/**
 * Verify user has access to role-specific routes
 *
 * @param page - Playwright page object
 * @param role - User role to verify
 *
 * @example
 * ```typescript
 * test('teacher has access to teacher routes', async ({ page }) => {
 *   await loginAsTeacher(page);
 *   await expectRoleAccess(page, 'teacher');
 * });
 * ```
 */
export async function expectRoleAccess(page: Page, role: UserRole): Promise<void> {
	const roleRoutes: Record<UserRole, string> = {
		teacher: '/dashboard/teacher/assessments',
		student: '/dashboard/student/assessments',
		admin: '/dashboard/admin/users'
	};

	const route = roleRoutes[role];

	// Navigate to role-specific route
	await page.goto(route);

	// Should NOT redirect to login or error page
	await expect(page).toHaveURL(new RegExp(route));

	// Should not see "unauthorized" or "forbidden" message
	await expect(page.locator('text=/unauthorized|forbidden/i')).not.toBeVisible();
}

/**
 * Verify user does NOT have access to other role routes
 *
 * @param page - Playwright page object
 * @param forbiddenRole - Role that should be forbidden
 *
 * @example
 * ```typescript
 * test('student cannot access teacher routes', async ({ page }) => {
 *   await loginAsStudent(page);
 *   await expectRoleForbidden(page, 'teacher');
 * });
 * ```
 */
export async function expectRoleForbidden(page: Page, forbiddenRole: UserRole): Promise<void> {
	const roleRoutes: Record<UserRole, string> = {
		teacher: '/dashboard/teacher/assessments',
		student: '/dashboard/student/assessments',
		admin: '/dashboard/admin/users'
	};

	const route = roleRoutes[forbiddenRole];

	// Try to navigate to forbidden route
	await page.goto(route);

	// Should either redirect or show error
	const url = page.url();
	const isForbidden =
		!url.includes(route) ||
		(await page.locator('text=/unauthorized|forbidden|access denied/i').isVisible());

	expect(isForbidden).toBe(true);
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Clear all cookies and local storage
 *
 * @param page - Playwright page object
 *
 * @example
 * ```typescript
 * test('clear session', async ({ page }) => {
 *   await loginAsTeacher(page);
 *   await clearSession(page);
 *   await expectNotAuthenticated(page);
 * });
 * ```
 */
export async function clearSession(page: Page): Promise<void> {
	// Clear cookies
	await page.context().clearCookies();

	// Clear local storage
	await page.evaluate(() => {
		localStorage.clear();
		sessionStorage.clear();
	});
}

/**
 * Get authentication cookie value
 *
 * @param page - Playwright page object
 * @returns Auth cookie value or null if not found
 */
export async function getAuthCookie(page: Page): Promise<string | null> {
	const cookies = await page.context().cookies();

	// Look for common auth cookie names
	const authCookieNames = [
		'sb-access-token',
		'sb-refresh-token',
		'supabase-auth-token',
		'auth-token'
	];

	for (const name of authCookieNames) {
		const cookie = cookies.find((c) => c.name === name);
		if (cookie) {
			return cookie.value;
		}
	}

	return null;
}

/**
 * Verify authentication cookie exists
 *
 * @param page - Playwright page object
 */
export async function expectAuthCookieExists(page: Page): Promise<void> {
	const authCookie = await getAuthCookie(page);
	expect(authCookie).not.toBeNull();
}

/**
 * Verify authentication cookie does NOT exist
 *
 * @param page - Playwright page object
 */
export async function expectAuthCookieNotExists(page: Page): Promise<void> {
	const authCookie = await getAuthCookie(page);
	expect(authCookie).toBeNull();
}
