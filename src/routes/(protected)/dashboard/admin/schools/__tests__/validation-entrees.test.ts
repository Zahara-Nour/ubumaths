/**
 * Suppression d'école : l'identifiant est-il validé ?
 * ===================================================
 *
 * L'action `delete` lisait `id` par `formData.get('id') as string` et
 * l'envoyait tel quel à la base. Un identifiant qui n'est pas un UUID rend 400
 * avant toute requête, comme l'action `update` voisine.
 *
 * @module routes/admin/schools/validation-entrees.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWriteVerdictSupabase } from '$tests/helpers/write-verdict-supabase';

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001';

function formRequest(fields: Record<string, string>): Request {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.append(k, v);
	return new Request('http://localhost', { method: 'POST', body });
}

describe('admin/schools delete : identifiant invalide → 400, sans requête', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it.each([['abc'], [''], ["1' OR '1'='1"]])('id = %j', async (id) => {
		const { client } = createWriteVerdictSupabase({});
		const { actions } = await import('../+page.server');
		const result = await actions.delete({
			request: formRequest({ id, confirm: 'École' }),
			locals: {
				supabase: client,
				user: { id: ADMIN_ID },
				profile: { id: ADMIN_ID, role: 'admin' }
			}
		} as never);
		expect(result).toMatchObject({ status: 400 });
		expect(client.from).not.toHaveBeenCalled();
	});
});
