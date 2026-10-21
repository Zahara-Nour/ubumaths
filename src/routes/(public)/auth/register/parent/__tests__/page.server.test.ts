/**
 * Page /auth/register/parent — action « register »
 *
 * Le déroulé (code vérifié avant toute création, demande au parent, un courriel) ; la
 * création du compte elle-même est prouvée contre la base par
 * tests/integration/inscription-par-le-parent.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
	rpcMock,
	createChildAccount,
	countRecentChildAccounts,
	createParentRequest,
	deleteChildAccount,
	markParentEmailSent,
	sendChildRegistrationEmail,
	checkSignupRateLimitByIP,
	checkChildSignupRateLimitByParentEmail
} = vi.hoisted(() => ({
	rpcMock: vi.fn(),
	createChildAccount: vi.fn(),
	countRecentChildAccounts: vi.fn(),
	createParentRequest: vi.fn(),
	deleteChildAccount: vi.fn(),
	markParentEmailSent: vi.fn(),
	sendChildRegistrationEmail: vi.fn(),
	checkSignupRateLimitByIP: vi.fn(),
	checkChildSignupRateLimitByParentEmail: vi.fn()
}));

vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({
		rpc: rpcMock,
		from: () => ({
			select: () => ({
				eq: () => ({
					maybeSingle: async () => ({ data: { schools: { name: 'Akadada' } }, error: null })
				})
			})
		})
	})
}));
vi.mock('$lib/server/child-registration', () => ({
	CLASS_DAILY_CHILD_LIMIT: 5,
	createChildAccount,
	countRecentChildAccounts,
	createParentRequest,
	deleteChildAccount,
	markParentEmailSent
}));
vi.mock('$lib/server/email/brevo', () => ({ sendChildRegistrationEmail }));
vi.mock('$lib/server/rateLimiter', () => ({
	checkSignupRateLimitByIP,
	checkChildSignupRateLimitByParentEmail
}));

import { actions } from '../+page.server';

type RegisterEvent = Parameters<typeof actions.register>[0];

const CHAMPS = {
	childFirstname: 'Noélie',
	parentEmail: 'Parent@Exemple.fr',
	password: 'Kangourou-Bleu-27',
	confirmPassword: 'Kangourou-Bleu-27',
	classCode: 'NOELIE',
	acceptTerms: 'true'
};

function evenement(champs: Record<string, string> = CHAMPS): RegisterEvent {
	return {
		request: new Request('http://localhost/auth/register/parent', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams(champs)
		}),
		getClientAddress: () => '198.51.100.7'
	} as unknown as RegisterEvent;
}

const EXPIRE = new Date('2099-01-01T00:00:00Z');

beforeEach(() => {
	vi.clearAllMocks();
	checkSignupRateLimitByIP.mockResolvedValue({ allowed: true });
	checkChildSignupRateLimitByParentEmail.mockResolvedValue({ allowed: true });
	rpcMock.mockResolvedValue({ data: 'classe-1', error: null });
	countRecentChildAccounts.mockResolvedValue(0);
	createChildAccount.mockResolvedValue({
		ok: true,
		userId: 'eleve-1',
		loginId: 'noelie42',
		grade: '6'
	});
	createParentRequest.mockResolvedValue({ token: 'jeton-1', expiresAt: EXPIRE });
	sendChildRegistrationEmail.mockResolvedValue({ success: true });
});

describe('action register (parent)', () => {
	it('nominal : compte, demande, un courriel au parent, identifiant affiché', async () => {
		const res = await actions.register(evenement());

		expect(res).toEqual({
			success: true,
			loginId: 'noelie42',
			childFirstname: 'Noélie',
			parentEmail: 'parent@exemple.fr',
			emailSent: true,
			consentRequired: true
		});
		expect(createChildAccount).toHaveBeenCalledWith(expect.anything(), {
			childFirstname: 'Noélie',
			password: 'Kangourou-Bleu-27',
			classCode: 'NOELIE',
			termsVersion: 'cgu-2026-08'
		});
		expect(createParentRequest).toHaveBeenCalledWith(
			expect.anything(),
			'eleve-1',
			'parent@exemple.fr'
		);
		expect(sendChildRegistrationEmail).toHaveBeenCalledTimes(1);
		expect(sendChildRegistrationEmail).toHaveBeenCalledWith('parent@exemple.fr', {
			childFirstname: 'Noélie',
			loginId: 'noelie42',
			schoolName: 'Akadada',
			consentToken: 'jeton-1',
			expiresAt: EXPIRE,
			consentRequired: true
		});
		expect(markParentEmailSent).toHaveBeenCalledWith(expect.anything(), 'jeton-1');
	});

	it('1re/Tle : le courriel ne demande pas de consentement', async () => {
		createChildAccount.mockResolvedValue({
			ok: true,
			userId: 'eleve-1',
			loginId: 'noelie42',
			grade: 'T_SPE'
		});
		await actions.register(evenement());
		expect(sendChildRegistrationEmail.mock.calls[0][1].consentRequired).toBe(false);
	});

	it('code invalide : erreur sur le champ, aucun compte créé', async () => {
		rpcMock.mockResolvedValue({ data: null, error: null });
		const res = await actions.register(evenement());
		expect(res).toMatchObject({ status: 400, data: { errors: { classCode: expect.any(Array) } } });
		expect(createChildAccount).not.toHaveBeenCalled();
		// Un code mal tapé ne consomme pas le plafond du parent.
		expect(checkChildSignupRateLimitByParentEmail).not.toHaveBeenCalled();
	});

	it('mot de passe refusé par GoTrue : erreur sur le champ, pas une erreur serveur', async () => {
		createChildAccount.mockResolvedValue({ ok: false, reason: 'weak_password' });
		const res = await actions.register(evenement());
		expect(res).toMatchObject({ status: 400, data: { errors: { password: expect.any(Array) } } });
	});

	it('classe fermée entre-temps : erreur sur le champ', async () => {
		createChildAccount.mockResolvedValue({ ok: false, reason: 'class_closed' });
		const res = await actions.register(evenement());
		expect(res).toMatchObject({ status: 400, data: { errors: { classCode: expect.any(Array) } } });
	});

	it('formulaire invalide : erreurs par champ, re-rempli sans mot de passe, rien créé', async () => {
		const res = await actions.register(
			evenement({ ...CHAMPS, childFirstname: '42', acceptTerms: 'false' })
		);
		expect(res).toMatchObject({
			status: 400,
			data: {
				errors: { childFirstname: expect.any(Array), acceptTerms: expect.any(Array) },
				parentEmail: 'Parent@Exemple.fr',
				classCode: 'NOELIE'
			}
		});
		expect(JSON.stringify(res)).not.toContain('Kangourou');
		expect(checkSignupRateLimitByIP).not.toHaveBeenCalled();
		expect(createChildAccount).not.toHaveBeenCalled();
	});

	it('adresse du domaine fictif comme adresse du parent : refusée', async () => {
		const res = await actions.register(
			evenement({ ...CHAMPS, parentEmail: 'noelie42@eleves.chiph.re' })
		);
		expect(res).toMatchObject({
			status: 400,
			data: { errors: { parentEmail: expect.any(Array) } }
		});
	});

	it('plafond par adresse du parent dépassé : 429, rien créé', async () => {
		checkChildSignupRateLimitByParentEmail.mockResolvedValue({
			allowed: false,
			message: 'Trop'
		});
		const res = await actions.register(evenement());
		expect(res).toMatchObject({ status: 429 });
		expect(checkChildSignupRateLimitByParentEmail).toHaveBeenCalledWith('parent@exemple.fr');
		expect(createChildAccount).not.toHaveBeenCalled();
	});

	// M1 bis : au plus 5 comptes par classe et par 24 h, comptés sur les comptes réellement
	// créés (Q1) ; le 6e est refusé avant toute création.
	it('5e compte de la journée dans la classe : accepté', async () => {
		countRecentChildAccounts.mockResolvedValue(4);
		const res = await actions.register(evenement());
		expect(res).toMatchObject({ success: true });
		expect(countRecentChildAccounts).toHaveBeenCalledWith(expect.anything(), 'classe-1');
	});

	it('6e compte de la journée dans la classe : 429 avec le message prévu, rien créé', async () => {
		countRecentChildAccounts.mockResolvedValue(5);
		const res = await actions.register(evenement());
		expect(res).toMatchObject({
			status: 429,
			data: {
				error:
					"Trop d'inscriptions dans cette classe aujourd'hui. Réessayer demain ou prévenir le professeur.",
				parentEmail: 'Parent@Exemple.fr'
			}
		});
		expect(createChildAccount).not.toHaveBeenCalled();
		expect(sendChildRegistrationEmail).not.toHaveBeenCalled();
	});

	it('compteur de la classe illisible : refus (fermé en panne), rien créé', async () => {
		countRecentChildAccounts.mockResolvedValue(null);
		const res = await actions.register(evenement());
		expect(res).toMatchObject({ status: 500 });
		expect(createChildAccount).not.toHaveBeenCalled();
	});

	it('ordre : code → plafond du parent → plafond de la classe', async () => {
		rpcMock.mockResolvedValue({ data: null, error: null });
		await actions.register(evenement());
		expect(countRecentChildAccounts).not.toHaveBeenCalled();

		rpcMock.mockResolvedValue({ data: 'classe-1', error: null });
		checkChildSignupRateLimitByParentEmail.mockResolvedValue({ allowed: false, message: 'Trop' });
		await actions.register(evenement());
		expect(countRecentChildAccounts).not.toHaveBeenCalled();
	});

	it("courriel en échec : le compte existe, l'écran le dit, rien n'est noté envoyé", async () => {
		sendChildRegistrationEmail.mockResolvedValue({ success: false, error: 'Brevo' });
		const res = await actions.register(evenement());
		expect(res).toMatchObject({ success: true, loginId: 'noelie42', emailSent: false });
		expect(markParentEmailSent).not.toHaveBeenCalled();
		expect(deleteChildAccount).not.toHaveBeenCalled();
	});

	it("demande au parent impossible : l'inscription est annulée", async () => {
		createParentRequest.mockResolvedValue(null);
		const res = await actions.register(evenement());
		expect(res).toMatchObject({ status: 500 });
		expect(deleteChildAccount).toHaveBeenCalledWith(expect.anything(), 'eleve-1');
		expect(sendChildRegistrationEmail).not.toHaveBeenCalled();
	});

	it("exception pendant la demande au parent : l'inscription est annulée", async () => {
		createParentRequest.mockRejectedValue(new Error('réseau'));
		const res = await actions.register(evenement());
		expect(res).toMatchObject({ status: 500 });
		expect(deleteChildAccount).toHaveBeenCalledWith(expect.anything(), 'eleve-1');
	});

	it("exception pendant l'envoi : le compte reste, l'écran dit que le courriel n'est pas parti", async () => {
		sendChildRegistrationEmail.mockRejectedValue(new Error('import'));
		const res = await actions.register(evenement());
		expect(res).toMatchObject({ success: true, emailSent: false });
		expect(deleteChildAccount).not.toHaveBeenCalled();
	});

	it('prénom portant un lien ou des chiffres : refusé (il part dans le sujet du courriel)', async () => {
		for (const childFirstname of ['www.piege.fr', 'https://x', 'Noé 42']) {
			const res = await actions.register(evenement({ ...CHAMPS, childFirstname }));
			expect(res).toMatchObject({
				status: 400,
				data: { errors: { childFirstname: expect.any(Array) } }
			});
		}
		expect(createChildAccount).not.toHaveBeenCalled();
	});

	it('prénoms réels acceptés : tiret, apostrophe, accents', async () => {
		for (const childFirstname of ['Anne-Sophie', "N'Golo", 'Zoé Lou', 'Łukasz']) {
			await actions.register(evenement({ ...CHAMPS, childFirstname }));
		}
		expect(createChildAccount).toHaveBeenCalledTimes(4);
	});
});
