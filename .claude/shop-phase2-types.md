# Shop System - Phase 2: TypeScript Types & Validation

**Status**: COMPLETED
**Date**: 2025-11-21

## Files Created

### 1. `src/lib/types/shop.ts`

Complete TypeScript types for the shop system.

#### Enum Types
- `ShopItemCategory`: 'consumable' | 'booster' | 'cosmetic' | 'utility'
- `ShopItemRarity`: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
- `ItemAcquisitionSource`: 'shop' | 'trade' | 'reward' | 'gift' | 'migration'

#### JSONB Property Types
- `ShopItemProperties` - Flexible item config (stackable, uses, game, effect, etc.)
- `ItemAcquisitionData` - How item was acquired
- `ItemInstanceData` - Instance-specific data
- `PurchaseContextData` - Purchase audit context
- `ItemUsageData` - Usage tracking data
- `ItemEffectData` - Effect application results

#### Database Entity Types
- `ShopItemTemplate` - Admin-defined templates
- `StudentItemInventory` - Student-owned items
- `ShopPurchaseHistory` - Purchase audit trail
- `ItemUsageLog` - Usage tracking

#### Extended Types (with joins)
- `ShopItemWithStatus` - Template + computed fields
- `StudentItemWithTemplate` - Inventory + template
- `InventoryItemWithLockStatus` - With lock reason
- `PurchaseHistoryWithItem` - Purchase + template

#### API Types
Request types:
- `PurchaseRequest`, `UseItemRequest`, `EquipItemRequest`
- `CreateShopItemRequest`, `UpdateShopItemRequest`
- `RefundPurchaseRequest`, `LockItemsRequest`, `UnlockItemsRequest`

Response types:
- `PurchaseResponse`, `UseItemResponse`, `EquipItemResponse`
- `RefundResponse`, `LockItemsResponse`

Query types:
- `ShopItemsQuery`, `InventoryQuery`
- `PurchaseHistoryQuery`, `UsageLogQuery`

Stats types:
- `ShopStats`, `InventoryStats`

### 2. `src/lib/validation/shop.ts`

Complete Zod validation schemas with French error messages.

#### Enum Schemas
- `shopItemCategorySchema`
- `shopItemRaritySchema`
- `itemAcquisitionSourceSchema`

#### Property Schemas
- `shopItemPropertiesSchema` (with passthrough)
- `itemAcquisitionDataSchema`
- `itemInstanceDataSchema`

#### API Schemas
- `purchaseRequestSchema` - Purchase validation
- `useItemRequestSchema` - Item usage validation
- `equipItemRequestSchema` - Equip toggle
- `createShopItemSchema` - Admin create (with refinements)
- `updateShopItemSchema` - Admin update
- `refundPurchaseSchema` - Refund validation

#### Query Schemas
- `shopItemsQuerySchema` - Shop listing filters
- `inventoryQuerySchema` - Inventory filters
- `purchaseHistoryQuerySchema` - Purchase history filters
- `usageLogQuerySchema` - Usage log filters

#### Lock Schemas
- `lockItemsRequestSchema` - XOR validation for listing_id/trade_id
- `unlockItemsRequestSchema` - Unlock validation

#### Admin Schemas
- `adminShopStatsQuerySchema`
- `adminInventorySearchSchema`
- `adminGrantItemSchema`
- `adminRemoveItemSchema`

#### Inferred Types
All schemas export inferred types: `PurchaseRequestData`, `CreateShopItemData`, etc.

## Validation Features

- French error messages for user-facing errors
- UUID validation for all IDs
- Range limits (quantity 1-100, price 1-100000, etc.)
- Date validation (available_from < available_until)
- XOR validation (listing_id OR trade_id, not both)
- Passthrough for flexible JSONB properties

## To Resume

If crash after this phase:
1. Types are in `src/lib/types/shop.ts`
2. Validation schemas are in `src/lib/validation/shop.ts`
3. Continue to **Phase 3: API Shop Endpoints**

## Next Steps

- Create `GET /api/shop/items` endpoint
- Create `POST /api/shop/purchase` endpoint
- Create `GET /api/shop/purchase-history` endpoint
