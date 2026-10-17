/**
 * Recherche d'utilisateurs : une panne n'est pas « aucun résultat ».
 * ==================================================================
 *
 * Quand la fonction `search_users_unaccent` échouait, la route répondait 200
 * avec `users: []` : l'écran affichait « Aucun résultat trouvé », et l'admin
 * concluait que l'élève n'existait pas.
 *
 * @module routes/api/admin/search-users/panne.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createWriteVerdictSupabase,
	expectHttpStatus
} from '$tests/helpers/write-verdict-supabase';

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001';

function event(client: unknown) {
	return {
		url: new URL('http://localhost/api/admin/search-users?q=alice&limit=50'),
		locals: {
			supabase: client,
			user: { id: ADMIN_ID },
			profile: { id: ADMIN_ID, role: 'admin' }
		}
	};
}

describe('GET /api/admin/search-users', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('panne de la fonction de recherche → 500', async () => {
		const { client } = createWriteVerdictSupabase(
			{},
			{
				data: null,
				error: { code: '57014', message: 'canceling statement due to statement timeout' }
			}
		);
		const { GET } = await import('../+server');
		await expectHttpStatus(() => GET(event(client) as never), 500);
	});

	it('aucun résultat → 200 avec une liste vide', async () => {
		const { client } = createWriteVerdictSupabase({}, { data: [], error: null });
		const { GET } = await import('../+server');
		const response = await GET(event(client) as never);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ users: [] });
	});
});
