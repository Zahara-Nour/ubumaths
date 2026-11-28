-- Suppression des modèles de message (écart M60 du registre)
-- ==========================================================================
--
-- Le code des modèles de message a été retiré par #3191 (en prod depuis la
-- 0.115.0, 2026-11-26). Restaient en base cinq tables et huit fonctions sans
-- aucun appelant, ouvertes à l'écriture directe (audit de sécurité de #3191 :
-- un prof approuvait lui-même son modèle de classe, un élève insérait des
-- lignes d'usage quelconques, get_templates_for_context rendait le modèle
-- d'une classe dont l'appelant n'est pas membre). Décision de David du
-- 2026-11-26 : supprimer.
--
-- ⚠️ DESTRUCTIVE. Ce qui est perdu : le contenu des cinq tables. Compté en prod
-- (lecture seule) le 2026-11-26 : 0 ligne dans chacune
--   message_templates, message_template_versions, template_usage_stats,
--   template_audit_log, user_favorite_templates.
--
-- Accès : personne ne gagne rien. Personne ne perd une lecture réelle (0 ligne).
--
-- Usages dans le code (2026-11-26), grep sur src et e2e de
--   message_template|template_usage_stats|template_audit_log|
--   user_favorite_templates|get_templates_for_context|get_template_statistics|
--   get_user_frequent_templates|duplicate_template|log_template_action|
--   save_template_version|auto_log_template_changes|
--   update_message_template_updated_at
-- → aucune ligne hors src/lib/types/database.ts (généré, régénéré ici).
--
-- delete_user_account (RGPD art. 17) effaçait dans template_audit_log : la
-- fonction est recopiée à l'identique de 20261016101200, moins ce seul bloc
-- (et sa clé « template_audit_log_deleted » dans le résultat, lue par personne).
-- Droits et commentaire inchangés (CREATE OR REPLACE les garde).
--
-- Tests : tests/integration/suppression-modeles-de-message.test.ts,
--         tests/integration/suppression-compte-art17.test.ts
--
-- Rollback : aucune donnée à rendre (0 ligne). Pour recréer les objets :
--   définitions dans 20260616220000_baseline_schema.sql, puis
--   20260620090000, 20260915700000, 20261003180000, 20261003220000 ; et rejouer
--   delete_user_account de 20261016101200_suppression_chemins_conformes.sql.
--   Les droits des objets recréés (REVOKE / GRANT) seraient à rejouer aussi :
--   20261001170000_anon_retrait_droits_herites.sql et les lots RPC.

-- 1. La suppression de compte ne dépend plus de template_audit_log.
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
	v_result jsonb := '{}';
	v_count integer;
	v_role text;
	v_fk record;
	v_blocked boolean;
	v_paths jsonb;
BEGIN
	IF p_user_id IS NULL THEN
		RAISE EXCEPTION 'User ID cannot be NULL';
	END IF;

	SELECT role INTO v_role FROM profiles WHERE id = p_user_id;
	IF v_role IS DISTINCT FROM 'student' THEN
		-- Profil absent, prof ou admin : rien n'est touché.
		RAISE EXCEPTION 'delete_user_account: student accounts only (role %)', coalesce(v_role, 'none')
			USING ERRCODE = '42501';
	END IF;

	-- 0. Fichiers à retirer du storage, collectés avant que la cascade n'efface
	--    les lignes qui portent leur chemin. La route fait le remove().
	v_paths := jsonb_build_object(
		'chat-attachments', coalesce((
			SELECT jsonb_agg(DISTINCT ma.storage_path)
			FROM message_attachments ma
			WHERE ma.storage_path IS NOT NULL
			  AND (ma.uploaded_by = p_user_id
			       OR ma.message_id IN (SELECT id FROM messages WHERE sender_id = p_user_id)
			       -- conversations créées par l'élève : la cascade emporte aussi les
			       -- messages (et pièces jointes) des autres participants
			       OR ma.message_id IN (
			            SELECT m.id FROM messages m
			            JOIN conversations c ON c.id = m.conversation_id
			            WHERE c.created_by = p_user_id))
		), '[]'::jsonb),
		-- L'élève écrit lui-même storage_path et screenshot_path : seul un chemin rangé
		-- comme l'application range SES fichiers est rendu (sinon il ferait retirer, par le
		-- client service, le fichier d'un camarade). Rangements : file-upload.ts
		-- (messages/<message>/…) et api/bug-reports/[reportId]/screenshot (<élève>/<rapport>/…).
		'message-attachments', coalesce((
			SELECT jsonb_agg(DISTINCT ma.storage_path)
			FROM message_attachments_v2 ma
			JOIN private_messages pm ON pm.id = ma.message_id
			WHERE ma.uploaded_by = p_user_id
			  AND pm.sender_id = p_user_id
			  AND ma.storage_path IS NOT NULL
			  AND starts_with(lower(ma.storage_path), 'messages/' || ma.message_id::text || '/')
			  AND ('/' || ma.storage_path || '/') NOT LIKE '%/../%'
		), '[]'::jsonb),
		'bug-report-screenshots', coalesce((
			SELECT jsonb_agg(DISTINCT br.screenshot_path)
			FROM bug_reports br
			WHERE br.user_id = p_user_id
			  AND br.screenshot_path IS NOT NULL
			  AND starts_with(lower(br.screenshot_path), p_user_id::text || '/' || br.id::text || '/')
			  AND ('/' || br.screenshot_path || '/') NOT LIKE '%/../%'
		), '[]'::jsonb)
	);

	-- 1. Messages de l'élève : le texte disparaît pour tout le monde. L'aperçu de
	--    conversation recopie le texte du dernier message ; la clé étrangère n'en
	--    efface que l'identifiant, l'aperçu doit être vidé ici.
	UPDATE conversations
	SET last_message_preview = NULL
	WHERE last_message_id IN (SELECT id FROM messages WHERE sender_id = p_user_id);

	DELETE FROM messages WHERE sender_id = p_user_id;
	GET DIAGNOSTICS v_count = ROW_COUNT;
	v_result := v_result || jsonb_build_object('messages_deleted', v_count);

	-- 2. Clés étrangères vers profiles SANS ON DELETE : sans ce nettoyage,
	--    auth.admin.deleteUser échoue sur la cascade.
	DELETE FROM exercise_completions WHERE student_id = p_user_id;
	GET DIAGNOSTICS v_count = ROW_COUNT;
	v_result := v_result || jsonb_build_object('exercise_completions_deleted', v_count);

	DELETE FROM exercise_assignments WHERE student_id = p_user_id;
	GET DIAGNOSTICS v_count = ROW_COUNT;
	v_result := v_result || jsonb_build_object('exercise_assignments_deleted', v_count);

	UPDATE student_achievements SET unlocked_by = NULL WHERE unlocked_by = p_user_id;
	GET DIAGNOSTICS v_count = ROW_COUNT;
	v_result := v_result || jsonb_build_object('student_achievements_unlocked_by_nullified', v_count);

	-- reviewed_by est inscriptible par un autre élève sur son propre signalement :
	-- il ne doit pas pouvoir empêcher cette suppression.
	UPDATE worksheet_error_reports SET reviewed_by = NULL WHERE reviewed_by = p_user_id;
	GET DIAGNOSTICS v_count = ROW_COUNT;
	v_result := v_result || jsonb_build_object('worksheet_error_reports_reviewed_by_nullified', v_count);

	-- 3. Garde d'atomicité : plus AUCUNE référence sans ON DELETE ne doit viser le
	--    compte, sinon auth.admin.deleteUser échouerait APRÈS nos effacements.
	--    On lève : la transaction est annulée, l'élève n'a rien perdu.
	-- Une clé composite ne serait vérifiée que sur sa première colonne : on refuse
	-- de conclure plutôt que de laisser passer (aucune n'existe au 2026-10-10).
	IF EXISTS (
		SELECT 1 FROM pg_constraint c
		WHERE c.contype = 'f' AND c.confdeltype IN ('a', 'r')
		  AND c.confrelid IN ('public.profiles'::regclass, 'auth.users'::regclass)
		  AND array_length(c.conkey, 1) > 1
	) THEN
		RAISE EXCEPTION 'delete_user_account: composite foreign key to the account, guard must be extended';
	END IF;

	FOR v_fk IN
		SELECT c.conrelid::regclass AS tbl, a.attname AS col
		FROM pg_constraint c
		JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
		WHERE c.contype = 'f'
		  AND c.confdeltype IN ('a', 'r')
		  AND c.confrelid IN ('public.profiles'::regclass, 'auth.users'::regclass)
	LOOP
		EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s WHERE %I = $1)', v_fk.tbl, v_fk.col)
			INTO v_blocked USING p_user_id;
		IF v_blocked THEN
			RAISE EXCEPTION 'delete_user_account: % still references the account', v_fk.tbl || '.' || v_fk.col
				USING ERRCODE = '23503';
		END IF;
	END LOOP;

	-- Le reste (économie, jeux, SRS, conversations privées, consentements…) part
	-- avec la cascade de profiles lors de auth.admin.deleteUser.
	RETURN v_result || jsonb_build_object('storage_paths', v_paths);
END;
$$;

-- 2. Fonctions appelables (avant les tables : deux rendent des lignes typées).
DROP FUNCTION public.get_templates_for_context(text, uuid);
DROP FUNCTION public.get_template_statistics(uuid);
DROP FUNCTION public.get_user_frequent_templates(uuid, integer);
DROP FUNCTION public.duplicate_template(uuid, uuid, text);
DROP FUNCTION public.log_template_action(uuid, text, uuid, jsonb, jsonb);

-- 3. Tables, enfants d'abord. Sans CASCADE : une dépendance oubliée fait
--    échouer la migration au lieu d'emporter autre chose. Policies, index et
--    triggers partent avec leur table.
DROP TABLE public.user_favorite_templates;
DROP TABLE public.template_usage_stats;
DROP TABLE public.template_audit_log;
DROP TABLE public.message_template_versions;
DROP TABLE public.message_templates;

-- 4. Fonctions des triggers, désormais sans trigger.
DROP FUNCTION public.auto_log_template_changes();
DROP FUNCTION public.save_template_version();
DROP FUNCTION public.update_message_template_updated_at();
