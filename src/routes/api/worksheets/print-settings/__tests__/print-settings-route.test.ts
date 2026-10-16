/**
 * /api/worksheets/print-settings — qui règle la taille du texte de qui
 * ====================================================================
 *
 * L'élève règle la sienne, jamais celle d'un autre (refus avant la base) ; le
 * prof et l'admin nomment l'élève. Un refus silencieux de la RLS (zéro ligne)
 * devient un 403, pas un faux succès.
 */
import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { tableMock, type TableResponse } from '$lib/server/worksheets/__tests__/table-mock';

const ELEVE = '550e8400-e29b-41d4-a716-446655440001';
const AUTRE = '550e8400-e29b-41d4-a716-446655440002';
const PROF = '550e8400-e29b-41d4-a716-446655440003';

function locals(userId: string, role: string, settings: TableResponse) {
	const mock = tableMock({
		profiles: { data: { id: userId, role }, error: null },
		student_print_settings: settings
	});
	return {
		mock,
		locals: {
			safeGetSession: async () => ({ user: { id: userId }, session: {} }),
			supabase: mock.client as SupabaseClient<Database>
		} as unknown as App.Locals
	};
}

async function put(appLocals: App.Locals, body: unknown) {
	const { PUT } = await import('../+server');
	return PUT({ locals: appLocals, request: { json: async () => body } } as never);
}

async function get(appLocals: App.Locals, query = '') {
	const { GET } = await import('../+server');
	return GET({
		locals: appLocals,
		url: new URL(`http://localhost/api/worksheets/print-settings${query}`)
	} as never);
}

const ECRIT = { data: [{ student_id: ELEVE }], error: null };

describe('PUT', () => {
	it("l'élève enregistre sa propre taille", async () => {
		const { locals: l, mock } = locals(ELEVE, 'student', ECRIT);
		const response = await put(l, { textSize: 'large' });
		expect(await response.json()).toEqual({ textSize: 'large' });
		expect(mock.writes[0]).toMatchObject({ values: { student_id: ELEVE, text_size: 'large' } });
	});

	it("l'élève ne règle pas un camarade : 403, rien d'écrit", async () => {
		const { locals: l, mock } = locals(ELEVE, 'student', ECRIT);
		await expect(put(l, { studentId: AUTRE, textSize: 'large' })).rejects.toMatchObject({
			status: 403
		});
		expect(mock.writes).toEqual([]);
	});

	it("le prof règle l'élève qu'il nomme", async () => {
		const { locals: l, mock } = locals(PROF, 'teacher', ECRIT);
		await put(l, { studentId: ELEVE, textSize: 'x_large' });
		expect(mock.writes[0]).toMatchObject({ values: { student_id: ELEVE, text_size: 'x_large' } });
	});

	it('le prof sans élève nommé : 400', async () => {
		const { locals: l } = locals(PROF, 'teacher', ECRIT);
		await expect(put(l, { textSize: 'large' })).rejects.toMatchObject({ status: 400 });
	});

	it('taille inconnue ou identifiant invalide : 400', async () => {
		const { locals: l } = locals(PROF, 'teacher', ECRIT);
		await expect(put(l, { studentId: ELEVE, textSize: 'enorme' })).rejects.toMatchObject({
			status: 400
		});
		await expect(put(l, { studentId: 'pas-un-uuid', textSize: 'large' })).rejects.toMatchObject({
			status: 400
		});
	});

	it('zéro ligne écrite (refus de la RLS) : 403, pas un faux succès', async () => {
		const { locals: l } = locals(PROF, 'teacher', { data: [], error: null });
		await expect(put(l, { studentId: PROF, textSize: 'large' })).rejects.toMatchObject({
			status: 403
		});
	});
});

describe('GET', () => {
	it("l'élève lit la sienne", async () => {
		const { locals: l } = locals(ELEVE, 'student', {
			data: [{ student_id: ELEVE, text_size: 'x_large' }],
			error: null
		});
		expect(await (await get(l)).json()).toEqual({ textSize: 'x_large' });
	});

	it("l'élève ne lit pas celle d'un camarade : 403", async () => {
		const { locals: l } = locals(ELEVE, 'student', ECRIT);
		await expect(get(l, `?studentId=${AUTRE}`)).rejects.toMatchObject({ status: 403 });
	});
});
