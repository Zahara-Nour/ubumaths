/**
 * /auth/reset-password — identifiant d'un enfant (PR 3)
 *
 * Le lien part à l'adresse CONFIRMÉE du parent, par Brevo ; GoTrue n'envoie rien. Dans tous les
 * cas, la même phrase neutre.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { findChildResetTarget, createChildResetToken, sendChildPasswordResetEmail } = vi.hoisted(
	() => ({
		findChildResetTarget: vi.fn(),
		createChildResetToken: vi.fn(),
		sendChildPasswordResetEmail: vi.fn()
	})
);

vi.mock('$lib/server/rateLimiter', () => ({
	checkPasswordResetRateLimitByIP: vi.fn(async () => ({ allowed: true })),
	checkPasswordResetRateLimitByEmail: vi.fn(async () => ({ allowed: true }))
}));
vi.mock('$lib/server/serviceRoleClient', () => ({ createServiceRoleClient: () => ({}) }));
vi.mock('$lib/server/child-password', () => ({ findChildResetTarget, createChildResetToken }));
vi.mock('$lib/server/email/brevo', () => ({ sendChildPasswordResetEmail }));

const { actions } = await import('../+page.server');

const NEUTRE =
	'Si un compte existe avec cette adresse ou cet identifiant, un lien pour choisir un nouveau mot de passe va être envoyé.';

async function demander(saisie: string) {
	const resetPasswordForEmail = vi.fn(async () => ({ error: null }));
	const form = new FormData();
	form.set('email', saisie);
	const res = (await actions.resetPassword({
		request: new Request('http://localhost/auth/reset-password', { method: 'POST', body: form }),
		url: new URL('http://localhost/auth/reset-password'),
		getClientAddress: () => '127.0.0.1',
		locals: { supabase: { auth: { resetPasswordForEmail } } }
	} as never)) as { message: string };
	return { res, resetPasswordForEmail };
}

beforeEach(() => {
	vi.clearAllMocks();
	createChildResetToken.mockResolvedValue('jeton-123');
	sendChildPasswordResetEmail.mockResolvedValue({ success: true });
});

describe('/auth/reset-password — identifiant d’un enfant', () => {
	it('adresse du parent confirmée → lien au PARENT par Brevo, rien par GoTrue', async () => {
		findChildResetTarget.mockResolvedValue({
			ok: true,
			userId: 'u1',
			firstname: 'Noélie',
			loginId: 'noelie42',
			parentEmail: 'parent@exemple.fr'
		});
		const { res, resetPasswordForEmail } = await demander('Noélie42');

		expect(findChildResetTarget).toHaveBeenCalledWith(
			expect.anything(),
			'noelie42@eleves.chiph.re'
		);
		expect(createChildResetToken).toHaveBeenCalledWith(expect.anything(), 'u1');
		expect(sendChildPasswordResetEmail).toHaveBeenCalledWith('parent@exemple.fr', {
			childFirstname: 'Noélie',
			loginId: 'noelie42',
			userId: 'u1',
			token: 'jeton-123'
		});
		expect(resetPasswordForEmail).not.toHaveBeenCalled();
		expect(res.message).toBe(NEUTRE);
	});

	it.each(['unconfirmed', 'no_parent', 'unknown', 'server_error'] as const)(
		'pas de cible (%s) → aucun jeton, aucun courriel, même phrase',
		async (reason) => {
			findChildResetTarget.mockResolvedValue({ ok: false, reason });
			const { res, resetPasswordForEmail } = await demander('noelie42');
			expect(createChildResetToken).not.toHaveBeenCalled();
			expect(sendChildPasswordResetEmail).not.toHaveBeenCalled();
			expect(resetPasswordForEmail).not.toHaveBeenCalled();
			expect(res.message).toBe(NEUTRE);
		}
	);

	it('l’adresse fictive tapée en entier suit le même chemin (jamais GoTrue)', async () => {
		findChildResetTarget.mockResolvedValue({ ok: false, reason: 'unconfirmed' });
		const { resetPasswordForEmail } = await demander('noelie42@eleves.chiph.re');
		expect(findChildResetTarget).toHaveBeenCalledWith(
			expect.anything(),
			'noelie42@eleves.chiph.re'
		);
		expect(resetPasswordForEmail).not.toHaveBeenCalled();
	});

	it('jeton non créé → aucun courriel, même phrase', async () => {
		findChildResetTarget.mockResolvedValue({
			ok: true,
			userId: 'u1',
			firstname: 'Noélie',
			loginId: 'noelie42',
			parentEmail: 'parent@exemple.fr'
		});
		createChildResetToken.mockResolvedValue(null);
		const { res } = await demander('noelie42');
		expect(sendChildPasswordResetEmail).not.toHaveBeenCalled();
		expect(res.message).toBe(NEUTRE);
	});

	it('une adresse ordinaire suit le chemin de GoTrue, sans chercher de parent', async () => {
		const { res, resetPasswordForEmail } = await demander('Eleve@Exemple.fr');
		expect(findChildResetTarget).not.toHaveBeenCalled();
		expect(resetPasswordForEmail).toHaveBeenCalledWith('eleve@exemple.fr', expect.anything());
		expect(res.message).toBe(NEUTRE);
	});
});
