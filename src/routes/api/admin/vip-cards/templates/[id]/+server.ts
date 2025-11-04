/**
 * Admin VIP Card Template by ID API
 * ==================================
 *
 * Endpoints:
 * - PATCH: Update existing template
 * - DELETE: Delete template
 *
 * Security: Admin only
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateTemplateSchema } from '$lib/server/validation/vip-card-admin';
import type { VipCardTemplate } from '$lib/types/vip-card-admin';
import { templateToResponse } from '$lib/types/vip-card-admin';

/**
 * PATCH /api/admin/vip-cards/templates/[id]
 *
 * Update an existing VIP card template (partial update)
 *
 * Request body: Partial<CreateTemplateRequest> (at least one field required)
 *
 * Response: 200 with updated template
 *
 * Errors:
 *   - 400: Validation error or no fields provided
 *   - 401: Not authenticated
 *   - 403: Not admin
 *   - 404: Template not found
 *   - 500: Server error
 */
export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Authentication required');
	}

	// 2. Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	const supabase = locals.supabase;
	const templateId = params.id;

	try {
		// 3. Input validation
		const body = await request.json();
		const validation = updateTemplateSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const data = validation.data;

		// 4. Check if template exists
		const { data: existing, error: checkError } = await supabase
			.from('vip_card_templates')
			.select('id')
			.eq('id', templateId)
			.maybeSingle();

		if (checkError) {
			console.error('Error checking template existence:', checkError);
			throw error(500, 'Failed to check template existence');
		}

		if (!existing) {
			throw error(404, `Template with ID "${templateId}" not found`);
		}

		// 5. Build update object (convert camelCase to snake_case)
		const updateData: Record<string, unknown> = {};

		if (data.name !== undefined) updateData.name = data.name;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.rarity !== undefined) updateData.rarity = data.rarity;
		if (data.category !== undefined) updateData.category = data.category;
		if (data.isEnabled !== undefined) updateData.is_enabled = data.isEnabled;
		if (data.imagePath !== undefined) updateData.image_path = data.imagePath;
		if (data.action !== undefined) updateData.action = data.action;
		if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

		// 6. Update template
		const { data: updated, error: updateError } = await supabase
			.from('vip_card_templates')
			.update(updateData)
			.eq('id', templateId)
			.select()
			.single();

		if (updateError) {
			console.error('Error updating template:', updateError);
			throw error(500, 'Failed to update template');
		}

		// 7. Return updated template (convert snake_case to camelCase)
		return json(templateToResponse(updated as VipCardTemplate));
	} catch (err) {
		console.error('Error in PATCH /api/admin/vip-cards/templates/[id]:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Internal server error');
	}
};

/**
 * DELETE /api/admin/vip-cards/templates/[id]
 *
 * Delete a VIP card template
 *
 * Response: 200 with success message
 *
 * Errors:
 *   - 401: Not authenticated
 *   - 403: Not admin
 *   - 404: Template not found
 *   - 409: Cannot delete template with existing instances
 *   - 500: Server error
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Authentication required');
	}

	// 2. Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	const supabase = locals.supabase;
	const templateId = params.id;

	try {
		// 3. Check if template exists
		const { data: existing, error: checkError } = await supabase
			.from('vip_card_templates')
			.select('id')
			.eq('id', templateId)
			.maybeSingle();

		if (checkError) {
			console.error('Error checking template existence:', checkError);
			throw error(500, 'Failed to check template existence');
		}

		if (!existing) {
			throw error(404, `Template with ID "${templateId}" not found`);
		}

		// 4. Check if template has instances (prevent deletion if in use)
		const { count, error: countError } = await supabase
			.from('vip_card_instances')
			.select('id', { count: 'exact', head: true })
			.eq('card_id', templateId);

		if (countError) {
			console.error('Error checking template instances:', countError);
			throw error(500, 'Failed to check template usage');
		}

		if (count && count > 0) {
			throw error(
				409,
				`Cannot delete template with ${count} existing instance(s). Disable it instead.`
			);
		}

		// 5. Delete template (CASCADE will handle teacher_vip_card_overrides)
		const { error: deleteError } = await supabase
			.from('vip_card_templates')
			.delete()
			.eq('id', templateId);

		if (deleteError) {
			console.error('Error deleting template:', deleteError);
			throw error(500, 'Failed to delete template');
		}

		// 6. Return success
		return json({
			success: true,
			message: `Template "${templateId}" deleted successfully`
		});
	} catch (err) {
		console.error('Error in DELETE /api/admin/vip-cards/templates/[id]:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Internal server error');
	}
};
