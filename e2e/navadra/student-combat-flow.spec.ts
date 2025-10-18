// E2E tests for student combat flow
// Author: Claude Code
// Date: 2025-10-17

import { test, expect } from '@playwright/test';

test.describe('Student Combat Flow', () => {
	test.beforeEach(async ({ page }) => {
		// Login as test student
		// TODO: Implement actual login flow when auth is ready
		// For now, assume we're already logged in via test fixtures
		await page.goto('/dashboard/navadra/combat');
	});

	test('complete solo combat victory', async ({ page }) => {
		// 1. Start combat with monster
		await page.click('button:has-text("Combattre")');

		// Wait for combat arena to load
		await expect(page.locator('.combat-arena')).toBeVisible();

		// Verify monster is displayed
		await expect(page.locator('.monster-panel')).toBeVisible();
		await expect(page.locator('.monster-hp')).toContainText('/');

		// Verify player panel
		await expect(page.locator('.player-panel')).toBeVisible();

		// 2. Combat loop: select spell and complete challenges until victory
		let isVictory = false;
		let turnCount = 0;
		const maxTurns = 20; // Prevent infinite loop

		while (!isVictory && turnCount < maxTurns) {
			turnCount++;

			// 3. Select first available spell
			const spellButton = page.locator('[data-spell]').first();
			await spellButton.click();

			// Wait for challenge to load
			await expect(page.locator('.challenge-container')).toBeVisible();

			// 4. Get question and answer (simple addition/subtraction/multiplication)
			const questionText = await page.locator('.challenge-question').textContent();

			// Extract numbers from question (e.g., "Calculer 5 + 3" -> 5, 3)
			const numbers = questionText?.match(/\d+/g)?.map(Number) || [];

			let answer = 0;
			if (questionText?.includes('+')) {
				answer = numbers.reduce((a, b) => a + b, 0);
			} else if (questionText?.includes('-')) {
				answer = numbers[0] - numbers[1];
			} else if (questionText?.includes('×') || questionText?.includes('*')) {
				answer = numbers.reduce((a, b) => a * b, 1);
			}

			// Submit answer
			const answerInput = page.locator('input[name="answer"]');
			await answerInput.fill(String(answer));
			await page.click('button:has-text("Valider")');

			// Wait for combat update
			await page.waitForTimeout(500);

			// Check if combat is over
			const victoryModal = page.locator('.victory-modal');
			if (await victoryModal.isVisible()) {
				isVictory = true;
			}
		}

		// 5. Verify victory
		expect(isVictory).toBe(true);

		// 6. Verify rewards displayed
		await expect(page.locator('.xp-gained')).toBeVisible();
		await expect(page.locator('.gidouilles-gained')).toBeVisible();

		// Verify XP bar updated
		await expect(page.locator('.xp-bar')).toBeVisible();
	});

	test('combat defeat scenario', async ({ page }) => {
		// Start combat
		await page.click('button:has-text("Combattre")');
		await expect(page.locator('.combat-arena')).toBeVisible();

		// Intentionally fail challenges to lose combat
		for (let i = 0; i < 10; i++) {
			// Select spell
			const spellButton = page.locator('[data-spell]').first();
			await spellButton.click();

			// Wait for challenge
			await expect(page.locator('.challenge-container')).toBeVisible();

			// Submit wrong answer
			await page.locator('input[name="answer"]').fill('999999');
			await page.click('button:has-text("Valider")');

			await page.waitForTimeout(500);

			// Check if defeated
			const defeatModal = page.locator('.defeat-modal');
			if (await defeatModal.isVisible()) {
				break;
			}
		}

		// Verify defeat modal
		await expect(page.locator('.defeat-modal')).toBeVisible();
		await expect(page.locator('.defeat-modal')).toContainText('Défaite');

		// Verify no rewards for defeat
		const xpGained = page.locator('.xp-gained');
		expect(await xpGained.isVisible()).toBe(false);
	});

	test('abandon combat mid-session', async ({ page }) => {
		// Start combat
		await page.click('button:has-text("Combattre")');
		await expect(page.locator('.combat-arena')).toBeVisible();

		// Complete one turn
		await page.locator('[data-spell]').first().click();
		await expect(page.locator('.challenge-container')).toBeVisible();
		await page.locator('input[name="answer"]').fill('0');
		await page.click('button:has-text("Valider")');

		await page.waitForTimeout(500);

		// Click abandon button
		await page.click('button:has-text("Abandonner")');

		// Confirm abandonment
		await page.click('button:has-text("Confirmer")');

		// Verify redirected back to combat list
		await expect(page).toHaveURL('/dashboard/navadra/combat');

		// Verify combat marked as abandoned
		const abandonedCombat = page.locator('.combat-status:has-text("Abandonné")');
		await expect(abandonedCombat).toBeVisible();
	});

	test('challenge timer timeout', async ({ page }) => {
		// Start combat
		await page.click('button:has-text("Combattre")');
		await expect(page.locator('.combat-arena')).toBeVisible();

		// Select spell
		await page.locator('[data-spell]').first().click();
		await expect(page.locator('.challenge-container')).toBeVisible();

		// Wait for timer to expire (challenge timer is 30s in test fixtures)
		// We'll fast-forward by manipulating time or just wait
		await page.waitForTimeout(31000); // 31 seconds

		// Verify challenge auto-failed
		await expect(page.locator('.timeout-message')).toBeVisible();

		// Verify damage is reduced (failed challenge)
		const combatLog = page.locator('.combat-log .turn').last();
		await expect(combatLog).toContainText('échec'); // Failure indicator
	});

	test('combat state persists on page refresh', async ({ page }) => {
		// Start combat
		await page.click('button:has-text("Combattre")');
		await expect(page.locator('.combat-arena')).toBeVisible();

		// Complete one turn
		await page.locator('[data-spell]').first().click();
		await expect(page.locator('.challenge-container')).toBeVisible();
		// Verify question is displayed (validates UI state)
		await expect(page.locator('.challenge-question')).toBeVisible();
		await page.locator('input[name="answer"]').fill('42');
		await page.click('button:has-text("Valider")');

		await page.waitForTimeout(500);

		// Get current monster HP before refresh
		const hpBefore = await page.locator('.monster-hp').textContent();

		// Refresh page
		await page.reload();

		// Verify combat state restored
		await expect(page.locator('.combat-arena')).toBeVisible();

		// Verify monster HP is same
		const hpAfter = await page.locator('.monster-hp').textContent();
		expect(hpAfter).toBe(hpBefore);

		// Verify can continue combat
		await page.locator('[data-spell]').first().click();
		await expect(page.locator('.challenge-container')).toBeVisible();
	});

	test('display combat log correctly', async ({ page }) => {
		// Start combat
		await page.click('button:has-text("Combattre")');
		await expect(page.locator('.combat-arena')).toBeVisible();

		// Complete multiple turns
		for (let i = 0; i < 3; i++) {
			await page.locator('[data-spell]').first().click();
			await expect(page.locator('.challenge-container')).toBeVisible();
			await page.locator('input[name="answer"]').fill(String(i + 1));
			await page.click('button:has-text("Valider")');
			await page.waitForTimeout(500);
		}

		// Verify combat log shows all turns
		const logEntries = page.locator('.combat-log .turn');
		const count = await logEntries.count();
		expect(count).toBeGreaterThanOrEqual(3);

		// Verify log entries contain damage info
		const firstEntry = logEntries.first();
		await expect(firstEntry).toContainText('dégâts'); // Damage indicator
	});

	test('element advantage affects damage', async ({ page }) => {
		// Start combat with specific monster element
		await page.click('[data-monster-element="earth"]'); // Fire spell has advantage

		await expect(page.locator('.combat-arena')).toBeVisible();

		// Use fire spell (advantage against earth)
		await page.locator('[data-spell-element="fire"]').click();
		await expect(page.locator('.challenge-container')).toBeVisible();

		// Get question and solve correctly
		const questionText = await page.locator('.challenge-question').textContent();
		const numbers = questionText?.match(/\d+/g)?.map(Number) || [];
		const answer = numbers.reduce((a, b) => a + b, 0);

		await page.locator('input[name="answer"]').fill(String(answer));
		await page.click('button:has-text("Valider")');

		await page.waitForTimeout(500);

		// Verify element advantage bonus displayed
		const damageIndicator = page.locator('.damage-amount');
		await expect(damageIndicator).toBeVisible();
		await expect(damageIndicator).toContainText('+50%'); // Advantage bonus
	});
});
