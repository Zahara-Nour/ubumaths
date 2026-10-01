/**
 * POST /api/evaluations/assignments/[id]/start — démarrer ou reprendre une
 * évaluation assignée (chantier 5, ADR 0015).
 *
 * `[id]` est l'identifiant de l'ASSIGNATION : celui des liens
 * `/automaths/test?assignment=<id>` (repris des anciennes assessment_assignments).
 *
 * - Destinataire (élève nommé, ou membre ACTIF de la classe), évaluation
 *   publiée : le SERVEUR crée la tentative (ou reprend celle en cours), tire les
 *   questions et renvoie leur version PUBLIQUE (ni réponse, ni correction, ni
 *   graine). Date limite passée, tentatives épuisées → 403.
 * - Non destinataire, brouillon, membre archivé → 404.
 * - Propriétaire ou admin non destinataire : APERÇU (catégories ; le navigateur
 *   génère comme un entraînement libre, rien n'est rattaché).
 *
 * Réponses :
 * - aperçu : { preview: true, evaluation: { id, form, time_limit, title, categories } }
 * - tentative : { preview: false, evaluation: { id, form, time_limit, title },
 *   attempt: { id, resumed, remainingSeconds, questions } }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { uuidSchema } from '$lib/server/validation/common';
import { EvaluationError } from '$lib/server/evaluations';
import { startEvaluationAttempt } from '$lib/server/evaluation-attempts';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { rateLimit } from '$lib/server/middleware/rateLimit';

export const POST: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireAuth(locals);
	// Démarrer tire et génère toutes les questions : pas de rafale
	rateLimit(`evaluation-start:${user.id}`, 20, 60_000);

	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		return json({ error: "Lien d'évaluation invalide" }, { status: 400 });
	}

	try {
		const result = await startEvaluationAttempt(
			{
				userClient: locals.supabase,
				service: createServiceRoleClient(),
				userId: user.id,
				role: profile.role
			},
			idValidation.data
		);

		if (result.kind === 'preview') {
			return json({ preview: true, evaluation: result.evaluation });
		}
		return json({
			preview: false,
			evaluation: result.evaluation,
			attempt: {
				id: result.attemptId,
				resumed: result.resumed,
				remainingSeconds: result.remainingSeconds,
				questions: result.questions
			}
		});
	} catch (e) {
		if (e instanceof EvaluationError) return json({ error: e.message }, { status: e.status });
		throw e;
	}
};
