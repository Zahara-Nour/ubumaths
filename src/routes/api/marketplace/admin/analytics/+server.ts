import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

/**
 * Query schema for marketplace analytics
 */
const analyticsQuerySchema = z.object({
	class_id: z.string().uuid('ID de classe invalide').optional(),
	date_from: z.string().datetime().optional(),
	date_to: z.string().datetime().optional()
});

/**
 * GET /api/marketplace/admin/analytics
 * Get detailed marketplace analytics for teacher's classes
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
	const queryValidation = analyticsQuerySchema.safeParse({
		class_id: url.searchParams.get('class_id'),
		date_from: url.searchParams.get('date_from'),
		date_to: url.searchParams.get('date_to')
	});

	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { class_id, date_from, date_to } = queryValidation.data;

	// Get student IDs based on role
	let studentIds: string[] = [];

	if (profile.role === 'teacher') {
		// Get teacher's classes
		const { data: teacherClasses, error: classesError } = await supabase
			.from('classes')
			.select('id')
			.eq('teacher_id', userId);

		if (classesError) {
			throw error(500, 'Erreur lors de la récupération des classes');
		}

		const classIds = teacherClasses?.map((c: { id: string }) => c.id) || [];

		if (class_id) {
			// Verify teacher owns this class
			if (!classIds.includes(class_id)) {
				throw error(403, 'Accès non autorisé à cette classe');
			}
			// Get students in specific class
			const { data: classStudents } = await supabase
				.from('class_members')
				.select('student_id')
				.eq('class_id', class_id);
			studentIds = classStudents?.map((m: { student_id: string }) => m.student_id) || [];
		} else {
			// Get all students in teacher's classes
			const { data: classMembers } = await supabase
				.from('class_members')
				.select('student_id')
				.in('class_id', classIds);
			studentIds = classMembers?.map((m: { student_id: string }) => m.student_id) || [];
		}
	} else if (profile.role === 'admin') {
		// Admin can see all school students
		const { data: schoolStudents } = await supabase
			.from('profiles')
			.select('id')
			.eq('school_id', profile.school_id)
			.eq('role', 'student');
		studentIds = schoolStudents?.map((s: { id: string }) => s.id) || [];
	}

	if (studentIds.length === 0) {
		// Return empty analytics
		return json({
			analytics: {
				engagement: {
					totalStudents: 0,
					activeTraders: 0,
					percentageActive: 0,
					averageListingsPerStudent: 0,
					averageTradesPerStudent: 0
				},
				economic: {
					totalGidouillesCirculated: 0,
					averageGidouillesPerTrade: 0,
					largestTransaction: 0,
					mostExpensiveListings: []
				},
				cards: {
					mostListedCards: [],
					mostTradedCards: [],
					rareCardsTraded: []
				},
				temporal: {
					tradesOverTime: [],
					listingsOverTime: [],
					peakHours: [],
					averageTimeToAcceptance: 0
				}
			}
		});
	}

	// Build date filter - not used directly but applied to queries below

	// Get all trades for these students
	let tradesQuery = supabase
		.from('marketplace_trades')
		.select('*')
		.or(`initiator_id.in.(${studentIds.join(',')}),partner_id.in.(${studentIds.join(',')})`);

	if (date_from) tradesQuery = tradesQuery.gte('created_at', date_from);
	if (date_to) tradesQuery = tradesQuery.lte('created_at', date_to);

	const { data: trades, error: tradesError } = await tradesQuery;

	if (tradesError) {
		throw error(500, 'Erreur lors de la récupération des échanges');
	}

	// Get all listings for these students
	let listingsQuery = supabase
		.from('marketplace_listings')
		.select('*')
		.in('creator_id', studentIds);

	if (date_from) listingsQuery = listingsQuery.gte('created_at', date_from);
	if (date_to) listingsQuery = listingsQuery.lte('created_at', date_to);

	const { data: listings, error: listingsError } = await listingsQuery;

	if (listingsError) {
		throw error(500, 'Erreur lors de la récupération des annonces');
	}

	// Calculate engagement metrics
	const activeTraderIds = new Set<string>();
	const listingCreatorIds = new Set<string>();
	let totalGidouillesTraded = 0;
	let completedTradesCount = 0;
	const cardTradeFrequency: Record<string, number> = {};

	// Process trades
	for (const trade of trades || []) {
		activeTraderIds.add(trade.initiator_id);
		activeTraderIds.add(trade.partner_id);

		if (trade.status === 'completed' && trade.final_trade) {
			completedTradesCount++;
			const finalTrade = trade.final_trade as {
				initiator_gidouilles?: number;
				partner_gidouilles?: number;
				initiator_cards?: string[];
				partner_cards?: string[];
			};

			totalGidouillesTraded +=
				(finalTrade.initiator_gidouilles || 0) + (finalTrade.partner_gidouilles || 0);

			// Track card frequency
			[...(finalTrade.initiator_cards || []), ...(finalTrade.partner_cards || [])].forEach(
				(cardId) => {
					cardTradeFrequency[cardId] = (cardTradeFrequency[cardId] || 0) + 1;
				}
			);
		}
	}

	// Process listings
	const cardListingFrequency: Record<string, number> = {};
	let mostExpensiveListings: Array<{ id: string; title: string; gidouilles: number }> = [];

	for (const listing of listings || []) {
		listingCreatorIds.add(listing.creator_id);

		// Track most expensive listings
		if (listing.wanted_gidouilles > 0) {
			mostExpensiveListings.push({
				id: listing.id,
				title: listing.title,
				gidouilles: listing.wanted_gidouilles
			});
		}

		// Track card listing frequency
		(listing.offered_card_ids || []).forEach((cardId: string) => {
			cardListingFrequency[cardId] = (cardListingFrequency[cardId] || 0) + 1;
		});
	}

	// Sort and limit most expensive listings
	mostExpensiveListings.sort((a, b) => b.gidouilles - a.gidouilles);
	mostExpensiveListings = mostExpensiveListings.slice(0, 5);

	// Get most traded cards (need to fetch card templates for names)
	const mostTradedCardIds = Object.entries(cardTradeFrequency)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 5)
		.map(([cardId]) => cardId);

	let mostTradedCards: Array<{ template_id: string; name: string; count: number }> = [];
	if (mostTradedCardIds.length > 0) {
		const { data: cards } = await supabase
			.from('vip_cards')
			.select('id, template_id, template:vip_card_templates!vip_cards_template_id_fkey(name)')
			.in('id', mostTradedCardIds);

		// Use Map for O(1) lookups instead of O(n) find operations
		// Note: Supabase returns joined relations as arrays, so we extract the first element
		const cardMap = new Map(
			cards?.map((c) => {
				const template = Array.isArray(c.template) ? c.template[0] : c.template;
				return [
					c.id,
					{
						id: c.id as string,
						template_id: c.template_id as string,
						template: template as { name: string }
					}
				];
			}) || []
		);

		mostTradedCards = mostTradedCardIds.map((cardId) => {
			const card = cardMap.get(cardId);
			return {
				template_id: card?.template_id || '',
				name: card?.template?.name || 'Carte inconnue',
				count: cardTradeFrequency[cardId]
			};
		});
	}

	// Calculate temporal analytics (trades over time)
	const tradesOverTime: Record<string, number> = {};
	const listingsOverTime: Record<string, number> = {};

	// Group by day
	for (const trade of trades || []) {
		const day = new Date(trade.created_at).toISOString().split('T')[0];
		tradesOverTime[day] = (tradesOverTime[day] || 0) + 1;
	}

	for (const listing of listings || []) {
		const day = new Date(listing.created_at).toISOString().split('T')[0];
		listingsOverTime[day] = (listingsOverTime[day] || 0) + 1;
	}

	// Calculate peak hours
	const hourActivity: Record<number, number> = {};
	for (const trade of trades || []) {
		const hour = new Date(trade.created_at).getHours();
		hourActivity[hour] = (hourActivity[hour] || 0) + 1;
	}

	const peakHours = Object.entries(hourActivity)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 3)
		.map(([hour, count]) => ({
			hour: parseInt(hour),
			count
		}));

	// Calculate average time to acceptance for listings
	let totalTimeToAcceptance = 0;
	let acceptedListingsCount = 0;

	const { data: acceptedProposals } = await supabase
		.from('marketplace_proposals')
		.select('listing_id, created_at, updated_at')
		.eq('status', 'accepted')
		.in('listing_id', listings?.map((l) => l.id) || []);

	for (const proposal of acceptedProposals || []) {
		const listing = listings?.find((l) => l.id === proposal.listing_id);
		if (listing) {
			const timeToAcceptance =
				new Date(proposal.updated_at).getTime() - new Date(listing.created_at).getTime();
			totalTimeToAcceptance += timeToAcceptance;
			acceptedListingsCount++;
		}
	}

	const averageTimeToAcceptance =
		acceptedListingsCount > 0
			? Math.round(totalTimeToAcceptance / acceptedListingsCount / (1000 * 60 * 60)) // Convert to hours
			: 0;

	// Return analytics
	return json({
		analytics: {
			engagement: {
				totalStudents: studentIds.length,
				activeTraders: activeTraderIds.size,
				percentageActive:
					studentIds.length > 0 ? Math.round((activeTraderIds.size / studentIds.length) * 100) : 0,
				averageListingsPerStudent:
					listingCreatorIds.size > 0
						? Math.round(((listings?.length || 0) / listingCreatorIds.size) * 10) / 10
						: 0,
				averageTradesPerStudent:
					activeTraderIds.size > 0
						? Math.round(((trades?.length || 0) / activeTraderIds.size) * 10) / 10
						: 0
			},
			economic: {
				totalGidouillesCirculated: totalGidouillesTraded,
				averageGidouillesPerTrade:
					completedTradesCount > 0 ? Math.round(totalGidouillesTraded / completedTradesCount) : 0,
				largestTransaction: Math.max(
					0,
					...(trades?.map((t) => {
						if (t.status !== 'completed' || !t.final_trade) return 0;
						const ft = t.final_trade as {
							initiator_gidouilles?: number;
							partner_gidouilles?: number;
						};
						return (ft.initiator_gidouilles || 0) + (ft.partner_gidouilles || 0);
					}) || [])
				),
				mostExpensiveListings
			},
			cards: {
				mostTradedCards,
				totalCardsTraded: Object.values(cardTradeFrequency).reduce((sum, count) => sum + count, 0),
				uniqueCardsTraded: Object.keys(cardTradeFrequency).length
			},
			temporal: {
				tradesOverTime: Object.entries(tradesOverTime).map(([date, count]) => ({
					date,
					count
				})),
				listingsOverTime: Object.entries(listingsOverTime).map(([date, count]) => ({
					date,
					count
				})),
				peakHours,
				averageTimeToAcceptanceHours: averageTimeToAcceptance
			}
		}
	});
};
