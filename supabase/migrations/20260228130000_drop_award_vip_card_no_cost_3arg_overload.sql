-- Migration: Drop old 3-arg award_vip_card_no_cost overload
-- The 4-arg version (with p_extra_metadata JSONB DEFAULT NULL) already handles
-- all cases. PostgREST cannot resolve between the two overloads (PGRST203).

DROP FUNCTION IF EXISTS public.award_vip_card_no_cost(UUID, TEXT, TEXT);
