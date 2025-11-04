/**
 * Admin VIP Card Configs API
 * ===========================
 *
 * Endpoints:
 * - POST: Create new config (starts inactive)
 * - GET: List all configs
 *
 * Security: Admin only
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createConfigSchema } from '$lib/server/validation/vip-card-admin';
import type { VipCardConfig } from '$lib/types/vip-card-admin';
import { configToResponse } from '$lib/types/vip-card-admin';

/**
 * POST /api/admin/vip-cards/configs
 *
 * Create a new VIP card probability config
 *
 * Request body:
 *   - configName: string (1-100 chars)
 *   - commonProbability: number (0-100)
 *   - rareProbability: number (0-100)
 *   - epicProbability: number (0-100)
 *   - legendaryProbability: number (0-100)
 *   - description?: string (optional, max 500 chars)
 *   - validFrom?: string (optional, ISO 8601 datetime)
 *   - validUntil?: string (optional, ISO 8601 datetime)
 *
 * Note: Probabilities must sum to exactly 100%
 * Note: New configs start with is_active = false
 *
 * Response: 201 with created config
 *
 * Errors:
 *   - 400: Validation error (probabilities don't sum to 100, etc.)
 *   - 401: Not authenticated
 *   - 403: Not admin
 *   - 500: Server error
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. Authentication check
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	// 2. Authorization check (admin only)
	if (locals.user.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	const supabase = locals.supabase;

	try {
		// 3. Input validation
		const body = await request.json();
		const validation = createConfigSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const data = validation.data;

		// 4. Insert config (convert camelCase to snake_case)
		const { data: created, error: insertError } = await supabase
			.from('vip_card_config')
			.insert({
				config_name: data.configName,
				common_probability: data.commonProbability,
				rare_probability: data.rareProbability,
				epic_probability: data.epicProbability,
				legendary_probability: data.legendaryProbability,
				description: data.description || null,
				valid_from: data.validFrom || null,
				valid_until: data.validUntil || null,
				is_active: false // New configs start inactive
			})
			.select()
			.single();

		if (insertError) {
			console.error('Error creating config:', insertError);
			throw error(500, 'Failed to create config');
		}

		// 5. Return created config (convert snake_case to camelCase)
		return json(configToResponse(created as VipCardConfig), { status: 201 });
	} catch (err) {
		console.error('Error in POST /api/admin/vip-cards/configs:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Internal server error');
	}
};

/**
 * GET /api/admin/vip-cards/configs
 *
 * List all VIP card configs
 *
 * Response: 200 with array of configs (ordered by is_active DESC, created_at DESC)
 *
 * Errors:
 *   - 401: Not authenticated
 *   - 403: Not admin
 *   - 500: Server error
 */
export const GET: RequestHandler = async ({ locals }) => {
	// 1. Authentication check
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	// 2. Authorization check (admin only)
	if (locals.user.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	const supabase = locals.supabase;

	try {
		// 3. Fetch all configs (active first, then by creation date)
		const { data: configs, error: fetchError } = await supabase
			.from('vip_card_config')
			.select('*')
			.order('is_active', { ascending: false })
			.order('created_at', { ascending: false });

		if (fetchError) {
			console.error('Error fetching configs:', fetchError);
			throw error(500, 'Failed to fetch configs');
		}

		// 4. Convert to camelCase and return
		const response = (configs as VipCardConfig[]).map(configToResponse);

		return json(response);
	} catch (err) {
		console.error('Error in GET /api/admin/vip-cards/configs:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Internal server error');
	}
};
