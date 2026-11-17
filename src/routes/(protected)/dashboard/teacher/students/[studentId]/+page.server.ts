/**
 * Suivi d'un élève (prof) : chargement.
 *
 * SÉCURITÉ : prof seulement (l'admin est refusé, comme l'analytique), Zod sur
 * l'identifiant, `verifyTeacherStudent` avant toute lecture. Aucune date
 * d'activité n'est rendue (vie privée) ; la régularité ne rend que des paliers.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { verifyTeacherStudent } from '$lib/server/middleware/student-access';
import {
	getStudentCompetences,
	getStudentEvaluations,
	getStudentPointFollowUp,
	getStudentRegularity
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

	// Quatre blocs lus à part : un bloc en échec le dit, les autres restent.
	const [points, evaluations, regularity, competences] = await Promise.allSettled([
		getStudentPointFollowUp(supabase, studentId),
		getStudentEvaluations(supabase, studentId),
		getStudentRegularity(supabase, studentId),
		getStudentCompetences(supabase, studentId)
	]);
	for (const [label, result] of [
		['Points du programme', points],
		['Contrôles', evaluations],
		['Régularité', regularity],
		['Compétences', competences]
	] as const) {
		if (result.status === 'rejected') {
			logger.error(`[Suivi élève] ${label} illisibles :`, result.reason);
		}
	}

	return {
		student: {
			id: student.id,
			fullName: `${student.firstname ?? ''} ${student.lastname ?? ''}`.trim() || 'cet élève'
		},
		points: points.status === 'fulfilled' ? points.value : [],
		pointsError: points.status === 'rejected',
		evaluations: evaluations.status === 'fulfilled' ? evaluations.value : [],
		evaluationsError: evaluations.status === 'rejected',
		regularity: regularity.status === 'fulfilled' ? regularity.value : null,
		competences: competences.status === 'fulfilled' ? competences.value : [],
		competencesError: competences.status === 'rejected'
	};
};
