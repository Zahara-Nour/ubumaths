-- =====================================================================
-- MARKETPLACE TEACHER/ADMIN RLS POLICIES
-- =====================================================================
-- This migration adds RLS policies to allow teachers and admins to view
-- marketplace data for their students, enabling the marketplace admin
-- dashboard to function correctly.
-- =====================================================================

-- ---------------------------------------------------------------------
-- marketplace_trades: Allow teachers to view trades for their students
-- ---------------------------------------------------------------------
CREATE POLICY "marketplace_trades_select_teacher" ON public.marketplace_trades
    FOR SELECT TO authenticated
    USING (
        -- Check if current user is a teacher who has either participant in their classes
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'teacher'
            AND (
                EXISTS (
                    SELECT 1 FROM public.class_members cm
                    JOIN public.classes c ON cm.class_id = c.id
                    WHERE c.teacher_id = auth.uid()
                    AND (cm.student_id = marketplace_trades.initiator_id
                         OR cm.student_id = marketplace_trades.partner_id)
                )
            )
        )
    );

COMMENT ON POLICY "marketplace_trades_select_teacher" ON public.marketplace_trades
    IS 'Allow teachers to view trades involving students in their classes';

-- ---------------------------------------------------------------------
-- marketplace_trades: Allow admins to view trades for their school
-- ---------------------------------------------------------------------
CREATE POLICY "marketplace_trades_select_admin" ON public.marketplace_trades
    FOR SELECT TO authenticated
    USING (
        -- Check if current user is an admin and participants are in their school
        EXISTS (
            SELECT 1 FROM public.profiles admin_profile
            WHERE admin_profile.id = auth.uid()
            AND admin_profile.role = 'admin'
            AND (
                EXISTS (
                    SELECT 1 FROM public.profiles student_profile
                    WHERE student_profile.school_id = admin_profile.school_id
                    AND (student_profile.id = marketplace_trades.initiator_id
                         OR student_profile.id = marketplace_trades.partner_id)
                )
            )
        )
    );

COMMENT ON POLICY "marketplace_trades_select_admin" ON public.marketplace_trades
    IS 'Allow admins to view trades involving students in their school';

-- ---------------------------------------------------------------------
-- marketplace_listings: Allow teachers to view listings from their students
-- ---------------------------------------------------------------------
CREATE POLICY "marketplace_listings_select_teacher" ON public.marketplace_listings
    FOR SELECT TO authenticated
    USING (
        -- Check if current user is a teacher who has the creator in their classes
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'teacher'
            AND EXISTS (
                SELECT 1 FROM public.class_members cm
                JOIN public.classes c ON cm.class_id = c.id
                WHERE c.teacher_id = auth.uid()
                AND cm.student_id = marketplace_listings.creator_id
            )
        )
    );

COMMENT ON POLICY "marketplace_listings_select_teacher" ON public.marketplace_listings
    IS 'Allow teachers to view listings created by students in their classes';

-- ---------------------------------------------------------------------
-- marketplace_listings: Allow admins to view listings from their school
-- ---------------------------------------------------------------------
CREATE POLICY "marketplace_listings_select_admin" ON public.marketplace_listings
    FOR SELECT TO authenticated
    USING (
        -- Check if current user is an admin and listing creator is in their school
        EXISTS (
            SELECT 1 FROM public.profiles admin_profile
            WHERE admin_profile.id = auth.uid()
            AND admin_profile.role = 'admin'
            AND admin_profile.school_id = marketplace_listings.school_id
        )
    );

COMMENT ON POLICY "marketplace_listings_select_admin" ON public.marketplace_listings
    IS 'Allow admins to view listings from students in their school';

-- ---------------------------------------------------------------------
-- marketplace_proposals: Allow teachers to view proposals for their students
-- ---------------------------------------------------------------------
CREATE POLICY "marketplace_proposals_select_teacher" ON public.marketplace_proposals
    FOR SELECT TO authenticated
    USING (
        -- Check if current user is a teacher who has the proposer in their classes
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'teacher'
            AND EXISTS (
                SELECT 1 FROM public.class_members cm
                JOIN public.classes c ON cm.class_id = c.id
                WHERE c.teacher_id = auth.uid()
                AND cm.student_id = marketplace_proposals.proposer_id
            )
        )
    );

COMMENT ON POLICY "marketplace_proposals_select_teacher" ON public.marketplace_proposals
    IS 'Allow teachers to view proposals made by students in their classes';

-- ---------------------------------------------------------------------
-- marketplace_proposals: Allow admins to view proposals from their school
-- ---------------------------------------------------------------------
CREATE POLICY "marketplace_proposals_select_admin" ON public.marketplace_proposals
    FOR SELECT TO authenticated
    USING (
        -- Check if current user is an admin and proposer is in their school
        EXISTS (
            SELECT 1 FROM public.profiles admin_profile
            JOIN public.profiles proposer_profile ON proposer_profile.id = marketplace_proposals.proposer_id
            WHERE admin_profile.id = auth.uid()
            AND admin_profile.role = 'admin'
            AND admin_profile.school_id = proposer_profile.school_id
        )
    );

COMMENT ON POLICY "marketplace_proposals_select_admin" ON public.marketplace_proposals
    IS 'Allow admins to view proposals from students in their school';
