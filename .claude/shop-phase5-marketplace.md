# Shop System - Phase 5: Marketplace Integration

**Status**: COMPLETED
**Date**: 2025-11-21

## Overview

Items can now be traded in the marketplace alongside VIP cards. The same locking and transfer mechanisms are used.

## Files Created

### `src/lib/server/marketplace/item-helpers.ts`
Helper functions for item operations:
- `validateItemOwnership(supabase, studentId, itemIds)` - Verify ownership
- `checkItemsTradeable(supabase, itemIds)` - Check tradeability from templates
- `checkItemsUnlocked(supabase, itemIds)` - Verify not already locked
- `lockItemsForListing(supabase, studentId, itemIds, listingId)` - Lock for listing
- `lockItemsForTrade(supabase, studentId, itemIds, tradeId)` - Lock for trade
- `unlockItems(supabase, entityId, entityType)` - Unlock items
- `transferItems(supabase, fromStudent, toStudent, itemIds, tradeId)` - Transfer ownership
- `getItemDetails(supabase, itemIds)` - Get item + template details
- `getItemTemplateDetails(supabase, templateIds)` - Get template details

## Files Modified

### Validation Schemas
`src/lib/server/marketplace/validation.ts`:
- Added `offered_item_ids: z.array(z.string().uuid()).optional()`
- Added `wanted_item_template_ids: z.array(z.string().uuid()).optional()`
- Added items to trade offer schemas

### Listing Endpoints
`src/routes/api/marketplace/listings/+server.ts`:
- GET: Returns item details with listings
- POST: Validates and locks items when creating listings

`src/routes/api/marketplace/listings/[id]/+server.ts`:
- GET: Includes item details in response
- DELETE: Unlocks items when cancelling

### Proposal Endpoints
`src/routes/api/marketplace/listings/[id]/proposals/+server.ts`:
- GET: Returns item details with proposals
- POST: Validates and locks items when creating proposals

`src/routes/api/marketplace/proposals/[id]/+server.ts`:
- PATCH: Unlocks items when rejecting proposals

### Trade Endpoints
`src/routes/api/marketplace/trades/+server.ts`:
- POST: Validates and locks items when creating trades

`src/routes/api/marketplace/trades/[id]/accept/+server.ts`:
- Uses execute_trade RPC which handles item transfers

## Item Trading Flow

### Creating a Listing with Items
1. Validate item ownership
2. Check items are tradeable (from template)
3. Check items are not locked
4. Lock items for listing
5. Create listing with `offered_item_ids`

### Accepting a Proposal with Items
1. RPC `accept_proposal_atomic` handles:
   - Transfer VIP cards (existing)
   - Transfer items via `transfer_items` RPC
   - Transfer gidouilles (existing)
   - Unlock all locked items

### Friend-to-Friend Trade with Items
1. Create trade with items in offer
2. Lock items for trade
3. Counter-offer updates (lock new items, unlock removed)
4. Accept trade → `execute_trade` RPC:
   - Transfer all cards and items
   - Update gidouilles
   - Unlock everything

## Data Structures

### Listing with Items
```typescript
{
  id: string;
  // ... existing fields
  offered_item_ids: string[];           // Inventory IDs
  wanted_item_template_ids: string[];   // Template IDs wanted
  // Enriched data
  offered_items: StudentItemWithTemplate[];
  wanted_item_templates: ShopItemTemplate[];
}
```

### Trade Offer with Items
```typescript
{
  from_initiator: {
    cards: string[];
    gidouilles: number;
    items: string[];      // NEW
  },
  from_partner: {
    cards: string[];
    gidouilles: number;
    items: string[];      // NEW
  }
}
```

## To Resume

If crash after this phase:
1. Item helpers are in `src/lib/server/marketplace/item-helpers.ts`
2. Marketplace endpoints support items
3. Continue to **Phase 6: Admin Dashboard**

## Next Steps

- Create admin shop dashboard for item CRUD
- Create admin API endpoints
