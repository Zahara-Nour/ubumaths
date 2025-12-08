import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

/**
 * Query schema for marketplace activity feed
 */
const activityQuerySchema = z.object({
	class_id: z.string().uuid('ID de classe invalide').nullish(),
	limit: z.coerce
		.number()
		.int('La limite doit être un entier')
		.min(1, 'La limite doit être au moins 1')
		.max(50, 'La limite ne peut pas dépasser 50')
		.finite('La valeur doit être un nombre fini')
		.default(20)
});

/**
 * GET /api/marketplace/admin/activity
 * Get recent marketplace activity for teacher's students
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
	const queryValidation = activityQuerySchema.safeParse({
		class_id: url.searchParams.get('class_id'),
		limit: url.searchParams.get('limit')
	});

	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { class_id, limit } = queryValidation.data;

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
		// Return empty activity
		return json({ activities: [] });
	}

	// Fetch recent activities from different tables
	interface ActivityDetails {
		title?: string;
		description?: string;
		listing_title?: string;
		listing_type?: string;
		offered_gidouilles?: number;
		wanted_gidouilles?: number;
		offered_cards?: string[];
		wanted_cards?: string[];
		proposal_count?: number;
		total_gidouilles?: number;
		total_cards?: number;
		partner_name?: string;
		[key: string]: unknown;
	}

	const activities: Array<{
		id: string;
		type: 'listing' | 'proposal' | 'trade' | 'trade_completed';
		timestamp: string;
		student_id: string;
		student_name?: string;
		details: ActivityDetails;
	}> = [];

	// Get recent listings
	const { data: recentListings } = await supabase
		.from('marketplace_listings')
		.select(
			`
			id,
			title,
			listing_type,
			created_at,
			creator_id,
			status,
			offered_gidouilles,
			wanted_gidouilles,
			creator:creator_id(firstname, lastname)
		`
		)
		.in('creator_id', studentIds)
		.order('created_at', { ascending: false })
		.limit(limit);

	for (const listing of recentListings || []) {
		const creator = (listing as { creator?: { firstname?: string; lastname?: string } | null })
			.creator;
		activities.push({
			id: listing.id,
			type: 'listing',
			timestamp: listing.created_at,
			student_id: listing.creator_id,
			student_name: creator
				? `${creator.firstname || ''} ${creator.lastname || ''}`.trim() || 'Élève inconnu'
				: 'Élève inconnu',
			details: {
				title: listing.title,
				listing_type: listing.listing_type,
				status: listing.status,
				offered_gidouilles: listing.offered_gidouilles,
				wanted_gidouilles: listing.wanted_gidouilles
			}
		});
	}

	// Get recent proposals
	const { data: recentProposals } = await supabase
		.from('marketplace_proposals')
		.select(
			`
			id,
			created_at,
			proposer_id,
			status,
			offered_gidouilles,
			proposer:proposer_id(firstname, lastname),
			listing:listing_id(title, creator_id)
		`
		)
		.in('proposer_id', studentIds)
		.order('created_at', { ascending: false })
		.limit(limit);

	for (const proposal of recentProposals || []) {
		const proposer = (proposal as { proposer?: { firstname?: string; lastname?: string } | null })
			.proposer;
		activities.push({
			id: proposal.id,
			type: 'proposal',
			timestamp: proposal.created_at,
			student_id: proposal.proposer_id,
			student_name: proposer
				? `${proposer.firstname || ''} ${proposer.lastname || ''}`.trim() || 'Élève inconnu'
				: 'Élève inconnu',
			details: {
				status: proposal.status,
				listing_title:
					(proposal as { listing?: { title?: string } | null }).listing?.title || undefined,
				listing_creator_id:
					(proposal as { listing?: { creator_id?: string } | null }).listing?.creator_id ||
					undefined,
				offered_gidouilles: proposal.offered_gidouilles
			}
		});
	}

	// Get recent trades
	const { data: recentTrades } = await supabase
		.from('marketplace_trades')
		.select(
			`
			id,
			created_at,
			updated_at,
			initiator_id,
			partner_id,
			status,
			final_trade,
			initiator:initiator_id(firstname, lastname),
			partner:partner_id(firstname, lastname)
		`
		)
		.or(`initiator_id.in.(${studentIds.join(',')}),partner_id.in.(${studentIds.join(',')})`)
		.order('updated_at', { ascending: false })
		.limit(limit);

	type ProfileName = { firstname?: string; lastname?: string } | null;
	const formatName = (p: ProfileName) =>
		p ? `${p.firstname || ''} ${p.lastname || ''}`.trim() || 'Élève inconnu' : 'Élève inconnu';

	for (const trade of recentTrades || []) {
		const initiator = (trade as { initiator?: ProfileName }).initiator;
		const partner = (trade as { partner?: ProfileName }).partner;

		// Add trade creation
		activities.push({
			id: trade.id,
			type: 'trade',
			timestamp: trade.created_at,
			student_id: trade.initiator_id,
			student_name: formatName(initiator),
			details: {
				partner_id: trade.partner_id,
				partner_name: formatName(partner),
				status: trade.status
			}
		});

		// Add trade completion if completed
		if (trade.status === 'completed' && trade.final_trade) {
			const finalTrade = trade.final_trade as {
				initiator_gidouilles?: number;
				partner_gidouilles?: number;
				initiator_cards?: string[];
				partner_cards?: string[];
			};

			activities.push({
				id: `${trade.id}_completed`,
				type: 'trade_completed',
				timestamp: trade.updated_at,
				student_id: trade.initiator_id,
				student_name: formatName(initiator),
				details: {
					partner_id: trade.partner_id,
					partner_name: formatName(partner),
					initiator_gidouilles: finalTrade.initiator_gidouilles || 0,
					partner_gidouilles: finalTrade.partner_gidouilles || 0,
					initiator_cards_count: finalTrade.initiator_cards?.length || 0,
					partner_cards_count: finalTrade.partner_cards?.length || 0
				}
			});
		}
	}

	// Sort all activities by timestamp
	activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

	// Limit to requested amount
	const limitedActivities = activities.slice(0, limit);

	return json({ activities: limitedActivities });
};
