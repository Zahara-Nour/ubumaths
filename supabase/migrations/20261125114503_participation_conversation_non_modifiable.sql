-- ============================================================================
-- Chat : une participation ne change pas de conversation (écart T32)
-- ============================================================================
-- Constat du 2026-11-25, prouvé sur la pile de test : la policy « Users can
-- update their own participation » de `conversation_participants` n'a pas de
-- liste de colonnes (`user_id = auth.uid()` des deux côtés). Un élève pouvait
-- donc, par l'API de la base, changer `conversation_id` de sa propre
-- participation : s'il connaissait l'identifiant d'une conversation entre deux
-- autres élèves, il en devenait participant et en lisait les messages.
--
-- Accès (question en miroir, tranchée par David le 2026-11-25) : plus aucun compte
-- connecté (élève, prof, admin) ne change la conversation d'une participation.
-- Aucun écran ni aucune route ne le fait (`grep -rn "conversation_participants" src` :
-- côté application, une seule lecture, dans api/moderation/messages/[id], aucune
-- écriture) ; la seule fonction de la base qui met à jour la table,
-- `mark_conversation_read`, écrit `last_read_at` et `last_read_message_id`,
-- jamais `conversation_id`. Personne ne gagne d'accès. Le serveur (service_role,
-- tâche système : pas d'utilisateur connecté) garde la main.
--
-- `user_id` n'a pas besoin de garde : le WITH CHECK de la policy refuse déjà
-- une participation rendue à un autre compte.
--
-- Aucune policy touchée, aucune donnée modifiée. Prouvée par
-- tests/integration/participation-conversation-non-modifiable.test.ts (rouge sans elle).
--
-- Message sans accent : PostgREST rend un 500 sans code sur un message accentué.
--
-- Rollback :
--   DROP TRIGGER IF EXISTS guard_participation_conversation_trg ON public.conversation_participants;
--   DROP FUNCTION IF EXISTS public.guard_participation_conversation();
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_participation_conversation() RETURNS trigger
	LANGUAGE plpgsql
	SET search_path TO 'public', 'pg_temp'
	AS $$
BEGIN
	IF auth.uid() IS NOT NULL THEN
		RAISE EXCEPTION 'Une participation ne change pas de conversation'
			USING ERRCODE = '42501';
	END IF;
	RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_participation_conversation() FROM PUBLIC, anon, authenticated;

-- Sans `UPDATE OF conversation_id` : la clause WHEN compare l'ancienne et la
-- nouvelle ligne, quelle que soit la liste de colonnes envoyée.
CREATE TRIGGER guard_participation_conversation_trg
	BEFORE UPDATE ON public.conversation_participants
	FOR EACH ROW
	WHEN (OLD.conversation_id IS DISTINCT FROM NEW.conversation_id)
	EXECUTE FUNCTION public.guard_participation_conversation();
