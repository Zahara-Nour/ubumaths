/**
 * /api/teacher/curriculum/coverage — ni point archivé, ni faux succès
 * ==========================================================================
 *
 * Comportements validés par David (C5, étape 3, B2, 2026-10-21) :
 *   - POST refuse un point archivé : 400 « Point archivé » (B3, 2026-10-21) ;
 *   - DELETE relit les lignes supprimées : un refus RLS rend zéro ligne sans erreur,
 *     il ne doit pas passer pour un succès (404).
 */
import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '$lib/server/__tests__/helpers/fake-supabase';
import {
	answerProgramme,
	P_FRACTION,
	P_TRIANGLE_ARCHIVE
} from '$lib/server/__tests__/helpers/fake-programme';

vi.mock('$lib/server/middleware/auth', () => ({ requireRoles: async () => ({}) }));

import { POST, DELETE } from '../+server';

// ============================================================================
// CONSTANTES
// ============================================================================

const OWNER_ID = '44444444-4444-4444-8444-444444444444';
const INCONNU = 'bbbbbbbb-0000-4000-8000-000000000009';
const URL_BASE = 'http://localhost/api/teacher/curriculum/coverage';

// ============================================================================
// HELPERS
// ============================================================================

function fakeDb(deleted: unknown[] = [], pointsUnreadable = false) {
	return createFakeSupabase((table, calls) => {
		if (pointsUnreadable && table === 'curriculum_points') {
			return { data: null, error: { message: 'panne' } };
		}
		const programme = answerProgramme(table, calls);
		if (programme) return programme;
		if (table === 'journal_entry_points') {
			if (calls.some((c) => c.method === 'delete')) return { data: deleted };
			return { data: { entry_id: OWNER_ID, point_id: P_FRACTION } };
		}
		throw new Error(`Table inattendue : ${table}`);
	});
}

async function post(pointId: string, pointsUnreadable = false) {
	const fake = fakeDb([], pointsUnreadable);
	const request = new Request(URL_BASE, {
		method: 'POST',
		body: JSON.stringify({ entry_id: OWNER_ID, point_id: pointId })
	});
	const response = await POST({ request, locals: { supabase: fake.client } } as never);
	return { response, fake };
}

async function remove(deleted: unknown[]) {
	const fake = fakeDb(deleted);
	const url = new URL(`${URL_BASE}?entry_id=${OWNER_ID}&point_id=${P_FRACTION}`);
	const response = await DELETE({ url, locals: { supabase: fake.client } } as never);
	return { response, fake };
}

function inserts(fake: ReturnType<typeof fakeDb>) {
	return fake.on('journal_entry_points').filter((q) => q.calls.some((c) => c.method === 'insert'));
}

// ============================================================================
// TESTS
// ============================================================================

describe('POST coverage', () => {
	it('point actif : écrit', async () => {
		const { response, fake } = await post(P_FRACTION);
		expect(response.status).toBe(201);
		expect(inserts(fake)).toHaveLength(1);
	});

	it('point archivé : 400 « Point archivé », rien d’écrit', async () => {
		const { response, fake } = await post(P_TRIANGLE_ARCHIVE);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'Point archivé' });
		expect(inserts(fake)).toHaveLength(0);
	});

	it('point introuvable : 400, rien d’écrit', async () => {
		const { response, fake } = await post(INCONNU);
		expect(response.status).toBe(400);
		expect(inserts(fake)).toHaveLength(0);
	});

	it('point illisible (panne) : 500 propre, rien d’écrit', async () => {
		const { response, fake } = await post(P_FRACTION, true);
		expect(response.status).toBe(500);
		expect(inserts(fake)).toHaveLength(0);
	});
});

describe('DELETE coverage', () => {
	it('ligne retirée : 200, et la suppression relit ses lignes', async () => {
		const { response, fake } = await remove([{ point_id: P_FRACTION }]);
		expect(response.status).toBe(200);
		const methods = fake.on('journal_entry_points').flatMap((q) => q.calls.map((c) => c.method));
		expect(methods).toContain('select');
	});

	it('aucune ligne supprimée (absente ou refus RLS) : 404, jamais un faux succès', async () => {
		const { response } = await remove([]);
		expect(response.status).toBe(404);
	});
});
