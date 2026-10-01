/**
 * E21 — résultats du professeur : la MEILLEURE note sur 20 par élève (Q36) et
 * le détail de ses tentatives (chantier 5).
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EvaluationResultsTable from '../EvaluationResultsTable.svelte';
import type { EvaluationResult } from '$lib/types/evaluation';

function row(overrides: Partial<EvaluationResult>): EvaluationResult {
	return {
		assignment_id: 'a',
		evaluation_id: 'e',
		title: 'Tables',
		grade: '6',
		class_id: null,
		student_id: 's1',
		student_firstname: 'Ada',
		student_lastname: 'Lovelace',
		class_name: '6e A',
		best_grade: null,
		attempts_count: 0,
		attempts: [],
		last_attempt_at: null,
		status: 'not_started',
		total_questions: null,
		...overrides
	};
}

describe('EvaluationResultsTable', () => {
	it('meilleure note sur 20 (pas la dernière) et chaque tentative', async () => {
		const { container } = await render(EvaluationResultsTable, {
			results: [
				row({
					best_grade: 15,
					attempts_count: 3,
					status: 'completed',
					attempts: [
						{
							grade: null,
							points_earned: null,
							total_questions: 4,
							created_at: '2026-10-01T09:00:00Z',
							completed_at: null
						},
						{
							grade: 9.5,
							points_earned: 2,
							total_questions: 4,
							created_at: '2026-09-30T11:50:00Z',
							completed_at: '2026-09-30T12:00:00Z'
						},
						{
							grade: 15,
							points_earned: 3,
							total_questions: 4,
							created_at: '2026-09-30T10:50:00Z',
							completed_at: '2026-09-30T11:00:00Z'
						}
					]
				})
			]
		});
		const best = container.querySelector('[data-testid="best-grade"]');
		expect(best?.textContent?.trim()).toBe('15/20');
		const attempts = [...container.querySelectorAll('[data-testid="attempt"]')].map((el) =>
			el.textContent?.replace(/\s+/g, ' ').trim()
		);
		expect(attempts).toHaveLength(3);
		expect(attempts[0]).toContain('en cours');
		expect(attempts[1]).toContain('9,5/20');
		expect(attempts[2]).toContain('15/20');
	});

	it('élève sans tentative : « – », aucune tentative listée', async () => {
		const { container } = await render(EvaluationResultsTable, { results: [row({})] });
		expect(container.querySelector('[data-testid="best-grade"]')?.textContent?.trim()).toBe('–');
		expect(container.querySelectorAll('[data-testid="attempt"]')).toHaveLength(0);
	});

	it('trié par nom', async () => {
		const { container } = await render(EvaluationResultsTable, {
			results: [
				row({ student_id: 's2', student_firstname: 'Zoé', student_lastname: 'B' }),
				row({ student_id: 's1', student_firstname: 'Ada', student_lastname: 'L' })
			]
		});
		const names = [...container.querySelectorAll('[data-testid="student-name"]')].map((el) =>
			el.textContent?.replace(/\s+/g, ' ').trim()
		);
		expect(names).toEqual(['Ada L', 'Zoé B']);
	});
});
