# VIP Card Action System - Comprehensive Analysis

## Overview

The VIP Card system in UbuMaths is a sophisticated reward mechanism allowing students to activate special abilities through VIP cards with four distinct action types: drawing cards, removing warnings, exchanging cards, and gaining gidouilles.

---

## 1. VIP Card Actions System Architecture

### 1.1 Action Type Definitions

**File**: `/Users/david/Coding/js/ubumaths/src/lib/types/vip-card.ts` (Lines 84-128)

The system defines 4 core action types:

```typescript
type VipCardAction =
	| DrawCardsAction
	| RemoveWarningsAction
	| ExchangeCardsAction
	| AddGidouillesAction;
```

#### A. Draw Cards Action (Lines 86-90)

```typescript
interface DrawCardsAction {
	type: 'draw_cards';
	count: number;
	filters?: DrawCardsFilters;
}
```

- **Purpose**: Awards N random VIP cards to student (no gidouilles cost)
- **Parameters**:
  - `count`: Number of cards to draw (1-10)
  - `filters` (optional):
    - `forceRarity`: Force all cards to specific rarity
    - `minRarity`: Guarantee at least 1 card of minimum rarity
    - `excludeCardIds`: Card IDs to exclude from pool
    - `onlyCardsWithActions`: Only draw cards with actions

#### B. Remove Warnings Action (Lines 96-100)

```typescript
interface RemoveWarningsAction {
	type: 'remove_warnings';
	count: number;
	warningType?: 'C' | 'M' | 'R' | 'T';
}
```

- **Purpose**: Remove N warnings from student record
- **Parameters**:
  - `count`: Number of warnings to remove (1-5)
  - `warningType` (optional):
    - C = Comportement (Behavior)
    - M = Matériel (Material)
    - R = Retard (Tardiness)
    - T = Travail (Work)

#### C. Exchange Cards Action (Lines 103-109)

```typescript
type ExchangeCardAction = ExchangeReplaceRandom | ExchangeRarityPoints | ExchangeDiscardForSpecific;

interface ExchangeCardsAction {
	type: 'exchange_cards';
	exchange: ExchangeCardAction;
}
```

**Three exchange modes** (detailed in Section 2)

#### D. Add Gidouilles Action (Lines 115-118)

```typescript
interface AddGidouillesAction {
	type: 'add_gidouilles';
	amount: number;
}
```

- **Purpose**: Add bonus gidouilles to student balance
- **Parameters**:
  - `amount`: Number of gidouilles to add (1-200)
  - **Constraint**: Cannot go below 0

---

## 2. Exchange/Conversion Rules (3 Modes)

### 2.1 Mode 1: Replace Random

**File**: `/Users/david/Coding/js/ubumaths/src/lib/types/vip-card.ts` (Lines 37-40)
**API**: `/Users/david/Coding/js/ubumaths/src/routes/api/vip-cards/exchange/+server.ts` (Lines 150-242)

```typescript
interface ExchangeReplaceRandom {
	mode: 'replace_random';
	count: number;
}
```

**Logic**:

1. Student selects N unused cards to discard
2. N random new cards are drawn
3. All discarded cards marked as `usedAt = now()`
4. New cards awarded via RPC `award_vip_card_no_cost`

**Constraints**:

- Minimum 1 card, maximum 10 cards
- Only unused cards can be discarded
- Random selection from all available cards

**Example**: "Roue de la Fortune" card (fortune) exchanges 5 random cards for 5 new random cards

---

### 2.2 Mode 2: Rarity Points System

**File**: `/Users/david/Coding/js/ubumaths/src/lib/types/vip-card.ts` (Lines 43-51)
**API**: `/Users/david/Coding/js/ubumaths/src/routes/api/vip-cards/exchange/+server.ts` (Lines 250-355)

```typescript
interface ExchangeRarityPoints {
	mode: 'rarity_points';
	targetRarity: VipCardRarity;
	pointsRequired: number;
}
```

**Rarity Points System**:

```
Common Card    = 1 point
Rare Card      = 3 points
Epic Card      = 9 points
Legendary Card = 27 points
```

**Logic**:

1. Student selects cards to discard
2. System calculates total points: `sum(getRarityPoints(card.rarity))`
3. System verifies: `totalPoints >= pointsRequired`
4. Greedy algorithm selects cards (prefer higher rarity first)
5. Random card of target rarity awarded

**Validation Logic** (Lines 259-276 in +server.ts):

```typescript
let totalPoints = 0;
for (const instanceId of cardsToDiscard) {
	const card = getVipCardById(instance.cardId);
	totalPoints += getRarityPoints(card.rarity);
}

if (totalPoints < targetPoints) {
	throw error(400, `Insufficient rarity points...`);
}
```

**Example Exchange Scenarios**:

- 3 Common (3 pts) → 1 Common (1 pt) ✓
- 1 Epic (9 pts) → 1 Epic (9 pts) ✓
- 2 Rare (6 pts) + 1 Common (1 pt) = 7 pts → 1 Epic (9 pts) ✗ (insufficient)

---

### 2.3 Mode 3: Discard for Specific Card

**File**: `/Users/david/Coding/js/ubumaths/src/lib/types/vip-card.ts` (Lines 53-61)
**API**: `/Users/david/Coding/js/ubumaths/src/routes/api/vip-cards/exchange/+server.ts` (Lines 362-445)

```typescript
interface ExchangeDiscardForSpecific {
	mode: 'discard_for_specific';
	discardCount: number;
	targetCardId: string;
}
```

**Logic**:

1. Validate target card exists: `getVipCardById(targetCardId)`
2. Student selects N cards to discard
3. All N cards marked as used
4. Specific target card awarded via RPC

**Constraints**:

- Must specify valid card ID
- Minimum 1 card to discard, maximum 10
- Only unused cards can be discarded

**Example**: "Alchimie" card (alchimie) exchanges 3 cards for 1 "Bonus" card

---

## 3. All VIP Cards with Actions

**File**: `/Users/david/Coding/js/ubumaths/src/lib/types/vip-card.ts` (Lines 151-421)

### Cards with Actions:

| Card ID                 | Name                | Rarity    | Action Type     | Details                         |
| ----------------------- | ------------------- | --------- | --------------- | ------------------------------- |
| soldes                  | Soldes              | common    | draw_cards      | Draw 2 VIP cards                |
| super-soldes            | Super Soldes        | common    | draw_cards      | Draw 3 VIP cards                |
| mega-soldes             | Méga Soldes         | rare      | draw_cards      | Draw 4 VIP cards                |
| tirage-epique           | Tirage Épique       | epic      | draw_cards      | Draw 2 cards (minRarity: epic)  |
| tirage-rare-garanti     | Tirage Rare Garanti | rare      | draw_cards      | Draw 3 rare cards (forceRarity) |
| tirage-actions          | Tirage Actions      | rare      | draw_cards      | Draw 2 cards with actions only  |
| tirage-legendaire-exclu | Tirage Sélectif     | rare      | draw_cards      | Draw 3 (excludes legendary)     |
| ecrabouilleur           | Écrabouilleur       | rare      | remove_warnings | Remove 1 warning                |
| alchimie                | Alchimie            | epic      | exchange_cards  | 3 cards → Bonus card            |
| fortune                 | Roue de la Fortune  | legendary | exchange_cards  | 5 random cards → 5 new          |
| Sheikh                  | Sheikh - Sheikha    | legendary | add_gidouilles  | Add 50 gidouilles               |

---

## 4. Database Schema & Storage

### 4.1 VIP Cards Storage

**Location**: `profiles.vip_cards` (JSONB column)

**Structure**:

```typescript
type StudentVipCards = Record<string, VipCardInstance>;
```

**Example Data**:

```json
{
	"uuid-instance-1": {
		"cardId": "bonus",
		"earnedAt": "2025-11-08T10:30:00Z",
		"usedAt": null,
		"activationRequestedAt": null,
		"activationRequestedBy": null
	},
	"uuid-instance-2": {
		"cardId": "soldes",
		"earnedAt": "2025-11-07T15:45:00Z",
		"usedAt": "2025-11-08T08:20:00Z",
		"activationRequestedAt": "2025-11-08T08:15:00Z",
		"activationRequestedBy": "student-uuid"
	}
}
```

### 4.2 VipCardInstance Structure

**File**: `/Users/david/Coding/js/ubumaths/src/lib/types/vip-card.ts` (Lines 11-17)

```typescript
interface VipCardInstance {
	cardId: string; // ID of card definition
	earnedAt: string; // ISO timestamp earned
	usedAt: string | null; // ISO timestamp used (null if unused)
	activationRequestedAt?: string | null; // When student requested activation
	activationRequestedBy?: string | null; // UUID of student who requested
}
```

---

## 5. API Endpoints

### 5.1 Exchange Endpoint

**Path**: `/Users/david/Coding/js/ubumaths/src/routes/api/vip-cards/exchange/+server.ts`

**HTTP**: `POST /api/vip-cards/exchange`

**Authentication**: Requires teacher/admin role

**Request Body** (Zod validated):

```typescript
{
  studentId: string;              // UUID of student
  mode: 'replace_random' | 'rarity_points' | 'discard_for_specific';
  cardsToDiscard: string[];       // Array of instance IDs (1-10 cards)
  targetRarity?: 'common' | 'rare' | 'epic' | 'legendary';  // For rarity_points
  targetCardId?: string;          // For discard_for_specific
}
```

**Response**:

```typescript
{
	cardsDiscarded: Array<{
		cardId: string;
		name: string;
		instanceId: string;
	}>;
	cardsReceived: Array<{
		cardId: string;
		name: string;
		instanceId: string;
		earnedAt: string;
	}>;
}
```

**Validation Schema**: `/Users/david/Coding/js/ubumaths/src/lib/server/validation/exchange-cards.ts`

**Security Checks** (Lines 35-76 in +server.ts):

1. User authenticated and is teacher/admin
2. Teacher teaches the student (via class_members)
3. All cards exist in student's vip_cards
4. All cards are not already used

---

### 5.2 Use Card Endpoint

**Path**: `/Users/david/Coding/js/ubumaths/src/routes/api/vip-cards/use-card/+server.ts`

**HTTP**: `POST /api/vip-cards/use-card`

**Purpose**: Mark a VIP card as used (FINAL step after action execution)

**Request Body**:

```typescript
{
	instanceId: string; // UUID of card instance
	studentId: string; // UUID of student
}
```

**Important**: This endpoint ONLY marks the card as used. Actions are executed in specialized endpoints BEFORE this is called.

**Architecture Flow**:

1. UI displays action-specific modal (VipCardExchangeModal, etc.)
2. User confirms action
3. Specialized API endpoint executes action (e.g., /api/vip-cards/exchange)
4. On success, call /api/vip-cards/use-card to mark card as used

---

## 6. Frontend Implementation

### 6.1 Exchange Modal Component

**File**: `/Users/david/Coding/js/ubumaths/src/lib/components/rewards/VipCardExchangeModal.svelte`

**Props**:

```typescript
interface Props {
	studentId: string;
	exchange: ExchangeCardAction;
	studentName?: string;
	classId?: string;
	onComplete?: () => void;
}
```

**UI Features**:

- Displays available unused cards in grid (2-4 columns)
- Mode-specific instructions
- Card selection with visual feedback
- Auto-select random button
- Real-time points calculation (for rarity_points mode)
- Success/error state display
- Optimistic UI updates via `teacherCache`

**Key Logic** (Lines 164-176):

```typescript
function toggleCard(instanceId: string) {
	if (selectedCards.has(instanceId)) {
		selectedCards.delete(instanceId);
	} else {
		// For fixed count modes, replace last selection
		if (requiredCount > 0 && selectedCards.size >= requiredCount) {
			const first = Array.from(selectedCards)[0];
			selectedCards.delete(first);
		}
		selectedCards.add(instanceId);
	}
}
```

### 6.2 Action Editor Component

**File**: `/Users/david/Coding/js/ubumaths/src/lib/components/vip-cards/VipCardActionEditor.svelte`

**Purpose**: Admin interface to configure card actions

**Supported Actions**:

- Draw cards (with optional filters)
- Remove warnings (with optional type filter)
- Exchange cards (all 3 modes)
- Add gidouilles

---

## 7. Constraints & Validation Rules

### 7.1 Card Discard Constraints

- **Minimum**: 1 card
- **Maximum**: 10 cards
- **Status**: Must be unused (usedAt === null)
- **Validation**: All cards must exist in student's vip_cards

### 7.2 Points-based Constraints

**Rarity Points System**:

```
Common   = 1 point
Rare     = 3 points
Epic     = 9 points
Legendary = 27 points
```

**Example Valid Exchanges**:

- 1 Epic (9) → 1 Epic (9) ✓
- 1 Epic (9) + 1 Rare (3) = 12 → 1 Legendary (27) ✗
- 1 Epic (9) + 2 Rare (6) + 3 Common (3) = 18 → 1 Legendary? ✗ (27 required)

### 7.3 Card Count Constraints

- **Draw cards**: 1-10 cards
- **Remove warnings**: 1-5 warnings
- **Add gidouilles**: 1-200 gidouilles
- **Exchange**: 1-10 cards to discard

### 7.4 Gidouilles Constraints

- **Minimum balance**: 0 (cannot go negative)
- **RPC enforces**: `IF v_new_gidouilles < 0 THEN RAISE EXCEPTION`
- **Error**: "Cannot go below 0"

---

## 8. Database RPC Functions

### 8.1 award_vip_card_no_cost

**File**: `/Users/david/Coding/js/ubumaths/supabase/migrations/20251103000000_add_vip_card_action_functions.sql` (Lines 47-127)

```sql
CREATE FUNCTION award_vip_card_no_cost(
  p_student_id UUID,
  p_card_id TEXT DEFAULT NULL
) RETURNS TEXT
```

**Parameters**:

- `p_student_id`: Student's profile ID
- `p_card_id`: Specific card ID (NULL for random)

**Returns**: Card ID that was awarded

**Security**: SECURITY DEFINER, checks teacher permissions

**Logic**:

1. Verify caller is teacher/admin
2. Verify student is in teacher's classes
3. If p_card_id provided, validate it exists
4. Generate random selection if p_card_id is NULL
5. Create new card instance with UUID
6. Add to profiles.vip_cards JSONB

---

### 8.2 add_student_gidouilles

**File**: `/Users/david/Coding/js/ubumaths/supabase/migrations/20251103000000_add_vip_card_action_functions.sql` (Lines 160-222)

```sql
CREATE FUNCTION add_student_gidouilles(
  p_student_id UUID,
  p_amount INTEGER
) RETURNS INTEGER
```

**Parameters**:

- `p_student_id`: Student's profile ID
- `p_amount`: Amount to add (can be negative)

**Returns**: New gidouilles balance

**Constraints**: Balance cannot go below 0

---

## 9. Code Locations Summary

| Aspect                | File Path                                                 | Line Range |
| --------------------- | --------------------------------------------------------- | ---------- |
| Type Definitions      | `src/lib/types/vip-card.ts`                               | 1-478      |
| Exchange Validation   | `src/lib/server/validation/exchange-cards.ts`             | 1-103      |
| Use Card Validation   | `src/lib/server/validation/vip-cards.ts`                  | 1-43       |
| Exchange Endpoint     | `src/routes/api/vip-cards/exchange/+server.ts`            | 1-446      |
| Use Card Endpoint     | `src/routes/api/vip-cards/use-card/+server.ts`            | 1-157      |
| Exchange Modal (UI)   | `src/lib/components/rewards/VipCardExchangeModal.svelte`  | 1-447      |
| Action Editor (Admin) | `src/lib/components/vip-cards/VipCardActionEditor.svelte` | 1-385      |
| Utilities             | `src/lib/utils/vip-cards.ts`                              | 1-199      |
| Deprecated Service    | `src/lib/server/vip-card-actions.ts`                      | 1-800      |
| RPC Functions         | `supabase/migrations/20251103000000_*.sql`                | Multiple   |

---

## 10. Current State Notes

### 10.1 Architecture Changes (2025-11-06)

The system underwent a major refactor where:

- Actions are now executed by **specialized endpoints** (not centralized)
- Each action type calls its own API endpoint
- `/api/vip-cards/use-card` is the **final step** (marks card as used)
- `vip-card-actions.ts` is marked **DEPRECATED** but kept for reference

### 10.2 File Status

- **vip-card-actions.ts**: Deprecated (2025-11-06) - contains old logic patterns
- **exchange/+server.ts**: Active - current exchange implementation
- **VipCardExchangeModal.svelte**: Active - UI for exchange
- **VipCardActionEditor.svelte**: Active - admin configuration UI

### 10.3 Known Limitations

- Instance ID retrieval in `handleReplaceRandom` is inefficient (queries DB after each award)
- Point calculation uses greedy algorithm (prefers high-rarity cards)
- No explicit transaction handling for race conditions

---

## 11. Example Usage Scenarios

### Scenario 1: Exchange 3 random cards for 3 new random cards

```typescript
POST /api/vip-cards/exchange
{
  "studentId": "uuid-123",
  "mode": "replace_random",
  "cardsToDiscard": ["instance-a", "instance-b", "instance-c"]
}
```

### Scenario 2: Exchange for rare card (points-based)

```typescript
POST /api/vip-cards/exchange
{
  "studentId": "uuid-123",
  "mode": "rarity_points",
  "cardsToDiscard": ["instance-epic", "instance-common"],  // 9+1=10 pts
  "targetRarity": "rare"  // needs 3 pts
}
```

Result: Receives 1 random rare card

### Scenario 3: Activate "Alchimie" card

```typescript
// Student activates "Alchimie" card (3→Bonus exchange)
POST /api/vip-cards/exchange
{
  "studentId": "uuid-123",
  "mode": "discard_for_specific",
  "cardsToDiscard": ["instance-1", "instance-2", "instance-3"],
  "targetCardId": "bonus"
}
// Then mark card as used:
POST /api/vip-cards/use-card
{
  "studentId": "uuid-123",
  "instanceId": "alchimie-instance-uuid"
}
```
