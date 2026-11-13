/**
 * Page résultats d'un contrôle (professeur) : le bilan par question et par
 * notion (chantier `bilan-controle`) porte sur les élèves du tableau — mode test
 * compris (N4) — et son échec ne fait pas échouer la page (E1).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EvaluationBreakdown } from '$lib/types/evaluation-breakdown';

const EVALUATION = '8b9c0d1e-8888-4888-8888-888888888888';
const TEACHER = '1a2b3c4d-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
	breakdown: vi.fn(),
	results: vi.fn(),
	testMode: vi.fn()
}));

vi.mock('$lib/server/middleware/auth', () => ({
	requireRoles: async () => ({ user: { id: TEACHER }, profile: { role: 'teacher' } })
}));

vi.mock('$lib/server/test-mode', () => ({ getTeacherTestMode: mocks.testMode }));

vi.mock('$lib/server/evaluation-breakdown', () => ({
	getEvaluationBreakdown: mocks.breakdown
}));

vi.mock('$lib/server/evaluations', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/server/evaluations')>();
	return {
		...original,
		getEvaluation: async () => ({
			id: EVALUATION,
			created_by: TEACHER,
			series: { title: 'Fractions', items: [] }
		}),
		getEvaluationResults: mocks.results
	};
});

import { load } from '../+page.server';

type LoadEvent = Parameters<typeof load>[0];

function event(): LoadEvent {
	return { params: { id: EVALUATION }, locals: { supabase: {} } } as unknown as LoadEvent;
}

beforeEach(() => {
	mocks.testMode.mockResolvedValue(true);
	mocks.results.mockResolvedValue([{ student_id: 's-1' }, { student_id: 's-2' }]);
});

describe('résultats d’un contrôle : bilan', () => {
	it('N4 : le bilan reçoit les élèves du tableau (mode test déjà appliqué)', async () => {
		const ok: EvaluationBreakdown = {
			status: 'ok',
			copies: 0,
			lateCopies: 0,
			questions: [],
			notions: []
		};
		mocks.breakdown.mockResolvedValue(ok);

		const data = (await load(event())) as { breakdown: EvaluationBreakdown };

		expect(mocks.results).toHaveBeenCalledWith(expect.anything(), expect.anything(), true);
		expect(mocks.breakdown).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ id: EVALUATION }),
			['s-1', 's-2']
		);
		expect(data.breakdown).toBe(ok);
	});

	it('E1 : un bilan en erreur est rendu tel quel, la page se charge', async () => {
		const failed: EvaluationBreakdown = { status: 'error', message: 'indisponible' };
		mocks.breakdown.mockResolvedValue(failed);

		const data = (await load(event())) as { breakdown: EvaluationBreakdown; results: unknown[] };

		expect(data.breakdown).toEqual(failed);
		expect(data.results).toHaveLength(2);
	});
});
