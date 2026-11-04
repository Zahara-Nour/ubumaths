/**
 * GET /api/teacher/classes/[classId]/anti-fraud/flags — point du programme du signalement
 * ==========================================================================
 *
 * La requête embarque `curriculum_points(id, name)` ; la réponse lisait `row.skills`,
 * absent : chaque signalement s'affichait « toutes capacités » (écart C10, 2026-11-04).
 * Le filtre de l'URL s'appelle `point`.
 */
import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '$lib/server/__tests__/helpers/fake-supabase';

vi.mock('$lib/server/stats/teacher-class-auth', () => ({
	requireTeacherOfClass: async () => undefined
}));

import { GET } from '../+server';

// ============================================================================
// CONSTANTES
// ============================================================================

const CLASS_ID = '11111111-1111-4111-8111-111111111111';
const STUDENT_ID = '22222222-2222-4222-8222-222222222222';
const POINT_ID = '33333333-3333-4333-8333-333333333333';

const FLAG_ROW = {
	id: 'f1',
	student_id: STUDENT_ID,
	capacity_point_id: POINT_ID,
	flag_type: 'burst',
	severity: 3,
	score: 0.8,
	sample_size: 12,
	details: null,
	resolved: false,
	resolved_by: null,
	resolved_at: null,
	created_at: '2026-11-01T10:00:00Z',
	profiles: { id: STUDENT_ID, first_name: 'Ada', last_name: 'L.' },
	curriculum_points: { id: POINT_ID, name: 'Additionner deux fractions' }
};

// ============================================================================
// HELPERS
// ============================================================================

function fakeDb(flagRows: unknown[]) {
	return createFakeSupabase((table, calls) => {
		if (table === 'class_members') return { data: [{ student_id: STUDENT_ID }] };
		if (table === 'srs_anti_fraud_flags') {
			const head = calls.some((c) => c.method === 'select' && c.args[0] === 'id');
			return head ? { count: 0 } : { data: flagRows };
		}
		throw new Error(`Table inattendue : ${table}`);
	});
}

async function get(query = '', flagRows: unknown[] = [FLAG_ROW]) {
	const fake = fakeDb(flagRows);
	const url = new URL(`http://localhost/api/teacher/classes/${CLASS_ID}/anti-fraud/flags${query}`);
	const response = await GET({
		params: { classId: CLASS_ID },
		url,
		locals: { supabase: fake.client }
	} as never);
	return { response, fake };
}

// ============================================================================
// TESTS
// ============================================================================

describe('GET anti-fraud/flags', () => {
	it('rend le point du programme du signalement', async () => {
		const { response, fake } = await get();
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.flags[0].point).toEqual({ id: POINT_ID, name: 'Additionner deux fractions' });
		// Le faux client rend la fixture quel que soit le select : on vérifie la jointure demandée.
		const flagsQuery = fake.queries.find(
			(q) => q.table === 'srs_anti_fraud_flags' && q.calls.some((c) => c.method === 'limit')
		);
		const select = flagsQuery?.calls.find((c) => c.method === 'select');
		expect(String(select?.args[0])).toContain('curriculum_points(id, name)');
	});

	it('rend point: null pour un signalement sans point', async () => {
		const { response } = await get('', [
			{ ...FLAG_ROW, capacity_point_id: null, curriculum_points: null }
		]);
		const body = await response.json();
		expect(body.flags[0].point).toBeNull();
	});

	it('filtre sur le point passé dans ?point=', async () => {
		const { fake } = await get(`?point=${POINT_ID}`);
		const flagsQuery = fake.queries.find(
			(q) => q.table === 'srs_anti_fraud_flags' && q.calls.some((c) => c.method === 'limit')
		);
		expect(flagsQuery?.calls).toContainEqual({
			method: 'eq',
			args: ['capacity_point_id', POINT_ID]
		});
	});

	it('refuse un ?point= qui n’est pas un UUID', async () => {
		const { response } = await get('?point=abc');
		expect(response.status).toBe(400);
	});
});
