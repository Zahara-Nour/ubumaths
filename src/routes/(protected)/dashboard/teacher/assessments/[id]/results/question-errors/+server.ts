/**
 * Erreurs de la classe sur une question d'un contrôle (professeur) : mêmes
 * gardes que la page résultats (rôle, auteur du contrôle, mode test). Lecture
 * seule, sous la RLS du professeur.
 */

import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { EvaluationError, getEvaluation, getEvaluationResults } from '$lib/server/evaluations';
import { getEvaluationQuestionErrors } from '$lib/server/evaluation-question-errors';
import { getTeacherTestMode } from '$lib/server/test-mode';
import { validateUuidParam } from '$lib/server/validation/params';

const querySchema = z.object({ template: z.string().uuid() });

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);
	const id = validateUuidParam(params.id);

	const query = querySchema.safeParse({ template: url.searchParams.get('template') });
	if (!query.success) throw error(400, 'Modèle invalide');

	try {
		const evaluation = await getEvaluation(locals.supabase, id);
		if (!evaluation) throw error(404, 'Contrôle introuvable');
		if (evaluation.created_by !== user.id && profile.role !== 'admin') {
			throw error(403, 'Non autorisé');
		}

		const isTestMode = await getTeacherTestMode(user.id, locals.supabase);
		const results = await getEvaluationResults(locals.supabase, evaluation, isTestMode);

		const errors = await getEvaluationQuestionErrors(
			locals.supabase,
			evaluation,
			results.map((r) => ({
				id: r.student_id,
				firstname: r.student_firstname,
				lastname: r.student_lastname
			})),
			query.data.template
		);
		return json(errors);
	} catch (e) {
		if (e instanceof EvaluationError) throw error(e.status, e.message);
		throw e;
	}
};
