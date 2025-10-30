import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { TestResult } from '$lib/types/test';
import type { CartItem } from '$lib/stores/questionCart.svelte';

/**
 * API route to save test results to database
 * POST /api/tests/save
 *
 * Body: TestResult + categories
 * Returns: { sessionId: string }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const supabase = locals.supabase;
	const session = await locals.getSession();

	// Check authentication
	if (!session?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Parse request body
		const body = await request.json();
		const result: TestResult = body.result;
		const categories: CartItem[] = body.categories;
		const assignmentId: string | undefined = body.assignmentId;

		// Validate input
		if (!result || !categories) {
			return json({ error: 'Invalid request body' }, { status: 400 });
		}

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

		return json({ sessionId: testSession.id }, { status: 201 });
	} catch (error) {
		console.error('Error saving test results:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
