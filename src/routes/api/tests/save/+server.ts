import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { validateSaveTest } from '$lib/server/validation/tests';
import { addBuddyXpFromTest } from '$lib/server/buddy-xp-service';
import { fetchTemplateThemeIds } from '$lib/server/buddy-themes';
import {
	CourseCardLookupError,
	fetchCourseCardTemplateIds
} from '$lib/server/course-card-attempts';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/tests/save/+server');

/**
 * Fin d'une série libre : gain du Palotin
 * POST /api/tests/save
 *
 * Chaque question laisse sa trace dès la réponse (`/api/skill-attempts`,
 * ADR 0038, N9). Cet appel de fin n'écrit plus ni séance libre
 * (`test_sessions`, `test_answers`), ni trace, ni fiche FSRS (N13, décision de
 * David du 2026-11-11) : il calcule seulement le gain du Palotin à partir des
 * réponses de la série, comme avant (Contrôle blanc, Course aux nombres), et
 * en Saisie (réponses corrigées par l'appli, décision de David du 2026-11-11).
 * Flash-cards : auto-évaluées de bout en bout, aucun gain.
 *
 * Body: TestResult + items (composition jouée)
 * Returns: { buddy_xp }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const supabase = locals.supabase;
	// Authentification : 401 sans session, 403 sans profil (garde commune)
	const { user } = await requireAuth(locals);

	try {
		// SECURITY: Validate request body with Zod schema
		const body = await request.json();
		const validation = validateSaveTest(body);

		if (!validation.success) {
			return json({ error: validation.error.issues[0].message }, { status: 400 });
		}

		const { result, assignmentId } = validation.data;

		// Évaluation (chantier 5, ADR 0015) : le SERVEUR tire, corrige et note, par
		// `/api/evaluations/assignments/[id]/start` puis `/api/evaluations/attempts/[id]/submit`.
		// Une fin de série qui cible une évaluation est refusée.
		if (assignmentId) {
			return json(
				{ error: "Un contrôle s'enregistre par l'envoi du contrôle, pas ici" },
				{ status: 400 }
			);
		}

		// Flash-cards : auto-évaluées de bout en bout, donc sans XP (comme une carte)
		if (result.mode === 'flash') {
			return json({ buddy_xp: null });
		}

		const templateIds = [
			...new Set(
				result.answers.flatMap((answer) =>
					answer.instance.templateId ? [answer.instance.templateId] : []
				)
			)
		];

		// Cartes de cours (#617) : pas d'XP (décision 2026-09-28). Nature lue en
		// BASE, avec les droits du SERVEUR (une carte repassée en brouillon pendant
		// la série reste une carte), jamais dans l'instance envoyée par le client.
		// Illisible après 3 tentatives → 503 : un gain manqué, jamais un gain faux.
		let courseCardIds: Set<string>;
		try {
			courseCardIds = await fetchCourseCardTemplateIds(createServiceRoleClient(), templateIds);
		} catch (lookupError) {
			if (!(lookupError instanceof CourseCardLookupError)) throw lookupError;
			return json(
				{ error: 'Enregistrement momentanément impossible, réessayer dans un instant.' },
				{ status: 503 }
			);
		}

		let buddyXp = null;
		try {
			const xpAnswers = result.answers.filter(
				(answer) => !answer.instance.templateId || !courseCardIds.has(answer.instance.templateId)
			);
			// Thème d'une réponse = thème du programme du point que valide la
			// question (bonus « nouveau thème ») : une lecture pour la série.
			const themeByTemplate = await fetchTemplateThemeIds(supabase, [
				...new Set(
					xpAnswers.flatMap((answer) =>
						answer.instance.templateId ? [answer.instance.templateId] : []
					)
				)
			]);
			const answers = xpAnswers.map((answer) => ({
				isCorrect: answer.isCorrect,
				theme: answer.instance.templateId
					? themeByTemplate.get(answer.instance.templateId)
					: undefined
			}));
			buddyXp = await addBuddyXpFromTest(supabase, user.id, answers);
		} catch (buddyError) {
			// Non bloquant : les traces sont déjà enregistrées, question par question
			logger.error('⚠️ [API] Error awarding buddy XP:', buddyError);
		}

		return json({ buddy_xp: buddyXp });
	} catch (error) {
		logger.error('Error saving test results:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
