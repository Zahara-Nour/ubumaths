/**
 * Garde d'autorisation : "prof propriétaire de la classe ou admin".
 *
 * Mutualise le check `classes.teacher_id = user.id` (ou admin) pour les
 * endpoints `/api/teacher/classes/[classId]/analytics/*`.
 */

import { error } from '@sveltejs/kit';
import { requireRoles, type AuthResult } from '$lib/server/middleware/auth';

export interface TeacherClassAuthResult extends AuthResult {
	classRow: { id: string; teacher_id: string; name: string; grade: string | null };
}

export async function requireTeacherOfClass(
	locals: App.Locals,
	classId: string
): Promise<TeacherClassAuthResult> {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	const { data: classRow, error: classErr } = await locals.supabase
		.from('classes')
		.select('id, teacher_id, name, grade')
		.eq('id', classId)
		.maybeSingle();

	if (classErr || !classRow) {
		throw error(404, 'Classe introuvable');
	}

	const isOwner = classRow.teacher_id === user.id;
	const isAdmin = profile.role === 'admin';
	if (!isOwner && !isAdmin) {
		throw error(403, 'Vous n’êtes pas le professeur de cette classe');
	}

	return { user, profile, classRow };
}
