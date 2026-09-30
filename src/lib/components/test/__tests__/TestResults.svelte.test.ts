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

/**
 * Évaluation (chantier 4) : ni « Recommencer » (une nouvelle tentative ne se
 * lance que depuis « Mes évaluations », où les tentatives sont vérifiées), ni
 * « Retour au panier ».
 */
describe('TestResults — évaluation', () => {
	it('hors évaluation : « Recommencer » et « Retour au panier »', async () => {
		const { container } = await render(TestResults, { result: result(), ...noop });
		expect(container.textContent).toContain('Recommencer avec de nouvelles questions');
		expect(container.textContent).toContain('Retour au panier');
		expect(container.querySelector('a[href="/dashboard/student/assessments"]')).toBeNull();
	});

	it('évaluation : seulement « Mes évaluations »', async () => {
		const { container } = await render(TestResults, {
			result: result(),
			...noop,
			inEvaluation: true
		});
		expect(container.textContent).not.toContain('Recommencer');
		expect(container.textContent).not.toContain('Retour au panier');
		const link = container.querySelector('a[href="/dashboard/student/assessments"]');
		expect(link?.textContent).toContain('Mes évaluations');
	});
});
