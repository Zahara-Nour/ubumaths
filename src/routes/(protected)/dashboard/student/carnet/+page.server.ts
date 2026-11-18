/**
 * Mon carnet de liaison — la vue de l'élève (ADR 0040 ; C1-C3, Q3, Q15).
 *
 * L'élève voit le même carnet que ses parents, avec « Tes parents voient
 * cette page », et la liste des courriels qui leur ont été envoyés (date,
 * nature, motifs). Jamais leurs adresses.
 *
 * La lecture passe par le client de l'élève : `get_my_carnet` (garde
 * d'appelant : un élève, lui seul) et la RLS de `parent_notifications`.
 *
 * Ajouter l'adresse d'un parent (A2) : l'élève n'a aucun droit d'écriture sur
 * les adresses ; le serveur l'écrit (service role) pour LUI SEUL, si son carnet
 * est ouvert, et n'envoie qu'un courriel de confirmation. Il ne voit jamais les
 * adresses enregistrées, seulement l'issue de son ajout.
 */

import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { requireRole } from '#lib/server/middleware/auth.ts';
import { rateLimit } from '#lib/server/middleware/rateLimit.ts';
import { readMyCarnet } from '#lib/server/carnet/carnet.ts';
import {
	addParentContact,
	parentEmailSchema,
	type AddContactOutcome
} from '#lib/server/carnet/envois.ts';
import { fetchStaffDirectory, soleTeacher } from '#lib/server/staff-directory.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

// Types

export interface CarnetNotification {
	created_at: string;
	kind: string;
	reasons: string[];
}

// Constantes

const logger = createServerLogger('(protected)/dashboard/student/carnet/+page.server');

/** Les plus récents : une année de courriels d'exception tient largement. */
const MAX_NOTIFICATIONS = 30;

/** Deux parents, quelques fautes de frappe : au-delà, ce n'est plus un ajout. */
const MAX_ADDS_PER_HOUR = 6;

const addSchema = z.object({ email: z.string().max(320) });

/**
 * Ce que l'élève lit après son ajout. Une adresse déjà connue (confirmée,
 * refusée, en attente, quota) reçoit la MÊME réponse neutre : la page ne doit
 * pas lui dire l'état d'une adresse de ses parents.
 */
const NEUTRAL_MESSAGE =
	'Cette adresse ne peut pas être ajoutée. Si ton parent ne reçoit rien, parles-en à ton professeur.';
const ADD_MESSAGES: Record<AddContactOutcome, string> = {
	sent: 'Un courriel de confirmation est parti. Le lien du carnet suivra quand ton parent aura confirmé.',
	known: NEUTRAL_MESSAGE,
	already_confirmed: NEUTRAL_MESSAGE,
	refused: NEUTRAL_MESSAGE,
	quota: NEUTRAL_MESSAGE,
	limit: 'Deux parents reçoivent déjà ce carnet.',
	send_failed: "Le courriel n'a pas pu partir. Réessaie plus tard."
};

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await requireRole(locals, 'student');

	const [carnet, notifications] = await Promise.all([
		readMyCarnet(locals.supabase),
		locals.supabase
			.from('parent_notifications')
			.select('created_at, kind, reasons')
			.eq('student_id', user.id)
			.eq('status', 'sent')
			.order('created_at', { ascending: false })
			.limit(MAX_NOTIFICATIONS)
	]);

	if (notifications.error) {
		logger.error('[parent_notifications]', notifications.error);
	}

	return {
		carnet,
		notifications: (notifications.data ?? []) satisfies CarnetNotification[]
	};
};

export const actions: Actions = {
	addParent: async ({ request, locals }) => {
		const { user } = await requireRole(locals, 'student');
		await rateLimit(`carnet-add:${user.id}`, MAX_ADDS_PER_HOUR, 60 * 60_000);

		const form = addSchema.safeParse(Object.fromEntries(await request.formData()));
		const email = form.success ? parentEmailSchema.safeParse(form.data.email) : null;
		if (!email?.success) {
			return fail(400, { message: 'Saisis une adresse électronique valide.', sent: false });
		}

		// Carnet ouvert pour lui (classe au carnet activé, partage non coupé).
		const carnet = await readMyCarnet(locals.supabase);
		if (!carnet || !carnet.shared) {
			return fail(409, {
				message: "Le carnet de liaison n'est pas ouvert pour ta classe.",
				sent: false
			});
		}

		const teacher = soleTeacher(await fetchStaffDirectory(locals.supabase));
		const outcome = await addParentContact({
			studentId: user.id,
			email: email.data,
			source: 'student',
			createdBy: user.id,
			teacherName: teacher?.full_name?.trim() || null
		});
		const message = ADD_MESSAGES[outcome];
		return outcome === 'sent' ? { message, sent: true } : fail(409, { message, sent: false });
	}
};
