/**
 * Carte d'évaluation, côté élève : une tentative terminée PLUS une tentative
 * ouverte → « Terminé » avec la meilleure note, ET « Reprendre la tentative en
 * cours » (la tentative ouverte ne doit pas devenir injoignable).
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EvaluationCard from '../EvaluationCard.svelte';
import type { AssignmentWithDetails, EvaluationWithSeries } from '$lib/types/evaluation';

const evaluation: EvaluationWithSeries = {
	id: 'e',
	series_id: 's',
	form: 'interactive',
	time_limit: null,
	max_attempts: null,
	deadline: null,
	shuffle_questions: true,
	academic_period_id: null,
	status: 'published',
	created_by: 't',
	created_at: '2026-09-30T10:00:00Z',
	updated_at: '2026-09-30T10:00:00Z',
	series: {
		id: 's',
		title: 'Tables',
		description: null,
		grade: '6',
		categories: [
			{ category: { theme: 'T', domain: 'D', subdomain: null, level: 1 }, quantity: 2, delay: 20 }
		],
		created_by: 't',
		created_at: '2026-09-30T10:00:00Z',
		updated_at: '2026-09-30T10:00:00Z'
	}
};

function assignment(overrides: Partial<AssignmentWithDetails>): AssignmentWithDetails {
	return {
		id: 'a',
		evaluation_id: 'e',
		class_id: null,
		student_id: 'eleve',
		assigned_by: 't',
		assigned_at: '2026-09-30T10:00:00Z',
		evaluation,
		attempts_count: 2,
		best_grade: 16,
		last_attempt_at: '2026-09-30T12:00:00Z',
		status: 'completed',
		has_open_attempt: false,
		...overrides
	};
}

async function renderCard(data: AssignmentWithDetails) {
	const onStart = vi.fn();
	const onViewResults = vi.fn();
	const result = await render(EvaluationCard, {
		evaluation,
		variant: 'student',
		assignmentData: data,
		onStart,
		onViewResults
	});
	return { ...result, onStart };
}

describe('EvaluationCard — tentative ouverte après une tentative terminée', () => {
	it('terminée + ouverte : meilleure note, « Voir les résultats » ET « Reprendre la tentative en cours »', async () => {
		const { container, onStart } = await renderCard(assignment({ has_open_attempt: true }));
		const text = container.textContent?.replace(/\s+/g, ' ') ?? '';
		expect(text).toContain('16/20');
		expect(text).toContain('Voir les résultats');
		const resume = [...container.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Reprendre la tentative en cours')
		);
		expect(resume).toBeDefined();
		resume!.click();
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it('terminée sans tentative ouverte : pas de « Reprendre »', async () => {
		const { container } = await renderCard(assignment({}));
		expect(container.textContent).not.toContain('Reprendre');
	});
});
