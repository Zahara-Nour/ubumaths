import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// Supabase client is now accessed via locals.supabase
import { adminStatsQuerySchema } from '$lib/server/marketplace/validation';

/**
 * GET /api/marketplace/admin/stats
 * Get marketplace statistics for teacher's classes or admin's school
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Get user profile to determine role
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role, school_id')
		.eq('id', userId)
		.single();

	if (profileError || !profile) {
		throw error(404, 'Profil non trouvé');
	}

	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Accès réservé aux enseignants et administrateurs');
	}

	// Validate query parameters
	const queryValidation = adminStatsQuerySchema.safeParse({
		class_id: url.searchParams.get('class_id'),
		period: url.searchParams.get('period')
	});

	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { class_id, period } = queryValidation.data;

	// Calculate date range based on period
	const now = new Date();
	let dateFrom: Date = new Date(now); // Default initialization

	switch (period) {
		case 'day':
			dateFrom = new Date(now);
			dateFrom.setHours(0, 0, 0, 0);
			break;
		case 'week':
			dateFrom = new Date(now);
			dateFrom.setDate(dateFrom.getDate() - 7);
			dateFrom.setHours(0, 0, 0, 0);
			break;
		case 'month':
			dateFrom = new Date(now);
			dateFrom.setMonth(dateFrom.getMonth() - 1);
			dateFrom.setHours(0, 0, 0, 0);
			break;
		default:
			// For any other period, default to last month
			dateFrom.setMonth(dateFrom.getMonth() - 1);
			dateFrom.setHours(0, 0, 0, 0);
	}

	// Get student IDs based on role and filters
	let studentIds: string[] = [];

	if (profile.role === 'teacher') {
		if (class_id) {
			// Verify teacher owns this class
			const { data: classData } = await supabase
				.from('classes')
				.select('teacher_id')
				.eq('id', class_id)
				.single();

			if (!classData || classData.teacher_id !== userId) {
				throw error(403, 'Accès non autorisé à cette classe');
			}

			// Get students in this specific class
			const { data: classStudents } = await supabase
				.from('class_members')
				.select('student_id')
				.eq('class_id', class_id);

			studentIds = classStudents?.map((m: { student_id: string }) => m.student_id) || [];
		} else {
			// Get all students in teacher's classes
			const { data: classMembers } = await supabase
				.from('class_members')
				.select('student_id, class:classes!class_members_class_id_fkey(teacher_id)')
				.eq('class.teacher_id', userId);

			studentIds = classMembers?.map((m: { student_id: string }) => m.student_id) || [];
		}
	} else if (profile.role === 'admin') {
		if (class_id) {
			// Get students in specific class
			const { data: classData } = await supabase
				.from('classes')
				.select('school_id')
				.eq('id', class_id)
				.single();

			if (!classData || classData.school_id !== profile.school_id) {
				throw error(403, "Cette classe n'appartient pas à votre école");
			}

			const { data: classStudents } = await supabase
				.from('class_members')
				.select('student_id')
				.eq('class_id', class_id);

			studentIds = classStudents?.map((m: { student_id: string }) => m.student_id) || [];
		} else {
			// Get all students in the school
			const { data: schoolStudents } = await supabase
				.from('profiles')
				.select('id')
				.eq('school_id', profile.school_id)
				.eq('role', 'student');

			studentIds = schoolStudents?.map((s: { id: string }) => s.id) || [];
		}
	}

	if (studentIds.length === 0) {
		// No students found, return empty stats
		return json({
			stats: {
				period,
				totalTrades: 0,
				completedTrades: 0,
				cancelledTrades: 0,
				activeListings: 0,
				totalGidouillesTraded: 0,
				totalCardsTraded: 0,
				topTradedCards: [],
				topTraders: [],
				averageGidouillesPerTrade: 0,
				averageCardsPerTrade: 0
			}
		});
	}

	// Get trade statistics
	const { data: trades, error: tradesError } = await supabase
		.from('marketplace_trades')
		.select('*')
		.or(`initiator_id.in.(${studentIds.join(',')}),partner_id.in.(${studentIds.join(',')})`)
		.gte('created_at', dateFrom.toISOString());

	if (tradesError) {
		console.error('Error fetching trades:', tradesError);
		throw error(500, 'Erreur lors de la récupération des statistiques');
	}

	// Calculate trade stats
	const completedTrades = trades?.filter((t: { status: string }) => t.status === 'completed') || [];
	const cancelledTrades = trades?.filter((t: { status: string }) => t.status === 'cancelled') || [];
	const negotiatingTrades =
		trades?.filter((t: { status: string }) => t.status === 'negotiating') || [];

	// Calculate total gidouilles and cards traded
	let totalGidouillesTraded = 0;
	let totalCardsTraded = 0;

	for (const trade of completedTrades) {
		if (trade.final_trade) {
			const finalTrade = trade.final_trade as
				| {
						initiator_gidouilles?: number;
						partner_gidouilles?: number;
						initiator_cards?: string[];
						partner_cards?: string[];
				  }
				| null
				| undefined;
			totalGidouillesTraded +=
				(finalTrade?.initiator_gidouilles || 0) + (finalTrade?.partner_gidouilles || 0);
			totalCardsTraded +=
				(finalTrade?.initiator_cards?.length || 0) + (finalTrade?.partner_cards?.length || 0);

			// Track card templates (would need to join with vip_cards to get template_ids)
			// For now, we'll skip this as it requires additional queries
		}
	}

	// Get active listings count
	const { count: activeListingsCount } = await supabase
		.from('marketplace_listings')
		.select('*', { count: 'exact', head: true })
		.in('creator_id', studentIds)
		.eq('status', 'active');

	// Get top traders
	const traderActivity: Record<string, number> = {};
	for (const trade of trades || []) {
		traderActivity[trade.initiator_id] = (traderActivity[trade.initiator_id] || 0) + 1;
		traderActivity[trade.partner_id] = (traderActivity[trade.partner_id] || 0) + 1;
	}

	const topTradersData = Object.entries(traderActivity)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 5);

	// Fetch usernames for top traders
	const topTraderIds = topTradersData.map(([id]) => id);
	const { data: traderProfiles } = await supabase
		.from('profiles')
		.select('id, username')
		.in('id', topTraderIds);

	const topTraders = topTradersData.map(([id, count]) => ({
		student_id: id,
		username:
			traderProfiles?.find((p: { id: string; username: string | null }) => p.id === id)?.username ||
			'Inconnu',
		trade_count: count
	}));

	// Calculate averages
	const averageGidouillesPerTrade =
		completedTrades.length > 0 ? Math.round(totalGidouillesTraded / completedTrades.length) : 0;

	const averageCardsPerTrade =
		completedTrades.length > 0
			? Math.round((totalCardsTraded / completedTrades.length) * 10) / 10
			: 0;

	return json({
		stats: {
			period,
			dateFrom: dateFrom.toISOString(),
			dateTo: now.toISOString(),
			totalTrades: trades?.length || 0,
			completedTrades: completedTrades.length,
			cancelledTrades: cancelledTrades.length,
			negotiatingTrades: negotiatingTrades.length,
			activeListings: activeListingsCount || 0,
			totalGidouillesTraded,
			totalCardsTraded,
			topTradedCards: [], // Would require additional queries to implement
			topTraders,
			averageGidouillesPerTrade,
			averageCardsPerTrade
		}
	});
};
