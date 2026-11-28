/**
 * PATCH /api/teacher/classes/[classId]/anti-fraud/flags/[flagId] — signalement marqué traité
 * ==========================================================================
 *
 * Un refus des règles d'accès rend zéro ligne, sans erreur : la route ne doit pas
 * répondre « traité » quand rien n'a été écrit. Le message de la base ne part pas
 * au navigateur.
 */
import { describe, it, expect, vi } from 'vitest';
import {
	createFakeSupabase,
	type Call,
	type Result
} from '#lib/server/__tests__/helpers/fake-supabase.ts';

vi.mock('#lib/server/stats/teacher-class-auth.ts', () => ({
	requireTeacherOfClass: async () => ({ user: { id: TEACHER_ID } })
}));

import { PATCH } from '../+server';

// ============================================================================
// CONSTANTES
// ============================================================================

const CLASS_ID = '11111111-1111-4111-8111-111111111111';
const STUDENT_ID = '22222222-2222-4222-8222-222222222222';
const FLAG_ID = '44444444-4444-4444-8444-444444444444';
const TEACHER_ID = '55555555-5555-4555-8555-555555555555';
const DB_MESSAGE = 'column srs_anti_fraud_flags.oups does not exist';

// ============================================================================
// HELPERS
// ============================================================================

const isUpdate = (calls: Call[]) => calls.some((c) => c.method === 'update');

async function patch(flags: (calls: Call[]) => Result) {
	const fake = createFakeSupabase((table, calls) => {
		if (table === 'class_members') return { data: { id: 'm1' } };
		if (table === 'srs_anti_fraud_flags') return flags(calls);
		throw new Error(`Table inattendue : ${table}`);
	});
	const response = await PATCH({
		params: { classId: CLASS_ID, flagId: FLAG_ID },
		request: new Request('http://localhost/', {
			method: 'PATCH',
			body: JSON.stringify({ resolved: true })
		}),
		locals: { supabase: fake.client }
	} as never);
	return { response, fake };
}

const FLAG = { id: FLAG_ID, student_id: STUDENT_ID, resolved: false };

// ============================================================================
// TESTS
// ============================================================================

describe('PATCH anti-fraud/flags/[flagId]', () => {
	it('marque le signalement traité quand la ligne est écrite', async () => {
		const { response, fake } = await patch((calls) =>
			isUpdate(calls) ? { data: [{ id: FLAG_ID }] } : { data: FLAG }
		);
		expect(response.status).toBe(200);
		expect((await response.json()).resolved).toBe(true);
		// La mise à jour demande les lignes écrites
		const update = fake.queries.find((q) => isUpdate(q.calls));
		expect(update?.calls.some((c) => c.method === 'select')).toBe(true);
	});

	it('ne répond pas « traité » quand la mise à jour n’écrit aucune ligne', async () => {
		const { response } = await patch((calls) => (isUpdate(calls) ? { data: [] } : { data: FLAG }));
		expect(response.status).toBe(500);
		expect((await response.json()).resolved).toBeUndefined();
	});

	it('ne rend pas le message de la base quand la lecture du signalement échoue', async () => {
		const { response } = await patch(() => ({ data: null, error: { message: DB_MESSAGE } }));
		expect(response.status).toBe(500);
		expect(JSON.stringify(await response.json())).not.toContain('srs_anti_fraud_flags');
	});

	it('ne rend pas le message de la base quand la mise à jour échoue', async () => {
		const { response } = await patch((calls) =>
			isUpdate(calls) ? { data: null, error: { message: DB_MESSAGE } } : { data: FLAG }
		);
		expect(response.status).toBe(500);
		expect(JSON.stringify(await response.json())).not.toContain('srs_anti_fraud_flags');
	});

	it('répond 200 sans écrire quand le signalement est déjà traité', async () => {
		const { response, fake } = await patch(() => ({ data: { ...FLAG, resolved: true } }));
		expect(response.status).toBe(200);
		expect(fake.queries.some((q) => isUpdate(q.calls))).toBe(false);
	});
});
