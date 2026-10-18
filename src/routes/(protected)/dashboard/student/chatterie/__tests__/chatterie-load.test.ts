/**
 * Chargement de la Chatterie : l'élève de la session, son niveau, et une panne
 * qui se dit (`unavailable`) au lieu d'une Chatterie vide.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/middleware/auth', () => ({ requireRole: vi.fn() }));
vi.mock('$lib/server/mathoux/collection', () => ({ loadMathouCollection: vi.fn() }));

import { requireRole } from '$lib/server/middleware/auth';
import { loadMathouCollection } from '$lib/server/mathoux/collection';
import { load } from '../+page.server';

const SUPABASE = { from: vi.fn() };
const locals = { supabase: SUPABASE } as unknown as App.Locals;

function run() {
	return load({ locals } as unknown as Parameters<typeof load>[0]);
}

beforeEach(() => {
	vi.mocked(requireRole).mockReset();
	vi.mocked(loadMathouCollection).mockReset();
	vi.mocked(requireRole).mockResolvedValue({
		user: { id: 'eleve-1' },
		profile: { id: 'eleve-1', role: 'student', grade: 'T_SPE' }
	} as never);
});

describe('chatterie/+page.server load', () => {
	it('réservée aux élèves', async () => {
		vi.mocked(requireRole).mockRejectedValue({ status: 403, body: { message: 'Interdit' } });
		await expect(run()).rejects.toMatchObject({ status: 403 });
		expect(requireRole).toHaveBeenCalledWith(locals, 'student');
	});

	it('calcule la collection de l’élève de la session pour son niveau', async () => {
		const collection = { races: [], counts: { born: 1, napping: 0, toDiscover: 0 } };
		vi.mocked(loadMathouCollection).mockResolvedValue(collection);
		await expect(run()).resolves.toEqual({ collection, unavailable: false });
		expect(loadMathouCollection).toHaveBeenCalledWith(SUPABASE, 'eleve-1', 'T_SPE');
	});

	it('une lecture en échec → unavailable, collection vide', async () => {
		vi.mocked(loadMathouCollection).mockRejectedValue(new Error('boom'));
		await expect(run()).resolves.toEqual({
			collection: { races: [], counts: { born: 0, napping: 0, toDiscover: 0 } },
			unavailable: true
		});
	});
});
