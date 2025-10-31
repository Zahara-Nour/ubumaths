import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSaveTest } from '$lib/server/validation/tests';

/**
 * API route to save test results to database
 * POST /api/tests/save
 *
 * Body: TestResult + categories
 * Returns: { sessionId: string }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const supabase = locals.supabase;
	const { session } = await locals.safeGetSession();

	// Check authentication
	if (!session?.user) {
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
				user_id: session.user.id, // BUGFIX: was user.id (undefined)
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

		return json({ sessionId: testSession.id }, { status: 201 });
	} catch (error) {
		console.error('Error saving test results:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
