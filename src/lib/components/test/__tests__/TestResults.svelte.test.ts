import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TestResults from '../TestResults.svelte';
import type { TestResult } from '$lib/types/test';

/**
 * Cartes de cours (#617) : hors score, comptées à part (décision 2026-09-28).
 */
function result(overrides: Partial<TestResult> = {}): TestResult {
	return {
		mode: 'interactive',
		score: 5,
		scorePercentage: 50,
		totalQuestions: 4,
		correctAnswers: 1,
		timeSpent: 60,
		averageTime: 15,
		answers: [],
		completedAt: new Date().toISOString(),
		...overrides
	};
}

const noop = { onRestart: () => {}, onBackToCart: () => {} };

describe('TestResults — cartes de cours', () => {
	it('affiche « 2 carte(s) révisée(s) » et le total des seules questions notées', async () => {
		const { container } = await render(TestResults, {
			result: result({ reviewedCards: 2 }),
			...noop
		});
		expect(container.textContent).toContain('2 carte(s) révisée(s)');
		expect(container.textContent?.replace(/\s+/g, ' ')).toContain('1 sur 2 bonnes réponses');
	});

	it('sans carte : rien de plus, total inchangé', async () => {
		const { container } = await render(TestResults, { result: result(), ...noop });
		expect(container.textContent).not.toContain('révisée');
		expect(container.textContent?.replace(/\s+/g, ' ')).toContain('1 sur 4 bonnes réponses');
	});
});
