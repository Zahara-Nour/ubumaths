# Marketplace Business Logic

> Business rules, limits, currency system, and trading mechanics.

## Currency System

### Gidouilles

**Gidouilles** are the virtual currency of UbuMaths, earned through educational activities and spent in the marketplace.

#### Earning Gidouilles

| Activity             | Reward   | Notes                        |
| -------------------- | -------- | ---------------------------- |
| Completing exercises | 1-10     | Based on difficulty          |
| Perfect score        | +5 bonus | 100% correct                 |
| Daily streak         | 5-50     | Increases with streak length |
| Achievements         | 10-100   | One-time rewards             |
| Teacher rewards      | Variable | Teacher discretion           |

#### Storage

```typescript
// In profiles table
gidouilles: number  // Current balance

// In gidouilles_history table
{
  student_id: UUID,
  amount: number,       // Positive = earned, Negative = spent
  reason: string,       // Human-readable description
  source: 'exercise' | 'achievement' | 'reward' | 'shop' | 'trade',
  created_at: timestamp
}
```

#### Limits

| Limit           | Value    | Reason                 |
| --------------- | -------- | ---------------------- |
| Max balance     | No limit | Encourage earning      |
| Max per trade   | 10,000   | Prevent abuse          |
| Max per listing | 10,000   | Prevent abuse          |
| Min transaction | 0        | Allow card-only trades |

---

## Shop System

### Item Categories

#### Consumables

Single-use items that provide immediate benefits.

| Type          | Examples                  | Typical Price |
| ------------- | ------------------------- | ------------- |
| Hints         | Show hint during exercise | 50-100        |
| Skips         | Skip current question     | 100-200       |
| Answer reveal | Show correct answer       | 150-300       |

#### Boosters

Temporary effects that enhance gameplay.

| Type              | Duration | Effect         | Price Range |
| ----------------- | -------- | -------------- | ----------- |
| XP Multiplier     | 1 hour   | 1.5x-2x XP     | 200-500     |
| Streak Shield     | 24 hours | Protect streak | 300-600     |
| Double Gidouilles | 1 hour   | 2x gidouilles  | 400-800     |

#### Cosmetics

Visual customizations without gameplay effects.

| Type                | Examples             | Price Range |
| ------------------- | -------------------- | ----------- |
| Avatar frames       | Bronze, Silver, Gold | 500-5000    |
| Profile backgrounds | Themes, patterns     | 300-3000    |
| Name colors         | Special colors       | 200-1000    |

#### Utilities

Special items with unique effects.

| Type          | Effect                   | Price Range |
| ------------- | ------------------------ | ----------- |
| Homework pass | Skip one assignment      | 1000-2000   |
| Extension     | Extra time on timed work | 500-1000    |
| Retry ticket  | Retake a failed quiz     | 800-1500    |

### Rarity System

| Rarity    | Color  | Drop Rate | Price Multiplier |
| --------- | ------ | --------- | ---------------- |
| Common    | Gray   | 50%       | 1x               |
| Uncommon  | Green  | 30%       | 1.5x             |
| Rare      | Blue   | 15%       | 2.5x             |
| Epic      | Purple | 4%        | 5x               |
| Legendary | Gold   | 1%        | 10x              |

### Pricing Formula

```typescript
function calculateFinalPrice(item: ShopItemTemplate): number {
	const basePrice = item.base_price;
	const discount = item.discount_percentage || 0;
	return Math.floor((basePrice * (100 - discount)) / 100);
}
```

### Purchase Limits

| Limit Type                | Purpose            | Typical Values |
| ------------------------- | ------------------ | -------------- |
| `max_owned_per_student`   | Prevent hoarding   | 1-10           |
| `daily_purchase_limit`    | Rate limiting      | 1-5            |
| `weekly_purchase_limit`   | Long-term limiting | 5-20           |
| `purchase_cooldown_hours` | Spacing purchases  | 1-24           |

---

## Trading System

### Listing Types

#### Sell Listings

"I have X, I want Y"

```
┌────────────────────────────────────┐
│  SELLING                           │
│  ─────────────────────────────────│
│  I'm offering:                     │
│  • 3 VIP cards (Rare, Epic, Epic)  │
│  • 100 gidouilles                  │
│                                    │
│  I want:                           │
│  • 500 gidouilles                  │
│  OR                                │
│  • 1 Legendary VIP card            │
└────────────────────────────────────┘
```

#### Buy Listings

"I'm looking for X, I'll pay Y"

```
┌────────────────────────────────────┐
│  BUYING                            │
│  ─────────────────────────────────│
│  I'm looking for:                  │
│  • 2 Epic VIP cards                │
│                                    │
│  I'll give:                        │
│  • 800 gidouilles                  │
│  • 1 Legendary cosmetic item       │
└────────────────────────────────────┘
```

### Trading Rules

#### General Rules

| Rule                     | Value       | Configurable |
| ------------------------ | ----------- | ------------ |
| Max active listings      | 5           | Yes (1-20)   |
| Max trades per day       | 10          | Yes (1-100)  |
| Listing duration         | 7 days      | Yes (1-30)   |
| Max cards per trade      | 10          | No           |
| Max gidouilles per trade | 10,000      | No           |
| Trade scope              | Same school | No           |

#### Card Locking

When cards are used in listings or trades, they are **locked** to prevent double-spending:

```
Student's Cards: [A, B, C, D, E]

Creates Listing with cards [A, B]
→ Cards A, B locked
→ Available for other trades: [C, D, E]

Starts Trade offering card C
→ Card C locked for this trade
→ Available: [D, E]

Listing expires
→ Cards A, B unlocked
→ Available: [A, B, D, E]
```

### Trade Flow

#### Marketplace Trade (via Listing)

```
1. LISTING CREATED
   Creator: Alice
   Offers: Epic Card + 100 gid
   Wants: 500 gid

2. PROPOSAL SUBMITTED
   Proposer: Bob
   Offers: 450 gid + Common Card
   Message: "Can you accept 450?"

3. CREATOR RESPONDS
   Alice reviews proposal
   Options: Accept / Reject

4. IF ACCEPTED
   → Trade created automatically
   → Assets transferred instantly
   → Both parties notified
   → Listing marked complete

5. IF REJECTED
   Bob's cards unlocked
   Bob can submit new proposal
   Alice can add response message
```

#### Friend Trade (Direct)

```
1. TRADE INITIATED
   Alice → Bob
   Initial offer: 2 cards for 1 card + 200 gid

2. NEGOTIATION
   Bob: Counter-offers 1 card + 300 gid
   Alice: Counter-offers 2 cards for 1 card + 250 gid
   Bob: Accepts

3. EXECUTION
   → All cards transferred
   → Gidouilles transferred
   → Trade recorded
   → Both notified
```

### Negotiation Rules

| Rule             | Description                          |
| ---------------- | ------------------------------------ |
| Turn-based       | Cannot accept own offer              |
| Counter required | Must change something to counter     |
| No limit         | Unlimited counter-offers             |
| Chat available   | Optional mini-chat for communication |
| Cancel anytime   | Either party can cancel              |

---

## Configuration System

### School-Level Configuration

```typescript
interface MarketplaceConfig {
	school_id: UUID;
	class_id: null; // School-level

	enabled_globally: boolean; // Master switch
	max_listings_per_student: number; // 1-20, default 5
	max_trades_per_day: number; // 1-100, default 10
	listing_duration_days: number; // 1-30, default 7
}
```

### Class-Level Overrides

```typescript
interface MarketplaceConfig {
	school_id: null; // Class-level
	class_id: UUID;

	enabled_for_class: boolean; // Class-specific toggle
	// Other settings inherited from school
}
```

### Configuration Precedence

```
1. Class disabled? → Marketplace disabled for class
2. School disabled? → Marketplace disabled for school
3. Both enabled? → Use school settings
```

---

## Item Lifecycle

### Shop Item Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   ACTIVE    │────>│  PURCHASED  │────>│  INVENTORY  │
│  (in shop)  │     │ (transaction)│     │  (owned)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────┐
                    │                          │              │
                    ▼                          ▼              ▼
            ┌─────────────┐          ┌─────────────┐  ┌─────────────┐
            │    USED     │          │   TRADED    │  │   EXPIRED   │
            │ (consumed)  │          │ (to other)  │  │ (time limit)│
            └─────────────┘          └─────────────┘  └─────────────┘
```

### VIP Card Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   EARNED    │────>│   OWNED     │<───>│   LOCKED    │
│ (from game) │     │ (in wallet) │     │ (in trade)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
                   ┌─────────────┐
                   │   TRADED    │
                   │ (to other)  │
                   └─────────────┘
```

### Listing Lifecycle

```
┌─────────────┐
│   CREATED   │ Cards locked, visible to school
└──────┬──────┘
       │
       ├─────────────────────┬─────────────────────┐
       ▼                     ▼                     ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  COMPLETED  │       │  CANCELLED  │       │   EXPIRED   │
│ (accepted)  │       │ (by creator)│       │ (timeout)   │
└─────────────┘       └─────────────┘       └─────────────┘
       │                     │                     │
       └─────────────────────┴─────────────────────┘
                             │
                             ▼
                   Cards unlocked, listing archived
```

---

## Analytics & Metrics

### Teacher Dashboard Metrics

| Metric               | Description               | Use Case            |
| -------------------- | ------------------------- | ------------------- |
| Total trades         | Completed trades in class | Engagement tracking |
| Active listings      | Current open listings     | Market activity     |
| Gidouilles volume    | Total traded              | Economy health      |
| Most active students | By trade count            | Participation       |
| Popular items        | Most traded cards/items   | Market trends       |

### Calculated Metrics

```typescript
// Trade completion rate
const completionRate = completedTrades / (completedTrades + cancelledTrades);

// Average trade value
const avgValue = totalGidouillesVolume / completedTrades;

// Student engagement
const engagementScore = (trades + listings + purchases) / days;

// Market velocity
const velocity = completedTrades / activeListings;
```

---

## Error Handling

### User-Facing Errors (French)

| Situation            | Error Message                                     |
| -------------------- | ------------------------------------------------- |
| Insufficient balance | "Gidouilles insuffisantes"                        |
| Listing limit        | "Limite d'annonces atteinte (max: 5)"             |
| Card locked          | "Cette carte est utilisee dans un autre echange"  |
| Trade limit          | "Limite d'echanges journaliers atteinte"          |
| Item unavailable     | "Article non disponible"                          |
| Own listing          | "Impossible de proposer sur votre propre annonce" |
| Trade expired        | "Cet echange a expire"                            |
| Ownership limit      | "Limite de possession atteinte pour cet article"  |

### Recovery Strategies

| Error Type              | Strategy                                 |
| ----------------------- | ---------------------------------------- |
| Network error           | Retry with exponential backoff           |
| Optimistic UI failure   | Rollback to previous state               |
| Concurrent modification | Refresh and retry                        |
| Balance insufficient    | Show current balance, suggest earning    |
| Limit exceeded          | Show remaining capacity, suggest waiting |

---

## Future Considerations

### Planned Features

1. **Auctions**: Time-limited bidding on items
2. **Bundles**: Package deals for multiple items
3. **Wishlists**: Save items for later
4. **Price history**: Track item value over time
5. **Recommendations**: AI-suggested trades

### Scalability Notes

- Listings auto-expire via database job (cron)
- Heavy queries use materialized views
- Real-time limited to active trades/listings
- History archived after 90 days

### Economy Balance

| Concern          | Mitigation                 |
| ---------------- | -------------------------- |
| Inflation        | Purchase limits, cooldowns |
| Monopolies       | Max ownership limits       |
| Exploitation     | Trade limits, moderation   |
| Inactive economy | Featured items, events     |
