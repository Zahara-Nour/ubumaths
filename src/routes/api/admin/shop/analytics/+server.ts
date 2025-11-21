/**
 * Admin Shop Analytics API
 * ========================
 *
 * Endpoint:
 * - GET: Fetch shop analytics and statistics
 *
 * Security: Admin only
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

// Query parameters schema
const analyticsQuerySchema = z.object({
	date_from: z.string().datetime('Format de date invalide').optional(),
	date_to: z.string().datetime('Format de date invalide').optional(),
	category: z.enum(['consumable', 'booster', 'cosmetic', 'utility']).optional()
});

/**
 * GET /api/admin/shop/analytics
 *
 * Fetch shop analytics data
 *
 * Query parameters:
 *   - date_from?: ISO date string (default: 30 days ago)
 *   - date_to?: ISO date string (default: now)
 *   - category?: Filter by specific category
 *
 * Response: {
 *   overview: {
 *     total_items: number
 *     active_items: number
 *     total_purchases: number
 *     total_revenue: number
 *     unique_buyers: number
 *   }
 *   items_by_category: Record<category, count>
 *   items_by_rarity: Record<rarity, count>
 *   top_selling_items: Array<{ item, sales, revenue }>
 *   recent_purchases: Array<purchase_details>
 *   daily_revenue: Array<{ date, revenue, purchases }>
 * }
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Non authentifié');
	}

	// 2. Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Accès réservé aux administrateurs');
	}

	const supabase = locals.supabase;

	try {
		// 3. Parse query parameters
		const params = {
			date_from: url.searchParams.get('date_from'),
			date_to: url.searchParams.get('date_to'),
			category: url.searchParams.get('category')
		};

		const validation = analyticsQuerySchema.safeParse(params);
		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		// Default date range: last 30 days
		const dateFrom =
			validation.data.date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
		const dateTo = validation.data.date_to || new Date().toISOString();
		const category = validation.data.category;

		// 4. Fetch overview stats
		const [itemsStats, purchasesStats, buyersStats] = await Promise.all([
			// Total and active items
			supabase
				.from('shop_item_templates')
				.select('is_active', { count: 'exact' })
				.then(({ data, count }) => {
					const active = data?.filter((item) => item.is_active).length || 0;
					return { total: count || 0, active };
				}),

			// Purchases in date range
			supabase
				.from('shop_purchase_history')
				.select('total_price, quantity', { count: 'exact' })
				.gte('purchased_at', dateFrom)
				.lte('purchased_at', dateTo)
				.is('refunded_at', null)
				.then(({ data, count }) => {
					const totalRevenue = data?.reduce((sum, p) => sum + p.total_price, 0) || 0;
					const totalQuantity = data?.reduce((sum, p) => sum + p.quantity, 0) || 0;
					return {
						purchases: count || 0,
						revenue: totalRevenue,
						items_sold: totalQuantity
					};
				}),

			// Unique buyers
			supabase
				.from('shop_purchase_history')
				.select('student_id')
				.gte('purchased_at', dateFrom)
				.lte('purchased_at', dateTo)
				.is('refunded_at', null)
				.then(({ data }) => {
					const uniqueBuyers = new Set(data?.map((p) => p.student_id) || []);
					return uniqueBuyers.size;
				})
		]);

		// 5. Items by category and rarity
		const { data: itemsBreakdown } = await supabase
			.from('shop_item_templates')
			.select('category, rarity, is_active');

		const itemsByCategory: Record<string, number> = {};
		const itemsByRarity: Record<string, number> = {};

		itemsBreakdown?.forEach((item) => {
			if (item.is_active) {
				itemsByCategory[item.category] = (itemsByCategory[item.category] || 0) + 1;
				itemsByRarity[item.rarity] = (itemsByRarity[item.rarity] || 0) + 1;
			}
		});

		// 6. Top selling items
		let topSellingQuery = supabase
			.from('shop_purchase_history')
			.select(
				`
				template_id,
				quantity,
				total_price,
				shop_item_templates!inner(
					display_name,
					category,
					rarity,
					icon_url
				)
			`
			)
			.gte('purchased_at', dateFrom)
			.lte('purchased_at', dateTo)
			.is('refunded_at', null);

		if (category) {
			topSellingQuery = topSellingQuery.eq('shop_item_templates.category', category);
		}

		const { data: purchases } = await topSellingQuery;

		// Aggregate by template_id
		const salesByItem = new Map<
			string,
			{
				template_id: string;
				display_name: string;
				category: string;
				rarity: string;
				icon_url: string | null;
				total_sales: number;
				total_revenue: number;
				units_sold: number;
			}
		>();

		purchases?.forEach((purchase) => {
			const template = purchase.shop_item_templates as unknown as {
				display_name: string;
				category: string;
				rarity: string;
				icon_url: string | null;
			};

			const existing = salesByItem.get(purchase.template_id) || {
				template_id: purchase.template_id,
				display_name: template.display_name,
				category: template.category,
				rarity: template.rarity,
				icon_url: template.icon_url,
				total_sales: 0,
				total_revenue: 0,
				units_sold: 0
			};

			existing.total_sales += 1;
			existing.total_revenue += purchase.total_price;
			existing.units_sold += purchase.quantity;

			salesByItem.set(purchase.template_id, existing);
		});

		// Sort by revenue and take top 10
		const topSellingItems = Array.from(salesByItem.values())
			.sort((a, b) => b.total_revenue - a.total_revenue)
			.slice(0, 10);

		// 7. Recent purchases (last 20)
		const { data: recentPurchases } = await supabase
			.from('shop_purchase_history')
			.select(
				`
				id,
				purchased_at,
				quantity,
				total_price,
				student_id,
				profiles!inner(username, avatar_url),
				shop_item_templates!inner(display_name, category, rarity, icon_url)
			`
			)
			.is('refunded_at', null)
			.order('purchased_at', { ascending: false })
			.limit(20);

		// 8. Daily revenue for chart (last 30 days)
		const { data: dailyData } = await supabase
			.from('shop_purchase_history')
			.select('purchased_at, total_price')
			.gte('purchased_at', dateFrom)
			.lte('purchased_at', dateTo)
			.is('refunded_at', null);

		// Aggregate by day
		const revenueByDay = new Map<string, { revenue: number; purchases: number }>();

		dailyData?.forEach((purchase) => {
			const day = purchase.purchased_at.split('T')[0]; // Get date part only
			const existing = revenueByDay.get(day) || { revenue: 0, purchases: 0 };
			existing.revenue += purchase.total_price;
			existing.purchases += 1;
			revenueByDay.set(day, existing);
		});

		// Convert to sorted array
		const dailyRevenue = Array.from(revenueByDay.entries())
			.map(([date, data]) => ({
				date,
				revenue: data.revenue,
				purchases: data.purchases
			}))
			.sort((a, b) => a.date.localeCompare(b.date));

		// 9. Return analytics data
		return json({
			overview: {
				total_items: itemsStats.total,
				active_items: itemsStats.active,
				total_purchases: purchasesStats.purchases,
				total_revenue: purchasesStats.revenue,
				items_sold: purchasesStats.items_sold,
				unique_buyers: buyersStats
			},
			items_by_category: itemsByCategory,
			items_by_rarity: itemsByRarity,
			top_selling_items: topSellingItems,
			recent_purchases:
				recentPurchases?.map((p) => ({
					id: p.id,
					purchased_at: p.purchased_at,
					quantity: p.quantity,
					total_price: p.total_price,
					student: {
						id: p.student_id,
						username: (p.profiles as unknown as { username: string }).username,
						avatar_url: (p.profiles as unknown as { avatar_url: string | null }).avatar_url
					},
					item: {
						display_name: (p.shop_item_templates as unknown as { display_name: string })
							.display_name,
						category: (p.shop_item_templates as unknown as { category: string }).category,
						rarity: (p.shop_item_templates as unknown as { rarity: string }).rarity,
						icon_url: (p.shop_item_templates as unknown as { icon_url: string | null }).icon_url
					}
				})) || [],
			daily_revenue: dailyRevenue,
			date_range: {
				from: dateFrom,
				to: dateTo
			}
		});
	} catch (err) {
		console.error('Error in GET /api/admin/shop/analytics:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all
		throw error(500, 'Erreur serveur interne');
	}
};
