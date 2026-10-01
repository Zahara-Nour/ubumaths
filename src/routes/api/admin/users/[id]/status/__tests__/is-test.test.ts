/**
 * PATCH /api/admin/users/[id]/status — statut « compte de test »
 *
 * is_test est réservé à l'admin par la base (migration 20261001180000). La route :
 *   - refuse en 403 (message clair) un professeur non élevé qui le change ;
 *   - passe par le client admin en élévation ;
 *   - laisse passer une approbation qui renvoie is_test inchangé.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireRolesMock = vi.fn();

vi.mock('$lib/server/middleware/auth', () => ({
	requireRoles: (...args: unknown[]) => requireRolesMock(...args)
}));
vi.mock('$lib/server/notifications', () => ({
	createSystemNotification: vi.fn().mockResolvedValue({ success: true })
}));

import { PATCH } from '../+server';

const USER_ID = '22222222-2222-4222-8222-222222222222';

type PatchEvent = Parameters<typeof PATCH>[0];

/** Faux client : lecture du profil existant, puis mise à jour enregistrée. */
function fakeClient(existing: { is_test: boolean }) {
	const updates: Array<Record<string, unknown>> = [];
	const client = {
		updates,
		from: vi.fn(() => ({
			select: () => ({
				eq: () => ({
					maybeSingle: async () => ({
						data: {
							id: USER_ID,
							email: 'e@example.com',
							firstname: 'A',
							lastname: 'B',
							status: 'pending',
							...existing
						},
						error: null
					}),
					single: async () => ({ data: { id: USER_ID }, error: null })
				})
			}),
			update: (row: Record<string, unknown>) => {
				updates.push(row);
				return {
					eq: () => ({
						select: () => ({ single: async () => ({ data: { id: USER_ID }, error: null }) }),
						then: (r: (v: unknown) => unknown) => r({ error: null })
					})
				};
			}
		}))
	};
	return client;
}

function evenement(body: Record<string, unknown>, locals: Record<string, unknown>): PatchEvent {
	return {
		params: { id: USER_ID },
		locals,
		request: new Request('http://localhost/api/admin/users/' + USER_ID + '/status', {
			method: 'PATCH',
			body: JSON.stringify(body)
		})
	} as unknown as PatchEvent;
}

beforeEach(() => {
	requireRolesMock.mockReset();
});

describe('approbation et statut « compte de test »', () => {
	it('refuse en 403 un professeur non élevé qui coche « compte de test »', async () => {
		requireRolesMock.mockResolvedValue({ profile: { id: 'prof', role: 'teacher' } });
		const supabase = fakeClient({ is_test: false });

		await expect(
			PATCH(evenement({ status: 'approved', is_test: true }, { supabase }))
		).rejects.toMatchObject({ status: 403 });
		expect(supabase.updates).toEqual([]);
	});

	it('laisse un professeur approuver quand is_test est renvoyé inchangé', async () => {
		requireRolesMock.mockResolvedValue({ profile: { id: 'prof', role: 'teacher' } });
		const supabase = fakeClient({ is_test: false });

		await PATCH(evenement({ status: 'approved', is_test: false }, { supabase })).catch(() => {});
		expect(supabase.updates[0]).toMatchObject({ status: 'approved', is_test: false });
	});

	it('passe par le client admin en élévation, qui peut changer is_test', async () => {
		requireRolesMock.mockResolvedValue({ profile: { id: 'prof', role: 'teacher' } });
		const supabase = fakeClient({ is_test: false });
		const adminSupabase = fakeClient({ is_test: false });

		await PATCH(
			evenement({ status: 'approved', is_test: true }, { supabase, adminSupabase })
		).catch(() => {});
		expect(adminSupabase.updates[0]).toMatchObject({ is_test: true });
		expect(supabase.updates).toEqual([]);
	});
});
