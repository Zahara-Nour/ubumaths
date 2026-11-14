/**
 * Suivi d'un élève (prof) : chargement.
 *
 * SÉCURITÉ : prof seulement (l'admin est refusé, comme l'analytique), Zod sur
 * l'identifiant, `verifyTeacherStudent` avant toute lecture. Aucune date
 * n'est rendue (vie privée).
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { verifyTeacherStudent } from '$lib/server/middleware/student-access';
import {
	getStudentPointFollowUp,
	type StudentPointFollowUp
} from '$lib/server/stats/student-follow-up';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger(
	'(protected)/dashboard/teacher/students/[studentId]/+page.server'
);

const paramsSchema = z.object({
	studentId: z.string().uuid('ID élève invalide')
});

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await requireRole(locals, 'teacher');
	const supabase = locals.supabase;

	const parsed = paramsSchema.safeParse(params);
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0].message);
	}
	const { studentId } = parsed.data;

	if (!(await verifyTeacherStudent(user.id, studentId, supabase))) {
		throw error(403, 'Cet élève n’est pas dans tes classes');
	}

	const { data: student, error: studentError } = await supabase
		.from('profiles')
		.select('id, firstname, lastname')
		.eq('id', studentId)
		.maybeSingle();
	if (studentError || !student) {
		logger.error('[Suivi élève] Profil illisible :', studentError);
		throw error(404, 'Élève non trouvé');
	}

	let points: StudentPointFollowUp[] = [];
	let pointsError = false;
	try {
		points = await getStudentPointFollowUp(supabase, studentId);
	} catch (e) {
		logger.error('[Suivi élève] Points du programme illisibles :', e);
		pointsError = true;
	}

	return {
		student: {
			id: student.id,
			fullName: `${student.firstname ?? ''} ${student.lastname ?? ''}`.trim() || 'cet élève'
		},
		points,
		pointsError
	};
};
