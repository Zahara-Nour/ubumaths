/**
 * DELETE /api/teacher/curriculum/template-tags — un refus de la RLS ne passe pas pour un succès.
 *
 * Un refus RLS rend zéro ligne sans erreur : sans relire les lignes supprimées, l'écran croirait
 * le tag retiré, puis poserait le nouveau point du programme… et la règle « un point par
 * programme » le refuserait.
 */
import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '$lib/server/__tests__/helpers/fake-supabase';

vi.mock('$lib/server/middleware/auth', () => ({ requireRoles: async () => ({}) }));

import { DELETE } from '../+server';

const TEMPLATE_ID = '22222222-2222-4222-8222-222222222222';
const POINT_ID = '33333333-3333-4333-8333-333333333333';

async function deleteWith(deleted: unknown[]) {
	const fake = createFakeSupabase(() => ({ data: deleted }));
	const url = new URL(
		`http://localhost/api/teacher/curriculum/template-tags?template_id=${TEMPLATE_ID}&point_id=${POINT_ID}`
	);
	const response = await DELETE({ url, locals: { supabase: fake.client } } as never);
	return { response, fake };
}

describe('DELETE template-tags', () => {
	it('tag retiré : 200, et la suppression relit ses lignes', async () => {
		const { response, fake } = await deleteWith([{ point_id: POINT_ID }]);
		expect(response.status).toBe(200);
		const methods = fake
			.on('question_template_points')
			.flatMap((q) => q.calls.map((c) => c.method));
		expect(methods).toContain('select');
	});

	it('aucune ligne supprimée (tag absent ou refus RLS) : 404, jamais un faux succès', async () => {
		const { response } = await deleteWith([]);
		expect(response.status).toBe(404);
	});
});
