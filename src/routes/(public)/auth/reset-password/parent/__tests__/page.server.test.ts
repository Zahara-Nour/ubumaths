/**
 * /auth/reset-password/parent — le parent choisit le mot de passe de son enfant (PR 3, R2)
 *
 * L'ouverture de la page ne consomme pas le jeton (les antivirus de messagerie ouvrent les
 * liens) ; seul l'envoi du formulaire le fait. Le changement lui-même (jeton, aucune session)
 * est prouvé par tests/integration/mots-de-passe-eleves.test.ts.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { setChildPasswordFromToken, checkPasswordResetRateLimitByIP } = vi.hoisted(() => ({
	setChildPasswordFromToken: vi.fn(),
	checkPasswordResetRateLimitByIP: vi.fn()
}));

vi.mock('$lib/server/serviceRoleClient', () => ({ createServiceRoleClient: () => ({}) }));
vi.mock('$lib/server/child-password', () => ({ setChildPasswordFromToken }));
vi.mock('$lib/server/rateLimiter', () => ({ checkPasswordResetRateLimitByIP }));

const { actions, load } = await import('../+page.server');

const BON = 'Nouveau-Mot-2026!';
const U = '0b9a3f4e-6c1d-4f2a-9e8b-7d6c5b4a3f21';
const T = 'q7Zx-3kP_9mW2vL8nR4tY6uB1cE5gH0jK7sD3fA2xQ9';
const LIEN = { userId: U, token: T };

function envoyer(champs: Record<string, string>) {
	const form = new FormData();
	for (const [k, v] of Object.entries(champs)) form.set(k, v);
	return actions.setPassword({
		request: new Request('http://localhost/auth/reset-password/parent', {
			method: 'POST',
			body: form
		}),
		getClientAddress: () => '127.0.0.1'
	} as never) as Promise<
		Record<string, unknown> & { status?: number; data?: Record<string, unknown> }
	>;
}

beforeEach(() => {
	vi.clearAllMocks();
	checkPasswordResetRateLimitByIP.mockResolvedValue({ allowed: true });
	setChildPasswordFromToken.mockResolvedValue({
		ok: true,
		firstname: 'Noélie',
		loginId: 'noelie42'
	});
});

describe('load', () => {
	it('rend le compte et le jeton de l’adresse sans les consommer', async () => {
		const data = await load({
			url: new URL(`http://localhost/auth/reset-password/parent?u=${U}&t=${T}`)
		} as never);
		expect(data).toEqual({ link: LIEN });
		expect(setChildPasswordFromToken).not.toHaveBeenCalled();
	});

	it.each([
		['sans rien', ''],
		['sans jeton', `?u=${U}`],
		['sans compte', `?t=${T}`],
		['compte qui n’est pas un uuid', `?u=abc&t=${T}`],
		['jeton trop court', `?u=${U}&t=abc`],
		['jeton hors alphabet', `?u=${U}&t=${'%25'.repeat(30)}`],
		['ancien lien token_hash', '?token_hash=abc']
	])('%s → link null (la page dit que le lien est incomplet)', async (_cas, query) => {
		const data = await load({
			url: new URL(`http://localhost/auth/reset-password/parent${query}`)
		} as never);
		expect(data).toEqual({ link: null });
	});
});

describe('action setPassword', () => {
	it('nominal → mot de passe changé, rend le prénom et l’identifiant', async () => {
		const res = await envoyer({ ...LIEN, password: BON, confirmPassword: BON });
		expect(setChildPasswordFromToken).toHaveBeenCalledWith(expect.anything(), U, T, BON);
		expect(res).toEqual({ success: true, firstname: 'Noélie', loginId: 'noelie42' });
	});

	it('deux mots de passe différents → erreur, jeton intact', async () => {
		const res = await envoyer({ ...LIEN, password: BON, confirmPassword: 'Autre-2026!x' });
		expect(res.status).toBe(400);
		expect(res.data).toMatchObject({ link: LIEN });
		expect(setChildPasswordFromToken).not.toHaveBeenCalled();
	});

	it('mot de passe hors politique → erreur, jeton intact', async () => {
		const res = await envoyer({ ...LIEN, password: 'court', confirmPassword: 'court' });
		expect(res.status).toBe(400);
		expect(setChildPasswordFromToken).not.toHaveBeenCalled();
	});

	it('compte ou jeton absent, mal formé ou démesuré → 400', async () => {
		const mauvais = [
			{ token: T },
			{ userId: U },
			{ userId: 'abc', token: T },
			{ userId: U, token: 'x'.repeat(200) },
			{ userId: U, token: 'abc' }
		];
		for (const lien of mauvais) {
			expect((await envoyer({ ...lien, password: BON, confirmPassword: BON })).status).toBe(400);
		}
		expect(setChildPasswordFromToken).not.toHaveBeenCalled();
	});

	it('lien expiré ou déjà servi → message, retour à « Mot de passe oublié »', async () => {
		setChildPasswordFromToken.mockResolvedValue({ ok: false, reason: 'invalid_token' });
		const res = await envoyer({ ...LIEN, password: BON, confirmPassword: BON });
		expect(res.status).toBe(400);
		expect(res.data).toMatchObject({ expired: true });
	});

	it('compte qui n’est pas un enfant → même message que le lien expiré', async () => {
		setChildPasswordFromToken.mockResolvedValue({ ok: false, reason: 'not_child' });
		const res = await envoyer({ ...LIEN, password: BON, confirmPassword: BON });
		expect(res.data).toMatchObject({ expired: true });
	});

	it('weak_password de GoTrue → erreur sur le champ', async () => {
		setChildPasswordFromToken.mockResolvedValue({ ok: false, reason: 'weak_password' });
		const res = await envoyer({ ...LIEN, password: BON, confirmPassword: BON });
		expect(res.status).toBe(400);
		expect(res.data?.error).toMatch(/trop faible|trop courant/);
	});

	it('débit dépassé → 429, rien n’est tenté', async () => {
		checkPasswordResetRateLimitByIP.mockResolvedValue({ allowed: false, message: 'Trop.' });
		const res = await envoyer({ ...LIEN, password: BON, confirmPassword: BON });
		expect(res.status).toBe(429);
		expect(setChildPasswordFromToken).not.toHaveBeenCalled();
	});
});
