/**
 * GET /api/evaluations/assignments/[id] — page d'attente d'un contrôle assigné
 * (chantier `diaporama-reglages`, PR 2b).
 *
 * Lecture SEULE, avant `POST …/start` : titre, forme, nombre de questions,
 * durée, reprise d'une tentative en cours. Mêmes droits et mêmes refus que le
 * démarrage (404 non destinataire, brouillon, membre archivé ; 403 date limite
 * passée, tentatives épuisées), pour que l'élève les voie avant de cliquer.
 * Aucune séance créée : la tentative (et le chrono d'une Course) ne démarre
 * qu'au clic sur « C'est parti ! ».
 */

import type { RequestHandler } from './$types';
import { requireAuth } from '#lib/server/middleware/auth.ts';
import { uuidSchema } from '#lib/server/validation/common.ts';
import { EvaluationError } from '#lib/server/evaluations.ts';
import { readEvaluationOverview } from '#lib/server/evaluation-attempts.ts';
import { createServiceRoleClient } from '#lib/server/serviceRoleClient.ts';
import { rateLimit } from '#lib/server/middleware/rateLimit.ts';
import type { EvaluationOverviewResponse } from '#lib/types/evaluation-attempt.ts';

export const GET: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireAuth(locals);
	await rateLimit(`evaluation-overview:${user.id}`, 30, 60_000);

	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		return Response.json({ error: 'Lien de contrôle invalide' }, { status: 400 });
	}

	try {
		const overview: EvaluationOverviewResponse = await readEvaluationOverview(
			{
				userClient: locals.supabase,
				service: createServiceRoleClient(),
				userId: user.id,
				role: profile.role
			},
			idValidation.data
		);
		return Response.json(overview);
	} catch (e) {
		if (e instanceof EvaluationError)
			return Response.json({ error: e.message }, { status: e.status });
		throw e;
	}
};
