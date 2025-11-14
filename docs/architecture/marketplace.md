# Marketplace Architecture

## Overview

The marketplace feature enables students to trade VIP cards and gidouilles within their school through a secure, atomic transaction system. The architecture prioritizes data consistency, security, and real-time updates while preventing common issues like race conditions and double-spending.

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend      │────▶│  API Layer   │────▶│   Database   │
│  (Svelte 5)     │     │  (SvelteKit) │     │  (Supabase)  │
└─────────────────┘     └──────────────┘     └──────────────┘
        │                       │                      │
        ▼                       ▼                      ▼
   Marketplace             Validation            RLS Policies
     Store                  (Zod)              RPC Functions
   Realtime                Helpers             Row Locking
```

---

## Database Schema

### Core Tables

#### marketplace_config

Controls marketplace settings at school and class levels.

| Column                   | Type    | Description                                     |
| ------------------------ | ------- | ----------------------------------------------- |
| id                       | UUID    | Primary key                                     |
| school_id                | UUID    | Reference to schools table (XOR with class_id)  |
| class_id                 | UUID    | Reference to classes table (XOR with school_id) |
| enabled_globally         | BOOLEAN | Enable for entire school (school-level only)    |
| enabled_for_class        | BOOLEAN | Enable for specific class (class-level only)    |
| max_listings_per_student | INTEGER | Limit active listings (1-10, enforced by API)   |
| max_trades_per_day       | INTEGER | Daily trade limit (1-100)                       |
| listing_duration_days    | INTEGER | Default expiry (1-30 days)                      |

> **Note**: While the database allows up to 20 listings per student, the API validation enforces a maximum of 10 for performance reasons.

#### marketplace_listings

Public sell/buy listings visible to all students in the school.

| Column                   | Type        | Description                                   |
| ------------------------ | ----------- | --------------------------------------------- |
| id                       | UUID        | Primary key                                   |
| creator_id               | UUID        | Student who created the listing               |
| school_id                | UUID        | School scope for visibility                   |
| listing_type             | TEXT        | 'sell' or 'buy'                               |
| status                   | TEXT        | 'active', 'expired', 'completed', 'cancelled' |
| offered_card_ids         | TEXT[]      | VIP card instance IDs offered                 |
| offered_gidouilles       | INTEGER     | Gidouilles offered                            |
| wanted_card_template_ids | TEXT[]      | Card templates wanted                         |
| wanted_gidouilles        | INTEGER     | Gidouilles wanted                             |
| title                    | TEXT        | Listing title (3-100 chars)                   |
| description              | TEXT        | Optional description (max 500 chars)          |
| expires_at               | TIMESTAMPTZ | Auto-expiry timestamp                         |
| view_count               | INTEGER     | Unique view counter                           |
| proposal_count           | INTEGER     | Number of proposals received                  |

#### marketplace_proposals

Proposals made on public listings.

| Column             | Type    | Description                                    |
| ------------------ | ------- | ---------------------------------------------- |
| id                 | UUID    | Primary key                                    |
| listing_id         | UUID    | Target listing                                 |
| proposer_id        | UUID    | Student making proposal                        |
| status             | TEXT    | 'pending', 'accepted', 'rejected', 'withdrawn' |
| offered_card_ids   | TEXT[]  | Cards offered in proposal                      |
| offered_gidouilles | INTEGER | Gidouilles offered                             |
| message            | TEXT    | Optional proposal message                      |
| response_message   | TEXT    | Listing owner's response                       |

#### marketplace_trades

Friend-to-friend direct negotiations.

| Column          | Type        | Description                                                                  |
| --------------- | ----------- | ---------------------------------------------------------------------------- |
| id              | UUID        | Primary key                                                                  |
| initiator_id    | UUID        | Student who started trade                                                    |
| partner_id      | UUID        | Friend being traded with                                                     |
| status          | TEXT        | 'negotiating', 'completed', 'cancelled'                                      |
| current_turn    | UUID        | Whose turn to respond                                                        |
| latest_offer_id | UUID        | Current active offer                                                         |
| trade_type      | TEXT        | 'friend' or 'marketplace' (distinguishes trade source)                       |
| current_offer   | JSONB       | Current negotiation state (from_initiator/from_partner cards and gidouilles) |
| last_offer_by   | UUID        | User ID who made the last offer                                              |
| final_trade     | JSONB       | Final agreed terms when completed (same structure as current_offer)          |
| completed_at    | TIMESTAMPTZ | Completion timestamp                                                         |

#### marketplace_trade_offers

History of all offers in a trade negotiation.

| Column               | Type    | Description                                    |
| -------------------- | ------- | ---------------------------------------------- |
| id                   | UUID    | Primary key                                    |
| trade_id             | UUID    | Parent trade                                   |
| offer_number         | INTEGER | Sequential offer counter                       |
| offered_by           | UUID    | Who made this offer                            |
| initiator_card_ids   | TEXT[]  | Initiator's cards in offer                     |
| initiator_gidouilles | INTEGER | Initiator's gidouilles                         |
| partner_card_ids     | TEXT[]  | Partner's cards in offer                       |
| partner_gidouilles   | INTEGER | Partner's gidouilles                           |
| status               | TEXT    | 'pending', 'accepted', 'rejected', 'countered' |

#### marketplace_locked_cards

Prevents double-spending by tracking card locks.

| Column      | Type        | Description                    |
| ----------- | ----------- | ------------------------------ |
| id          | UUID        | Primary key                    |
| card_id     | TEXT        | VIP card instance ID           |
| student_id  | UUID        | Card owner                     |
| entity_type | TEXT        | 'listing', 'proposal', 'trade' |
| entity_id   | UUID        | ID of locking entity           |
| locked_at   | TIMESTAMPTZ | Lock timestamp                 |

#### marketplace_listing_views

Tracks unique views to prevent manipulation.

| Column     | Type        | Description          |
| ---------- | ----------- | -------------------- |
| listing_id | UUID        | Listing being viewed |
| viewer_id  | UUID        | Student viewing      |
| viewed_at  | TIMESTAMPTZ | First view timestamp |

### RLS Policies

All tables have Row Level Security enabled with these key policies:

#### Students Can:

- View all listings in their school
- Create/update/delete their own listings
- View proposals on their listings
- Create proposals on others' listings
- Manage their own proposals
- Create trades with friends only
- View/update trades they're part of

#### Teachers Can:

- View all marketplace activity in their classes
- Cannot create/modify student data
- Access analytics and activity feeds

#### Security Policies:

- Card ownership verified before locking
- Friendship verified for direct trades
- School boundaries enforced
- Daily limits checked
- Atomic operations prevent race conditions

### RPC Functions

#### accept_proposal_atomic

Atomically accepts a proposal with row-level locking.

```sql
-- Signature
accept_proposal_atomic(
  p_proposal_id UUID,
  p_response_message TEXT
) RETURNS JSONB

-- Process:
1. Lock proposal row with FOR UPDATE NOWAIT
2. Verify proposal is still pending
3. Lock listing row
4. Verify listing is still active
5. Execute card/gidouilles transfers
6. Mark proposal as accepted
7. Mark listing as completed
8. Reject all other proposals
9. Unlock all cards
10. Return success or rollback all
```

#### execute_trade

Atomically executes a completed trade.

```sql
-- Signature
execute_trade(
  p_trade_id UUID,
  p_offer_id UUID
) RETURNS BOOLEAN

-- Process:
1. Lock trade with FOR UPDATE
2. Verify offer is accepted
3. Transfer initiator cards/gidouilles to partner
4. Transfer partner cards/gidouilles to initiator
5. Mark trade as completed
6. Unlock all involved cards
7. Return true or rollback all
```

#### record_listing_view

Records unique view with duplicate prevention.

```sql
-- Signature
record_listing_view(
  p_listing_id UUID,
  p_viewer_id UUID
) RETURNS VOID

-- Process:
1. Check if view already exists
2. If not, insert view record
3. Increment listing view_count
4. Ignore duplicates (ON CONFLICT DO NOTHING)
```

#### check_daily_trade_limit

Enforces daily trade limits per student.

```sql
-- Signature
check_daily_trade_limit(
  p_student_id UUID
) RETURNS BOOLEAN

-- Returns:
- true if under limit
- false if limit reached
```

---

## API Endpoints

### Listings API

#### GET /api/marketplace/listings

Fetch paginated listings with filters.

**Query Parameters:**

```typescript
{
  page?: number;          // Default: 1
  limit?: number;         // Default: 20, Max: 50
  type?: 'sell' | 'buy'; // Filter by listing type
  card_template_id?: string; // Filter by wanted card
}
```

**Response:**

```typescript
{
  listings: MarketplaceListing[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}
```

#### POST /api/marketplace/listings

Create a new listing.

**Request Body:**

```typescript
{
  listing_type: 'sell' | 'buy';
  title: string;                    // 3-100 chars
  description?: string;              // Max 500 chars
  offered_card_ids?: string[];      // VIP card instance IDs
  offered_gidouilles?: number;      // >= 0
  wanted_card_template_ids?: string[]; // Template IDs
  wanted_gidouilles?: number;       // >= 0
  expires_in_days?: number;         // 1-30, default: 7
}
```

**Validation:**

- At least one item must be offered or wanted
- Cards must be owned and unlocked
- Active listings limit not exceeded
- Marketplace enabled for student

#### PATCH /api/marketplace/listings/[id]

Update listing status (cancel only).

**Request Body:**

```typescript
{
	action: 'cancel';
}
```

#### DELETE /api/marketplace/listings/[id]

Delete a listing (owner only).

### Proposals API

#### GET /api/marketplace/listings/[id]/proposals

Get proposals for a listing (owner only).

**Response:**

```typescript
{
  proposals: MarketplaceProposal[];
}
```

#### POST /api/marketplace/listings/[id]/proposals

Create a proposal on a listing.

**Request Body:**

```typescript
{
  offered_card_ids?: string[];
  offered_gidouilles?: number;
  message?: string;              // Max 500 chars
}
```

**Validation:**

- Cannot propose on own listing
- One proposal per user per listing
- Cards must be owned and unlocked
- At least one item must be offered

#### PATCH /api/marketplace/proposals/[id]

Respond to a proposal (listing owner) or withdraw (proposer).

**Request Body (Owner):**

```typescript
{
  action: 'accept' | 'reject';
  message?: string;
}
```

**Request Body (Proposer):**

```typescript
{
	action: 'withdraw';
}
```

### Trades API

#### POST /api/marketplace/trades

Create a new friend trade.

**Request Body:**

```typescript
{
  partner_id: string;           // Must be a friend
  initiator_cards?: string[];
  initiator_gidouilles?: number;
  partner_cards?: string[];
  partner_gidouilles?: number;
}
```

**Validation:**

- Friendship must exist and be accepted
- Daily trade limit not exceeded
- Cards must be owned and unlocked

#### GET /api/marketplace/trades/[id]

Get trade details with offers.

**Response:**

```typescript
{
  trade: MarketplaceTrade;
  offers: MarketplaceTradeOffer[];
  canRespond: boolean;
}
```

#### POST /api/marketplace/trades/[id]/offers

Create a counter-offer in trade.

**Request Body:**

```typescript
{
  initiator_card_ids?: string[];
  initiator_gidouilles?: number;
  partner_card_ids?: string[];
  partner_gidouilles?: number;
}
```

#### POST /api/marketplace/trades/[id]/accept

Accept current offer and execute trade.

**Process:**

1. Verify it's your turn
2. Call execute_trade RPC function
3. Transfer all assets atomically
4. Unlock all cards
5. Mark trade completed

### Admin API (Teachers)

#### GET /api/marketplace/admin/analytics

Get detailed marketplace analytics.

**Query Parameters:**

```typescript
{
  class_id?: string;      // Filter by class
  date_from?: string;     // ISO date
  date_to?: string;       // ISO date
}
```

**Response:**

```typescript
{
	engagement: {
		activeTraders: number;
		percentageActive: number;
		newTradersThisWeek: number;
	}
	economics: {
		totalGidouillesCirculated: number;
		averageGidouillesPerTrade: number;
		totalTradesCompleted: number;
	}
	cards: {
		uniqueCardsTraded: number;
		mostTradedCards: Array<{
			template_id: string;
			name: string;
			count: number;
		}>;
	}
	temporal: {
		tradesPerDay: Array<{
			date: string;
			count: number;
		}>;
		peakHours: Array<{
			hour: number;
			count: number;
		}>;
	}
}
```

#### GET /api/marketplace/admin/activity

Get real-time activity feed.

**Query Parameters:**

```typescript
{
  class_id?: string;
  limit?: number;        // Default: 50
  type?: 'listing' | 'trade' | 'proposal';
}
```

#### GET /api/marketplace/config

Get marketplace configuration.

#### PATCH /api/marketplace/config

Update marketplace configuration (teacher/admin only).

---

## Security Implementation

### Atomic Operations

All critical operations use database transactions with row-level locking to prevent race conditions:

```typescript
// Example: Accept Proposal
async function acceptProposal(proposalId: string) {
	// Uses RPC function with FOR UPDATE NOWAIT
	const { data, error } = await supabase.rpc('accept_proposal_atomic', {
		p_proposal_id: proposalId,
		p_response_message: 'Accepted!'
	});

	if (error?.code === '55P03') {
		// Lock not available - another operation in progress
		throw new Error('Cette proposition est en cours de traitement');
	}
}
```

### Card Locking System

Prevents double-spending through explicit locks:

1. **Lock Creation**: Cards locked when used in listing/proposal/trade
2. **Lock Verification**: Check locks before any card operation
3. **Lock Release**: Automatic unlock on completion/cancellation
4. **Lock Timeout**: Orphaned locks cleaned by scheduled job

```typescript
// Helper function to check card availability
async function checkCardsUnused(supabase: SupabaseClient, cardIds: string[]): Promise<boolean> {
	const { data: locks } = await supabase
		.from('marketplace_locked_cards')
		.select('card_id')
		.in('card_id', cardIds);

	return !locks || locks.length === 0;
}
```

### Input Validation

All endpoints use Zod schemas for validation:

```typescript
// Example: Create Listing Schema
const createListingSchema = z
	.object({
		listing_type: z.enum(['sell', 'buy']),
		title: z.string().min(3).max(100),
		description: z.string().max(500).optional(),
		offered_card_ids: z.array(z.string()).max(10).optional(),
		offered_gidouilles: z.number().int().min(0).max(10000).optional(),
		wanted_card_template_ids: z.array(z.string()).max(10).optional(),
		wanted_gidouilles: z.number().int().min(0).max(10000).optional(),
		expires_in_days: z.number().int().min(1).max(30).default(7)
	})
	.refine(
		(data) =>
			data.offered_card_ids?.length ||
			data.offered_gidouilles ||
			data.wanted_card_template_ids?.length ||
			data.wanted_gidouilles,
		{ message: 'Au moins un élément doit être offert ou demandé' }
	);
```

### Rate Limiting

Multiple layers of rate limiting:

1. **Daily Trade Limit**: Configurable per class (default: 10/day)
2. **Active Listings Limit**: Max concurrent listings (default: 5)
3. **Proposal Limit**: One per user per listing
4. **View Tracking**: Unique views only to prevent DoS

---

## Frontend Architecture

### Marketplace Store

Central state management using Svelte 5 runes:

```typescript
// src/lib/stores/marketplace.svelte.ts
class MarketplaceStore {
	// Reactive state with $state rune
	listings = $state<MarketplaceListing[]>([]);
	myListings = $state<MarketplaceListing[]>([]);
	trades = $state<MarketplaceTrade[]>([]);

	// Computed values with $derived rune
	pendingActions = $derived({
		proposals: this.myListings.reduce((acc, l) => acc + l.proposal_count, 0),
		trades: this.trades.filter((t) => t.current_turn === this.userId).length
	});

	// Realtime subscription with $effect rune
	constructor() {
		$effect(() => {
			if (this.supabase && this.userId) {
				this.subscribeToRealtime();
			}
		});
	}
}
```

### Component Hierarchy

```
marketplace/
├── +page.svelte                    # Main page with tabs
├── components/
│   ├── MarketplaceListings.svelte  # Browse listings
│   ├── MarketplaceListingCard.svelte # Single listing
│   ├── CreateListingModal.svelte   # Create new listing
│   ├── MyListings.svelte          # Manage own listings
│   ├── MyTrades.svelte            # Friend trades
│   ├── TradeNegotiationModal.svelte # Trade offers
│   ├── VipCardSelector.svelte     # Reusable card picker
│   └── ProposalResponseModal.svelte # Accept/reject
└── teacher/
    ├── MarketplaceAnalytics.svelte # Analytics dashboard
    └── MarketplaceStats.svelte     # Statistics display
```

### Realtime Updates

Uses Supabase Realtime for instant updates:

```typescript
// Subscribe to marketplace changes
channel
	.on(
		'postgres_changes',
		{
			event: 'INSERT',
			schema: 'public',
			table: 'marketplace_listings',
			filter: `school_id=eq.${schoolId}`
		},
		(payload) => {
			// Update local state
			this.listings = [...this.listings, payload.new];
		}
	)
	.on(
		'postgres_changes',
		{
			event: 'UPDATE',
			schema: 'public',
			table: 'marketplace_proposals',
			filter: `proposer_id=eq.${userId}`
		},
		(payload) => {
			// Update proposal status
			this.updateProposal(payload.new);
		}
	);
```

### State Management Patterns

1. **Optimistic Updates**: Apply changes immediately, rollback on error
2. **Debounced Saves**: Batch multiple changes
3. **Cache Invalidation**: Clear stale data on mutations
4. **Error Recovery**: Retry failed operations with backoff

---

## Integration Points

### VIP Cards System

```typescript
// Get available cards with lock status
async function getAvailableCards(userId: string) {
	// Get user's cards
	const { data: profile } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', userId)
		.single();

	// Get locked cards
	const { data: locks } = await supabase
		.from('marketplace_locked_cards')
		.select('card_id, entity_type')
		.eq('student_id', userId);

	// Merge and return with lock status
	return processCardsWithLocks(profile.vip_cards, locks);
}
```

### Notifications

Marketplace events trigger notifications:

```typescript
// On proposal accepted
await supabase.from('notifications').insert({
	user_id: proposal.proposer_id,
	type: 'marketplace_proposal_accepted',
	title: 'Proposition acceptée!',
	message: `Votre proposition pour "${listing.title}" a été acceptée`,
	data: {
		proposal_id: proposal.id,
		listing_id: listing.id
	}
});
```

### Friends System

Direct trades require friendship:

```typescript
// Verify friendship before trade
async function canTradeWith(userId: string, partnerId: string) {
	const { data: friendship } = await supabase
		.from('friendships')
		.select('status')
		.or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
		.or(`requester_id.eq.${partnerId},addressee_id.eq.${partnerId}`)
		.eq('status', 'accepted')
		.single();

	return !!friendship;
}
```

### Chat Integration

> **⚠️ Status**: Partially implemented. Basic message support exists, real-time chat UI is planned for future release.

**Currently Available**:

- Optional message field in proposals (`message`)
- Optional message field in counter-offers (`message`)
- Messages stored in database

**Planned Features** (Not Yet Implemented):

- Real-time chat window during trade negotiation
- Chat history view
- Typing indicators
- Read receipts

**Implementation Notes**:
The database schema includes `conversation_id` field (currently nullable) to support future integration with the existing chat system. Trade offers store messages in the `message` TEXT field.

```typescript
// Send message with offer (currently available)
async function sendOfferWithMessage(tradeId: string, offerDetails: object, message?: string) {
	await supabase.from('marketplace_trade_offers').insert({
		trade_id: tradeId,
		...offerDetails,
		message: message
	});
}
```

---

## Testing Strategy

### Unit Tests

Test coverage for critical functions:

```typescript
// Example: Test proposal validation
describe('Marketplace Validation', () => {
	test('should reject proposal without offer', () => {
		const result = createProposalSchema.safeParse({
			message: 'I want this!'
			// No cards or gidouilles
		});
		expect(result.success).toBe(false);
	});

	test('should accept valid proposal', () => {
		const result = createProposalSchema.safeParse({
			offered_card_ids: ['card-1'],
			offered_gidouilles: 100,
			message: 'Fair trade?'
		});
		expect(result.success).toBe(true);
	});
});
```

### Integration Tests

Test complete workflows:

```typescript
// Example: Test trade execution
describe('Trade Execution', () => {
	test('should transfer assets atomically', async () => {
		// Create trade
		const trade = await createTrade(initiator, partner);

		// Create offer
		const offer = await createOffer(trade.id, {
			initiator_cards: ['card-1'],
			partner_gidouilles: 100
		});

		// Accept and execute
		await acceptOffer(trade.id, offer.id);

		// Verify transfers
		const initiatorProfile = await getProfile(initiator);
		const partnerProfile = await getProfile(partner);

		expect(initiatorProfile.gidouilles).toBe(originalGidouilles + 100);
		expect(partnerProfile.vip_cards).toContain('card-1');
	});
});
```

### Database Tests

Test RPC functions and triggers:

```sql
-- Test accept_proposal_atomic
BEGIN;
  -- Create test data
  INSERT INTO marketplace_listings (...) VALUES (...);
  INSERT INTO marketplace_proposals (...) VALUES (...);

  -- Execute function
  SELECT accept_proposal_atomic(proposal_id, 'Accepted!');

  -- Verify results
  SELECT * FROM marketplace_proposals WHERE id = proposal_id;
  -- Should be 'accepted'

  SELECT * FROM marketplace_listings WHERE id = listing_id;
  -- Should be 'completed'
ROLLBACK;
```

---

## Performance Optimizations

### Database Indexes

Strategic indexes for common queries:

```sql
-- Listings queries
CREATE INDEX idx_listings_school_status
  ON marketplace_listings(school_id, status);

-- Proposals by listing
CREATE INDEX idx_proposals_listing
  ON marketplace_proposals(listing_id);

-- Trades by participant
CREATE INDEX idx_trades_participants
  ON marketplace_trades(initiator_id, partner_id);

-- Locked cards lookup
CREATE INDEX idx_locked_cards_student
  ON marketplace_locked_cards(student_id, card_id);
```

### Query Optimization

Efficient data fetching:

```typescript
// Batch fetch related data
const { data: listings } = await supabase
	.from('marketplace_listings')
	.select(
		`
    *,
    creator:profiles!inner(id, username, avatar_url),
    proposals:marketplace_proposals(count)
  `
	)
	.eq('status', 'active')
	.order('created_at', { ascending: false })
	.limit(20);
```

### Caching Strategy

Multi-level caching:

1. **Browser Cache**: Static assets, images
2. **Store Cache**: Listings, templates
3. **Server Cache**: Analytics computations
4. **Database Cache**: Materialized views for stats

---

## Migration Guide

### Adding New Features

1. **Database Changes**:
   - Create timestamped migration
   - Update RLS policies
   - Add indexes if needed

2. **API Implementation**:
   - Add Zod validation schema
   - Create endpoint handler
   - Add to API documentation

3. **Frontend Updates**:
   - Update types
   - Extend store
   - Create/update components

4. **Testing**:
   - Unit tests for validation
   - Integration tests for workflow
   - Database tests for RPC functions

### Upgrading Existing Features

1. **Backward Compatibility**:
   - Keep old columns/endpoints temporarily
   - Add deprecation notices
   - Provide migration period

2. **Data Migration**:
   - Create migration script
   - Test on subset first
   - Run during low-traffic period

3. **Feature Flags**:
   - Use config to enable/disable
   - Gradual rollout
   - Easy rollback

---

## Troubleshooting

### Common Issues

#### Lock Timeout (55P03)

**Cause**: Row is locked by another transaction
**Solution**: Retry with exponential backoff

```typescript
async function retryWithBackoff(fn: () => Promise<any>, maxRetries = 3) {
	for (let i = 0; i < maxRetries; i++) {
		try {
			return await fn();
		} catch (error) {
			if (error.code === '55P03' && i < maxRetries - 1) {
				await new Promise((r) => setTimeout(r, 100 * Math.pow(2, i)));
				continue;
			}
			throw error;
		}
	}
}
```

#### Orphaned Locks

**Cause**: Transaction failed after locking cards
**Solution**: Scheduled cleanup job

```sql
-- Clean orphaned locks older than 1 hour
DELETE FROM marketplace_locked_cards
WHERE locked_at < NOW() - INTERVAL '1 hour'
  AND entity_type = 'trade'
  AND entity_id NOT IN (
    SELECT id FROM marketplace_trades
    WHERE status = 'negotiating'
  );
```

#### Performance Degradation

**Cause**: Too many active listings, missing indexes
**Solution**:

- Add partial indexes for common filters
- Implement pagination
- Archive old completed trades

---

## Future Enhancements

### Planned Features

1. **Auction System**:
   - Time-limited auctions
   - Automatic highest bidder wins
   - Reserve prices

2. **Trading Groups**:
   - Create trading circles
   - Group-exclusive listings
   - Shared inventories

3. **Advanced Analytics**:
   - Price history graphs
   - Market trends
   - Trading recommendations

4. **Achievements**:
   - Trading milestones
   - Rare trader badges
   - Leaderboards

### Technical Improvements

1. **Performance**:
   - Redis caching layer
   - GraphQL subscriptions
   - Database sharding

2. **Security**:
   - 2FA for high-value trades
   - Fraud detection ML
   - Audit logging

3. **Scalability**:
   - Microservices architecture
   - Event sourcing
   - CQRS pattern

---

## API Reference Quick Links

- [Listings API](#listings-api)
- [Proposals API](#proposals-api)
- [Trades API](#trades-api)
- [Admin API](#admin-api-teachers)

## See Also

- [Database Schema Documentation](./database-schema.md)
- [Supabase Realtime Integration](./supabase-realtime.md)
- [VIP Cards System](../features/vip-cards.md)
- [Friends System](../features/friends.md)

---

_Last Updated: 2025-11-14_
