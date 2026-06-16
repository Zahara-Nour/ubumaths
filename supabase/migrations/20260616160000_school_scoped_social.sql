-- ============================================================================
-- Lot 6 — social école-scopé (partie RLS propre : marketplace + amitiés)
-- Refactor mono-professeur — branche refactor/single-teacher
-- doc : docs/wip/single-teacher-refactor.md
-- ============================================================================
-- L'école devient la frontière sociale (safeguarding mineurs). On scope par
-- `profiles.school_id` au lieu de dériver via `class_members` (qui excluait les
-- élèves hors-classe).
--
-- Dans cette migration (RLS propre, sûr) :
--   • Marketplace : un élève voit les annonces de SON école (via profiles.school_id),
--     élèves hors-classe inclus.
--   • Amitiés : création restreinte à la même école.
-- HORS périmètre (décisions séparées) :
--   • Jeu navadra : module condamné (réécriture en cours) → NON scopé ici.
--   • Classement hebdo : changement de calcul (par école) → à traiter à part.
--
-- Note : 1 seule école aujourd'hui → ces gardes sont quasi no-op, mais posent la
-- frontière pour le futur multi-école (registre UAI/RNE). Les élèves sans
-- `school_id` ne peuvent ni créer d'amitié ni voir le marché → à rattacher à une école.
-- ============================================================================

-- École (profiles.school_id) de l'appelant.
CREATE OR REPLACE FUNCTION public.my_school()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT school_id FROM public.profiles WHERE id = auth.uid() $$;

COMMENT ON FUNCTION public.my_school() IS 'École (profiles.school_id) de l''appelant. NULL si non rattaché.';

-- TRUE si p_other est dans la même école (non-NULL) que l'appelant.
CREATE OR REPLACE FUNCTION public.same_school(p_other uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
	SELECT EXISTS (
		SELECT 1 FROM public.profiles o
		WHERE o.id = p_other
		  AND o.school_id IS NOT NULL
		  AND o.school_id = public.my_school()
	)
$$;

COMMENT ON FUNCTION public.same_school(uuid) IS 'TRUE si p_other est dans la même école (non-NULL) que l''appelant. Frontière sociale (école).';

GRANT EXECUTE ON FUNCTION public.my_school() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.same_school(uuid) TO authenticated, anon;

-- Marketplace : annonces de l'école de l'élève (profiles.school_id, hors-classe inclus).
-- Avant : dérivait l'école via schools⋈classes⋈class_members → excluait les hors-classe.
DROP POLICY IF EXISTS "marketplace_listings_select_same_school" ON public.marketplace_listings;
CREATE POLICY "marketplace_listings_select_same_school" ON public.marketplace_listings
	FOR SELECT TO authenticated
	USING (status = 'active' AND school_id = public.my_school());

-- Amitiés : création restreinte à la même école (safeguarding mineurs).
-- Avant : seulement `auth.uid() = requester_id` (amitiés globales).
DROP POLICY IF EXISTS "Users can create friendship requests" ON public.friendships;
CREATE POLICY "Users can create friendship requests" ON public.friendships
	FOR INSERT TO public
	WITH CHECK (auth.uid() = requester_id AND public.same_school(addressee_id));
