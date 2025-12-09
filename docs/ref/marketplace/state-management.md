# Marketplace State Management

> Stores, realtime subscriptions, and reactive patterns for the marketplace.

## Overview

The marketplace uses Svelte 5 runes for reactive state management with two primary stores:

| Store              | File                    | Purpose                                     |
| ------------------ | ----------------------- | ------------------------------------------- |
| `marketplaceStore` | `marketplace.svelte.ts` | Trading state (listings, trades, proposals) |
| `shopStore`        | `shop.svelte.ts`        | Shop state (items, inventory, purchases)    |

Both stores implement:

- Reactive state with `$state`
- Derived computations with `$derived`
- Side effects with `$effect`
- Realtime subscriptions via Supabase
- Optimistic UI updates
- Automatic cleanup

---

## Marketplace Store

**File:** `src/lib/stores/marketplace.svelte.ts`

### State Structure

```typescript
class MarketplaceStore {
	// Core data
	listings = $state<MarketplaceListing[]>([]);
	myListings = $state<MarketplaceListing[]>([]);
	activeTrades = $state<MarketplaceTrade[]>([]);
	myProposals = $state<MarketplaceProposal[]>([]);
	receivedProposals = $state<MarketplaceProposal[]>([]);

	// Configuration
	config = $state<MarketplaceConfig | null>(null);

	// User assets
	myVipCards = $state<VipCardWithLockStatus[]>([]);
	userGidouilles = $state(0);

	// UI state
	isLoading = $state(false);
	error = $state<string | null>(null);

	// Pending operations for optimistic UI
	pendingActions = $state<{
		listings: Set<string>;
		trades: Set<string>;
		proposals: Set<string>;
	}>({
		listings: new Set(),
		trades: new Set(),
		proposals: new Set()
	});

	// Realtime
	private supabase: SupabaseClient | null = null;
	private userId: string | null = null;
	private channels: RealtimeChannel[] = [];
}
```

### Derived State

```typescript
// Active listings count
activeListingsCount = $derived(this.myListings.filter((l) => l.status === 'active').length);

// Trades where it's user's turn
myTurnTrades = $derived(
	this.activeTrades.filter((t) => t.status === 'negotiating' && t.last_offer_by !== this.userId)
);

// Locked card IDs
lockedCardIds = $derived(
	new Set(this.myVipCards.filter((c) => c.is_locked).map((c) => c.instance_id))
);

// Available cards for trading
availableCards = $derived(this.myVipCards.filter((c) => !c.is_locked));

// Can create new listing
canCreateListing = $derived(
	this.config !== null && this.activeListingsCount < this.config.max_listings_per_student
);
```

### Core Methods

#### Initialization

```typescript
async init(
  supabase: SupabaseClient,
  userId: string,
  classId?: string
): Promise<void> {
  this.supabase = supabase;
  this.userId = userId;
  this.isLoading = true;

  try {
    // Load initial data in parallel
    await Promise.all([
      this.loadConfig(),
      this.loadListings(),
      this.loadMyListings(),
      this.loadActiveTrades(),
      this.loadMyProposals(),
      this.loadUserAssets()
    ]);

    // Setup realtime subscriptions
    this.setupRealtimeSubscriptions();
  } finally {
    this.isLoading = false;
  }
}
```

#### Create Listing (with Optimistic UI)

```typescript
async createListing(data: CreateListingData): Promise<MarketplaceListing> {
  // Generate temporary ID
  const tempId = crypto.randomUUID();

  // Create optimistic listing
  const optimisticListing: MarketplaceListing = {
    id: tempId,
    creator_id: this.userId!,
    status: 'active',
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Add to pending
  this.pendingActions.listings.add(tempId);

  // Update UI immediately
  this.myListings = [optimisticListing, ...this.myListings];

  // Lock cards locally
  if (data.offered_card_ids) {
    this.lockCardsLocally(data.offered_card_ids);
  }

  try {
    const response = await fetch('/api/marketplace/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const newListing = await response.json();

    // Replace optimistic with real listing
    this.myListings = this.myListings.map(l =>
      l.id === tempId ? newListing : l
    );

    return newListing;

  } catch (error) {
    // Rollback on error
    this.myListings = this.myListings.filter(l => l.id !== tempId);

    // Unlock cards
    if (data.offered_card_ids) {
      this.unlockCardsLocally(data.offered_card_ids);
    }

    throw error;
  } finally {
    this.pendingActions.listings.delete(tempId);
  }
}
```

#### Accept Proposal

```typescript
async acceptProposal(proposalId: string): Promise<void> {
  this.pendingActions.proposals.add(proposalId);

  try {
    const response = await fetch(`/api/marketplace/proposals/${proposalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'accepted' })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    // Trade is created automatically by server
    // Realtime subscription will update activeTrades

    // Update proposal status locally
    this.receivedProposals = this.receivedProposals.map(p =>
      p.id === proposalId ? { ...p, status: 'accepted' } : p
    );

    // Reload to get fresh state
    await this.loadActiveTrades();

  } finally {
    this.pendingActions.proposals.delete(proposalId);
  }
}
```

#### Submit Trade Offer

```typescript
async submitTradeOffer(
  tradeId: string,
  offer: TradeOffer
): Promise<void> {
  this.pendingActions.trades.add(tradeId);

  try {
    const response = await fetch(
      `/api/marketplace/trades/${tradeId}/offers`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offer)
      }
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    // Update trade locally
    const updatedOffer = await response.json();
    this.activeTrades = this.activeTrades.map(t =>
      t.id === tradeId
        ? { ...t, current_offer: offer, last_offer_by: this.userId }
        : t
    );

  } finally {
    this.pendingActions.trades.delete(tradeId);
  }
}
```

### Realtime Subscriptions

```typescript
private setupRealtimeSubscriptions(): void {
  // Channel for listings in user's school
  const listingsChannel = this.supabase!
    .channel('marketplace-listings')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'marketplace_listings',
        filter: `school_id=eq.${this.schoolId}`
      },
      this.handleListingChange.bind(this)
    )
    .subscribe();

  // Channel for user's trades
  const tradesChannel = this.supabase!
    .channel(`marketplace-trades-${this.userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'marketplace_trades',
        filter: `or(initiator_id.eq.${this.userId},partner_id.eq.${this.userId})`
      },
      this.handleTradeChange.bind(this)
    )
    .subscribe();

  // Channel for proposals on user's listings
  const proposalsChannel = this.supabase!
    .channel(`marketplace-proposals-${this.userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'marketplace_proposals'
      },
      this.handleNewProposal.bind(this)
    )
    .subscribe();

  this.channels = [listingsChannel, tradesChannel, proposalsChannel];
}

private handleListingChange(payload: RealtimePayload): void {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  switch (eventType) {
    case 'INSERT':
      // Add new listing if not already present
      if (!this.listings.find(l => l.id === newRecord.id)) {
        this.listings = [newRecord as MarketplaceListing, ...this.listings];
      }
      break;

    case 'UPDATE':
      this.listings = this.listings.map(l =>
        l.id === newRecord.id ? (newRecord as MarketplaceListing) : l
      );
      this.myListings = this.myListings.map(l =>
        l.id === newRecord.id ? (newRecord as MarketplaceListing) : l
      );
      break;

    case 'DELETE':
      this.listings = this.listings.filter(l => l.id !== oldRecord.id);
      this.myListings = this.myListings.filter(l => l.id !== oldRecord.id);
      break;
  }
}

private handleTradeChange(payload: RealtimePayload): void {
  const { eventType, new: newRecord } = payload;
  const trade = newRecord as MarketplaceTrade;

  switch (eventType) {
    case 'INSERT':
      this.activeTrades = [trade, ...this.activeTrades];
      toaster.info(`Nouveau echange avec ${trade.partner?.display_name}`);
      break;

    case 'UPDATE':
      this.activeTrades = this.activeTrades.map(t =>
        t.id === trade.id ? trade : t
      );

      // Notify on status change
      if (trade.status === 'completed') {
        toaster.success('Echange termine !');
        // Reload user assets
        this.loadUserAssets();
      }
      break;
  }
}
```

### Cleanup

```typescript
cleanup(): void {
  // Unsubscribe from all channels
  this.channels.forEach(channel => {
    channel.unsubscribe();
  });
  this.channels = [];

  // Reset state
  this.listings = [];
  this.myListings = [];
  this.activeTrades = [];
  this.myProposals = [];
  this.receivedProposals = [];
  this.config = null;
  this.myVipCards = [];
  this.userGidouilles = 0;
  this.supabase = null;
  this.userId = null;
}
```

---

## Shop Store

**File:** `src/lib/stores/shop.svelte.ts`

### State Structure

```typescript
class ShopStore {
	// Shop items
	shopItems = $state<ShopItemWithStatus[]>([]);

	// User inventory
	inventory = $state<InventoryItemWithLockStatus[]>([]);

	// Balance
	gidouillesBalance = $state(0);

	// Selected items (for modals)
	selectedShopItem = $state<ShopItemWithStatus | null>(null);
	selectedInventoryItem = $state<InventoryItemWithLockStatus | null>(null);

	// Filters
	filters = $state<{
		category: string | null;
		search: string;
		rarity: string[];
		sortBy: 'price_asc' | 'price_desc' | 'name' | 'rarity';
	}>({
		category: null,
		search: '',
		rarity: [],
		sortBy: 'name'
	});

	// UI state
	isLoading = $state(false);
	isPurchasing = $state(false);
}
```

### Derived State

```typescript
// Filtered and sorted items
filteredItems = $derived(() => {
	let items = [...this.shopItems];

	// Category filter
	if (this.filters.category) {
		items = items.filter((i) => i.category === this.filters.category);
	}

	// Search filter
	if (this.filters.search) {
		const search = this.filters.search.toLowerCase();
		items = items.filter(
			(i) =>
				i.display_name.toLowerCase().includes(search) ||
				i.description?.toLowerCase().includes(search)
		);
	}

	// Rarity filter
	if (this.filters.rarity.length > 0) {
		items = items.filter((i) => this.filters.rarity.includes(i.rarity));
	}

	// Sort
	switch (this.filters.sortBy) {
		case 'price_asc':
			items.sort((a, b) => a.final_price - b.final_price);
			break;
		case 'price_desc':
			items.sort((a, b) => b.final_price - a.final_price);
			break;
		case 'name':
			items.sort((a, b) => a.display_name.localeCompare(b.display_name));
			break;
		case 'rarity':
			const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
			items.sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
			break;
	}

	return items;
});

// Items user can afford
affordableItems = $derived(
	this.filteredItems.filter((i) => i.final_price <= this.gidouillesBalance)
);

// Inventory by category
inventoryByCategory = $derived(
	this.inventory.reduce(
		(acc, item) => {
			const category = item.template.category;
			if (!acc[category]) acc[category] = [];
			acc[category].push(item);
			return acc;
		},
		{} as Record<string, InventoryItemWithLockStatus[]>
	)
);
```

### Core Methods

#### Purchase Item

```typescript
async purchaseItem(
  templateId: string,
  quantity: number = 1
): Promise<PurchaseResult> {
  this.isPurchasing = true;

  // Find item for price calculation
  const item = this.shopItems.find(i => i.id === templateId);
  if (!item) throw new Error('Article non trouve');

  const totalPrice = item.final_price * quantity;

  // Optimistic balance update
  const previousBalance = this.gidouillesBalance;
  this.gidouillesBalance -= totalPrice;

  try {
    const response = await fetch('/api/shop/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: templateId, quantity })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur d\'achat');
    }

    const result = await response.json();

    // Update with actual new balance
    this.gidouillesBalance = result.new_balance;

    // Reload inventory
    await this.loadInventory();

    toaster.success(`${item.display_name} achete !`);

    return result;

  } catch (error) {
    // Rollback balance
    this.gidouillesBalance = previousBalance;
    throw error;
  } finally {
    this.isPurchasing = false;
  }
}
```

#### Use Item

```typescript
async useItem(
  inventoryId: string,
  context: string,
  data?: Record<string, unknown>
): Promise<UseItemResult> {
  const inventoryItem = this.inventory.find(i => i.id === inventoryId);
  if (!inventoryItem) throw new Error('Article non trouve');

  // Optimistic update
  this.inventory = this.inventory.map(i =>
    i.id === inventoryId
      ? {
          ...i,
          uses_remaining: i.uses_remaining !== null
            ? i.uses_remaining - 1
            : null,
          quantity: i.uses_remaining === 1 ? i.quantity - 1 : i.quantity
        }
      : i
  ).filter(i => i.quantity > 0);

  try {
    const response = await fetch('/api/shop/use-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventory_id: inventoryId, context, data })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();

    return result;

  } catch (error) {
    // Reload inventory on error
    await this.loadInventory();
    throw error;
  }
}
```

---

## Usage in Components

### Store Initialization

```svelte
<!-- +page.svelte -->
<script lang="ts">
	import { marketplaceStore, shopStore } from '$lib/stores';
	import { page } from '$app/stores';

	const { supabase, profile } = $page.data;

	$effect(() => {
		if (profile?.id) {
			// Initialize stores
			marketplaceStore.init(supabase, profile.id, profile.class_id);
			shopStore.init(supabase, profile.id);

			// Cleanup on unmount
			return () => {
				marketplaceStore.cleanup();
				shopStore.cleanup();
			};
		}
	});
</script>
```

### Reading State

```svelte
<script lang="ts">
	import { marketplaceStore, shopStore } from '$lib/stores';

	// Direct access to reactive state
	const listings = $derived(marketplaceStore.listings);
	const canCreate = $derived(marketplaceStore.canCreateListing);
	const balance = $derived(shopStore.gidouillesBalance);
</script>

{#if marketplaceStore.isLoading}
	<Skeleton />
{:else}
	<p>Balance: {balance} gidouilles</p>
	<p>Annonces actives: {listings.length}</p>

	{#if canCreate}
		<Button>Creer une annonce</Button>
	{/if}
{/if}
```

### Calling Methods

```svelte
<script lang="ts">
	import { marketplaceStore } from '$lib/stores';
	import { toaster } from '$lib/stores/toaster.svelte';

	async function handleCreateListing(data: CreateListingData) {
		try {
			await marketplaceStore.createListing(data);
			toaster.success('Annonce creee !');
		} catch (error) {
			toaster.error(error.message);
		}
	}
</script>

<CreateListingModal {userCards} {userGidouilles} onSubmit={handleCreateListing} />
```

---

## State Flow Patterns

### Optimistic Update Pattern

```typescript
// 1. Create temporary state
const tempId = crypto.randomUUID();
const optimistic = { id: tempId, ...data };

// 2. Update UI immediately
this.items = [optimistic, ...this.items];

// 3. Track pending operation
this.pendingOperations.add(tempId);

try {
  // 4. Make API call
  const result = await fetch(...);

  // 5. Replace optimistic with real data
  this.items = this.items.map(i =>
    i.id === tempId ? result : i
  );
} catch {
  // 6. Rollback on error
  this.items = this.items.filter(i => i.id !== tempId);
} finally {
  this.pendingOperations.delete(tempId);
}
```

### Realtime Sync Pattern

```typescript
// Subscribe to changes
const channel = supabase
  .channel('table-changes')
  .on('postgres_changes', { ... }, (payload) => {
    switch (payload.eventType) {
      case 'INSERT':
        // Avoid duplicates (optimistic updates)
        if (!this.items.find(i => i.id === payload.new.id)) {
          this.items = [payload.new, ...this.items];
        }
        break;
      case 'UPDATE':
        this.items = this.items.map(i =>
          i.id === payload.new.id ? payload.new : i
        );
        break;
      case 'DELETE':
        this.items = this.items.filter(i =>
          i.id !== payload.old.id
        );
        break;
    }
  })
  .subscribe();
```

### Error Recovery Pattern

```typescript
async performOperation() {
  // Save current state for rollback
  const snapshot = structuredClone(this.state);

  try {
    // Optimistic update
    this.state = newState;

    // API call
    await fetch(...);

  } catch (error) {
    // Rollback to snapshot
    this.state = snapshot;

    // Re-throw for UI handling
    throw error;
  }
}
```

---

## Store Instance Management

The stores are exported as singletons:

```typescript
// marketplace.svelte.ts
class MarketplaceStore { ... }
export const marketplaceStore = new MarketplaceStore();

// shop.svelte.ts
class ShopStore { ... }
export const shopStore = new ShopStore();
```

This ensures consistent state across all components that import the stores.
