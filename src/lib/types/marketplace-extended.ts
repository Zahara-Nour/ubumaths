// Extended Marketplace Types
// ==========================
// Extensions to marketplace types to support item trading alongside VIP cards

import type {
	CreateListingData,
	CreateProposalData,
	CreateTradeOfferData,
	MarketplaceListing,
	MarketplaceProposal,
	MarketplaceTrade,
	MarketplaceTradeOffer
} from './marketplace';
import type { StudentItemWithTemplate } from './shop';

// Extended listing with items
export interface MarketplaceListingWithItems extends MarketplaceListing {
	offered_items?: StudentItemWithTemplate[];
	wanted_item_template_ids?: string[];
}

// Extended proposal with items
export interface MarketplaceProposalWithItems extends MarketplaceProposal {
	offered_items?: StudentItemWithTemplate[];
}

// Extended trade with items
export interface MarketplaceTradeWithItems extends MarketplaceTrade {
	initiator_items?: StudentItemWithTemplate[];
	partner_items?: StudentItemWithTemplate[];
}

// Extended trade offer with items
export interface MarketplaceTradeOfferWithItems extends MarketplaceTradeOffer {
	initiator_items?: StudentItemWithTemplate[];
	partner_items?: StudentItemWithTemplate[];
}

// Extended create listing data with items
export interface CreateListingDataWithItems extends CreateListingData {
	offered_item_ids?: string[];
	wanted_item_template_ids?: string[];
}

// Extended create proposal data with items
export interface CreateProposalDataWithItems extends CreateProposalData {
	offered_item_ids?: string[];
}

// Extended create trade offer data with items
export interface CreateTradeOfferDataWithItems extends CreateTradeOfferData {
	initiator_item_ids?: string[];
	partner_item_ids?: string[];
}

// Item lock status for marketplace
export interface ItemLockForMarketplace {
	item_id: string;
	locked_for: 'listing' | 'trade' | 'proposal';
	locked_id: string; // ID of the listing/trade/proposal
	locked_at: string;
}