# Marketplace System

> Complete documentation for the peer-to-peer trading marketplace.

## Overview

The marketplace enables students to trade VIP cards and gidouilles with each other. Key features:

- **School/class-level control** - Teachers can enable/disable trading
- **Public listings** - Post items for sale or wanted
- **Proposal system** - Respond to listings with offers
- **Friend-to-friend trading** - Direct negotiation between students
- **Card locking** - Prevents double-spending during trades
- **Mini-chat** - Communication during negotiations
- **Atomic transactions** - All-or-nothing trade execution

## Trading Modes

### 1. Public Listings

Students can create public listings visible to their school:

```
┌─────────────────────────────────────────┐
│  SELL LISTING                           │
│  ─────────────────────────────────────  │
│  Offering: Bonus Card + 5 Gidouilles    │
│  Wanting: Super Bonus Card              │
│  ─────────────────────────────────────  │
│  Status: Active | Proposals: 3          │
│  Expires: 7 days                        │
└─────────────────────────────────────────┘
```

**Listing Types:**

- `sell` - Student offers items, wants items/gidouilles in return
- `buy` - Student has gidouilles, wants specific items

### 2. Friend-to-Friend Trading

Direct negotiations between students with counter-offers:

```
Student A                 Student B
    │                         │
    ├──► Initial Offer ──────►│
    │                         │
    │◄── Counter Offer ◄──────┤
    │                         │
    ├──► Accept ─────────────►│
    │                         │
    └── Trade Executes ───────┘
```

### 3. Hybrid (Listing + Negotiation)

Accept a proposal with modifications:

```
Listing Owner ◄────── Proposal
       │
       ├──► Counter Offer ──► Proposer
       │                         │
       └────◄── Accept ─────────┘
```

---

## Configuration

### School-Level Config

```typescript
interface MarketplaceConfig {
	school_id: string;
	enabled_globally: boolean; // Master switch for school
	max_listings_per_student: number; // Default: 5
	max_trades_per_day: number; // Default: 10
	listing_duration_days: number; // Default: 7
}
```

### Class-Level Override

```typescript
interface ClassMarketplaceConfig {
	class_id: string;
	enabled_for_class: boolean; // Override school setting
	// Can inherit or override other settings
}
```

### Configuration Hierarchy

```
School: enabled_globally = true
    │
    ├── Class A: enabled_for_class = true   ✓ Trading allowed
    ├── Class B: enabled_for_class = false  ✗ Trading disabled
    └── Class C: (no override)              ✓ Uses school setting
```

---

## Listings

### Create Listing

```typescript
interface CreateListingRequest {
	listing_type: 'sell' | 'buy';

	// What's being offered (for sell) or what buyer has (for buy)
	offered_card_ids: string[]; // VIP card instance IDs
	offered_gidouilles: number;

	// What's wanted (for sell) or what buyer wants (for buy)
	wanted_card_template_ids: string[]; // Template IDs (any instance acceptable)
	wanted_gidouilles: number;

	// Metadata
	title: string; // 3-100 chars
	description?: string; // Max 500 chars
	max_proposals?: number; // Default: 10
}
```

### Listing Status

```
active → expired      (time passes)
active → completed    (trade accepted)
active → cancelled    (creator cancels)
```

### Listing Constraints

```sql
-- At least one item must be offered or wanted
CONSTRAINT at_least_one_item CHECK (
    COALESCE(array_length(offered_card_ids, 1), 0) > 0 OR
    offered_gidouilles > 0 OR
    COALESCE(array_length(wanted_card_template_ids, 1), 0) > 0 OR
    wanted_gidouilles > 0
)
```

---

## Proposals

### Submit Proposal

```typescript
interface SubmitProposalRequest {
	listing_id: string;

	// What proposer offers
	offered_card_ids: string[];
	offered_gidouilles: number;

	// Optional message
	message?: string; // Max 500 chars
}
```

### Proposal Status

```
pending → accepted   (listing owner accepts)
pending → rejected   (listing owner rejects)
pending → withdrawn  (proposer withdraws)
```

### Proposal Constraints

- One proposal per user per listing
- At least one item must be offered
- Cannot propose on own listing

---

## Friend-to-Friend Trades

### Initiate Trade

```typescript
interface InitiateTradeRequest {
	partner_id: string; // Friend's profile ID
	trade_type: 'direct';

	// Initial offer
	from_initiator: {
		vip_cards: string[]; // Instance IDs
		gidouilles: number;
	};
	from_partner: {
		vip_cards: string[]; // Instance IDs requested
		gidouilles: number;
	};
}
```

### Trade Status Flow

```
pending → negotiating  (counter-offer made)
pending → accepted     (partner accepts)
negotiating → accepted (offer accepted)
accepted → completed   (trade executed)
* → cancelled          (either party cancels)
```

### Counter-Offer

Either party can modify the terms:

```typescript
interface CounterOfferRequest {
	trade_id: string;

	from_initiator: {
		vip_cards: string[];
		gidouilles: number;
	};
	from_partner: {
		vip_cards: string[];
		gidouilles: number;
	};
}
```

---

## Trade Execution

### Atomic Transaction

```sql
BEGIN TRANSACTION;

-- 1. Verify all items still owned and not locked elsewhere
-- 2. Lock all involved items
-- 3. Transfer VIP cards (update profiles.vip_cards JSONB)
-- 4. Transfer gidouilles (update profiles.gidouilles)
-- 5. Log to vip_cards_activity (triggers reward_events)
-- 6. Log to gidouilles_history (triggers reward_events)
-- 7. Update trade status to 'completed'
-- 8. Unlock all items (new owners)

COMMIT;  -- or ROLLBACK on any failure
```

### Trade Final Structure

```typescript
interface FinalTrade {
	from_initiator: {
		gidouilles: number;
		vip_cards: string[]; // Instance IDs transferred
		shop_items?: string[]; // Inventory IDs transferred
	};
	from_partner: {
		gidouilles: number;
		vip_cards: string[];
		shop_items?: string[];
	};
}
```

---

## Card Locking

### Purpose

Prevent double-spending during trades:

- Card listed for sale cannot be used in another trade
- Card in pending trade cannot be listed elsewhere

### Lock Table

```sql
CREATE TABLE marketplace_locked_cards (
    id UUID PRIMARY KEY,
    card_instance_id TEXT NOT NULL,
    owner_id UUID NOT NULL,
    locked_for TEXT NOT NULL,  -- 'listing' or 'trade'
    reference_id UUID NOT NULL, -- listing_id or trade_id
    locked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ     -- Auto-unlock after expiration
);
```

### Lock Lifecycle

```
Create Listing/Trade
        │
        ▼
   Lock Cards
        │
        ├──► Trade Completes: Transfer & Unlock
        │
        └──► Trade Cancels: Unlock (owner keeps)
```

---

## Mini-Chat

### Trade Chat Messages

```typescript
interface ChatMessage {
	id: string;
	trade_id: string;
	sender_id: string;
	message: string; // Max 500 chars
	created_at: string;
	is_system: boolean; // System notifications
}
```

### System Messages

```
"Trade initiee par Alice"
"Bob a fait une contre-offre"
"Trade accepte par Alice"
"Trade complete!"
```

### Moderation

- Messages logged for audit
- Max message length enforced
- Rate limiting on chat

---

## Security

### RLS Policies

```sql
-- Listings: visible to same school
CREATE POLICY "View school listings"
ON marketplace_listings
FOR SELECT TO authenticated
USING (school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid()
));

-- Trades: visible to participants only
CREATE POLICY "View own trades"
ON marketplace_trades
FOR SELECT TO authenticated
USING (initiator_id = auth.uid() OR partner_id = auth.uid());

-- Proposals: creator and listing owner
CREATE POLICY "View proposals"
ON marketplace_proposals
FOR SELECT TO authenticated
USING (
    proposer_id = auth.uid() OR
    listing_id IN (SELECT id FROM marketplace_listings WHERE creator_id = auth.uid())
);
```

### Validation

- Card ownership verified before locking
- Gidouilles balance checked before trade
- School membership verified for listings
- Rate limits enforced per student

---

## API Quick Reference

### Listings

| Endpoint                         | Method | Description          |
| -------------------------------- | ------ | -------------------- |
| `/api/marketplace/listings`      | GET    | List school listings |
| `/api/marketplace/listings`      | POST   | Create listing       |
| `/api/marketplace/listings/[id]` | GET    | Get listing details  |
| `/api/marketplace/listings/[id]` | DELETE | Cancel listing       |

### Proposals

| Endpoint                                   | Method | Description       |
| ------------------------------------------ | ------ | ----------------- |
| `/api/marketplace/listings/[id]/proposals` | GET    | List proposals    |
| `/api/marketplace/listings/[id]/proposals` | POST   | Submit proposal   |
| `/api/marketplace/proposals/[id]/accept`   | POST   | Accept proposal   |
| `/api/marketplace/proposals/[id]/reject`   | POST   | Reject proposal   |
| `/api/marketplace/proposals/[id]/withdraw` | POST   | Withdraw proposal |

### Trades

| Endpoint                               | Method   | Description       |
| -------------------------------------- | -------- | ----------------- |
| `/api/marketplace/trades`              | GET      | List my trades    |
| `/api/marketplace/trades`              | POST     | Initiate trade    |
| `/api/marketplace/trades/[id]`         | GET      | Get trade details |
| `/api/marketplace/trades/[id]/counter` | POST     | Counter-offer     |
| `/api/marketplace/trades/[id]/accept`  | POST     | Accept trade      |
| `/api/marketplace/trades/[id]/cancel`  | POST     | Cancel trade      |
| `/api/marketplace/trades/[id]/chat`    | GET/POST | Chat messages     |

---

## Frontend Components

| Component                   | Path                              | Purpose           |
| --------------------------- | --------------------------------- | ----------------- |
| `MarketplaceBrowser.svelte` | `src/lib/components/marketplace/` | Browse listings   |
| `CreateListingModal.svelte` | `src/lib/components/marketplace/` | Create listing    |
| `ListingDetailView.svelte`  | `src/lib/components/marketplace/` | View listing      |
| `TradeNegotiation.svelte`   | `src/lib/components/marketplace/` | Trade chat/offers |
| `ProposalCard.svelte`       | `src/lib/components/marketplace/` | Display proposal  |
