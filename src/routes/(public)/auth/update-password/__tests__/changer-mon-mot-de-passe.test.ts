/**
 * /auth/update-password — « Changer mon mot de passe » (PR 3)
 *
 * Depuis le profil, l'ancien mot de passe est exigé : une session laissée ouverte ne suffit
 * pas. Il ne l'est pas au retour d'un lien de courriel récent, ni avec un mot de passe
 * provisoire (R3) — dont la marque est levée au changement.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { verifyCurrentPassword, updateUserById, checkLoginRateLimitByEmail } = vi.hoisted(() => ({
	verifyCurrentPassword: vi.fn(),
	updateUserById: vi.fn(),
	checkLoginRateLimitByEmail: vi.fn()
}));

vi.mock('$lib/server/child-password', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/child-password')>()),
	verifyCurrentPassword
}));
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({ auth: { admin: { updateUserById } } })
}));
vi.mock('$lib/server/rateLimiter', () => ({ checkLoginRateLimitByEmail }));

const { actions, load } = await import('../+page.server');

const NOW = Math.floor(Date.now() / 1000);
const BON = 'Nouveau-Mot-2026!';

type Contexte = { amr?: unknown; marque?: boolean };

function locals({ amr = [{ method: 'password', timestamp: NOW - 60 }], marque }: Contexte) {
	const updateUser = vi.fn(async () => ({ error: null }));
	return {
		updateUser,
		locals: {
			safeGetSession: vi.fn(async () => ({
				user: {
					id: 'u1',
					email: 'noelie42@eleves.chiph.re',
					app_metadata: marque === undefined ? {} : { must_change_password: marque }
				}
			})),
			supabase: {
				auth: {
					getClaims: vi.fn(async () => ({ data: { claims: { amr } }, error: null })),
					updateUser
				}
			}
		}
	};
}

async function envoyer(ctx: Contexte, champs: Record<string, string>) {
	const { locals: l, updateUser } = locals(ctx);
	const form = new FormData();
	for (const [k, v] of Object.entries(champs)) form.set(k, v);
	try {
		const res = await actions.updatePassword({
			request: new Request('http://localhost/auth/update-password', { method: 'POST', body: form }),
			locals: l
		} as never);
		return { res: res as { status?: number; data?: { error?: string } }, updateUser };
	} catch (e) {
		// redirect() de SvelteKit : succès
		return { res: e as { status: number; location: string }, updateUser };
	}
}

beforeEach(() => {
	vi.clearAllMocks();
	verifyCurrentPassword.mockResolvedValue(true);
	updateUserById.mockResolvedValue({ error: null });
	checkLoginRateLimitByEmail.mockResolvedValue({ allowed: true });
});

describe('load', () => {
	it('session ordinaire → ancien mot de passe demandé', async () => {
		expect(await load({ locals: locals({}).locals } as never)).toEqual({
			needsCurrentPassword: true,
			mustChange: false
		});
	});

	it('retour d’un lien récent → pas d’ancien mot de passe', async () => {
		const l = locals({ amr: [{ method: 'otp', timestamp: NOW - 60 }] }).locals;
		expect(await load({ locals: l } as never)).toEqual({
			needsCurrentPassword: false,
			mustChange: false
		});
	});

	it('mot de passe provisoire → pas d’ancien mot de passe, page « à changer »', async () => {
		expect(await load({ locals: locals({ marque: true }).locals } as never)).toEqual({
			needsCurrentPassword: false,
			mustChange: true
		});
	});
});

describe('action updatePassword', () => {
	it('session ordinaire sans ancien mot de passe → refus, rien ne change', async () => {
		const { res, updateUser } = await envoyer({}, { password: BON, confirmPassword: BON });
		expect(res.status).toBe(400);
		expect(updateUser).not.toHaveBeenCalled();
	});

	it('ancien mot de passe faux → refus, rien ne change', async () => {
		verifyCurrentPassword.mockResolvedValue(false);
		const { res, updateUser } = await envoyer(
			{},
			{ currentPassword: 'faux', password: BON, confirmPassword: BON }
		);
		expect(res.status).toBe(400);
		expect((res as { data: { error: string } }).data.error).toBe('Mot de passe actuel incorrect.');
		expect(verifyCurrentPassword).toHaveBeenCalledWith('noelie42@eleves.chiph.re', 'faux');
		expect(updateUser).not.toHaveBeenCalled();
	});

	it('ancien mot de passe juste → changé, retour à l’accueil', async () => {
		const { res, updateUser } = await envoyer(
			{},
			{ currentPassword: 'Ancien-2026!', password: BON, confirmPassword: BON }
		);
		expect(updateUser).toHaveBeenCalledWith({ password: BON });
		expect(res).toMatchObject({ status: 303, location: '/' });
		expect(updateUserById).not.toHaveBeenCalled();
	});

	it('trop d’essais → 429, aucune vérification', async () => {
		checkLoginRateLimitByEmail.mockResolvedValue({ allowed: false, message: 'Trop.' });
		const { res } = await envoyer(
			{},
			{ currentPassword: 'x', password: BON, confirmPassword: BON }
		);
		expect(res.status).toBe(429);
		expect(verifyCurrentPassword).not.toHaveBeenCalled();
	});

	it('mot de passe provisoire → changé sans l’ancien, marque levée par la clé service', async () => {
		const { res, updateUser } = await envoyer(
			{ marque: true },
			{ password: BON, confirmPassword: BON }
		);
		expect(verifyCurrentPassword).not.toHaveBeenCalled();
		expect(updateUser).toHaveBeenCalledWith({ password: BON });
		expect(updateUserById).toHaveBeenCalledWith('u1', {
			app_metadata: { must_change_password: false }
		});
		expect(res).toMatchObject({ status: 303, location: '/' });
	});

	it('marque non levée → erreur (sinon l’élève resterait bloqué sans le savoir)', async () => {
		updateUserById.mockResolvedValue({ error: { message: 'boom' } });
		const { res } = await envoyer({ marque: true }, { password: BON, confirmPassword: BON });
		expect(res.status).toBe(500);
	});

	it('lien de courriel récent → changé sans l’ancien', async () => {
		const { updateUser } = await envoyer(
			{ amr: [{ method: 'otp', timestamp: NOW - 60 }] },
			{ password: BON, confirmPassword: BON }
		);
		expect(verifyCurrentPassword).not.toHaveBeenCalled();
		expect(updateUser).toHaveBeenCalledWith({ password: BON });
	});
});
