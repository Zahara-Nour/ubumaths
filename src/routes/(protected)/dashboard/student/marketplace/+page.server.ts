import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		return {
			config: null,
			initialStats: {
				my_active_listings: 0,
				my_pending_proposals: 0,
				my_active_trades: 0
			}
		};
	}

	// Fetch marketplace configuration
	const { data: config } = await supabase.from('marketplace_config').select('*').single();

	// Fetch user's active listings count for initial display
	const { count: myActiveListings } = await supabase
		.from('marketplace_listings')
		.select('*', { count: 'exact', head: true })
		.eq('creator_id', userId)
		.eq('status', 'active');

	// Fetch user's pending proposals count
	const { count: myPendingProposals } = await supabase
		.from('marketplace_proposals')
		.select('*', { count: 'exact', head: true })
		.eq('proposer_id', userId)
		.eq('status', 'pending');

	// Fetch user's active trades count
	const { count: myActiveTrades } = await supabase
		.from('marketplace_trades')
		.select('*', { count: 'exact', head: true })
		.or(`initiator_id.eq.${userId},partner_id.eq.${userId}`)
		.eq('status', 'negotiating');

	return {
		config: config || null,
		initialStats: {
			my_active_listings: myActiveListings || 0,
			my_pending_proposals: myPendingProposals || 0,
			my_active_trades: myActiveTrades || 0
		}
	};
};
