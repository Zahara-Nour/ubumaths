/**
 * Garde d'autorisation : "prof (unique)", pour une classe existante.
 *
 * Mono-prof : la classe n'est plus assignée à un prof (colonne `teacher_id`
 * supprimée) ; le prof unique possède toutes les classes. La garde de rôle
 * suffit donc à l'autorisation. Utilisé par les endpoints
 * `/api/teacher/classes/[classId]/analytics/*` et `…/anti-fraud/*`, l'export
 * des compétences et la page analytique.
 *
 * Le compte admin est refusé, comme par le layout `dashboard/teacher` (décision
 * D1, 2026-10-11) : le prof qui a besoin de l'admin s'élève depuis son compte
 * prof, et son rôle de session reste `teacher`.
 */

import { error } from '@sveltejs/kit';
import { requireRole, type AuthResult } from '$lib/server/middleware/auth';

export interface TeacherClassAuthResult extends AuthResult {
	classRow: { id: string; name: string; grade: string | null };
}

export async function requireTeacherOfClass(
	locals: App.Locals,
	classId: string
): Promise<TeacherClassAuthResult> {
	const { user, profile } = await requireRole(locals, 'teacher');

	const { data: classRow, error: classErr } = await locals.supabase
		.from('classes')
		.select('id, name, grade')
		.eq('id', classId)
		.maybeSingle();

	if (classErr || !classRow) {
		throw error(404, 'Classe introuvable');
	}

	return { user, profile, classRow };
}
