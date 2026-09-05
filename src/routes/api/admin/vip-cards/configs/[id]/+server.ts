/**
 * Admin VIP Card Config by ID API
 * ================================
 *
 * Endpoints:
 * - PATCH: Update existing config
 * - DELETE: Delete config (only if not active)
 *
 * Security: Admin only
 */

import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/middleware/auth';
import { assertTypedConfirmation } from '$lib/server/confirmAction';
import { updateConfigSchema } from '$lib/server/validation/vip-card-admin';
import type { VipCardConfig } from '$lib/types/vip-card-admin';
import { configToResponse } from '$lib/types/vip-card-admin';
import type { TablesUpdate } from '$lib/types/database';

/**
 * Body for the typed-confirmation DELETE: the admin must echo the config name.
 */
const deleteConfirmSchema = z.object({ confirm: z.string() });

/**
 * PATCH /api/admin/vip-cards/configs/[id]
 *
 * Update an existing VIP card config (partial update)
 *
 * Request body: Partial<CreateConfigRequest>
 *
 * Note: If updating probabilities, all four must be provided and sum to 100%
 *
 * Response: 200 with updated config
 *
 * Errors:
 *   - 400: Validation error or no fields provided
 *   - 401: Not authenticated
 *   - 403: Not admin
 *   - 404: Config not found
 *   - 500: Server error
 */
export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	// ✅ SECURITY: admin elevation OR real admin login. Privileged ops run via the
	// returned admin-context client so RLS + audit attribute them to the admin.
	const { supabase } = await requireAdmin(locals);
	const configId = parseInt(params.id, 10);

	if (isNaN(configId)) {
		throw error(400, 'Invalid config ID');
	}

	try {
		// 3. Input validation
		const body = await request.json();
		const validation = updateConfigSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const data = validation.data;

		// 4. Check if config exists
		const { data: existing, error: checkError } = await supabase
			.from('vip_card_config')
			.select('id')
			.eq('id', configId)
			.maybeSingle();

		if (checkError) {
			console.error('Error checking config existence:', checkError);
			throw error(500, 'Failed to check config existence');
		}

		if (!existing) {
			throw error(404, `Config with ID ${configId} not found`);
		}

		// 5. Build update object (convert camelCase to snake_case)
		const updateData: TablesUpdate<'vip_card_config'> = {};

		if (data.configName !== undefined) updateData.config_name = data.configName;
		if (data.commonProbability !== undefined)
			updateData.common_probability = data.commonProbability;
		if (data.rareProbability !== undefined) updateData.rare_probability = data.rareProbability;
		if (data.epicProbability !== undefined) updateData.epic_probability = data.epicProbability;
		if (data.legendaryProbability !== undefined)
			updateData.legendary_probability = data.legendaryProbability;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.validFrom !== undefined) updateData.valid_from = data.validFrom;
		if (data.validUntil !== undefined) updateData.valid_until = data.validUntil;

		// 6. Update config
		const { data: updated, error: updateError } = await supabase
			.from('vip_card_config')
			.update(updateData)
			.eq('id', configId)
			.select()
			.single();

		if (updateError) {
			console.error('Error updating config:', updateError);
			throw error(500, 'Failed to update config');
		}

		// 7. Return updated config (convert snake_case to camelCase)
		return json(configToResponse(updated as VipCardConfig));
	} catch (err) {
		console.error('Error in PATCH /api/admin/vip-cards/configs/[id]:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Internal server error');
	}
};

/**
 * DELETE /api/admin/vip-cards/configs/[id]
 *
 * Delete a VIP card config
 *
 * Note: Cannot delete active config (must deactivate first)
 *
 * Response: 200 with success message
 *
 * Errors:
 *   - 400: Config is active
 *   - 401: Not authenticated
 *   - 403: Not admin
 *   - 404: Config not found
 *   - 500: Server error
 */
export const DELETE: RequestHandler = async ({ request, locals, params }) => {
	// ✅ SECURITY: admin elevation OR real admin login.
	const { supabase } = await requireAdmin(locals);
	const configId = parseInt(params.id, 10);

	if (isNaN(configId)) {
		throw error(400, 'Invalid config ID');
	}

	// Typed-confirmation gate: parse the body defensively (a missing/invalid
	// body fails the schema → 400) and require the echoed config name below.
	let confirmBody: unknown;
	try {
		confirmBody = await request.json();
	} catch {
		confirmBody = null;
	}
	const confirmParsed = deleteConfirmSchema.safeParse(confirmBody);
	if (!confirmParsed.success) {
		throw error(400, confirmParsed.error.issues[0].message);
	}

	try {
		// 3. Check if config exists and is not active
		const { data: existing, error: checkError } = await supabase
			.from('vip_card_config')
			.select('id, is_active, config_name')
			.eq('id', configId)
			.maybeSingle();

		if (checkError) {
			console.error('Error checking config existence:', checkError);
			throw error(500, 'Failed to check config existence');
		}

		if (!existing) {
			throw error(404, `Config with ID ${configId} not found`);
		}

		if (existing.is_active) {
			throw error(400, 'Cannot delete active config. Deactivate it first.');
		}

		// ✅ SECURITY: require the admin to have typed the exact config name.
		assertTypedConfirmation(confirmParsed.data.confirm, existing.config_name);

		// 4. Delete config
		const { error: deleteError } = await supabase
			.from('vip_card_config')
			.delete()
			.eq('id', configId);

		if (deleteError) {
			console.error('Error deleting config:', deleteError);
			throw error(500, 'Failed to delete config');
		}

		// 5. Return success
		return json({
			success: true,
			message: `Config "${existing.config_name}" deleted successfully`
		});
	} catch (err) {
		console.error('Error in DELETE /api/admin/vip-cards/configs/[id]:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Internal server error');
	}
};
