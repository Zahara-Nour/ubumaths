-- ============================================================================
-- SECURITY — Vague 1 (voir docs/wip/security-audit-2026-08.md)
-- Finding H12 : les réponses privées d'élèves fuitent entre eux dans un thread.
-- ============================================================================
-- get_message_thread vérifie que l'appelant est partie à AU MOINS UN message du
-- thread, puis la CTE récursive renvoie TOUS les descendants sans filtre par
-- destinataire. Élève A répond en privé au prof sur un message de groupe → élève
-- B (destinataire de la racine) lit la réponse de A via l'UI normale.
--
-- Correctif : filtrer la sortie finale sur les messages dont l'appelant est
-- expéditeur OU destinataire (message_inbox), admin exempté. La traversée de
-- l'arbre est inchangée ; seule la VISIBILITÉ des lignes renvoyées est restreinte.
-- (Reproduit la version durcie en Vague 0 — garde auth.uid() conservée.)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_message_thread(
  p_thread_root_id uuid,
  p_user_id uuid
)
 RETURNS TABLE(message_id uuid, sender_id uuid, sender_name text, sender_avatar_url text, subject text, content jsonb, sent_at timestamp with time zone, edited_at timestamp with time zone, parent_message_id uuid, level integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- SECURITY: a caller may only fetch a thread as themselves (admins exempt).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Verify user has access to this thread
  IF NOT EXISTS (
    SELECT 1 FROM private_messages pm
    LEFT JOIN message_inbox mi ON mi.message_id = pm.id
    WHERE (pm.id = p_thread_root_id OR pm.thread_root_id = p_thread_root_id)
      AND (pm.sender_id = p_user_id OR mi.recipient_id = p_user_id)
  ) THEN
    RAISE EXCEPTION 'You do not have access to this message thread';
  END IF;

  RETURN QUERY
  WITH RECURSIVE thread_messages AS (
    -- Root message
    SELECT
      pm.id,
      pm.sender_id,
      p.full_name AS sender_name,
      p.avatar_url AS sender_avatar_url,
      pm.subject,
      pm.content,
      pm.sent_at,
      pm.edited_at,
      pm.parent_message_id,
      0 AS level
    FROM private_messages pm
    JOIN profiles p ON p.id = pm.sender_id
    WHERE pm.id = p_thread_root_id
      AND pm.deleted_by_sender = FALSE

    UNION ALL

    -- Recursive: get replies
    SELECT
      pm.id,
      pm.sender_id,
      p.full_name,
      p.avatar_url,
      pm.subject,
      pm.content,
      pm.sent_at,
      pm.edited_at,
      pm.parent_message_id,
      tm.level + 1
    FROM private_messages pm
    JOIN profiles p ON p.id = pm.sender_id
    JOIN thread_messages tm ON pm.parent_message_id = tm.id
    WHERE pm.deleted_by_sender = FALSE
  )
  -- SECURITY (H12): only return messages the caller actually sent or received.
  SELECT tm.* FROM thread_messages tm
  WHERE public.is_admin()
     OR tm.sender_id = p_user_id
     OR EXISTS (
       SELECT 1 FROM message_inbox mi
       WHERE mi.message_id = tm.id AND mi.recipient_id = p_user_id
     )
  ORDER BY tm.sent_at ASC;
END;
$function$;

COMMENT ON FUNCTION public.get_message_thread(uuid, uuid) IS
	'Vague-0 (C3): sender/caller guard. Vague-1 (H12): thread output filtered to messages the caller sent or received (no cross-recipient leak).';
