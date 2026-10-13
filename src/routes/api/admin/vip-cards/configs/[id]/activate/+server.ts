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
import { requireAdmin } from '$lib/server/middleware/auth';
import type { VipCardConfig } from '$lib/types/vip-card-admin';
import { configToResponse } from '$lib/types/vip-card-admin';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/admin/vip-cards/configs/[id]/activate/+server');

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
	// ✅ SECURITY: admin elevation OR real admin login. Privileged ops run via the
	// returned admin-context client so RLS + audit attribute them to the admin.
	const { supabase } = await requireAdmin(locals);
	const configId = parseInt(params.id, 10);

	if (isNaN(configId)) {
		throw error(400, 'Identifiant de configuration invalide');
	}

	try {
		// 3. Check if config exists
		const { data: targetConfig, error: checkError } = await supabase
			.from('vip_card_config')
			.select('id, config_name')
			.eq('id', configId)
			.maybeSingle();

		if (checkError) {
			logger.error('Error checking config existence:', checkError);
			throw error(500, 'Impossible de vérifier la configuration');
		}

		if (!targetConfig) {
			throw error(404, 'Configuration introuvable');
		}

		// 4. Deactivate all configs
		const { error: deactivateError } = await supabase
			.from('vip_card_config')
			.update({ is_active: false })
			.neq('id', configId);

		if (deactivateError) {
			logger.error('Error deactivating configs:', deactivateError);
			throw error(500, 'Impossible de désactiver les autres configurations');
		}

		// 5. Activate target config
		const { data: activated, error: activateError } = await supabase
			.from('vip_card_config')
			.update({ is_active: true })
			.eq('id', configId)
			.select()
			.single();

		if (activateError) {
			logger.error('Error activating config:', activateError);
			throw error(500, 'Impossible d’activer la configuration');
		}

		// 6. Return activated config (convert snake_case to camelCase)
		return json(configToResponse(activated as VipCardConfig));
	} catch (err) {
		logger.error('Error in PATCH /api/admin/vip-cards/configs/[id]/activate:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Une erreur inattendue s’est produite');
	}
};
