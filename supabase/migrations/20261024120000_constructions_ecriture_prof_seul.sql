-- ============================================================================
-- Constructions : le prof écrit et lit tout ; la propriété (author_id) ne compte plus
-- ============================================================================
-- Constat en prod (2026-10-24) : les 9 constructions ont author_id NULL (comptes
-- supprimés, ON DELETE SET NULL). Les policies « own » faisaient qu'aucun compte ne
-- pouvait plus les modifier dans l'appli, et que le brouillon « repérage » n'était lu
-- par personne.
--
-- Décision de David (2026-10-24) : mono-professeur, le rôle suffit. Créer, modifier,
-- publier, supprimer et lire les brouillons = prof SEUL (l'admin n'écrit plus). La
-- lecture des constructions publiées reste ouverte à tout compte connecté.
--
-- Qui gagne quoi : le prof lit et écrit toutes les constructions (le repérage
-- réapparaît chez lui en brouillon).
-- Qui perd quoi : l'admin perd la création, la modification et la suppression ; un
-- auteur non prof perd la lecture de ses brouillons et la suppression des siennes.
-- Mesuré en prod le 2026-10-24 : 9 constructions, aucune avec auteur → personne ne
-- perd rien qu'il utilise. Rien ne change pour les élèves (lecture des publiées).
--
-- author_id reste en base (vide pour les nouvelles constructions) ; il sera supprimé
-- par une migration séparée, après la mise en prod du code qui ne le lit plus.
--
-- Aucune donnée touchée (fonction et policies seulement).
-- Prouvé par tests/integration/constructions-ecriture-reservee.test.ts.
--
-- ROLLBACK :
--   DROP POLICY "Teacher can read all constructions" ON public.constructions;
--   CREATE POLICY "Users can read own constructions" ON public.constructions
--     FOR SELECT USING ((auth.uid() = author_id));
--   DROP POLICY "Teacher can insert constructions" ON public.constructions;
--   CREATE POLICY "Teachers and admins can insert own constructions" ON public.constructions
--     FOR INSERT TO authenticated
--     WITH CHECK (author_id = (SELECT auth.uid()) AND (SELECT public.is_teacher_or_admin()));
--   DROP POLICY "Teacher can update constructions" ON public.constructions;
--   CREATE POLICY "Teachers and admins can update own constructions" ON public.constructions
--     FOR UPDATE TO authenticated
--     USING (author_id = (SELECT auth.uid()) AND (SELECT public.is_teacher_or_admin()))
--     WITH CHECK (author_id = (SELECT auth.uid()) AND (SELECT public.is_teacher_or_admin()));
--   DROP POLICY "Teacher can delete constructions" ON public.constructions;
--   CREATE POLICY "Users can delete own constructions" ON public.constructions
--     FOR DELETE USING ((auth.uid() = author_id));
--   DROP FUNCTION public.is_teacher();
-- ============================================================================

-- Garde de rôle sur le modèle de is_admin() / is_teacher_or_admin() : rôle de
-- auth.uid(), sans paramètre ; faux hors session.
create or replace function public.is_teacher()
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'teacher'
  );
END;
$function$;

revoke all on function public.is_teacher() from public, anon;
grant execute on function public.is_teacher() to authenticated;

DROP POLICY "Users can read own constructions" ON public.constructions;
CREATE POLICY "Teacher can read all constructions" ON public.constructions
	FOR SELECT TO authenticated
	USING ((SELECT public.is_teacher()));

DROP POLICY "Teachers and admins can insert own constructions" ON public.constructions;
CREATE POLICY "Teacher can insert constructions" ON public.constructions
	FOR INSERT TO authenticated
	WITH CHECK ((SELECT public.is_teacher()));

DROP POLICY "Teachers and admins can update own constructions" ON public.constructions;
CREATE POLICY "Teacher can update constructions" ON public.constructions
	FOR UPDATE TO authenticated
	USING ((SELECT public.is_teacher()))
	WITH CHECK ((SELECT public.is_teacher()));

DROP POLICY "Users can delete own constructions" ON public.constructions;
CREATE POLICY "Teacher can delete constructions" ON public.constructions
	FOR DELETE TO authenticated
	USING ((SELECT public.is_teacher()));
