-- =====================================================================
-- STUDENT MARKETPLACE FOUNDATION
-- =====================================================================
-- This migration creates the complete database foundation for the student
-- marketplace feature, enabling students to trade VIP cards and gidouilles
-- within their school through friend-to-friend trading or public listings.
--
-- Key Features:
-- - School/class-level marketplace control
-- - Public listings with proposal system
-- - Friend-to-friend negotiation with counter-offers
-- - Card locking to prevent double-spending
-- - Mini-chat for friend negotiations
-- - Atomic trade execution with rollback support
-- =====================================================================

-- =====================================================================
-- 1. CREATE TABLES
-- =====================================================================

-- ---------------------------------------------------------------------
-- marketplace_config: Controls marketplace enable/disable and limits
-- ---------------------------------------------------------------------
CREATE TABLE public.marketplace_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Scope (exactly one must be set)
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,

    -- Enable/disable controls
    enabled_globally BOOLEAN DEFAULT false, -- For school-level config
    enabled_for_class BOOLEAN DEFAULT true, -- For class-level config

    -- Trading limits
    max_listings_per_student INTEGER DEFAULT 5 CHECK (max_listings_per_student >= 0 AND max_listings_per_student <= 20),
    max_trades_per_day INTEGER DEFAULT 10 CHECK (max_trades_per_day >= 0 AND max_trades_per_day <= 100),
    listing_duration_days INTEGER DEFAULT 7 CHECK (listing_duration_days >= 1 AND listing_duration_days <= 30),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT either_school_or_class CHECK (
        (school_id IS NOT NULL AND class_id IS NULL) OR
        (school_id IS NULL AND class_id IS NOT NULL)
    ),
    CONSTRAINT unique_school_config UNIQUE(school_id),
    CONSTRAINT unique_class_config UNIQUE(class_id)
);

COMMENT ON TABLE public.marketplace_config IS 'Configuration for marketplace features at school or class level';
COMMENT ON COLUMN public.marketplace_config.enabled_globally IS 'For school-level: enables marketplace for entire school';
COMMENT ON COLUMN public.marketplace_config.enabled_for_class IS 'For class-level: overrides school setting for specific class';

-- ---------------------------------------------------------------------
-- marketplace_listings: Public sell/buy listings
-- ---------------------------------------------------------------------
CREATE TABLE public.marketplace_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Creator and school scope
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,

    -- Listing details
    listing_type TEXT NOT NULL CHECK (listing_type IN ('sell', 'buy')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed', 'cancelled')),

    -- What's being offered (for sell) or what the buyer has (for buy)
    offered_card_ids TEXT[] DEFAULT '{}',
    offered_gidouilles INTEGER DEFAULT 0 CHECK (offered_gidouilles >= 0),

    -- What's wanted (for sell) or what buyer wants (for buy)
    wanted_card_template_ids TEXT[] DEFAULT '{}', -- Template IDs, not instance IDs
    wanted_gidouilles INTEGER DEFAULT 0 CHECK (wanted_gidouilles >= 0),

    -- Listing metadata
    title TEXT NOT NULL CHECK (LENGTH(title) BETWEEN 3 AND 100),
    description TEXT CHECK (description IS NULL OR LENGTH(description) <= 500),
    max_proposals INTEGER DEFAULT 10 CHECK (max_proposals >= 1 AND max_proposals <= 50),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    -- Statistics
    view_count INTEGER DEFAULT 0 CHECK (view_count >= 0),
    proposal_count INTEGER DEFAULT 0 CHECK (proposal_count >= 0),

    -- Constraints
    CONSTRAINT at_least_one_item CHECK (
        COALESCE(array_length(offered_card_ids, 1), 0) > 0 OR
        offered_gidouilles > 0 OR
        COALESCE(array_length(wanted_card_template_ids, 1), 0) > 0 OR
        wanted_gidouilles > 0
    ),
    CONSTRAINT valid_status_timestamps CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status = 'cancelled' AND cancelled_at IS NOT NULL) OR
        (status IN ('active', 'expired'))
    )
);

COMMENT ON TABLE public.marketplace_listings IS 'Public marketplace listings for selling or buying items';
COMMENT ON COLUMN public.marketplace_listings.offered_card_ids IS 'Array of VIP card instance IDs being offered';
COMMENT ON COLUMN public.marketplace_listings.wanted_card_template_ids IS 'Array of VIP card template IDs wanted (not specific instances)';

-- ---------------------------------------------------------------------
-- marketplace_proposals: Responses to public listings
-- ---------------------------------------------------------------------
CREATE TABLE public.marketplace_proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Relations
    listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
    proposer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Proposal status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),

    -- What the proposer offers
    offered_card_ids TEXT[] DEFAULT '{}',
    offered_gidouilles INTEGER DEFAULT 0 CHECK (offered_gidouilles >= 0),

    -- Messages
    message TEXT CHECK (message IS NULL OR LENGTH(message) <= 500),
    response_message TEXT CHECK (response_message IS NULL OR LENGTH(response_message) <= 500),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    responded_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_proposal_per_user UNIQUE(listing_id, proposer_id),
    CONSTRAINT at_least_one_offer CHECK (
        COALESCE(array_length(offered_card_ids, 1), 0) > 0 OR
        offered_gidouilles > 0
    ),
    CONSTRAINT valid_response_timestamp CHECK (
        (status IN ('accepted', 'rejected') AND responded_at IS NOT NULL) OR
        (status = 'withdrawn' AND withdrawn_at IS NOT NULL) OR
        (status = 'pending')
    )
);

COMMENT ON TABLE public.marketplace_proposals IS 'Proposals/offers made in response to public listings';
COMMENT ON COLUMN public.marketplace_proposals.message IS 'Optional message from proposer to listing creator';
COMMENT ON COLUMN public.marketplace_proposals.response_message IS 'Optional response from listing creator';

-- ---------------------------------------------------------------------
-- marketplace_trades: Friend-to-friend negotiations and completed trades
-- ---------------------------------------------------------------------
CREATE TABLE public.marketplace_trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Trade type and status
    trade_type TEXT NOT NULL CHECK (trade_type IN ('friend', 'marketplace')),
    status TEXT NOT NULL DEFAULT 'negotiating' CHECK (status IN ('negotiating', 'completed', 'cancelled')),

    -- Participants
    initiator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Related entities (for marketplace trades)
    listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
    proposal_id UUID REFERENCES public.marketplace_proposals(id) ON DELETE SET NULL,

    -- Chat conversation (optional, for integration)
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,

    -- Current negotiation state
    current_offer JSONB, -- {from_initiator: {cards: [], gidouilles: 0}, from_partner: {cards: [], gidouilles: 0}}
    last_offer_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Final trade details (when completed)
    final_trade JSONB, -- Same structure as current_offer, locked when trade completes

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT different_participants CHECK (initiator_id != partner_id),
    CONSTRAINT valid_trade_relations CHECK (
        (trade_type = 'friend' AND listing_id IS NULL AND proposal_id IS NULL) OR
        (trade_type = 'marketplace' AND listing_id IS NOT NULL AND proposal_id IS NOT NULL)
    ),
    CONSTRAINT valid_completion CHECK (
        (status = 'completed' AND completed_at IS NOT NULL AND final_trade IS NOT NULL) OR
        (status = 'cancelled' AND cancelled_at IS NOT NULL) OR
        (status = 'negotiating')
    )
);

COMMENT ON TABLE public.marketplace_trades IS 'Friend-to-friend trade negotiations and completed trade history';
COMMENT ON COLUMN public.marketplace_trades.current_offer IS 'Current state of negotiation in JSONB format';
COMMENT ON COLUMN public.marketplace_trades.final_trade IS 'Final agreed trade details, immutable once set';

-- ---------------------------------------------------------------------
-- marketplace_trade_offers: History of all offers/counter-offers
-- ---------------------------------------------------------------------
CREATE TABLE public.marketplace_trade_offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Relations
    trade_id UUID NOT NULL REFERENCES public.marketplace_trades(id) ON DELETE CASCADE,
    offered_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Offer sequence
    offer_number INTEGER NOT NULL CHECK (offer_number >= 1),

    -- What each party offers in this proposal
    initiator_cards TEXT[] DEFAULT '{}',
    initiator_gidouilles INTEGER DEFAULT 0 CHECK (initiator_gidouilles >= 0),
    partner_cards TEXT[] DEFAULT '{}',
    partner_gidouilles INTEGER DEFAULT 0 CHECK (partner_gidouilles >= 0),

    -- Offer status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered')),

    -- Optional message with offer
    message TEXT CHECK (message IS NULL OR LENGTH(message) <= 500),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    responded_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_offer_number UNIQUE(trade_id, offer_number),
    CONSTRAINT at_least_one_item_offered CHECK (
        COALESCE(array_length(initiator_cards, 1), 0) > 0 OR
        initiator_gidouilles > 0 OR
        COALESCE(array_length(partner_cards, 1), 0) > 0 OR
        partner_gidouilles > 0
    )
);

COMMENT ON TABLE public.marketplace_trade_offers IS 'Complete history of offers and counter-offers in friend trades';
COMMENT ON COLUMN public.marketplace_trade_offers.offer_number IS 'Sequential number for this trade, starting at 1';

-- ---------------------------------------------------------------------
-- marketplace_locked_cards: Prevent double-spending of VIP cards
-- ---------------------------------------------------------------------
CREATE TABLE public.marketplace_locked_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Card ownership
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    card_instance_id TEXT NOT NULL, -- UUID key from profiles.vip_cards JSONB

    -- Lock information
    locked_for TEXT NOT NULL CHECK (locked_for IN ('listing', 'trade')),
    locked_entity_id UUID NOT NULL, -- References listing or trade ID

    -- Timestamps
    locked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT unique_card_lock UNIQUE(card_instance_id)
);

COMMENT ON TABLE public.marketplace_locked_cards IS 'Prevents double-spending by locking cards in active listings/trades';
COMMENT ON COLUMN public.marketplace_locked_cards.card_instance_id IS 'UUID key from profiles.vip_cards JSONB object';
COMMENT ON COLUMN public.marketplace_locked_cards.locked_entity_id IS 'ID of the listing or trade that holds the lock';

-- Create trigger to validate foreign key relationships instead of dual FK constraints
CREATE OR REPLACE FUNCTION public.validate_locked_entity_reference()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if entity exists in either marketplace_listings or marketplace_trades
    IF NOT EXISTS (
        SELECT 1 FROM public.marketplace_listings WHERE id = NEW.locked_entity_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.marketplace_trades WHERE id = NEW.locked_entity_id
    ) THEN
        RAISE EXCEPTION 'locked_entity_id % does not exist in marketplace_listings or marketplace_trades', NEW.locked_entity_id;
    END IF;

    -- Validate locked_for matches the actual entity type
    IF NEW.locked_for = 'listing' AND NOT EXISTS (
        SELECT 1 FROM public.marketplace_listings WHERE id = NEW.locked_entity_id
    ) THEN
        RAISE EXCEPTION 'locked_entity_id % is not a valid listing', NEW.locked_entity_id;
    END IF;

    IF NEW.locked_for = 'trade' AND NOT EXISTS (
        SELECT 1 FROM public.marketplace_trades WHERE id = NEW.locked_entity_id
    ) THEN
        RAISE EXCEPTION 'locked_entity_id % is not a valid trade', NEW.locked_entity_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_locked_entity_on_insert
    BEFORE INSERT OR UPDATE ON public.marketplace_locked_cards
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_locked_entity_reference();

-- ---------------------------------------------------------------------
-- marketplace_chat_messages: Mini-chat for friend negotiations
-- ---------------------------------------------------------------------
CREATE TABLE public.marketplace_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Relations
    trade_id UUID NOT NULL REFERENCES public.marketplace_trades(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Message content
    message TEXT NOT NULL CHECK (LENGTH(message) BETWEEN 1 AND 1000),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Optional moderation
    is_flagged BOOLEAN DEFAULT false,
    flagged_reason TEXT CHECK (flagged_reason IS NULL OR LENGTH(flagged_reason) <= 200)
);

COMMENT ON TABLE public.marketplace_chat_messages IS 'Contextual chat messages for friend-to-friend trade negotiations';

-- =====================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================================

-- marketplace_config indexes
CREATE INDEX idx_marketplace_config_school ON public.marketplace_config(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX idx_marketplace_config_class ON public.marketplace_config(class_id) WHERE class_id IS NOT NULL;

-- marketplace_listings indexes
CREATE INDEX idx_marketplace_listings_creator ON public.marketplace_listings(creator_id);
CREATE INDEX idx_marketplace_listings_school ON public.marketplace_listings(school_id);
CREATE INDEX idx_marketplace_listings_status_expires ON public.marketplace_listings(status, expires_at)
    WHERE status = 'active';
CREATE INDEX idx_marketplace_listings_type_status ON public.marketplace_listings(listing_type, status);
CREATE INDEX idx_marketplace_listings_created ON public.marketplace_listings(created_at DESC);

-- marketplace_proposals indexes
CREATE INDEX idx_marketplace_proposals_listing_status ON public.marketplace_proposals(listing_id, status);
CREATE INDEX idx_marketplace_proposals_proposer ON public.marketplace_proposals(proposer_id);
CREATE INDEX idx_marketplace_proposals_created ON public.marketplace_proposals(created_at DESC);
-- Composite index for finding pending proposals efficiently
CREATE INDEX idx_marketplace_proposals_pending ON public.marketplace_proposals(listing_id, created_at DESC)
    WHERE status = 'pending';

-- marketplace_trades indexes
CREATE INDEX idx_marketplace_trades_participants ON public.marketplace_trades(initiator_id, partner_id);
CREATE INDEX idx_marketplace_trades_status ON public.marketplace_trades(status);
CREATE INDEX idx_marketplace_trades_listing ON public.marketplace_trades(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX idx_marketplace_trades_completed ON public.marketplace_trades(completed_at DESC) WHERE completed_at IS NOT NULL;
-- GIN indexes for JSONB columns if frequently queried
CREATE INDEX idx_marketplace_trades_current_offer ON public.marketplace_trades USING GIN(current_offer);
CREATE INDEX idx_marketplace_trades_final_trade ON public.marketplace_trades USING GIN(final_trade)
    WHERE final_trade IS NOT NULL;

-- marketplace_trade_offers indexes
CREATE INDEX idx_marketplace_trade_offers_trade ON public.marketplace_trade_offers(trade_id, offer_number);
CREATE INDEX idx_marketplace_trade_offers_offered_by ON public.marketplace_trade_offers(offered_by);

-- marketplace_locked_cards indexes
CREATE INDEX idx_marketplace_locked_cards_student ON public.marketplace_locked_cards(student_id);
CREATE INDEX idx_marketplace_locked_cards_entity ON public.marketplace_locked_cards(locked_entity_id);
CREATE INDEX idx_marketplace_locked_cards_locked_for ON public.marketplace_locked_cards(locked_for);

-- marketplace_chat_messages indexes
CREATE INDEX idx_marketplace_chat_messages_trade_created ON public.marketplace_chat_messages(trade_id, created_at);
CREATE INDEX idx_marketplace_chat_messages_sender ON public.marketplace_chat_messages(sender_id);

-- =====================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE public.marketplace_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_trade_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_locked_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_chat_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 4. CREATE RLS POLICIES
-- =====================================================================

-- ---------------------------------------------------------------------
-- marketplace_config policies
-- ---------------------------------------------------------------------

-- All authenticated users can view configs (to check if enabled)
CREATE POLICY "marketplace_config_select_authenticated" ON public.marketplace_config
    FOR SELECT TO authenticated
    USING (true);

-- Teachers can update their class configs
CREATE POLICY "marketplace_config_update_teacher_class" ON public.marketplace_config
    FOR UPDATE TO authenticated
    USING (
        class_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = marketplace_config.class_id
            AND c.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        class_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = marketplace_config.class_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Admins can insert/update school configs (extend this based on your admin system)
CREATE POLICY "marketplace_config_all_admin" ON public.marketplace_config
    FOR ALL TO authenticated
    USING (
        school_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    )
    WITH CHECK (
        school_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- ---------------------------------------------------------------------
-- marketplace_listings policies
-- ---------------------------------------------------------------------

-- Students can view active listings from their school
CREATE POLICY "marketplace_listings_select_same_school" ON public.marketplace_listings
    FOR SELECT TO authenticated
    USING (
        status = 'active' AND
        school_id IN (
            SELECT DISTINCT s.id
            FROM public.schools s
            JOIN public.classes c ON c.school_id = s.id
            JOIN public.class_members cm ON cm.class_id = c.id
            WHERE cm.student_id = auth.uid()
        )
    );

-- Creators can view all their own listings
CREATE POLICY "marketplace_listings_select_own" ON public.marketplace_listings
    FOR SELECT TO authenticated
    USING (creator_id = auth.uid());

-- Students can create listings if under limit
CREATE POLICY "marketplace_listings_insert_student" ON public.marketplace_listings
    FOR INSERT TO authenticated
    WITH CHECK (
        creator_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'student'
        ) AND
        -- Check active listing limit
        (
            SELECT COUNT(*)
            FROM public.marketplace_listings l
            WHERE l.creator_id = auth.uid()
            AND l.status = 'active'
        ) < 5
    );

-- Only creators can update their listings
CREATE POLICY "marketplace_listings_update_creator" ON public.marketplace_listings
    FOR UPDATE TO authenticated
    USING (creator_id = auth.uid())
    WITH CHECK (creator_id = auth.uid());

-- Only creators can delete/cancel their listings
CREATE POLICY "marketplace_listings_delete_creator" ON public.marketplace_listings
    FOR DELETE TO authenticated
    USING (creator_id = auth.uid());

-- ---------------------------------------------------------------------
-- marketplace_proposals policies
-- ---------------------------------------------------------------------

-- Listing creators see all proposals for their listings
CREATE POLICY "marketplace_proposals_select_listing_creator" ON public.marketplace_proposals
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.marketplace_listings l
            WHERE l.id = marketplace_proposals.listing_id
            AND l.creator_id = auth.uid()
        )
    );

-- Proposers see their own proposals
CREATE POLICY "marketplace_proposals_select_own" ON public.marketplace_proposals
    FOR SELECT TO authenticated
    USING (proposer_id = auth.uid());

-- Students can create proposals (one per listing)
CREATE POLICY "marketplace_proposals_insert_student" ON public.marketplace_proposals
    FOR INSERT TO authenticated
    WITH CHECK (
        proposer_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'student'
        ) AND
        -- Can't propose to own listing
        NOT EXISTS (
            SELECT 1 FROM public.marketplace_listings l
            WHERE l.id = listing_id
            AND l.creator_id = auth.uid()
        ) AND
        -- Listing must be active
        EXISTS (
            SELECT 1 FROM public.marketplace_listings l
            WHERE l.id = listing_id
            AND l.status = 'active'
        )
    );

-- Proposers can withdraw, listing creators can accept/reject
CREATE POLICY "marketplace_proposals_update_authorized" ON public.marketplace_proposals
    FOR UPDATE TO authenticated
    USING (
        proposer_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.marketplace_listings l
            WHERE l.id = marketplace_proposals.listing_id
            AND l.creator_id = auth.uid()
        )
    )
    WITH CHECK (
        proposer_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.marketplace_listings l
            WHERE l.id = marketplace_proposals.listing_id
            AND l.creator_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------
-- marketplace_trades policies
-- ---------------------------------------------------------------------

-- Participants can view their trades
CREATE POLICY "marketplace_trades_select_participants" ON public.marketplace_trades
    FOR SELECT TO authenticated
    USING (initiator_id = auth.uid() OR partner_id = auth.uid());

-- Initiators can create trades (friendship verified in RPC)
CREATE POLICY "marketplace_trades_insert_initiator" ON public.marketplace_trades
    FOR INSERT TO authenticated
    WITH CHECK (
        initiator_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'student'
        )
    );

-- Participants can update their trades
CREATE POLICY "marketplace_trades_update_participants" ON public.marketplace_trades
    FOR UPDATE TO authenticated
    USING (initiator_id = auth.uid() OR partner_id = auth.uid())
    WITH CHECK (initiator_id = auth.uid() OR partner_id = auth.uid());

-- Participants can delete/cancel their trades
CREATE POLICY "marketplace_trades_delete_participants" ON public.marketplace_trades
    FOR DELETE TO authenticated
    USING (initiator_id = auth.uid() OR partner_id = auth.uid());

-- ---------------------------------------------------------------------
-- marketplace_trade_offers policies
-- ---------------------------------------------------------------------

-- Participants can view offers for their trades
CREATE POLICY "marketplace_trade_offers_select_participants" ON public.marketplace_trade_offers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.marketplace_trades t
            WHERE t.id = marketplace_trade_offers.trade_id
            AND (t.initiator_id = auth.uid() OR t.partner_id = auth.uid())
        )
    );

-- Participants can create offers for their trades
CREATE POLICY "marketplace_trade_offers_insert_participants" ON public.marketplace_trade_offers
    FOR INSERT TO authenticated
    WITH CHECK (
        offered_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.marketplace_trades t
            WHERE t.id = trade_id
            AND (t.initiator_id = auth.uid() OR t.partner_id = auth.uid())
            AND t.status = 'negotiating'
        )
    );

-- ---------------------------------------------------------------------
-- marketplace_locked_cards policies
-- ---------------------------------------------------------------------

-- Students can view their own locked cards
CREATE POLICY "marketplace_locked_cards_select_own" ON public.marketplace_locked_cards
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

-- Insert/delete only via RPC functions (SECURITY DEFINER)
-- No direct insert/update/delete policies

-- ---------------------------------------------------------------------
-- marketplace_chat_messages policies
-- ---------------------------------------------------------------------

-- Trade participants can view messages
CREATE POLICY "marketplace_chat_messages_select_participants" ON public.marketplace_chat_messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.marketplace_trades t
            WHERE t.id = marketplace_chat_messages.trade_id
            AND (t.initiator_id = auth.uid() OR t.partner_id = auth.uid())
        )
    );

-- Trade participants can send messages
CREATE POLICY "marketplace_chat_messages_insert_participants" ON public.marketplace_chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.marketplace_trades t
            WHERE t.id = trade_id
            AND (t.initiator_id = auth.uid() OR t.partner_id = auth.uid())
            AND t.status = 'negotiating'
        )
    );

-- =====================================================================
-- 5. CREATE RPC FUNCTIONS (SECURITY DEFINER)
-- =====================================================================

-- ---------------------------------------------------------------------
-- check_marketplace_enabled: Check if marketplace is enabled for student
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_marketplace_enabled(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_school_id UUID;
    v_school_enabled BOOLEAN;
    v_class_disabled_count INTEGER;
BEGIN
    -- Get student's school
    SELECT DISTINCT c.school_id INTO v_school_id
    FROM public.classes c
    JOIN public.class_members cm ON cm.class_id = c.id
    WHERE cm.student_id = p_student_id
    LIMIT 1;

    IF v_school_id IS NULL THEN
        RETURN false;
    END IF;

    -- Check school-level config
    SELECT enabled_globally INTO v_school_enabled
    FROM public.marketplace_config
    WHERE school_id = v_school_id;

    -- If no school config or disabled at school level, marketplace is disabled
    IF v_school_enabled IS NULL OR NOT v_school_enabled THEN
        RETURN false;
    END IF;

    -- Check if any of student's classes have marketplace disabled
    SELECT COUNT(*) INTO v_class_disabled_count
    FROM public.classes c
    JOIN public.class_members cm ON cm.class_id = c.id
    LEFT JOIN public.marketplace_config mc ON mc.class_id = c.id
    WHERE cm.student_id = p_student_id
    AND COALESCE(mc.enabled_for_class, true) = false;

    -- If any class has it disabled, marketplace is disabled for student
    RETURN v_class_disabled_count = 0;
END;
$$;

COMMENT ON FUNCTION public.check_marketplace_enabled IS 'Check if marketplace is enabled for a student across school and class levels';

-- ---------------------------------------------------------------------
-- lock_cards: Lock VIP cards to prevent double-spending
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lock_cards(
    p_student_id UUID,
    p_card_ids TEXT[],
    p_entity_id UUID,
    p_lock_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_card_id TEXT;
    v_student_cards JSONB;
    v_card_data JSONB;
    v_is_used BOOLEAN;
BEGIN
    -- Validate lock type
    IF p_lock_type NOT IN ('listing', 'trade') THEN
        RAISE EXCEPTION 'Invalid lock type: %', p_lock_type;
    END IF;

    -- Get student's VIP cards
    SELECT vip_cards INTO v_student_cards
    FROM public.profiles
    WHERE id = p_student_id;

    IF v_student_cards IS NULL THEN
        RAISE EXCEPTION 'Student has no VIP cards';
    END IF;

    -- Check each card
    FOREACH v_card_id IN ARRAY p_card_ids
    LOOP
        -- Check card exists for this student
        v_card_data := v_student_cards->v_card_id;
        IF v_card_data IS NULL THEN
            RAISE EXCEPTION 'Card % does not belong to student', v_card_id;
        END IF;

        -- Check card is not already locked
        IF EXISTS (
            SELECT 1 FROM public.marketplace_locked_cards
            WHERE card_instance_id = v_card_id
        ) THEN
            RAISE EXCEPTION 'Card % is already locked', v_card_id;
        END IF;

        -- Check card is not used (check vip_cards_activity)
        SELECT EXISTS (
            SELECT 1 FROM public.vip_cards_activity
            WHERE card_instance_id = v_card_id
            AND action = 'used'
        ) INTO v_is_used;

        IF v_is_used THEN
            RAISE EXCEPTION 'Card % has already been used', v_card_id;
        END IF;

        -- Lock the card
        INSERT INTO public.marketplace_locked_cards (
            student_id,
            card_instance_id,
            locked_for,
            locked_entity_id
        ) VALUES (
            p_student_id,
            v_card_id,
            p_lock_type,
            p_entity_id
        );
    END LOOP;

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback any partial locks
        DELETE FROM public.marketplace_locked_cards
        WHERE locked_entity_id = p_entity_id;

        RAISE;
END;
$$;

COMMENT ON FUNCTION public.lock_cards IS 'Lock VIP cards to prevent double-spending in marketplace';

-- ---------------------------------------------------------------------
-- unlock_cards: Unlock VIP cards when listing/trade is cancelled/completed
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlock_cards(p_entity_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.marketplace_locked_cards
    WHERE locked_entity_id = p_entity_id;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.unlock_cards IS 'Unlock VIP cards when listing or trade ends';

-- ---------------------------------------------------------------------
-- execute_trade: Atomically execute a completed trade
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_trade(p_trade_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trade RECORD;
    v_final_trade JSONB;
    v_initiator_cards TEXT[];
    v_initiator_gidouilles INTEGER;
    v_partner_cards TEXT[];
    v_partner_gidouilles INTEGER;
    v_initiator_vip_cards JSONB;
    v_partner_vip_cards JSONB;
    v_card_id TEXT;
    v_card_data JSONB;
    v_daily_trade_count INTEGER;
    v_max_trades_per_day INTEGER;
BEGIN
    -- Lock the trade row for update
    SELECT * INTO v_trade
    FROM public.marketplace_trades
    WHERE id = p_trade_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trade not found');
    END IF;

    IF v_trade.status != 'negotiating' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trade is not in negotiating status');
    END IF;

    IF v_trade.current_offer IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No offer to execute');
    END IF;

    -- Check daily trade limit for both participants
    SELECT COUNT(*) INTO v_daily_trade_count
    FROM public.marketplace_trades
    WHERE (initiator_id = v_trade.initiator_id OR partner_id = v_trade.initiator_id)
    AND status = 'completed'
    AND completed_at >= CURRENT_DATE;

    -- Get max trades per day from config (default 10)
    SELECT COALESCE(MAX(max_trades_per_day), 10) INTO v_max_trades_per_day
    FROM public.marketplace_config mc
    JOIN public.classes c ON c.school_id = mc.school_id
    JOIN public.class_members cm ON cm.class_id = c.id
    WHERE cm.student_id = v_trade.initiator_id;

    IF v_daily_trade_count >= v_max_trades_per_day THEN
        RETURN jsonb_build_object('success', false, 'error', 'Daily trade limit reached for initiator');
    END IF;

    -- Check partner's daily limit
    SELECT COUNT(*) INTO v_daily_trade_count
    FROM public.marketplace_trades
    WHERE (initiator_id = v_trade.partner_id OR partner_id = v_trade.partner_id)
    AND status = 'completed'
    AND completed_at >= CURRENT_DATE;

    IF v_daily_trade_count >= v_max_trades_per_day THEN
        RETURN jsonb_build_object('success', false, 'error', 'Daily trade limit reached for partner');
    END IF;

    -- Extract trade details
    v_final_trade := v_trade.current_offer;
    v_initiator_cards := ARRAY(SELECT jsonb_array_elements_text(v_final_trade->'from_initiator'->'cards'));
    v_initiator_gidouilles := COALESCE((v_final_trade->'from_initiator'->>'gidouilles')::INTEGER, 0);
    v_partner_cards := ARRAY(SELECT jsonb_array_elements_text(v_final_trade->'from_partner'->'cards'));
    v_partner_gidouilles := COALESCE((v_final_trade->'from_partner'->>'gidouilles')::INTEGER, 0);

    -- CRITICAL: Verify gidouilles balance before proceeding
    IF v_initiator_gidouilles > 0 THEN
        DECLARE
            v_initiator_balance INTEGER;
        BEGIN
            SELECT gidouilles INTO v_initiator_balance
            FROM public.profiles
            WHERE id = v_trade.initiator_id;

            IF v_initiator_balance IS NULL OR v_initiator_balance < v_initiator_gidouilles THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', format('Insufficient gidouilles: initiator has %s but needs %s',
                                   COALESCE(v_initiator_balance, 0), v_initiator_gidouilles)
                );
            END IF;
        END;
    END IF;

    IF v_partner_gidouilles > 0 THEN
        DECLARE
            v_partner_balance INTEGER;
        BEGIN
            SELECT gidouilles INTO v_partner_balance
            FROM public.profiles
            WHERE id = v_trade.partner_id;

            IF v_partner_balance IS NULL OR v_partner_balance < v_partner_gidouilles THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', format('Insufficient gidouilles: partner has %s but needs %s',
                                   COALESCE(v_partner_balance, 0), v_partner_gidouilles)
                );
            END IF;
        END;
    END IF;

    -- Get current VIP cards for both users
    SELECT vip_cards INTO v_initiator_vip_cards
    FROM public.profiles
    WHERE id = v_trade.initiator_id
    FOR UPDATE;

    SELECT vip_cards INTO v_partner_vip_cards
    FROM public.profiles
    WHERE id = v_trade.partner_id
    FOR UPDATE;

    -- Transfer cards from initiator to partner
    FOREACH v_card_id IN ARRAY v_initiator_cards
    LOOP
        v_card_data := v_initiator_vip_cards->v_card_id;
        IF v_card_data IS NULL THEN
            RAISE EXCEPTION 'Card % not found for initiator', v_card_id;
        END IF;

        -- Remove from initiator
        v_initiator_vip_cards := v_initiator_vip_cards - v_card_id;

        -- Add to partner
        v_partner_vip_cards := jsonb_set(
            COALESCE(v_partner_vip_cards, '{}'::jsonb),
            ARRAY[v_card_id],
            v_card_data || jsonb_build_object('traded_at', NOW())
        );

        -- Log in vip_cards_activity
        INSERT INTO public.vip_cards_activity (
            card_instance_id,
            student_id,
            action,
            metadata
        ) VALUES (
            v_card_id,
            v_trade.initiator_id,
            'marketplace_trade',
            jsonb_build_object(
                'trade_id', p_trade_id,
                'traded_to', v_trade.partner_id,
                'trade_type', 'sent'
            )
        );
    END LOOP;

    -- Transfer cards from partner to initiator
    FOREACH v_card_id IN ARRAY v_partner_cards
    LOOP
        v_card_data := v_partner_vip_cards->v_card_id;
        IF v_card_data IS NULL THEN
            RAISE EXCEPTION 'Card % not found for partner', v_card_id;
        END IF;

        -- Remove from partner
        v_partner_vip_cards := v_partner_vip_cards - v_card_id;

        -- Add to initiator
        v_initiator_vip_cards := jsonb_set(
            COALESCE(v_initiator_vip_cards, '{}'::jsonb),
            ARRAY[v_card_id],
            v_card_data || jsonb_build_object('traded_at', NOW())
        );

        -- Log in vip_cards_activity
        INSERT INTO public.vip_cards_activity (
            card_instance_id,
            student_id,
            action,
            metadata
        ) VALUES (
            v_card_id,
            v_trade.partner_id,
            'marketplace_trade',
            jsonb_build_object(
                'trade_id', p_trade_id,
                'traded_to', v_trade.initiator_id,
                'trade_type', 'sent'
            )
        );
    END LOOP;

    -- Update VIP cards for both users
    UPDATE public.profiles
    SET vip_cards = v_initiator_vip_cards
    WHERE id = v_trade.initiator_id;

    UPDATE public.profiles
    SET vip_cards = v_partner_vip_cards
    WHERE id = v_trade.partner_id;

    -- Transfer gidouilles using existing RPC function
    IF v_initiator_gidouilles > 0 THEN
        PERFORM public.update_student_gidouilles(
            v_trade.initiator_id::TEXT,
            -v_initiator_gidouilles,
            'marketplace_trade'
        );
        PERFORM public.update_student_gidouilles(
            v_trade.partner_id::TEXT,
            v_initiator_gidouilles,
            'marketplace_trade'
        );
    END IF;

    IF v_partner_gidouilles > 0 THEN
        PERFORM public.update_student_gidouilles(
            v_trade.partner_id::TEXT,
            -v_partner_gidouilles,
            'marketplace_trade'
        );
        PERFORM public.update_student_gidouilles(
            v_trade.initiator_id::TEXT,
            v_partner_gidouilles,
            'marketplace_trade'
        );
    END IF;

    -- Update trade status
    UPDATE public.marketplace_trades
    SET
        status = 'completed',
        completed_at = NOW(),
        final_trade = v_final_trade,
        updated_at = NOW()
    WHERE id = p_trade_id;

    -- Unlock all cards for this trade
    DELETE FROM public.marketplace_locked_cards
    WHERE locked_entity_id = p_trade_id;

    -- If this was a marketplace trade, update the listing and proposal
    IF v_trade.listing_id IS NOT NULL THEN
        UPDATE public.marketplace_listings
        SET
            status = 'completed',
            completed_at = NOW()
        WHERE id = v_trade.listing_id;

        UPDATE public.marketplace_proposals
        SET
            status = 'accepted',
            responded_at = NOW()
        WHERE id = v_trade.proposal_id;

        -- Reject all other proposals for this listing
        UPDATE public.marketplace_proposals
        SET
            status = 'rejected',
            responded_at = NOW(),
            response_message = 'Another proposal was accepted'
        WHERE listing_id = v_trade.listing_id
        AND id != v_trade.proposal_id
        AND status = 'pending';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'trade_id', p_trade_id,
        'completed_at', NOW()
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Log error and rollback
        RAISE WARNING 'Trade execution failed: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION public.execute_trade IS 'Atomically execute a completed trade with full rollback on failure';

-- ---------------------------------------------------------------------
-- auto_expire_listings: Auto-expire old listings (for cron job)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_expire_listings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expired_count INTEGER;
    v_listing RECORD;
BEGIN
    -- Update expired listings
    UPDATE public.marketplace_listings
    SET
        status = 'expired',
        updated_at = NOW()
    WHERE expires_at < NOW()
    AND status = 'active';

    GET DIAGNOSTICS v_expired_count = ROW_COUNT;

    -- Unlock cards for expired listings
    FOR v_listing IN
        SELECT id FROM public.marketplace_listings
        WHERE status = 'expired'
        AND updated_at >= NOW() - INTERVAL '1 minute'
    LOOP
        PERFORM public.unlock_cards(v_listing.id);
    END LOOP;

    -- Reject pending proposals for expired listings
    UPDATE public.marketplace_proposals
    SET
        status = 'rejected',
        responded_at = NOW(),
        response_message = 'Listing expired'
    WHERE listing_id IN (
        SELECT id FROM public.marketplace_listings
        WHERE status = 'expired'
        AND updated_at >= NOW() - INTERVAL '1 minute'
    )
    AND status = 'pending';

    RETURN v_expired_count;
END;
$$;

COMMENT ON FUNCTION public.auto_expire_listings IS 'Automatically expire old listings and cleanup locks';

-- =====================================================================
-- 6. CREATE TRIGGERS
-- =====================================================================

-- ---------------------------------------------------------------------
-- Updated_at triggers for all tables with updated_at column
-- ---------------------------------------------------------------------

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marketplace_config_updated_at
    BEFORE UPDATE ON public.marketplace_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketplace_trades_updated_at
    BEFORE UPDATE ON public.marketplace_trades
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- Increment proposal_count on marketplace_listings
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_proposal_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.marketplace_listings
    SET proposal_count = proposal_count + 1
    WHERE id = NEW.listing_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_listing_proposal_count
    AFTER INSERT ON public.marketplace_proposals
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_proposal_count();

-- ---------------------------------------------------------------------
-- Auto-set expires_at for new listings
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_listing_expiry()
RETURNS TRIGGER AS $$
DECLARE
    v_duration_days INTEGER;
BEGIN
    -- Get duration from config (default 7 days)
    SELECT COALESCE(MAX(listing_duration_days), 7) INTO v_duration_days
    FROM public.marketplace_config mc
    WHERE mc.school_id = NEW.school_id;

    NEW.expires_at := NOW() + (v_duration_days || ' days')::INTERVAL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_listing_expiry_on_insert
    BEFORE INSERT ON public.marketplace_listings
    FOR EACH ROW
    WHEN (NEW.expires_at IS NULL)
    EXECUTE FUNCTION public.set_listing_expiry();

-- ---------------------------------------------------------------------
-- Auto-increment offer_number for trade offers with advisory lock
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_offer_number()
RETURNS TRIGGER AS $$
DECLARE
    v_lock_key BIGINT;
BEGIN
    -- Use advisory lock to prevent race conditions
    -- Generate a unique lock key from the trade_id (using first 8 bytes of UUID)
    v_lock_key := ('x' || substr(NEW.trade_id::text, 1, 8))::bit(32)::bigint;

    -- Acquire advisory lock (will wait if another transaction has it)
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Now safely get the next offer number
    SELECT COALESCE(MAX(offer_number), 0) + 1 INTO NEW.offer_number
    FROM public.marketplace_trade_offers
    WHERE trade_id = NEW.trade_id;

    -- Lock will be automatically released at end of transaction
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_offer_number_on_insert
    BEFORE INSERT ON public.marketplace_trade_offers
    FOR EACH ROW
    WHEN (NEW.offer_number IS NULL)
    EXECUTE FUNCTION public.set_offer_number();

-- =====================================================================
-- 7. GRANT PERMISSIONS
-- =====================================================================

-- Grant usage on all tables to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_proposals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_trades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_trade_offers TO authenticated;
GRANT SELECT ON public.marketplace_locked_cards TO authenticated;
GRANT SELECT, INSERT ON public.marketplace_chat_messages TO authenticated;

-- Grant execute on RPC functions to authenticated users
GRANT EXECUTE ON FUNCTION public.check_marketplace_enabled(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lock_cards(UUID, TEXT[], UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_cards(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_trade(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_expire_listings() TO authenticated;

-- =====================================================================
-- 8. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================================

COMMENT ON SCHEMA public IS 'Public schema containing marketplace tables for student trading system';