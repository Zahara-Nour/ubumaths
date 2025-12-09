# Rewards API Reference

> Complete API documentation for all reward-related endpoints.

## Overview

The rewards API is organized into several groups:

- **Teacher Rewards** - Manage student rewards (gidouilles, bonus, VIP cards)
- **Student Rewards** - Draw cards, view balance
- **VIP Cards** - Card-specific operations (activation, actions)
- **Shop** - Purchase items, view inventory
- **Journal** - Query reward history

All endpoints require authentication and use JSON for request/response bodies.

---

## Teacher Rewards Endpoints

### Update Student Gidouilles

Add or remove gidouilles for a specific student.

```
POST /api/teacher/rewards/update-student
```

**Request Body:**

```typescript
{
	studentId: string; // UUID - Student's profile ID
	classId: string; // UUID - Class context
	delta: number; // Integer (-1000 to 1000) - Amount to add/remove
}
```

**Response:**

```typescript
{
	success: boolean;
	message: string; // "Gidouilles mises a jour avec succes"
	newValue: number; // New gidouilles balance
}
```

**Errors:**

- `400` - Invalid input
- `401` - Not authenticated
- `500` - Server error or RPC failure

**RPC Called:** `update_student_gidouilles(p_student_id, p_class_id, p_delta)`

---

### Update Class Gidouilles

Add or remove gidouilles for all students in a class.

```
POST /api/teacher/rewards/update-class
```

**Request Body:**

```typescript
{
  classId: string;      // UUID - Class ID
  delta: number;        // Integer (-1000 to 1000)
  reason?: string;      // Optional reason for large changes
}
```

**Response:**

```typescript
{
	success: boolean;
	updatedCount: number; // Number of students updated
}
```

---

### Update Student Bonus

Add or remove bonus points for a specific student.

```
POST /api/teacher/rewards/update-student-bonus
```

**Request Body:**

```typescript
{
	studentId: string; // UUID
	classId: string; // UUID
	delta: number; // Integer (-1000 to 1000)
}
```

**Response:**

```typescript
{
	success: boolean;
	message: string;
	newValue: number; // New bonus balance
}
```

---

### Award VIP Card

Award a random VIP card to a student (teacher action, no gidouilles cost).

```
POST /api/teacher/rewards/award-vip-card
```

**Request Body:**

```typescript
{
	studentId: string; // UUID
	classId: string; // UUID
}
```

**Response:**

```typescript
{
	success: boolean;
	card: {
		cardId: string;
		instanceId: string;
		earnedAt: string; // ISO timestamp
	}
}
```

---

### Grant Specific VIP Card

Grant a specific VIP card to a student (teacher action, no randomness).

```
POST /api/teacher/rewards/grant-specific-vip-card
```

**Request Body:**

```typescript
{
	studentId: string; // UUID
	classId: string; // UUID
	cardId: string; // VIP card template ID (e.g., "bonus", "fortune")
}
```

**Response:**

```typescript
{
	success: boolean;
	card: {
		cardId: string;
		instanceId: string;
		earnedAt: string;
	}
}
```

---

### Remove VIP Card

Remove a VIP card from a student's collection.

```
POST /api/teacher/rewards/remove-vip-card
```

**Request Body:**

```typescript
{
  studentId: string;        // UUID
  cardInstanceId: string;   // UUID - Instance key from vip_cards JSONB
  reason?: string;          // Optional reason
}
```

**Response:**

```typescript
{
	success: boolean;
	message: string;
}
```

---

### Use VIP Card (Teacher Approval)

Approve a student's VIP card activation request.

```
POST /api/teacher/rewards/use-vip-card
```

**Request Body:**

```typescript
{
	studentId: string; // UUID
	cardInstanceId: string; // UUID
	classId: string; // UUID
}
```

**Response:**

```typescript
{
	success: boolean;
	message: string;
}
```

---

## Student Rewards Endpoints

### Draw VIP Cards

Draw one or more VIP cards by paying gidouilles or using another VIP card.

```
POST /api/rewards/draw-vip-cards
```

**Request Body (Gidouilles Payment):**

```typescript
{
	studentId: string; // UUID
	count: number; // 1-10 cards to draw
	paymentMethod: 'gidouilles';
	gidouillesCost: number; // 0-100 cost per draw
}
```

**Request Body (VIP Card Payment):**

```typescript
{
	studentId: string; // UUID
	count: number; // 1-10 cards to draw
	paymentMethod: 'vip_card';
	vipCardInstanceId: string; // UUID of card that grants draws
}
```

**Response:**

```typescript
{
	cards: Array<{
		cardId: string; // Template ID
		instanceId: string; // Instance UUID
		earnedAt: string; // ISO timestamp
		rarity: string; // 'common' | 'rare' | 'epic' | 'legendary'
		name: string; // Card display name
	}>;
}
```

**Errors:**

- `400` - Validation error or insufficient resources
  - "Insufficient gidouilles: Required 10, available 5"
  - "VIP card instance not found or already used"
- `401` - Not authenticated
- `500` - Server error

**RPC Called:** `draw_multiple_vip_cards(...)`

---

### Get Student Rewards

Get current student's reward balances.

```
GET /api/student/rewards
```

**Response:**

```typescript
{
	gidouilles: number;
	bonus: number;
	vipCardsCount: number;
}
```

---

### Add Gidouilles

Add gidouilles to a student (used by games, achievements).

```
POST /api/rewards/gidouilles
```

**Request Body:**

```typescript
{
  studentId: string;    // UUID
  amount: number;       // Positive integer
  reason: string;       // Required reason
  classId?: string;     // UUID - Optional class context
}
```

**Response:**

```typescript
{
	success: boolean;
	newBalance: number;
}
```

---

## VIP Card Action Endpoints

### Request Card Activation

Student requests to activate a VIP card (requires teacher approval).

```
POST /api/vip-cards/request-activation
```

**Request Body:**

```typescript
{
	cardInstanceId: string; // UUID
}
```

**Response:**

```typescript
{
	success: boolean;
	message: string; // "Demande d'activation envoyee"
}
```

---

### Approve Card Activation

Teacher approves a student's card activation request.

```
POST /api/vip-cards/use-card
```

**Request Body:**

```typescript
{
	studentId: string; // UUID
	cardInstanceId: string; // UUID
}
```

**Response:**

```typescript
{
  success: boolean;
  cardAction?: VipCardAction; // Action to execute (if any)
}
```

---

### Reject Card Activation

Teacher rejects a student's card activation request.

```
POST /api/vip-cards/reject-activation
```

**Request Body:**

```typescript
{
  studentId: string;        // UUID
  cardInstanceId: string;   // UUID
  reason?: string;          // Optional rejection reason
}
```

**Response:**

```typescript
{
	success: boolean;
	message: string;
}
```

---

### Choose Cards (Card Action)

Execute a "choose card" action from an activated VIP card.

```
POST /api/vip-cards/choose
```

**Request Body:**

```typescript
{
  studentId: string;
  cardInstanceId: string;       // The card granting the choice
  selectedCardIds: string[];    // Template IDs of chosen cards
}
```

**Response:**

```typescript
{
	success: boolean;
	cards: Array<{
		cardId: string;
		instanceId: string;
		earnedAt: string;
	}>;
}
```

---

### Exchange Cards (Card Action)

Execute a card exchange action from an activated VIP card.

```
POST /api/vip-cards/exchange
```

**Request Body:**

```typescript
{
  studentId: string;
  cardInstanceId: string;       // The exchange card
  discardedInstanceIds: string[]; // Cards to discard
}
```

**Response:**

```typescript
{
	success: boolean;
	newCards: Array<{
		cardId: string;
		instanceId: string;
		earnedAt: string;
	}>;
	discardedCount: number;
}
```

---

## Shop Endpoints

### List Shop Items

Get available shop items.

```
GET /api/shop/items
```

**Query Parameters:**

- `category` (optional): 'consumable' | 'booster' | 'cosmetic' | 'utility'
- `rarity` (optional): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
- `search` (optional): Search term
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**

```typescript
{
	items: Array<{
		id: string;
		internal_name: string;
		display_name: string;
		description: string;
		category: string;
		rarity: string;
		base_price: number;
		discount_percentage: number;
		final_price: number; // Computed
		owned_quantity: number; // Student's owned count
		can_purchase: boolean;
		purchase_limit_reason: string | null;
	}>;
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	}
}
```

---

### Purchase Item

Purchase an item from the shop.

```
POST /api/shop/purchase
```

**Request Body:**

```typescript
{
	template_id: string; // UUID - Item template ID
	quantity: number; // 1-10
}
```

**Response:**

```typescript
{
	success: boolean;
	inventory_id: string; // Created/updated inventory item
	purchase_id: string; // Purchase history record
	gidouilles_spent: number;
	new_balance: number;
	item_name: string;
	quantity: number;
}
```

**Errors:**

- `400` - Insufficient gidouilles, purchase limit reached, item not available
- `401` - Not authenticated
- `500` - Server error

---

### Get Purchase History

Get student's purchase history.

```
GET /api/shop/purchase-history
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**

```typescript
{
	purchases: Array<{
		id: string;
		template: ShopItemTemplate;
		quantity: number;
		unit_price: number;
		total_price: number;
		discount_applied: number;
		purchased_at: string;
		refunded_at: string | null;
	}>;
	pagination: PaginationMeta;
}
```

---

## Journal Endpoints

### Get Student Journal

Get authenticated student's reward history.

```
GET /api/rewards/journal
```

**Query Parameters:**

- `reward_type` (optional): 'gidouilles' | 'bonus' | 'vip_card' | 'achievement' | 'item'
- `event_type` (optional): 'earned' | 'spent' | 'traded' | 'used' | 'expired' | 'unlocked' | 'purchased' | 'awarded' | 'removed'
- `from` (optional): ISO date string - Start date filter
- `to` (optional): ISO date string - End date filter
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**

```typescript
{
	events: Array<{
		id: string;
		student_id: string;
		reward_type: RewardType;
		event_type: RewardEventType;
		amount: number | null;
		item_name: string | null;
		description: string; // French description
		metadata: object;
		source_table: string;
		source_id: string | null;
		class_id: string | null;
		created_by: string | null;
		created_at: string;
	}>;
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	}
}
```

---

### Get Student Journal (Teacher View)

Teacher views a specific student's reward history.

```
GET /api/rewards/journal/[studentId]
```

**Path Parameters:**

- `studentId` - UUID of student

**Query Parameters:** Same as student journal.

**Authorization:** Teacher must be assigned to student's class.

---

## Admin Endpoints

### VIP Card Templates CRUD

```
GET    /api/admin/vip-cards/templates           # List all templates
POST   /api/admin/vip-cards/templates           # Create template
GET    /api/admin/vip-cards/templates/[id]      # Get template
PATCH  /api/admin/vip-cards/templates/[id]      # Update template
DELETE /api/admin/vip-cards/templates/[id]      # Delete template
POST   /api/admin/vip-cards/templates/[id]/image # Upload image
```

### VIP Card Configs CRUD

```
GET    /api/admin/vip-cards/configs             # List configs
POST   /api/admin/vip-cards/configs             # Create config
GET    /api/admin/vip-cards/configs/[id]        # Get config
PATCH  /api/admin/vip-cards/configs/[id]        # Update config
DELETE /api/admin/vip-cards/configs/[id]        # Delete config
POST   /api/admin/vip-cards/configs/[id]/activate # Activate config
```

---

## Error Handling

All endpoints follow consistent error handling:

```typescript
// Error response format
{
  status: number;       // HTTP status code
  message: string;      // Error message
}

// Common status codes
401 - Authentication required
400 - Validation error or business logic error
403 - Forbidden (authorization failed)
404 - Resource not found
500 - Internal server error
```

## Authentication

All endpoints require authentication via session cookie. The authenticated user is available in `locals.user`.

Role-based access is enforced:

- **Student endpoints** - Require `student` role
- **Teacher endpoints** - Require `teacher` role
- **Admin endpoints** - Require `admin` role
