/**
 * Assigner une évaluation publiée à des classes ; retirer une assignation.
 */

import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { uuidSchema } from '$lib/server/validation/common';
import { classIdsFieldSchema } from '$lib/server/validation/evaluations';
import {
	assignEvaluation,
	EvaluationError,
	getEvaluation,
	getEvaluationAssignments,
	removeAssignment
} from '$lib/server/evaluations';
import { notifyNewAssessment } from '$lib/server/auto-notifications';
import { getTeacherClassesWithCounts } from '$lib/server/students';
import { validateUuidParam } from '$lib/server/validation/params';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);
	const id = validateUuidParam(params.id);

	try {
		const evaluation = await getEvaluation(locals.supabase, id);
		if (!evaluation) throw error(404, 'Évaluation introuvable');
		if (evaluation.created_by !== user.id && profile.role !== 'admin') {
			throw error(403, 'Non autorisé');
		}
		// Seule une évaluation publiée s'assigne
		if (evaluation.status !== 'published') {
			throw redirect(303, '/dashboard/teacher/assessments');
		}

		const [classesWithData, existingAssignments] = await Promise.all([
			getTeacherClassesWithCounts(user.id, locals.supabase),
			getEvaluationAssignments(locals.supabase, evaluation.id)
		]);

		const classes = classesWithData.map((c) => ({
			id: c.id,
			name: c.name,
			level: c.description,
			student_count: c.student_count,
			is_assigned: existingAssignments.some((a) => a.class_id === c.id)
		}));

		return { evaluation, classes, existingAssignments };
	} catch (e) {
		if (e instanceof EvaluationError) throw error(e.status, e.message);
		throw e;
	}
};

export const actions: Actions = {
	assign: async ({ request, params, locals }) => {
		const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);
		const id = validateUuidParam(params.id);

		const classIds = classIdsFieldSchema.safeParse((await request.formData()).get('class_ids'));
		if (!classIds.success) {
			return fail(400, { message: classIds.error.issues[0].message });
		}

		try {
			await assignEvaluation(
				locals.supabase,
				id,
				{ class_ids: classIds.data },
				{ id: user.id, isAdmin: profile.role === 'admin' }
			);

			// Prévenir les élèves ; un échec de notification n'annule pas l'assignation
			const evaluation = await getEvaluation(locals.supabase, id);
			if (evaluation) {
				const teacherName =
					profile.firstname && profile.lastname
						? `${profile.firstname} ${profile.lastname}`
						: 'Votre professeur';
				await notifyNewAssessment({
					assessmentId: evaluation.id,
					assessmentTitle: evaluation.series.title,
					teacherName,
					classIds: classIds.data
				});
			}
			return { success: true };
		} catch (e) {
			if (e instanceof EvaluationError) return fail(e.status, { message: e.message });
			throw e;
		}
	},

	unassign: async ({ request, params, locals }) => {
		await requireRoles(locals, ['teacher', 'admin']);
		const id = validateUuidParam(params.id);

		const assignmentId = uuidSchema.safeParse((await request.formData()).get('assignment_id'));
		if (!assignmentId.success) {
			return fail(400, { message: "Identifiant d'assignation manquant" });
		}

		try {
			// L'URL peut porter un ancien id d'assessment : on retrouve l'évaluation
			const evaluation = await getEvaluation(locals.supabase, id);
			if (!evaluation) return fail(404, { message: 'Évaluation introuvable' });
			await removeAssignment(locals.supabase, assignmentId.data, evaluation.id);
			return { success: true };
		} catch (e) {
			if (e instanceof EvaluationError) return fail(e.status, { message: e.message });
			throw e;
		}
	}
};
