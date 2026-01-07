/**
 * Exercise E2E Test Helper Functions
 * ===================================
 *
 * Helper functions for exercise parameterization E2E tests.
 * Provides utilities for:
 * - Authentication (teacher and student login)
 * - Exercise creation via API
 * - Test data management
 * - Common test assertions
 */

import type { Page } from '@playwright/test';
import type { Database } from '$lib/types/database';

type Exercise = Database['public']['Tables']['exercises']['Row'];
type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

/**
 * Login as a teacher user
 *
 * Navigates to login page, fills credentials, and waits for dashboard redirect.
 * Uses test teacher credentials from environment or defaults.
 *
 * @param page - Playwright page object
 * @param email - Teacher email (default: teacher@test.com)
 * @param password - Teacher password (default: password)
 *
 * @example
 * ```typescript
 * test('teacher workflow', async ({ page }) => {
 *   await loginAsTeacher(page);
 *   // Now at /dashboard/teacher
 * });
 * ```
 */
export async function loginAsTeacher(
	page: Page,
	email = 'teacher@test.com',
	password = 'password'
): Promise<void> {
	await page.goto('/login');
	await page.fill('input[type="email"]', email);
	await page.fill('input[type="password"]', password);
	await page.click('button[type="submit"]');
	await page.waitForURL('/dashboard/teacher');
}

/**
 * Login as a student user
 *
 * Navigates to login page, fills credentials, and waits for dashboard redirect.
 * Uses test student credentials from environment or defaults.
 *
 * @param page - Playwright page object
 * @param email - Student email (default: student@test.com)
 * @param password - Student password (default: password)
 *
 * @example
 * ```typescript
 * test('student workflow', async ({ page }) => {
 *   await loginAsStudent(page);
 *   // Now at /dashboard/student
 * });
 * ```
 */
export async function loginAsStudent(
	page: Page,
	email = 'student@test.com',
	password = 'password'
): Promise<void> {
	await page.goto('/login');
	await page.fill('input[type="email"]', email);
	await page.fill('input[type="password"]', password);
	await page.click('button[type="submit"]');
	await page.waitForURL('/dashboard/student');
}

// ============================================================================
// EXERCISE CREATION HELPERS
// ============================================================================

/**
 * Create a parameterized exercise via API
 *
 * Makes POST request to /api/exercises to create exercise with variables.
 * Returns created exercise with generated ID.
 *
 * @param page - Playwright page object (for making authenticated request)
 * @param data - Partial exercise data with variables
 * @returns Created exercise object
 *
 * @example
 * ```typescript
 * const exercise = await createParamExercise(page, {
 *   title: 'Addition Practice',
 *   variables: [
 *     { name: 'a', expression: '{{1..10}}' },
 *     { name: 'b', expression: '{{1..10}}' }
 *   ],
 *   statement_md: 'Calculate {{a}} + {{b}}',
 *   solution_md: 'Answer: {{eval:{{a}}+{{b}}}}',
 *   distribution_mode: 'per_student',
 *   difficulty: 1
 * });
 * ```
 */
export async function createParamExercise(
	page: Page,
	data: Partial<ExerciseInsert> & { variables?: Array<{ name: string; expression: string }> }
): Promise<Exercise> {
	const response = await page.request.post('/api/exercises', {
		data: {
			title: data.title || 'Test Exercise',
			difficulty: data.difficulty || 1,
			tags: data.tags || [],
			variations: data.variations || [
				{
					label: 'default',
					statement_md: 'Default statement',
					solution_md: 'Default solution'
				}
			],
			distribution_mode: data.distribution_mode || 'on_demand',
			...data
		}
	});

	const result = await response.json();
	if (!result.success) {
		throw new Error(`Failed to create exercise: ${result.message || 'Unknown error'}`);
	}

	return result.exercise;
}

/**
 * Create a static (non-parameterized) exercise
 *
 * Convenience wrapper for creating exercises without variables.
 *
 * @param page - Playwright page object
 * @param data - Exercise data without variables
 * @returns Created exercise object
 *
 * @example
 * ```typescript
 * const exercise = await createStaticExercise(page, {
 *   title: 'Pythagorean Theorem',
 *   statement_md: 'If a=3 and b=4, find c',
 *   solution_md: 'c = 5',
 *   difficulty: 2
 * });
 * ```
 */
export async function createStaticExercise(
	page: Page,
	data: Partial<ExerciseInsert>
): Promise<Exercise> {
	return createParamExercise(page, {
		...data,
		variables: []
	});
}

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

/**
 * Navigate to exercise creation page
 *
 * @param page - Playwright page object
 */
export async function gotoNewExercise(page: Page): Promise<void> {
	await page.goto('/dashboard/teacher/exercises/new');
}

/**
 * Navigate to exercise edit page
 *
 * @param page - Playwright page object
 * @param exerciseId - Exercise UUID
 */
export async function gotoEditExercise(page: Page, exerciseId: string): Promise<void> {
	await page.goto(`/dashboard/teacher/exercises/${exerciseId}`);
}

/**
 * Navigate to exercise view page (student view)
 *
 * @param page - Playwright page object
 * @param exerciseId - Exercise UUID
 * @param groupId - Optional group ID for per_group distribution
 */
export async function gotoViewExercise(
	page: Page,
	exerciseId: string,
	groupId?: string
): Promise<void> {
	const url = groupId ? `/exercises/${exerciseId}?groupId=${groupId}` : `/exercises/${exerciseId}`;
	await page.goto(url);
}

// ============================================================================
// FORM INTERACTION HELPERS
// ============================================================================

/**
 * Fill exercise basic metadata fields
 *
 * @param page - Playwright page object
 * @param data - Metadata to fill
 *
 * @example
 * ```typescript
 * await fillExerciseMetadata(page, {
 *   title: 'Algebra Practice',
 *   difficulty: 2,
 *   topic: 'Equations'
 * });
 * ```
 */
export async function fillExerciseMetadata(
	page: Page,
	data: {
		title?: string;
		source?: string;
		difficulty?: 1 | 2 | 3;
		topic?: string;
		tags?: string;
		gradeLevels?: string;
		estimatedTime?: number;
	}
): Promise<void> {
	if (data.title !== undefined) {
		await page.fill('#title', data.title);
	}
	if (data.source !== undefined) {
		await page.fill('#source', data.source);
	}
	if (data.difficulty !== undefined) {
		await page.selectOption('#difficulty', String(data.difficulty));
	}
	if (data.topic !== undefined) {
		await page.fill('#topic', data.topic);
	}
	if (data.tags !== undefined) {
		await page.fill('#tags', data.tags);
	}
	if (data.gradeLevels !== undefined) {
		await page.fill('#gradeLevels', data.gradeLevels);
	}
	if (data.estimatedTime !== undefined) {
		await page.fill('#estimatedTime', String(data.estimatedTime));
	}
}

// ============================================================================
// CONTENT EXTRACTION HELPERS
// ============================================================================

/**
 * Extract exercise content text (statement or solution)
 *
 * Gets the rendered text content from the exercise display component.
 * Useful for verifying variable substitution worked correctly.
 *
 * @param page - Playwright page object
 * @param selector - CSS selector for content container
 * @returns Trimmed text content
 *
 * @example
 * ```typescript
 * const statement = await getExerciseContent(page, '[data-testid="exercise-statement"]');
 * expect(statement).toContain('Calculate 7 + 3'); // Variables resolved
 * expect(statement).not.toContain('{{'); // No template syntax
 * ```
 */
export async function getExerciseContent(page: Page, selector: string): Promise<string> {
	const element = page.locator(selector);
	await element.waitFor({ state: 'visible' });
	const text = await element.textContent();
	return text?.trim() || '';
}

/**
 * Extract resolved variable values from UI
 *
 * Parses variable values table shown in teacher preview mode.
 *
 * @param page - Playwright page object
 * @returns Map of variable name to resolved value
 *
 * @example
 * ```typescript
 * const variables = await getResolvedVariables(page);
 * expect(variables.get('a')).toBe('7');
 * expect(variables.get('b')).toBe('3');
 * ```
 */
export async function getResolvedVariables(page: Page): Promise<Map<string, string>> {
	const variables = new Map<string, string>();

	// Wait for variable values table
	await page.waitForSelector('[data-testid="variable-values"]');

	// Extract rows
	const rows = page.locator('[data-testid="variable-row"]');
	const count = await rows.count();

	for (let i = 0; i < count; i++) {
		const row = rows.nth(i);
		const name = await row.locator('[data-testid="variable-name"]').textContent();
		const value = await row.locator('[data-testid="variable-value"]').textContent();
		if (name && value) {
			variables.set(name.trim(), value.trim());
		}
	}

	return variables;
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Check if content contains template syntax (indicates error)
 *
 * @param content - Content to check
 * @returns True if contains {{}} syntax
 *
 * @example
 * ```typescript
 * const statement = await getExerciseContent(page, '[data-testid="statement"]');
 * expect(hasTemplateSyntax(statement)).toBe(false); // Should be resolved
 * ```
 */
export function hasTemplateSyntax(content: string): boolean {
	return /\{\{.*?\}\}/.test(content);
}

/**
 * Extract numbers from text content
 *
 * Useful for verifying mathematical operations on resolved variables.
 *
 * @param text - Text containing numbers
 * @returns Array of numbers found
 *
 * @example
 * ```typescript
 * const content = 'If a = 7 and b = 3, then c = 10';
 * const numbers = extractNumbers(content);
 * expect(numbers).toEqual([7, 3, 10]);
 * ```
 */
export function extractNumbers(text: string): number[] {
	const matches = text.match(/\d+(\.\d+)?/g);
	return matches ? matches.map(Number) : [];
}

// ============================================================================
// CLEANUP HELPERS
// ============================================================================

/**
 * Delete exercise via API
 *
 * Removes exercise from database. Useful for test cleanup.
 *
 * @param page - Playwright page object
 * @param exerciseId - Exercise UUID to delete
 *
 * @example
 * ```typescript
 * test('exercise workflow', async ({ page }) => {
 *   const exercise = await createParamExercise(page, {...});
 *   // ... test exercise ...
 *   await deleteExercise(page, exercise.id); // Cleanup
 * });
 * ```
 */
export async function deleteExercise(page: Page, exerciseId: string): Promise<void> {
	await page.request.delete(`/api/exercises/${exerciseId}`);
}

/**
 * Delete multiple exercises via API
 *
 * Bulk cleanup for tests that create many exercises.
 *
 * @param page - Playwright page object
 * @param exerciseIds - Array of exercise UUIDs
 *
 * @example
 * ```typescript
 * const exercises = await Promise.all([
 *   createParamExercise(page, {...}),
 *   createParamExercise(page, {...})
 * ]);
 * // ... tests ...
 * await deleteExercises(page, exercises.map(e => e.id));
 * ```
 */
export async function deleteExercises(page: Page, exerciseIds: string[]): Promise<void> {
	await Promise.all(exerciseIds.map((id) => deleteExercise(page, id)));
}
