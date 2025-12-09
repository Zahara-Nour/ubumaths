# Triggers and Functions Reference

> Database triggers and helper functions for the audit trail system.

## Table of Contents

- [Triggers Overview](#triggers-overview)
- [Reward Events Triggers](#reward-events-triggers)
- [Automatic Logging Triggers](#automatic-logging-triggers)
- [Helper Functions](#helper-functions)
- [Description Generation](#description-generation)

---

## Triggers Overview

The audit trail system uses **AFTER INSERT** triggers with **SECURITY DEFINER** to automatically populate the unified `reward_events` table from source tables. This ensures:

1. **Consistency** - All events are captured regardless of API path
2. **Security** - Triggers run with elevated privileges to bypass RLS
3. **Atomicity** - Event logging is part of the same transaction
4. **Deduplication** - EXISTS checks prevent duplicate entries

```
┌─────────────────────┐
│   Source Insert     │
│ (gidouilles_history)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  AFTER INSERT       │
│  Trigger fires      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Trigger Function   │
│  (SECURITY DEFINER) │
│  - Check EXISTS     │
│  - Map event_type   │
│  - Generate desc    │
│  - INSERT event     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   reward_events     │
│   (new row)         │
└─────────────────────┘
```

---

## Reward Events Triggers

### Trigger: log_gidouilles_to_events

**Source**: `gidouilles_history`
**Migration**: `20251121115959_create_reward_events_table.sql` (lines 62-117)

```sql
CREATE OR REPLACE FUNCTION public.log_gidouilles_history_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_type public.reward_event_type;
    v_description TEXT;
BEGIN
    -- Skip if already logged (deduplication)
    IF EXISTS (
        SELECT 1 FROM public.reward_events
        WHERE source_table = 'gidouilles_history'
          AND source_id = NEW.id
          AND student_id = NEW.student_id
    ) THEN
        RETURN NEW;
    END IF;

    -- Determine event type based on delta and context
    IF NEW.delta > 0 THEN
        IF NEW.created_by IS NOT NULL THEN
            v_event_type := 'awarded';
        ELSE
            v_event_type := 'earned';
        END IF;
    ELSE
        IF NEW.reason ILIKE '%achat%' OR NEW.reason ILIKE '%boutique%' THEN
            v_event_type := 'spent';
        ELSIF NEW.reason ILIKE '%échange%' OR NEW.reason ILIKE '%trade%' THEN
            v_event_type := 'traded';
        ELSIF NEW.created_by IS NOT NULL THEN
            v_event_type := 'removed';
        ELSE
            v_event_type := 'spent';
        END IF;
    END IF;

    -- Generate description
    v_description := public.generate_reward_event_description(
        'gidouilles'::public.reward_type,
        v_event_type,
        ABS(NEW.delta),
        NULL,
        jsonb_build_object('reason', NEW.reason)
    );

    -- Insert event
    INSERT INTO public.reward_events (
        student_id, reward_type, event_type, amount,
        description, metadata, source_table, source_id,
        class_id, created_by, created_at
    ) VALUES (
        NEW.student_id, 'gidouilles', v_event_type, ABS(NEW.delta),
        v_description,
        jsonb_build_object('reason', NEW.reason, 'delta', NEW.delta),
        'gidouilles_history', NEW.id,
        NEW.class_id, NEW.created_by, NEW.created_at
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_gidouilles_to_events
    AFTER INSERT ON public.gidouilles_history
    FOR EACH ROW
    EXECUTE FUNCTION public.log_gidouilles_history_to_events();
```

### Event Type Mapping

| Condition                                          | event_type |
| -------------------------------------------------- | ---------- |
| `delta > 0` AND `created_by IS NULL`               | `earned`   |
| `delta > 0` AND `created_by IS NOT NULL`           | `awarded`  |
| `delta < 0` AND reason contains 'achat'/'boutique' | `spent`    |
| `delta < 0` AND reason contains 'échange'/'trade'  | `traded`   |
| `delta < 0` AND `created_by IS NOT NULL`           | `removed`  |
| `delta < 0` (other)                                | `spent`    |

---

### Trigger: log_bonus_to_events

**Source**: `bonus_history`
**Migration**: `20251121115959_create_reward_events_table.sql` (lines 119-155)

Similar structure to gidouilles trigger with simpler mapping:

- `delta > 0` → `earned`
- `delta < 0` → `used`

---

### Trigger: log_vip_cards_to_events

**Source**: `vip_cards_activity`
**Migration**: `20251121115959_create_reward_events_table.sql` (lines 157-205)

```sql
CREATE OR REPLACE FUNCTION public.log_vip_cards_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_type public.reward_event_type;
    v_card_name TEXT;
    v_description TEXT;
BEGIN
    -- Deduplication check
    IF EXISTS (
        SELECT 1 FROM public.reward_events
        WHERE source_table = 'vip_cards_activity'
          AND source_id = NEW.id
          AND student_id = NEW.student_id
    ) THEN
        RETURN NEW;
    END IF;

    -- Map action to event_type
    CASE NEW.action
        WHEN 'gained' THEN v_event_type := 'unlocked';
        WHEN 'used' THEN v_event_type := 'used';
        WHEN 'removed' THEN v_event_type := 'removed';
        WHEN 'traded' THEN v_event_type := 'traded';
        ELSE v_event_type := 'unlocked';
    END CASE;

    -- Get card display name from template
    v_card_name := COALESCE(
        NEW.metadata->>'card_name',
        NEW.card_template_id
    );

    -- Generate description
    v_description := public.generate_reward_event_description(
        'vip_card'::public.reward_type,
        v_event_type,
        NULL,
        v_card_name,
        NEW.metadata
    );

    INSERT INTO public.reward_events (
        student_id, reward_type, event_type, item_name,
        description, metadata, source_table, source_id, created_at
    ) VALUES (
        NEW.student_id, 'vip_card', v_event_type, v_card_name,
        v_description,
        jsonb_build_object(
            'card_template_id', NEW.card_template_id,
            'card_instance_id', NEW.card_instance_id
        ) || COALESCE(NEW.metadata, '{}'),
        'vip_cards_activity', NEW.id, NEW.created_at
    );

    RETURN NEW;
END;
$$;
```

---

### Trigger: log_achievements_to_events

**Source**: `student_achievements`
**Migration**: `20251121115959_create_reward_events_table.sql` (lines 207-245)

Maps achievement unlocks to `unlocked` event type with achievement name as `item_name`.

---

### Trigger: log_shop_purchases_to_events

**Source**: `shop_purchase_history`
**Migration**: `20251121115959_create_reward_events_table.sql` (lines 247-295)

```sql
-- Joins with shop_item_templates to get item name
SELECT name INTO v_item_name
FROM public.shop_item_templates
WHERE id = NEW.template_id;

-- Creates 'purchased' event
v_event_type := 'purchased';
```

---

### Trigger: log_item_usage_to_events

**Source**: `item_usage_log`
**Migration**: `20251121115959_create_reward_events_table.sql` (lines 297-340)

Creates `used` events with usage context in metadata.

---

### Trigger: log_marketplace_trades_to_events

**Source**: `marketplace_trades`
**Migration**: `20251121115959_create_reward_events_table.sql` (lines 342-420)

**Creates TWO events per trade:**

1. Event for sender (traded away)
2. Event for receiver (received)

```sql
-- Event for sender
INSERT INTO public.reward_events (
    student_id, reward_type, event_type, amount, item_name, ...
) VALUES (
    NEW.sender_id, v_reward_type, 'traded', NEW.amount, ...
);

-- Event for receiver
INSERT INTO public.reward_events (
    student_id, reward_type, event_type, amount, item_name, ...
) VALUES (
    NEW.receiver_id, v_reward_type, 'earned', NEW.amount, ...
);
```

---

## Automatic Logging Triggers

### Trigger: auto_log_vip_card_changes

**Source**: `profiles` table (watches `vip_cards` column)
**Migration**: `20251113140346_create_vip_cards_activity_table.sql`

Automatically logs to `vip_cards_activity` when the JSONB `vip_cards` column changes.

```sql
CREATE OR REPLACE FUNCTION public.log_vip_card_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    old_cards JSONB;
    new_cards JSONB;
    card JSONB;
    card_id TEXT;
BEGIN
    old_cards := COALESCE(OLD.vip_cards, '[]'::JSONB);
    new_cards := COALESCE(NEW.vip_cards, '[]'::JSONB);

    -- Detect new cards (gained)
    FOR card IN SELECT * FROM jsonb_array_elements(new_cards)
    LOOP
        card_id := card->>'instance_id';
        IF NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(old_cards) c
            WHERE c->>'instance_id' = card_id
        ) THEN
            INSERT INTO public.vip_cards_activity (
                student_id, card_instance_id, card_template_id,
                action, metadata
            ) VALUES (
                NEW.id, card_id, card->>'template_id',
                'gained', card
            );
        END IF;
    END LOOP;

    -- Detect removed cards
    FOR card IN SELECT * FROM jsonb_array_elements(old_cards)
    LOOP
        card_id := card->>'instance_id';
        IF NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(new_cards) c
            WHERE c->>'instance_id' = card_id
        ) THEN
            INSERT INTO public.vip_cards_activity (
                student_id, card_instance_id, card_template_id,
                action, metadata
            ) VALUES (
                NEW.id, card_id, card->>'template_id',
                'removed', card
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_vip_card_changes
    AFTER UPDATE OF vip_cards ON public.profiles
    FOR EACH ROW
    WHEN (OLD.vip_cards IS DISTINCT FROM NEW.vip_cards)
    EXECUTE FUNCTION public.log_vip_card_changes();
```

---

### Trigger: auto_log_template_changes

**Source**: `message_templates`
**Migration**: `098_enhance_message_templates.sql`

Automatically logs CRUD operations on message templates.

```sql
CREATE OR REPLACE FUNCTION public.auto_log_template_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_template_action(
            NEW.id, 'created', NEW.created_by, NULL,
            jsonb_build_object('initial_state', row_to_json(NEW))
        );
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.log_template_action(
            NEW.id, 'updated', COALESCE(NEW.updated_by, NEW.created_by),
            jsonb_build_object(
                'old', row_to_json(OLD),
                'new', row_to_json(NEW)
            ),
            NULL
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.log_template_action(
            OLD.id, 'deleted', OLD.created_by,
            jsonb_build_object('deleted_state', row_to_json(OLD)),
            NULL
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;
```

---

## Helper Functions

### log_moderation_action

**Migration**: `20251110120001_create_moderation_logs_and_update_rls.sql` (lines 279-325)

Callable function for logging moderation actions from application code.

```sql
CREATE OR REPLACE FUNCTION public.log_moderation_action(
    p_action TEXT,
    p_target_type TEXT,
    p_target_id UUID,
    p_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
BEGIN
    -- Validate action
    IF p_action NOT IN (
        'delete_message', 'mute_user', 'unmute_user',
        'timeout_user', 'ban_user', 'unban_user',
        'review_report', 'export_conversation'
    ) THEN
        RAISE EXCEPTION 'Invalid moderation action: %', p_action;
    END IF;

    -- Validate target_type
    IF p_target_type NOT IN ('message', 'user', 'conversation', 'report') THEN
        RAISE EXCEPTION 'Invalid target type: %', p_target_type;
    END IF;

    INSERT INTO public.moderation_logs (
        moderator_id, action, target_type, target_id, reason, metadata
    ) VALUES (
        auth.uid(), p_action, p_target_type, p_target_id, p_reason, p_metadata
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;
```

**Usage:**

```typescript
// From application code
const { data, error } = await supabase.rpc('log_moderation_action', {
	p_action: 'mute_user',
	p_target_type: 'user',
	p_target_id: userId,
	p_reason: 'Inappropriate language',
	p_metadata: { duration_hours: 24 }
});
```

---

### get_user_moderation_history

**Migration**: `20251110120001_create_moderation_logs_and_update_rls.sql` (lines 331-379)

Retrieves moderation history for a specific user.

```sql
CREATE OR REPLACE FUNCTION public.get_user_moderation_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    action TEXT,
    reason TEXT,
    moderator_name TEXT,
    created_at TIMESTAMPTZ,
    metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ml.id,
        ml.action,
        ml.reason,
        p.firstname || ' ' || p.lastname AS moderator_name,
        ml.created_at,
        ml.metadata
    FROM public.moderation_logs ml
    JOIN public.profiles p ON p.id = ml.moderator_id
    WHERE ml.target_type = 'user'
      AND ml.target_id = p_user_id
    ORDER BY ml.created_at DESC
    LIMIT p_limit;
END;
$$;
```

---

### log_template_action

**Migration**: `098_enhance_message_templates.sql` (lines 197-216)

```sql
CREATE OR REPLACE FUNCTION public.log_template_action(
    p_template_id UUID,
    p_action TEXT,
    p_performed_by UUID,
    p_changes JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.template_audit_log (
        template_id, action, performed_by, changes, metadata
    ) VALUES (
        p_template_id, p_action, p_performed_by, p_changes, p_metadata
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;
```

---

## Description Generation

### generate_reward_event_description

**Migration**: `20251121115959_create_reward_events_table.sql` (lines 181-293)

Generates human-readable French descriptions for reward events.

```sql
CREATE OR REPLACE FUNCTION public.generate_reward_event_description(
    p_reward_type public.reward_type,
    p_event_type public.reward_event_type,
    p_amount INTEGER,
    p_item_name TEXT,
    p_metadata JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_description TEXT;
    v_reason TEXT;
BEGIN
    v_reason := p_metadata->>'reason';

    CASE p_reward_type
        WHEN 'gidouilles' THEN
            CASE p_event_type
                WHEN 'earned' THEN
                    v_description := format('Tu as gagné %s gidouille%s',
                        p_amount, CASE WHEN p_amount > 1 THEN 's' ELSE '' END);
                    IF v_reason IS NOT NULL THEN
                        v_description := v_description || ' : ' || v_reason;
                    END IF;
                WHEN 'spent' THEN
                    v_description := format('Tu as dépensé %s gidouille%s',
                        p_amount, CASE WHEN p_amount > 1 THEN 's' ELSE '' END);
                    IF v_reason IS NOT NULL THEN
                        v_description := v_description || ' : ' || v_reason;
                    END IF;
                WHEN 'traded' THEN
                    v_description := format('Tu as échangé %s gidouille%s',
                        p_amount, CASE WHEN p_amount > 1 THEN 's' ELSE '' END);
                WHEN 'awarded' THEN
                    v_description := format('Tu as reçu %s gidouille%s de ton professeur',
                        p_amount, CASE WHEN p_amount > 1 THEN 's' ELSE '' END);
                WHEN 'removed' THEN
                    v_description := format('%s gidouille%s ont été retirées par ton professeur',
                        p_amount, CASE WHEN p_amount > 1 THEN 's' ELSE '' END);
                ELSE
                    v_description := format('%s gidouille%s',
                        p_amount, CASE WHEN p_amount > 1 THEN 's' ELSE '' END);
            END CASE;

        WHEN 'bonus' THEN
            CASE p_event_type
                WHEN 'earned' THEN
                    v_description := format('Tu as gagné %s point%s bonus',
                        p_amount, CASE WHEN p_amount > 1 THEN 's' ELSE '' END);
                WHEN 'used' THEN
                    v_description := format('Tu as utilisé %s point%s bonus',
                        p_amount, CASE WHEN p_amount > 1 THEN 's' ELSE '' END);
                ELSE
                    v_description := format('%s point%s bonus',
                        p_amount, CASE WHEN p_amount > 1 THEN 's' ELSE '' END);
            END CASE;

        WHEN 'vip_card' THEN
            CASE p_event_type
                WHEN 'unlocked' THEN
                    v_description := format('Tu as obtenu la carte VIP "%s"',
                        COALESCE(p_item_name, 'Inconnue'));
                WHEN 'used' THEN
                    v_description := format('Tu as utilisé la carte VIP "%s"',
                        COALESCE(p_item_name, 'Inconnue'));
                WHEN 'removed' THEN
                    v_description := format('La carte VIP "%s" a été retirée',
                        COALESCE(p_item_name, 'Inconnue'));
                WHEN 'traded' THEN
                    v_description := format('Tu as échangé la carte VIP "%s"',
                        COALESCE(p_item_name, 'Inconnue'));
                ELSE
                    v_description := format('Carte VIP "%s"',
                        COALESCE(p_item_name, 'Inconnue'));
            END CASE;

        WHEN 'achievement' THEN
            v_description := format('Tu as débloqué le succès "%s"',
                COALESCE(p_item_name, 'Inconnu'));

        WHEN 'item' THEN
            CASE p_event_type
                WHEN 'purchased' THEN
                    v_description := format('Tu as acheté "%s"',
                        COALESCE(p_item_name, 'Article'));
                WHEN 'used' THEN
                    v_description := format('Tu as utilisé "%s"',
                        COALESCE(p_item_name, 'Article'));
                ELSE
                    v_description := format('Article "%s"',
                        COALESCE(p_item_name, 'Inconnu'));
            END CASE;

        ELSE
            v_description := 'Événement de récompense';
    END CASE;

    RETURN v_description;
END;
$$;
```

### Output Examples

| reward_type | event_type | amount | item_name         | Output                                        |
| ----------- | ---------- | ------ | ----------------- | --------------------------------------------- |
| gidouilles  | earned     | 10     | -                 | "Tu as gagné 10 gidouilles"                   |
| gidouilles  | spent      | 5      | -                 | "Tu as dépensé 5 gidouilles"                  |
| gidouilles  | awarded    | 20     | -                 | "Tu as reçu 20 gidouilles de ton professeur"  |
| vip_card    | unlocked   | -      | "Maître du Temps" | "Tu as obtenu la carte VIP "Maître du Temps"" |
| achievement | unlocked   | -      | "Démineur Expert" | "Tu as débloqué le succès "Démineur Expert""  |
| item        | purchased  | -      | "Gomme Magique"   | "Tu as acheté "Gomme Magique""                |
