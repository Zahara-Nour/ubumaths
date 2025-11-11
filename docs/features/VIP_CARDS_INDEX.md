# VIP Card System - Complete Documentation Index

This index provides navigation to all VIP card system documentation.

## Quick Start

- **Quick Reference**: [vip-card-quick-reference.md](vip-card-quick-reference.md) - Start here for fast lookup
- **Comprehensive Guide**: [vip-card-exchange-system.md](vip-card-exchange-system.md) - Full technical details

## Feature Documentation

### 1. VIP Card Exchange System

**File**: [vip-card-exchange-system.md](vip-card-exchange-system.md)
**Size**: 545 lines
**Content**:

- Architecture overview
- 3 exchange/conversion modes with examples
- All 11 cards with actions and their parameters
- Database schema and storage format
- API endpoints (request/response formats)
- Frontend implementation details
- Constraints and validation rules
- RPC function documentation
- Code location summary with line numbers
- Real-world usage scenarios

**Key Sections**:

- Section 1: VIP Card Actions System Architecture
- Section 2: Exchange/Conversion Rules (3 Modes)
- Section 3: All VIP Cards with Actions
- Section 4: Database Schema & Storage
- Section 5: API Endpoints
- Section 6: Frontend Implementation
- Section 7: Constraints & Validation Rules
- Section 8: Database RPC Functions
- Section 9: Code Locations Summary
- Section 10: Current State Notes
- Section 11: Example Usage Scenarios

### 2. VIP Card Quick Reference

**File**: [vip-card-quick-reference.md](vip-card-quick-reference.md)
**Size**: 324 lines
**Content**:

- Quick overview of the 3 exchange modes
- Cards with actions (exchange, draw, other)
- Code location quick map
- Key constraints table
- Status codes reference
- Data flow diagram
- Example: Adding new exchange mode
- Testing scenarios
- Performance notes
- Security notes

**Best For**:

- Quick lookups during development
- Understanding exchange modes at a glance
- Finding code locations fast
- Reference for constraints and validation

### 3. VIP Card Draw System

**File**: [vip-card-draw-system.md](vip-card-draw-system.md)
**Size**: 2002 lines
**Content**:

- Draw cards action system
- Rarity distribution
- Filtering system
- Template-based draws
- Weighted distribution
- Teacher overrides

### 4. VIP Card Activation System

**File**: [vip-card-activation.md](vip-card-activation.md)
**Size**: 1235 lines
**Content**:

- Student activation flow
- Teacher approval process
- Request management
- Activation UI

### 5. VIP Card UI Guide (User-Facing)

**File**: [vip-card-ui-guide.md](vip-card-ui-guide.md)
**Size**: User guide
**Content**:

- Visual card selection interface (French)
- Teacher rewards dashboard workflow
- Card gallery modal usage
- Responsive design behavior
- Accessibility features
- Troubleshooting guide

## Navigation by Task

### I need to understand...

**...how card exchanges work**

1. Start: [vip-card-quick-reference.md](vip-card-quick-reference.md#three-exchange-modes)
2. Deep dive: [vip-card-exchange-system.md](vip-card-exchange-system.md#2-exchangeconversion-rules-3-modes)

**...the rarity points system**

1. Quick: [vip-card-quick-reference.md](vip-card-quick-reference.md#2-rarity-points-point-based-conversion)
2. Details: [vip-card-exchange-system.md](vip-card-exchange-system.md#22-mode-2-rarity-points-system)

**...all cards with actions**

1. Quick: [vip-card-quick-reference.md](vip-card-quick-reference.md#cards-with-exchange-actions)
2. Full: [vip-card-exchange-system.md](vip-card-exchange-system.md#3-all-vip-cards-with-actions)

**...API endpoints and validation**

1. Quick: [vip-card-quick-reference.md](vip-card-quick-reference.md#code-location-quick-map)
2. Full: [vip-card-exchange-system.md](vip-card-exchange-system.md#5-api-endpoints)

**...database schema**

1. Structure: [vip-card-exchange-system.md](vip-card-exchange-system.md#41-vip-cards-storage)
2. RPC Functions: [vip-card-exchange-system.md](vip-card-exchange-system.md#8-database-rpc-functions)

**...frontend implementation**

1. Modal UI: [vip-card-exchange-system.md](vip-card-exchange-system.md#61-exchange-modal-component)
2. Admin UI: [vip-card-exchange-system.md](vip-card-exchange-system.md#62-action-editor-component)
3. Card Selection UI: [vip-card-ui-guide.md](vip-card-ui-guide.md) (User guide in French)

**...constraints and validation**

1. All: [vip-card-exchange-system.md](vip-card-exchange-system.md#7-constraints--validation-rules)
2. Table: [vip-card-quick-reference.md](vip-card-quick-reference.md#key-constraints)

**...file locations**

1. All: [vip-card-exchange-system.md](vip-card-exchange-system.md#9-code-locations-summary)
2. Map: [vip-card-quick-reference.md](vip-card-quick-reference.md#code-location-quick-map)

### I want to...

**...modify exchange rules**

1. Find rules: [vip-card-exchange-system.md](vip-card-exchange-system.md#2-exchangeconversion-rules-3-modes)
2. Find code: See "Exchange Endpoint" section (line numbers provided)
3. Understand constraints: [vip-card-exchange-system.md](vip-card-exchange-system.md#7-constraints--validation-rules)

**...add a new exchange mode**

1. Guide: [vip-card-quick-reference.md](vip-card-quick-reference.md#example-implementing-new-exchange-mode)
2. Type location: `src/lib/types/vip-card.ts` (lines 37-69)
3. Validation: `src/lib/server/validation/exchange-cards.ts` (lines 1-103)
4. API: `src/routes/api/vip-cards/exchange/+server.ts` (lines 1-446)
5. UI: `src/lib/components/vip-cards/VipCardActionEditor.svelte` (lines 1-385)

**...create a new card with an action**

1. Card definition: `src/lib/types/vip-card.ts` (add to VIP_CARDS array, line 151+)
2. If exchange action: Use existing modes (lines 37-69)
3. Admin UI: `src/lib/components/vip-cards/VipCardActionEditor.svelte`

**...test exchange logic**

1. Scenarios: [vip-card-quick-reference.md](vip-card-quick-reference.md#testing-exchange-logic)
2. Manual test cases provided with expected results

**...optimize performance**

1. Issues: [vip-card-quick-reference.md](vip-card-quick-reference.md#performance-notes)
2. Details: [vip-card-exchange-system.md](vip-card-exchange-system.md#103-known-limitations)

**...audit security**

1. Overview: [vip-card-quick-reference.md](vip-card-quick-reference.md#security-notes)
2. Details: [vip-card-exchange-system.md](vip-card-exchange-system.md#5-api-endpoints) (Lines 65-76)

## Key Information at a Glance

### The Three Exchange Modes

1. **Replace Random** (mode: 'replace_random')
   - Discard N cards → get N random new cards
   - Example: "Roue de la Fortune" (5 cards)

2. **Rarity Points** (mode: 'rarity_points')
   - Points: Common=1, Rare=3, Epic=9, Legendary=27
   - Discard cards by point value → get card of target rarity
   - Uses greedy algorithm (prefers high-rarity)

3. **Discard for Specific** (mode: 'discard_for_specific')
   - Discard N cards → get 1 specific predefined card
   - Example: "Alchimie" (3 → Bonus)

### Cards with Exchange Actions

- **alchimie** (epic): 3 cards → 1 Bonus card
- **fortune** (legendary): 5 cards → 5 new random cards

### Key Files

| File                                                    | Purpose          | Lines |
| ------------------------------------------------------- | ---------------- | ----- |
| src/lib/types/vip-card.ts                               | Type definitions | 478   |
| src/routes/api/vip-cards/exchange/+server.ts            | Exchange logic   | 446   |
| src/lib/components/rewards/VipCardExchangeModal.svelte  | User UI          | 447   |
| src/lib/components/vip-cards/VipCardActionEditor.svelte | Admin UI         | 385   |
| src/lib/server/validation/exchange-cards.ts             | Zod validation   | 103   |

### Storage Format

```json
profiles.vip_cards = {
  "instance-uuid-1": {
    "cardId": "bonus",
    "earnedAt": "2025-11-08T10:30:00Z",
    "usedAt": null
  },
  ...
}
```

### Main Endpoint

```
POST /api/vip-cards/exchange
Content-Type: application/json

{
  "studentId": "uuid",
  "mode": "replace_random|rarity_points|discard_for_specific",
  "cardsToDiscard": ["uuid-1", "uuid-2", ...],
  "targetRarity": "common|rare|epic|legendary",  // for rarity_points
  "targetCardId": "bonus"  // for discard_for_specific
}
```

## Statistics

- Total Documentation: 4,500+ lines
  - Comprehensive Exchange Guide: 545 lines
  - Quick Reference: 324 lines
  - Draw System: 2,002 lines
  - Activation System: 1,235 lines
  - UI Guide (User-Facing): 400+ lines

- Code Coverage:
  - 10+ files analyzed
  - 15+ migrations reviewed
  - 4 main components documented
  - 3 validation schemas covered
  - 2 RPC functions detailed
  - All 11 action cards catalogued

## Document Maintenance

**Last Updated**: 2025-11-11
**Scope**: VIP Card System (Exchange, Draw, Activation, UI)
**Status**: Complete and comprehensive

Related systems documented in:

- vip-card-exchange-system.md (exchange_cards action)
- vip-card-draw-system.md (draw_cards action)
- vip-card-activation.md (student activation flow)
- vip-card-ui-guide.md (visual card selection interface - user guide)

## Deprecated Information

The file `src/lib/server/vip-card-actions.ts` is marked deprecated (2025-11-06) but contains useful logic patterns for reference. Most functionality is now handled by specialized endpoints:

- `/api/vip-cards/exchange` for exchange_cards
- `/api/rewards/draw-vip-cards` for draw_cards
- `/api/vip-cards/use-card` for marking cards as used
- `/api/teacher/rewards/update-student` for add_gidouilles

---

**Need more info?** Check the Comprehensive Guide or Quick Reference above.
**Found an issue?** Update this index and the relevant documentation file.
**Adding a feature?** Update the appropriate section and link it here.
