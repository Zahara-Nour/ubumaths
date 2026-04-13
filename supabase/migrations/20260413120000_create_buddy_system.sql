-- =============================================================================
-- Buddy System (Palotins) - Tables, RLS, RPC, Seeds
-- =============================================================================
--
-- Creates the Palotin buddy system for students:
-- - student_buddies: one buddy per student with XP, level, streak
-- - buddy_skins: cosmetic skins unlockable by level or VIP card
-- - add_buddy_xp RPC: atomic XP addition with daily cap and level calculation
--

-- =============================================================================
-- 1. Tables
-- =============================================================================

-- Buddy skins (must be created first for FK reference)
CREATE TABLE IF NOT EXISTS public.buddy_skins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    palotin_type TEXT NOT NULL CHECK (palotin_type IN ('giron', 'pile', 'cotice')),
    name TEXT NOT NULL,
    description TEXT,
    image_path TEXT NOT NULL,
    unlock_method TEXT NOT NULL CHECK (unlock_method IN ('level', 'vip_card')),
    unlock_requirement JSONB NOT NULL DEFAULT '{}',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_enabled BOOLEAN NOT NULL DEFAULT true
);

-- Student buddies (one per student)
CREATE TABLE IF NOT EXISTS public.student_buddies (
    student_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    palotin_type TEXT NOT NULL CHECK (palotin_type IN ('giron', 'pile', 'cotice')),
    xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 20),
    current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
    last_activity_date DATE,
    xp_earned_today INTEGER NOT NULL DEFAULT 0 CHECK (xp_earned_today >= 0),
    last_xp_date DATE,
    themes_explored TEXT[] NOT NULL DEFAULT '{}',
    change_count INTEGER NOT NULL DEFAULT 0 CHECK (change_count >= 0),
    equipped_skin_id UUID REFERENCES public.buddy_skins(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. Indexes
-- =============================================================================

CREATE INDEX idx_student_buddies_palotin_type ON public.student_buddies(palotin_type);
CREATE INDEX idx_student_buddies_level ON public.student_buddies(level);
CREATE INDEX idx_buddy_skins_palotin_type ON public.buddy_skins(palotin_type);
CREATE INDEX idx_buddy_skins_unlock_method ON public.buddy_skins(unlock_method);

-- =============================================================================
-- 3. Updated_at trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_student_buddies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_buddies_updated_at_trigger
    BEFORE UPDATE ON public.student_buddies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_student_buddies_updated_at();

-- =============================================================================
-- 4. Row Level Security
-- =============================================================================

ALTER TABLE public.student_buddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_skins ENABLE ROW LEVEL SECURITY;

-- student_buddies policies
CREATE POLICY "Students can view their own buddy"
    ON public.student_buddies FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "Students can create their own buddy"
    ON public.student_buddies FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own buddy"
    ON public.student_buddies FOR UPDATE
    TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "Teachers can view buddies of their students"
    ON public.student_buddies FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.class_members cm
            JOIN public.classes c ON c.id = cm.class_id
            WHERE cm.student_id = student_buddies.student_id
            AND c.teacher_id = auth.uid()
            AND cm.status = 'active'
        )
    );

CREATE POLICY "Admins can view all buddies"
    ON public.student_buddies FOR SELECT
    TO authenticated
    USING (is_teacher_or_admin());

-- buddy_skins policies (read-only for all authenticated users)
CREATE POLICY "All authenticated users can view enabled skins"
    ON public.buddy_skins FOR SELECT
    TO authenticated
    USING (is_enabled = true);

CREATE POLICY "Admins can manage skins"
    ON public.buddy_skins FOR ALL
    TO authenticated
    USING (is_admin());

-- =============================================================================
-- 5. RPC: add_buddy_xp
-- =============================================================================

CREATE OR REPLACE FUNCTION public.add_buddy_xp(
    p_student_id UUID,
    p_xp INTEGER,
    p_is_milestone BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_buddy public.student_buddies%ROWTYPE;
    v_xp_to_add INTEGER;
    v_new_xp INTEGER;
    v_new_level INTEGER;
    v_old_level INTEGER;
    v_daily_cap INTEGER := 100;
    v_daily_cap_reached BOOLEAN := false;
    v_today DATE := CURRENT_DATE;
    -- XP thresholds for levels 1-20
    v_xp_table INTEGER[] := ARRAY[0, 30, 70, 120, 180, 260, 360, 480, 620, 780, 960, 1160, 1400, 1680, 2000, 2400, 2900, 3500, 4200, 5000];
BEGIN
    -- Lock the row to prevent concurrent XP updates
    SELECT * INTO v_buddy
    FROM public.student_buddies
    WHERE student_id = p_student_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'error', 'buddy_not_found',
            'xp_gained', 0
        );
    END IF;

    -- Reset daily XP counter if new day
    IF v_buddy.last_xp_date IS NULL OR v_buddy.last_xp_date < v_today THEN
        v_buddy.xp_earned_today := 0;
    END IF;

    -- Calculate XP to add (enforce daily cap unless milestone)
    IF p_is_milestone THEN
        v_xp_to_add := p_xp;
    ELSE
        IF v_buddy.xp_earned_today >= v_daily_cap THEN
            v_xp_to_add := 0;
            v_daily_cap_reached := true;
        ELSIF v_buddy.xp_earned_today + p_xp > v_daily_cap THEN
            v_xp_to_add := v_daily_cap - v_buddy.xp_earned_today;
            v_daily_cap_reached := true;
        ELSE
            v_xp_to_add := p_xp;
        END IF;
    END IF;

    -- Skip update if nothing to add
    IF v_xp_to_add <= 0 THEN
        RETURN jsonb_build_object(
            'xp_gained', 0,
            'new_xp', v_buddy.xp,
            'new_level', v_buddy.level,
            'leveled_up', false,
            'daily_cap_reached', v_daily_cap_reached
        );
    END IF;

    -- Calculate new XP and level
    v_new_xp := v_buddy.xp + v_xp_to_add;
    v_old_level := v_buddy.level;
    v_new_level := 1;

    FOR i IN REVERSE 20..2 LOOP
        IF v_new_xp >= v_xp_table[i] THEN
            v_new_level := i;
            EXIT;
        END IF;
    END LOOP;

    -- Update the buddy
    UPDATE public.student_buddies
    SET
        xp = v_new_xp,
        level = v_new_level,
        xp_earned_today = CASE
            WHEN p_is_milestone THEN xp_earned_today  -- Milestones don't count toward cap
            ELSE v_buddy.xp_earned_today + v_xp_to_add
        END,
        last_xp_date = v_today
    WHERE student_id = p_student_id;

    RETURN jsonb_build_object(
        'xp_gained', v_xp_to_add,
        'new_xp', v_new_xp,
        'new_level', v_new_level,
        'leveled_up', v_new_level > v_old_level,
        'daily_cap_reached', v_daily_cap_reached
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_buddy_xp(UUID, INTEGER, BOOLEAN) TO authenticated;

-- =============================================================================
-- 6. Seed data: level-based skins (placeholders)
-- =============================================================================

INSERT INTO public.buddy_skins (palotin_type, name, description, image_path, unlock_method, unlock_requirement, sort_order) VALUES
    -- Giron skins
    ('giron', 'Base', 'Apparence de depart', '/images/buddies/giron-base.png', 'level', '{"level": 1}', 1),
    ('giron', 'Accessoire 1', 'Petit chapeau', '/images/buddies/giron-acc1.png', 'level', '{"level": 4}', 2),
    ('giron', 'Accessoire 2', 'Epee en bois', '/images/buddies/giron-acc2.png', 'level', '{"level": 8}', 3),
    ('giron', 'Evolution', 'Look enrichi', '/images/buddies/giron-evo.png', 'level', '{"level": 12}', 4),
    ('giron', 'Prestige', 'Cape et armure', '/images/buddies/giron-prestige.png', 'level', '{"level": 16}', 5),
    ('giron', 'Royal', 'Palotin Royal', '/images/buddies/giron-royal.png', 'level', '{"level": 20}', 6),
    -- Pile skins
    ('pile', 'Base', 'Apparence de depart', '/images/buddies/pile-base.png', 'level', '{"level": 1}', 1),
    ('pile', 'Accessoire 1', 'Bandeau', '/images/buddies/pile-acc1.png', 'level', '{"level": 4}', 2),
    ('pile', 'Accessoire 2', 'Bouclier', '/images/buddies/pile-acc2.png', 'level', '{"level": 8}', 3),
    ('pile', 'Evolution', 'Look enrichi', '/images/buddies/pile-evo.png', 'level', '{"level": 12}', 4),
    ('pile', 'Prestige', 'Cape et aura', '/images/buddies/pile-prestige.png', 'level', '{"level": 16}', 5),
    ('pile', 'Royal', 'Palotin Royal', '/images/buddies/pile-royal.png', 'level', '{"level": 20}', 6),
    -- Cotice skins
    ('cotice', 'Base', 'Apparence de depart', '/images/buddies/cotice-base.png', 'level', '{"level": 1}', 1),
    ('cotice', 'Accessoire 1', 'Echarpe', '/images/buddies/cotice-acc1.png', 'level', '{"level": 4}', 2),
    ('cotice', 'Accessoire 2', 'Baton', '/images/buddies/cotice-acc2.png', 'level', '{"level": 8}', 3),
    ('cotice', 'Evolution', 'Look enrichi', '/images/buddies/cotice-evo.png', 'level', '{"level": 12}', 4),
    ('cotice', 'Prestige', 'Armure legere', '/images/buddies/cotice-prestige.png', 'level', '{"level": 16}', 5),
    ('cotice', 'Royal', 'Palotin Royal', '/images/buddies/cotice-royal.png', 'level', '{"level": 20}', 6);
