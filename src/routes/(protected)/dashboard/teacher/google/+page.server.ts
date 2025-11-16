/**
 * Google Classroom Courses Page - Server Load
 * ============================================
 *
 * SSR hydration for Google Classroom courses page.
 * Loads initial course data on server-side for faster first page load.
 *
 * PATTERN: SSR Hydration Strategy
 * - Load data server-side for instant first render
 * - Client can refresh/update data as needed
 * - Graceful error handling (return empty data on error)
 *
 * SECURITY:
 * - Requires teacher role
 * - Uses internal fetch (server-to-server)
 *
 * PERFORMANCE:
 * - Faster first load compared to client-side only
 * - No loading spinners on initial page render
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';

interface Course {
	id: string;
	googleCourseId: string;
	name: string;
	section: string | null;
	description: string | null;
	room: string | null;
	courseState: string;
	alternateLink: string;
	creationTime: string;
	updateTime: string;
}

export const load: PageServerLoad = async ({ locals, fetch }) => {
	// Verify teacher role
	await requireRole(locals, 'teacher');

	try {
		// Fetch courses for SSR hydration
		const response = await fetch('/api/google/courses');

		if (!response.ok) {
			console.error('[Google Courses SSR] Failed to fetch courses:', response.status);
			return { courses: [] as Course[] };
		}

		const data = await response.json();
		return { courses: data.courses as Course[] };
	} catch (error) {
		console.error('[Google Courses SSR] Error fetching courses:', error);
		return { courses: [] as Course[] };
	}
};
