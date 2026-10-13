/**
 * POST /api/admin/remove-from-class : le retrait est-il vérifié ?
 * ==============================================================
 *
 * ⚠️ Une mise à jour refusée par la RLS, ou qui ne trouve aucune inscription,
 * touche zéro ligne sans erreur. Sans `.select()`, l'écran annonçait l'élève
 * retiré de la classe alors que rien n'avait bougé.
 *
 * @module routes/api/admin/remove-from-class/write-verdict.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWriteVerdictSupabase } from '$tests/helpers/write-verdict-supabase';

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001';
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440003';
const CLASS_ID = '550e8400-e29b-41d4-a716-446655440020';

function adminLocals(client: unknown) {
	return {
		supabase: client,
		user: { id: ADMIN_ID },
		profile: { id: ADMIN_ID, role: 'admin' }
	};
}

function postRequest(): Request {
	return new Request('http://localhost', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ userId: STUDENT_ID, classId: CLASS_ID })
	});
}

describe('remove-from-class : zéro inscription archivée n’est pas un retrait', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('zéro ligne archivée → 404, pas de succès', async () => {
		const { client } = createWriteVerdictSupabase({
			class_members: { awaited: { data: [], error: null } },
			profiles: { single: { data: { id: STUDENT_ID, class_members: [] }, error: null } }
		});
		const { POST } = await import('../+server');

		const response = await POST({ request: postRequest(), locals: adminLocals(client) } as never);
		expect(response.status).toBe(404);
		expect(await response.json()).not.toHaveProperty('success');
	});

	it('une ligne archivée → succès', async () => {
		const { client } = createWriteVerdictSupabase({
			class_members: { awaited: { data: [{ id: 'cm-1' }], error: null } },
			profiles: { single: { data: { id: STUDENT_ID, class_members: [] }, error: null } }
		});
		const { POST } = await import('../+server');

		const response = await POST({ request: postRequest(), locals: adminLocals(client) } as never);
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ success: true });
	});
});
