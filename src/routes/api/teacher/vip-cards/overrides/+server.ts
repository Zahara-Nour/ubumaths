/**
 * Teacher VIP Card Overrides API
 * ===============================
 *
 * Endpoints:
 * - GET: Get teacher's overrides + all templates
 * - PUT: Bulk update overrides (UPSERT)
 *
 * Security: Teacher or Admin
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateOverridesSchema } from '$lib/server/validation/vip-card-admin';
import type {
	VipCardTemplate,
	TeacherVipCardOverride,
	TeacherOverridesResponse,
	TemplateResponse
} from '$lib/types/vip-card-admin';
import { templateToResponse } from '$lib/types/vip-card-admin';

/**
 * GET /api/teacher/vip-cards/overrides
 *
 * Get teacher's VIP card overrides + all available templates
 *
 * Response: 200 with { overrides, templates }
 *
 * overrides: Array of { cardId, cardName, isEnabled }
 * templates: Array of all VipCardTemplate records
 *
 * Errors:
 *   - 401: Not authenticated
 *   - 403: Not teacher or admin
 *   - 500: Server error
 */
export const GET: RequestHandler = async ({ locals }) => {
	// 1. Authentication check
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	// 2. Authorization check (teacher or admin)
	if (locals.user.role !== 'teacher' && locals.user.role !== 'admin') {
		throw error(403, 'Teacher or admin access required');
	}

	const supabase = locals.supabase;
	const teacherId = locals.user.id;

	try {
		// 3. Fetch teacher's overrides
		const { data: overrides, error: overridesError } = await supabase
			.from('teacher_vip_card_overrides')
			.select('card_id, is_enabled')
			.eq('teacher_id', teacherId);

		if (overridesError) {
			console.error('Error fetching overrides:', overridesError);
			throw error(500, 'Failed to fetch overrides');
		}

		// 4. Fetch all templates
		const { data: templates, error: templatesError } = await supabase
			.from('vip_card_templates')
			.select('*')
			.order('sort_order', { ascending: true })
			.order('name', { ascending: true });

		if (templatesError) {
			console.error('Error fetching templates:', templatesError);
			throw error(500, 'Failed to fetch templates');
		}

		// 5. Create override map for quick lookup
		const overrideMap = new Map<string, boolean>();
		(overrides as TeacherVipCardOverride[]).forEach((override) => {
			overrideMap.set(override.card_id, override.is_enabled);
		});

		// 6. Build response with merged data
		const templatesResponse: TemplateResponse[] = (templates as VipCardTemplate[]).map(
			templateToResponse
		);

		const overridesResponse = templatesResponse.map((template) => ({
			cardId: template.id,
			cardName: template.name,
			isEnabled: overrideMap.get(template.id) ?? template.isEnabled // Default to template's isEnabled
		}));

		const response: TeacherOverridesResponse = {
			overrides: overridesResponse,
			templates: templatesResponse
		};

		return json(response);
	} catch (err) {
		console.error('Error in GET /api/teacher/vip-cards/overrides:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Internal server error');
	}
};

/**
 * PUT /api/teacher/vip-cards/overrides
 *
 * Bulk update teacher's VIP card overrides (UPSERT)
 *
 * Request body:
 *   - overrides: Array<{ cardId: string, isEnabled: boolean }> (1-50 items)
 *
 * Response: 200 with updated overrides
 *
 * Errors:
 *   - 400: Validation error
 *   - 401: Not authenticated
 *   - 403: Not teacher or admin
 *   - 500: Server error
 */
export const PUT: RequestHandler = async ({ request, locals }) => {
	// 1. Authentication check
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	// 2. Authorization check (teacher or admin)
	if (locals.user.role !== 'teacher' && locals.user.role !== 'admin') {
		throw error(403, 'Teacher or admin access required');
	}

	const supabase = locals.supabase;
	const teacherId = locals.user.id;

	try {
		// 3. Input validation
		const body = await request.json();
		const validation = updateOverridesSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const data = validation.data;

		// 4. Verify all card IDs exist
		const cardIds = data.overrides.map((o) => o.cardId);
		const { data: existingCards, error: checkError } = await supabase
			.from('vip_card_templates')
			.select('id')
			.in('id', cardIds);

		if (checkError) {
			console.error('Error checking card existence:', checkError);
			throw error(500, 'Failed to verify card IDs');
		}

		const existingCardIds = new Set((existingCards as { id: string }[]).map((c) => c.id));
		const invalidIds = cardIds.filter((id) => !existingCardIds.has(id));

		if (invalidIds.length > 0) {
			throw error(400, `Invalid card IDs: ${invalidIds.join(', ')}`);
		}

		// 5. Upsert overrides (one by one for better error handling)
		const results = [];

		for (const override of data.overrides) {
			const { data: upserted, error: upsertError } = await supabase
				.from('teacher_vip_card_overrides')
				.upsert(
					{
						teacher_id: teacherId,
						card_id: override.cardId,
						is_enabled: override.isEnabled
					},
					{
						onConflict: 'teacher_id,card_id'
					}
				)
				.select()
				.single();

			if (upsertError) {
				console.error('Error upserting override:', upsertError);
				throw error(500, `Failed to update override for card ${override.cardId}`);
			}

			results.push(upserted);
		}

		// 6. Fetch card names for response
		const { data: cards, error: cardsError } = await supabase
			.from('vip_card_templates')
			.select('id, name')
			.in('id', cardIds);

		if (cardsError) {
			console.error('Error fetching card names:', cardsError);
			throw error(500, 'Failed to fetch card names');
		}

		const cardNameMap = new Map<string, string>();
		(cards as { id: string; name: string }[]).forEach((card) => {
			cardNameMap.set(card.id, card.name);
		});

		// 7. Build response
		const overridesResponse = data.overrides.map((override) => ({
			cardId: override.cardId,
			cardName: cardNameMap.get(override.cardId) || override.cardId,
			isEnabled: override.isEnabled
		}));

		return json({
			success: true,
			message: `${overridesResponse.length} override(s) updated successfully`,
			overrides: overridesResponse
		});
	} catch (err) {
		console.error('Error in PUT /api/teacher/vip-cards/overrides:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Internal server error');
	}
};
