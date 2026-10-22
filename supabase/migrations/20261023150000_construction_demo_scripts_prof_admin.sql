-- ============================================================================
-- Scripts de démo des constructions : réservés au prof et à l'admin
-- ============================================================================
-- Relevé le 2026-10-23 : tout compte connecté, élève compris, pouvait enregistrer des
-- scripts de démo (policy « Users can CRUD own demo scripts »). Le client Supabase du
-- navigateur contournerait une garde posée dans l'API seule : la règle est tenue ici.
--
-- Décision de David (2026-10-23) : lire, créer, modifier, supprimer = prof et admin
-- seuls, chacun ses scripts.
--
-- Qui perd quoi : un élève perd tout accès à ses scripts de démo.
-- Mesuré en prod le 2026-10-23 : 5 scripts, tous de l'admin ; aucun élève, aucun prof.
--
-- Aucune donnée touchée (policy seulement).
-- Prouvé par tests/integration/construction-demo-scripts-reserves.test.ts.
--
-- ROLLBACK :
--   DROP POLICY "Teachers and admins can CRUD own demo scripts" ON public.construction_demo_scripts;
--   CREATE POLICY "Users can CRUD own demo scripts" ON public.construction_demo_scripts
--     USING ((auth.uid() = author_id)) WITH CHECK ((auth.uid() = author_id));
-- ============================================================================

DROP POLICY "Users can CRUD own demo scripts" ON public.construction_demo_scripts;
CREATE POLICY "Teachers and admins can CRUD own demo scripts" ON public.construction_demo_scripts
	TO authenticated
	USING (author_id = (SELECT auth.uid()) AND (SELECT public.is_teacher_or_admin()))
	WITH CHECK (author_id = (SELECT auth.uid()) AND (SELECT public.is_teacher_or_admin()));
