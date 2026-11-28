-- Messagerie privée : écarts du lot `messagerie` (L84, L127 / L131, L132,
-- L133, L134, T37).
--
-- Accès (tranché par David le 2026-11-28) : personne ne lit rien de nouveau,
-- chaque point RETIRE un accès.
--   * L127, L131 — `send_private_message` : une réponse ne s'accroche qu'à un
--     message que son auteur a envoyé ou reçu, dans un fil dont il a envoyé ou
--     reçu le premier message. Avant, un élève qui connaissait
--     l'identifiant d'un message rattachait sa réponse au fil d'un autre.
--   * L132 — hors envoi à une classe, le message ne porte ni l'étiquette
--     « message de classe » ni de classe (effet d'affichage seulement).
--   * L134 — un destinataire en double ne compte qu'une fois (avant : 500).
--   * L84 — `validate_message_recipients` : le prof n'écrit plus à un élève de
--     test, que la liste des destinataires ne propose déjà pas.
--   * L133 — `get_message_details`, `get_message_thread` : un message que son
--     destinataire a supprimé ne lui est plus ouvert, ni seul ni dans un fil.
--     L'expéditeur et les autres destinataires gardent leur exemplaire.
--   * T37 — `message_search_index` : ni `anon` ni `authenticated` n'y écrivent
--     (seul le trigger SECURITY DEFINER le remplit) ; `anon` n'y lit plus rien.
--     La RLS bloquait déjà tout cela : ce sont des droits morts.
--
-- Additive : quatre fonctions remplacées, des droits retirés, aucune donnée
-- modifiée. `CREATE OR REPLACE` garde les ACL des fonctions.
--
-- Rollback :
--   1. rejouer les corps de 20261126132310 (`send_private_message`,
--      `get_message_details`, `get_message_thread`) et de 20260618093000
--      (`validate_message_recipients`), chacun avec
--      `SET search_path = public, pg_temp` ;
--   2. droits d'avant (mesurés en prod le 2026-11-28 : `arwdxtm`, sans TRUNCATE) :
--      GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, MAINTAIN
--        ON TABLE public.message_search_index TO anon;
--      GRANT INSERT, UPDATE, DELETE, REFERENCES, TRIGGER
--        ON TABLE public.message_search_index TO authenticated;

-- -----------------------------------------------------------------------------
-- 1. send_private_message — parent envoyé ou reçu, étiquette, doublons
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_private_message(
  p_sender_id uuid,
  p_recipient_ids uuid[],
  p_subject text,
  p_content jsonb,
  p_is_group_message boolean DEFAULT false,
  p_class_id uuid DEFAULT NULL::uuid,
  p_parent_message_id uuid DEFAULT NULL::uuid
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_message_id UUID;
  v_recipient_id UUID;
  v_plain_text TEXT;
  v_thread_root_id UUID;
BEGIN
  -- SECURITY: a caller may only send messages as themselves (admins exempt).
  IF auth.uid() IS NOT NULL AND p_sender_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized: sender mismatch' USING ERRCODE = '42501';
  END IF;

  -- Validate permissions
  IF p_is_group_message AND p_class_id IS NOT NULL THEN
    -- Validate class message
    IF NOT validate_class_message_recipients(p_sender_id, p_class_id) THEN
      RAISE EXCEPTION 'You do not have permission to send messages to this class';
    END IF;

    -- Get all students in the class
    SELECT array_agg(student_id)
    INTO p_recipient_ids
    FROM get_students_in_class(p_class_id);

    -- Classe sans élève actif : personne à qui écrire (message sans accent,
    -- le serveur lit le code)
    IF p_recipient_ids IS NULL OR cardinality(p_recipient_ids) = 0 THEN
      RAISE EXCEPTION 'no active student in this class' USING ERRCODE = 'P0002';
    END IF;

  ELSE
    -- L132 : hors envoi à une classe, ni étiquette « message de classe », ni classe
    p_is_group_message := FALSE;
    p_class_id := NULL;

    -- L134 : un destinataire en double ne compte qu'une fois (sinon la
    -- contrainte d'unicité de message_inbox lève une erreur 500)
    SELECT array_agg(DISTINCT rid)
    INTO p_recipient_ids
    FROM unnest(p_recipient_ids) AS rid;

    -- Validate individual recipients
    IF NOT validate_message_recipients(p_sender_id, p_recipient_ids) THEN
      RAISE EXCEPTION 'You do not have permission to send messages to one or more recipients';
    END IF;
  END IF;

  -- Extract plain text from TipTap JSON using new function
  v_plain_text := extract_plain_text_from_tiptap(p_content);
  v_plain_text := substring(trim(v_plain_text), 1, 5000); -- Limit length and trim whitespace

  -- L127, L131 : on ne répond qu'à un message qu'on a envoyé ou reçu, dans
  -- un fil dont on a envoyé ou reçu le premier message (sinon la réponse
  -- s'accrocherait au fil d'un autre, y compris par un parent écrit en direct
  -- dans la table avec le `thread_root_id` d'un autre fil). Message sans
  -- accent : le serveur lit le code.
  IF p_parent_message_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM private_messages parent
    JOIN private_messages root ON root.id = COALESCE(parent.thread_root_id, parent.id)
    WHERE parent.id = p_parent_message_id
      AND (
        parent.sender_id = p_sender_id
        OR EXISTS (
          SELECT 1 FROM message_inbox mi
          WHERE mi.message_id = parent.id AND mi.recipient_id = p_sender_id
        )
      )
      AND (
        root.sender_id = p_sender_id
        OR EXISTS (
          SELECT 1 FROM message_inbox mi
          WHERE mi.message_id = root.id AND mi.recipient_id = p_sender_id
        )
      )
  ) THEN
    RAISE EXCEPTION 'unauthorized: parent message not sent or received' USING ERRCODE = '42501';
  END IF;

  -- Determine thread root
  IF p_parent_message_id IS NOT NULL THEN
    -- Get thread root from parent
    SELECT COALESCE(thread_root_id, id)
    INTO v_thread_root_id
    FROM private_messages
    WHERE id = p_parent_message_id;
  ELSE
    v_thread_root_id := NULL; -- This will be the root
  END IF;

  -- Insert message
  INSERT INTO private_messages (
    sender_id,
    subject,
    content,
    plain_text,
    parent_message_id,
    thread_root_id,
    is_group_message,
    class_id,
    recipient_count
  ) VALUES (
    p_sender_id,
    p_subject,
    p_content,
    v_plain_text,
    p_parent_message_id,
    v_thread_root_id,
    p_is_group_message,
    p_class_id,
    array_length(p_recipient_ids, 1)
  )
  RETURNING id INTO v_message_id;

  -- If this is a root message, set its own thread_root_id
  IF v_thread_root_id IS NULL THEN
    UPDATE private_messages
    SET thread_root_id = v_message_id
    WHERE id = v_message_id;
  END IF;

  -- Create inbox entries for each recipient
  FOREACH v_recipient_id IN ARRAY p_recipient_ids
  LOOP
    INSERT INTO message_inbox (
      message_id,
      recipient_id,
      status
    ) VALUES (
      v_message_id,
      v_recipient_id,
      'inbox'
    );
  END LOOP;

  RETURN v_message_id;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. validate_message_recipients — le prof n'écrit pas à un élève de test
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_message_recipients(sender_uuid uuid, recipient_uuids uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
	sender_role text;
BEGIN
	SELECT role INTO sender_role FROM profiles WHERE id = sender_uuid;
	IF sender_role IS NULL THEN
		RETURN FALSE;
	END IF;
	IF array_length(recipient_uuids, 1) IS NULL OR array_length(recipient_uuids, 1) = 0 THEN
		RETURN FALSE;
	END IF;

	IF sender_role = 'student' THEN
		-- Every recipient must be the teacher (Option B: the sole teacher).
		RETURN NOT EXISTS (
			SELECT 1 FROM unnest(recipient_uuids) AS rid
			WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = rid AND p.role = 'teacher')
		);
	ELSIF sender_role = 'teacher' THEN
		-- Every recipient must be a real student (L84 : pas un élève de test,
		-- comme la liste des destinataires de get_allowed_recipients).
		RETURN NOT EXISTS (
			SELECT 1 FROM unnest(recipient_uuids) AS rid
			WHERE NOT EXISTS (
				SELECT 1 FROM profiles p
				WHERE p.id = rid AND p.role = 'student' AND coalesce(p.is_test, false) = false
			)
		);
	ELSIF sender_role = 'admin' THEN
		RETURN TRUE;
	END IF;

	RETURN FALSE;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 3. get_message_details — message supprimé par son destinataire
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_message_details(
  p_message_id uuid,
  p_user_id uuid
)
 RETURNS TABLE(message_id uuid, sender_id uuid, sender_name text, sender_avatar_url text, sender_role text, subject text, content jsonb, plain_text text, sent_at timestamp with time zone, edited_at timestamp with time zone, is_group_message boolean, recipient_count integer, parent_message_id uuid, thread_root_id uuid, read_at timestamp with time zone, is_starred boolean, status text, attachments jsonb, recipients jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_reads_all_recipients BOOLEAN;
BEGIN
  -- SECURITY: a caller may only fetch details as themselves (admins exempt).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Verify user has access (L133 : un message que son destinataire a supprimé
  -- ne lui est plus ouvert ; l'expéditeur garde son exemplaire)
  IF NOT EXISTS (
    SELECT 1 FROM private_messages pm
    LEFT JOIN message_inbox mi ON mi.message_id = pm.id
    WHERE pm.id = p_message_id
      AND (
        pm.sender_id = p_user_id
        OR (mi.recipient_id = p_user_id AND mi.deleted = FALSE)
      )
  ) THEN
    RAISE EXCEPTION 'You do not have access to this message';
  END IF;

  -- La liste complète des destinataires : pour l'expéditeur du message et pour
  -- un compte prof ou admin. Un élève destinataire ne lit que sa propre ligne
  -- (pas l'identité de ses camarades).
  SELECT
    EXISTS (
      SELECT 1 FROM private_messages pm0
      WHERE pm0.id = p_message_id AND pm0.sender_id = p_user_id
    )
    OR EXISTS (
      SELECT 1 FROM profiles pr0
      WHERE pr0.id = p_user_id AND pr0.role IN ('teacher', 'admin')
    )
  INTO v_reads_all_recipients;

  RETURN QUERY
  SELECT
    pm.id AS message_id,
    pm.sender_id,
    public.messagerie_nom_affiche(p.full_name, p.firstname, p.lastname) AS sender_name,
    p.avatar_url AS sender_avatar_url,
    p.role::TEXT AS sender_role,  -- Cast to TEXT
    pm.subject,
    pm.content,
    pm.plain_text,
    pm.sent_at,
    pm.edited_at,
    pm.is_group_message,
    pm.recipient_count,
    pm.parent_message_id,
    pm.thread_root_id,
    mi.read_at,
    COALESCE(mi.is_starred, FALSE) AS is_starred,
    COALESCE(mi.status, 'sent') AS status,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', ma.id,
        'file_name', ma.file_name,
        'file_type', ma.file_type,
        'file_size', ma.file_size,
        'public_url', ma.public_url,
        'uploaded_at', ma.uploaded_at
      ))
      FROM message_attachments_v2 ma
      WHERE ma.message_id = pm.id
    ) AS attachments,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', pr.id,
        'name', public.messagerie_nom_affiche(pr.full_name, pr.firstname, pr.lastname),
        'avatar_url', pr.avatar_url,
        'role', pr.role::TEXT  -- Cast to TEXT
      ))
      FROM message_inbox mi2
      JOIN profiles pr ON pr.id = mi2.recipient_id
      WHERE mi2.message_id = pm.id
        AND (v_reads_all_recipients OR mi2.recipient_id = p_user_id)
    ) AS recipients
  FROM private_messages pm
  JOIN profiles p ON p.id = pm.sender_id
  LEFT JOIN message_inbox mi ON mi.message_id = pm.id AND mi.recipient_id = p_user_id
  WHERE pm.id = p_message_id;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 4. get_message_thread — message supprimé par son destinataire
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_message_thread(
  p_thread_root_id uuid,
  p_user_id uuid
)
 RETURNS TABLE(message_id uuid, sender_id uuid, sender_name text, sender_avatar_url text, subject text, content jsonb, sent_at timestamp with time zone, edited_at timestamp with time zone, parent_message_id uuid, level integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
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
      AND (
        pm.sender_id = p_user_id
        OR (mi.recipient_id = p_user_id AND mi.deleted = FALSE)
      )
  ) THEN
    RAISE EXCEPTION 'You do not have access to this message thread';
  END IF;

  RETURN QUERY
  WITH RECURSIVE thread_messages AS (
    -- Root message
    SELECT
      pm.id,
      pm.sender_id,
      public.messagerie_nom_affiche(p.full_name, p.firstname, p.lastname) AS sender_name,
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
      public.messagerie_nom_affiche(p.full_name, p.firstname, p.lastname),
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
  -- SECURITY (H12): only return messages the caller actually sent or received
  -- (L133 : et que son destinataire n'a pas supprimés).
  SELECT tm.* FROM thread_messages tm
  WHERE public.is_admin()
     OR tm.sender_id = p_user_id
     OR EXISTS (
       SELECT 1 FROM message_inbox mi
       WHERE mi.message_id = tm.id AND mi.recipient_id = p_user_id AND mi.deleted = FALSE
     )
  ORDER BY tm.sent_at ASC;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 5. message_search_index — aucun droit d'écriture des rôles clients
-- -----------------------------------------------------------------------------
REVOKE ALL ON TABLE public.message_search_index FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.message_search_index FROM authenticated;
