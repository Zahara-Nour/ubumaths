/**
 * Admin VIP Card Templates API
 * ============================
 *
 * Endpoints:
 * - POST: Create new card template
 * - GET: List all templates
 *
 * Security: Admin only
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createTemplateSchema } from '$lib/server/validation/vip-card-admin';
import type { VipCardTemplate } from '$lib/types/vip-card-admin';
import { templateToResponse } from '$lib/types/vip-card-admin';

/**
 * POST /api/admin/vip-cards/templates
 *
 * Create a new VIP card template
 *
 * Request body:
 *   - id: string (kebab-case, unique)
 *   - name: string (1-100 chars)
 *   - description: string (1-500 chars)
 *   - rarity: "common" | "rare" | "epic" | "legendary"
 *   - category: "bonus" | "privilege" | "social" | "power"
 *   - isEnabled: boolean
 *   - imagePath: string
 *   - action?: { type, count?, amount? }
 *   - sortOrder?: number (default: 0)
 *
 * Response: 201 with created template
 *
 * Errors:
 *   - 400: Validation error or duplicate ID
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
		const validation = createTemplateSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const data = validation.data;

		// 4. Check for duplicate ID
		const { data: existing, error: checkError } = await supabase
			.from('vip_card_templates')
			.select('id')
			.eq('id', data.id)
			.maybeSingle();

		if (checkError) {
			console.error('Error checking template existence:', checkError);
			throw error(500, 'Failed to check template existence');
		}

		if (existing) {
			throw error(400, `Template with ID "${data.id}" already exists`);
		}

		// 5. Insert template (convert camelCase to snake_case)
		const { data: created, error: insertError } = await supabase
			.from('vip_card_templates')
			.insert({
				id: data.id,
				name: data.name,
				description: data.description,
				rarity: data.rarity,
				category: data.category,
				image_path: data.imagePath,
				is_enabled: data.isEnabled,
				action: data.action || null,
				sort_order: data.sortOrder
			})
			.select()
			.single();

		if (insertError) {
			console.error('Error creating template:', insertError);
			throw error(500, 'Failed to create template');
		}

		// 6. Return created template (convert snake_case to camelCase)
		return json(templateToResponse(created as VipCardTemplate), { status: 201 });
	} catch (err) {
		console.error('Error in POST /api/admin/vip-cards/templates:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Internal server error');
	}
};

/**
 * GET /api/admin/vip-cards/templates
 *
 * List all VIP card templates
 *
 * Response: 200 with array of templates
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
		// 3. Fetch all templates (ordered by sort_order, then name)
		const { data: templates, error: fetchError } = await supabase
			.from('vip_card_templates')
			.select('*')
			.order('sort_order', { ascending: true })
			.order('name', { ascending: true });

		if (fetchError) {
			console.error('Error fetching templates:', fetchError);
			throw error(500, 'Failed to fetch templates');
		}

		// 4. Convert to camelCase and return
		const response = (templates as VipCardTemplate[]).map(templateToResponse);

		return json(response);
	} catch (err) {
		console.error('Error in GET /api/admin/vip-cards/templates:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Internal server error');
	}
};
