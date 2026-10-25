-- ============================================================================
-- Scripts de démo des constructions : réservés au prof seul
-- ============================================================================
-- Depuis 20261023150000 : prof et admin, chacun ses scripts. L'éditeur d'essais
-- (`/constructions/essais`) est réservé au prof depuis #1750 ; la base suit.
--
-- Décision de David (2026-10-25) : l'admin perd l'accès ; ses scripts passent au prof.
--
-- Qui perd quoi : l'admin ne lit, ne crée, ne modifie ni ne supprime plus aucun script
-- de démo. Qui gagne quoi : le prof lit et modifie les scripts transférés.
-- Mesuré en prod le 2026-10-25 : 5 scripts, tous de l'admin ; 1 prof, 1 admin.
--   cd7d64ac-3557-4e11-9362-667f555700c1  « 1 segment »
--   8e6ae3ff-fe5b-4f3e-8bd6-7e7fa12adeca  « 2 segments »
--   e0a2c2c3-b241-41d1-b5d0-ed3efbcbeb72  « cercle point-rayon »
--   aeb04f64-7594-461f-9900-f8a7534f7d5b  « cercles »
--   dc0fc3d4-0b43-4351-9a4c-c5e72c1107ae  « arcs de cercle »
--
-- Transfert seulement s'il existe exactement un prof (mono-professeur) ; un script
-- dont le prof a déjà un homonyme (index unique author_id, name) reste à l'admin.
-- Aucune ligne supprimée. Un NOTICE dit combien de scripts sont passés au prof.
-- Policy prouvée par tests/integration/construction-demo-scripts-reserves.test.ts.
-- Transfert : pas de test (le bloc tourne sur une table vide au db:reset) ; vérifié en
-- local dans une transaction (2 scripts transférés, l'homonyme laissé à l'admin), puis
-- en prod après db:migrate (5 scripts au prof attendus).
--
-- ROLLBACK :
--   DROP POLICY "Teacher can CRUD own demo scripts" ON public.construction_demo_scripts;
--   CREATE POLICY "Teachers and admins can CRUD own demo scripts" ON public.construction_demo_scripts
--     TO authenticated
--     USING (author_id = (SELECT auth.uid()) AND (SELECT public.is_teacher_or_admin()))
--     WITH CHECK (author_id = (SELECT auth.uid()) AND (SELECT public.is_teacher_or_admin()));
--   UPDATE public.construction_demo_scripts
--     SET author_id = (SELECT id FROM public.profiles WHERE role = 'admin')
--     WHERE id IN ('cd7d64ac-3557-4e11-9362-667f555700c1', '8e6ae3ff-fe5b-4f3e-8bd6-7e7fa12adeca',
--                  'e0a2c2c3-b241-41d1-b5d0-ed3efbcbeb72', 'aeb04f64-7594-461f-9900-f8a7534f7d5b',
--                  'dc0fc3d4-0b43-4351-9a4c-c5e72c1107ae');
-- ============================================================================

DO $$
DECLARE
	prof_id uuid;
	nb_profs int;
	nb_transferes int := 0;
BEGIN
	SELECT count(*) INTO nb_profs FROM public.profiles WHERE role = 'teacher';
	IF nb_profs = 1 THEN
		SELECT id INTO prof_id FROM public.profiles WHERE role = 'teacher';
		UPDATE public.construction_demo_scripts s
		SET author_id = prof_id
		WHERE s.author_id IN (SELECT id FROM public.profiles WHERE role = 'admin')
			AND NOT EXISTS (
				SELECT 1 FROM public.construction_demo_scripts t
				WHERE t.author_id = prof_id AND t.name = s.name
			);
		GET DIAGNOSTICS nb_transferes = ROW_COUNT;
	END IF;
	RAISE NOTICE 'scripts de démo : % prof(s), % script(s) transféré(s) au prof', nb_profs, nb_transferes;
END
$$;

DROP POLICY "Teachers and admins can CRUD own demo scripts" ON public.construction_demo_scripts;
CREATE POLICY "Teacher can CRUD own demo scripts" ON public.construction_demo_scripts
	TO authenticated
	USING (author_id = (SELECT auth.uid()) AND (SELECT public.is_teacher()))
	WITH CHECK (author_id = (SELECT auth.uid()) AND (SELECT public.is_teacher()));
