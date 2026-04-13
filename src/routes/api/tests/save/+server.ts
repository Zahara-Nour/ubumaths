import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSaveTest } from '$lib/server/validation/tests';
import { addBuddyXpFromTest } from '$lib/server/buddy-xp-service';

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

		// Award buddy XP for each answer
		let buddyXp = null;
		try {
			const answers = result.answers.map(
				(answer: { isCorrect: boolean; instance: { templateId?: string } }) => ({
					isCorrect: answer.isCorrect,
					theme: undefined // TODO: extract theme from categories if available
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
