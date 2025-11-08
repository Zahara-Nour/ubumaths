# VIP Card Draw Filters - Test Documentation

This document describes the comprehensive test suite for the VIP card draw filters functionality.

## Test Files

### 1. Database/Trigger Tests

**File**: `/tests/database/triggers/vip-card-filters.test.ts`

Tests the `award_vip_cards_with_filters` RPC function at the database level.

**Requirements**:

- Supabase local running on port 54321 (`pnpm db:start`)
- Docker installed and running

**Run tests**:

```bash
pnpm db:start  # Start Supabase local
pnpm test:triggers tests/database/triggers/vip-card-filters.test.ts
```

#### Test Coverage

##### Force Rarity Filter (5 tests)

- ✅ Force all cards to common rarity
- ✅ Force all cards to rare rarity
- ✅ Force all cards to epic rarity
- ✅ Force all cards to legendary rarity
- ✅ Error when rarity has no enabled cards

##### Min Rarity Filter (4 tests)

- ✅ Guarantee at least 1 rare card when minRarity is 'rare'
- ✅ Guarantee at least 1 epic card when minRarity is 'epic'
- ✅ Guarantee exactly 1 legendary card when minRarity is 'legendary'
- ✅ Remaining cards follow normal distribution after guarantee

##### Exclude Card IDs Filter (3 tests)

- ✅ Exclude specific cards from draw pool
- ✅ Exclude all cards of a specific rarity
- ✅ Error when all cards are excluded

##### Only Cards With Actions Filter (2 tests)

- ✅ Only draw cards with action definitions
- ✅ Exclude cards without actions

##### Combined Filters (5 tests)

- ✅ Combine minRarity + excludeCardIds
- ✅ Combine forceRarity + excludeCardIds
- ✅ Combine onlyCardsWithActions + excludeCardIds
- ✅ Combine all compatible filters (minRarity + excludeCardIds + onlyCardsWithActions)
- ✅ Verify all constraints are respected simultaneously

##### Error Cases (9 tests)

- ✅ Reject forceRarity + minRarity combination (mutually exclusive)
- ✅ Reject invalid rarity value for forceRarity
- ✅ Reject invalid rarity value for minRarity
- ✅ Reject non-existent student ID
- ✅ Reject count out of range (0 cards)
- ✅ Reject count out of range (11 cards)
- ✅ Reject unauthorized teacher (student not in their class)
- ✅ Reject when filters match zero cards
- ✅ Verify proper error messages for each case

##### Return Value Tests (2 tests)

- ✅ Verify correct JSONB structure with all fields (cardId, instanceId, name, rarity, earnedAt)
- ✅ Verify student vip_cards JSONB is updated correctly

**Total Database Tests**: 30 tests

---

### 2. Unit Tests

**File**: `/tests/unit/vip-card-filters.test.ts`

Tests the TypeScript backend logic with mocked Supabase calls.

**Run tests**:

```bash
pnpm test:unit tests/unit/vip-card-filters.test.ts
```

#### Test Coverage

##### Filter Detection (8 tests)

- ✅ Use new RPC when forceRarity filter is present
- ✅ Use new RPC when minRarity filter is present
- ✅ Use new RPC when excludeCardIds filter is present
- ✅ Use new RPC when onlyCardsWithActions filter is present
- ✅ Use legacy RPC when no filters are present
- ✅ Use legacy RPC when filters object is empty
- ✅ Use legacy RPC when excludeCardIds is empty array
- ✅ Handle multiple cards with filters correctly

##### Response Transformation (3 tests)

- ✅ Transform new RPC response format (with instanceId, rarity, earnedAt)
- ✅ Handle legacy RPC response format (cardId + name only)
- ✅ Pluralize message correctly for multiple cards

##### Error Handling (2 tests)

- ✅ Handle RPC errors correctly
- ✅ Handle empty cards array

##### Zod Validation (15 tests)

- ✅ Accept valid forceRarity filter
- ✅ Accept valid minRarity filter
- ✅ Accept valid excludeCardIds filter
- ✅ Accept valid onlyCardsWithActions filter
- ✅ Accept multiple compatible filters
- ✅ Accept empty filters object
- ✅ Reject forceRarity + minRarity combination
- ✅ Reject invalid rarity value for forceRarity
- ✅ Reject invalid rarity value for minRarity
- ✅ Reject excludeCardIds with empty strings
- ✅ Reject excludeCardIds exceeding max length (50)
- ✅ Reject unknown filter properties (strict mode)
- ✅ Accept excludeCardIds as empty array
- ✅ Accept onlyCardsWithActions as false
- ✅ Validate all rarity values (common, rare, epic, legendary)

**Total Unit Tests**: 28 tests

---

## Filter Types Reference

### 1. forceRarity

Forces ALL drawn cards to be of the specified rarity.

**Example**:

```typescript
{
	forceRarity: 'rare'; // All cards will be rare
}
```

**Use Cases**:

- "Tirage Rare Garanti" card (forces rare rarity)
- Event-specific guaranteed legendary draws

**Constraints**:

- Cannot be used with `minRarity` (mutually exclusive)
- Rarity must have at least 1 enabled card

---

### 2. minRarity

Guarantees AT LEAST 1 card of the minimum rarity or higher. Remaining cards follow normal probability distribution.

**Example**:

```typescript
{
	minRarity: 'epic'; // At least 1 epic or legendary card
}
```

**Use Cases**:

- "Tirage Épique" card (guarantees at least 1 epic+)
- Premium draws with guaranteed quality

**Constraints**:

- Cannot be used with `forceRarity` (mutually exclusive)
- First card is guaranteed to be minRarity or higher
- Remaining cards follow normal distribution

---

### 3. excludeCardIds

Excludes specific card IDs from the selection pool.

**Example**:

```typescript
{
	excludeCardIds: ['bonus', 'super-bonus', 'mega-bonus'];
}
```

**Use Cases**:

- "Tirage Légendaire Exclusif" card (excludes common legendaries)
- Preventing duplicate cards in chain draws
- Event-specific exclusions

**Constraints**:

- Array can contain up to 50 card IDs
- Cannot exclude all available cards

---

### 4. onlyCardsWithActions

Only draws cards that have action definitions (non-null `action` field).

**Example**:

```typescript
{
	onlyCardsWithActions: true;
}
```

**Use Cases**:

- "Tirage Actions" card (only draws actionable cards)
- Special events focusing on interactive cards

**Constraints**:

- Must have at least 1 enabled card with an action

---

## Combined Filters

Filters can be combined for complex draw scenarios:

```typescript
{
  minRarity: 'rare',
  excludeCardIds: ['bonus', 'super-bonus'],
  onlyCardsWithActions: true
}
```

**Validation Rules**:

- ✅ `minRarity` + `excludeCardIds` + `onlyCardsWithActions` (compatible)
- ✅ `forceRarity` + `excludeCardIds` (compatible)
- ✅ `forceRarity` + `onlyCardsWithActions` (compatible)
- ❌ `forceRarity` + `minRarity` (mutually exclusive)

---

## Example Card Definitions

From `/src/lib/types/vip-card.ts`:

```typescript
// Force rare rarity
{
  id: 'tirage-rare-garanti',
  name: 'Tirage Rare Garanti',
  description: 'Tire 3 cartes garanties rares',
  rarity: 'epic',
  action: {
    type: 'draw_cards',
    count: 3,
    filters: {
      forceRarity: 'rare'
    }
  }
}

// Guarantee at least 1 epic card
{
  id: 'tirage-epique',
  name: 'Tirage Épique',
  description: 'Tire 5 cartes dont au moins 1 épique ou légendaire',
  rarity: 'rare',
  action: {
    type: 'draw_cards',
    count: 5,
    filters: {
      minRarity: 'epic'
    }
  }
}

// Only cards with actions
{
  id: 'tirage-actions',
  name: 'Tirage Actions',
  description: 'Tire 3 cartes avec actions uniquement',
  rarity: 'rare',
  action: {
    type: 'draw_cards',
    count: 3,
    filters: {
      onlyCardsWithActions: true
    }
  }
}

// Exclude specific legendaries
{
  id: 'tirage-legendaire-exclu',
  name: 'Tirage Légendaire Exclusif',
  description: 'Tire 2 cartes en excluant Sheikh et Fortune',
  rarity: 'legendary',
  action: {
    type: 'draw_cards',
    count: 2,
    filters: {
      excludeCardIds: ['Sheikh', 'fortune']
    }
  }
}
```

---

## Running Tests

### All Tests

```bash
# Run all unit tests
pnpm test:unit

# Run all database/trigger tests (requires Supabase local)
pnpm db:start
pnpm test:triggers
```

### Specific Test Files

```bash
# Unit tests only
pnpm test:unit tests/unit/vip-card-filters.test.ts

# Database tests only (requires Supabase local)
pnpm test:triggers tests/database/triggers/vip-card-filters.test.ts
```

### Watch Mode

```bash
# Unit tests with watch
pnpm test:unit tests/unit/vip-card-filters.test.ts --watch
```

---

## Test Patterns

### Database Tests

Uses real Supabase local instance with Docker:

```typescript
const student = await TestData.profile().withRole('student').create();
const teacher = await TestData.profile().withRole('teacher').create();
const classRoom = await TestData.class(teacher.id).create();

await serviceClient.from('class_members').insert({
	student_id: student.id,
	class_id: classRoom.id
});

const teacherClient = await createAuthenticatedClient(teacher.email);

const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 10, {
	forceRarity: 'rare'
});
```

### Unit Tests

Uses mocked Supabase client:

```typescript
const { mockClient, mockRpc } = createMockSupabaseClient();

mockRpc.mockResolvedValue({
  data: {
    cards: [...]
  },
  error: null
});

const result = await executeVipCardAction({
  action: {
    type: 'draw_cards',
    count: 1,
    filters: { forceRarity: 'rare' }
  },
  studentId: '...',
  supabase: mockClient,
  teacherId: '...'
});
```

---

## Success Criteria

- ✅ All 30 database/trigger tests pass
- ✅ All 28 unit tests pass
- ✅ 100% coverage of filter types
- ✅ 100% coverage of filter combinations
- ✅ 100% coverage of error cases
- ✅ Response format validation
- ✅ Zod schema validation
- ✅ Database state verification

---

## Notes

1. **Database tests are slower** (~1-2 seconds per test) due to real database operations
2. **Unit tests are fast** (~10-20ms per test) due to mocking
3. **Trigger tests require Docker** and Supabase local instance
4. **Unit tests can run anywhere** without external dependencies
5. **Both test suites are complementary** and provide full coverage

---

## Future Enhancements

Potential additions to the test suite:

- [ ] Performance tests (large batch draws with filters)
- [ ] Concurrent request tests (race condition verification)
- [ ] Statistical distribution tests with filters (verify weighted selection still works)
- [ ] Edge case testing with all cards disabled except 1
- [ ] Integration tests with real card action chains (card draws card that draws card)
