/**
 * Garde de POST /api/messages/templates/[id]/approve : admin seul.
 * Passe par la VRAIE garde commune (session + lecture du profil).
 */
import { describe, it, expect } from 'vitest';
import { POST } from '../+server';

function evenement(user: { id: string } | null, role: string | null) {
	const chaine = {
		select: () => chaine,
		eq: () => chaine,
		single: async () =>
			role ? { data: { id: user?.id, role }, error: null } : { data: null, error: null }
	};
	return {
		params: { id: '00000000-0000-4000-8000-000000000001' },
		request: { json: async () => ({}) },
		locals: {
			safeGetSession: async () => ({ user }),
			supabase: { from: () => chaine }
		}
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/messages/templates/[id]/approve : garde', () => {
	it('sans session → 401', async () => {
		await expect(POST(evenement(null, null))).rejects.toMatchObject({ status: 401 });
	});

	it('professeur (mauvais rôle) → 403', async () => {
		await expect(POST(evenement({ id: 'u1' }, 'teacher'))).rejects.toMatchObject({ status: 403 });
	});

	it('élève → 403', async () => {
		await expect(POST(evenement({ id: 'u2' }, 'student'))).rejects.toMatchObject({ status: 403 });
	});

	it('sans profil → 403', async () => {
		await expect(POST(evenement({ id: 'u3' }, null))).rejects.toMatchObject({ status: 403 });
	});
});
