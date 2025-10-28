/**
 * E2E Tests: Protected Routes and Role-Based Access Control
 * ==========================================================
 *
 * Comprehensive tests for authorization including:
 * - Protected route access without authentication
 * - Role-based access control (RBAC)
 * - Teacher-only routes
 * - Student-only routes
 * - Admin-only routes
 * - Cross-role access prevention
 *
 * Author: Claude Code
 * Date: 2025-10-28
 */

import { test, expect } from '@playwright/test';
import {
	loginAsTeacher,
	loginAsStudent,
	loginAsAdmin,
	expectProtectedRouteRedirects,
	expectRoleAccess,
	clearSession
} from '../helpers/auth-helpers';

// Set timeout for all tests in this file
test.setTimeout(60000); // 60 seconds

// ============================================================================
// PROTECTED ROUTES WITHOUT AUTHENTICATION
// ============================================================================

test.describe('Protected Routes Without Authentication', () => {
	test.beforeEach(async ({ page }) => {
		// Ensure logged out before each test
		await clearSession(page);
	});

	test('unauthenticated user cannot access /dashboard', async ({ page }) => {
		await expectProtectedRouteRedirects(page, '/dashboard');

		// Verify redirected to login
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('unauthenticated user cannot access /dashboard/teacher/assessments', async ({ page }) => {
		await expectProtectedRouteRedirects(page, '/dashboard/teacher/assessments');

		// Verify redirected to login
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('unauthenticated user cannot access /dashboard/student/assessments', async ({ page }) => {
		await expectProtectedRouteRedirects(page, '/dashboard/student/assessments');

		// Verify redirected to login
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('unauthenticated user cannot access /dashboard/admin/users', async ({ page }) => {
		await expectProtectedRouteRedirects(page, '/dashboard/admin/users');

		// Verify redirected to login
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('unauthenticated user cannot access /messages', async ({ page }) => {
		await expectProtectedRouteRedirects(page, '/messages');

		// Verify redirected to login
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('unauthenticated user cannot access teacher rewards page', async ({ page }) => {
		await expectProtectedRouteRedirects(page, '/dashboard/teacher/rewards');

		// Verify redirected to login
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('unauthenticated user cannot access student profile', async ({ page }) => {
		await expectProtectedRouteRedirects(page, '/dashboard/student/profile');

		// Verify redirected to login
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('unauthenticated user cannot access admin settings', async ({ page }) => {
		await expectProtectedRouteRedirects(page, '/dashboard/admin/settings');

		// Verify redirected to login
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('unauthenticated user cannot access navadra combat', async ({ page }) => {
		await expectProtectedRouteRedirects(page, '/dashboard/navadra/combat');

		// Verify redirected to login
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('unauthenticated user cannot access flashcards', async ({ page }) => {
		await expectProtectedRouteRedirects(page, '/dashboard/student/flashcards');

		// Verify redirected to login
		await expect(page).toHaveURL(/\/auth\/login/);
	});
});

// ============================================================================
// TEACHER ROLE ACCESS
// ============================================================================

test.describe('Teacher Role Access', () => {
	test.beforeEach(async ({ page }) => {
		// Login as teacher before each test
		await loginAsTeacher(page);
	});

	test('teacher can access /dashboard', async ({ page }) => {
		await page.goto('/dashboard');

		// Should stay on dashboard (no redirect)
		await expect(page).toHaveURL(/\/dashboard/);

		// Should not see error message
		await expect(page.locator('text=/unauthorized|forbidden|access denied/i')).not.toBeVisible();
	});

	test('teacher can access /dashboard/teacher/assessments', async ({ page }) => {
		await expectRoleAccess(page, 'teacher');

		// Verify on correct route
		await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments/);
	});

	test('teacher can access teacher-specific routes', async ({ page }) => {
		const teacherRoutes = [
			'/dashboard/teacher/assessments',
			'/dashboard/teacher/students',
			'/dashboard/teacher/rewards',
			'/dashboard/teacher/exercises'
		];

		for (const route of teacherRoutes) {
			// Navigate to route
			await page.goto(route);

			// Verify access granted (no redirect or error)
			await expect(page).toHaveURL(new RegExp(route));

			// Should not see unauthorized message
			const unauthorizedMessage = page.locator('text=/unauthorized|forbidden|access denied/i');
			const isVisible = await unauthorizedMessage.isVisible().catch(() => false);
			expect(isVisible).toBe(false);
		}
	});

	test('teacher CANNOT access student-specific routes', async ({ page }) => {
		const studentRoutes = [
			'/dashboard/student/assessments',
			'/dashboard/student/flashcards',
			'/dashboard/student/profile'
		];

		for (const route of studentRoutes) {
			// Try to navigate to student route
			await page.goto(route);

			// Should either redirect or show error
			const currentUrl = page.url();
			const isBlocked =
				!currentUrl.includes(route) ||
				(await page
					.locator('text=/unauthorized|forbidden|access denied/i')
					.isVisible()
					.catch(() => false));

			// Verify access is blocked
			expect(isBlocked).toBe(true);
		}
	});

	test('teacher CANNOT access admin-specific routes', async ({ page }) => {
		const adminRoutes = [
			'/dashboard/admin/users',
			'/dashboard/admin/settings',
			'/dashboard/admin/analytics'
		];

		for (const route of adminRoutes) {
			// Try to navigate to admin route
			await page.goto(route);

			// Should either redirect or show error
			const currentUrl = page.url();
			const isBlocked =
				!currentUrl.includes(route) ||
				(await page
					.locator('text=/unauthorized|forbidden|access denied/i')
					.isVisible()
					.catch(() => false));

			// Verify access is blocked
			expect(isBlocked).toBe(true);
		}
	});

	test('teacher can access shared routes', async ({ page }) => {
		// Routes accessible by all authenticated users
		const sharedRoutes = ['/dashboard', '/messages'];

		for (const route of sharedRoutes) {
			// Navigate to route
			await page.goto(route);

			// Verify access granted
			await expect(page).toHaveURL(new RegExp(route));

			// Should not see unauthorized message
			const unauthorizedMessage = page.locator('text=/unauthorized|forbidden|access denied/i');
			const isVisible = await unauthorizedMessage.isVisible().catch(() => false);
			expect(isVisible).toBe(false);
		}
	});
});

// ============================================================================
// STUDENT ROLE ACCESS
// ============================================================================

test.describe('Student Role Access', () => {
	test.beforeEach(async ({ page }) => {
		// Login as student before each test
		await loginAsStudent(page);
	});

	test('student can access /dashboard', async ({ page }) => {
		await page.goto('/dashboard');

		// Should stay on dashboard (no redirect)
		await expect(page).toHaveURL(/\/dashboard/);

		// Should not see error message
		await expect(page.locator('text=/unauthorized|forbidden|access denied/i')).not.toBeVisible();
	});

	test('student can access /dashboard/student/assessments', async ({ page }) => {
		await expectRoleAccess(page, 'student');

		// Verify on correct route
		await expect(page).toHaveURL(/\/dashboard\/student\/assessments/);
	});

	test('student can access student-specific routes', async ({ page }) => {
		const studentRoutes = [
			'/dashboard/student/assessments',
			'/dashboard/student/flashcards',
			'/dashboard/student/profile',
			'/dashboard/navadra/combat'
		];

		for (const route of studentRoutes) {
			// Navigate to route
			await page.goto(route);

			// Verify access granted (no redirect or error)
			await expect(page).toHaveURL(new RegExp(route));

			// Should not see unauthorized message
			const unauthorizedMessage = page.locator('text=/unauthorized|forbidden|access denied/i');
			const isVisible = await unauthorizedMessage.isVisible().catch(() => false);
			expect(isVisible).toBe(false);
		}
	});

	test('student CANNOT access teacher-specific routes', async ({ page }) => {
		const teacherRoutes = [
			'/dashboard/teacher/assessments',
			'/dashboard/teacher/students',
			'/dashboard/teacher/rewards',
			'/dashboard/teacher/exercises'
		];

		for (const route of teacherRoutes) {
			// Try to navigate to teacher route
			await page.goto(route);

			// Should either redirect or show error
			const currentUrl = page.url();
			const isBlocked =
				!currentUrl.includes(route) ||
				(await page
					.locator('text=/unauthorized|forbidden|access denied/i')
					.isVisible()
					.catch(() => false));

			// Verify access is blocked
			expect(isBlocked).toBe(true);
		}
	});

	test('student CANNOT access admin-specific routes', async ({ page }) => {
		const adminRoutes = [
			'/dashboard/admin/users',
			'/dashboard/admin/settings',
			'/dashboard/admin/analytics'
		];

		for (const route of adminRoutes) {
			// Try to navigate to admin route
			await page.goto(route);

			// Should either redirect or show error
			const currentUrl = page.url();
			const isBlocked =
				!currentUrl.includes(route) ||
				(await page
					.locator('text=/unauthorized|forbidden|access denied/i')
					.isVisible()
					.catch(() => false));

			// Verify access is blocked
			expect(isBlocked).toBe(true);
		}
	});

	test('student can access shared routes', async ({ page }) => {
		// Routes accessible by all authenticated users
		const sharedRoutes = ['/dashboard', '/messages'];

		for (const route of sharedRoutes) {
			// Navigate to route
			await page.goto(route);

			// Verify access granted
			await expect(page).toHaveURL(new RegExp(route));

			// Should not see unauthorized message
			const unauthorizedMessage = page.locator('text=/unauthorized|forbidden|access denied/i');
			const isVisible = await unauthorizedMessage.isVisible().catch(() => false);
			expect(isVisible).toBe(false);
		}
	});
});

// ============================================================================
// ADMIN ROLE ACCESS
// ============================================================================

test.describe('Admin Role Access', () => {
	test.beforeEach(async ({ page }) => {
		// Login as admin before each test
		await loginAsAdmin(page);
	});

	test('admin can access /dashboard', async ({ page }) => {
		await page.goto('/dashboard');

		// Should stay on dashboard (no redirect)
		await expect(page).toHaveURL(/\/dashboard/);

		// Should not see error message
		await expect(page.locator('text=/unauthorized|forbidden|access denied/i')).not.toBeVisible();
	});

	test('admin can access /dashboard/admin/users', async ({ page }) => {
		await expectRoleAccess(page, 'admin');

		// Verify on correct route
		await expect(page).toHaveURL(/\/dashboard\/admin\/users/);
	});

	test('admin can access admin-specific routes', async ({ page }) => {
		const adminRoutes = [
			'/dashboard/admin/users',
			'/dashboard/admin/settings',
			'/dashboard/admin/analytics'
		];

		for (const route of adminRoutes) {
			// Navigate to route
			await page.goto(route);

			// Verify access granted (no redirect or error)
			await expect(page).toHaveURL(new RegExp(route));

			// Should not see unauthorized message
			const unauthorizedMessage = page.locator('text=/unauthorized|forbidden|access denied/i');
			const isVisible = await unauthorizedMessage.isVisible().catch(() => false);
			expect(isVisible).toBe(false);
		}
	});

	test('admin can access teacher routes', async ({ page }) => {
		// Admins typically have access to all routes (superuser)
		const teacherRoutes = [
			'/dashboard/teacher/assessments',
			'/dashboard/teacher/students',
			'/dashboard/teacher/rewards'
		];

		for (const route of teacherRoutes) {
			// Navigate to route
			await page.goto(route);

			// Verify access granted
			await expect(page).toHaveURL(new RegExp(route));

			// Should not see unauthorized message
			const unauthorizedMessage = page.locator('text=/unauthorized|forbidden|access denied/i');
			const isVisible = await unauthorizedMessage.isVisible().catch(() => false);
			expect(isVisible).toBe(false);
		}
	});

	test('admin can access student routes', async ({ page }) => {
		// Admins typically have access to all routes (superuser)
		const studentRoutes = [
			'/dashboard/student/assessments',
			'/dashboard/student/flashcards',
			'/dashboard/student/profile'
		];

		for (const route of studentRoutes) {
			// Navigate to route
			await page.goto(route);

			// Verify access granted
			await expect(page).toHaveURL(new RegExp(route));

			// Should not see unauthorized message
			const unauthorizedMessage = page.locator('text=/unauthorized|forbidden|access denied/i');
			const isVisible = await unauthorizedMessage.isVisible().catch(() => false);
			expect(isVisible).toBe(false);
		}
	});

	test('admin can access all protected routes', async ({ page }) => {
		const allRoutes = [
			'/dashboard',
			'/dashboard/teacher/assessments',
			'/dashboard/student/assessments',
			'/dashboard/admin/users',
			'/messages'
		];

		for (const route of allRoutes) {
			// Navigate to route
			await page.goto(route);

			// Verify access granted
			await expect(page).toHaveURL(new RegExp(route));

			// Should not see unauthorized message
			const unauthorizedMessage = page.locator('text=/unauthorized|forbidden|access denied/i');
			const isVisible = await unauthorizedMessage.isVisible().catch(() => false);
			expect(isVisible).toBe(false);
		}
	});
});

// ============================================================================
// ROLE SWITCHING
// ============================================================================

test.describe('Role Switching', () => {
	test('switching from teacher to student restricts access', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Verify teacher can access teacher route
		await page.goto('/dashboard/teacher/assessments');
		await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments/);

		// Logout and login as student
		await page.goto('/auth/logout');
		await page.waitForURL(/\/auth\/login/);

		await loginAsStudent(page);

		// Try to access teacher route
		await page.goto('/dashboard/teacher/assessments');

		// Should be blocked
		const currentUrl = page.url();
		const isBlocked =
			!currentUrl.includes('/dashboard/teacher/assessments') ||
			(await page
				.locator('text=/unauthorized|forbidden|access denied/i')
				.isVisible()
				.catch(() => false));

		expect(isBlocked).toBe(true);
	});

	test('switching from student to teacher grants teacher access', async ({ page }) => {
		// Login as student
		await loginAsStudent(page);

		// Verify student can access student route
		await page.goto('/dashboard/student/assessments');
		await expect(page).toHaveURL(/\/dashboard\/student\/assessments/);

		// Try to access teacher route (should fail)
		await page.goto('/dashboard/teacher/assessments');
		const currentUrl1 = page.url();
		const isBlocked =
			!currentUrl1.includes('/dashboard/teacher/assessments') ||
			(await page
				.locator('text=/unauthorized|forbidden|access denied/i')
				.isVisible()
				.catch(() => false));
		expect(isBlocked).toBe(true);

		// Logout and login as teacher
		await page.goto('/auth/logout');
		await page.waitForURL(/\/auth\/login/);

		await loginAsTeacher(page);

		// Now should be able to access teacher route
		await page.goto('/dashboard/teacher/assessments');
		await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments/);
	});

	test('role permissions are verified on each request', async ({ page }) => {
		// Login as student
		await loginAsStudent(page);

		// Access student route
		await page.goto('/dashboard/student/assessments');
		await expect(page).toHaveURL(/\/dashboard\/student\/assessments/);

		// Try to access teacher route in new tab (same session)
		await page.goto('/dashboard/teacher/assessments');

		// Should still be blocked (role hasn't changed)
		const currentUrl = page.url();
		const isBlocked =
			!currentUrl.includes('/dashboard/teacher/assessments') ||
			(await page
				.locator('text=/unauthorized|forbidden|access denied/i')
				.isVisible()
				.catch(() => false));

		expect(isBlocked).toBe(true);
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

test.describe('Authorization Edge Cases', () => {
	test('direct URL manipulation cannot bypass role checks', async ({ page }) => {
		// Login as student
		await loginAsStudent(page);

		// Try to manipulate URL to access teacher route
		await page.goto('/dashboard/teacher/assessments');

		// Should be blocked
		const currentUrl = page.url();
		const isBlocked =
			!currentUrl.includes('/dashboard/teacher/assessments') ||
			(await page
				.locator('text=/unauthorized|forbidden|access denied/i')
				.isVisible()
				.catch(() => false));

		expect(isBlocked).toBe(true);

		// Try another teacher route
		await page.goto('/dashboard/teacher/students');

		const currentUrl2 = page.url();
		const isBlocked2 =
			!currentUrl2.includes('/dashboard/teacher/students') ||
			(await page
				.locator('text=/unauthorized|forbidden|access denied/i')
				.isVisible()
				.catch(() => false));

		expect(isBlocked2).toBe(true);
	});

	test('browser back button respects role permissions', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Access teacher route
		await page.goto('/dashboard/teacher/assessments');
		await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments/);

		// Logout
		await page.goto('/auth/logout');
		await page.waitForURL(/\/auth\/login/);

		// Login as student
		await loginAsStudent(page);

		// Try to go back to teacher route using browser back button
		await page.goBack();

		// Should be blocked or redirected
		await page.waitForTimeout(1000); // Wait for potential redirect

		const currentUrl = page.url();
		const isBlocked =
			!currentUrl.includes('/dashboard/teacher/assessments') ||
			(await page
				.locator('text=/unauthorized|forbidden|access denied/i')
				.isVisible()
				.catch(() => false));

		// Should not have access to teacher route
		expect(isBlocked).toBe(true);
	});

	test('expired session redirects to login on protected route', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Verify authenticated
		await page.goto('/dashboard');
		await expect(page).toHaveURL(/\/dashboard/);

		// Simulate expired session by clearing cookies
		await page.context().clearCookies();

		// Try to access protected route
		await page.goto('/dashboard/teacher/assessments');

		// Should redirect to login
		await page.waitForURL(/\/auth\/login/);
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('simultaneous role access is prevented', async ({ browser }) => {
		// Create two browser contexts (different users)
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();

		const teacherPage = await context1.newPage();
		const studentPage = await context2.newPage();

		try {
			// Login as teacher in first context
			await teacherPage.goto('/auth/login');
			await loginAsTeacher(teacherPage);

			// Login as student in second context
			await studentPage.goto('/auth/login');
			await loginAsStudent(studentPage);

			// Teacher can access teacher route
			await teacherPage.goto('/dashboard/teacher/assessments');
			await expect(teacherPage).toHaveURL(/\/dashboard\/teacher\/assessments/);

			// Student cannot access teacher route (different user)
			await studentPage.goto('/dashboard/teacher/assessments');
			const currentUrl = studentPage.url();
			const isBlocked =
				!currentUrl.includes('/dashboard/teacher/assessments') ||
				(await studentPage
					.locator('text=/unauthorized|forbidden|access denied/i')
					.isVisible()
					.catch(() => false));

			expect(isBlocked).toBe(true);
		} finally {
			// Cleanup
			await context1.close();
			await context2.close();
		}
	});

	test('role verification works after page refresh', async ({ page }) => {
		// Login as teacher
		await loginAsTeacher(page);

		// Access teacher route
		await page.goto('/dashboard/teacher/assessments');
		await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments/);

		// Refresh page
		await page.reload();

		// Should still have access (session persists)
		await expect(page).toHaveURL(/\/dashboard\/teacher\/assessments/);
		await expect(page.locator('text=/unauthorized|forbidden|access denied/i')).not.toBeVisible();
	});
});
