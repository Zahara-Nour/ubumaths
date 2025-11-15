import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * GET /api/google/topics
 * Returns all unique Google Classroom topics across teacher's courses
 */
export const GET: RequestHandler = async ({ locals }) => {
	const session = await requireRole(locals, 'teacher');

	try {
		const { data: topics, error: topicsError } = await locals.supabase
			.from('google_classroom_topics')
			.select('id, name, google_topic_id')
			.eq('google_classroom_courses.teacher_id', session.user.id)
			.order('name', { ascending: true });

		if (topicsError) {
			console.error('[API] Error fetching topics:', topicsError);
			throw error(500, 'Failed to fetch topics');
		}

		// Remove duplicates by name (topics can exist across multiple courses)
		const uniqueTopics =
			topics?.reduce((acc: Array<{ id: string; name: string; google_topic_id: string }>, topic) => {
				if (!acc.find((t) => t.name === topic.name)) {
					acc.push(topic);
				}
				return acc;
			}, []) || [];

		return json({ topics: uniqueTopics });
	} catch (err) {
		console.error('[API] Error in topics endpoint:', err);
		throw error(500, 'Internal server error');
	}
};
