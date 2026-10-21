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
	it('rend le jeton de l’adresse sans le consommer', async () => {
		const data = await load({
			url: new URL('http://localhost/auth/reset-password/parent?token_hash=abc')
		} as never);
		expect(data).toEqual({ tokenHash: 'abc' });
		expect(setChildPasswordFromToken).not.toHaveBeenCalled();
	});

	it('sans jeton → tokenHash null (la page dit que le lien est incomplet)', async () => {
		const data = await load({
			url: new URL('http://localhost/auth/reset-password/parent')
		} as never);
		expect(data).toEqual({ tokenHash: null });
	});
});

describe('action setPassword', () => {
	it('nominal → mot de passe changé, rend le prénom et l’identifiant', async () => {
		const res = await envoyer({ tokenHash: 'abc', password: BON, confirmPassword: BON });
		expect(setChildPasswordFromToken).toHaveBeenCalledWith(expect.anything(), 'abc', BON);
		expect(res).toEqual({ success: true, firstname: 'Noélie', loginId: 'noelie42' });
	});

	it('deux mots de passe différents → erreur, jeton intact', async () => {
		const res = await envoyer({ tokenHash: 'abc', password: BON, confirmPassword: 'Autre-2026!x' });
		expect(res.status).toBe(400);
		expect(setChildPasswordFromToken).not.toHaveBeenCalled();
	});

	it('mot de passe hors politique → erreur, jeton intact', async () => {
		const res = await envoyer({ tokenHash: 'abc', password: 'court', confirmPassword: 'court' });
		expect(res.status).toBe(400);
		expect(setChildPasswordFromToken).not.toHaveBeenCalled();
	});

	it('jeton absent ou démesuré → 400', async () => {
		expect((await envoyer({ password: BON, confirmPassword: BON })).status).toBe(400);
		expect(
			(await envoyer({ tokenHash: 'x'.repeat(600), password: BON, confirmPassword: BON })).status
		).toBe(400);
		expect(setChildPasswordFromToken).not.toHaveBeenCalled();
	});

	it('lien expiré ou déjà servi → message, retour à « Mot de passe oublié »', async () => {
		setChildPasswordFromToken.mockResolvedValue({ ok: false, reason: 'invalid_token' });
		const res = await envoyer({ tokenHash: 'abc', password: BON, confirmPassword: BON });
		expect(res.status).toBe(400);
		expect(res.data).toMatchObject({ expired: true });
	});

	it('compte qui n’est pas un enfant → même message que le lien expiré', async () => {
		setChildPasswordFromToken.mockResolvedValue({ ok: false, reason: 'not_child' });
		const res = await envoyer({ tokenHash: 'abc', password: BON, confirmPassword: BON });
		expect(res.data).toMatchObject({ expired: true });
	});

	it('weak_password de GoTrue → erreur sur le champ', async () => {
		setChildPasswordFromToken.mockResolvedValue({ ok: false, reason: 'weak_password' });
		const res = await envoyer({ tokenHash: 'abc', password: BON, confirmPassword: BON });
		expect(res.status).toBe(400);
		expect(res.data?.error).toMatch(/trop faible|trop courant/);
	});

	it('débit dépassé → 429, rien n’est tenté', async () => {
		checkPasswordResetRateLimitByIP.mockResolvedValue({ allowed: false, message: 'Trop.' });
		const res = await envoyer({ tokenHash: 'abc', password: BON, confirmPassword: BON });
		expect(res.status).toBe(429);
		expect(setChildPasswordFromToken).not.toHaveBeenCalled();
	});
});
