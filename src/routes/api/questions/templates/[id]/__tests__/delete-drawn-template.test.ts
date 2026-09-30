/**
 * DELETE /api/questions/templates/[id] — modèle déjà tiré dans une évaluation
 * ==========================================================================
 *
 * `evaluation_attempt_questions.template_id` refuse la suppression (NO ACTION,
 * 23503) : sans son modèle, une tentative ne se régénère plus, donc ne se
 * corrige ni ne se vérifie plus. Dès qu'une tentative a été envoyée, c'est
 * `skill_attempts` qui refuse d'abord (23514, mesuré en intégration). La route
 * répondait 500 « Failed to delete » ; elle doit dire en français quoi faire
 * (409 : le passer en brouillon).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn(async () => ({ user: { id: 'admin' }, profile: { role: 'admin' } })),
	requireRoles: vi.fn()
}));

import { DELETE } from '../+server';
import { createFakeSupabase } from '$lib/server/__tests__/helpers/fake-supabase';

const ID = '22222222-2222-4222-8222-222222222222';

async function remove(deleteResult: Record<string, unknown>) {
	const fake = createFakeSupabase((_table, calls) =>
		calls.some((c) => c.method === 'delete') ? deleteResult : { data: { id: ID } }
	);
	const response = await DELETE({ params: { id: ID }, locals: { supabase: fake.client } } as never);
	return response;
}

describe('DELETE d’un modèle tiré dans une évaluation', () => {
	it.each(['23503', '23514'])('%s → 409 et message « passe-le en brouillon »', async (code) => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const response = await remove({ error: { code, message: 'constraint' } });
		expect(response.status).toBe(409);
		const body = await response.json();
		expect(body.error).toMatch(/brouillon/);
	});

	it('suppression ordinaire : 200', async () => {
		const response = await remove({ data: [{ id: ID }] });
		expect(response.status).toBe(200);
	});
});
