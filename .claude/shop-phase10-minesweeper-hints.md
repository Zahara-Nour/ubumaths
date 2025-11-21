# Phase 10: Minesweeper Hint Migration to Shop System

## Status: COMPLETED

**Date**: 2025-11-21

---

## Overview

Migrated the minesweeper hint system to use shop items. Students can now purchase "Indice Démineur" items from the shop and use them to get hints without incurring the 30% reward penalty. The system falls back to gidouilles payment if no items are available.

---

## Files Created

| File | Description |
|------|-------------|
| `supabase/migrations/20251121090000_migrate_minesweeper_hints_to_shop.sql` | Migration for shop item integration |

---

## Files Modified

| File | Changes |
|------|---------|
| `src/routes/api/games/minesweeper/[id]/hint/+server.ts` | Added item consumption logic, returns `source` field |
| `src/lib/stores/minesweeper.svelte.ts` | Track hint items count, handle hint source in response |
| `src/lib/components/game/minesweeper/HintButton.svelte` | Show item count badge, "Sans pénalité!" indicator, shop link |
| `src/lib/components/game/minesweeper/GameControls.svelte` | Pass hint items to HintButton |
| `src/routes/(public)/games/minesweeper/+page.svelte` | Load hint items count on mount |

---

## Database Changes

### New Column
- `minesweeper_games.hints_from_items` (INTEGER DEFAULT 0) - Tracks hints used from items

### New Shop Item Template
- **Name**: "Indice Démineur"
- **Internal Name**: `minesweeper_hint`
- **Base Price**: 25 gidouilles
- **Description**: Reveals a safe cell without penalty

### New Function
```sql
try_consume_minesweeper_hint_item(p_user_id UUID) RETURNS BOOLEAN
```
Attempts to consume one hint item from user's inventory. Returns true if successful.

### Updated Functions
- `use_hint()` - Now tries item consumption first, tracks `hints_from_items`
- `calculate_minesweeper_gidouilles()` - Penalty only if `hints_from_items < hints_used`
- `complete_minesweeper_game()` - Uses updated penalty logic

### New Index
```sql
idx_inventory_minesweeper_hints ON inventory(user_id, item_id)
WHERE quantity > 0 AND item_id = (SELECT id FROM shop_item_templates WHERE internal_name = 'minesweeper_hint')
```

---

## How It Works

### Hint Usage Flow
1. Player clicks hint button
2. API calls `try_consume_minesweeper_hint_item()`
3. **If item found**: Consume item, increment `hints_from_items`, NO gidouilles cost
4. **If no item**: Deduct 10 gidouilles, only increment `hints_used`
5. Response includes `source: "item" | "gidouilles"` for UI feedback

### Penalty Logic
```
IF hints_from_items >= hints_used THEN
    penalty = 0%  -- All hints from items
ELSE
    penalty = 30% -- At least one hint paid with gidouilles
END IF
```

---

## UI Changes

### HintButton Component
- Shows available hint items count as badge
- Green "Sans pénalité !" indicator when items available
- Displays "Utiliser un indice (gratuit)" vs "Utiliser un indice (-10 gidouilles)"
- Link to shop when no items available

### Toast Messages
- **Item used**: "Indice utilisé ! (objet de l'inventaire)"
- **Gidouilles used**: "Indice utilisé ! (-10 gidouilles, -30% récompense)"

---

## API Response Format

```typescript
// POST /api/games/minesweeper/[id]/hint
{
  success: true,
  hint: { row: number, col: number },
  source: "item" | "gidouilles",
  hintsUsed: number,
  hintsFromItems: number,
  hintItemsRemaining: number
}
```

---

## To Resume

If crash occurs:
- Migration is complete
- All files are modified
- Continue to **Phase 11: Performance Optimization**

---

## Testing Checklist

- [x] Buying hint items from shop works
- [x] Using hint with items available consumes item
- [x] Using hint without items deducts gidouilles
- [x] Penalty applies only when gidouilles hints used
- [x] UI shows correct item count and indicators
- [x] Toast messages reflect hint source
