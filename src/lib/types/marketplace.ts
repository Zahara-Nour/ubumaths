// Marketplace Types
// =================
// Complete TypeScript types for the student marketplace feature

import type { Database } from './database';

// Base database types
type DbListing = Database['public']['Tables']['marketplace_listings']['Row'];
type DbProposal = Database['public']['Tables']['marketplace_proposals']['Row'];
type DbTrade = Database['public']['Tables']['marketplace_trades']['Row'];
type DbTradeOffer = Database['public']['Tables']['marketplace_trade_offers']['Row'];
// TODO Phase 6: Implement trade chat feature
// Requires migration for marketplace_trade_chat table
// type DbTradeChat = Database['public']['Tables']['marketplace_trade_chat']['Row'];

// Listing types
export interface MarketplaceListing extends DbListing {
	// Relations
	creator?: {
		id: string;
		username: string;
		avatar_url: string | null;
		first_name?: string;
		last_name?: string;
	};
	offered_cards?: Array<{
		id: string;
		template_id: string;
		earned_at: string;
		template?: {
			name: string;
			description: string;
			image_path: string | null;
			rarity: 'common' | 'rare' | 'epic' | 'legendary';
			category: string | null;
		};
	}>;
	wanted_templates?: Array<{
		id: string;
		name: string;
		description: string;
		image_path: string | null;
		rarity: 'common' | 'rare' | 'epic' | 'legendary';
		category: string | null;
	}>;
}

// Proposal types
export interface MarketplaceProposal extends DbProposal {
	// Relations
	proposer?: {
		id: string;
		username: string;
		avatar_url: string | null;
		first_name?: string;
		last_name?: string;
	};
	listing?: {
		title: string;
		creator_id: string;
		status: 'active' | 'expired' | 'completed' | 'cancelled';
	};
	offered_cards?: Array<{
		id: string;
		template_id: string;
		earned_at: string;
		template?: {
			name: string;
			description: string;
			image_path: string | null;
			rarity: 'common' | 'rare' | 'epic' | 'legendary';
		};
	}>;
}

// Trade types
export interface MarketplaceTrade extends DbTrade {
	// Relations
	initiator?: {
		id: string;
		username: string;
		avatar_url: string | null;
		first_name?: string;
		last_name?: string;
	};
	partner?: {
		id: string;
		username: string;
		avatar_url: string | null;
		first_name?: string;
		last_name?: string;
	};
	latest_offer?: MarketplaceTradeOffer;
}

// Trade offer types
export interface MarketplaceTradeOffer
	extends Omit<DbTradeOffer, 'initiator_cards' | 'partner_cards'> {
	// Override with expanded relation types
	initiator_cards?: Array<{
		id: string;
		template_id: string;
		template?: {
			name: string;
			description: string;
			image_path: string | null;
			rarity: 'common' | 'rare' | 'epic' | 'legendary';
		};
	}> | null;
	partner_cards?: Array<{
		id: string;
		template_id: string;
		template?: {
			name: string;
			description: string;
			image_path: string | null;
			rarity: 'common' | 'rare' | 'epic' | 'legendary';
		};
	}> | null;
	// Relations
	offered_by_user?: {
		id: string;
		username: string;
		avatar_url: string | null;
	};
}

// TODO Phase 6: Implement trade chat feature
// Trade chat message
// export interface MarketplaceTradeChatMessage extends DbTradeChat {
// 	// Relations
// 	sender?: {
// 		id: string;
// 		username: string;
// 		avatar_url: string | null;
// 	};
// }

// Temporary placeholder until Phase 6
export interface MarketplaceTradeChatMessage {
	id: string;
	trade_id: string;
	sender_id: string;
	message: string;
	created_at: string;
	sender?: {
		id: string;
		username: string;
		avatar_url: string | null;
	};
}

// Create listing data
export interface CreateListingData {
	listing_type: 'sell' | 'buy';
	title: string;
	description?: string;
	offered_card_ids?: string[];
	offered_gidouilles?: number;
	wanted_card_template_ids?: string[];
	wanted_gidouilles?: number;
	expires_in_days?: number;
}

// Create proposal data
export interface CreateProposalData {
	offered_card_ids?: string[];
	offered_gidouilles?: number;
	message?: string;
}

// Create trade offer data
export interface CreateTradeOfferData {
	initiator_card_ids?: string[];
	initiator_gidouilles?: number;
	partner_card_ids?: string[];
	partner_gidouilles?: number;
}

// Filters for listings
export interface ListingsFilter {
	type?: 'all' | 'sell' | 'buy';
	search?: string;
	min_gidouilles?: number;
	max_gidouilles?: number;
	card_rarity?: 'common' | 'rare' | 'epic' | 'legendary';
	card_template_id?: string;
	sort_by?: 'recent' | 'expiring_soon' | 'popular';
	page?: number;
	limit?: number;
}

// Marketplace configuration
export interface MarketplaceConfig {
	id: number;
	max_active_listings_per_student: number;
	max_proposals_per_listing: number;
	default_listing_duration_days: number;
	min_gidouilles_per_trade: number;
	max_gidouilles_per_trade: number;
	max_cards_per_trade: number;
	trade_cooldown_minutes: number;
	chat_enabled: boolean;
	chat_max_message_length: number;
	created_at: string;
	updated_at: string;
}

// Statistics
export interface MarketplaceStats {
	total_listings: number;
	active_listings: number;
	my_active_listings: number;
	my_pending_proposals: number;
	my_active_trades: number;
}

// VIP card with lock status
export interface VipCardWithLockStatus {
	id: string;
	template_id: string;
	earned_at: string;
	is_locked: boolean;
	lock_reason?: 'in_trade' | 'in_listing' | 'in_proposal';
	template: {
		id: string;
		name: string;
		description: string;
		image_path: string | null;
		rarity: 'common' | 'rare' | 'epic' | 'legendary';
		category: string | null;
	};
}

// Realtime event types
export type MarketplaceRealtimeEvent =
	| { type: 'listing_created'; listing: MarketplaceListing }
	| { type: 'listing_updated'; listing: MarketplaceListing }
	| { type: 'listing_deleted'; listing_id: string }
	| { type: 'proposal_received'; proposal: MarketplaceProposal }
	| { type: 'proposal_updated'; proposal: MarketplaceProposal }
	| { type: 'trade_updated'; trade: MarketplaceTrade }
	| { type: 'trade_offer_received'; offer: MarketplaceTradeOffer }
	| { type: 'trade_chat_message'; message: MarketplaceTradeChatMessage };
