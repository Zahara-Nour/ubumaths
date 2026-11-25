/**
 * Page /auth/register/invitation/[token] — lecture du lien et action « create »
 *
 * Ce que la page fait du lien et des réponses de `redeemInvitation` ; la création elle-même
 * est prouvée contre la base par tests/integration/invitations-cours-particuliers-parent.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { rpcMock, redeemInvitation, checkSignupRateLimitByIP, sendPrivateLessonWelcomeEmail } =
	vi.hoisted(() => ({
		rpcMock: vi.fn(),
		redeemInvitation: vi.fn(),
		checkSignupRateLimitByIP: vi.fn(),
		sendPrivateLessonWelcomeEmail: vi.fn()
	}));

vi.mock('#lib/server/serviceRoleClient.ts', () => ({
	createServiceRoleClient: () => ({ rpc: rpcMock })
}));
vi.mock('#lib/server/private-lessons/redeem.ts', () => ({ redeemInvitation }));
vi.mock('#lib/server/email/brevo.ts', () => ({ sendPrivateLessonWelcomeEmail }));
vi.mock('#lib/server/rateLimiter.ts', () => ({ checkSignupRateLimitByIP }));

import { actions, load } from '../+page.server';

type CreateEvent = Parameters<typeof actions.create>[0];
type LoadEvent = Parameters<typeof load>[0];

const JETON = 'AbCdEfGhJkMnPqRsTuVwXyZ0123456789_-abcdefgh'.slice(0, 43);
const CHAMPS = {
	password: 'Kangourou-Bleu-27',
	confirmPassword: 'Kangourou-Bleu-27',
	acceptTerms: 'true',
	consent: 'true'
};

function chargement(token = JETON) {
	const setHeaders = vi.fn();
	const event = { params: { token }, setHeaders } as unknown as LoadEvent;
	return { event, setHeaders };
}

function envoi(champs: Record<string, string> = CHAMPS, token = JETON): CreateEvent {
	return {
		params: { token },
		request: new Request(`http://localhost/auth/register/invitation/${token}?/create`, {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				'user-agent': 'Navigateur de test'
			},
			body: new URLSearchParams(champs)
		}),
		getClientAddress: () => '198.51.100.7'
	} as unknown as CreateEvent;
}

beforeEach(() => {
	vi.clearAllMocks();
	checkSignupRateLimitByIP.mockResolvedValue({ allowed: true });
});

describe('lecture du lien', () => {
	it('lien valable : prénom, niveau lisible, école, échéance ; ni adresse ni jeton', async () => {
		rpcMock.mockResolvedValue({
			data: {
				firstname: 'Jade',
				grade: '5',
				school_name: 'Akadada',
				expires_at: '2099-01-01T00:00:00Z'
			},
			error: null
		});
		const { event, setHeaders } = chargement();
		const data = await load(event);

		expect(rpcMock).toHaveBeenCalledWith('get_private_lesson_invitation', { p_token: JETON });
		expect(data).toEqual({
			invitation: {
				firstname: 'Jade',
				gradeLabel: '5ème',
				schoolName: 'Akadada',
				expiresAt: '2099-01-01T00:00:00Z'
			}
		});
		expect(JSON.stringify(data)).not.toContain(JETON);
		expect(setHeaders).toHaveBeenCalledWith({
			'X-Robots-Tag': 'noindex, nofollow',
			'Cache-Control': 'private, no-store'
		});
	});

	it('lien plus valable (null) : aucune invitation', async () => {
		rpcMock.mockResolvedValue({ data: null, error: null });
		expect(await load(chargement().event)).toEqual({ invitation: null });
	});

	it('jeton mal formé : la base n’est pas interrogée', async () => {
		expect(await load(chargement('trop-court').event)).toEqual({ invitation: null });
		expect(rpcMock).not.toHaveBeenCalled();
	});
});

describe('action « create »', () => {
	it('succès : identifiant et prénom rendus, avec la preuve de la requête', async () => {
		redeemInvitation.mockResolvedValue({
			ok: true,
			loginId: 'jade123',
			childFirstname: 'Jade',
			studentId: 's',
			classId: 'c',
			emailSent: true
		});
		const res = await actions.create(envoi());

		expect(res).toEqual({
			success: true,
			loginId: 'jade123',
			childFirstname: 'Jade',
			emailSent: true
		});
		expect(redeemInvitation).toHaveBeenCalledWith(
			expect.anything(),
			sendPrivateLessonWelcomeEmail,
			{
				token: JETON,
				password: 'Kangourou-Bleu-27',
				termsVersion: 'cgu-2026-08',
				ip: '198.51.100.7',
				userAgent: 'Navigateur de test'
			}
		);
	});

	it('consentement non coché : refus sur le champ, rien n’est créé', async () => {
		const res = await actions.create(envoi({ ...CHAMPS, consent: 'false' }));
		expect(res).toMatchObject({ status: 400, data: { errors: { consent: expect.any(Array) } } });
		expect(redeemInvitation).not.toHaveBeenCalled();
	});

	it('limite de débit atteinte : refus avant toute création', async () => {
		checkSignupRateLimitByIP.mockResolvedValue({ allowed: false, message: 'Trop d’essais.' });
		const res = await actions.create(envoi());
		expect(res).toMatchObject({ status: 429, data: { error: 'Trop d’essais.' } });
		expect(redeemInvitation).not.toHaveBeenCalled();
	});

	it('jeton mal formé : lien plus valable, sans rien tenter', async () => {
		const res = await actions.create(envoi(CHAMPS, 'x'));
		expect(res).toMatchObject({ status: 410, data: { invalid: true } });
		expect(redeemInvitation).not.toHaveBeenCalled();
	});

	it.each([
		['invalid', 410, { invalid: true }],
		['in_use', 409, { error: expect.stringContaining('en cours de création') }],
		['weak_password', 400, { errors: { password: [expect.stringContaining('trop faible')] } }],
		['server_error', 500, { error: expect.stringContaining('Réessayez') }]
	])('refus « %s » → %i', async (reason, status, data) => {
		redeemInvitation.mockResolvedValue({ ok: false, reason });
		expect(await actions.create(envoi())).toMatchObject({ status, data });
	});

	it('exception : erreur serveur, pas de 500 non géré', async () => {
		redeemInvitation.mockRejectedValue(new Error('panne'));
		expect(await actions.create(envoi())).toMatchObject({ status: 500 });
	});
});
