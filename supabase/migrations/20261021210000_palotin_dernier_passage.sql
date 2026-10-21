-- Palotin « triste » après une longue absence — étape 1 sur 2 (la donnée).
--
-- Besoin (décidé par David le 2026-10-21, docs/wip/palotins-absence-progress.md) : quand
-- l'élève revient sur son tableau de bord 21 jours ou plus après son dernier passage, son
-- Palotin est triste et lui dit « tu m'as manqué », une seule fois au retour.
--
-- Aucune donnée existante ne date le dernier passage : `student_buddies.last_activity_date`
-- est le dernier jour TRAVAILLÉ (pansées gagnées), `auth.users.last_sign_in_at` ne bouge
-- pas tant que la session reste ouverte.
--
-- Question d'accès (tranchée par David le 2026-10-21, option B) : le jour du dernier
-- passage n'est lisible par PERSONNE d'autre que le serveur (client service). Ni l'élève,
-- ni le prof, ni l'admin, ni anon : RLS activée sans aucune policy, droits retirés à
-- anon et authenticated. Le serveur n'en transmet que « triste oui/non ».
--
-- Qui gagne quoi : personne. Qui perd quoi : rien (table neuve).
--
-- Suppression de compte (RGPD art. 17) : la ligne part avec le profil (ON DELETE CASCADE).
--
-- Rollback (sans perte utile : seul le « tu m'as manqué » du prochain retour est perdu) :
--   DROP FUNCTION IF EXISTS public.record_student_visit(uuid, date);
--   DROP TABLE IF EXISTS public.student_last_visits;

CREATE TABLE public.student_last_visits (
  student_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Jour UTC du dernier passage, comme la Constance Royale
  last_visit_date date NOT NULL
);

COMMENT ON TABLE public.student_last_visits IS
  'Jour du dernier passage de l''élève sur son tableau de bord : serveur seulement (Palotin triste, 2026-10-21).';

ALTER TABLE public.student_last_visits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.student_last_visits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.student_last_visits TO service_role;

-- Enregistre le passage du jour et rend le jour du passage PRÉCÉDENT (NULL au tout
-- premier passage). Atomique : deux chargements simultanés ne rendent pas tous deux
-- l'ancien jour (le second attend le verrou et lit le jour même), donc « triste » ne
-- s'affiche qu'une fois. Le jour enregistré ne recule jamais.
--
-- SECURITY INVOKER et exécutable par service_role seulement : la fonction ne donne
-- aucun droit de plus que ceux de son appelant.
CREATE FUNCTION public.record_student_visit(p_student_id uuid, p_today date)
RETURNS date
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_previous date;
BEGIN
  IF p_student_id IS NULL OR p_today IS NULL THEN
    RAISE EXCEPTION 'record_student_visit : élève et jour obligatoires';
  END IF;

  INSERT INTO public.student_last_visits (student_id, last_visit_date)
  VALUES (p_student_id, p_today)
  ON CONFLICT (student_id) DO NOTHING;
  IF FOUND THEN
    RETURN NULL;
  END IF;

  SELECT last_visit_date INTO v_previous
  FROM public.student_last_visits
  WHERE student_id = p_student_id
  FOR UPDATE;

  IF v_previous < p_today THEN
    UPDATE public.student_last_visits
    SET last_visit_date = p_today
    WHERE student_id = p_student_id;
  END IF;

  RETURN v_previous;
END;
$$;

REVOKE ALL ON FUNCTION public.record_student_visit(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_student_visit(uuid, date) TO service_role;
