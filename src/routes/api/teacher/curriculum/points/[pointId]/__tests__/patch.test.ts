/**
 * PATCH /api/teacher/curriculum/points/[pointId].
 *
 * Comportements validés par David (C5, étape 3) :
 *   3.  renommer change le libellé, jamais le code ;
 *   4.  archiver / restaurer ;
 *   9.  libellé vide ou trop long → 400 avec un message clair ;
 *   11. seuls `name` et `archived` se modifient : tout autre champ est refusé.
 *
 * La RLS échoue en silence : une écriture refusée rend zéro ligne, sans erreur.
 * La route doit le dire (404), pas annoncer un succès.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isHttpError } from '@sveltejs/kit';

vi.mock('$lib/server/middleware/auth', () => ({
	requireRoles: vi.fn(async () => ({ user: { id: 'prof' } }))
}));

const { PATCH } = await import('../+server');

type Event = Parameters<typeof PATCH>[0];
type Result = { data: unknown; error: { code?: string; message: string } | null };

const POINT_ID = '11111111-1111-4111-8111-111111111111';
const NODE_ID = '22222222-2222-4222-8222-222222222222';

/** Requêtes reçues par la fausse base, dans l'ordre. */
let results: Result[] = [];
let updates: unknown[] = [];

function chain(result: Result) {
	const builder = {
		select: () => builder,
		eq: () => builder,
		update: (values: unknown) => {
			updates.push(values);
			return builder;
		},
		maybeSingle: async () => result,
		single: async () => result
	};
	return builder;
}

const supabase = {
	from: vi.fn(() => {
		const next = results.shift();
		if (!next) throw new Error('requête inattendue');
		return chain(next);
	})
};

function call(body: unknown, pointId = POINT_ID): Event {
	return {
		locals: { supabase },
		params: { pointId },
		request: new Request('http://localhost/x', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: typeof body === 'string' ? body : JSON.stringify(body)
		})
	} as unknown as Event;
}

async function respond(event: Event): Promise<{ status: number; body: Record<string, unknown> }> {
	try {
		const r = await PATCH(event);
		return { status: r.status, body: (await r.json()) as Record<string, unknown> };
	} catch (e) {
		if (isHttpError(e)) return { status: e.status, body: { error: e.body.message } };
		throw e;
	}
}

const UPDATED = {
	id: POINT_ID,
	code: '5-042',
	name: 'Nouveau libellé',
	display_order: 42,
	rubrique: null,
	archived_at: null,
	node_id: NODE_ID,
	grade: '5'
};

beforeEach(() => {
	results = [];
	updates = [];
	supabase.from.mockClear();
});

describe('PATCH point — renommer et archiver', () => {
	it('renomme un point neuf : seul le libellé part en base, jamais le code', async () => {
		results = [{ data: UPDATED, error: null }];
		const { status, body } = await respond(call({ name: '  Nouveau libellé  ' }));

		expect(status).toBe(200);
		expect(updates).toEqual([{ name: 'Nouveau libellé' }]);
		expect((body.point as { code: string }).code).toBe('5-042');
	});

	it('archive puis restaure', async () => {
		results = [{ data: { ...UPDATED, archived_at: '2026-10-10T00:00:00Z' }, error: null }];
		expect((await respond(call({ archived: true }))).status).toBe(200);
		expect(updates[0]).toEqual({ archived_at: expect.any(String) });

		results = [{ data: UPDATED, error: null }];
		expect((await respond(call({ archived: false }))).status).toBe(200);
		expect(updates[1]).toEqual({ archived_at: null });
	});
});

describe('PATCH point — refus', () => {
	it.each([
		['vide', { name: '   ' }, /vide/],
		['trop long', { name: 'x'.repeat(501) }, /500/],
		['sans champ', {}, /Au moins un champ/]
	])('libellé %s → 400 avec message clair', async (_label, payload, message) => {
		const { status, body } = await respond(call(payload));
		expect(status).toBe(400);
		expect(String(body.error)).toMatch(message);
		expect(supabase.from).not.toHaveBeenCalled();
	});

	it('accepte un libellé long du BO (jusqu’à 500 caractères)', async () => {
		results = [{ data: UPDATED, error: null }];
		expect((await respond(call({ name: 'x'.repeat(400) }))).status).toBe(200);
	});

	it.each([
		['kind', { kind: 'connaissance' }],
		['exigence', { exigence: 'attendu' }],
		['regime_acquisition', { regime_acquisition: 'fluence' }],
		['rang', { rang: 2 }],
		['objective_id', { objective_id: NODE_ID }],
		['display_order', { display_order: 3 }],
		['code', { code: '5-999' }],
		['node_id', { node_id: NODE_ID }]
	])('champ retiré « %s » → 400', async (_label, payload) => {
		const { status } = await respond(call({ name: 'X', ...payload }));
		expect(status).toBe(400);
		expect(supabase.from).not.toHaveBeenCalled();
	});

	it('identifiant mal formé → 400', async () => {
		expect((await respond(call({ name: 'X' }, 'pas-un-uuid'))).status).toBe(400);
	});

	it('corps JSON invalide → 400', async () => {
		expect((await respond(call('{oups'))).status).toBe(400);
	});

	it('point inconnu, ou écriture refusée en silence (zéro ligne rendue) → 404, pas un faux succès', async () => {
		results = [{ data: null, error: null }];
		expect((await respond(call({ name: 'X' }))).status).toBe(404);
	});
});
