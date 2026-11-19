/**
 * GET /api/teacher/classes — garde d'authentification (garde commune `requireRole`)
 * 401 sans session, 403 sans profil ou pour un autre rôle que professeur,
 * 500 si la lecture du profil tombe en panne (ce n'est pas un refus).
 */
import { describe, it, expect } from 'vitest';
import { GET } from '../+server';

/** `locals` minimal : session optionnelle + profil rendu par `profiles.single()` */
function faireLocals(
	user: { id: string } | null,
	role: string | null,
	codeErreur: string = 'PGRST116'
) {
	const chaine = {
		select: () => chaine,
		eq: () => chaine,
		single: async () =>
			role
				? { data: { id: user?.id, role }, error: null }
				: { data: null, error: { code: codeErreur, message: 'x' } }
	};
	return {
		safeGetSession: async () => ({ user }),
		supabase: { from: () => chaine }
	} as unknown as App.Locals;
}

describe('GET /api/teacher/classes — garde', () => {
	it('sans session : 401', async () => {
		await expect(GET({ locals: faireLocals(null, null) } as never)).rejects.toMatchObject({
			status: 401
		});
	});

	it('sans profil : 403', async () => {
		await expect(GET({ locals: faireLocals({ id: 'u1' }, null) } as never)).rejects.toMatchObject({
			status: 403
		});
	});

	it('panne de lecture du profil : 500, pas 403', async () => {
		await expect(
			GET({ locals: faireLocals({ id: 'u1' }, null, '57014') } as never)
		).rejects.toMatchObject({ status: 500 });
	});

	it('élève : 403', async () => {
		await expect(
			GET({ locals: faireLocals({ id: 'u1' }, 'student') } as never)
		).rejects.toMatchObject({ status: 403 });
	});
});
