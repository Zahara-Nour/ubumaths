/**
 * Teacher VIP Card Global Config API
 * ===================================
 *
 * Endpoint:
 * - GET: Get active global config (read-only)
 *
 * Security: Teacher or Admin
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { VipCardConfig } from '$lib/types/vip-card-admin';
import { configToResponse } from '$lib/types/vip-card-admin';

/**
 * GET /api/teacher/vip-cards/global-config
 *
 * Get the currently active VIP card probability config
 *
 * This is read-only - only admins can change the active config
 *
 * Response: 200 with active config
 *
 * Errors:
 *   - 401: Not authenticated
 *   - 403: Not teacher or admin
 *   - 404: No active config found
 *   - 500: Server error
 */
export const GET: RequestHandler = async ({ locals }) => {
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Authentication required');
	}

	// 2. Authorization check (teacher or admin)
	if (locals.profile.role !== 'teacher' && locals.profile.role !== 'admin') {
		throw error(403, 'Teacher or admin access required');
	}

	const supabase = locals.supabase;

	try {
		// 3. Fetch active config
		const { data: activeConfig, error: fetchError } = await supabase
			.from('vip_card_config')
			.select('*')
			.eq('is_active', true)
			.maybeSingle();

		if (fetchError) {
			console.error('Error fetching active config:', fetchError);
			throw error(500, 'Failed to fetch active config');
		}

		if (!activeConfig) {
			throw error(404, 'No active VIP card config found. Contact admin.');
		}

		// 4. Return active config (convert snake_case to camelCase)
		return json(configToResponse(activeConfig as VipCardConfig));
	} catch (err) {
		console.error('Error in GET /api/teacher/vip-cards/global-config:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Internal server error');
	}
};
