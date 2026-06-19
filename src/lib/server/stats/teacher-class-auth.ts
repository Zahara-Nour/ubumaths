/**
 * Garde d'autorisation : "prof (unique) ou admin", pour une classe existante.
 *
 * Mono-prof : la classe n'est plus assignée à un prof (colonne `teacher_id`
 * supprimée) ; le prof unique et l'admin possèdent toutes les classes. La garde
 * de rôle suffit donc à l'autorisation. Utilisé par les endpoints
 * `/api/teacher/classes/[classId]/analytics/*`.
 */

import { error } from '@sveltejs/kit';
import { requireRoles, type AuthResult } from '$lib/server/middleware/auth';

export interface TeacherClassAuthResult extends AuthResult {
	classRow: { id: string; name: string; grade: string | null };
}

export async function requireTeacherOfClass(
	locals: App.Locals,
	classId: string
): Promise<TeacherClassAuthResult> {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

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
