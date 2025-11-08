# VIP Card Exchange System - Quick Reference Guide

## At a Glance

**System**: Card exchange and conversion for student rewards
**Storage**: `profiles.vip_cards` (JSONB)
**Main Endpoint**: `POST /api/vip-cards/exchange`
**UI Component**: `VipCardExchangeModal.svelte`

---

## Three Exchange Modes

### 1. Replace Random (5-card replacement example)

```
Input:  Student selects 5 random unused cards
Output: Cards marked as used, 5 new random cards awarded
API:    POST /api/vip-cards/exchange
{
  "mode": "replace_random",
  "cardsToDiscard": ["uuid-1", "uuid-2", "uuid-3", "uuid-4", "uuid-5"]
}
```

### 2. Rarity Points (point-based conversion)

```
Point System:
  Common    = 1 point
  Rare      = 3 points
  Epic      = 9 points
  Legendary = 27 points

Example: Exchange for Epic (9 points)
  - 1 Epic (9 pts) → 1 Epic ✓
  - 3 Rare (9 pts) → 1 Epic ✓
  - 2 Rare (6 pts) → 1 Epic ✗ (insufficient)

API:    POST /api/vip-cards/exchange
{
  "mode": "rarity_points",
  "cardsToDiscard": ["uuid-1", "uuid-2", "uuid-3"],
  "targetRarity": "epic"
}
```

### 3. Discard for Specific (1-to-1 target)

```
Input:  Student selects N cards to discard
Output: 1 specific target card awarded

Example: "Alchimie" (3 cards → Bonus)
  - Discard any 3 cards
  - Receive 1 "bonus" card

API:    POST /api/vip-cards/exchange
{
  "mode": "discard_for_specific",
  "cardsToDiscard": ["uuid-1", "uuid-2", "uuid-3"],
  "targetCardId": "bonus"
}
```

---

## Cards with Exchange Actions

| Card     | Rarity    | Action                 |
| -------- | --------- | ---------------------- |
| alchimie | epic      | 3 cards → Bonus        |
| fortune  | legendary | 5 cards → 5 new random |

---

## Cards with Draw Actions

| Card                    | Rarity | Action                   |
| ----------------------- | ------ | ------------------------ |
| soldes                  | common | Draw 2 cards             |
| super-soldes            | common | Draw 3 cards             |
| mega-soldes             | rare   | Draw 4 cards             |
| tirage-epique           | epic   | Draw 2 (minRarity: epic) |
| tirage-rare-garanti     | rare   | Draw 3 (all rare)        |
| tirage-actions          | rare   | Draw 2 (actions only)    |
| tirage-legendaire-exclu | rare   | Draw 3 (no legendary)    |

---

## Other Action Cards

| Card          | Rarity    | Action            |
| ------------- | --------- | ----------------- |
| ecrabouilleur | rare      | Remove 1 warning  |
| Sheikh        | legendary | Add 50 gidouilles |

---

## Code Location Quick Map

```
Types:
  src/lib/types/vip-card.ts (lines 1-478)
  ├── VipCardAction (line 124)
  ├── ExchangeCardAction (line 66)
  ├── VipCardInstance (line 11)
  └── VIP_CARDS array (line 151)

API Endpoints:
  src/routes/api/vip-cards/exchange/+server.ts (lines 1-446)
  ├── POST handler (line 35)
  ├── handleReplaceRandom (line 150)
  ├── handleRarityPoints (line 250)
  └── handleDiscardForSpecific (line 362)

  src/routes/api/vip-cards/use-card/+server.ts (lines 1-157)
  └── Mark card as used (final step)

Validation:
  src/lib/server/validation/exchange-cards.ts (lines 1-103)
  └── exchangeCardsSchema (discriminated union)

UI Components:
  src/lib/components/rewards/VipCardExchangeModal.svelte (lines 1-447)
  ├── Card selection UI
  ├── Mode-specific instructions
  └── Optimistic updates

Admin UI:
  src/lib/components/vip-cards/VipCardActionEditor.svelte (lines 1-385)
  └── Configure card actions

Database:
  supabase/migrations/20251103000000_add_vip_card_action_functions.sql
  ├── award_vip_card_no_cost() (line 47)
  └── add_student_gidouilles() (line 160)
```

---

## Key Constraints

| Constraint             | Value |
| ---------------------- | ----- |
| Min cards to exchange  | 1     |
| Max cards to exchange  | 10    |
| Min gidouilles balance | 0     |
| Max gidouilles to add  | 200   |
| Max warnings to remove | 5     |
| Max cards to draw      | 10    |

---

## Exchange Status Codes

| Status | Meaning                                            |
| ------ | -------------------------------------------------- |
| 400    | Invalid input (missing cards, insufficient points) |
| 403    | User not teacher or doesn't teach student          |
| 404    | Card instance not found, target card not found     |
| 500    | Database/RPC error                                 |

---

## Data Flow Diagram

```
UI (VipCardExchangeModal)
  ↓
POST /api/vip-cards/exchange
  ├─ Validate request (Zod)
  ├─ Check permissions (teacher, student)
  ├─ Load student.vip_cards
  ├─ Route to handler:
  │  ├─ handleReplaceRandom
  │  ├─ handleRarityPoints
  │  └─ handleDiscardForSpecific
  ├─ Mark cards as used
  ├─ Award new cards via RPC
  └─ Return result
  ↓
POST /api/vip-cards/use-card (optional, marks exchange card as used)
  ↓
UI Updates + Toast Notification
```

---

## Example: Implementing New Exchange Mode

To add a new exchange mode (e.g., "rarity_merge"):

1. **Update Type** (`src/lib/types/vip-card.ts`):

```typescript
interface ExchangeRarityMerge {
	mode: 'rarity_merge';
	sourceCounts: Record<VipCardRarity, number>;
	targetRarity: VipCardRarity;
}

type ExchangeCardAction =
	| ExchangeReplaceRandom
	| ExchangeRarityPoints
	| ExchangeDiscardForSpecific
	| ExchangeRarityMerge; // ADD THIS
```

2. **Update Validation** (`src/lib/server/validation/exchange-cards.ts`):

```typescript
const rarityMergeSchema = baseSchema.extend({
	mode: z.literal('rarity_merge'),
	sourceCounts: z.record(z.enum(['common', 'rare', 'epic', 'legendary']), z.number()),
	targetRarity: z.enum(['common', 'rare', 'epic', 'legendary'])
});

export const exchangeCardsSchema = z.discriminatedUnion('mode', [
	replaceRandomSchema,
	rarityPointsSchema,
	discardForSpecificSchema,
	rarityMergeSchema // ADD THIS
]);
```

3. **Add Handler** (`src/routes/api/vip-cards/exchange/+server.ts`):

```typescript
case 'rarity_merge':
  result = await handleRarityMerge(
    supabase,
    data.studentId,
    vipCards,
    data.cardsToDiscard,
    data.sourceCounts,
    data.targetRarity
  );
  break;

async function handleRarityMerge(...) {
  // Implementation
}
```

4. **Update Admin UI** (`src/lib/components/vip-cards/VipCardActionEditor.svelte`):

```typescript
const exchangeModeItems = [
  { value: 'replace_random', label: '...' },
  { value: 'rarity_points', label: '...' },
  { value: 'discard_for_specific', label: '...' },
  { value: 'rarity_merge', label: 'Fusion par Rareté' }  // ADD THIS
];

// Add UI section in template
{:else if exchangeMode === 'rarity_merge'}
  <!-- UI for configuring source counts and target rarity -->
{/if}
```

---

## Testing Exchange Logic

Key test scenarios:

```typescript
// Test 1: Valid replace_random
POST /api/vip-cards/exchange
{
  "mode": "replace_random",
  "cardsToDiscard": ["uuid-1", "uuid-2"]
}
// Expect: 200, 2 cards discarded, 2 new cards received

// Test 2: Invalid rarity_points (insufficient)
POST /api/vip-cards/exchange
{
  "mode": "rarity_points",
  "cardsToDiscard": ["common-uuid"],  // 1 point
  "targetRarity": "rare"  // needs 3 points
}
// Expect: 400, "Insufficient rarity points"

// Test 3: Card already used
POST /api/vip-cards/exchange
{
  "mode": "replace_random",
  "cardsToDiscard": ["already-used-uuid"]
}
// Expect: 400, "Card already used"

// Test 4: Card not found
POST /api/vip-cards/exchange
{
  "mode": "replace_random",
  "cardsToDiscard": ["nonexistent-uuid"]
}
// Expect: 404, "Card instance not found"
```

---

## Performance Notes

- **Inefficiency**: `handleReplaceRandom` queries DB after each card award (should batch)
- **Algorithm**: Greedy selection in rarity_points (prefers high-rarity cards)
- **Race Conditions**: No explicit transaction handling (SELECT FOR UPDATE missing)
- **Optimization Opportunity**: Use batch RPC call for multi-card awards

---

## Security Notes

- All endpoints require teacher/admin authentication
- Teacher-student relationship verified before operations
- Card instances validated (exist, not already used)
- Target cards validated (exist in VIP_CARDS)
- Zod validation prevents injection/invalid data
- RPC functions use SECURITY DEFINER + class_members check

---

## Related Documentation

- Full Details: `docs/features/vip-card-exchange-system.md`
- Card Types: `src/lib/types/vip-card.ts`
- Architecture: `docs/architecture/`
- Quality Standards: `docs/claude/quality-standards.md`
