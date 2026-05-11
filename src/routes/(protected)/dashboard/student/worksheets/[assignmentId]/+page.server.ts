/**
 * Student Worksheet Detail Page Server
 *
 * Loads a specific worksheet assignment with all resolved exercises.
 * Redirects to the worksheets list on error (404 or access denied).
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { redirect } from '@sveltejs/kit';
import { z } from 'zod';

// Validation schema for the assignment ID param
const assignmentIdSchema = z.string().uuid();

/**
 * Local type for the slice of `worksheet_instances` we read here.
 * `submitted_at` is in the DB (migration 20250123000000_worksheets.sql) but
 * missing from the generated `database.ts`. Same workaround as
 * `src/lib/server/student-inbox.ts` and `mark-done/+server.ts`.
 */
interface InstanceSubmittedRow {
	submitted_at: string | null;
}

export const load: PageServerLoad = async ({ locals, params, fetch }) => {
	// Only students can view worksheets
	const { user } = await requireRole(locals, 'student');

	// Validate assignment ID
	const validation = assignmentIdSchema.safeParse(params.assignmentId);
	if (!validation.success) {
		throw redirect(303, '/dashboard/student/worksheets');
	}

	const assignmentId = validation.data;

	// Fetch worksheet detail via internal API
	const response = await fetch(`/api/student/worksheets/${assignmentId}`);

	if (!response.ok) {
		// Redirect to list on any error (404, access denied, etc.)
		console.error(
			`[Student Worksheet Detail] API error: ${response.status} for assignment ${assignmentId}`
		);
		throw redirect(303, '/dashboard/student/worksheets');
	}

	const worksheet = await response.json();

	// Fetch `submitted_at` for this (worksheet, student) pair so we can show
	// the current state of the "J'ai fait" toggle. Done here (not in the API)
	// to avoid touching the API response schema; the API focuses on rendering.
	let submittedAt: string | null = null;
	if (worksheet?.worksheet_id) {
		const { data: instance } = await locals.supabase
			.from('worksheet_instances')
			.select('submitted_at')
			.eq('worksheet_id', worksheet.worksheet_id)
			.eq('student_id', user.id)
			.maybeSingle();

		const typed = instance as unknown as InstanceSubmittedRow | null;
		submittedAt = typed?.submitted_at ?? null;
	}

	return {
		worksheet,
		submittedAt
	};
};
