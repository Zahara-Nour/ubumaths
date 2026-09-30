/**
 * POST /api/evaluations/assignments/[id]/start — ouvrir une évaluation assignée.
 *
 * `[id]` est l'identifiant de l'ASSIGNATION : celui des liens
 * `/automaths/test?assignment=<id>` (repris des anciennes assessment_assignments).
 *
 * - Destinataire (élève nommé, ou membre actif de la classe) : date limite et
 *   tentatives de l'évaluation vérifiées (B14).
 * - Propriétaire ou admin non destinataire : APERÇU (`preview: true`). La
 *   sauvegarde ne rattachera jamais sa séance à l'évaluation (B16).
 *
 * Réponse : { validation, preview, evaluation: { id, form, time_limit, title, categories } }.
 * La forme vient de l'évaluation, jamais de l'URL (B15).
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { uuidSchema } from '$lib/server/validation/common';
import {
	EvaluationError,
	getAssignmentWithEvaluation,
	isAssignmentRecipient,
	validateAttempt
} from '$lib/server/evaluations';
import type { AttemptValidation } from '$lib/types/evaluation';

export const POST: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireAuth(locals);

	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		return json({ error: "Lien d'évaluation invalide" }, { status: 400 });
	}

	try {
		const found = await getAssignmentWithEvaluation(locals.supabase, idValidation.data);
		if (!found) {
			return json({ error: 'Évaluation introuvable' }, { status: 404 });
		}
		const { assignment, evaluation } = found;

		const recipient = await isAssignmentRecipient(locals.supabase, assignment, user.id);
		let validation: AttemptValidation;
		let preview = false;

		if (recipient) {
			validation = await validateAttempt(locals.supabase, evaluation, user.id);
		} else if (
			profile.role === 'admin' ||
			(profile.role === 'teacher' && evaluation.created_by === user.id)
		) {
			preview = true;
			validation = {
				can_attempt: true,
				attempts_remaining: null,
				deadline_passed: false,
				current_attempts: 0
			};
		} else {
			return json({ error: 'Cette évaluation ne vous est pas assignée' }, { status: 403 });
		}

		return json({
			validation,
			preview,
			evaluation: {
				id: evaluation.id,
				form: evaluation.form,
				time_limit: evaluation.time_limit,
				title: evaluation.series.title,
				categories: evaluation.series.categories
			}
		});
	} catch (e) {
		if (e instanceof EvaluationError) return json({ error: e.message }, { status: e.status });
		throw e;
	}
};
