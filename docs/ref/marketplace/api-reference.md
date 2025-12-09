# Marketplace API Reference

> Complete API documentation for marketplace and shop endpoints.

## Authentication

All endpoints require authentication via Supabase session cookie. Unauthorized requests return `401`.

---

## Marketplace Listings

### GET /api/marketplace/listings

Fetch listings with filters and pagination.

**Query Parameters:**

| Parameter        | Type                                           | Default    | Description                 |
| ---------------- | ---------------------------------------------- | ---------- | --------------------------- |
| `type`           | `'sell'` \| `'buy'`                            | -          | Filter by listing type      |
| `search`         | string                                         | -          | Search in title/description |
| `min_gidouilles` | number                                         | -          | Minimum gidouilles offered  |
| `max_gidouilles` | number                                         | -          | Maximum gidouilles offered  |
| `sort_by`        | `'recent'` \| `'expiring_soon'` \| `'popular'` | `'recent'` | Sort order                  |
| `page`           | number                                         | 1          | Page number                 |
| `limit`          | number                                         | 20         | Items per page (1-50)       |

**Response:**

```typescript
{
  listings: MarketplaceListing[],
  total: number,
  hasMore: boolean
}
```

### POST /api/marketplace/listings

Create a new listing. **Students only.**

**Request Body:**

```typescript
{
  listing_type: 'sell' | 'buy',
  title: string,              // 3-100 chars
  description?: string,       // max 500 chars
  offered_card_ids?: string[],       // max 10
  offered_gidouilles?: number,       // 0-10000
  wanted_card_template_ids?: string[], // max 10
  wanted_gidouilles?: number         // 0-10000
}
```

**Response:** Created `MarketplaceListing` object

### DELETE /api/marketplace/listings/[id]

Cancel/delete a listing. **Creator only.**

---

## Listing Proposals

### GET /api/marketplace/listings/[id]/proposals

Get proposals for a listing. **Listing creator only.**

### POST /api/marketplace/listings/[id]/proposals

Submit a proposal. **Students only, not listing creator.**

**Request Body:**

```typescript
{
  offered_card_ids?: string[],
  offered_gidouilles?: number,
  message?: string
}
```

### PUT /api/marketplace/proposals/[id]

Accept or reject proposal. **Listing creator only.**

**Request Body:**

```typescript
{
  status: 'accepted' | 'rejected',
  response_message?: string
}
```

---

## Trades

### GET /api/marketplace/trades

Get user's trades.

### POST /api/marketplace/trades

Create friend trade. **Students only.**

**Request Body:**

```typescript
{
  partner_id: UUID,
  initial_offer?: TradeOffer
}
```

### POST /api/marketplace/trades/[id]/accept

Accept current offer. **Participant who didn't make last offer.**

### POST /api/marketplace/trades/[id]/offers

Submit counter-offer. **Trade participants.**

**Request Body:**

```typescript
{
  initiator_cards?: string[],
  initiator_gidouilles?: number,
  partner_cards?: string[],
  partner_gidouilles?: number,
  message?: string
}
```

### DELETE /api/marketplace/trades/[id]

Cancel trade. **Participants only.**

---

## Shop Endpoints

### GET /api/shop/items

Get available shop items.

**Query Parameters:**

- `category`: Filter by category
- `rarity`: Filter by rarity
- `search`: Search term

### POST /api/shop/purchase

Purchase item. **Students only.**

**Request Body:**

```typescript
{
  template_id: UUID,
  quantity: number  // 1-100
}
```

**Response:**

```typescript
{
  success: true,
  inventory_id: UUID,
  purchase_id: UUID,
  gidouilles_spent: number,
  new_balance: number
}
```

**Errors:**

- `400`: Invalid input
- `402`: Insufficient gidouilles
- `403`: Not a student
- `409`: Limit reached

### GET /api/shop/purchase-history

Get purchase history with pagination.

---

## Teacher Admin Endpoints

### GET /api/marketplace/admin/stats

Marketplace statistics for teacher's classes.

### GET /api/marketplace/admin/analytics

Detailed analytics (trade volume, categories, activity).

### GET /api/marketplace/admin/trades

Trade history for teacher's classes with filters.

### GET /api/marketplace/admin/activity

Real-time activity feed.

---

## Type Definitions

### MarketplaceListing

```typescript
interface MarketplaceListing {
	id: string;
	creator_id: string;
	listing_type: 'sell' | 'buy';
	status: 'active' | 'expired' | 'completed' | 'cancelled';
	offered_card_ids: string[];
	offered_gidouilles: number;
	wanted_card_template_ids: string[];
	wanted_gidouilles: number;
	title: string;
	description: string | null;
	expires_at: string;
	view_count: number;
	proposal_count: number;
}
```

### MarketplaceTrade

```typescript
interface MarketplaceTrade {
	id: string;
	trade_type: 'friend' | 'marketplace';
	status: 'negotiating' | 'completed' | 'cancelled';
	initiator_id: string;
	partner_id: string;
	current_offer: TradeOffer | null;
	last_offer_by: string | null;
}
```

### ShopItemTemplate

```typescript
interface ShopItemTemplate {
	id: string;
	internal_name: string;
	display_name: string;
	category: 'consumable' | 'booster' | 'cosmetic' | 'utility';
	rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
	base_price: number;
	discount_percentage: number;
	is_active: boolean;
}
```

---

## Validation Schemas

All inputs validated with Zod:

```typescript
// Listing creation
createListingSchema = z.object({
	listing_type: z.enum(['sell', 'buy']),
	title: z.string().min(3).max(100),
	description: z.string().max(500).optional(),
	offered_card_ids: z.array(z.string()).max(10).optional(),
	offered_gidouilles: z.number().int().min(0).max(10000).optional(),
	wanted_card_template_ids: z.array(z.string()).max(10).optional(),
	wanted_gidouilles: z.number().int().min(0).max(10000).optional()
});

// Shop purchase
purchaseRequestSchema = z.object({
	template_id: z.string().uuid(),
	quantity: z.number().int().min(1).max(100)
});
```
