/**
 * API Endpoint: Remove Multiple Warnings
 * ========================================
 *
 * Bulk remove warnings from a student's record.
 *
 * POST /api/warnings/remove-multiple
 *
 * Request body:
 *   - studentId (string, UUID): Student's profile ID
 *   - warningIds (string[], UUIDs): Array of warning IDs to remove (1-10)
 *
 * Response:
 *   - 200: { removed: number, warningIds: string[] }
 *   - 400: Validation error
 *   - 401: Not authenticated
 *   - 403: Unauthorized (not teacher/admin or student not in class)
 *   - 404: Warning not found
 *   - 500: Server error
 *
 * SECURITY:
 * - Requires authentication (teacher/admin)
 * - Teacher must teach the student (class_members check)
 * - All input validated with Zod schema
 * - Uses existing removeWarning() function for each warning
 *
 * IMPORTANT: This endpoint does NOT mark the VIP card as used.
 * The caller must call /api/vip-cards/use-card after successful removal.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { removeWarningsSchema } from '$lib/server/validation/remove-warnings';
import { removeWarning } from '$lib/server/warnings';

// ============================================================================
// POST HANDLER
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication (teacher/admin)
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	// Verify user is teacher or admin
	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Only teachers can remove student warnings');
	}

	// Parse and validate request body
	const body = await request.json();
	const validation = removeWarningsSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { studentId, warningIds } = validation.data;

	// Verify that teacher teaches this student
	const { data: classCheck } = await supabase
		.from('class_members')
		.select(
			`
			class_id,
			classes!inner(teacher_id)
		`
		)
		.eq('student_id', studentId);

	const teachesStudent = classCheck?.some((cm) => {
		const classes = cm.classes as unknown;
		if (classes && typeof classes === 'object' && 'teacher_id' in classes) {
			return (classes as { teacher_id: string }).teacher_id === user.id;
		}
		return false;
	});

	if (!teachesStudent) {
		throw error(403, 'You can only remove warnings for students in your classes');
	}

	// Fetch warnings to verify they belong to the student
	const { data: warnings, error: fetchError } = await supabase
		.from('student_warnings')
		.select('id, student_id')
		.in('id', warningIds);

	if (fetchError) {
		console.error('[remove-multiple] Error fetching warnings:', fetchError);
		throw error(500, `Failed to fetch warnings: ${fetchError.message}`);
	}

	if (!warnings || warnings.length === 0) {
		throw error(404, 'No warnings found with the provided IDs');
	}

	// Verify all warnings belong to the specified student
	const invalidWarnings = warnings.filter((w) => w.student_id !== studentId);
	if (invalidWarnings.length > 0) {
		throw error(
			400,
			`Warning(s) do not belong to student: ${invalidWarnings.map((w) => w.id).join(', ')}`
		);
	}

	// Remove each warning using the existing removeWarning function
	const removedIds: string[] = [];
	const errors: Array<{ warningId: string; error: string }> = [];

	for (const warning of warnings) {
		try {
			await removeWarning({
				warningId: warning.id,
				teacherId: user.id,
				supabase
			});
			removedIds.push(warning.id);
		} catch (err) {
			console.error(`[remove-multiple] Error removing warning ${warning.id}:`, err);
			errors.push({
				warningId: warning.id,
				error: err instanceof Error ? err.message : 'Unknown error'
			});
		}
	}

	// If all removals failed, return error
	if (removedIds.length === 0) {
		throw error(500, `Failed to remove any warnings: ${errors.map((e) => e.error).join(', ')}`);
	}

	// If some removals failed, return partial success with warnings
	if (errors.length > 0) {
		return json({
			removed: removedIds.length,
			warningIds: removedIds,
			partialSuccess: true,
			errors
		});
	}

	// All removals succeeded
	return json({
		removed: removedIds.length,
		warningIds: removedIds
	});
};
