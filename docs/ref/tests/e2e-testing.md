# E2E Testing

End-to-end testing with Playwright.

## Overview

E2E tests verify complete user flows through the application:

- Full browser automation
- Real HTTP requests
- Database interactions (via seeded data)
- Cross-browser compatibility

## Setup

### Prerequisites

```bash
# Install Playwright browsers
npx playwright install --with-deps

# Start local Supabase (required for database)
pnpm db:start

# Seed test data
npx tsx tests/seed-test-data.ts
```

### Configuration (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	timeout: 120 * 1000, // 2 minute test timeout
	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,

	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', use: { ...devices['Desktop Safari'] } }
	],

	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173
	}
});
```

## Directory Structure

```
e2e/
├── auth/                    # Authentication flows
│   ├── login.spec.ts
│   ├── logout.spec.ts
│   └── signup.spec.ts
├── navadra/                 # Game system
│   ├── student-combat-flow.spec.ts
│   ├── challenge-types.spec.ts
│   └── spell-management.spec.ts
├── student/                 # Student user flows
│   ├── dashboard.spec.ts
│   └── assessments.spec.ts
├── teacher/                 # Teacher user flows
│   ├── class-management.spec.ts
│   └── grading.spec.ts
├── helpers/
│   ├── auth-helpers.ts      # Login/logout utilities
│   └── image-helpers.ts     # Image testing utilities
└── README.md
```

## Running Tests

### Commands

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e -- e2e/auth/login.spec.ts

# Run tests matching pattern
pnpm test:e2e -- --grep "login"

# Run specific browser
pnpm test:e2e -- --project=chromium
pnpm test:e2e -- --project=firefox
pnpm test:e2e -- --project=webkit

# Run with visible browser
pnpm test:e2e -- --headed

# Run in debug mode
pnpm test:e2e -- --debug

# Run single test in debug
pnpm test:e2e -- --debug e2e/auth/login.spec.ts

# Generate HTML report
pnpm test:e2e -- --reporter=html
npx playwright show-report
```

### Debug Mode

```typescript
// Add pause in test for debugging
test('debug example', async ({ page }) => {
	await page.goto('/login');
	await page.pause(); // Opens Playwright Inspector
	// ... continue test
});
```

## Authentication Helpers

### Location: `e2e/helpers/auth-helpers.ts`

```typescript
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export type UserRole = 'teacher' | 'student' | 'admin';

// Test user credentials from environment
export function getTestUsers(): Record<UserRole, TestUser> {
	return {
		teacher: {
			email: process.env.TEST_TEACHER_EMAIL || 'teacher@voltairedoha.com',
			password: process.env.TEST_TEACHER_PASSWORD || 'test-password-secure-123',
			role: 'teacher'
		},
		student: {
			email: process.env.TEST_STUDENT_EMAIL || 'student@voltairedoha.com',
			password: process.env.TEST_STUDENT_PASSWORD || 'test-password-secure-123',
			role: 'student'
		},
		admin: {
			email: process.env.TEST_ADMIN_EMAIL || 'admin@voltairedoha.com',
			password: process.env.TEST_ADMIN_PASSWORD || 'test-password-secure-123',
			role: 'admin'
		}
	};
}
```

### Login Helpers

```typescript
// Generic login
export async function login(
	page: Page,
	email: string,
	password: string,
	expectedRedirect?: string | RegExp
): Promise<void> {
	await page.goto('/auth/login');
	await page.waitForSelector('input[type="email"]', { state: 'visible' });

	await page.fill('input[type="email"]', email);
	await page.fill('input[type="password"]', password);
	await page.click('button[type="submit"]');

	if (expectedRedirect) {
		await page.waitForURL(expectedRedirect);
	} else {
		await page.waitForURL((url) => !url.pathname.includes('/auth/login'));
	}
}

// Role-specific login
export async function loginAsTeacher(page: Page): Promise<void> {
	const { teacher } = getTestUsers();
	await login(page, teacher.email, teacher.password, /\/dashboard/);
}

export async function loginAsStudent(page: Page): Promise<void> {
	const { student } = getTestUsers();
	await login(page, student.email, student.password, /\/dashboard/);
}

export async function loginAsAdmin(page: Page): Promise<void> {
	const { admin } = getTestUsers();
	await login(page, admin.email, admin.password, /\/dashboard/);
}
```

### Logout & Session

```typescript
export async function logout(page: Page): Promise<void> {
	await page.goto('/auth/logout');
	await page.waitForURL(/\/auth\/login/);
}

export async function clearSession(page: Page): Promise<void> {
	await page.context().clearCookies();
	await page.evaluate(() => {
		localStorage.clear();
		sessionStorage.clear();
	});
}
```

### Authentication Assertions

```typescript
export async function expectAuthenticated(page: Page): Promise<void> {
	await expect(page).toHaveURL(/\/dashboard/);
	await expect(page.locator('input[type="email"]')).not.toBeVisible();
}

export async function expectNotAuthenticated(page: Page): Promise<void> {
	const url = page.url();
	const isPublic =
		url.includes('/auth/login') || url.includes('/signup') || url.includes('/auth/reset-password');

	if (!isPublic) {
		await page.waitForURL(/\/auth\/login/);
	}
}

export async function expectProtectedRouteRedirects(
	page: Page,
	protectedRoute: string
): Promise<void> {
	await page.goto(protectedRoute);
	await page.waitForURL(/\/auth\/login/);
}
```

### Role Access Testing

```typescript
export async function expectRoleAccess(page: Page, role: UserRole): Promise<void> {
	const roleRoutes: Record<UserRole, string> = {
		teacher: '/dashboard/teacher/assessments',
		student: '/dashboard/student/assessments',
		admin: '/dashboard/admin/users'
	};

	await page.goto(roleRoutes[role]);
	await expect(page).toHaveURL(new RegExp(roleRoutes[role]));
	await expect(page.locator('text=/unauthorized|forbidden/i')).not.toBeVisible();
}

export async function expectRoleForbidden(page: Page, forbiddenRole: UserRole): Promise<void> {
	const roleRoutes: Record<UserRole, string> = {
		teacher: '/dashboard/teacher/assessments',
		student: '/dashboard/student/assessments',
		admin: '/dashboard/admin/users'
	};

	await page.goto(roleRoutes[forbiddenRole]);

	const url = page.url();
	const isForbidden =
		!url.includes(roleRoutes[forbiddenRole]) ||
		(await page.locator('text=/unauthorized|forbidden/i').isVisible());

	expect(isForbidden).toBe(true);
}
```

## Writing E2E Tests

### Basic Structure

```typescript
import { test, expect } from '@playwright/test';
import { loginAsTeacher, logout } from '../helpers/auth-helpers';

test.describe('Teacher Dashboard', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsTeacher(page);
	});

	test.afterEach(async ({ page }) => {
		await logout(page);
	});

	test('should display class list', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'My Classes' })).toBeVisible();
		await expect(page.getByTestId('class-list')).toBeVisible();
	});

	test('should create new class', async ({ page }) => {
		await page.click('button:has-text("Create Class")');
		await page.fill('input[name="className"]', 'Test Class');
		await page.click('button:has-text("Save")');

		await expect(page.getByText('Test Class')).toBeVisible();
	});
});
```

### Page Object Pattern

```typescript
// e2e/pages/login-page.ts
export class LoginPage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto('/auth/login');
	}

	async login(email: string, password: string) {
		await this.page.fill('input[type="email"]', email);
		await this.page.fill('input[type="password"]', password);
		await this.page.click('button[type="submit"]');
	}

	async expectError(message: string) {
		await expect(this.page.getByText(message)).toBeVisible();
	}
}

// Usage in test
test('login with invalid credentials', async ({ page }) => {
	const loginPage = new LoginPage(page);
	await loginPage.goto();
	await loginPage.login('invalid@email.com', 'wrongpassword');
	await loginPage.expectError('Invalid credentials');
});
```

### Testing Forms

```typescript
test('should validate required fields', async ({ page }) => {
	await page.goto('/create-class');

	// Submit empty form
	await page.click('button[type="submit"]');

	// Check validation errors
	await expect(page.getByText('Class name is required')).toBeVisible();
});

test('should submit form successfully', async ({ page }) => {
	await page.goto('/create-class');

	await page.fill('input[name="name"]', 'Math 101');
	await page.selectOption('select[name="grade"]', '6');
	await page.check('input[name="active"]');

	await page.click('button[type="submit"]');

	await expect(page.getByText('Class created successfully')).toBeVisible();
});
```

### Testing Navigation

```typescript
test('should navigate through app', async ({ page }) => {
	await loginAsTeacher(page);

	// Click navigation link
	await page.click('a[href="/dashboard/teacher/classes"]');
	await expect(page).toHaveURL('/dashboard/teacher/classes');

	// Use breadcrumb
	await page.click('nav[aria-label="breadcrumb"] >> text=Dashboard');
	await expect(page).toHaveURL('/dashboard');
});
```

### Testing Modals and Dialogs

```typescript
test('should confirm delete action', async ({ page }) => {
	await page.click('button[aria-label="Delete class"]');

	// Wait for dialog
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText('Are you sure?')).toBeVisible();

	// Confirm
	await dialog.getByRole('button', { name: 'Delete' }).click();

	// Verify dialog closed and item deleted
	await expect(dialog).not.toBeVisible();
	await expect(page.getByText('Class deleted')).toBeVisible();
});
```

## Assertions

### Common Assertions

```typescript
// URL
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveURL(/\/dashboard\/.*/);

// Title
await expect(page).toHaveTitle('Dashboard - UbuMaths');

// Element visibility
await expect(page.getByText('Welcome')).toBeVisible();
await expect(page.getByRole('button')).toBeEnabled();
await expect(page.getByRole('checkbox')).toBeChecked();

// Element content
await expect(page.getByTestId('score')).toHaveText('100');
await expect(page.getByTestId('score')).toContainText('10');

// Element attributes
await expect(page.getByRole('link')).toHaveAttribute('href', '/about');
await expect(page.getByRole('button')).toHaveClass(/primary/);

// Form values
await expect(page.getByRole('textbox')).toHaveValue('test@example.com');

// Count
await expect(page.getByRole('listitem')).toHaveCount(5);
```

### Custom Assertions

```typescript
// Expect toast notification
async function expectToast(page: Page, message: string) {
	await expect(page.locator('[data-sonner-toast]')).toContainText(message);
}

// Expect loading state
async function expectLoading(page: Page) {
	await expect(page.getByTestId('loading-spinner')).toBeVisible();
}

async function expectNotLoading(page: Page) {
	await expect(page.getByTestId('loading-spinner')).not.toBeVisible();
}
```

## Selectors

### Best Practices

```typescript
// Preferred: Role-based selectors
page.getByRole('button', { name: 'Submit' });
page.getByRole('textbox', { name: 'Email' });
page.getByRole('heading', { level: 1 });

// Good: Label-based
page.getByLabel('Email address');
page.getByPlaceholder('Enter your email');

// Acceptable: Test IDs
page.getByTestId('submit-button');

// Avoid: CSS selectors (brittle)
page.locator('.btn-primary'); // Avoid
page.locator('#submit-btn'); // Avoid
```

### Complex Selectors

```typescript
// Within container
const form = page.locator('form[name="login"]');
await form.getByRole('textbox', { name: 'Email' }).fill('test@example.com');

// Filter by text
page.getByRole('listitem').filter({ hasText: 'Math 101' });

// Nth element
page.getByRole('listitem').nth(0);

// Has specific child
page.locator('tr').filter({ has: page.getByText('John Doe') });
```

## Test Data Management

### Seeding Data

```bash
# Before running E2E tests
npx tsx tests/seed-test-data.ts
```

```typescript
// tests/seed-test-data.ts
import { createServiceRoleClient } from './database/helpers/trigger-test-helpers';

async function seedTestData() {
	const client = createServiceRoleClient();

	// Seed test users
	await client.from('profiles').upsert([
		{ id: 'teacher-1', email: 'teacher@voltairedoha.com', role: 'teacher' },
		{ id: 'student-1', email: 'student@voltairedoha.com', role: 'student' }
	]);

	// Seed test classes
	await client
		.from('classes')
		.upsert([{ id: 'class-1', name: 'Math 101', teacher_id: 'teacher-1' }]);
}

seedTestData().then(() => console.log('Test data seeded'));
```

### Cleaning Data

```bash
# After E2E tests
npx tsx tests/cleanup-test-data.ts
```

## Advanced Patterns

### API Mocking

```typescript
test('should handle API error gracefully', async ({ page }) => {
	// Mock API response
	await page.route('**/api/classes', (route) => {
		route.fulfill({
			status: 500,
			body: JSON.stringify({ error: 'Server error' })
		});
	});

	await page.goto('/dashboard');
	await expect(page.getByText('Failed to load classes')).toBeVisible();
});
```

### Network Interception

```typescript
test('should show loading state', async ({ page }) => {
	// Slow down API response
	await page.route('**/api/classes', async (route) => {
		await new Promise((r) => setTimeout(r, 2000));
		await route.continue();
	});

	await page.goto('/dashboard');
	await expect(page.getByTestId('loading')).toBeVisible();
});
```

### Screenshot Testing

```typescript
test('should match visual snapshot', async ({ page }) => {
	await page.goto('/dashboard');
	await expect(page).toHaveScreenshot('dashboard.png');
});

test('should match component snapshot', async ({ page }) => {
	await page.goto('/dashboard');
	const sidebar = page.getByTestId('sidebar');
	await expect(sidebar).toHaveScreenshot('sidebar.png');
});
```

### Accessibility Testing

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should have no accessibility violations', async ({ page }) => {
	await page.goto('/dashboard');

	const results = await new AxeBuilder({ page }).analyze();

	expect(results.violations).toEqual([]);
});
```

## Troubleshooting

### Common Issues

| Issue             | Solution                                     |
| ----------------- | -------------------------------------------- |
| Test timeout      | Increase timeout or check for missing awaits |
| Element not found | Add `waitFor` or check selector              |
| Flaky tests       | Add proper waits, avoid timing issues        |
| Auth issues       | Check test user credentials                  |

### Debug Tools

```bash
# Playwright Inspector
pnpm test:e2e -- --debug

# Trace viewer (on failure)
pnpm test:e2e -- --trace on
npx playwright show-trace trace.zip

# Generate report
pnpm test:e2e -- --reporter=html
npx playwright show-report
```

### Slow Tests

```typescript
// Add explicit waits only when needed
await page.waitForLoadState('networkidle');
await page.waitForSelector('.loaded');

// Use assertions with built-in waiting
await expect(page.getByText('Loaded')).toBeVisible(); // Auto-waits
```
