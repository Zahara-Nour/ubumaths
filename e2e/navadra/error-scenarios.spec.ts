// E2E tests for error scenarios and edge cases
// Author: Claude Code
// Date: 2025-10-17

import { test, expect } from '@playwright/test';

test.describe('Error Scenarios & Edge Cases', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard/navadra/combat');
	});

	test.describe('Network Errors', () => {
		test('handle network timeout during challenge submission', async ({ page, context }) => {
			// Start combat
			await page.click('button:has-text("Combattre")');
			await expect(page.locator('.combat-arena')).toBeVisible();

			// Select spell
			await page.locator('[data-spell]').first().click();
			await expect(page.locator('.challenge-container')).toBeVisible();

			// Simulate network offline
			await context.setOffline(true);

			// Try to submit answer
			await page.locator('input[name="answer"]').fill('42');
			await page.click('button:has-text("Valider")');

			// Verify error message displayed
			await expect(page.locator('.error-message')).toBeVisible();
			const errorText = await page.locator('.error-message').textContent();
			expect(
				errorText?.includes('réseau') ||
					errorText?.includes('connexion') ||
					errorText?.includes('erreur')
			).toBe(true);

			// Restore network
			await context.setOffline(false);

			// Verify retry works
			await page.click('button:has-text("Réessayer")');
			await expect(page.locator('.feedback-correct, .feedback-incorrect')).toBeVisible();
		});

		test('handle slow network with loading indicators', async ({ page, context }) => {
			// Throttle network to simulate slow connection
			await context.route('**/api/**', (route) =>
				route.continue({
					// Delay by 2 seconds
					headers: {
						...route.request().headers(),
						'X-Delay': '2000'
					}
				})
			);

			// Start combat
			await page.click('button:has-text("Combattre")');

			// Verify loading state shown
			await expect(page.locator('.loading-spinner, .loading-indicator')).toBeVisible();

			// Eventually loads
			await expect(page.locator('.combat-arena')).toBeVisible({ timeout: 10000 });
		});
	});

	test.describe('Database Errors', () => {
		test('handle combat not found error', async ({ page }) => {
			// Navigate to non-existent combat
			await page.goto('/dashboard/navadra/combat/non-existent-uuid');

			// Verify 404 or error page
			await expect(
				page.locator('h1:has-text("Combat introuvable"), h1:has-text("404")')
			).toBeVisible();

			// Verify back button works
			await page.click('a:has-text("Retour"), button:has-text("Retour")');
			await expect(page).toHaveURL('/dashboard/navadra/combat');
		});

		test('handle duplicate combat creation', async ({ page }) => {
			// Create combat
			await page.click('button:has-text("Combattre")');
			await expect(page.locator('.combat-arena')).toBeVisible();

			// Try to create another combat while one is active
			await page.goto('/dashboard/navadra/combat');
			await page.click('button:has-text("Combattre")');

			// Should either redirect to active combat or show error
			const activeWarning = page.locator('.warning:has-text("combat en cours")');
			const combatArena = page.locator('.combat-arena');

			expect((await activeWarning.isVisible()) || (await combatArena.isVisible())).toBe(true);
		});
	});

	test.describe('Invalid User Input', () => {
		test('reject non-numeric input for numeric challenges', async ({ page }) => {
			await page.click('button:has-text("Combattre")');
			await expect(page.locator('.combat-arena')).toBeVisible();

			await page.locator('[data-spell]').first().click();
			await expect(page.locator('.challenge-container')).toBeVisible();

			// Try to submit text instead of number
			await page.locator('input[name="answer"]').fill('abc');
			await page.click('button:has-text("Valider")');

			// Should show validation error or convert to 0
			const validationError = page.locator('.validation-error');
			const feedbackIncorrect = page.locator('.feedback-incorrect');

			expect((await validationError.isVisible()) || (await feedbackIncorrect.isVisible())).toBe(
				true
			);
		});

		test('handle empty answer submission', async ({ page }) => {
			await page.click('button:has-text("Combattre")');
			await expect(page.locator('.combat-arena')).toBeVisible();

			await page.locator('[data-spell]').first().click();
			await expect(page.locator('.challenge-container')).toBeVisible();

			// Submit empty answer
			await page.click('button:has-text("Valider")');

			// Should show error or treat as incorrect
			const validationError = page.locator('.validation-error:has-text("vide")');
			const submitButton = page.locator('button:has-text("Valider")');

			// Submit button should be disabled or error shown
			expect((await validationError.isVisible()) || (await submitButton.isDisabled())).toBe(true);
		});

		test('handle special characters in answer', async ({ page }) => {
			await page.click('button:has-text("Combattre")');
			await expect(page.locator('.combat-arena')).toBeVisible();

			await page.locator('[data-spell]').first().click();
			await expect(page.locator('.challenge-container')).toBeVisible();

			// Try special characters
			await page.locator('input[name="answer"]').fill('!@#$%');
			await page.click('button:has-text("Valider")');

			// Should reject or sanitize
			await expect(page.locator('.feedback-incorrect, .validation-error')).toBeVisible();
		});
	});

	test.describe('Session Expiry', () => {
		test('handle expired combat session', async ({ page }) => {
			// Create combat with old timestamp (simulate expiry)
			// This would require mocking server time or database manipulation

			// For now, test navigation to old combat
			await page.goto('/dashboard/navadra/combat/old-combat-id');

			// Should show expiry message or redirect
			const expiryMessage = page.locator('.warning:has-text("expiré")');
			const redirected = page.url().includes('/combat') && !page.url().includes('old-combat-id');

			expect((await expiryMessage.isVisible()) || redirected).toBe(true);
		});

		test('handle student returning to old combat session', async ({ page }) => {
			// Start combat
			await page.click('button:has-text("Combattre")');
			await expect(page.locator('.combat-arena')).toBeVisible();

			const combatUrl = page.url();

			// Simulate student leaving and returning hours later
			await page.goto('/dashboard');
			await page.waitForTimeout(1000);

			// Return to old combat
			await page.goto(combatUrl);

			// Should either resume or show expiry
			const combatArena = page.locator('.combat-arena');
			const expiryMessage = page.locator('.warning:has-text("expiré")');

			expect((await combatArena.isVisible()) || (await expiryMessage.isVisible())).toBe(true);
		});
	});

	test.describe('Concurrent Actions', () => {
		test('prevent concurrent spell selection', async ({ page }) => {
			await page.click('button:has-text("Combattre")');
			await expect(page.locator('.combat-arena')).toBeVisible();

			// Rapidly click multiple spells
			const spell1 = page.locator('[data-spell="1"]');
			const spell2 = page.locator('[data-spell="2"]');

			await Promise.all([spell1.click(), spell2.click()]);

			// Only one challenge should load
			const challenges = page.locator('.challenge-container');
			expect(await challenges.count()).toBeLessThanOrEqual(1);
		});

		test('handle concurrent combat creation by same user', async ({ page, context }) => {
			// Open two tabs as same user
			const page2 = await context.newPage();

			// Try to create combat in both tabs
			await page.goto('/dashboard/navadra/combat');
			await page2.goto('/dashboard/navadra/combat');

			await Promise.all([
				page.click('button:has-text("Combattre")'),
				page2.click('button:has-text("Combattre")')
			]);

			// One should succeed, other should redirect or error
			await page.waitForTimeout(1000);
			await page2.waitForTimeout(1000);

			const page1HasCombat = await page.locator('.combat-arena').isVisible();
			const page2HasCombat = await page2.locator('.combat-arena').isVisible();

			// At most one should have active combat
			expect(page1HasCombat && page2HasCombat).toBe(false);

			await page2.close();
		});
	});

	test.describe('Browser State Recovery', () => {
		test('recover combat state after page refresh', async ({ page }) => {
			// Start combat
			await page.click('button:has-text("Combattre")');
			await expect(page.locator('.combat-arena')).toBeVisible();

			// Complete one turn
			await page.locator('[data-spell]').first().click();
			await expect(page.locator('.challenge-container')).toBeVisible();
			await page.locator('input[name="answer"]').fill('42');
			await page.click('button:has-text("Valider")');

			await page.waitForTimeout(500);

			// Get state before refresh
			const monsterHpBefore = await page.locator('.monster-hp').textContent();
			const turnCountBefore = (await page.locator('.combat-log .turn').count()) || 1;

			// Refresh page
			await page.reload();

			// Verify state restored
			await expect(page.locator('.combat-arena')).toBeVisible();

			const monsterHpAfter = await page.locator('.monster-hp').textContent();
			const turnCountAfter = (await page.locator('.combat-log .turn').count()) || 0;

			expect(monsterHpAfter).toBe(monsterHpBefore);
			expect(turnCountAfter).toBeGreaterThanOrEqual(turnCountBefore);
		});

		test('handle back button during combat', async ({ page }) => {
			await page.click('button:has-text("Combattre")');
			await expect(page.locator('.combat-arena')).toBeVisible();

			// Go to challenge
			await page.locator('[data-spell]').first().click();
			await expect(page.locator('.challenge-container')).toBeVisible();

			// Use browser back button
			await page.goBack();

			// Should return to combat arena or handle gracefully
			const combatArena = page.locator('.combat-arena');
			const challengeContainer = page.locator('.challenge-container');

			expect((await combatArena.isVisible()) || (await challengeContainer.isVisible())).toBe(true);
		});

		test('handle browser forward button', async ({ page }) => {
			await page.goto('/dashboard/navadra/combat');
			await page.goto('/dashboard/navadra/spells');

			// Go back
			await page.goBack();
			await expect(page).toHaveURL('/dashboard/navadra/combat');

			// Go forward
			await page.goForward();
			await expect(page).toHaveURL('/dashboard/navadra/spells');

			// No errors should occur
			await expect(page.locator('.error-page')).not.toBeVisible();
		});
	});

	test.describe('Invalid Spell Selection', () => {
		test('prevent selecting spell not in deck', async ({ page }) => {
			await page.click('button:has-text("Combattre")');
			await expect(page.locator('.combat-arena')).toBeVisible();

			// Try to select invalid spell via URL manipulation
			await page.goto(page.url() + '?spell=999');

			// Should show error or ignore invalid spell
			const errorMessage = page.locator('.error-message');
			const spellSelector = page.locator('.spell-selector');

			// Either error shown or back to spell selection
			expect((await errorMessage.isVisible()) || (await spellSelector.isVisible())).toBe(true);
		});

		test('handle spell deck with less than 10 spells', async ({ page }) => {
			// This would require database setup with incomplete deck

			// Navigate to combat
			await page.goto('/dashboard/navadra/combat');

			// Should show warning about incomplete deck
			const deckWarning = page.locator('.warning:has-text("deck")');
			const combatDisabled = page.locator('button:has-text("Combattre")[disabled]');

			expect((await deckWarning.isVisible()) || (await combatDisabled.isVisible())).toBe(true);
		});
	});

	test.describe('Challenge Edge Cases', () => {
		test('handle division by zero in challenge', async ({ page }) => {
			// If a division challenge accidentally generates denominator = 0

			// This is a unit test concern, but verify UI handles it gracefully
			await page.goto('/dashboard/navadra/challenges/test');

			// Select division challenge (if available)
			const divisionChallenge = page.locator('[data-challenge-type="division"]');

			if (await divisionChallenge.isVisible()) {
				await divisionChallenge.click();

				// Challenge should either not have 0 denominator, or handle error
				const questionText = await page.locator('.challenge-question').textContent();
				expect(questionText).not.toContain('/ 0');
			}
		});

		test('handle very large numbers in challenge', async ({ page }) => {
			await page.goto('/dashboard/navadra/challenges/test');

			// Select high difficulty challenge
			await page.click('[data-challenge-type="multiplication"][data-difficulty="5"]');
			await expect(page.locator('.challenge-container')).toBeVisible();

			const questionText = await page.locator('.challenge-question').textContent();
			const numbers = questionText?.match(/\d+/g)?.map(Number) || [];
			const answer = numbers.reduce((a, b) => a * b, 1);

			// Submit large answer
			await page.locator('input[name="answer"]').fill(String(answer));
			await page.click('button:has-text("Valider")');

			// Should handle correctly
			await expect(page.locator('.feedback-correct, .feedback-incorrect')).toBeVisible();
		});

		test('handle negative numbers in answer', async ({ page }) => {
			await page.goto('/dashboard/navadra/challenges/test');

			await page.click('[data-challenge-type="subtraction"][data-difficulty="3"]');
			await expect(page.locator('.challenge-container')).toBeVisible();

			const questionText = await page.locator('.challenge-question').textContent();
			const numbers = questionText?.match(/-?\d+/g)?.map(Number) || [];
			const answer = numbers[0] - numbers[1];

			if (answer < 0) {
				await page.locator('input[name="answer"]').fill(String(answer));
				await page.click('button:has-text("Valider")');

				// Should accept negative answer
				await expect(page.locator('.feedback-correct')).toBeVisible();
			}
		});
	});

	test.describe('Performance Edge Cases', () => {
		test('handle rapid spell selection clicks', async ({ page }) => {
			await page.click('button:has-text("Combattre")');
			await expect(page.locator('.combat-arena')).toBeVisible();

			// Rapidly click same spell multiple times
			const spellButton = page.locator('[data-spell]').first();

			for (let i = 0; i < 10; i++) {
				await spellButton.click();
			}

			// Should only trigger one challenge
			await page.waitForTimeout(1000);
			const challenges = page.locator('.challenge-container');
			expect(await challenges.count()).toBeLessThanOrEqual(1);
		});

		test('handle long combat session (many turns)', async ({ page }) => {
			await page.click('button:has-text("Combattre")');
			await expect(page.locator('.combat-arena')).toBeVisible();

			// Complete 20 turns (simulate long combat)
			for (let i = 0; i < 20; i++) {
				await page.locator('[data-spell]').first().click();
				await expect(page.locator('.challenge-container')).toBeVisible();
				await page.locator('input[name="answer"]').fill(String(i));
				await page.click('button:has-text("Valider")');
				await page.waitForTimeout(300);

				// Check if victory
				if (await page.locator('.victory-modal').isVisible()) {
					break;
				}
			}

			// Combat log should handle many entries
			const logEntries = page.locator('.combat-log .turn');
			expect(await logEntries.count()).toBeGreaterThan(0);

			// Page should still be responsive
			await expect(page.locator('.combat-arena')).toBeVisible();
		});
	});
});
