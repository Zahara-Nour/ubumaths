/**
 * Mon carnet de liaison — la vue de l'élève (ADR 0040 ; C1-C3, Q3, Q15).
 *
 * L'élève voit le même carnet que ses parents, avec « Tes parents voient
 * cette page », et la liste des courriels qui leur ont été envoyés (date,
 * nature, motifs). Jamais leurs adresses.
 *
 * Tout passe par le client de l'élève : `get_my_carnet` (garde d'appelant :
 * un élève, lui seul) et la RLS de `parent_notifications` (ses lignes).
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { readMyCarnet } from '$lib/server/carnet/carnet';
import { createServerLogger } from '$lib/utils/logger';

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
