-- ============================================================================
-- Chat : un message envoyé ne se réécrit pas (écarts T33 et T30)
-- ============================================================================
-- Constat du security-auditor sur #3140 (2026-11-25) : les policies UPDATE de
-- `messages` n'ont pas de liste de colonnes. Par l'API de la base, un élève
-- pouvait :
--   - remplacer par un texte propre le contenu de son message marqué : la marque
--     restait, mais l'onglet « Messages marqués » du prof montrait le texte
--     propre, et l'ancien texte n'était gardé nulle part (T33) ;
--   - antidater son message marqué (`created_at`), ce qui le faisait passer
--     derrière la limite de l'onglet du prof et sous la purge de conservation (T30).
-- Le prof, lui, pouvait réécrire le message d'un élève du chat de sa classe ou en
-- changer l'auteur (policy « Teachers can delete messages in their class chats »,
-- sans WITH CHECK).
--
-- Accès (question en miroir, tranchée par David le 2026-11-25) : plus aucun compte
-- connecté (élève, prof, admin) ne réécrit un message de chat envoyé, comme pour
-- les messages privés (décision du 2026-10-13). L'application n'a pas de bouton
-- « modifier » (`grep -rn "from('messages')" src` : une seule mise à jour,
-- `deleted_at`, dans api/moderation/messages/[id], par le client service).
-- Personne ne gagne d'accès : le prof lit le texte d'origine parce qu'il n'y en a
-- plus qu'un. Le serveur (service_role, tâche système : pas d'utilisateur connecté)
-- garde la main, dont `delete_user_account`, qui vide `sender_id`.
--
-- Règle : LISTE BLANCHE, la même que celle de la garde de lecture seule
-- (`guard_read_only_actor`). Un compte connecté ne change que :
--   - `deleted_at`  : supprimer (`soft_delete_message`, `review_report`) ;
--   - `is_reported` : signaler (`report_message`), dans un seul sens : un
--     signalement posé ne se retire pas (aucun écran ne lit cette colonne, les
--     signalements vivent dans `message_reports` ; c'est le reste de T30) ;
--   - `is_flagged`, `flag_reason` : la marque, que `process_message_content`
--     réserve déjà au prof et à l'admin (un élève qui les envoie voit ses valeurs
--     écrasées, sans erreur : inchangé).
-- Toute autre colonne changée, d'aujourd'hui ou ajoutée plus tard, est refusée.
--
-- Ordre des triggers BEFORE UPDATE (alphabétique) : `guard_message_conversation_trg`
-- passe avant et garde son message pour un changement de conversation ;
-- `trigger_process_message_content` passe après, donc un `plain_text` envoyé par
-- l'appelant est refusé ici au lieu d'être recalculé en silence.
--
-- Aucune policy touchée, aucune donnée modifiée. Prouvée par
-- tests/integration/messages-chat-non-reecrits.test.ts (rouge sans elle).
--
-- Message sans accent : PostgREST rend un 500 sans code sur un message accentué.
--
-- Rollback :
--   DROP TRIGGER IF EXISTS guard_message_reecriture_trg ON public.messages;
--   DROP FUNCTION IF EXISTS public.guard_message_reecriture();
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_message_reecriture() RETURNS trigger
	LANGUAGE plpgsql
	SET search_path TO 'public', 'pg_temp'
	AS $$
DECLARE
	v_changed text[];
BEGIN
	-- Serveur (service_role, tâche système) : rien à garder.
	IF auth.uid() IS NULL THEN
		RETURN NEW;
	END IF;

	SELECT coalesce(array_agg(n.key), '{}') INTO v_changed
	FROM jsonb_each(to_jsonb(NEW)) n
	WHERE n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key);

	IF NOT v_changed <@ ARRAY['deleted_at', 'is_reported', 'is_flagged', 'flag_reason'] THEN
		RAISE EXCEPTION 'Un message envoye ne se reecrit pas'
			USING ERRCODE = '42501';
	END IF;

	IF NEW.is_reported IS DISTINCT FROM OLD.is_reported AND NEW.is_reported IS NOT TRUE THEN
		RAISE EXCEPTION 'Un signalement ne se retire pas'
			USING ERRCODE = '42501';
	END IF;

	RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_message_reecriture() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER guard_message_reecriture_trg
	BEFORE UPDATE ON public.messages
	FOR EACH ROW
	EXECUTE FUNCTION public.guard_message_reecriture();
