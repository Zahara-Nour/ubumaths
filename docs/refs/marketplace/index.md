# Marketplace Technical Reference

> Complete technical documentation for the UbuMaths Marketplace and Shop systems.

## Overview

The UbuMaths marketplace is a comprehensive trading system enabling students to:

1. **Shop**: Purchase items using gidouilles (virtual currency)
2. **Trade**: Exchange VIP cards and gidouilles through public listings or friend-to-friend trades

The system consists of two interconnected subsystems:

| Subsystem       | Purpose          | Key Features                                |
| --------------- | ---------------- | ------------------------------------------- |
| **Marketplace** | VIP Card Trading | Public listings, proposals, friend trades   |
| **Shop**        | Item Purchases   | Consumables, boosters, cosmetics, utilities |

## Documentation Structure

| Document                                  | Description                                    |
| ----------------------------------------- | ---------------------------------------------- |
| [Architecture](./architecture.md)         | System design, data flows, component hierarchy |
| [Database Schema](./database-schema.md)   | Tables, relationships, RLS policies            |
| [API Reference](./api-reference.md)       | All endpoints with request/response schemas    |
| [Components](./components.md)             | UI components and their props                  |
| [State Management](./state-management.md) | Stores, realtime subscriptions, patterns       |
| [Security](./security.md)                 | RLS, validation, authorization patterns        |
| [Business Logic](./business-logic.md)     | Rules, limits, currency system                 |

## Quick Reference

### File Locations

```
src/
├── routes/
│   ├── (protected)/dashboard/student/marketplace/  # Student UI
│   ├── (protected)/dashboard/teacher/marketplace/  # Teacher admin
│   └── api/
│       ├── marketplace/                            # Trading API
│       └── shop/                                   # Shop API
├── lib/
│   ├── components/
│   │   ├── marketplace/                            # Trading components
│   │   └── shop/                                   # Shop components
│   ├── stores/
│   │   ├── marketplace.svelte.ts                   # Trading state
│   │   └── shop.svelte.ts                          # Shop state
│   ├── types/
│   │   ├── marketplace.ts                          # Trading types
│   │   └── shop.ts                                 # Shop types
│   ├── validation/
│   │   ├── marketplace.ts                          # Trading schemas
│   │   └── shop.ts                                 # Shop schemas
│   └── server/marketplace/                         # Server helpers
└── supabase/migrations/
    ├── 20251114082611_marketplace_foundation.sql   # Core tables
    ├── 20251121080310_create_shop_system.sql       # Shop tables
    └── 20251208203911_marketplace_teacher_admin_rls.sql  # RLS
```

### Key Database Tables

| Table                      | Purpose                     |
| -------------------------- | --------------------------- |
| `marketplace_config`       | School/class configuration  |
| `marketplace_listings`     | Public buy/sell listings    |
| `marketplace_proposals`    | Responses to listings       |
| `marketplace_trades`       | Active and completed trades |
| `marketplace_locked_cards` | Prevents double-spending    |
| `shop_item_templates`      | Admin-defined shop items    |
| `student_item_inventory`   | Student-owned items         |
| `shop_purchase_history`    | Purchase audit trail        |

### API Endpoints Summary

| Endpoint                                   | Methods          | Purpose                 |
| ------------------------------------------ | ---------------- | ----------------------- |
| `/api/marketplace/listings`                | GET, POST        | Browse/create listings  |
| `/api/marketplace/listings/[id]`           | GET, DELETE      | Manage specific listing |
| `/api/marketplace/listings/[id]/proposals` | GET, POST        | Listing proposals       |
| `/api/marketplace/proposals/[id]`          | GET, PUT, DELETE | Manage proposals        |
| `/api/marketplace/trades`                  | GET, POST        | Browse/create trades    |
| `/api/marketplace/trades/[id]`             | GET, DELETE      | Manage specific trade   |
| `/api/marketplace/trades/[id]/accept`      | POST             | Accept trade offer      |
| `/api/marketplace/trades/[id]/offers`      | POST             | Submit counter-offer    |
| `/api/shop/items`                          | GET              | List shop items         |
| `/api/shop/purchase`                       | POST             | Purchase item           |
| `/api/shop/purchase-history`               | GET              | View purchase history   |

## Related Documentation

- [Rewards System](../rewards/) - Gidouilles earning mechanics
- [VIP Cards](../../features/vip-cards.md) - VIP card system
- [Realtime](../../claude/realtime.md) - Supabase realtime patterns
