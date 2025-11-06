# VIP Card Multi-Draw System

> 🆕 2025-11-04

Comprehensive multi-card VIP drawing system with two payment methods, race condition protection, and adaptive animations.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [Security](#security)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Overview

The VIP Card Multi-Draw System allows teachers to draw multiple VIP cards (1-10 at once) for students with comprehensive security protections. Students can also draw cards for themselves in the future.

### What It Does

- **Multi-Card Drawing**: Draw 1-10 VIP cards in a single transaction
- **Two Payment Methods**: Pay with gidouilles or consume a VIP card with `draw_cards` action
- **Adaptive Animations**: Holographic reveal for 1-3 cards, batch grid for 4+ cards
- **Race Condition Protection**: `SELECT FOR UPDATE` prevents double-spend exploits
- **Security-First Design**: Students cannot draw free cards, proportional cost validation, authorization checks

### User Flow

```
Teacher Rewards Page
  └─> Click "Tirer des cartes" button
      └─> VipCardDrawModal opens (fullscreen)
          ├─> Payment selection (gidouilles or VIP card)
          ├─> Count selection (1-10 cards)
          ├─> API call with optimistic UI update
          ├─> Adaptive animation plays
          │   ├─> 1-3 cards: Holographic reveal with stagger
          │   └─> 4+ cards: Batch grid reveal
          ├─> "Continuer" button appears
          └─> Returns to rewards page with updated cache
```

---

## Key Features

### 1. Two Payment Methods

#### Gidouilles Payment

- Deduct gidouilles from student balance
- Cost validation: max 10 gidouilles per card
- Students CANNOT draw free cards (cost=0 blocked)
- Teachers/admins CAN draw free cards

#### VIP Card Payment

- Consume an existing VIP card with `draw_cards` action
- Validates card exists and is not already used
- Marks card as used atomically
- Future: validate card has correct action type

### 2. Race Condition Protection

The system uses PostgreSQL's `SELECT FOR UPDATE` to prevent double-spend attacks:

```sql
-- Lock student profile row to prevent concurrent modifications
SELECT gidouilles, vip_cards
FROM profiles
WHERE id = p_student_id
FOR UPDATE;
```

**Attack Prevention**:

- Student has 10 gidouilles
- Makes 2 simultaneous API calls, each trying to spend 10 gidouilles
- Result: One succeeds, other fails with "Insufficient gidouilles"
- Final balance: 0 (not -10)

### 3. Adaptive Animations

**Holographic Reveal (1-3 cards)**:

- Full-screen presentation
- Cards appear sequentially with stagger
- Holographic shimmer effect
- Perfect for small draws

**Batch Grid Reveal (4+ cards)**:

- Compact grid layout (up to 3 columns)
- All cards revealed simultaneously
- Scales elegantly to 10 cards
- Efficient for bulk draws

### 4. Optimistic UI Updates

The system provides instant visual feedback through optimistic cache updates for all payment methods.

**Gidouilles Payment:**

```typescript
// Immediate UI feedback - deduct gidouilles
teacherCache.updateGidouillesOptimistic(classId, studentId, -cost);

// Rollback on error
catch (err) {
  teacherCache.updateGidouillesOptimistic(classId, studentId, cost);
}
```

**VIP Card Payment (draw_cards action):**

```typescript
// Mark the used VIP card as consumed immediately in cache
if (paymentMethod === 'vip_card' && usedCardInstanceId) {
	const updatedVipCards = { ...currentVipCards };
	updatedVipCards[usedCardInstanceId] = {
		...updatedVipCards[usedCardInstanceId],
		usedAt: new Date().toISOString()
	};
	teacherCache.updateVipCardsOptimistic(classId, studentId, updatedVipCards);
}
```

**Adding Drawn Cards to Cache:**

```typescript
// Merge new cards with existing cards
const updatedVipCards = { ...studentRewards.vip_cards };

// Add newly drawn cards
for (const card of result.cards) {
	updatedVipCards[card.instanceId] = {
		cardId: card.cardId,
		earnedAt: card.earnedAt,
		usedAt: null
	};
}

teacherCache.updateVipCardsOptimistic(classId, studentId, updatedVipCards);
```

**Result:**

- Gidouilles decrease instantly when drawing with gidouilles
- Used card disappears immediately when drawing with VIP card (draw_cards action)
- New cards appear in cache immediately after draw completes
- No page refresh needed to see changes

### 5. Modal Stack Integration

The system uses a generic modal stack for navigation:

```typescript
import { openVipCardDrawModal } from '$lib/utils/vip-card-modals';

openVipCardDrawModal({
	studentId: '123',
	count: 3,
	paymentMethod: 'gidouilles',
	gidouillesCost: 15,
	onComplete: () => console.log('Cards drawn!')
});
```

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Client)                         │
├─────────────────────────────────────────────────────────────┤
│  Teacher Rewards Page                                        │
│    └─> openVipCardDrawModal() helper                        │
│        └─> modalStack.push(VipCardDrawModal)                │
│            ├─> VipCardMultiHoloReveal (1-3 cards)           │
│            └─> VipCardBatchReveal (4+ cards)                │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTP POST
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Server)                        │
├─────────────────────────────────────────────────────────────┤
│  /api/rewards/draw-vip-cards (+server.ts)                   │
│    ├─> Authentication check                                 │
│    ├─> Zod validation (discriminated union)                 │
│    └─> RPC call: draw_multiple_vip_cards()                  │
└─────────────────────────────────────────────────────────────┘
                          ↓ RPC
┌─────────────────────────────────────────────────────────────┐
│                 Database (PostgreSQL)                        │
├─────────────────────────────────────────────────────────────┤
│  draw_multiple_vip_cards(                                    │
│    p_student_id, p_count, p_payment_method,                 │
│    p_gidouilles_cost, p_vip_card_instance_id                │
│  )                                                           │
│    ├─> 1. Validate input (count, method)                    │
│    ├─> 2. Authorization (teacher/student check)             │
│    ├─> 3. SELECT FOR UPDATE (lock profile)                  │
│    ├─> 4. Process payment (gidouilles or VIP card)          │
│    ├─> 5. Draw random cards (uniform distribution)          │
│    ├─> 6. Update profile (atomic commit)                    │
│    └─> 7. Return JSONB: {cards: [...]}                      │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── routes/
│   └── api/rewards/draw-vip-cards/
│       ├── +server.ts              # API endpoint
│       └── +server.test.ts         # Comprehensive tests (919 lines)
├── lib/
│   ├── components/rewards/
│   │   ├── VipCardDrawModal.svelte           # Main modal
│   │   ├── VipCardMultiHoloReveal.svelte     # 1-3 cards animation
│   │   └── VipCardBatchReveal.svelte         # 4+ cards animation
│   ├── stores/
│   │   └── modalStack.svelte.ts              # Generic modal stack
│   ├── utils/
│   │   └── vip-card-modals.ts                # Helper functions
│   └── server/validation/
│       └── draw-vip-cards.ts                 # Zod schemas

supabase/migrations/
└── 20251104091315_add_draw_multiple_vip_cards_function.sql
```

### Data Flow

#### Successful Gidouilles Draw (3 cards, cost 15)

```
1. User clicks "Tirer 3 cartes" (15 gidouilles)
   ↓
2. openVipCardDrawModal({ count: 3, paymentMethod: 'gidouilles', gidouillesCost: 15 })
   ↓
3. Modal opens → handleDraw() called in $effect()
   ↓
4. Optimistic update: gidouilles -= 15 in cache
   ↓
5. POST /api/rewards/draw-vip-cards
   Body: { studentId, count: 3, paymentMethod: 'gidouilles', gidouillesCost: 15 }
   ↓
6. Zod validation (drawVipCardsSchema)
   ↓
7. RPC: draw_multiple_vip_cards(p_student_id, 3, 'gidouilles', 15, null)
   ├─> Authorization: verify teacher owns student's class
   ├─> SELECT FOR UPDATE: lock profile row
   ├─> Balance check: gidouilles >= 15
   ├─> Deduct: gidouilles -= 15
   ├─> Draw 3 random cards (rarity-weighted distribution)
   ├─> Add cards to vip_cards JSONB
   └─> UPDATE profiles (atomic commit)
   ↓
8. Response: { cards: [{ cardId, instanceId, earnedAt }, ...] }
   ↓
9. Update cache with new cards (optimistic)
   ├─> Merge new cards into existing vip_cards
   └─> Cards now appear immediately in VipCardsModal
   ↓
10. Trigger animation (VipCardMultiHoloReveal for 3 cards)
    ↓
11. Show "Continuer" button → modalStack.pop()
    ↓
12. Return to rewards page (cache updated, no reload needed)
```

#### Successful VIP Card Draw (5 cards using "Soldes" card)

```
1. User opens VipCardsModal, clicks "Utiliser" on Soldes card
   ↓
2. openVipCardDrawModal({
     count: 5,
     paymentMethod: 'vip_card',
     vipCardInstanceId: 'uuid-of-soldes',
     usedCardInstanceId: 'uuid-of-soldes'  // NEW: Track which card to mark as used
   })
   ↓
3. Modal opens → handleDraw() called in $effect()
   ↓
4. POST /api/rewards/draw-vip-cards
   Body: { studentId, count: 5, paymentMethod: 'vip_card', vipCardInstanceId: 'uuid' }
   ↓
5. Zod validation (drawVipCardsSchema)
   ↓
6. RPC: draw_multiple_vip_cards(p_student_id, 5, 'vip_card', null, 'uuid-of-soldes')
   ├─> Authorization: verify teacher owns student's class
   ├─> SELECT FOR UPDATE: lock profile row
   ├─> Validate VIP card exists and not already used
   ├─> Mark VIP card as used: vip_cards['uuid'].usedAt = NOW()
   ├─> Draw 5 random cards (rarity-weighted distribution)
   ├─> Add cards to vip_cards JSONB
   └─> UPDATE profiles (atomic commit)
   ↓
7. Response: { cards: [{ cardId, instanceId, earnedAt }, ...] }
   ↓
8. Update cache with changes (optimistic):
   ├─> Merge new 5 cards into existing vip_cards (appear immediately)
   └─> Mark Soldes card as used: usedAt = new Date().toISOString() (disappears immediately)
   ↓
9. Trigger animation (VipCardBatchReveal for 5 cards)
   ↓
10. Show "Continuer" button → modalStack.pop()
    ↓
11. Return to VipCardsModal:
    ├─> Used Soldes card no longer visible (filtered by usedAt)
    ├─> New 5 cards now visible with counts
    └─> No page refresh needed
```

#### Error Handling (Insufficient Balance)

```
1-6. Same as above
   ↓
7. RPC: draw_multiple_vip_cards(...)
   ├─> SELECT FOR UPDATE: lock profile
   ├─> Balance check: gidouilles (5) < cost (15)
   └─> RAISE EXCEPTION 'Insufficient gidouilles: Required 15, available 5 (shortfall: 10)'
   ↓
8. Error response (400)
   ↓
9. Rollback optimistic update: gidouilles += 15 in cache
   ↓
10. Show error message: "Gidouilles insuffisantes : 15 requis, 5 disponibles"
    ↓
11. Auto-close modal after 3 seconds
```

### Cache Integration

The system integrates with `teacherDashboardCache` for instant UI updates:

```typescript
// Optimistic gidouilles update
teacherCache.updateGidouillesOptimistic(classId, studentId, -cost);

// Update VIP cards cache
const updatedVipCards = { ...studentRewards.vip_cards };
for (const card of result.cards) {
	updatedVipCards[card.instanceId] = {
		cardId: card.cardId,
		earnedAt: card.earnedAt,
		usedAt: null
	};
}
teacherCache.updateVipCardsOptimistic(classId, studentId, updatedVipCards);
```

**Cache Keys**:

- Gidouilles: `class:{classId}:rewards` (updated immediately)
- VIP cards: Same key, different field
- TTL: 5 minutes (but updated optimistically)

---

## Usage Examples

### Example 1: Teacher Drawing 3 Cards with Gidouilles

```typescript
import { openVipCardDrawModal } from '$lib/utils/vip-card-modals';

// In teacher rewards page
function handleDrawCards(student: Student) {
	openVipCardDrawModal({
		studentId: student.id,
		count: 3,
		paymentMethod: 'gidouilles',
		gidouillesCost: 15, // 5 gidouilles per card
		studentName: student.full_name,
		classId: currentClass.id, // For cache updates
		onComplete: () => {
			console.log('Cards drawn successfully!');
			// Cache already updated, no need to reload
		}
	});
}
```

**Result**:

- Student's gidouilles: 50 → 35
- Student's VIP cards: +3 new cards
- Animation: Holographic reveal (3 cards)
- Cache: Updated instantly

### Example 2: Teacher Drawing Free Cards (Admin Feature)

```typescript
// Only teachers/admins can draw free cards
openVipCardDrawModal({
	studentId: student.id,
	count: 1,
	paymentMethod: 'gidouilles',
	gidouillesCost: 0, // FREE - students cannot do this
	studentName: student.full_name,
	classId: currentClass.id
});
```

**Security**: If a student tries this, RPC function will reject with:

```
"Unauthorized: Students cannot draw free cards (cost must be > 0)"
```

### Example 3: Using VIP Card to Draw More Cards

```typescript
// Student uses "Mega-soldes" card (draws 5 cards for free)
const megaSoldesInstanceId = 'uuid-of-mega-soldes-card';

openVipCardDrawModal({
	studentId: student.id,
	count: 5,
	paymentMethod: 'vip_card',
	vipCardInstanceId: megaSoldesInstanceId, // Card to consume (API)
	usedCardInstanceId: megaSoldesInstanceId, // Mark as used in cache (optimistic UI)
	studentName: student.full_name,
	classId: currentClass.id
});
```

**Result**:

- Mega-soldes card disappears immediately from UI (optimistic update)
- Backend marks card as used atomically
- +5 new VIP cards added and appear immediately in cache
- Animation: Batch grid reveal (5 cards)
- No page refresh needed to see changes

### Example 4: Maximum Draw (10 Cards)

```typescript
openVipCardDrawModal({
	studentId: student.id,
	count: 10,
	paymentMethod: 'gidouilles',
	gidouillesCost: 100, // Max: 10 gidouilles per card
	studentName: student.full_name,
	classId: currentClass.id
});
```

**Validation**:

- Count: 1-10 (Zod validation)
- Cost: max 10 × 10 = 100 gidouilles (RPC validation)
- Animation: Batch grid (3 columns, 4 rows)

### Example 5: Error Handling

```typescript
try {
	openVipCardDrawModal({
		studentId: student.id,
		count: 3,
		paymentMethod: 'gidouilles',
		gidouillesCost: 30,
		classId: currentClass.id,
		onComplete: () => {
			toaster.success('Cards drawn!');
		}
	});
} catch (err) {
	// Modal handles errors internally:
	// - Shows error message
	// - Rolls back optimistic updates
	// - Auto-closes after 3 seconds
	console.error('Draw failed:', err);
}
```

---

## API Reference

### `openVipCardDrawModal(options: DrawCardsOptions): string`

Open a modal that draws VIP cards for a student.

**Location**: `src/lib/utils/vip-card-modals.ts`

#### Parameters

```typescript
interface DrawCardsOptions {
	studentId: string; // Student's profile ID (UUID)
	count: number; // Number of cards to draw (1-10)
	paymentMethod: 'gidouilles' | 'vip_card';

	// Required if paymentMethod === 'gidouilles'
	gidouillesCost?: number; // Cost in gidouilles (0-100)

	// Required if paymentMethod === 'vip_card'
	vipCardInstanceId?: string; // UUID of VIP card to consume
	usedCardInstanceId?: string; // UUID of card instance to mark as used in cache (for optimistic UI)

	// Optional
	studentName?: string; // For display in modal
	classId?: string; // For cache optimistic updates
	filters?: DrawCardsFilters; // Optional filters for draw_cards action
	onComplete?: () => void; // Called when returning from modal
}
```

#### Returns

`string` - Modal ID (UUID) for tracking

#### Example

```typescript
const modalId = openVipCardDrawModal({
	studentId: '123-456-789',
	count: 3,
	paymentMethod: 'gidouilles',
	gidouillesCost: 15,
	studentName: 'Alice Dupont',
	classId: 'class-uuid',
	onComplete: () => console.log('Done!')
});
```

---

### `POST /api/rewards/draw-vip-cards`

API endpoint for drawing multiple VIP cards.

**Location**: `src/routes/api/rewards/draw-vip-cards/+server.ts`

#### Request Body (Gidouilles Payment)

```typescript
{
	studentId: string; // UUID
	count: number; // 1-10
	paymentMethod: 'gidouilles';
	gidouillesCost: number; // 0-100
}
```

#### Request Body (VIP Card Payment)

```typescript
{
	studentId: string; // UUID
	count: number; // 1-10
	paymentMethod: 'vip_card';
	vipCardInstanceId: string; // UUID
}
```

#### Response (Success)

```typescript
{
  cards: [
    {
      cardId: string;      // e.g., "bonus", "captain"
      instanceId: string;  // UUID
      earnedAt: string;    // ISO 8601 timestamp
    },
    // ... more cards
  ]
}
```

**Status**: 200 OK

#### Response (Error)

```typescript
{
	message: string; // User-friendly error message
}
```

**Status Codes**:

- `400` - Validation error or insufficient resources
- `401` - Not authenticated
- `500` - Server error

#### Error Examples

```json
// Insufficient balance
{
  "message": "Insufficient gidouilles: Required 15, available 5 (shortfall: 10)"
}

// Student trying free cards
{
  "message": "Unauthorized: Students cannot draw free cards (cost must be > 0)"
}

// Cost exceeds limit
{
  "message": "Invalid gidouilles_cost: Maximum 30 gidouilles for 3 cards (received: 40)"
}

// VIP card already used
{
  "message": "VIP card already used: This card was used at 2025-11-04T10:30:00Z"
}

// Invalid count
{
  "message": "Must draw at least 1 card"
}
```

---

### `draw_multiple_vip_cards()` RPC Function

PostgreSQL function for secure card drawing.

**Location**: `supabase/migrations/20251104091315_add_draw_multiple_vip_cards_function.sql`

#### Signature

```sql
draw_multiple_vip_cards(
  p_student_id UUID,
  p_count INT,
  p_payment_method TEXT,
  p_gidouilles_cost INT DEFAULT NULL,
  p_vip_card_instance_id UUID DEFAULT NULL
) RETURNS JSONB
```

#### Parameters

| Parameter                | Type | Required    | Description                           |
| ------------------------ | ---- | ----------- | ------------------------------------- |
| `p_student_id`           | UUID | Yes         | Student's profile ID                  |
| `p_count`                | INT  | Yes         | Number of cards (1-10)                |
| `p_payment_method`       | TEXT | Yes         | `'gidouilles'` or `'vip_card'`        |
| `p_gidouilles_cost`      | INT  | Conditional | Required if method=gidouilles (0-100) |
| `p_vip_card_instance_id` | UUID | Conditional | Required if method=vip_card           |

#### Return Value

```json
{
	"cards": [
		{
			"cardId": "bonus",
			"instanceId": "uuid-1",
			"earnedAt": "2025-11-04T10:30:00Z"
		}
	]
}
```

#### Security Model

1. **Authorization**:
   - Teacher/admin: Can draw for students in their classes
   - Student: Can draw for themselves (future feature)
   - Unauthorized: Exception raised

2. **Payment Validation**:
   - Gidouilles: max 10 per card, cannot go negative
   - Students CANNOT draw free cards (cost=0)
   - Teachers/admins CAN draw free cards
   - VIP card: validates existence and not already used

3. **Race Condition Protection**:
   - `SELECT FOR UPDATE` locks profile row
   - Prevents concurrent balance modifications
   - Atomic commit ensures consistency

#### Exceptions

The function raises exceptions (PostgreSQL `RAISE EXCEPTION`) for:

- Invalid count: `"Invalid count: Must be between 1 and 10"`
- Invalid payment method: `"Invalid payment_method: Must be 'gidouilles' or 'vip_card'"`
- Unauthorized (student not in class): `"Unauthorized: Student is not in your classes"`
- Unauthorized (not teacher/student): `"Unauthorized: You can only draw cards for yourself or your students"`
- Insufficient balance: `"Insufficient gidouilles: Required X, available Y (shortfall: Z)"`
- Student drawing free cards: `"Unauthorized: Students cannot draw free cards (cost must be > 0)"`
- Cost exceeds limit: `"Invalid gidouilles_cost: Maximum X gidouilles for Y cards (received: Z)"`
- VIP card not found: `"VIP card not found: Instance ID X does not exist"`
- VIP card already used: `"VIP card already used: This card was used at X"`

---

## Security

### Critical Security Features

#### 1. Students Cannot Draw Free Cards

**Rule**: Only teachers/admins can draw free cards (cost=0).

**Enforcement**: RPC function checks `is_teacher_or_admin()` before allowing cost=0.

```sql
IF p_gidouilles_cost = 0 AND NOT v_is_teacher THEN
  RAISE EXCEPTION 'Unauthorized: Students cannot draw free cards (cost must be > 0)';
END IF;
```

**Why**: Prevents students from giving themselves unlimited cards.

#### 2. Race Condition Protection (Double Spend Prevention)

**Vulnerability**: Student makes 2 simultaneous API calls with insufficient balance.

**Attack Example**:

```
Student has 10 gidouilles
Request 1: Draw 1 card (cost 10)  ─┐
Request 2: Draw 1 card (cost 10)  ─┼─> Both check balance at same time
                                    └─> Both see 10 gidouilles
Result without protection: -10 gidouilles (exploit)
```

**Protection**: `SELECT FOR UPDATE`

```sql
SELECT gidouilles, vip_cards
INTO v_current_gidouilles, v_vip_cards
FROM profiles
WHERE id = p_student_id
FOR UPDATE;  -- ← Locks this row until transaction commits
```

**Result with protection**:

```
Request 1: Locks profile row → Balance check → Deducts 10 → Commits → Balance = 0
Request 2: Waits for lock → Balance check (sees 0) → Fails with "Insufficient gidouilles"
```

**Test Coverage**: See `tests/database/triggers/` for race condition tests (requires Docker Supabase).

#### 3. Proportional Cost Validation

**Rule**: Maximum 10 gidouilles per card.

**Enforcement**: RPC function validates `cost <= (count * 10)`.

```sql
IF p_gidouilles_cost > (p_count * 10) THEN
  RAISE EXCEPTION 'Invalid gidouilles_cost: Maximum % gidouilles for % cards',
    (p_count * 10), p_count;
END IF;
```

**Example**:

- 1 card: max 10 gidouilles ✅
- 3 cards: max 30 gidouilles ✅
- 1 card, cost 50: ❌ Rejected

**Why**: Prevents teachers from accidentally charging 1000 gidouilles for 1 card.

#### 4. Authorization Model

**Teacher Authorization**:

```sql
-- Verify student is in teacher's classes
SELECT EXISTS (
  SELECT 1
  FROM class_members cm
  INNER JOIN classes c ON c.id = cm.class_id
  WHERE cm.student_id = p_student_id
    AND c.teacher_id = auth.uid()
) INTO v_student_in_class;

IF NOT v_student_in_class THEN
  RAISE EXCEPTION 'Unauthorized: Student is not in your classes';
END IF;
```

**Student Authorization** (future):

```sql
IF auth.uid() = p_student_id THEN
  v_is_authorized := TRUE;
END IF;
```

#### 5. Input Validation (Defense in Depth)

**Layer 1: Zod Schema (API)**

```typescript
const drawVipCardsSchema = z.discriminatedUnion('paymentMethod', [
	z.object({
		studentId: z.string().uuid(),
		count: z.number().int().min(1).max(10).finite(),
		paymentMethod: z.literal('gidouilles'),
		gidouillesCost: z.number().int().min(0).max(100).finite()
	}),
	z.object({
		studentId: z.string().uuid(),
		count: z.number().int().min(1).max(10).finite(),
		paymentMethod: z.literal('vip_card'),
		vipCardInstanceId: z.string().uuid()
	})
]);
```

**Layer 2: RPC Function Validation**

- Count: 1-10
- Payment method: 'gidouilles' or 'vip_card'
- Cost: proportional validation
- Balance: sufficient funds

**Why Two Layers**: Zod catches malformed requests early. RPC enforces business rules with database state.

#### 6. VIP Card Usage Validation

**Check 1: Card Exists**

```sql
v_card_instance := v_vip_cards->p_vip_card_instance_id::text;
IF v_card_instance IS NULL THEN
  RAISE EXCEPTION 'VIP card not found';
END IF;
```

**Check 2: Card Not Already Used**

```sql
v_card_used_at := v_card_instance->>'usedAt';
IF v_card_used_at IS NOT NULL THEN
  RAISE EXCEPTION 'VIP card already used: This card was used at %', v_card_used_at;
END IF;
```

**Atomic Mark as Used**

```sql
v_vip_cards := jsonb_set(
  v_vip_cards,
  ARRAY[p_vip_card_instance_id::text, 'usedAt'],
  to_jsonb(NOW()::text)
);
```

### Security Audit Checklist

- ✅ Students cannot draw free cards
- ✅ Race condition protection (SELECT FOR UPDATE)
- ✅ Proportional cost validation (max 10 gidouilles per card)
- ✅ Authorization checks (teacher-student relationship)
- ✅ Input validation (Zod + RPC)
- ✅ VIP card usage validation (exists, not used)
- ✅ Atomic transactions (all-or-nothing)
- ✅ Error messages don't leak sensitive data
- ✅ API endpoint requires authentication
- ✅ RLS policies on profiles table
- ⚠️ TODO: Validate VIP card has `draw_cards` action type

---

## Testing

### Test Suite Overview

**Location**: `src/routes/api/rewards/draw-vip-cards/+server.test.ts`

**Stats**:

- 919 lines of comprehensive tests
- 3 priority levels (P0, P1, P2)
- All critical security scenarios covered

### Test Categories

#### P0: Critical Security Tests

**Free Cards (cost=0) Security**:

- ❌ Student drawing free cards → Rejected
- ✅ Teacher drawing free cards → Allowed
- ✅ Admin drawing free cards → Allowed

**Cost Proportional Limit**:

- ❌ 1 card, cost 50 → Rejected (max 10)
- ❌ 3 cards, cost 40 → Rejected (max 30)
- ✅ 5 cards, cost 50 → Allowed (exactly at limit)

**Insufficient Balance**:

- ❌ Required 10, available 5 → Rejected
- ❌ Required 5, available 0 → Rejected

**VIP Card Already Used**:

- ❌ Using already-used card → Rejected

**VIP Card Not Found**:

- ❌ Non-existent instance ID → Rejected

**Unauthorized Access**:

- ❌ Unauthenticated request → Rejected (401)
- ❌ Student drawing for another student → Rejected
- ❌ Teacher drawing for student not in class → Rejected

**Invalid Count Boundaries**:

- ❌ count = 0 → Rejected (Zod)
- ❌ count = 11 → Rejected (Zod)
- ❌ count = -1 → Rejected (Zod)
- ✅ count = 1 → Allowed (minimum)
- ✅ count = 10 → Allowed (maximum)

#### P1: Input Validation Tests

**Zod Schema Validation**:

- ❌ Missing `studentId` → 400 error
- ❌ Invalid `studentId` (not UUID) → 400 error
- ❌ Missing `paymentMethod` → 400 error
- ❌ Invalid `paymentMethod` → 400 error
- ❌ Missing `gidouillesCost` when method=gidouilles → 400 error
- ❌ Missing `vipCardInstanceId` when method=vip_card → 400 error
- ❌ Negative `gidouillesCost` → 400 error
- ❌ `gidouillesCost` > 100 → 400 error
- ❌ Invalid `vipCardInstanceId` (not UUID) → 400 error

**Type Safety**:

- ❌ `studentId` as number → Rejected
- ❌ `count` as string → Rejected
- ❌ `gidouillesCost` as string → Rejected

#### P2: Functional Tests

**Successful Gidouilles Payment**:

- ✅ Draw 1 card with cost 5
- ✅ Draw 3 cards with cost 15
- ✅ Response structure validation

**Successful VIP Card Payment**:

- ✅ Draw 2 cards using VIP card
- ✅ Response structure validation

**Multiple Cards Draw**:

- ✅ Draw 5 cards
- ✅ Unique instanceIds validation
- ✅ Draw maximum 10 cards

**Error Handling**:

- ✅ RPC function errors
- ✅ Malformed JSON

### Race Condition Tests (Integration)

**Location**: `tests/database/triggers/` (requires Docker Supabase)

**Test Scenarios** (TODO):

1. **Double Spend Prevention**:
   - Student has 10 gidouilles
   - 2 simultaneous API calls, each spending 10 gidouilles
   - Expected: One succeeds, other fails
   - Final balance: 0 (not -10)

2. **VIP Card Double Use**:
   - Student has 1 VIP card
   - 2 simultaneous API calls with same `vipCardInstanceId`
   - Expected: One succeeds, other fails
   - Card used only once

### Running Tests

```bash
# Unit tests (API endpoint)
pnpm test:unit draw-vip-cards

# Integration tests (race conditions)
pnpm db:start              # Start Docker Supabase
pnpm test:triggers         # Run race condition tests
pnpm db:stop

# Full test suite
pnpm test
```

### Test Coverage

**Covered**:

- ✅ All validation rules
- ✅ All error messages
- ✅ All success paths
- ✅ All security checks
- ✅ All boundary conditions

**Not Covered** (integration tests required):

- ⚠️ Race condition scenarios (requires Docker Supabase)
- ⚠️ VIP card action type validation (feature not implemented)

---

## Troubleshooting

### Common Issues

#### Error: "Insufficient gidouilles"

**Symptom**: API returns 400 with message like:

```
"Insufficient gidouilles: Required 15, available 5 (shortfall: 10)"
```

**Cause**: Student doesn't have enough gidouilles.

**Solution**:

1. Check student's current balance in UI
2. Reduce `count` or `gidouillesCost`
3. Award more gidouilles first

**Prevention**: UI should disable button when balance < cost.

---

#### Error: "Students cannot draw free cards"

**Symptom**: API returns 400 with message:

```
"Unauthorized: Students cannot draw free cards (cost must be > 0)"
```

**Cause**: Student trying to draw with `gidouillesCost: 0`.

**Why**: Security feature - only teachers/admins can give free cards.

**Solution**: If you're a teacher, you should be authorized. Check:

1. Your role is `teacher` or `admin` (check `profiles` table)
2. You're calling the API with your auth token

---

#### Error: "VIP card already used"

**Symptom**: API returns 400 with message:

```
"VIP card already used: This card was used at 2025-11-04T10:30:00Z"
```

**Cause**: The `vipCardInstanceId` has already been consumed.

**Solution**:

1. Check card's `usedAt` field in database
2. Use a different VIP card instance
3. If this is unexpected, check for duplicate API calls

**Prevention**: UI should filter out used cards before showing selection.

---

#### Error: "Maximum X gidouilles for Y cards"

**Symptom**: API returns 400 with message:

```
"Invalid gidouilles_cost: Maximum 30 gidouilles for 3 cards (received: 40)"
```

**Cause**: Cost exceeds proportional limit (10 gidouilles per card).

**Solution**: Reduce `gidouillesCost` to max `count * 10`.

**Example**:

- 1 card: max 10
- 3 cards: max 30
- 10 cards: max 100

---

#### Error: "Student is not in your classes"

**Symptom**: API returns 400 with message:

```
"Unauthorized: Student is not in your classes"
```

**Cause**: Teacher trying to draw cards for student not in their classes.

**Solution**:

1. Verify student is in one of your classes (check `class_members` table)
2. If student should be in class, add them via admin tools
3. If you're not the teacher, contact the actual teacher

**Query to check**:

```sql
SELECT c.name, cm.student_id
FROM classes c
JOIN class_members cm ON cm.class_id = c.id
WHERE c.teacher_id = 'your-teacher-id'
  AND cm.student_id = 'student-id';
```

---

#### Modal Not Closing / Stuck

**Symptom**: Modal doesn't close after error or completion.

**Cause**: `modalStack.pop()` not called or error in `onReturn` callback.

**Solution**:

1. Check browser console for errors
2. Manually close: Open DevTools → Console → `modalStack.clear()`
3. Refresh page

**Prevention**: Errors auto-close after 3 seconds. Check error handling code.

---

#### Cache Out of Sync

**Symptom**: UI shows old gidouilles/cards after successful draw.

**Cause**: Optimistic update failed or cache not invalidated.

**Solution**:

1. Refresh page (cache TTL is 5 minutes)
2. Check `classId` prop is passed to modal
3. Verify `teacherCache.updateGidouillesOptimistic()` is called

**Debug**:

```typescript
// Check cache state
const rewards = teacherCache.getRewardsSync(classId);
console.log(rewards?.get(studentId));
```

---

#### Animation Not Playing

**Symptom**: Cards appear instantly without animation.

**Cause**: Animation component not rendering or CSS issue.

**Solution**:

1. Check `cards.length > 0` in modal
2. Verify `useMultiHolo` or `useBatch` is true
3. Check browser console for component errors
4. Ensure Tailwind CSS is loaded

**Debug**:

```svelte
{#if useMultiHolo}
	<p>Should show holographic reveal</p>
{:else if useBatch}
	<p>Should show batch grid</p>
{/if}
```

---

#### Race Condition Exploit

**Symptom**: Student balance goes negative after simultaneous requests.

**Cause**: `SELECT FOR UPDATE` not working (database misconfiguration).

**Solution**:

1. Verify PostgreSQL version >= 9.5 (supports `SELECT FOR UPDATE`)
2. Check transaction isolation level (should be READ COMMITTED)
3. Run integration tests: `pnpm test:triggers`

**Verify Protection**:

```sql
-- This should lock the row
BEGIN;
SELECT gidouilles FROM profiles WHERE id = 'student-id' FOR UPDATE;
-- Try to update from another session - should wait
COMMIT;
```

---

### Error Message Reference

| Error Message                        | Status | Cause                   | Fix                           |
| ------------------------------------ | ------ | ----------------------- | ----------------------------- |
| `Authentication required`            | 401    | No auth token           | Log in                        |
| `Invalid student ID`                 | 400    | Not UUID                | Fix `studentId` format        |
| `Must draw at least 1 card`          | 400    | count < 1               | Set count >= 1                |
| `Cannot draw more than 10 cards`     | 400    | count > 10              | Set count <= 10               |
| `Invalid payment_method`             | 400    | Not gidouilles/vip_card | Fix `paymentMethod`           |
| `Gidouilles cost cannot be negative` | 400    | cost < 0                | Set cost >= 0                 |
| `Insufficient gidouilles`            | 400    | Balance < cost          | Reduce cost or add gidouilles |
| `Students cannot draw free cards`    | 400    | Student with cost=0     | Only teachers can do this     |
| `Maximum X gidouilles for Y cards`   | 400    | Cost > count\*10        | Reduce cost                   |
| `VIP card not found`                 | 400    | Invalid instanceId      | Check card exists             |
| `VIP card already used`              | 400    | Card consumed           | Use different card            |
| `Student is not in your classes`     | 400    | Authorization failure   | Verify class membership       |
| `Internal server error`              | 500    | Unexpected error        | Check server logs             |

---

## Related Documentation

- [Teacher Dashboard Cache](../architecture/teacher-dashboard-cache.md) - Cache integration
- [Rewards System](./rewards-system.md) - Gidouilles and VIP cards overview
- [Database Schema](../architecture/database-schema.md) - RPC function details
- [Modal Stack](../architecture/modal-stack.md) - Modal navigation system
- [Best Practices](../claude/best-practices.md) - Using modalStack

---

## Integration Tests

The VIP card draw system includes comprehensive integration tests that verify race condition protection using a real Supabase instance.

**Location**: `tests/integration/draw-vip-cards-race-conditions.test.ts`

### Test Overview

**Status**: ✅ All 5 tests passing

The integration test suite verifies that `SELECT FOR UPDATE` correctly prevents double-spend and double-use exploits in concurrent scenarios.

**Test Scenarios**:

1. **Double-Spend Prevention** (2 simultaneous draws, insufficient balance)
   - Student has 10 gidouilles
   - Two API calls each try to spend 10 gidouilles
   - Result: One succeeds, one fails with "Insufficient gidouilles"
   - Final balance: 0 (not -10)

2. **Triple-Spend Scenario** (3 simultaneous draws, partial balance)
   - Student has 20 gidouilles
   - Three calls each try to spend 10 gidouilles
   - Result: Two succeed, one fails
   - Final balance: 0

3. **VIP Card Double-Use** (2 simultaneous uses of same card)
   - Student has 1 VIP card
   - Two calls try to use same card instance
   - Result: One succeeds, one fails with "VIP card already used"
   - Card marked as used exactly once

4. **VIP Card Triple-Use** (3 simultaneous uses of same card)
   - Student has 1 VIP card
   - Three calls try to use same card
   - Result: One succeeds, two fail
   - Card used exactly once

5. **Mixed Payments** (simultaneous gidouilles + VIP card)
   - Student has 10 gidouilles AND 1 VIP card
   - One call pays with gidouilles, one with VIP card
   - Result: Both succeed (different resources, no conflict)

### Running Integration Tests

**Prerequisites**:

- Supabase local must be running (Docker required)
- Test database seeded with proper auth users

**Commands**:

```bash
# Start Supabase local (one-time setup)
pnpm db:start

# Run integration tests
pnpm test:integration

# Watch mode (for development)
pnpm test:integration:watch

# Stop Supabase when done
pnpm db:stop
```

### Authentication Helpers

The integration tests use authenticated Supabase clients to properly test RPC authorization:

**Helper Function**: `createAuthenticatedClient(email, password?)`

```typescript
// Create authenticated client as student
const student = await TestData.profile().withRole('student').create();

const studentClient = await createAuthenticatedClient(student.email);

// Now RPC calls have proper auth.uid()
const { data, error } = await studentClient.rpc('draw_multiple_vip_cards', {
	p_student_id: student.id,
	p_count: 1,
	p_payment_method: 'gidouilles',
	p_gidouilles_cost: 10,
	p_vip_card_instance_id: null
});
```

**How it works**:

1. `insertAuthUser()` creates user in `auth.users` with hashed password
2. `createAuthenticatedClient()` signs in with test credentials
3. Returns authenticated client with valid session token
4. RPC functions see correct `auth.uid()` value

**Files**:

- `tests/database/helpers/supabase-client.ts` - Authentication helper (NEW)
- `tests/database/helpers/postgres-client.ts` - Updated `insertAuthUser()` with password parameter
- `tests/database/helpers/test-data-factory.ts` - Fixed `ProfileBuilder.create()` duplicate key bug

### Test Results

```
 ✓ tests/integration/draw-vip-cards-race-conditions.test.ts (5)
   ✓ POST /api/rewards/draw-vip-cards - Race Condition Tests (5)
     ✓ Gidouilles Double-Spend Prevention (2)
       ✓ should prevent double-spend when student makes 2 simultaneous draws with insufficient balance
       ✓ should handle 3 simultaneous draws with balance for only 2
     ✓ VIP Card Double-Use Prevention (2)
       ✓ should prevent double-use when student tries to use same VIP card twice simultaneously
       ✓ should prevent triple-use when 3 requests try to use same card simultaneously
     ✓ Mixed Race Conditions (1)
       ✓ should handle simultaneous gidouilles and VIP card payments without interference

Test Files  1 passed (1)
     Tests  5 passed (5)
  Start at  10:30:45
  Duration  2.34s
```

### What Tests Verify

**Race Condition Protection**:

- `SELECT FOR UPDATE` locks profile row during transaction
- Concurrent requests wait for lock before checking balance
- Only one request can modify balance at a time
- Database state remains consistent (no negative balances)

**Security**:

- Students cannot exploit timing to get free cards
- VIP cards cannot be used multiple times
- Authorization checks work correctly with authenticated clients
- Error messages are user-friendly and don't leak sensitive data

**Performance**:

- Tests complete in ~2 seconds (5 scenarios with cleanup)
- Sequential execution prevents test interference
- Proper cleanup ensures test isolation

### Documentation

For detailed implementation guide and troubleshooting:

- See: `tests/integration/draw-vip-cards-race-conditions.README.md`
- Architecture: Race condition protection with `SELECT FOR UPDATE`
- Setup: Creating authenticated test clients
- Debugging: Common issues and solutions

---

## Rarity-Weighted Distribution

**Status**: ✅ Implemented (2025-11-04)

The VIP card drawing system uses rarity-weighted probabilities instead of uniform distribution. This makes common cards more frequent and legendary cards truly rare.

### Overview

**Before** (uniform distribution):

- Every card: 1/26 ≈ 3.85% chance
- No rarity tiers
- Hard-coded card list in SQL

**After** (weighted distribution):

- Common: 60% (6 cards → ~10% each)
- Rare: 25% (9 cards → ~2.8% each)
- Epic: 12% (6 cards → ~2% each)
- Legendary: 3% (2 cards → ~1.5% each)

---

### Implementation

#### Two-Step Selection Process

1. **Step 1**: Roll 1-100 to select rarity tier (weighted)
2. **Step 2**: SELECT random card from chosen tier (uniform within tier)

**Example** (default config: 60/25/12/3):

```
Roll 1-60   → Common rarity   → SELECT random FROM {bonus, choix, bougeotte, jeu, soldes, super-soldes}
Roll 61-85  → Rare rarity     → SELECT random FROM {super-bonus, coup-double, ...}
Roll 86-97  → Epic rarity     → SELECT random FROM {mega-bonus, throne, fame, ...}
Roll 98-100 → Legendary rarity → SELECT random FROM {fortune, Sheikh}
```

#### Database Architecture

**Source of Truth**: `vip_card_templates` table (26 cards with rarity metadata)

**TypeScript Array**: `VIP_CARDS` in `src/lib/types/vip-card.ts` used for **UI display only**

**Configuration**: `vip_card_config` table (one active config at a time)

---

### Card Distribution

#### By Rarity (Total: 26 cards)

| Rarity    | Total  | Enabled | Disabled | Probability (Default) |
| --------- | ------ | ------- | -------- | --------------------- |
| Common    | 8      | 6       | 2        | 60%                   |
| Rare      | 10     | 9       | 1        | 25%                   |
| Epic      | 6      | 6       | 0        | 12%                   |
| Legendary | 2      | 2       | 0        | 3%                    |
| **Total** | **26** | **23**  | **3**    | **100%**              |

#### Enabled Cards (23 total)

**Common** (6): bonus, choix, bougeotte, jeu, soldes, super-soldes
**Rare** (9): super-bonus, coup-double, super-bougeotte, tranquilou, lalalalala, help, mathemagie, ecrabouilleur, inventeur, mega-soldes
**Epic** (6): mega-bonus, throne, fame, memoire, alchimie, batman
**Legendary** (2): fortune, Sheikh

#### Disabled Cards (3)

**Common** (2): candy, captain
**Rare** (1): team

These cards are commented out in the TypeScript `VIP_CARDS` array and marked `is_enabled: false` in the database. They are **never drawn** but can be re-enabled by admins.

---

### Configuration Management

#### View Active Configuration

```sql
SELECT
  config_name,
  common_probability,
  rare_probability,
  epic_probability,
  legendary_probability,
  description
FROM vip_card_config
WHERE is_active = TRUE;
```

#### Default Configuration

```sql
config_name: 'default'
common_probability: 60  -- 60% chance to draw common card
rare_probability: 25    -- 25% chance to draw rare card
epic_probability: 12    -- 12% chance to draw epic card
legendary_probability: 3 -- 3% chance to draw legendary card
```

#### Creating Special Event Configuration

**Example**: Christmas event with boosted epic/legendary drops

```sql
INSERT INTO vip_card_config (
  config_name,
  common_probability,
  rare_probability,
  epic_probability,
  legendary_probability,
  is_active,
  description,
  valid_from,
  valid_until
) VALUES (
  'christmas_2025',
  45, 25, 20, 10, -- Boosted epic (12→20%) and legendary (3→10%)
  FALSE, -- Not active yet
  'Christmas 2025: Gift-themed bonus drops',
  '2025-12-15 00:00:00+00',
  '2026-01-05 23:59:59+00'
);
```

#### Activating Event Configuration

**⚠️ Important**: Only ONE config can be active at a time.

```sql
-- Switch to event config
BEGIN;
UPDATE vip_card_config SET is_active = FALSE WHERE is_active = TRUE;
UPDATE vip_card_config SET is_active = TRUE WHERE config_name = 'christmas_2025';
COMMIT;
```

#### Returning to Default Configuration

```sql
BEGIN;
UPDATE vip_card_config SET is_active = FALSE WHERE config_name = 'christmas_2025';
UPDATE vip_card_config SET is_active = TRUE WHERE config_name = 'default';
COMMIT;
```

---

### Enabling/Disabling Cards

Admins can temporarily disable cards without deleting them. Disabled cards are **never drawn**, even if their rarity is rolled (system falls back to common cards).

#### Disable a Card

```sql
UPDATE vip_card_templates
SET is_enabled = FALSE
WHERE id = 'Sheikh'; -- Disable legendary Sheikh card
```

**Impact**: Sheikh will not appear in any draws until re-enabled.

#### Re-enable a Card

```sql
UPDATE vip_card_templates
SET is_enabled = TRUE
WHERE id = 'Sheikh';
```

#### View Disabled Cards

```sql
SELECT id, name, rarity, category
FROM vip_card_templates
WHERE is_enabled = FALSE;
-- Expected: candy (common), captain (common), team (rare)
```

---

### Testing

#### Statistical Validation

**Test**: `tests/integration/vip-card-rarity-distribution.test.ts`

Draws 10,000 cards and validates distribution matches config (±5% tolerance):

| Rarity    | Expected | Range (±5%)   | Validation |
| --------- | -------- | ------------- | ---------- |
| Common    | 6,000    | 5,700 - 6,300 | ✅ Passing |
| Rare      | 2,500    | 2,375 - 2,625 | ✅ Passing |
| Epic      | 1,200    | 1,140 - 1,260 | ✅ Passing |
| Legendary | 300      | 285 - 315     | ✅ Passing |

**Run tests**:

```bash
pnpm test:integration -- vip-card-rarity-distribution
```

#### Enabled/Disabled Filtering

**Test**: `tests/integration/vip-card-enabled-filtering.test.ts`

Validates:

- ✅ Disabled cards (candy, captain, team) never drawn
- ✅ Fallback to common when rarity has no enabled cards
- ✅ Error when ALL cards disabled: "No enabled VIP cards available"

**Run tests**:

```bash
pnpm test:integration -- vip-card-enabled-filtering
```

---

### Performance

**Overhead**: ~21ms for 10-card draw

- 1 config query: ~1ms
- 10 card queries: ~2ms each

**Optimization**:

- Config queried ONCE per RPC call (not per card)
- Indexes on `rarity` and `is_enabled` columns
- `ORDER BY random() LIMIT 1` for card selection

---

### Security

**RLS Policies**:

- `vip_card_templates`: Authenticated users can read, admins can modify
- `vip_card_config`: Authenticated users see active config only, admins see all

**Authorization**: Same as before (teacher/admin OR auth.uid() = student)

**Race Condition Protection**: `SELECT FOR UPDATE` on profiles table

---

### Backward Compatibility

**API Endpoint**: No changes (function signature unchanged)

**Function Call**:

```typescript
// Before and after: Same API
const { data } = await supabase.rpc('draw_multiple_vip_cards', {
	p_student_id: studentId,
	p_count: 10,
	p_payment_method: 'gidouilles',
	p_gidouilles_cost: 100,
	p_vip_card_instance_id: null
});
```

**Return Value**: Same structure (JSONB with `cards` array)

---

### Troubleshooting

#### Error: "No enabled VIP cards available to draw"

**Cause**: All cards in selected rarity are disabled, and fallback to common also failed (all common cards disabled).

**Solution**: Enable at least one common card:

```sql
UPDATE vip_card_templates
SET is_enabled = TRUE
WHERE rarity = 'common'
LIMIT 1;
```

#### Error: "Probabilities must sum to 100"

**Cause**: INSERT/UPDATE violates constraint.

**Solution**: Ensure probabilities sum to exactly 100:

```sql
-- ❌ This fails (45+25+15+10 = 95)
UPDATE vip_card_config SET common_probability = 45;

-- ✅ This works (45+30+15+10 = 100)
UPDATE vip_card_config
SET common_probability = 45,
    rare_probability = 30,
    epic_probability = 15,
    legendary_probability = 10
WHERE config_name = 'default';
```

#### Distribution Doesn't Match Expectations

**Symptom**: Drawing 100 cards gives unexpected rarity counts.

**Cause**: Small sample size (random variance).

**Solution**: Test with larger sample (N ≥ 1,000 for statistical validity):

```bash
pnpm test:integration -- vip-card-rarity-distribution
```

---

### Admin Resources

For detailed SQL commands and configuration management, see:
📚 **[Admin Guide: VIP Card Management](../guides/admin-vip-card-management.md)**

---

## Admin & Teacher Management

> 🆕 2025-11-04

### Admin Features

Admins can manage the VIP card system via `/dashboard/admin/vip-cards`:

**Template Management**:

- Create new card templates (ID, name, description, rarity, category, image)
- Edit existing cards (all fields except ID)
- Upload custom card images (WebP/PNG/JPEG format, max 2MB, stored in Supabase Storage)
- Enable/disable cards globally (toggle switch with optimistic UI)
- Delete cards (with cascade deletion of student instances and teacher overrides)

**Probability Configuration Management**:

- Create event configurations (special probability distributions for holidays/events)
- Edit configurations (probabilities must sum to 100%, validated in UI)
- Activate configurations (only one active at a time, atomic transaction)
- Delete inactive configurations (cannot delete active config)
- Set date ranges for temporary configs (valid_from, valid_until)

**Global Control**:

- If admin disables a card globally, **NO ONE** can draw it (not even with teacher override)
- Teachers cannot override admin decisions (hierarchy: admin > teacher > probability config)
- Admins can view all teacher overrides (read-only) via database queries

**UI Features**:

- Two tabs: **Cartes** (card templates) and **Configurations** (probability configs)
- Cards grouped by rarity (Communes, Rares, Épiques, Légendaires)
- Live preview before image upload
- Probability sliders with auto-adjustment (must sum to 100%)
- Optimistic UI updates with automatic rollback on error

**See**: [Admin VIP Card Management Guide](../guides/admin-vip-card-management.md) for complete documentation.

---

### Teacher Overrides

Teachers can customize which cards their students can draw via `/dashboard/teacher/vip-cards`:

**Capabilities**:

- Enable/disable cards for their students (applies to ALL teacher's classes)
- Cannot enable cards that admin disabled globally (admin settings override teacher preferences)
- Read-only view of active probability configuration (teachers cannot change probabilities)
- Bulk update via checkboxes + save button (optimistic UI with debouncing)

**Intersection Logic**:

When a student has multiple teachers, the **most restrictive** setting wins.

**Example**:

- Student has 2 teachers: Alice and Bob
- Alice disables "bonus" card → `teacher_vip_card_overrides.is_enabled = FALSE`
- Bob does not disable "bonus" → No override record (defaults to global enabled)
- **Result**: Student **CANNOT** draw "bonus" (Alice's override blocks it)

**Why intersection?**:

- Ensures students can't bypass restrictions by joining multiple classes
- Respects each teacher's classroom rules and autonomy
- Simpler logic than "union" (all teachers must agree) or "average" (confusing)
- More secure than "most permissive wins" (prevents gaming the system)

**Database Implementation**:

- `teacher_vip_card_overrides` table with `(teacher_id, card_id, is_enabled)` columns
- Unique constraint: `(teacher_id, card_id)` - one override per teacher per card
- Composite index: `(teacher_id, card_id, is_enabled)` for fast filtering

**See**: [Teacher VIP Card Override Guide](../guides/teacher-vip-card-overrides.md) for complete documentation.

---

### Database Schema

**teacher_vip_card_overrides table**:

```sql
CREATE TABLE teacher_vip_card_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES vip_card_templates(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_teacher_card_override UNIQUE (teacher_id, card_id)
);

CREATE INDEX idx_teacher_overrides_teacher ON teacher_vip_card_overrides(teacher_id);
CREATE INDEX idx_teacher_overrides_card ON teacher_vip_card_overrides(card_id);
CREATE INDEX idx_teacher_overrides_enabled ON teacher_vip_card_overrides(is_enabled);
CREATE INDEX idx_teacher_overrides_teacher_card_enabled
  ON teacher_vip_card_overrides(teacher_id, card_id, is_enabled);
```

**Storage bucket**: `vip-card-images` (public read, admin write/delete)

- File naming: `{card_id}@0.5x.webp` (e.g., `fortune@0.5x.webp`)
- Max file size: 5MB (enforced by bucket policy)
- Allowed MIME types: `image/webp`, `image/jpeg`, `image/png`, `image/gif`, `image/svg+xml`
- Public URL: `https://[project].supabase.co/storage/v1/object/public/vip-card-images/{filename}`

**See**: [Database Schema Documentation](../architecture/database-schema.md#teacher_vip_card_overrides) for complete schema details.

---

### Draw Function Updated

`draw_multiple_vip_cards()` now filters cards based on teacher overrides:

**Logic**:

1. Load active probability configuration from `vip_card_config`
2. Roll weighted random for rarity (1-100)
3. **NEW**: Filter cards by teacher overrides:
   ```sql
   AND NOT EXISTS (
     SELECT 1 FROM teacher_vip_card_overrides
     WHERE card_id = vct.id
       AND is_enabled = FALSE
       AND teacher_id IN (
         SELECT teacher_id FROM classes c
         JOIN class_members cm ON cm.class_id = c.id
         WHERE cm.student_id = p_student_id
       )
   )
   ```
4. Select random card from filtered pool (`ORDER BY random() LIMIT 1`)
5. Fallback to common if selected rarity is empty (all cards disabled by teachers)
6. Return JSONB: `{cards: [{cardId, instanceId, earnedAt}, ...]}`

**Performance**:

- Composite index on `(teacher_id, card_id, is_enabled)` ensures fast filtering
- Overhead: ~2-5ms per draw (acceptable for 1-10 card draws)
- No N+1 queries (single SELECT with subquery)

**Fallback Behavior**:

If ALL cards in selected rarity are disabled by teachers:

- System falls back to common rarity
- Ensures students can always draw at least one card
- If ALL common cards also disabled → Error: "No enabled VIP cards available"

**Security**:

- Teacher overrides checked BEFORE drawing (cannot bypass via API)
- RLS policies ensure teachers can only modify their own overrides
- Admins can view all overrides (read-only) for transparency

---

### API Endpoints

**Admin Endpoints**:

- `POST /api/admin/vip-cards/templates` - Create template
- `PATCH /api/admin/vip-cards/templates/{id}` - Update template
- `DELETE /api/admin/vip-cards/templates/{id}` - Delete template
- `POST /api/admin/vip-cards/templates/{id}/image` - Upload image
- `POST /api/admin/vip-cards/configs` - Create config
- `PATCH /api/admin/vip-cards/configs/{id}` - Update config
- `PATCH /api/admin/vip-cards/configs/{id}/activate` - Activate config (atomic)
- `DELETE /api/admin/vip-cards/configs/{id}` - Delete config

**Teacher Endpoints**:

- `GET /api/teacher/vip-cards/overrides` - Get overrides + templates
- `PUT /api/teacher/vip-cards/overrides` - Bulk update overrides
- `GET /api/teacher/vip-cards/global-config` - Get active config (read-only)

**Security**:

- All endpoints use **Zod validation** for input security (discriminated unions, UUID validation, bounds checking)
- Admin endpoints require `role = 'admin'` (enforced by RLS + API checks)
- Teacher endpoints require `role = 'teacher'` AND ownership verification
- CSRF protection via SvelteKit's built-in tokens

**Example Request** (Teacher updating overrides):

```typescript
PUT /api/teacher/vip-cards/overrides
Body: {
  overrides: {
    "bonus": false,      // Disable bonus for students
    "choix": true,       // Enable choix
    "fortune": false     // Disable fortune (legendary)
  }
}

Response (200):
{
  "updated": 3,
  "overrides": [
    { "card_id": "bonus", "is_enabled": false },
    { "card_id": "choix", "is_enabled": true },
    { "card_id": "fortune", "is_enabled": false }
  ]
}
```

---

### Limitations

1. **No per-student customization**: All students use same active config (cannot customize probabilities per student)
2. ~~**No UI for config management**~~ ✅ **IMPLEMENTED** (2025-11-04): Admin UI at `/dashboard/admin/vip-cards`
3. **No automatic event scheduling**: Event configs must be activated/deactivated manually (no cron job)
4. **No pity timer**: Each draw is independent (no guaranteed legendary after N draws)
5. **Teacher overrides apply to all classes**: Teachers cannot set different card preferences per class (all-or-nothing)

---

### Next Steps

**Short-term**:

- [x] ✅ Create admin UI for managing configs (**COMPLETED** 2025-11-04)
- [x] ✅ Create teacher override UI (**COMPLETED** 2025-11-04)
- [ ] Add analytics dashboard for card usage stats (track most popular cards, average cost, usage patterns)
- [ ] Implement automatic event scheduling (cron job to activate/deactivate configs based on date ranges)

**Long-term**:

- [ ] Per-class custom configs (teachers can set different probabilities per class)
- [ ] Per-class teacher overrides (teacher can disable "bonus" in Class A but enable it in Class B)
- [ ] Dynamic rarity adjustment (boost drops if cards accumulate, prevent hoarding)
- [ ] Pity timer (guaranteed legendary after N draws, configurable threshold)

---

## Future Improvements

### Short Term

- [ ] Validate VIP card has `draw_cards` action type in RPC function
- [ ] Student self-service card drawing (payment method: gidouilles only)

### Long Term

- [ ] Card trading system between students
- [ ] Card collection achievements
- [ ] Animated card reveal sound effects
- [ ] Multi-language support for card names/descriptions
- [ ] Analytics: track most popular cards, average cost, usage patterns

---

**Last Updated**: 2025-11-04
**Version**: 1.0.0
**Author**: Claude Code
**Status**: Production Ready ✅
