-- ============================================================================
-- Chat : un message ne change pas de conversation (écart T31)
-- ============================================================================
-- Constat du security-auditor sur #3132 (2026-11-25) : les policies UPDATE de
-- `messages` n'ont pas de liste de colonnes. Un élève pouvait, par l'API de la
-- base, changer `conversation_id` de son propre message : un message marqué d'une
-- conversation à deux entre élèves, déplacé vers une conversation avec un adulte,
-- gardait sa marque mais sortait de l'onglet « Messages marqués » du prof
-- (get_flagged_messages_for_teacher). Il pouvait aussi glisser un message dans
-- une conversation où il n'a pas été écrit.
--
-- Accès (question en miroir, tranchée par David le 2026-11-25) : plus aucun compte
-- connecté (élève, prof, admin) ne déplace un message d'une conversation à une
-- autre. Aucun écran ni aucune route ne le fait (`grep -rn "from('messages')" src` :
-- côté application, une seule mise à jour, `deleted_at`, dans
-- api/moderation/messages/[id]) ; les fonctions de la base qui modifient `messages`
-- écrivent `sender_id`, `is_reported` ou `deleted_at`, jamais `conversation_id`.
-- Personne ne gagne d'accès. Le serveur (service_role, tâche système : pas
-- d'utilisateur connecté) garde la main.
--
-- Aucune policy touchée, aucune donnée modifiée. Prouvée par
-- tests/integration/messages-conversation-non-modifiable.test.ts (rouge sans elle).
--
-- Message sans accent : PostgREST rend un 500 sans code sur un message accentué.
--
-- Rollback :
--   DROP TRIGGER IF EXISTS guard_message_conversation_trg ON public.messages;
--   DROP FUNCTION IF EXISTS public.guard_message_conversation();
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_message_conversation() RETURNS trigger
	LANGUAGE plpgsql
	SET search_path TO 'public', 'pg_temp'
	AS $$
BEGIN
	IF auth.uid() IS NOT NULL THEN
		RAISE EXCEPTION 'Un message ne change pas de conversation'
			USING ERRCODE = '42501';
	END IF;
	RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_message_conversation() FROM PUBLIC, anon, authenticated;

-- Sans `UPDATE OF conversation_id` : la clause WHEN compare l'ancienne et la
-- nouvelle ligne, quelle que soit la liste de colonnes envoyée.
CREATE TRIGGER guard_message_conversation_trg
	BEFORE UPDATE ON public.messages
	FOR EACH ROW
	WHEN (OLD.conversation_id IS DISTINCT FROM NEW.conversation_id)
	EXECUTE FUNCTION public.guard_message_conversation();
