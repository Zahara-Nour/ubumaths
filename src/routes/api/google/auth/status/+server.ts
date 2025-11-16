/**
 * Google Integration Status Endpoint
 * ===================================
 *
 * Endpoint: GET /api/google/auth/status
 * Purpose: Check if teacher has connected Google Classroom account
 *
 * Flow:
 * 1. Verify user is a teacher
 * 2. Query database for google_integrations record
 * 3. Return connection status and metadata
 *
 * Security:
 * - Teacher role required
 * - Only returns current user's status
 * - No sensitive token data in response
 *
 * Response:
 * {
 *   connected: boolean,        // Is Google Classroom connected?
 *   googleEmail: string | null, // Connected Google email
 *   lastSync: string | null,    // ISO timestamp of last sync
 *   connectedAt: string | null  // ISO timestamp when connected
 * }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * Check Google Classroom connection status
 *
 * Security: Teacher role required
 *
 * Returns connection metadata (no sensitive data)
 */
export const GET: RequestHandler = async ({ locals }) => {
	// Only teachers can check status
	const { user } = await requireRole(locals, 'teacher');

	// Query database for integration
	const { data: integration, error: fetchError } = await locals.supabase
		.from('google_integrations')
		.select('google_email, last_sync_at, created_at')
		.eq('teacher_id', user.id)
		.single();

	// If error or no data, not connected
	if (fetchError || !integration) {
		return json({
			connected: false,
			googleEmail: null,
			lastSync: null,
			connectedAt: null
		});
	}

	// Return connection status and metadata
	return json({
		connected: true,
		googleEmail: integration.google_email || null,
		lastSync: integration.last_sync_at || null,
		connectedAt: integration.created_at || null
	});
};
