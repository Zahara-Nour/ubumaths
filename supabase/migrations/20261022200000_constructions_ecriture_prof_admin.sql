-- ============================================================================
-- Constructions : création et modification réservées au prof et à l'admin
-- ============================================================================
-- Relevé le 2026-10-22 : tout compte connecté, élève compris, pouvait créer une
-- construction publique, dont le titre et la description (texte libre) étaient lus par
-- tous les comptes connectés, toutes écoles confondues. Le client Supabase du navigateur
-- contournerait une garde posée dans l'API seule : la règle est tenue ici.
--
-- Décision de David (2026-10-22) : créer, modifier, publier = prof et admin seuls ; la
-- lecture des constructions publiées reste ouverte à tout compte connecté ; un auteur
-- garde la suppression des siennes.
--
-- Qui perd quoi : un élève perd la création et la modification de constructions.
-- Mesuré en prod le 2026-10-22 : 9 constructions, toutes sans auteur (comptes
-- supprimés) ; aucun élève n'en a jamais écrit.
--
-- Aucune donnée touchée (policies seulement).
-- Prouvé par tests/integration/constructions-ecriture-reservee.test.ts.
--
-- ROLLBACK :
--   DROP POLICY "Teachers and admins can insert own constructions" ON public.constructions;
--   CREATE POLICY "Users can insert own constructions" ON public.constructions
--     FOR INSERT WITH CHECK ((auth.uid() = author_id));
--   DROP POLICY "Teachers and admins can update own constructions" ON public.constructions;
--   CREATE POLICY "Users can update own constructions" ON public.constructions
--     FOR UPDATE USING ((auth.uid() = author_id)) WITH CHECK ((auth.uid() = author_id));
-- ============================================================================

DROP POLICY "Users can insert own constructions" ON public.constructions;
CREATE POLICY "Teachers and admins can insert own constructions" ON public.constructions
	FOR INSERT TO authenticated
	WITH CHECK (author_id = (SELECT auth.uid()) AND (SELECT public.is_teacher_or_admin()));

DROP POLICY "Users can update own constructions" ON public.constructions;
CREATE POLICY "Teachers and admins can update own constructions" ON public.constructions
	FOR UPDATE TO authenticated
	USING (author_id = (SELECT auth.uid()) AND (SELECT public.is_teacher_or_admin()))
	WITH CHECK (author_id = (SELECT auth.uid()) AND (SELECT public.is_teacher_or_admin()));
