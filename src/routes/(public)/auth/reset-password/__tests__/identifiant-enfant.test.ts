/**
 * /auth/reset-password — identifiant d'un enfant (PR 3)
 *
 * Le lien part à l'adresse CONFIRMÉE du parent, par Brevo ; GoTrue n'envoie rien. Dans tous les
 * cas, la même phrase neutre.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const {
	findChildResetTarget,
	createChildResetToken,
	sendChildPasswordResetEmail,
	checkPasswordResetRateLimitByIP,
	waitForResponseFloor,
	runAfterResponse,
	enFond
} = vi.hoisted(() => ({
	findChildResetTarget: vi.fn(),
	createChildResetToken: vi.fn(),
	sendChildPasswordResetEmail: vi.fn(),
	checkPasswordResetRateLimitByIP: vi.fn(),
	waitForResponseFloor: vi.fn(),
	runAfterResponse: vi.fn(),
	// Tâches confiées au fond par l'action : `demander` les attend APRÈS la réponse.
	enFond: [] as Promise<unknown>[]
}));

vi.mock('$lib/server/rateLimiter', () => ({
	checkPasswordResetRateLimitByIP,
	checkPasswordResetRateLimitByEmail: vi.fn(async () => ({ allowed: true }))
}));
vi.mock('$lib/server/serviceRoleClient', () => ({ createServiceRoleClient: () => ({}) }));
vi.mock('$lib/server/child-password', () => ({ findChildResetTarget, createChildResetToken }));
vi.mock('$lib/server/email/brevo', () => ({ sendChildPasswordResetEmail }));
vi.mock('$lib/server/response-floor', () => ({ waitForResponseFloor }));
vi.mock('$lib/server/after-response', () => ({ runAfterResponse }));

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
	await Promise.all(enFond);
	return { res, resetPasswordForEmail };
}

beforeEach(() => {
	vi.clearAllMocks();
	enFond.length = 0;
	runAfterResponse.mockImplementation((tache: Promise<unknown>) => {
		enFond.push(tache.catch(() => {}));
	});
	checkPasswordResetRateLimitByIP.mockResolvedValue({ allowed: true });
	waitForResponseFloor.mockResolvedValue(undefined);
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

describe('/auth/reset-password — lien au parent envoyé après la réponse', () => {
	it('la réponse neutre part sans attendre la recherche du parent ni Brevo', async () => {
		// Recherche qui ne finit jamais : l'action doit quand même répondre.
		findChildResetTarget.mockReturnValue(new Promise(() => {}));
		const form = new FormData();
		form.set('email', 'noelie42');
		const res = (await actions.resetPassword({
			request: new Request('http://localhost/auth/reset-password', { method: 'POST', body: form }),
			url: new URL('http://localhost/auth/reset-password'),
			getClientAddress: () => '127.0.0.1',
			locals: { supabase: { auth: { resetPasswordForEmail: vi.fn() } } }
		} as never)) as { message: string };

		expect(res.message).toBe(NEUTRE);
		expect(runAfterResponse).toHaveBeenCalledTimes(1);
		expect(waitForResponseFloor).toHaveBeenCalledWith(expect.any(Number), 2000);
	});

	it('une exception dans la tâche de fond ne change pas la réponse neutre', async () => {
		findChildResetTarget.mockRejectedValue(new Error('base injoignable'));
		const { res } = await demander('noelie42');
		expect(res.message).toBe(NEUTRE);
		expect(sendChildPasswordResetEmail).not.toHaveBeenCalled();
	});

	it('une adresse ordinaire ne passe pas par le fond', async () => {
		await demander('eleve@exemple.fr');
		expect(runAfterResponse).not.toHaveBeenCalled();
	});
});

describe('/auth/reset-password — même durée sur tous les chemins (F-a)', () => {
	const CIBLE = {
		ok: true,
		userId: 'u1',
		firstname: 'Noélie',
		loginId: 'noelie42',
		parentEmail: 'parent@exemple.fr'
	};

	it.each([
		['enfant, courriel au parent', 'noelie42', () => findChildResetTarget.mockResolvedValue(CIBLE)],
		[
			'enfant sans parent confirmé',
			'noelie42',
			() => findChildResetTarget.mockResolvedValue({ ok: false, reason: 'unconfirmed' })
		],
		['adresse ordinaire', 'eleve@exemple.fr', () => {}],
		[
			'débit dépassé',
			'noelie42',
			() => checkPasswordResetRateLimitByIP.mockResolvedValue({ allowed: false })
		]
	])('%s → plancher de 2 s attendu avant la réponse neutre', async (_cas, saisie, preparer) => {
		preparer();
		const { res } = await demander(saisie);
		expect(waitForResponseFloor).toHaveBeenCalledWith(expect.any(Number), 2000);
		expect(res.message).toBe(NEUTRE);
	});

	it('saisie invalide → erreur tout de suite, sans plancher (rien à cacher)', async () => {
		const form = new FormData();
		form.set('email', '');
		await actions.resetPassword({
			request: new Request('http://localhost/auth/reset-password', { method: 'POST', body: form }),
			url: new URL('http://localhost/auth/reset-password'),
			getClientAddress: () => '127.0.0.1',
			locals: { supabase: { auth: { resetPasswordForEmail: vi.fn() } } }
		} as never);
		expect(waitForResponseFloor).not.toHaveBeenCalled();
	});
});
