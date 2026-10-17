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
import { createServerLogger } from '$lib/utils/logger';
import { loadTextSize } from '$lib/server/worksheets/print-settings';

const logger = createServerLogger(
	'(protected)/dashboard/student/worksheets/[assignmentId]/+page.server'
);

// Validation schema for the assignment ID param
const assignmentIdSchema = z.string().uuid();

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
		logger.error(
			`[Student Worksheet Detail] API error: ${response.status} for assignment ${assignmentId}`
		);
		throw redirect(303, '/dashboard/student/worksheets');
	}

	const worksheet = await response.json();

	return {
		worksheet,
		// Taille du texte de ses PDF (accessibilité) ; normale par défaut
		textSize: await loadTextSize(locals.supabase, user.id)
	};
};
