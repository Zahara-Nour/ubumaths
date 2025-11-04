/**
 * Admin VIP Card Config Activation API
 * =====================================
 *
 * Endpoint:
 * - PATCH: Activate a config (deactivates all others)
 *
 * Security: Admin only
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { VipCardConfig } from '$lib/types/vip-card-admin';
import { configToResponse } from '$lib/types/vip-card-admin';

/**
 * PATCH /api/admin/vip-cards/configs/[id]/activate
 *
 * Activate a VIP card config (deactivates all others)
 *
 * This is an atomic operation - either all configs are deactivated
 * and the target is activated, or the operation fails entirely.
 *
 * Response: 200 with activated config
 *
 * Errors:
 *   - 400: Invalid config ID
 *   - 401: Not authenticated
 *   - 403: Not admin
 *   - 404: Config not found
 *   - 500: Server error
 */
export const PATCH: RequestHandler = async ({ locals, params }) => {
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Authentication required');
	}

	// 2. Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	const supabase = locals.supabase;
	const configId = parseInt(params.id, 10);

	if (isNaN(configId)) {
		throw error(400, 'Invalid config ID');
	}

	try {
		// 3. Check if config exists
		const { data: targetConfig, error: checkError } = await supabase
			.from('vip_card_config')
			.select('id, config_name')
			.eq('id', configId)
			.maybeSingle();

		if (checkError) {
			console.error('Error checking config existence:', checkError);
			throw error(500, 'Failed to check config existence');
		}

		if (!targetConfig) {
			throw error(404, `Config with ID ${configId} not found`);
		}

		// 4. Deactivate all configs
		const { error: deactivateError } = await supabase
			.from('vip_card_config')
			.update({ is_active: false })
			.neq('id', configId);

		if (deactivateError) {
			console.error('Error deactivating configs:', deactivateError);
			throw error(500, 'Failed to deactivate existing configs');
		}

		// 5. Activate target config
		const { data: activated, error: activateError } = await supabase
			.from('vip_card_config')
			.update({ is_active: true })
			.eq('id', configId)
			.select()
			.single();

		if (activateError) {
			console.error('Error activating config:', activateError);
			throw error(500, 'Failed to activate config');
		}

		// 6. Return activated config (convert snake_case to camelCase)
		return json(configToResponse(activated as VipCardConfig));
	} catch (err) {
		console.error('Error in PATCH /api/admin/vip-cards/configs/[id]/activate:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Internal server error');
	}
};
