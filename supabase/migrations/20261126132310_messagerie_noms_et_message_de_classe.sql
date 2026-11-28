-- Messagerie privée : message à une classe (V132) et noms affichés (V134).
--
-- V132 — `get_students_in_class` filtrait sur `classes.archived`, colonne qui
-- n'existe plus (la classe porte `is_active`) : tout message envoyé à une classe
-- échouait. Une classe sans élève actif aurait ensuite fait échouer
-- `send_private_message` sur un tableau vide (`FOREACH` sur NULL) : refus net à
-- la place, code P0002, message sans accent (lu par `error.code` côté serveur).
--
-- V134 — les fonctions de lecture rendaient `profiles.full_name` seul, vide pour
-- presque tous les élèves de la prod (prénom et nom remplis, nom complet vide) :
-- « Inconnu » sur la page « Écrire », dans la boîte, les envoyés, le détail et
-- le fil. Même repli que l'index de recherche (20261126094959) : nom complet,
-- sinon « prénom nom », sinon NULL (la page garde alors son propre repli).
--
-- Accès (tranché par David le 2026-11-26) :
--   * le prof lit le prénom et le nom de ses élèves partout dans la messagerie ;
--     l'élève lit le prénom et le nom du prof qui lui écrit. Ce sont les mêmes
--     personnes qu'avant (destinataires permis, expéditeur et destinataires de
--     ses propres messages) : seul le nom rendu change, plus personne de nouveau.
--   * un élève qui reçoit un message envoyé à plusieurs élèves (classe ou
--     sélection) ne lit PAS l'identité des autres destinataires : dans
--     `get_message_details`, la liste `recipients` complète est réservée à
--     l'expéditeur du message et aux comptes prof / admin ; les autres ne
--     reçoivent que leur propre ligne. `recipient_count` reste rendu.
--     C'est un RETRAIT : avant, tout destinataire recevait l'identifiant, le nom
--     complet, l'avatar et le rôle de tous les autres.
--
-- Additive : six fonctions remplacées, une fonction d'aide créée, aucune donnée
-- modifiée. Droits inchangés (`CREATE OR REPLACE` garde les ACL) ; `search_path`
-- redonné tel que posé par 20261003210000 (`public, pg_temp`).
--
-- Rollback :
--   1. rejouer les corps de 20260902091000 (`send_private_message`,
--      `get_user_inbox`, `get_user_sent_messages`, `get_message_details`,
--      `get_allowed_recipients`), de 20260902102000 (`get_message_thread`) et du
--      baseline 20260616220000 (`get_students_in_class`), chacun avec
--      `SET search_path = public, pg_temp` ;
--   2. DROP FUNCTION public.messagerie_nom_affiche(text, text, text);

-- -----------------------------------------------------------------------------
-- 0. Nom affiché d'un compte : nom complet, sinon « prénom nom », sinon NULL
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.messagerie_nom_affiche(
  p_full_name text,
  p_firstname text,
  p_lastname text
)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path = public, pg_temp
AS $function$
  SELECT COALESCE(
    NULLIF(btrim(p_full_name), ''),
    NULLIF(btrim(concat_ws(' ', NULLIF(btrim(p_firstname), ''), NULLIF(btrim(p_lastname), ''))), '')
  );
$function$;

COMMENT ON FUNCTION public.messagerie_nom_affiche(text, text, text) IS
  'Nom affiché dans la messagerie : nom complet, sinon « prénom nom », sinon NULL. Appelée par les fonctions SECURITY DEFINER de la messagerie seulement.';

-- Fonction d'aide interne : aucun rôle client ne l'appelle
REVOKE EXECUTE ON FUNCTION public.messagerie_nom_affiche(text, text, text)
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 1. get_students_in_class — la classe porte `is_active`, plus `archived`
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_students_in_class(class_uuid uuid)
 RETURNS TABLE(student_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  SELECT cm.student_id
  FROM class_members cm
  JOIN classes c ON c.id = cm.class_id
  WHERE c.id = class_uuid
    AND cm.status = 'active'
    AND c.is_active = TRUE;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. send_private_message — classe sans élève actif : refus net
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
    -- Validate individual recipients
    IF NOT validate_message_recipients(p_sender_id, p_recipient_ids) THEN
      RAISE EXCEPTION 'You do not have permission to send messages to one or more recipients';
    END IF;
  END IF;

  -- Extract plain text from TipTap JSON using new function
  v_plain_text := extract_plain_text_from_tiptap(p_content);
  v_plain_text := substring(trim(v_plain_text), 1, 5000); -- Limit length and trim whitespace

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
-- 3. Fonctions de lecture — nom affiché à la place de `full_name` seul
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_inbox(
  p_user_id uuid,
  p_status text DEFAULT 'inbox'::text,
  p_folder_id uuid DEFAULT NULL::uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
 RETURNS TABLE(message_id uuid, sender_id uuid, sender_name text, sender_avatar_url text, subject text, content jsonb, plain_text text, sent_at timestamp with time zone, read_at timestamp with time zone, is_starred boolean, status text, is_group_message boolean, recipient_count integer, has_attachments boolean, attachment_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  -- SECURITY: a caller may only read their own inbox (admins exempt).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    pm.id AS message_id,
    pm.sender_id,
    public.messagerie_nom_affiche(p.full_name, p.firstname, p.lastname) AS sender_name,
    p.avatar_url AS sender_avatar_url,
    pm.subject,
    pm.content,
    substring(pm.plain_text, 1, 200) AS plain_text,
    pm.sent_at,
    mi.read_at,
    mi.is_starred,
    mi.status,
    pm.is_group_message,
    pm.recipient_count,
    (EXISTS (SELECT 1 FROM message_attachments_v2 ma WHERE ma.message_id = pm.id)) AS has_attachments,
    (SELECT COUNT(*)::INT FROM message_attachments_v2 ma WHERE ma.message_id = pm.id) AS attachment_count
  FROM message_inbox mi
  JOIN private_messages pm ON pm.id = mi.message_id
  JOIN profiles p ON p.id = pm.sender_id
  WHERE mi.recipient_id = p_user_id
    AND mi.deleted = FALSE
    AND pm.deleted_by_sender = FALSE
    AND mi.status = p_status
    AND (p_folder_id IS NULL OR mi.folder_id = p_folder_id)
  ORDER BY pm.sent_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_sent_messages(
  p_user_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
 RETURNS TABLE(message_id uuid, subject text, content jsonb, plain_text text, sent_at timestamp with time zone, is_group_message boolean, recipient_count integer, has_attachments boolean, recipients jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  -- SECURITY: a caller may only read their own sent messages (admins exempt).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    pm.id AS message_id,
    pm.subject,
    pm.content,
    substring(pm.plain_text, 1, 200) AS plain_text,
    pm.sent_at,
    pm.is_group_message,
    pm.recipient_count,
    (EXISTS (SELECT 1 FROM message_attachments_v2 ma WHERE ma.message_id = pm.id)) AS has_attachments,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', public.messagerie_nom_affiche(p.full_name, p.firstname, p.lastname),
        'avatar_url', p.avatar_url
      ))
      FROM message_inbox mi
      JOIN profiles p ON p.id = mi.recipient_id
      WHERE mi.message_id = pm.id
    ) AS recipients
  FROM private_messages pm
  WHERE pm.sender_id = p_user_id
    AND pm.deleted_by_sender = FALSE
  ORDER BY pm.sent_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

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

  -- Verify user has access
  IF NOT EXISTS (
    SELECT 1 FROM private_messages pm
    LEFT JOIN message_inbox mi ON mi.message_id = pm.id
    WHERE pm.id = p_message_id
      AND (pm.sender_id = p_user_id OR mi.recipient_id = p_user_id)
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

CREATE OR REPLACE FUNCTION public.get_allowed_recipients(
  p_user_id uuid
)
 RETURNS TABLE(user_id uuid, full_name text, avatar_url text, role text, relationship text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
	v_user_role text;
BEGIN
	-- SECURITY: a caller may only list their own allowed recipients (admins exempt).
	IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
		RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
	END IF;

	SELECT profiles.role INTO v_user_role FROM profiles WHERE profiles.id = p_user_id;

	-- Colonne `full_name` de la réponse = nom affiché (nom complet, sinon
	-- « prénom nom ») ; triée par ce nom, les comptes sans nom à la fin.
	IF v_user_role = 'student' THEN
		-- Option B: a student may message the single teacher account.
		RETURN QUERY
			SELECT p.id, public.messagerie_nom_affiche(p.full_name, p.firstname, p.lastname),
				p.avatar_url, p.role::text, 'teacher'::text
			FROM profiles p
			WHERE p.role = 'teacher'
			ORDER BY 2;
	ELSIF v_user_role = 'teacher' THEN
		-- Option B: the teacher may message EVERY (real) student, in-class or not.
		RETURN QUERY
			SELECT p.id, public.messagerie_nom_affiche(p.full_name, p.firstname, p.lastname),
				p.avatar_url, p.role::text, 'student'::text
			FROM profiles p
			WHERE p.role = 'student'
			  AND coalesce(p.is_test, false) = false
			ORDER BY 2;
	ELSIF v_user_role = 'admin' THEN
		RETURN QUERY
			SELECT p.id, public.messagerie_nom_affiche(p.full_name, p.firstname, p.lastname),
				p.avatar_url, p.role::text, 'any'::text
			FROM profiles p
			WHERE p.id <> p_user_id
			ORDER BY 2;
	END IF;
END;
$function$;
