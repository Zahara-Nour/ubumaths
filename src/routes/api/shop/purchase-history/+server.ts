/**
 * Shop Purchase History API
 * ==========================
 *
 * Endpoints:
 * - GET: Get purchase history for a student
 *
 * Security:
 * - Students can view their own history
 * - Teachers can view their students' history
 * - Admins can view any student's history
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { purchaseHistoryQuerySchema } from '$lib/validation/shop';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';
import type { PurchaseHistoryWithItem } from '$lib/types/shop';

/**
 * GET /api/shop/purchase-history
 *
 * Get student's purchase history with pagination and filters
 *
 * Query parameters:
 *   - student_id?: string (UUID) - For teachers/admins to view student history
 *   - template_id?: string (UUID) - Filter by item
 *   - date_from?: string (ISO datetime)
 *   - date_to?: string (ISO datetime)
 *   - include_refunded?: boolean (default: false)
 *   - page?: number (default: 1)
 *   - limit?: number (default: 50, max: 100)
 *
 * Response: {
 *   purchases: PurchaseHistoryWithItem[]
 *   pagination: { page, limit, total, totalPages }
 * }
 *
 * Errors:
 *   - 400: Validation error
 *   - 401: Not authenticated
 *   - 403: Not authorized to view student's history
 *   - 500: Server error
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Non authentifié');
	}

	const supabase = locals.supabase;
	const userId = locals.user!.id;
	const userRole = locals.profile.role;

	try {
		// 2. Validate query parameters
		const queryValidation = purchaseHistoryQuerySchema.safeParse({
			student_id: url.searchParams.get('student_id'),
			template_id: url.searchParams.get('template_id'),
			date_from: url.searchParams.get('date_from'),
			date_to: url.searchParams.get('date_to'),
			include_refunded: url.searchParams.get('include_refunded'),
			page: url.searchParams.get('page'),
			limit: url.searchParams.get('limit')
		});

		if (!queryValidation.success) {
			throw error(400, queryValidation.error.issues[0].message);
		}

		const { student_id, template_id, date_from, date_to, include_refunded, page, limit } =
			queryValidation.data;

		// 3. Determine which student's history to fetch
		let targetStudentId: string;

		if (student_id) {
			// Someone is trying to view a specific student's history
			if (userRole === 'student') {
				// Students can only view their own history
				if (student_id !== userId) {
					throw error(403, 'Vous ne pouvez consulter que votre propre historique');
				}
				targetStudentId = userId;
			} else if (userRole === 'teacher') {
				// Teachers can view their students' history
				const hasAccess = await verifyTeacherStudentWithRole(
					userId,
					student_id,
					locals.profile,
					supabase
				);

				if (!hasAccess) {
					throw error(403, "Vous ne pouvez consulter que l'historique de vos élèves");
				}
				targetStudentId = student_id;
			} else if (userRole === 'admin') {
				// Admins can view any student's history
				targetStudentId = student_id;
			} else {
				throw error(403, 'Rôle non autorisé');
			}
		} else {
			// No student_id specified - show current user's history
			if (userRole !== 'student') {
				throw error(400, 'Veuillez spécifier un student_id');
			}
			targetStudentId = userId;
		}

		// 4. Build the query
		let query = supabase
			.from('shop_purchase_history')
			.select(
				`
				*,
				template:shop_item_templates(*)
			`,
				{ count: 'exact' }
			)
			.eq('student_id', targetStudentId)
			.order('purchased_at', { ascending: false });

		// Apply filters
		if (template_id) {
			query = query.eq('template_id', template_id);
		}

		if (date_from) {
			query = query.gte('purchased_at', date_from);
		}

		if (date_to) {
			query = query.lte('purchased_at', date_to);
		}

		if (!include_refunded) {
			query = query.is('refunded_at', null);
		}

		// Apply pagination
		const offset = (page - 1) * limit;
		query = query.range(offset, offset + limit - 1);

		// 5. Execute query
		const { data: purchases, error: queryError, count } = await query;

		if (queryError) {
			console.error('Error fetching purchase history:', queryError);
			throw error(500, "Erreur lors de la récupération de l'historique");
		}

		// 6. Transform the response to match the expected type
		const purchaseHistory: PurchaseHistoryWithItem[] = (purchases || []).map((purchase) => ({
			...purchase,
			template: purchase.template
		}));

		// 7. Get total spent (for summary stats)
		let totalSpent = 0;
		if (userRole === 'student' && targetStudentId === userId) {
			// Only calculate total for student viewing their own history
			const { data: stats } = await supabase
				.from('shop_purchase_history')
				.select('total_price')
				.eq('student_id', targetStudentId)
				.is('refunded_at', null);

			if (stats) {
				totalSpent = stats.reduce((sum, purchase) => sum + purchase.total_price, 0);
			}
		}

		// 8. Return paginated response
		return json({
			purchases: purchaseHistory,
			pagination: {
				page,
				limit,
				total: count || 0,
				totalPages: Math.ceil((count || 0) / limit)
			},
			...(totalSpent > 0 && { total_spent: totalSpent })
		});
	} catch (err) {
		console.error('Error in GET /api/shop/purchase-history:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Erreur serveur interne');
	}
};
