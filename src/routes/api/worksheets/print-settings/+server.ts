/**
 * /api/worksheets/print-settings
 * ==============================
 *
 * Taille du texte des PDF de fiche d'un élève (accessibilité, élèves
 * malvoyants) : `normal` (10 pt), `large` (14 pt), `x_large` (18 pt).
 *
 * GET  ?studentId=  → { textSize }  (sans studentId : l'appelant)
 * PUT  { studentId?, textSize } → { textSize }
 *
 * AUTH : l'élève, pour lui-même seulement ; le prof et l'admin, pour un élève
 * (studentId obligatoire). La RLS de `student_print_settings` tranche en
 * dernier ressort ; un refus (zéro ligne écrite) → 403.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	printSettingsQuerySchema,
	printSettingsUpdateSchema
} from '$lib/server/validation/worksheets';
import { loadTextSize, saveTextSize } from '$lib/server/worksheets/print-settings';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/worksheets/print-settings/+server');

/** L'élève visé : l'élève lui-même, ou celui que nomme le prof / l'admin */
function targetStudent(role: string, userId: string, studentId: string | undefined): string {
	if (role === 'student') {
		if (studentId !== undefined && studentId !== userId) {
			throw error(403, 'Un élève ne règle que ses propres fiches');
		}
		return userId;
	}
	if (studentId === undefined) throw error(400, 'Élève à préciser');
	return studentId;
}

export const GET: RequestHandler = async ({ locals, url }) => {
	const { user, profile } = await requireRoles(locals, ['student', 'teacher', 'admin']);

	const query = printSettingsQuerySchema.safeParse(Object.fromEntries(url.searchParams));
	if (!query.success) throw error(400, query.error.issues[0].message);

	const studentId = targetStudent(profile.role, user.id, query.data.studentId);
	return json({ textSize: await loadTextSize(locals.supabase, studentId) });
};

export const PUT: RequestHandler = async ({ locals, request }) => {
	const { user, profile } = await requireRoles(locals, ['student', 'teacher', 'admin']);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête invalide');
	}
	const validation = printSettingsUpdateSchema.safeParse(body);
	if (!validation.success) throw error(400, validation.error.issues[0].message);

	const { textSize } = validation.data;
	const studentId = targetStudent(profile.role, user.id, validation.data.studentId);

	let saved: boolean;
	try {
		saved = await saveTextSize(locals.supabase, studentId, textSize);
	} catch (err) {
		logger.error('[API] Taille du texte non enregistrée :', err);
		throw error(500, 'Taille du texte non enregistrée');
	}
	// Zéro ligne : la RLS a refusé (pas un élève, ou pas le droit)
	if (!saved) throw error(403, 'Réglage impossible pour ce compte');

	return json({ textSize });
};
