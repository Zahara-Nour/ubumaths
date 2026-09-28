import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSaveTest } from '$lib/server/validation/tests';
import { addBuddyXpFromTest } from '$lib/server/buddy-xp-service';
import { FSRS } from '$lib/srs/fsrs';
import { Grade } from '$lib/srs/types';
import { applyFsrsReview } from '$lib/server/srs/fsrs-actions';
import { ensureProgrammeDeckCard } from '$lib/server/srs/programme-deck';
import {
	CourseCardLookupError,
	fetchCourseCardTemplateIds,
	reviewedToday
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
				assignment_id: assignmentId || null
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
		// Sans ça, répondre à une évaluation ou à un entraînement ne validait AUCUN
		// point de programme : seule la révision SRS alimentait le référentiel.
		//
		// Une ligne par réponse portant un template (le régime contenus est
		// identifié par `template_id` ; le trigger `skill_attempts_after_insert`
		// remonte ensuite aux points via `question_template_points`). Les réponses
		// sans template — questions non migrées — ne produisent rien.
		//
		// Non bloquant : la session est déjà enregistrée, un échec ici ne doit pas
		// faire perdre le résultat du test à l'élève.
		// ⚠️ FSRS AVANT l'insertion, comme `/api/skill-attempts` — et pour la même
		// raison : cette route y écrivait EN DIRECT depuis le 2026-08-29, ce qui
		// contournait le couplage FSRS posé dans la route le 2026-06-10.
		// Conséquence : répondre à une évaluation validait les points de programme
		// mais ne replanifiait AUCUNE carte, et produisait la désynchro
		// `srs_card_stats` ↔ `student_point_state` que le garde-fou de la route
		// existe pour empêcher.
		//
		// L'invariant est tenu PAR RÉPONSE : pas de FSRS, pas d'attempt. Une carte
		// qui échoue n'empêche pas les autres — la session est déjà enregistrée et
		// l'élève ne doit pas perdre son travail pour une réponse.
		// Quels modèles sont tagués à un point de programme ? Une requête pour tout
		// le lot, là où la route en fait une par réponse.
		const templatesTagues = new Set<string>();
		if (templateIds.length > 0) {
			const { data: liens, error: liensError } = await supabase
				.from('question_template_points')
				.select('template_id')
				.in('template_id', templateIds);

			if (liensError) {
				console.error('[tests/save] question_template_points illisible :', liensError);
			} else {
				for (const lien of liens ?? []) templatesTagues.add(lien.template_id);
			}
		}

		const now = new Date();
		const fsrs = new FSRS();
		const attemptsToInsert: {
			student_id: string;
			template_id: string;
			success: boolean;
			grade: Grade;
			source: 'auto' | 'student_self';
			with_help: boolean;
		}[] = [];

		for (const answer of reponsesAvecTemplate) {
			const templateId = answer.instance.templateId as string;
			const grade: Grade = answer.isCorrect ? Grade.GOOD : Grade.AGAIN;

			try {
				if (courseCardIds.has(templateId)) {
					// Carte : « Je savais » = Good, « Je ne savais pas » = Again. La fiche
					// (clé template_id, partagée avec tout paquet qui l'ajouterait plus
					// tard) n'est mise à jour qu'une fois par jour ; la trace, toujours.
					await applyFsrsReview(supabase, fsrs, user.id, 'template', templateId, grade, undefined, {
						skipIf: (stats) => reviewedToday(stats.lastReview, now),
						verifyWrite: true
					});
				} else {
					await applyFsrsReview(supabase, fsrs, user.id, 'template', templateId, grade);
				}
			} catch (fsrsErr) {
				console.error('[tests/save] FSRS update failed, attempt non inséré :', {
					userId: user.id,
					templateId,
					grade,
					err: fsrsErr
				});
				continue;
			}

			attemptsToInsert.push({
				student_id: user.id,
				template_id: templateId,
				success: answer.isCorrect,
				// `grade` manquait aussi : la route l'enregistre, cette insertion non.
				grade,
				source: courseCardIds.has(templateId) ? 'student_self' : 'auto',
				with_help: false
			});
		}

		if (attemptsToInsert.length > 0) {
			// `.select()` : vérifie que toutes les lignes ont été écrites
			const { data: attemptsRows, error: attemptsError } = await supabase
				.from('skill_attempts')
				.insert(attemptsToInsert)
				.select('id');

			if (attemptsError) {
				console.error('[tests/save] skill_attempts INSERT failed:', attemptsError);
			} else if ((attemptsRows?.length ?? 0) !== attemptsToInsert.length) {
				console.error('[tests/save] skill_attempts : lignes écrites ≠ lignes envoyées', {
					sent: attemptsToInsert.length,
					written: attemptsRows?.length ?? 0
				});
			}
		}

		// Auto-ajout au deck Programme, comme la route le fait après l'insertion.
		// Non bloquant : les attempts sont déjà enregistrés.
		// Une carte de cours n'est JAMAIS ajoutée à un paquet (décision 2026-09-28).
		for (const templateId of templatesTagues) {
			if (courseCardIds.has(templateId)) continue;
			try {
				await ensureProgrammeDeckCard(supabase, user.id, templateId);
			} catch (progErr) {
				console.error('[tests/save] Programme deck add failed:', progErr);
			}
		}

		// Award buddy XP for each answer
		let buddyXp = null;
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

		return json({ sessionId: testSession.id, buddy_xp: buddyXp }, { status: 201 });
	} catch (error) {
		console.error('Error saving test results:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
