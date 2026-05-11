/**
 * Student Work Inbox — Page Server Loader
 * ========================================
 *
 * Loads the unified work inbox for the logged-in student. The inbox aggregates
 * all four assignment sources (assessments, exercises a l'unite, worksheets,
 * python) and pre-buckets the result into the five sections rendered by the
 * page (see `src/lib/server/student-inbox.ts`).
 *
 * Single-purpose loader: no query params, no filtering. The aggregator is the
 * single source of truth for what surfaces here.
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { getStudentWorkInbox } from '$lib/server/student-inbox';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await requireRole(locals, 'student');
	const inbox = await getStudentWorkInbox(locals.supabase, user.id);
	return { inbox };
};
