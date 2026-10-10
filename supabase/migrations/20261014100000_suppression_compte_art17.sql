-- ============================================================================
-- RGPD art. 17 — la suppression de compte fonctionne à nouveau (constat A1)
-- ============================================================================
--
-- Mesuré en prod le 2026-10-10 : la version du baseline écrivait dans des tables
-- disparues (shop_purchase_history, item_usage_log, student_item_inventory,
-- message_template_audit, message_template_drafts, notifications.user_id) et
-- passait à NULL des colonnes NOT NULL (gidouilles_activity, bonus_history,
-- vip_cards_activity) → /api/account/delete rendait 500 pour tout le monde.
-- Même réparée, auth.admin.deleteUser échouait ensuite pour un élève ayant des
-- exercise_completions / exercise_assignments (clés étrangères sans ON DELETE).
--
-- Décisions de David (2026-10-10), réponses à « qui pourra lire quoi après ? » :
--   1. Économie (gidouilles, bonus, cartes VIP) : TOUT est supprimé — la cascade
--      de profiles le fait déjà ; on n'anonymise plus.
--   2. Messages écrits par l'élève : supprimés pour tous les participants, texte
--      compris (plus d'« auteur anonyme » au texte lisible). Les signalements de
--      ces messages partent avec eux (message_reports en ON DELETE CASCADE).
--   3. Seuls les comptes élèves se suppriment par ce chemin : un prof ou un admin
--      est refusé (en mono-prof, sa cascade emporterait classes et travaux).
--
-- security-auditor (2026-10-10), corrigé ici :
--   - template_audit_log.performed_by et worksheet_error_reports.reviewed_by (sans
--     ON DELETE) sont remplissables par un élève — le second même au nom d'un
--     AUTRE élève — et bloquaient la cascade ;
--   - atomicité : en fin de fonction, toute référence restante sans ON DELETE vers
--     le compte lève une exception → la transaction entière est annulée, rien n'a
--     été effacé à moitié (garde générique : couvre aussi les futures tables) ;
--   - fichiers : les chemins exacts des pièces jointes et captures sont collectés
--     AVANT la cascade et rendus à la route, qui les supprime du storage.
--
-- Additive : aucune donnée n'est touchée au moment de la migration ; seule change
-- ce que fait la fonction quand un élève demande sa suppression.
--
-- Exécution réservée à service_role (inchangé, réaffirmé ci-dessous).
--
-- ROLLBACK : recréer la fonction depuis
--   supabase/migrations/20260616220000_baseline_schema.sql (l. 6609-6787),
--   puis `ALTER FUNCTION public.delete_user_account(uuid)
--   SET search_path = public, pg_temp;` — en sachant qu'elle échoue pour tous.
-- ============================================================================

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
		'message-attachments', coalesce((
			SELECT jsonb_agg(DISTINCT storage_path)
			FROM message_attachments_v2
			WHERE uploaded_by = p_user_id AND storage_path IS NOT NULL
		), '[]'::jsonb),
		'bug-report-screenshots', coalesce((
			SELECT jsonb_agg(DISTINCT screenshot_path)
			FROM bug_reports
			WHERE user_id = p_user_id AND screenshot_path IS NOT NULL
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
