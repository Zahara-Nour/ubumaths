# Marketplace Architecture

> System design, data flows, and component hierarchy for the marketplace feature.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │  Student Pages   │  │  Teacher Pages   │  │   Components     │       │
│  │  /marketplace/   │  │  /marketplace/   │  │  marketplace/    │       │
│  └────────┬─────────┘  └────────┬─────────┘  │  shop/           │       │
│           │                     │            └────────┬─────────┘       │
│           └──────────┬──────────┘                     │                 │
│                      ▼                                │                 │
│           ┌──────────────────────────────────────────┴──────┐           │
│           │              State Management                    │           │
│           │  marketplace.svelte.ts  │  shop.svelte.ts       │           │
│           └────────────────────────┬────────────────────────┘           │
│                                    │                                     │
│                      ┌─────────────┴─────────────┐                      │
│                      │    Realtime Manager       │                      │
│                      │  supabaseRealtimeManager  │                      │
│                      └─────────────┬─────────────┘                      │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │
                        ┌────────────┴────────────┐
                        │      API Layer          │
                        │  /api/marketplace/*     │
                        │  /api/shop/*            │
                        └────────────┬────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────┐
│                           SERVER (SvelteKit)                            │
├────────────────────────────────────┼────────────────────────────────────┤
│                        ┌───────────┴───────────┐                        │
│                        │   API Endpoints       │                        │
│                        │   +server.ts files    │                        │
│                        └───────────┬───────────┘                        │
│                                    │                                     │
│           ┌────────────────────────┼────────────────────────┐           │
│           │                        │                        │           │
│    ┌──────┴──────┐          ┌──────┴──────┐          ┌──────┴──────┐   │
│    │  Validation │          │   Helpers   │          │    RPC      │   │
│    │  Zod Schema │          │  item-help  │          │  Functions  │   │
│    └─────────────┘          └─────────────┘          └──────┬──────┘   │
└─────────────────────────────────────────────────────────────┼──────────┘
                                                              │
┌─────────────────────────────────────────────────────────────┼──────────┐
│                         DATABASE (Supabase)                  │          │
├─────────────────────────────────────────────────────────────┼──────────┤
│                                                              │          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────┴───────┐ │
│  │  listings   │  │   trades    │  │  inventory  │  │ RPC Functions │ │
│  │  proposals  │  │   offers    │  │  purchases  │  │ execute_trade │ │
│  │  config     │  │   chat      │  │  templates  │  │ purchase_item │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────────┘ │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                    Row Level Security (RLS)                     │   │
│  │  - Students see own data + school listings                      │   │
│  │  - Teachers see class data                                      │   │
│  │  - Admins have full access                                      │   │
│  └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### Purchase Flow

```
Student                 Shop Store                API                    Database
   │                       │                       │                        │
   │──[Click Purchase]────>│                       │                        │
   │                       │                       │                        │
   │                       │──[Optimistic UI]─────>│                        │
   │<──[Show pending]──────│                       │                        │
   │                       │                       │                        │
   │                       │──[POST /shop/purchase]─────────────────────────>│
   │                       │                       │                        │
   │                       │                       │──[RPC: purchase_shop_item]──>│
   │                       │                       │        │               │
   │                       │                       │        │──[Lock row]───>│
   │                       │                       │        │──[Check bal]──>│
   │                       │                       │        │──[Check lim]──>│
   │                       │                       │        │──[Deduct]─────>│
   │                       │                       │        │──[Create inv]─>│
   │                       │                       │        │──[Log purch]──>│
   │                       │                       │<───────[Return result]──│
   │                       │                       │                        │
   │                       │<──[PurchaseResponse]──│                        │
   │                       │                       │                        │
   │<──[Toast + Update UI]─│                       │                        │
   │                       │                       │                        │
```

### Trade Execution Flow

```
Initiator              Partner              API                 Database
    │                    │                   │                      │
    │──[Accept Offer]────────────────────────>│                      │
    │                    │                   │                      │
    │                    │                   │──[POST /trades/{id}/accept]──>│
    │                    │                   │        │              │
    │                    │                   │        │──[Lock trade]─>│
    │                    │                   │        │──[Verify bal]──>│
    │                    │                   │        │──[Transfer cards]─>│
    │                    │                   │        │──[Transfer gid]────>│
    │                    │                   │        │──[Update status]───>│
    │                    │                   │        │──[Unlock cards]────>│
    │                    │                   │<───────[Return result]───────│
    │                    │                   │                      │
    │<──[Realtime: trade_updated]────────────│                      │
    │                    │<──[Realtime]──────│                      │
    │                    │                   │                      │
```

### Listing Creation Flow

```
Student               Store                  API                 Database
   │                    │                     │                      │
   │──[Create Listing]──>│                     │                      │
   │                    │                     │                      │
   │                    │──[Validate locally]─│                      │
   │                    │                     │                      │
   │                    │──[Lock cards in UI]─│                      │
   │                    │                     │                      │
   │                    │──[POST /listings]────────────────────────────>│
   │                    │                     │                      │
   │                    │                     │──[Validate Zod]──────│
   │                    │                     │                      │
   │                    │                     │──[Check auth]────────│
   │                    │                     │                      │
   │                    │                     │──[Check limits]──────>│
   │                    │                     │                      │
   │                    │                     │──[Lock cards DB]─────>│
   │                    │                     │                      │
   │                    │                     │──[Create listing]────>│
   │                    │                     │                      │
   │                    │<──[ListingResponse]──│                      │
   │                    │                     │                      │
   │<──[Update UI]──────│                     │                      │
   │                    │                     │                      │
   │                    │<──[Realtime: listing_created]───────────────│
   │                    │                     │                      │
```

## Component Hierarchy

### Student Marketplace Page

```
+page.svelte (Student Marketplace)
│
├── Stats Bar
│   ├── Gidouilles Balance
│   ├── Active Listings Count
│   └── Active Trades Count
│
├── Tabs.Root
│   │
│   ├── Tab: Shop
│   │   └── ShopBrowse
│   │       ├── Search Input
│   │       ├── ShopCategoryFilter
│   │       ├── Items Grid
│   │       │   └── ShopItemCard (multiple)
│   │       └── ShopPurchaseModal
│   │
│   └── Tab: Exchanges
│       └── Tabs.Root (nested)
│           ├── Tab: Browse
│           │   ├── MarketplaceListings
│           │   │   └── MarketplaceListingCard (multiple)
│           │   └── ListingDetailsModal
│           │
│           ├── Tab: My Listings
│           │   ├── MyListings
│           │   └── ProposalResponseModal
│           │
│           └── Tab: My Trades
│               ├── MyTrades
│               └── TradeNegotiationModal
│
└── CreateListingModal
```

### Teacher Admin Page

```
+page.svelte (Teacher Marketplace Admin)
│
├── Page Header
│   └── Configuration Button -> MarketplaceSettings
│
├── Tabs.Root
│   ├── Tab: Overview -> MarketplaceStats
│   ├── Tab: Analytics -> MarketplaceAnalytics
│   ├── Tab: Trade History -> TradeHistoryTable
│   ├── Tab: Activity -> ActivityFeed
│   └── Tab: Listings -> ListingsMonitor
│
└── MarketplaceSettings (Modal)
```

## Module Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                        Page Components                          │
│  +page.svelte (student)      +page.svelte (teacher)            │
└───────────────────┬─────────────────────┬───────────────────────┘
                    │                     │
          ┌─────────┴─────────┐   ┌───────┴───────┐
          │                   │   │               │
          ▼                   ▼   ▼               ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ Marketplace     │   │ Shop            │   │ Teacher         │
│ Components      │   │ Components      │   │ Components      │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         └──────────┬──────────┴──────────┬──────────┘
                    │                     │
                    ▼                     ▼
          ┌─────────────────┐   ┌─────────────────┐
          │ marketplace     │   │ shop            │
          │ .svelte.ts      │   │ .svelte.ts      │
          └────────┬────────┘   └────────┬────────┘
                   │                     │
                   └──────────┬──────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Shared          │
                    │ Types/Validation│
                    │ Helpers/Realtime│
                    └─────────────────┘
```

## Technology Stack

| Layer        | Technology            | Purpose                         |
| ------------ | --------------------- | ------------------------------- |
| UI Framework | Svelte 5              | Reactive components with runes  |
| State        | Svelte Runes          | `$state`, `$derived`, `$effect` |
| Styling      | Tailwind CSS 4        | Utility-first CSS               |
| Components   | Shadcn-svelte         | UI component library            |
| Routing      | SvelteKit             | File-based routing              |
| API          | SvelteKit Endpoints   | `+server.ts` handlers           |
| Validation   | Zod                   | Schema validation               |
| Database     | Supabase (PostgreSQL) | Data storage                    |
| Realtime     | Supabase Realtime     | Live updates                    |
| Auth         | Supabase Auth         | Authentication                  |
| Hosting      | Vercel                | Deployment                      |
