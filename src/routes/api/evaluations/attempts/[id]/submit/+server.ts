/**
 * POST /api/evaluations/attempts/[id]/submit — envoyer une tentative
 * d'évaluation (chantier 5, ADR 0015, C10-C14).
 *
 * `[id]` : la tentative (séance) renvoyée par le démarrage. Le serveur vérifie
 * qu'elle appartient à l'utilisateur et n'est pas terminée, régénère les
 * questions depuis modèles + graines, corrige, note, enregistre (service_role)
 * et alimente le SRS avec SON verdict. Tout verdict du navigateur est ignoré.
 *
 * Corps (Zod) : { answers: [{ position, values?, latex?, choices?, timeSpent? }], timeSpent }
 * Réponse : { attemptId, late, grade, pointsEarned, totalQuestions, correctCount, questions }
 * Erreurs : 400 (corps invalide), 404 (tentative inconnue ou d'un autre),
 * 409 (déjà terminée, rien n'est écrit).
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { uuidSchema } from '$lib/server/validation/common';
import { submitAttemptSchema } from '$lib/server/validation/evaluations';
import { EvaluationError } from '$lib/server/evaluations';
import { submitEvaluationAttempt } from '$lib/server/evaluation-attempts';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireAuth(locals);

	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		return json({ error: 'Tentative introuvable' }, { status: 404 });
	}

	const body: unknown = await request.json().catch(() => null);
	const validation = submitAttemptSchema.safeParse(body);
	if (!validation.success) {
		return json({ error: validation.error.issues[0].message }, { status: 400 });
	}

	try {
		const result = await submitEvaluationAttempt(
			{
				userClient: locals.supabase,
				service: createServiceRoleClient(),
				userId: user.id,
				role: profile.role
			},
			idValidation.data,
			validation.data
		);
		return json(result);
	} catch (e) {
		if (e instanceof EvaluationError) return json({ error: e.message }, { status: e.status });
		throw e;
	}
};
