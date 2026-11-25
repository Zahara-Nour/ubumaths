/**
 * Admin → Cours particuliers
 * ==========================
 *
 * Chantier `invitation-cours-particulier` (docs/wip/invitation-cours-particulier-progress.md),
 * PR 2. L'admin invite un élève de moins de 15 ans (prénom, adresse du parent, niveau) ;
 * le parent reçoit un lien de 7 jours qui crée l'espace de l'enfant (page du lien : PR 3).
 *
 * SÉCURITÉ : `requireAdmin` d'abord, à chaque chargement et chaque action. Lecture avec le
 * client de l'admin (RLS : prof et admin seulement, décision 7) ; écritures en service
 * role APRÈS la garde, car la base n'ouvre aucune écriture aux comptes connectés.
 * L'école visée est TOUJOURS celle du réglage `is_private_lessons` (décision 3), relue par
 * le serveur : le formulaire n'en envoie aucune.
 */
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAdmin } from '#lib/server/middleware/auth.ts';
import { createServiceRoleClient } from '#lib/server/serviceRoleClient.ts';
import { sendPrivateLessonInvitationEmail } from '#lib/server/email/brevo.ts';
import {
	privateLessonInvitationCreateSchema,
	privateLessonInvitationIdSchema
} from '#lib/server/validation/private-lessons.ts';
import {
	cancelInvitation,
	createInvitation,
	getPrivateLessonsSchool,
	INVITATION_MAX_SENDS,
	listOpenInvitations,
	resendInvitation,
	type SendOutcome
} from '#lib/server/private-lessons/invitations.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

// Constantes

const logger = createServerLogger('(protected)/dashboard/admin/cours-particuliers/+page.server');

const NO_SCHOOL_MESSAGE = 'Aucune école n’est réglée pour les cours particuliers.';
const NO_YEAR_MESSAGE =
	'L’école des cours particuliers n’a pas d’année scolaire en cours : créez-la avant d’inviter.';

const REFUSALS: Record<Exclude<SendOutcome, { ok: true }>['reason'], string> = {
	not_found: 'Invitation introuvable.',
	ended: 'Cette invitation a déjà servi ou a été annulée.',
	in_use: 'Le parent est en train de créer le compte : réessayez dans quelques minutes.',
	cap: `Déjà ${INVITATION_MAX_SENDS} courriels pour cette invitation : annulez-la et créez-en une nouvelle.`
};

// Functions

/** L'école des cours particuliers, prête à recevoir une invitation ; sinon un refus. */
async function schoolReadyForSending(service: ReturnType<typeof createServiceRoleClient>) {
	const school = await getPrivateLessonsSchool(service);
	if (!school) return { ok: false as const, response: fail(409, { message: NO_SCHOOL_MESSAGE }) };
	if (!school.hasSchoolYear) {
		return { ok: false as const, response: fail(409, { message: NO_YEAR_MESSAGE }) };
	}
	return { ok: true as const, school };
}

function sentMessage(firstname: string, emailSent: boolean): string {
	return emailSent
		? `Invitation envoyée pour ${firstname}.`
		: `Le courriel pour ${firstname} n’est pas parti. Réessayez avec « Renvoyer ».`;
}

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = await requireAdmin(locals);

	try {
		const school = await getPrivateLessonsSchool(supabase);
		const invitations = school ? await listOpenInvitations(supabase, school.id) : [];
		return { school, invitations, maxSends: INVITATION_MAX_SENDS };
	} catch (err) {
		logger.error('Chargement des invitations :', err);
		throw error(500, 'Invitations illisibles');
	}
};

export const actions: Actions = {
	invite: async ({ request, locals }) => {
		const { adminUserId } = await requireAdmin(locals);

		const formData = await request.formData();
		const parsed = privateLessonInvitationCreateSchema.safeParse({
			firstname: formData.get('firstname'),
			parentEmail: formData.get('parentEmail'),
			grade: formData.get('grade')
		});
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0].message });
		}

		const service = createServiceRoleClient();
		try {
			const ready = await schoolReadyForSending(service);
			if (!ready.ok) return ready.response;

			const outcome = await createInvitation(service, sendPrivateLessonInvitationEmail, {
				school: ready.school,
				firstname: parsed.data.firstname,
				parentEmail: parsed.data.parentEmail,
				grade: parsed.data.grade,
				createdBy: adminUserId
			});
			if (!outcome.ok) return fail(409, { message: REFUSALS[outcome.reason] });
			return {
				success: true,
				emailSent: outcome.emailSent,
				message: sentMessage(outcome.invitation.firstname, outcome.emailSent)
			};
		} catch (err) {
			logger.error('Invitation non créée :', err);
			return fail(500, { message: 'Invitation non créée. Réessayez dans un instant.' });
		}
	},

	resend: async ({ request, locals }) => {
		await requireAdmin(locals);

		const formData = await request.formData();
		const parsed = privateLessonInvitationIdSchema.safeParse({ id: formData.get('id') });
		if (!parsed.success) return fail(400, { message: 'Invitation invalide.' });

		const service = createServiceRoleClient();
		try {
			const ready = await schoolReadyForSending(service);
			if (!ready.ok) return ready.response;

			const outcome = await resendInvitation(service, sendPrivateLessonInvitationEmail, {
				id: parsed.data.id,
				school: ready.school
			});
			if (!outcome.ok) return fail(409, { message: REFUSALS[outcome.reason] });
			return {
				success: true,
				emailSent: outcome.emailSent,
				message: sentMessage(outcome.invitation.firstname, outcome.emailSent)
			};
		} catch (err) {
			logger.error('Invitation non renvoyée :', err);
			return fail(500, { message: 'Invitation non renvoyée. Réessayez dans un instant.' });
		}
	},

	cancel: async ({ request, locals }) => {
		await requireAdmin(locals);

		const formData = await request.formData();
		const parsed = privateLessonInvitationIdSchema.safeParse({ id: formData.get('id') });
		if (!parsed.success) return fail(400, { message: 'Invitation invalide.' });

		const service = createServiceRoleClient();
		try {
			const school = await getPrivateLessonsSchool(service);
			if (!school) return fail(409, { message: NO_SCHOOL_MESSAGE });

			const outcome = await cancelInvitation(service, { id: parsed.data.id, schoolId: school.id });
			if (!outcome.ok) return fail(409, { message: REFUSALS[outcome.reason] });
			return { success: true, emailSent: false, message: 'Invitation annulée.' };
		} catch (err) {
			logger.error('Invitation non annulée :', err);
			return fail(500, { message: 'Invitation non annulée. Réessayez dans un instant.' });
		}
	}
};
