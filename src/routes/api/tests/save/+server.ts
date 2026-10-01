import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSaveTest } from '$lib/server/validation/tests';
import { addBuddyXpFromTest } from '$lib/server/buddy-xp-service';
import { recordSeriesReviews } from '$lib/server/srs/record-series-reviews';
import {
	CourseCardLookupError,
	fetchCourseCardTemplateIds
} from '$lib/server/course-card-attempts';
import { computeTestScore } from '$lib/utils/test-score';
import { toJson } from '$lib/types/database-helpers';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';

/**
 * API route to save test results to database
 * POST /api/tests/save
 *
 * Body: TestResult + categories
 * Returns: { sessionId: string }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const supabase = locals.supabase;
	const { user } = await locals.safeGetSession();

	// Check authentication
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// SECURITY: Validate request body with Zod schema
		const body = await request.json();
		const validation = validateSaveTest(body);

		if (!validation.success) {
			return json({ error: validation.error.issues[0].message }, { status: 400 });
		}

		const { result, categories, assignmentId } = validation.data;
		// Forme « Flash-cards » (2026-09-30) : chaque réponse est une
		// auto-évaluation de l'élève (« J'avais trouvé » / « Je n'avais pas
		// trouvé ») — tentatives `student_self`, pas d'XP.
		const isFlash = result.mode === 'flash';

		// Évaluation (chantier 5, ADR 0015) : le SERVEUR tire, corrige et note, par
		// `/api/evaluations/assignments/[id]/start` puis `/api/evaluations/attempts/[id]/submit`.
		// Une sauvegarde qui cible une évaluation est refusée AVANT toute écriture ;
		// la base la refuserait de toute façon (Q38). L'aperçu du prof s'enregistre
		// comme un entraînement libre, sans assignation.
		if (assignmentId) {
			return json(
				{ error: "Une évaluation s'enregistre par l'envoi de l'évaluation, pas ici" },
				{ status: 400 }
			);
		}

		const reponsesAvecTemplate = result.answers.filter((answer) => answer.instance.templateId);
		const templateIds = [
			...new Set(reponsesAvecTemplate.map((answer) => answer.instance.templateId as string))
		];

		// Cartes de cours (#617) : la « réponse » est une auto-évaluation de
		// l'élève. Lu en BASE, jamais dans l'instance envoyée par le client.
		// Décisions de David (2026-09-28) : trace `student_self` à chaque
		// utilisation, fiche FSRS au plus une fois par jour, hors score, sans XP,
		// jamais ajoutée à un paquet.
		// Illisible après 3 tentatives → 503 AVANT toute écriture (R2) : une panne
		// passagère coûte une session, jamais un score faux.
		let courseCardIds: Set<string>;
		try {
			// Droits du SERVEUR : la RLS cache à l'élève une carte repassée en brouillon
			// pendant sa série — elle serait comptée comme une question (décision de
			// David, 2026-09-28). Seuls id et options sont lus.
			courseCardIds = await fetchCourseCardTemplateIds(createServiceRoleClient(), templateIds);
		} catch (lookupError) {
			if (!(lookupError instanceof CourseCardLookupError)) throw lookupError;
			return json(
				{ error: 'Enregistrement momentanément impossible, réessaie dans un instant.' },
				{ status: 503 }
			);
		}
		const isCardAnswer = (answer: { instance: { templateId?: string | null } }) =>
			!!answer.instance.templateId && courseCardIds.has(answer.instance.templateId);

		// Score : recalculé côté serveur hors cartes dès qu'il y en a ; sinon celui
		// du client, inchangé.
		const sessionScore =
			courseCardIds.size > 0
				? computeTestScore(result.answers, isCardAnswer)
				: { score: result.score, gradedQuestions: result.totalQuestions };

		// Insert test session
		const { data: testSession, error: sessionError } = await supabase
			.from('test_sessions')
			.insert({
				user_id: user.id,
				mode: result.mode,
				categories: categories,
				score: sessionScore.score,
				total_questions: sessionScore.gradedQuestions,
				time_spent: result.timeSpent,
				time_limit: null, // Will be set from categories if needed
				completed_at: result.completedAt,
				evaluation_id: null
			})
			.select('id')
			.single();

		if (sessionError || !testSession) {
			console.error('Error inserting test session:', sessionError);
			return json({ error: 'Failed to save test session' }, { status: 500 });
		}

		// Insert test answers
		const answersToInsert = result.answers.map((answer) => ({
			test_session_id: testSession.id,
			template_id: answer.instance.templateId || null,
			question_instance: toJson(answer.instance),
			user_answer: answer.userAnswer || null,
			is_correct: answer.isCorrect,
			time_spent: answer.timeSpent || null,
			attempts: answer.attempts || 1
		}));

		// `.select()` : vérifie que toutes les lignes ont été écrites
		const { data: answersRows, error: answersError } = await supabase
			.from('test_answers')
			.insert(answersToInsert)
			.select('id');

		if (answersError) {
			console.error('Error inserting test answers:', answersError);
			// Note: session is already saved, so we return success but log the error
		} else if ((answersRows?.length ?? 0) !== answersToInsert.length) {
			console.error('[tests/save] test_answers : lignes écrites ≠ lignes envoyées', {
				sent: answersToInsert.length,
				written: answersRows?.length ?? 0
			});
		}

		// ----- Alimentation du référentiel (régime contenus) --------------------
		// Une ligne par réponse portant un template ; FSRS avant la trace ;
		// auto-évaluation (flash, carte de cours) = meilleur résultat du jour
		// (ADR 0016). Chemin partagé avec l'envoi d'une évaluation (Q39).
		// Non bloquant : la session est déjà enregistrée.
		await recordSeriesReviews(
			supabase,
			user.id,
			reponsesAvecTemplate.map((answer) => {
				const templateId = answer.instance.templateId as string;
				return {
					templateId,
					success: answer.isCorrect,
					selfAssessed: isFlash || courseCardIds.has(templateId)
				};
			}),
			{ neverInDeck: courseCardIds, logLabel: '[tests/save]' }
		);

		// Award buddy XP for each answer
		let buddyXp = null;
		// Séance flash : auto-évaluée de bout en bout, donc sans XP (comme une carte)
		if (!isFlash) {
			try {
				// Pas d'XP pour une carte de cours (décision 2026-09-28)
				const answers = result.answers
					.filter((answer) => !isCardAnswer(answer))
					.map((answer: { isCorrect: boolean; instance: { templateId?: string | null } }) => ({
						isCorrect: answer.isCorrect,
						theme: undefined as string | undefined // TODO: extract theme from categories if available
					}));
				buddyXp = await addBuddyXpFromTest(supabase, user.id, answers);
			} catch (buddyError) {
				// Non-critical: buddy XP failure should not fail the test save
				console.error('⚠️ [API] Error awarding buddy XP:', buddyError);
			}
		}

		return json({ sessionId: testSession.id, buddy_xp: buddyXp }, { status: 201 });
	} catch (error) {
		console.error('Error saving test results:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
