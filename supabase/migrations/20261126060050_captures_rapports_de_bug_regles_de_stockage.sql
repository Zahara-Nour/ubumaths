-- ============================================================================
-- Captures des rapports de bug : les règles du stockage entrent au dépôt (écart T28)
-- ============================================================================
-- Constat des revues de #3115 : les cinq règles d'accès du bucket
-- `bug-report-screenshots` existent en prod (posées autrefois par le Dashboard)
-- mais dans aucune migration. Sur une base recréée depuis le dépôt (base locale,
-- pile de test, reprise après sinistre), elles manquaient : l'auteur ne pouvait
-- pas déposer sa capture, et l'admin ne pouvait pas l'effacer (le stockage refuse
-- en silence : la capture restait orpheline sans rien dire).
--
-- Accès : AUCUN changement en prod. Les règles ci-dessous sont celles de la prod,
-- relues le 2026-11-26 dans `pg_policies` (lecture seule), recopiées telles
-- quelles :
--   - l'auteur lit, dépose, remplace et efface dans SON dossier (`<son id>/…`) ;
--   - l'admin lit et gère toutes les captures ;
--   - personne d'autre (camarade, prof) ne lit ni n'écrit.
-- En prod, chaque règle est retirée puis reposée à l'identique, dans la
-- transaction de la migration : aucun instant sans règle.
--
-- Le bucket lui-même n'est pas créé ici : il existe en prod, et `supabase/seed.sql`
-- le crée en local (une insertion ici ferait échouer le seed sur un doublon).
--
-- Prouvée par tests/integration/rapports-de-bug-non-reecrits.test.ts
-- § « stockage des captures » (rouge sans elle).
--
-- Rollback (base recréée seulement ; en prod, ne rien retirer : ces règles y
-- étaient avant la migration) :
--   DROP POLICY IF EXISTS "Admins can manage bug report screenshots" ON storage.objects;
--   DROP POLICY IF EXISTS "Users can view own bug report screenshots" ON storage.objects;
--   DROP POLICY IF EXISTS "Users can upload bug report screenshots" ON storage.objects;
--   DROP POLICY IF EXISTS "Users can update own bug report screenshots" ON storage.objects;
--   DROP POLICY IF EXISTS "Users can delete own bug report screenshots" ON storage.objects;
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage bug report screenshots" ON storage.objects;
CREATE POLICY "Admins can manage bug report screenshots" ON storage.objects
	FOR ALL TO authenticated
	USING (bucket_id = 'bug-report-screenshots' AND public.is_admin())
	WITH CHECK (bucket_id = 'bug-report-screenshots' AND public.is_admin());

DROP POLICY IF EXISTS "Users can view own bug report screenshots" ON storage.objects;
CREATE POLICY "Users can view own bug report screenshots" ON storage.objects
	FOR SELECT TO authenticated
	USING (
		bucket_id = 'bug-report-screenshots'
		AND (storage.foldername(name))[1] = (auth.uid())::text
	);

DROP POLICY IF EXISTS "Users can upload bug report screenshots" ON storage.objects;
CREATE POLICY "Users can upload bug report screenshots" ON storage.objects
	FOR INSERT TO authenticated
	WITH CHECK (
		bucket_id = 'bug-report-screenshots'
		AND (storage.foldername(name))[1] = (auth.uid())::text
	);

DROP POLICY IF EXISTS "Users can update own bug report screenshots" ON storage.objects;
CREATE POLICY "Users can update own bug report screenshots" ON storage.objects
	FOR UPDATE TO authenticated
	USING (
		bucket_id = 'bug-report-screenshots'
		AND (storage.foldername(name))[1] = (auth.uid())::text
	)
	WITH CHECK (
		bucket_id = 'bug-report-screenshots'
		AND (storage.foldername(name))[1] = (auth.uid())::text
	);

DROP POLICY IF EXISTS "Users can delete own bug report screenshots" ON storage.objects;
CREATE POLICY "Users can delete own bug report screenshots" ON storage.objects
	FOR DELETE TO authenticated
	USING (
		bucket_id = 'bug-report-screenshots'
		AND (storage.foldername(name))[1] = (auth.uid())::text
	);
