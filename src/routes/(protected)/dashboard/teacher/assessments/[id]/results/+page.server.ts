/**
 * Résultats d'une évaluation (professeur) : les séances sont lues par
 * `test_sessions.evaluation_id`.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	computeEvaluationStatistics,
	EvaluationError,
	getEvaluation,
	getEvaluationResults
} from '$lib/server/evaluations';
import { getTeacherTestMode } from '$lib/server/test-mode';
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

		// Mode test du professeur : élèves de test seulement, ou vrais élèves seulement
		const isTestMode = await getTeacherTestMode(user.id, locals.supabase);
		const results = await getEvaluationResults(locals.supabase, evaluation, isTestMode);

		return {
			evaluation,
			results,
			statistics: computeEvaluationStatistics(evaluation.id, results)
		};
	} catch (e) {
		if (e instanceof EvaluationError) throw error(e.status, e.message);
		throw e;
	}
};
