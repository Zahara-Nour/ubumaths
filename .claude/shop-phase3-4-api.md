# Shop System - Phase 3-4: API Endpoints

**Status**: Phase 3 COMPLETED, Phase 4 PENDING
**Date**: 2025-11-21

## Phase 3: Shop API Endpoints

### Files Created

#### 1. `src/routes/api/shop/items/+server.ts`
**GET** - List available shop items

- Validates query params with `shopItemsQuerySchema`
- Student-only access
- Uses `get_shop_items` RPC for efficient queries
- Returns paginated `ShopItemWithStatus[]`
- Supports filtering by category, rarity, search term

#### 2. `src/routes/api/shop/items/[id]/+server.ts`
**GET** - Get single shop item details

- UUID validation for path parameter
- Available to all authenticated users
- Returns `ShopItemWithStatus` with purchase eligibility
- Checks all purchase limits (daily, weekly, cooldown, ownership)

#### 3. `src/routes/api/shop/purchase/+server.ts`
**POST** - Purchase an item

- Student-only endpoint
- Validates with `purchaseRequestSchema`
- Calls `purchase_shop_item` RPC for atomic transaction
- Captures audit context (IP, user agent)
- Returns `PurchaseResponse` with new balance

#### 4. `src/routes/api/shop/purchase-history/+server.ts`
**GET** - View purchase history

- Multi-role support:
  - Students: own history only
  - Teachers: their students' history
  - Admins: any student's history
- Validates with `purchaseHistoryQuerySchema`
- Returns `PurchaseHistoryWithItem[]` with joined template data

### Security Features

- All inputs validated with Zod schemas
- Role-based access control
- `verifyTeacherStudentWithRole()` for teacher access
- Generic error messages (no database error disclosure)
- Audit trails with IP tracking

### API Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/shop/items` | GET | Student | List shop items |
| `/api/shop/items/[id]` | GET | Auth | Get item details |
| `/api/shop/purchase` | POST | Student | Purchase item |
| `/api/shop/purchase-history` | GET | Multi-role | Purchase history |

## Phase 4: Inventory API Endpoints (COMPLETED)

### Files Created

#### 1. `src/routes/api/inventory/+server.ts`
**GET** - Get student's inventory

- Query params: student_id, template_id, category, equipped_only, include_expired
- Returns `StudentItemWithTemplate[]` with joined template data
- Multi-role support:
  - Students: own inventory only
  - Teachers: their students' inventory
  - Admins: any student's inventory
- Uses `verifyTeacherStudentWithRole` middleware

#### 2. `src/routes/api/inventory/[id]/+server.ts`
**GET** - Get single inventory item
- Returns full item with template details
- Owner only

**PATCH** - Equip/unequip item
- Body: `{ equip: boolean }`
- Only cosmetics/boosters can be equipped
- Locked items cannot be equipped
- Owner only

#### 3. `src/routes/api/inventory/[id]/use/+server.ts`
**POST** - Use consumable item

- Body: `{ context: string, usage_data?: object }`
- Calls `use_item` RPC
- Handles quantity/uses decrement
- Removes item when depleted
- Owner only

## To Resume

If crash after Phase 3:
1. Shop API endpoints are complete
2. Continue to **Phase 4: Inventory API Endpoints**

If crash during Phase 4:
1. Check which inventory endpoints exist
2. Complete remaining endpoints
3. Continue to **Phase 5: Marketplace Integration**

## Dependencies

- Types: `src/lib/types/shop.ts`
- Validation: `src/lib/validation/shop.ts`
- Database: `supabase/migrations/20251121080310_create_shop_system.sql`
