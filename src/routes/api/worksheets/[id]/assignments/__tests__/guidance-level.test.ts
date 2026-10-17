/**
 * Niveau de guidage d'une affectation (ADR 0023) — création et modification
 * ========================================================================
 *
 * `guidance_level` : guidé, intermédiaire ou autonome, rien d'autre (Zod) ;
 * guidé par défaut à la création ; écrit en base, et la ligne rendue après
 * l'écriture est vérifiée (la RLS refuse en silence).
 */

import { describe, it, expect } from 'vitest';
import { tableMock, type TableMock } from '$lib/server/worksheets/__tests__/table-mock';

const FICHE = '550e8400-e29b-41d4-a716-446655440000';
const PROF = '550e8400-e29b-41d4-a716-446655440001';
const CLASSE = '550e8400-e29b-41d4-a716-446655440002';
const AFFECTATION = '550e8400-e29b-41d4-a716-446655440003';

function locals(mock: TableMock) {
	return {
		safeGetSession: async () => ({ user: { id: PROF }, session: {} }),
		supabase: mock.client
	} as unknown as App.Locals;
}

function supabase(writtenRow: Record<string, unknown> | null = null): TableMock {
	const row = writtenRow ?? {
		id: AFFECTATION,
		worksheet_id: FICHE,
		created_by: PROF,
		guidance_level: 'guided'
	};
	return tableMock({
		worksheets: { data: { id: FICHE, created_by: PROF, status: 'published' }, error: null },
		profiles: { data: { role: 'teacher' }, error: null },
		classes: { data: [{ id: CLASSE, name: '6e A', is_active: true }], error: null },
		worksheet_assignments: { data: row, error: null },
		worksheet_assignment_classes: { data: [], error: null }
	});
}

async function create(mock: TableMock, body: Record<string, unknown>) {
	const { POST } = await import('../+server');
	return POST({
		params: { id: FICHE },
		locals: locals(mock),
		request: { json: async () => ({ class_ids: [CLASSE], ...body }) }
	} as never);
}

async function update(mock: TableMock, body: Record<string, unknown>) {
	const { PATCH } = await import('../../../assignments/[assignmentId]/+server');
	return PATCH({
		params: { assignmentId: AFFECTATION },
		locals: locals(mock),
		request: { json: async () => body }
	} as never);
}

function written(mock: TableMock, kind: 'insert' | 'update') {
	const write = mock.writes.find((w) => w.table === 'worksheet_assignments' && w.kind === kind);
	return write?.values as Record<string, unknown> | undefined;
}

describe('POST /api/worksheets/[id]/assignments — niveau de guidage', () => {
	it('écrit le niveau choisi', async () => {
		const mock = supabase({ id: AFFECTATION, guidance_level: 'autonomous' });
		await create(mock, { guidance_level: 'autonomous' });
		expect(written(mock, 'insert')?.guidance_level).toBe('autonomous');
	});

	it('sans niveau : guidé', async () => {
		const mock = supabase();
		await create(mock, {});
		expect(written(mock, 'insert')?.guidance_level).toBe('guided');
	});

	it('niveau inconnu : 400, rien n’est écrit', async () => {
		const mock = supabase();
		await expect(create(mock, { guidance_level: 'expert' })).rejects.toMatchObject({
			status: 400
		});
		expect(written(mock, 'insert')).toBeUndefined();
	});

	it('ligne rendue sans le niveau demandé : erreur, pas un succès silencieux', async () => {
		const mock = supabase({ id: AFFECTATION, guidance_level: 'guided' });
		await expect(create(mock, { guidance_level: 'intermediate' })).rejects.toMatchObject({
			status: 500
		});
	});
});

describe('PATCH /api/worksheets/assignments/[assignmentId] — niveau de guidage', () => {
	it('écrit le niveau choisi', async () => {
		const mock = supabase({ id: AFFECTATION, created_by: PROF, guidance_level: 'intermediate' });
		await update(mock, { guidance_level: 'intermediate' });
		expect(written(mock, 'update')?.guidance_level).toBe('intermediate');
	});

	it('niveau inconnu : 400, rien n’est écrit', async () => {
		const mock = supabase();
		await expect(update(mock, { guidance_level: 'expert' })).rejects.toMatchObject({
			status: 400
		});
		expect(written(mock, 'update')).toBeUndefined();
	});

	it('ligne rendue sans le niveau demandé : erreur', async () => {
		const mock = supabase({ id: AFFECTATION, created_by: PROF, guidance_level: 'guided' });
		await expect(update(mock, { guidance_level: 'autonomous' })).rejects.toMatchObject({
			status: 500
		});
	});

	it('sans niveau : le niveau n’est pas réécrit (absent de l’update)', async () => {
		// Un défaut côté Zod remettrait « guidé » à chaque modification du titre
		const mock = supabase({ id: AFFECTATION, created_by: PROF, guidance_level: 'autonomous' });
		await update(mock, { title: 'Groupe B' });
		const values = written(mock, 'update');
		expect(values?.title).toBe('Groupe B');
		expect(values).not.toHaveProperty('guidance_level');
	});
});
