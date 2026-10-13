-- Suppression d'un compte : seuls les fichiers rangés chez l'élève sont rendus
-- ==========================================================================
--
-- Audit de #1243 (2026-10-13), vérifié en prod : un élève écrit lui-même
-- message_attachments_v2.storage_path (sur son propre message privé) et
-- bug_reports.screenshot_path (sur son propre signalement), sans contrôle du chemin. En y
-- mettant le chemin du fichier d'un camarade puis en supprimant son compte, il faisait
-- retirer ce fichier par le client service (route de suppression, cron
-- api/cron/deleted-account-files). Accord de David du 2026-10-13.
--
-- Changement : delete_user_account ne rend plus, pour ces deux buckets, que les chemins
-- rangés comme l'application range les fichiers de l'élève :
--   message-attachments    : messages/<id d'un message privé qu'il a envoyé>/…
--   bug-report-screenshots : <son id>/<id d'un de ses signalements>/…
-- et jamais un chemin dont un segment vaut « .. » (un nom comme photo..png reste rendu ;
-- casse des UUID ignorée). Un chemin non conforme est ignoré (le fichier reste).
-- chat-attachments inchangé : seuls prof et admin y créent des pièces jointes.
-- Le reste de la fonction est recopié à l'identique de 20261014100000.
--
-- Accès : aucun gagné, aucun perdu (fonction réservée à service_role, inchangé).
-- Prod : 0 fichier dans ces buckets, 0 suppression consignée.
--
-- Tests : tests/integration/suppression-compte-art17.test.ts
--
-- Rollback : rejouer la définition de delete_user_account de
--   20261014100000_suppression_compte_art17.sql (rouvre la faille).

CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

	-- Journal de ses propres favoris de modèles (log_template_action l'accepte
	-- d'un élève) : son activité, supprimée avec lui.
	DELETE FROM template_audit_log WHERE performed_by = p_user_id;
	GET DIAGNOSTICS v_count = ROW_COUNT;
	v_result := v_result || jsonb_build_object('template_audit_log_deleted', v_count);

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

COMMENT ON FUNCTION public.delete_user_account(uuid) IS
	'RGPD art. 17 : prépare la suppression d''un compte ÉLÈVE (messages effacés, clés '
	'étrangères sans ON DELETE nettoyées, échec total si une reste) avant '
	'auth.admin.deleteUser, dont la cascade emporte le reste. Rend storage_paths, les '
	'fichiers à retirer. Refuse prof et admin. Réservée à service_role.';

REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO service_role;
