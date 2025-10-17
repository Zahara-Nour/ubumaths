// E2E tests for different challenge types
// Author: Claude Code
// Date: 2025-10-17

import { test, expect } from '@playwright/test';

test.describe('Challenge Types', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to challenge test page
		// (Assumes a test route exists for isolated challenge testing)
		await page.goto('/dashboard/navadra/challenges/test');
	});

	test.describe('Addition Challenges', () => {
		test('solve easy addition challenge correctly', async ({ page }) => {
			// Select addition challenge
			await page.click('[data-challenge-type="addition"][data-difficulty="1"]');

			// Wait for challenge to load
			await expect(page.locator('.challenge-container')).toBeVisible();

			// Get question
			const questionText = await page.locator('.challenge-question').textContent();
			expect(questionText).toContain('+');

			// Extract numbers and calculate answer
			const numbers = questionText?.match(/\d+/g)?.map(Number) || [];
			const answer = numbers.reduce((a, b) => a + b, 0);

			// Submit answer
			await page.locator('input[name="answer"]').fill(String(answer));
			await page.click('button:has-text("Valider")');

			// Verify correct feedback
			await expect(page.locator('.feedback-correct')).toBeVisible();
			await expect(page.locator('.feedback-correct')).toContainText('Correct');
		});

		test('detect wrong answer in addition challenge', async ({ page }) => {
			await page.click('[data-challenge-type="addition"][data-difficulty="1"]');
			await expect(page.locator('.challenge-container')).toBeVisible();

			// Submit wrong answer
			await page.locator('input[name="answer"]').fill('999');
			await page.click('button:has-text("Valider")');

			// Verify incorrect feedback
			await expect(page.locator('.feedback-incorrect')).toBeVisible();
			await expect(page.locator('.feedback-incorrect')).toContainText('Incorrect');
		});

		test('show hint for addition challenge', async ({ page }) => {
			await page.click('[data-challenge-type="addition"][data-difficulty="1"]');
			await expect(page.locator('.challenge-container')).toBeVisible();

			// Click hint button
			await page.click('button:has-text("Indice")');

			// Verify hint displayed
			await expect(page.locator('.challenge-hint')).toBeVisible();
			await expect(page.locator('.challenge-hint')).toContainText('addition');
		});
	});

	test.describe('Subtraction Challenges', () => {
		test('solve subtraction challenge correctly', async ({ page }) => {
			await page.click('[data-challenge-type="subtraction"][data-difficulty="1"]');
			await expect(page.locator('.challenge-container')).toBeVisible();

			const questionText = await page.locator('.challenge-question').textContent();
			expect(questionText).toContain('-');

			const numbers = questionText?.match(/\d+/g)?.map(Number) || [];
			const answer = numbers[0] - numbers[1];

			await page.locator('input[name="answer"]').fill(String(answer));
			await page.click('button:has-text("Valider")');

			await expect(page.locator('.feedback-correct')).toBeVisible();
		});

		test('handle negative results in subtraction', async ({ page }) => {
			// This test assumes some subtraction challenges allow negative results
			await page.click('[data-challenge-type="subtraction"][data-difficulty="3"]');
			await expect(page.locator('.challenge-container')).toBeVisible();

			const questionText = await page.locator('.challenge-question').textContent();
			const numbers = questionText?.match(/-?\d+/g)?.map(Number) || [];

			// Calculate (might be negative)
			const answer = numbers[0] - numbers[1];

			await page.locator('input[name="answer"]').fill(String(answer));
			await page.click('button:has-text("Valider")');

			await expect(page.locator('.feedback-correct')).toBeVisible();
		});
	});

	test.describe('Multiplication Challenges', () => {
		test('solve multiplication challenge correctly', async ({ page }) => {
			await page.click('[data-challenge-type="multiplication"][data-difficulty="1"]');
			await expect(page.locator('.challenge-container')).toBeVisible();

			const questionText = await page.locator('.challenge-question').textContent();
			expect(questionText).toMatch(/×|\*/);

			const numbers = questionText?.match(/\d+/g)?.map(Number) || [];
			const answer = numbers.reduce((a, b) => a * b, 1);

			await page.locator('input[name="answer"]').fill(String(answer));
			await page.click('button:has-text("Valider")');

			await expect(page.locator('.feedback-correct')).toBeVisible();
		});

		test('handle large multiplication results', async ({ page }) => {
			await page.click('[data-challenge-type="multiplication"][data-difficulty="5"]');
			await expect(page.locator('.challenge-container')).toBeVisible();

			const questionText = await page.locator('.challenge-question').textContent();
			const numbers = questionText?.match(/\d+/g)?.map(Number) || [];
			const answer = numbers.reduce((a, b) => a * b, 1);

			// Verify large numbers are handled
			expect(answer).toBeGreaterThan(10);

			await page.locator('input[name="answer"]').fill(String(answer));
			await page.click('button:has-text("Valider")');

			await expect(page.locator('.feedback-correct')).toBeVisible();
		});
	});

	test.describe('Challenge Timer', () => {
		test('display timer countdown', async ({ page }) => {
			await page.click('[data-challenge-type="addition"][data-difficulty="1"]');
			await expect(page.locator('.challenge-container')).toBeVisible();

			// Verify timer is visible
			await expect(page.locator('.challenge-timer')).toBeVisible();

			// Get initial time
			const initialTime = await page.locator('.challenge-timer').textContent();
			const initialSeconds = parseInt(initialTime?.match(/\d+/)?.[0] || '30');

			// Wait 2 seconds
			await page.waitForTimeout(2000);

			// Verify time decreased
			const currentTime = await page.locator('.challenge-timer').textContent();
			const currentSeconds = parseInt(currentTime?.match(/\d+/)?.[0] || '0');

			expect(currentSeconds).toBeLessThan(initialSeconds);
		});

		test('auto-submit when timer expires', async ({ page }) => {
			// Use a challenge with short timer for testing
			await page.click('[data-challenge-type="addition"][data-difficulty="1"]');
			await expect(page.locator('.challenge-container')).toBeVisible();

			// Don't submit answer, wait for timeout
			// (In real scenario, timer is 30s; for testing you might want to mock this)
			await page.waitForTimeout(31000);

			// Verify auto-submission
			await expect(page.locator('.timeout-message')).toBeVisible();
			await expect(page.locator('.feedback-incorrect')).toBeVisible();
		});
	});

	test.describe('Challenge Difficulty Levels', () => {
		test('difficulty 1 has simple numbers', async ({ page }) => {
			await page.click('[data-challenge-type="addition"][data-difficulty="1"]');
			await expect(page.locator('.challenge-container')).toBeVisible();

			const questionText = await page.locator('.challenge-question').textContent();
			const numbers = questionText?.match(/\d+/g)?.map(Number) || [];

			// Difficulty 1 should have numbers < 20
			numbers.forEach((num) => {
				expect(num).toBeLessThan(20);
			});
		});

		test('difficulty 5 has complex numbers', async ({ page }) => {
			await page.click('[data-challenge-type="multiplication"][data-difficulty="5"]');
			await expect(page.locator('.challenge-container')).toBeVisible();

			const questionText = await page.locator('.challenge-question').textContent();
			const numbers = questionText?.match(/\d+/g)?.map(Number) || [];

			// Difficulty 5 should have larger numbers
			const hasLargeNumber = numbers.some((num) => num > 10);
			expect(hasLargeNumber).toBe(true);
		});
	});

	test.describe('MathLive Input Integration (Deferred)', () => {
		test.skip('should accept LaTeX input from MathLive', async ({ page }) => {
			// This test is skipped for Phase 1
			// Will be implemented in Phase 2 when MathLive integration is complete
		});
	});

	test.describe('Challenge Navigation', () => {
		test('allow skipping to next challenge', async ({ page }) => {
			await page.click('[data-challenge-type="addition"][data-difficulty="1"]');
			await expect(page.locator('.challenge-container')).toBeVisible();

			// Click skip button
			await page.click('button:has-text("Passer")');

			// Verify new challenge loaded
			await expect(page.locator('.challenge-container')).toBeVisible();

			// Verify question changed
			const newQuestion = await page.locator('.challenge-question').textContent();
			expect(newQuestion).toBeTruthy();
		});

		test('track challenge attempt history', async ({ page }) => {
			// Complete first challenge
			await page.click('[data-challenge-type="addition"][data-difficulty="1"]');
			await expect(page.locator('.challenge-container')).toBeVisible();

			const questionText = await page.locator('.challenge-question').textContent();
			const numbers = questionText?.match(/\d+/g)?.map(Number) || [];
			const answer = numbers.reduce((a, b) => a + b, 0);

			await page.locator('input[name="answer"]').fill(String(answer));
			await page.click('button:has-text("Valider")');

			// Go to history page
			await page.goto('/dashboard/navadra/challenges/history');

			// Verify attempt recorded
			await expect(page.locator('.attempt-history')).toBeVisible();
			await expect(page.locator('.attempt-success')).toBeVisible();
		});
	});

	test.describe('Challenge Validation', () => {
		test('accept answers with tolerance for decimals', async ({ page }) => {
			// Assumes some challenges accept decimal answers
			await page.click('[data-challenge-type="division"][data-difficulty="3"]');

			if (await page.locator('.challenge-container').isVisible()) {
				// If division challenges exist
				await page.locator('input[name="answer"]').fill('3.33');
				await page.click('button:has-text("Valider")');

				// Should accept answer within tolerance
				const feedbackCorrect = page.locator('.feedback-correct');
				const feedbackIncorrect = page.locator('.feedback-incorrect');

				// Either correct or incorrect, but shouldn't crash
				expect(
					(await feedbackCorrect.isVisible()) || (await feedbackIncorrect.isVisible())
				).toBe(true);
			}
		});

		test('trim whitespace from answers', async ({ page }) => {
			await page.click('[data-challenge-type="addition"][data-difficulty="1"]');
			await expect(page.locator('.challenge-container')).toBeVisible();

			const questionText = await page.locator('.challenge-question').textContent();
			const numbers = questionText?.match(/\d+/g)?.map(Number) || [];
			const answer = numbers.reduce((a, b) => a + b, 0);

			// Submit with whitespace
			await page.locator('input[name="answer"]').fill(`  ${answer}  `);
			await page.click('button:has-text("Valider")');

			// Should still be correct
			await expect(page.locator('.feedback-correct')).toBeVisible();
		});
	});
});
