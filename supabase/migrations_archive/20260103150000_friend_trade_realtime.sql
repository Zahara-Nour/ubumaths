-- =====================================================================
-- FRIEND TRADE REALTIME VALIDATION
-- =====================================================================
-- This migration adds mutual validation columns to marketplace_trades
-- to support real-time synchronization of friend-to-friend trade
-- confirmation between two participants.
--
-- Features:
-- - Separate validation flags for initiator and partner
-- - Automatic timestamp when both parties validate
-- - Reset mechanism if either party revokes validation
-- =====================================================================

-- =====================================================================
-- 1. ADD NEW COLUMNS TO marketplace_trades
-- =====================================================================

-- Add validation columns for mutual confirmation
-- validated_by_initiator: TRUE when initiator confirms the current offer
ALTER TABLE public.marketplace_trades
ADD COLUMN IF NOT EXISTS validated_by_initiator BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN public.marketplace_trades.validated_by_initiator IS 'TRUE when initiator has validated the current offer';

-- validated_by_partner: TRUE when partner confirms the current offer
ALTER TABLE public.marketplace_trades
ADD COLUMN IF NOT EXISTS validated_by_partner BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN public.marketplace_trades.validated_by_partner IS 'TRUE when partner has validated the current offer';

-- validated_at: Timestamp when BOTH parties have validated (mutual agreement reached)
ALTER TABLE public.marketplace_trades
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.marketplace_trades.validated_at IS 'Timestamp when both parties validated the offer (mutual agreement)';

-- confirmation_started_at: Timestamp when confirmation modal was opened (both validated)
ALTER TABLE public.marketplace_trades
ADD COLUMN IF NOT EXISTS confirmation_started_at TIMESTAMPTZ;

COMMENT ON COLUMN public.marketplace_trades.confirmation_started_at IS 'Timestamp when the confirmation modal opened (both parties validated)';

-- Add constraint to ensure timestamp consistency
-- Ensures timestamps are NULL when not fully validated, or both set when fully validated
ALTER TABLE public.marketplace_trades
DROP CONSTRAINT IF EXISTS validate_timestamps_consistency;

ALTER TABLE public.marketplace_trades
ADD CONSTRAINT validate_timestamps_consistency CHECK (
    (validated_at IS NULL AND confirmation_started_at IS NULL) OR
    (validated_by_initiator = TRUE AND validated_by_partner = TRUE AND validated_at IS NOT NULL AND confirmation_started_at IS NOT NULL)
);

COMMENT ON CONSTRAINT validate_timestamps_consistency ON public.marketplace_trades IS 'Ensures timestamps are NULL when not fully validated, or both set when fully validated';

-- =====================================================================
-- 2. CREATE TRIGGER FUNCTION FOR VALIDATION TIMESTAMPS
-- =====================================================================

-- Drop existing function if it exists to allow recreation
DROP FUNCTION IF EXISTS public.set_trade_validation_timestamp() CASCADE;

-- Trigger function to manage validation timestamps
-- - Sets validated_at and confirmation_started_at when BOTH validations are TRUE
-- - Resets both timestamps to NULL if EITHER validation becomes FALSE
CREATE OR REPLACE FUNCTION public.set_trade_validation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if both parties have now validated
    IF NEW.validated_by_initiator = TRUE AND NEW.validated_by_partner = TRUE THEN
        -- Both validated: set timestamps if not already set
        IF OLD.validated_at IS NULL OR
           OLD.validated_by_initiator = FALSE OR
           OLD.validated_by_partner = FALSE THEN
            NEW.validated_at := NOW();
            NEW.confirmation_started_at := NOW();
        END IF;
    ELSE
        -- At least one party has not validated: reset timestamps
        NEW.validated_at := NULL;
        NEW.confirmation_started_at := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.set_trade_validation_timestamp IS 'Manages validation timestamps based on mutual validation state';

-- NOTE: If validation is revoked and re-enabled, validated_at is reset to the NEW confirmation time.
-- This is intentional: validated_at represents "when was the last mutual validation established?"
-- This matches the UX where users can modify and re-validate multiple times during negotiation.

-- =====================================================================
-- 3. CREATE TRIGGER
-- =====================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_trade_validation_timestamp_trigger ON public.marketplace_trades;

-- Create trigger that fires on UPDATE when validation columns change
CREATE TRIGGER set_trade_validation_timestamp_trigger
    BEFORE UPDATE ON public.marketplace_trades
    FOR EACH ROW
    WHEN (
        OLD.validated_by_initiator IS DISTINCT FROM NEW.validated_by_initiator OR
        OLD.validated_by_partner IS DISTINCT FROM NEW.validated_by_partner
    )
    EXECUTE FUNCTION public.set_trade_validation_timestamp();

-- =====================================================================
-- 4. CREATE INDEX FOR PERFORMANCE
-- =====================================================================

-- Index for finding trades with mutual validation (for potential timeout cleanup)
CREATE INDEX IF NOT EXISTS idx_marketplace_trades_validated_at
ON public.marketplace_trades(validated_at)
WHERE validated_at IS NOT NULL;

-- =====================================================================
-- 5. RLS POLICIES VERIFICATION
-- =====================================================================
-- The existing RLS policies on marketplace_trades already cover these new columns:
-- - "marketplace_trades_select_participants": participants can SELECT all columns
-- - "marketplace_trades_update_participants": participants can UPDATE all columns
-- No new policies needed as the validation columns follow the same access pattern.

-- =====================================================================
-- 6. GRANT PERMISSIONS
-- =====================================================================
-- No additional grants needed - the existing table-level grants apply to new columns

-- =====================================================================
-- 7. DOCUMENTATION
-- =====================================================================
--
-- Usage:
-- 1. When a participant validates the current offer:
--    UPDATE marketplace_trades
--    SET validated_by_initiator = TRUE
--    WHERE id = <trade_id> AND initiator_id = auth.uid();
--
-- 2. When a participant revokes validation (e.g., modifies the offer):
--    UPDATE marketplace_trades
--    SET validated_by_initiator = FALSE, validated_by_partner = FALSE
--    WHERE id = <trade_id>;
--
-- 3. The trigger automatically:
--    - Sets validated_at and confirmation_started_at when both are TRUE
--    - Clears both timestamps when either validation becomes FALSE
--
-- 4. Client-side Realtime subscription:
--    supabase.channel('trade:<trade_id>')
--      .on('postgres_changes', {
--        event: 'UPDATE',
--        schema: 'public',
--        table: 'marketplace_trades',
--        filter: `id=eq.<trade_id>`
--      }, handleTradeUpdate)
--      .subscribe()
-- =====================================================================
