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

	-- Le reste (économie, jeux, SRS, conversations privées, consentements…) part
	-- avec la cascade de profiles lors de auth.admin.deleteUser.
	RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.delete_user_account(uuid) IS
	'RGPD art. 17 : prépare la suppression d''un compte ÉLÈVE (messages effacés, clés '
	'étrangères sans ON DELETE nettoyées) avant auth.admin.deleteUser, dont la cascade '
	'emporte le reste. Refuse prof et admin. Réservée à service_role.';

REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO service_role;
