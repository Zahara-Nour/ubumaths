# Marketplace Components

> UI components documentation for the marketplace and shop systems.

## Component Overview

```
src/lib/components/
├── marketplace/
│   ├── CreateListingModal.svelte
│   ├── ListingDetailsModal.svelte
│   ├── MarketplaceListingCard.svelte
│   ├── MarketplaceListings.svelte
│   ├── MarketplaceSettings.svelte
│   ├── MyListings.svelte
│   ├── MyTrades.svelte
│   ├── ProposalResponseModal.svelte
│   ├── TradeNegotiationModal.svelte
│   ├── VipCardSelector.svelte
│   ├── AssetSelector.svelte
│   └── teacher/
│       ├── MarketplaceStats.svelte
│       ├── MarketplaceAnalytics.svelte
│       ├── TradeHistoryTable.svelte
│       ├── ActivityFeed.svelte
│       └── ListingsMonitor.svelte
└── shop/
    ├── ShopBrowse.svelte
    ├── ShopCategoryFilter.svelte
    ├── ShopItemCard.svelte
    └── ShopPurchaseModal.svelte
```

---

## Student Marketplace Components

### MarketplaceListings

Browse and filter public listings.

```typescript
let {
	listings = $bindable<MarketplaceListing[]>([]),
	isLoading = $bindable(false),
	onViewListing,
	onPropose
}: Props = $props();
```

**Features:** Grid display, filters, search, sort, pagination

---

### MarketplaceListingCard

Individual listing card.

```typescript
let { listing, showActions = true, onclick }: Props = $props();
```

**Features:** Creator info, assets preview, expiry countdown, badges

---

### CreateListingModal

Create new listing form.

```typescript
let { open = $bindable(false), userCards, userGidouilles, onSubmit }: Props = $props();
```

**Features:** Type selection, card selector, gidouilles input, validation

---

### TradeNegotiationModal

Full trade negotiation interface.

```typescript
let {
	open = $bindable(false),
	trade,
	userId,
	userCards,
	userGidouilles,
	onSubmitOffer,
	onAccept,
	onCancel
}: Props = $props();
```

**Features:** Current offer display, history, counter-offer form, chat

---

### VipCardSelector

Select VIP cards from collection.

```typescript
let {
	cards,
	selectedIds = $bindable<string[]>([]),
	maxSelection = 10,
	excludeLockedCards = true
}: Props = $props();
```

**Features:** Grid thumbnails, multi-select, locked indicators

---

## Shop Components

### ShopBrowse

Main shop browsing interface.

```typescript
let {
	items = $bindable<ShopItemWithStatus[]>([]),
	gidouillesBalance,
	isLoading = false,
	onPurchase
}: Props = $props();
```

**Features:** Responsive grid, category filters, search, sort

---

### ShopItemCard

Individual shop item.

```typescript
let { item, canAfford, onclick }: Props = $props();
```

**Features:** Icon, rarity badge, price (with discount), owned status

---

### ShopPurchaseModal

Purchase confirmation.

```typescript
let { open = $bindable(false), item, gidouillesBalance, onConfirm, onCancel }: Props = $props();
```

**Features:** Item preview, quantity selector, price calculation

---

## Teacher Components

### MarketplaceStats

Overview statistics cards (trades, listings, volume)

### MarketplaceAnalytics

Charts (trade volume, categories, activity heatmap)

### TradeHistoryTable

Searchable trade history with expandable details

### ActivityFeed

Real-time activity stream

### ListingsMonitor

Active listings monitoring with moderation

---

## Shared Patterns

### Rarity Colors

```typescript
const rarityColors = {
	common: 'bg-gray-100 text-gray-800',
	uncommon: 'bg-green-100 text-green-800',
	rare: 'bg-blue-100 text-blue-800',
	epic: 'bg-purple-100 text-purple-800',
	legendary: 'bg-amber-100 text-amber-800'
};
```

### Loading States

```svelte
{#if isLoading}
	<Skeleton class="h-48 w-full" />
{:else}
	<!-- Content -->
{/if}
```

### Empty States

```svelte
{#if items.length === 0}
	<div class="flex flex-col items-center py-12 text-muted-foreground">
		<Icon icon="package-open" class="mb-4 h-12 w-12" />
		<p>Aucun article disponible</p>
	</div>
{/if}
```
