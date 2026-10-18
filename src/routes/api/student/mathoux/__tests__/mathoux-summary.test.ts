/**
 * GET /api/student/mathoux — résumé léger pour le Palotin gardien.
 *
 * Le widget du Palotin le demande paresseusement (après l'affichage), pour ne
 * pas alourdir chaque chargement du tableau de bord élève.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/middleware/auth', () => ({ requireRole: vi.fn() }));
vi.mock('$lib/server/mathoux/collection', () => ({ loadMathouCollection: vi.fn() }));

import { requireRole } from '$lib/server/middleware/auth';
import { loadMathouCollection } from '$lib/server/mathoux/collection';
import { mathouxSummarySchema } from '$lib/mathoux/summary';
import { GET } from '../+server';

const SUPABASE = { from: vi.fn() };
const locals = { supabase: SUPABASE } as unknown as App.Locals;

function call() {
	return GET({ locals } as unknown as Parameters<typeof GET>[0]);
}

beforeEach(() => {
	vi.mocked(requireRole).mockReset();
	vi.mocked(loadMathouCollection).mockReset();
	vi.mocked(requireRole).mockResolvedValue({
		user: { id: 'eleve-1' },
		profile: { id: 'eleve-1', role: 'student', grade: '1_SPE' }
	} as never);
});

describe('GET /api/student/mathoux', () => {
	it('exige un élève', async () => {
		vi.mocked(requireRole).mockRejectedValue({ status: 403, body: { message: 'Interdit' } });
		await expect(call()).rejects.toMatchObject({ status: 403 });
		expect(requireRole).toHaveBeenCalledWith(locals, 'student');
		expect(loadMathouCollection).not.toHaveBeenCalled();
	});

	it('calcule pour l’élève de la session et son niveau, rend les compteurs', async () => {
		vi.mocked(loadMathouCollection).mockResolvedValue({
			races: [],
			counts: { born: 4, napping: 3, toDiscover: 2 }
		});
		const response = await call();
		expect(loadMathouCollection).toHaveBeenCalledWith(SUPABASE, 'eleve-1', '1_SPE');
		const body = mathouxSummarySchema.parse(await response.json());
		expect(body).toEqual({ born: 4, napping: 3, toDiscover: 2 });
	});

	it('une lecture en échec rend 500, pas « 0 en sieste »', async () => {
		vi.mocked(loadMathouCollection).mockRejectedValue(new Error('boom'));
		await expect(call()).rejects.toMatchObject({ status: 500 });
	});
});
