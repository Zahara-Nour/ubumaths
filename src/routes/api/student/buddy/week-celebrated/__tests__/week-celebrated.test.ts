/**
 * POST /api/student/buddy/week-celebrated — la semaine fêtée est retenue, pour
 * l'élève de la session seulement (chantier `regularite`, PR B2).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/middleware/auth', () => ({ requireRole: vi.fn() }));
vi.mock('$lib/server/buddy-weeks', () => ({ markWeekCelebrated: vi.fn() }));
vi.mock('$lib/utils/logger', () => ({
	createServerLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })
}));

import { requireRole } from '$lib/server/middleware/auth';
import { markWeekCelebrated } from '$lib/server/buddy-weeks';
import { POST } from '../+server';

const locals = { supabase: {} } as unknown as App.Locals;

function call() {
	return POST({ locals } as unknown as Parameters<typeof POST>[0]);
}

beforeEach(() => {
	vi.mocked(requireRole).mockReset();
	vi.mocked(markWeekCelebrated).mockReset();
	vi.mocked(requireRole).mockResolvedValue({
		user: { id: 'eleve-1' },
		profile: { id: 'eleve-1', role: 'student' }
	} as never);
});

describe('POST /api/student/buddy/week-celebrated', () => {
	it('exige un élève', async () => {
		vi.mocked(requireRole).mockRejectedValue({ status: 403, body: { message: 'Interdit' } });
		await expect(call()).rejects.toMatchObject({ status: 403 });
		expect(requireRole).toHaveBeenCalledWith(locals, 'student');
		expect(markWeekCelebrated).not.toHaveBeenCalled();
	});

	it('retient la semaine de l’élève de la session', async () => {
		vi.mocked(markWeekCelebrated).mockResolvedValue(true);
		const response = await call();
		expect(markWeekCelebrated).toHaveBeenCalledWith('eleve-1', 'celebrated');
		expect(await response.json()).toEqual({ acknowledged: true });
	});

	it('écriture en échec : 500', async () => {
		vi.mocked(markWeekCelebrated).mockRejectedValue(new Error('panne'));
		await expect(call()).rejects.toMatchObject({ status: 500 });
	});
});
