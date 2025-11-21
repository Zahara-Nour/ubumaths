/**
 * Student Inventory API
 * =====================
 *
 * Endpoints:
 * - GET: List student's inventory items with template details
 *
 * Security:
 * - Students: Can only access their own inventory
 * - Teachers: Can access their students' inventory
 * - Admins: Can access any student's inventory
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { inventoryQuerySchema } from '$lib/validation/shop';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';
import type { ShopItemProperties, ItemAcquisitionData, ItemInstanceData } from '$lib/types/shop';

/**
 * GET /api/inventory
 *
 * Fetch student's inventory items with filtering options
 *
 * Query parameters:
 *   - student_id?: string (UUID) - Required for teachers/admins viewing student inventory
 *   - template_id?: string (UUID) - Filter by specific item template
 *   - category?: 'consumable' | 'booster' | 'cosmetic' | 'utility'
 *   - equipped_only?: boolean - Only return equipped items
 *   - include_expired?: boolean - Include expired items (default: false)
 *
 * Response: {
 *   items: StudentItemWithTemplate[]
 *   total: number
 * }
 *
 * Errors:
 *   - 400: Validation error
 *   - 401: Not authenticated
 *   - 403: Not authorized to view this inventory
 *   - 500: Server error
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// 1. Authentication check
	if (!locals.profile || !locals.user) {
		throw error(401, 'Non authentifie');
	}

	const supabase = locals.supabase;
	const userId = locals.user.id;
	const userRole = locals.profile.role;

	try {
		// 2. Validate query parameters (base inventory query)
		const queryValidation = inventoryQuerySchema.safeParse({
			template_id: url.searchParams.get('template_id') || undefined,
			category: url.searchParams.get('category') || undefined,
			equipped_only: url.searchParams.get('equipped_only') || undefined,
			include_expired: url.searchParams.get('include_expired') || undefined
		});

		if (!queryValidation.success) {
			throw error(400, queryValidation.error.issues[0].message);
		}

		const { template_id, category, equipped_only, include_expired } = queryValidation.data;

		// 3. Determine target student ID
		const studentIdParam = url.searchParams.get('student_id');
		let targetStudentId: string;

		if (userRole === 'student') {
			// Students can only view their own inventory
			if (studentIdParam && studentIdParam !== userId) {
				throw error(403, 'Vous ne pouvez consulter que votre propre inventaire');
			}
			targetStudentId = userId;
		} else if (userRole === 'teacher' || userRole === 'admin') {
			// Teachers/Admins must specify a student_id or view their own (if they have one)
			if (studentIdParam) {
				// Validate student_id format
				const studentIdValidation = z
					.string()
					.uuid("ID de l'eleve invalide")
					.safeParse(studentIdParam);
				if (!studentIdValidation.success) {
					throw error(400, studentIdValidation.error.issues[0].message);
				}
				targetStudentId = studentIdValidation.data;

				// Verify teacher has access to this student
				const hasAccess = await verifyTeacherStudentWithRole(
					userId,
					targetStudentId,
					locals.profile,
					supabase
				);

				if (!hasAccess) {
					throw error(403, "Vous ne pouvez consulter que l'inventaire de vos eleves");
				}
			} else {
				// No student_id provided - teachers/admins need to specify one
				throw error(400, 'Parametre student_id requis pour les enseignants et administrateurs');
			}
		} else {
			throw error(403, 'Role non autorise');
		}

		// 4. Build query for inventory with template join
		let query = supabase
			.from('student_item_inventory')
			.select(
				`
				*,
				template:shop_item_templates (*)
			`
			)
			.eq('student_id', targetStudentId);

		// 5. Apply filters
		if (template_id) {
			query = query.eq('template_id', template_id);
		}

		if (category) {
			// Filter by template category using inner join
			query = query.eq('template.category', category);
		}

		if (equipped_only) {
			query = query.eq('is_equipped', true);
		}

		if (!include_expired) {
			// Exclude items that have expired
			query = query.or('expires_at.is.null,expires_at.gt.now()');
		}

		// 6. Execute query
		const { data: inventoryItems, error: queryError } = await query.order('acquired_at', {
			ascending: false
		});

		if (queryError) {
			console.error('Error fetching inventory:', queryError);
			throw error(500, "Erreur lors de la recuperation de l'inventaire");
		}

		// 7. Transform data to proper types
		// Type the raw response for better type inference
		type InventoryWithTemplate = {
			id: string;
			student_id: string;
			template_id: string;
			quantity: number | null;
			uses_remaining: number | null;
			is_equipped: boolean | null;
			equipped_at: string | null;
			acquired_at: string;
			acquired_from: string;
			acquisition_data: ItemAcquisitionData | null;
			expires_at: string | null;
			last_used_at: string | null;
			total_uses_count: number | null;
			is_locked: boolean | null;
			locked_for_listing_id: string | null;
			locked_for_trade_id: string | null;
			locked_at: string | null;
			instance_data: ItemInstanceData | null;
			created_at: string;
			updated_at: string;
			template: {
				id: string;
				internal_name: string;
				display_name: string;
				description: string | null;
				category: string;
				item_type: string;
				rarity: string;
				base_price: number;
				discount_percentage: number | null;
				is_active: boolean | null;
				available_from: string | null;
				available_until: string | null;
				max_owned_per_student: number | null;
				daily_purchase_limit: number | null;
				weekly_purchase_limit: number | null;
				purchase_cooldown_hours: number | null;
				properties: ShopItemProperties | null;
				is_tradeable: boolean | null;
				trade_cooldown_hours: number | null;
				icon_url: string | null;
				sort_order: number | null;
				created_at: string;
				updated_at: string;
				created_by: string | null;
			} | null;
		};

		const items = ((inventoryItems || []) as InventoryWithTemplate[])
			.filter((item) => item.template !== null)
			.map((item) => ({
				...item,
				template: {
					...item.template!,
					properties: item.template!.properties as ShopItemProperties | null
				}
			}));

		// 8. Return response
		return json({
			items,
			total: items.length
		});
	} catch (err) {
		console.error('Error in GET /api/inventory:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Erreur serveur interne');
	}
};
