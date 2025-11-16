import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * GET /api/google/topics
 * Returns all unique Google Classroom topics across teacher's courses
 */
export const GET: RequestHandler = async ({ locals }) => {
	const _session = await requireRole(locals, 'teacher');

	try {
		// RLS policies automatically filter topics to only those from teacher's courses
		const { data: topics, error: topicsError } = await locals.supabase
			.from('google_classroom_topics')
			.select('id, name, google_topic_id')
			.order('name', { ascending: true });

		if (topicsError) {
			console.error('[API] Error fetching topics:', topicsError);
			throw error(500, 'Failed to fetch topics');
		}

		// Remove duplicates by database ID (not by name)
		// Topics are course-specific, so multiple courses can have topics with the same name
		// (e.g., "Homework" in Math 101 vs "Homework" in Physics 201)
		// We deduplicate by id because the same topic might appear multiple times in the query result
		// due to RLS policy joins, but each unique topic in the database should only appear once
		const uniqueTopics =
			topics?.reduce((acc: Array<{ id: string; name: string; google_topic_id: string }>, topic) => {
				if (!acc.find((t) => t.id === topic.id)) {
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
