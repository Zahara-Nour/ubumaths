import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSaveTest } from '$lib/server/validation/tests';
import { addBuddyXpFromTest } from '$lib/server/buddy-xp-service';
import { FSRS } from '$lib/srs/fsrs';
import { Grade } from '$lib/srs/types';
import { applyFsrsReview } from '$lib/server/srs/fsrs-actions';
import { ensureProgrammeDeckCard } from '$lib/server/srs/programme-deck';

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

		// Insert test session
		const { data: testSession, error: sessionError } = await supabase
			.from('test_sessions')
			.insert({
				user_id: user.id,
				mode: result.mode,
				categories: categories,
				score: result.score,
				total_questions: result.totalQuestions,
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
			question_instance: answer.instance,
			user_answer: answer.userAnswer || null,
			is_correct: answer.isCorrect,
			time_spent: answer.timeSpent || null,
			attempts: answer.attempts || 1
		}));

		const { error: answersError } = await supabase.from('test_answers').insert(answersToInsert);

		if (answersError) {
			console.error('Error inserting test answers:', answersError);
			// Note: session is already saved, so we return success but log the error
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
		const reponsesAvecTemplate = result.answers.filter((answer) => answer.instance.templateId);
		const templateIds = [
			...new Set(reponsesAvecTemplate.map((answer) => answer.instance.templateId as string))
		];

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

		const fsrs = new FSRS();
		const attemptsToInsert: {
			student_id: string;
			template_id: string;
			success: boolean;
			grade: Grade;
			source: 'auto';
			with_help: boolean;
		}[] = [];

		for (const answer of reponsesAvecTemplate) {
			const templateId = answer.instance.templateId as string;
			const grade: Grade = answer.isCorrect ? Grade.GOOD : Grade.AGAIN;

			try {
				await applyFsrsReview(supabase, fsrs, user.id, 'template', templateId, grade);
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
				source: 'auto' as const,
				with_help: false
			});
		}

		if (attemptsToInsert.length > 0) {
			const { error: attemptsError } = await supabase
				.from('skill_attempts')
				.insert(attemptsToInsert);

			if (attemptsError) {
				console.error('[tests/save] skill_attempts INSERT failed:', attemptsError);
			}
		}

		// Auto-ajout au deck Programme, comme la route le fait après l'insertion.
		// Non bloquant : les attempts sont déjà enregistrés.
		for (const templateId of templatesTagues) {
			try {
				await ensureProgrammeDeckCard(supabase, user.id, templateId);
			} catch (progErr) {
				console.error('[tests/save] Programme deck add failed:', progErr);
			}
		}

		// Award buddy XP for each answer
		let buddyXp = null;
		try {
			const answers = result.answers.map(
				(answer: { isCorrect: boolean; instance: { templateId?: string | null } }) => ({
					isCorrect: answer.isCorrect,
					theme: undefined as string | undefined // TODO: extract theme from categories if available
				})
			);
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
