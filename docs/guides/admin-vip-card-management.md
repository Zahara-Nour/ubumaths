# Admin Guide: VIP Card Management

> 🔑 Admin-only features for managing VIP cards and rarity probabilities.

## Table of Contents

1. [Overview](#overview)
2. [Managing Card Definitions](#managing-card-definitions)
3. [Configuring Rarity Probabilities](#configuring-rarity-probabilities)
4. [Special Events](#special-events)
5. [Troubleshooting](#troubleshooting)
6. [Best Practices](#best-practices)

---

## Overview

The VIP card system uses a database-driven approach with two core tables:

- **`vip_card_templates`**: Stores all card definitions (name, rarity, enabled status)
- **`vip_card_config`**: Stores rarity probability configurations

Admins can:

- ✅ Enable/disable cards without deleting them
- ✅ Create special event configs with custom probabilities
- ✅ Switch between configs instantly (no code deployment)
- ✅ Schedule events with validity periods

All operations require admin role (`is_admin()` function).

---

## Managing Card Definitions

### View All Cards

```sql
SELECT id, name, rarity, is_enabled, category
FROM vip_card_templates
ORDER BY
  CASE rarity
    WHEN 'common' THEN 1
    WHEN 'rare' THEN 2
    WHEN 'epic' THEN 3
    WHEN 'legendary' THEN 4
  END,
  name;
```

**Expected output**: 26 cards (23 enabled, 3 disabled)

### View Card Distribution

```sql
SELECT
  rarity,
  COUNT(*) as total,
  SUM(CASE WHEN is_enabled THEN 1 ELSE 0 END) as enabled,
  SUM(CASE WHEN NOT is_enabled THEN 1 ELSE 0 END) as disabled
FROM vip_card_templates
GROUP BY rarity
ORDER BY CASE rarity
  WHEN 'common' THEN 1
  WHEN 'rare' THEN 2
  WHEN 'epic' THEN 3
  WHEN 'legendary' THEN 4
END;
```

**Expected**:

- Common: 8 total (6 enabled, 2 disabled)
- Rare: 10 total (9 enabled, 1 disabled)
- Epic: 6 total (6 enabled, 0 disabled)
- Legendary: 2 total (2 enabled, 0 disabled)

---

### Temporarily Disable a Card

**Use Case**: Remove a card from circulation without deleting it (e.g., card is broken, privilege no longer available).

```sql
UPDATE vip_card_templates
SET is_enabled = FALSE
WHERE id = 'Sheikh'; -- Disable legendary Sheikh card
```

**Impact**:

- Card will NOT be drawn from now on
- Students who already own it can still use it
- Card remains in database for future re-enabling

### Re-enable a Card

```sql
UPDATE vip_card_templates
SET is_enabled = TRUE
WHERE id = 'Sheikh';
```

### View Disabled Cards

```sql
SELECT id, name, rarity, category, updated_at
FROM vip_card_templates
WHERE is_enabled = FALSE
ORDER BY updated_at DESC;
```

**Default disabled cards**: candy (common), captain (common), team (rare)

---

### Add a New Card

**⚠️ Important**: Adding a new card requires:

1. Database INSERT
2. TypeScript array update (`src/lib/types/vip-card.ts`)
3. Image upload (`/static/images/vip-cards/`)

**Step 1: Database INSERT**

```sql
INSERT INTO vip_card_templates (
  id,
  name,
  description,
  image_path,
  category,
  rarity,
  is_enabled,
  action,
  sort_order
) VALUES (
  'new-card-id', -- Unique ID (lowercase, kebab-case)
  'French Card Name', -- Display name
  'French description of privilege', -- What the card does
  '/images/vip-cards/new-card@0.5x.webp', -- Image path
  'power', -- Category: bonus, privilege, social, power
  'rare', -- Rarity: common, rare, epic, legendary
  TRUE, -- Enabled by default
  NULL, -- Or JSONB action object (see examples below)
  0 -- Sort order (default)
);
```

**Example with action** (card that draws 2 additional cards):

```sql
INSERT INTO vip_card_templates (id, name, description, image_path, category, rarity, is_enabled, action)
VALUES (
  'double-luck',
  'Double Chance',
  'Pioche 2 cartes VIP supplémentaires',
  '/images/vip-cards/double-luck@0.5x.webp',
  'bonus',
  'rare',
  TRUE,
  '{"type": "draw_cards", "count": 2}'::jsonb
);
```

**Step 2: TypeScript Update**

Edit `src/lib/types/vip-card.ts`:

```typescript
export const VIP_CARDS: VipCard[] = [
	// ... existing cards
	{
		id: 'new-card-id',
		name: 'French Card Name',
		description: 'French description',
		imagePath: '/images/vip-cards/new-card@0.5x.webp',
		category: 'power',
		rarity: 'rare'
	}
];
```

**Step 3: Image Upload**

Upload image to: `/static/images/vip-cards/new-card@0.5x.webp`

- Format: WebP (65% smaller than JPG)
- Resolution: 512×768 recommended
- Naming: `{card-id}@0.5x.webp`

---

## Configuring Rarity Probabilities

### View Active Configuration

```sql
SELECT
  config_name,
  common_probability,
  rare_probability,
  epic_probability,
  legendary_probability,
  is_active,
  description
FROM vip_card_config
WHERE is_active = TRUE;
```

**Default Config** (baseline):

```
config_name: 'default'
common: 60%
rare: 25%
epic: 12%
legendary: 3%
```

### View All Configurations

```sql
SELECT
  config_name,
  is_active,
  common_probability || '/' || rare_probability || '/' ||
    epic_probability || '/' || legendary_probability as probabilities,
  valid_from,
  valid_until,
  description,
  created_at
FROM vip_card_config
ORDER BY is_active DESC, created_at DESC;
```

---

### Update Default Probabilities

**Use Case**: Permanently adjust baseline rarity distribution.

```sql
UPDATE vip_card_config
SET
  common_probability = 55,
  rare_probability = 25,
  epic_probability = 15, -- Increased from 12%
  legendary_probability = 5 -- Increased from 3%
WHERE config_name = 'default';
```

**⚠️ Constraint**: Probabilities must sum to exactly 100 (enforced by database).

**Validation**:

```sql
SELECT
  config_name,
  common_probability + rare_probability + epic_probability + legendary_probability as sum
FROM vip_card_config
WHERE config_name = 'default';
-- Must return sum = 100
```

---

## Special Events

### Creating Event Configurations

**Example 1**: Halloween event with spooky legendary boost

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
  'halloween_2025',
  40, 30, 20, 10, -- Boosted legendary (3→10%)
  FALSE, -- Not active yet (manual activation)
  'Halloween 2025: Spooky legendary cards!',
  '2025-10-25 00:00:00+00',
  '2025-11-01 23:59:59+00'
);
```

**Example 2**: End-of-year celebration (very generous)

```sql
INSERT INTO vip_card_config (
  config_name,
  common_probability,
  rare_probability,
  epic_probability,
  legendary_probability,
  is_active,
  description
) VALUES (
  'end_of_year_2025',
  30, 25, 25, 20, -- 20% legendary!
  FALSE,
  'End of year celebration: Everyone gets legendary cards!'
);
```

---

### Activating Event Configuration

**⚠️ Critical**: Only ONE config can be active at a time.

**Transaction-safe activation**:

```sql
BEGIN;

-- Deactivate current config
UPDATE vip_card_config
SET is_active = FALSE
WHERE is_active = TRUE;

-- Activate event config
UPDATE vip_card_config
SET is_active = TRUE
WHERE config_name = 'halloween_2025';

COMMIT;
```

**Verification**:

```sql
SELECT config_name, is_active FROM vip_card_config WHERE is_active = TRUE;
-- Should return ONLY 'halloween_2025'
```

---

### Deactivating Event (Return to Default)

```sql
BEGIN;

UPDATE vip_card_config
SET is_active = FALSE
WHERE config_name = 'halloween_2025';

UPDATE vip_card_config
SET is_active = TRUE
WHERE config_name = 'default';

COMMIT;
```

---

### Scheduled Events (Manual Process)

**Current limitation**: No automatic scheduling. Admins must manually activate/deactivate.

**Workaround**: Use `valid_from` and `valid_until` for tracking, then manually switch:

```bash
# Example cron job (requires custom script)
# Every day at midnight, check if event should activate

0 0 * * * psql -c "
BEGIN;
-- Deactivate expired events
UPDATE vip_card_config SET is_active = FALSE
WHERE is_active = TRUE
  AND valid_until < NOW();

-- Activate upcoming events
UPDATE vip_card_config SET is_active = TRUE
WHERE config_name = 'halloween_2025'
  AND valid_from <= NOW()
  AND valid_until >= NOW()
  AND NOT EXISTS (SELECT 1 FROM vip_card_config WHERE is_active = TRUE);
COMMIT;
"
```

**Future enhancement**: Automatic scheduling (planned for v2).

---

## Troubleshooting

### Error: "No enabled VIP cards available to draw"

**Symptom**: RPC function raises exception during draw.

**Cause**: All cards in selected rarity are disabled, and fallback to common also failed.

**Diagnosis**:

```sql
-- Check if any common cards are enabled
SELECT COUNT(*) as enabled_common
FROM vip_card_templates
WHERE rarity = 'common' AND is_enabled = TRUE;
-- If 0, this is the problem
```

**Solution**: Enable at least one common card:

```sql
UPDATE vip_card_templates
SET is_enabled = TRUE
WHERE id = 'bonus'; -- Re-enable basic bonus card
```

---

### Error: "Probabilities must sum to 100"

**Symptom**: INSERT or UPDATE fails with constraint violation.

**Cause**: Four probability columns don't sum to exactly 100.

**Example of FAILURE**:

```sql
-- ❌ This will fail (45+25+15+10 = 95)
UPDATE vip_card_config
SET common_probability = 45
WHERE config_name = 'default';
```

**Solution**: Update all probabilities at once:

```sql
-- ✅ This works (45+30+15+10 = 100)
UPDATE vip_card_config
SET
  common_probability = 45,
  rare_probability = 30,
  epic_probability = 15,
  legendary_probability = 10
WHERE config_name = 'default';
```

**Validation helper**:

```sql
-- Before executing UPDATE, calculate sum
SELECT 45 + 30 + 15 + 10 as sum; -- Must equal 100
```

---

### Error: "Unique constraint violation on is_active"

**Symptom**: Cannot activate config because another is already active.

**Cause**: Forgot to deactivate current config first.

**Solution**: Use transaction (see "Activating Event Configuration" above):

```sql
BEGIN;
UPDATE vip_card_config SET is_active = FALSE WHERE is_active = TRUE;
UPDATE vip_card_config SET is_active = TRUE WHERE config_name = 'new_config';
COMMIT;
```

---

### Distribution Doesn't Match Expectations

**Symptom**: Drawing 100 cards gives unexpected rarity distribution.

**Cause**: Small sample size (random variance is high for N < 1000).

**Solution 1**: Test with larger sample

```bash
pnpm test:integration -- vip-card-rarity-distribution
# This draws 10,000 cards and validates ±5% tolerance
```

**Solution 2**: Manual SQL test

```sql
-- This would require custom PL/pgSQL function to draw and analyze
-- See: tests/integration/vip-card-rarity-distribution.test.ts
```

**Solution 3**: Check active config

```sql
-- Verify correct config is active
SELECT
  config_name,
  common_probability,
  rare_probability,
  epic_probability,
  legendary_probability
FROM vip_card_config
WHERE is_active = TRUE;
```

---

### Cards Not Appearing in UI

**Symptom**: Card exists in database but doesn't show in frontend.

**Cause**: TypeScript `VIP_CARDS` array not updated.

**Solution**: Add card to `src/lib/types/vip-card.ts`:

```typescript
export const VIP_CARDS: VipCard[] = [
	// ... existing cards
	{
		id: 'new-card-id', // Must match database id
		name: 'Display Name',
		description: 'Description',
		imagePath: '/images/vip-cards/new-card@0.5x.webp',
		category: 'bonus',
		rarity: 'rare'
	}
];
```

**Rebuild**:

```bash
pnpm build
```

---

## Best Practices

### 1. Always Test Event Configs Before Activating

```bash
# Create test config with extreme probabilities (easy to validate)
INSERT INTO vip_card_config (config_name, common_probability, rare_probability, epic_probability, legendary_probability, is_active)
VALUES ('test_legendary_100', 0, 0, 0, 100, FALSE);

# Temporarily activate for testing
BEGIN;
UPDATE vip_card_config SET is_active = FALSE WHERE is_active = TRUE;
UPDATE vip_card_config SET is_active = TRUE WHERE config_name = 'test_legendary_100';
COMMIT;

# Draw 10 cards (should ALL be legendary)
# ... test via UI or RPC ...

# Return to default
BEGIN;
UPDATE vip_card_config SET is_active = FALSE WHERE config_name = 'test_legendary_100';
UPDATE vip_card_config SET is_active = TRUE WHERE config_name = 'default';
COMMIT;

# Delete test config
DELETE FROM vip_card_config WHERE config_name = 'test_legendary_100';
```

---

### 2. Document All Events

Always add clear descriptions to configs:

```sql
INSERT INTO vip_card_config (...)
VALUES (
  'christmas_2025',
  ...,
  'Christmas 2025: Gift-themed bonus drops (Dec 15 - Jan 5)' -- Clear description
);
```

---

### 3. Schedule Events with Valid Dates

Use `valid_from` and `valid_until` for tracking:

```sql
INSERT INTO vip_card_config (
  config_name,
  ...,
  valid_from,
  valid_until
) VALUES (
  'spring_break_2025',
  ...,
  '2025-03-15 00:00:00+00',
  '2025-03-30 23:59:59+00'
);
```

Then query upcoming events:

```sql
SELECT config_name, valid_from, valid_until, description
FROM vip_card_config
WHERE valid_from >= NOW()
ORDER BY valid_from;
```

---

### 4. Backup Before Major Changes

```bash
# Export configs before modifying
psql -c "COPY vip_card_config TO '/tmp/vip_config_backup.csv' CSV HEADER;"

# Export card templates
psql -c "COPY vip_card_templates TO '/tmp/vip_cards_backup.csv' CSV HEADER;"
```

**Restore**:

```bash
psql -c "COPY vip_card_config FROM '/tmp/vip_config_backup.csv' CSV HEADER;"
```

---

### 5. Gradual Rollout for Major Changes

**Example**: Testing new probabilities

```sql
-- 1. Create test config
INSERT INTO vip_card_config (config_name, ...) VALUES ('test_new_probs', ...);

-- 2. Activate for small group (e.g., single class)
--    (Requires per-class configs - not yet implemented)

-- 3. Monitor distribution for 1 week

-- 4. If successful, update default config
UPDATE vip_card_config SET ... WHERE config_name = 'default';
```

---

### 6. Monitor Card Usage

**Query**: Which cards are most/least used?

```sql
-- This requires extracting from profiles.vip_cards JSONB
-- Example (requires custom analysis function):
SELECT
  jsonb_object_keys(vip_cards) as instance_id,
  vip_cards->>instance_id->>'cardId' as card_id
FROM profiles
WHERE vip_cards IS NOT NULL;
```

**Future enhancement**: Dedicated `vip_card_draws` audit table for analytics.

---

## SQL Reference

### Quick Commands

```sql
-- View active config
SELECT * FROM vip_card_config WHERE is_active = TRUE;

-- Switch to event
BEGIN;
UPDATE vip_card_config SET is_active = FALSE WHERE is_active = TRUE;
UPDATE vip_card_config SET is_active = TRUE WHERE config_name = 'event_name';
COMMIT;

-- Disable card
UPDATE vip_card_templates SET is_enabled = FALSE WHERE id = 'card-id';

-- View disabled cards
SELECT id, name, rarity FROM vip_card_templates WHERE is_enabled = FALSE;

-- Validate config probabilities
SELECT
  config_name,
  common_probability + rare_probability + epic_probability + legendary_probability as sum
FROM vip_card_config;
-- sum must equal 100 for all rows
```

---

## Admin Access

**Database Access**: Requires Supabase admin credentials or service role key.

**RLS Bypass**: Use service role client:

```typescript
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ Keep secret!
);
```

**Admin UI** (future): Web interface for config management (planned for v2).

---

**Last Updated**: 2025-11-04
**Maintainer**: Admin team
**Related Docs**:

- [Database Schema](../architecture/database-schema.md)
- [VIP Card Draw System](../features/vip-card-draw-system.md)
