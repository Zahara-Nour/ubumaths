/**
 * Cours particuliers : la garde des actions
 * =========================================
 *
 * Audit de sécurité de la PR 2 (C1) : `invite`, `resend` et `cancel` écrivent en service role
 * et envoient un courriel au nom de Chiphre. Un prof non élevé ou un élève est refusé (403)
 * AVANT tout client service, toute limite de débit et tout envoi ; un admin élevé passe.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const createServiceRoleClient = vi.fn(() => ({}));
vi.mock('#lib/server/serviceRoleClient.ts', () => ({ createServiceRoleClient }));

const sendPrivateLessonInvitationEmail = vi.fn();
vi.mock('#lib/server/email/brevo.ts', () => ({ sendPrivateLessonInvitationEmail }));

const checkPrivateLessonInvitationRateLimit = vi.fn(async () => ({ allowed: true }));
vi.mock('#lib/server/rateLimiter.ts', () => ({ checkPrivateLessonInvitationRateLimit }));

const SCHOOL = { id: '11111111-1111-4111-8111-111111111111', name: 'Akadada', hasSchoolYear: true };
const INVITATION = { id: '22222222-2222-4222-8222-222222222222', firstname: 'Jade' };
const createInvitation = vi.fn(async () => ({ ok: true, invitation: INVITATION, emailSent: true }));
const resendInvitation = vi.fn(async () => ({ ok: true, invitation: INVITATION, emailSent: true }));
const cancelInvitation = vi.fn(async () => ({ ok: true }));
vi.mock('#lib/server/private-lessons/invitations.ts', () => ({
	INVITATION_MAX_SENDS: 5,
	getPrivateLessonsSchool: vi.fn(async () => SCHOOL),
	listOpenInvitations: vi.fn(async () => []),
	createInvitation,
	resendInvitation,
	cancelInvitation
}));

const USER_ID = '33333333-3333-4333-8333-333333333333';

function formRequest(fields: Record<string, string>): Request {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.append(k, v);
	return new Request('http://localhost', { method: 'POST', body });
}

const FIELDS = {
	invite: { firstname: 'Jade', parentEmail: 'parent.jade@example.test', grade: '5' },
	resend: { id: INVITATION.id },
	cancel: { id: INVITATION.id }
} as const;

type ActionName = keyof typeof FIELDS;

async function run(action: ActionName, locals: Record<string, unknown>) {
	const { actions } = await import('../+page.server');
	return actions[action]({ request: formRequest(FIELDS[action]), locals } as never);
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('cours particuliers : garde des actions', () => {
	const refuses: Array<[string, Record<string, unknown>]> = [
		['prof non élevé', { user: { id: USER_ID }, profile: { id: USER_ID, role: 'teacher' } }],
		['élève', { user: { id: USER_ID }, profile: { id: USER_ID, role: 'student' } }]
	];

	for (const action of Object.keys(FIELDS) as ActionName[]) {
		it.each(refuses)(`${action} : %s → 403, rien n'est écrit ni envoyé`, async (_nom, locals) => {
			await expect(run(action, locals)).rejects.toMatchObject({ status: 403 });
			expect(createServiceRoleClient).not.toHaveBeenCalled();
			expect(checkPrivateLessonInvitationRateLimit).not.toHaveBeenCalled();
			expect(sendPrivateLessonInvitationEmail).not.toHaveBeenCalled();
			expect(createInvitation).not.toHaveBeenCalled();
			expect(resendInvitation).not.toHaveBeenCalled();
			expect(cancelInvitation).not.toHaveBeenCalled();
		});

		it(`${action} : sans session → 401`, async () => {
			await expect(run(action, {})).rejects.toMatchObject({ status: 401 });
			expect(createServiceRoleClient).not.toHaveBeenCalled();
		});

		it(`${action} : admin élevé → passe`, async () => {
			const locals = {
				user: { id: USER_ID },
				profile: { id: USER_ID, role: 'teacher' },
				adminElevation: { active: true, adminUserId: USER_ID, expiresAt: Date.now() + 60_000 },
				adminSupabase: {}
			};
			expect(await run(action, locals)).toMatchObject({ success: true });
			expect(createServiceRoleClient).toHaveBeenCalled();
		});
	}

	it('invite et resend : limite de débit atteinte → 429, rien n’est envoyé', async () => {
		checkPrivateLessonInvitationRateLimit.mockResolvedValue({
			allowed: false,
			message: 'Trop d’invitations envoyées cette heure-ci. Réessayez plus tard.'
		} as never);
		const locals = { user: { id: USER_ID }, profile: { id: USER_ID, role: 'admin' } };
		for (const action of ['invite', 'resend'] as const) {
			expect(await run(action, locals)).toMatchObject({ status: 429 });
		}
		expect(createInvitation).not.toHaveBeenCalled();
		expect(resendInvitation).not.toHaveBeenCalled();
		expect(checkPrivateLessonInvitationRateLimit).toHaveBeenCalledWith(USER_ID);
	});

	it('invite : champ absent → 400 en français', async () => {
		const { actions } = await import('../+page.server');
		const result = await actions.invite({
			request: formRequest({ parentEmail: 'parent.jade@example.test', grade: '5' }),
			locals: { user: { id: USER_ID }, profile: { id: USER_ID, role: 'admin' } }
		} as never);
		expect(result).toMatchObject({ status: 400, data: { message: 'Prénom requis' } });
	});
});
