-- =============================================================================
-- RPC lot 3 : un élève n'agit plus sur le compte d'un autre, et ne s'attribue
-- plus de récompense (fonctions SECURITY DEFINER)
-- =============================================================================
--
-- Constat : des fonctions SECURITY DEFINER exécutables par `authenticated`
-- prenaient l'identifiant de l'utilisateur visé en paramètre sans regarder QUI
-- appelait. Un élève connecté pouvait, par simple appel RPC :
--   * ranger, étoiler, marquer lu ou mettre à la corbeille les messages d'un
--     autre (F10) ;
--   * marquer lue la conversation d'un autre, ouvrir une conversation au nom
--     de deux autres élèves amis entre eux, ou afficher un autre élève
--     « en ligne » / « hors ligne » (F11) ;
--   * s'inscrire n'importe quel score 2048, créditer de l'XP au compagnon de
--     n'importe qui en contournant le plafond (p_is_milestone), ou déclencher
--     des succès avec des données d'événement inventées (F12, Q141).
--
-- Décisions de David (Q143, Q141) : un élève n'agit plus sur le compte d'un
-- autre et ne s'attribue plus de récompense. Le versement des gidouilles des
-- succès (Q146) n'est PAS traité ici.
--
-- Ce que fait cette migration (ADDITIVE : aucun DROP, aucune donnée touchée) :
--   F10 update_message_status, move_message_to_folder, toggle_message_star,
--       mark_message_as_read           : 42501 si p_user_id ≠ auth.uid().
--   F11 mark_conversation_read, upsert_user_presence : idem (p_user_id) ;
--       create_1on1_chat               : 42501 si p_user1_id ≠ auth.uid() ;
--                                        la règle d'amitié existante reste.
--   À vérifier de l'inventaire : insert_tutor_messages,
--       update_tutor_conversation_stats : idem (p_user_id). Aucun appelant.
--   Pour toutes ces gardes : auth.uid() NULL = client service (anon n'a pas
--   EXECUTE), qui garde la main.
--   F12 upsert_2048_score, add_buddy_xp : EXECUTE retiré à authenticated ; le
--       serveur les appelle au client service APRÈS ses contrôles (identité
--       de session) : routes/api/games/2048/scores, lib/server/buddy-queries.
--   Q141 process_achievement_event     : EXECUTE retiré ; appel au client
--       service dans lib/server/achievements/service.ts.
--       update_achievement_progress    : EXECUTE retiré ; aucun appelant hors
--       process_achievement_event (SECURITY DEFINER propriété de postgres :
--       pas d'impact).
--
-- ⚠️ ORDRE DE LIVRAISON : le code (appels au client service) doit être en
-- production AVANT cette migration — sinon 2048, XP du compagnon et succès
-- échouent entre le db:migrate et le déploiement. Le code au client service
-- marche avec ou sans la migration.
--
-- Corps repris de la prod (pg_get_functiondef local, md5(prosrc) local = prod
-- vérifié le 2026-10-03) ; seule la garde est ajoutée, en tête du bloc BEGIN.
-- Droits d'origine relevés en prod (proacl), identiques pour les 13 :
--   {postgres=X, authenticated=X, service_role=X} — ni PUBLIC, ni anon.
-- Leçon d'août : on révoque PUBLIC et anon en plus d'authenticated.
--
-- Tests : tests/integration/rpc-lot3-compte-autrui.test.ts
-- =============================================================================

-- -----------------------------------------------------------------------------
-- F10 update_message_status : p_user_id doit être l'appelant
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_message_status(p_message_id uuid, p_user_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Garde (lot 3, Q143) : on n'agit que sur SON compte. auth.uid() NULL =
  -- appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('inbox', 'archived', 'trash') THEN
    RAISE EXCEPTION 'Invalid status. Must be inbox, archived, or trash';
  END IF;

  UPDATE message_inbox
  SET status = p_status
  WHERE message_id = p_message_id
    AND recipient_id = p_user_id;
END;
$function$
;

REVOKE EXECUTE ON FUNCTION public.update_message_status(uuid, uuid, text) FROM PUBLIC, anon;

-- -----------------------------------------------------------------------------
-- F10 move_message_to_folder : p_user_id doit être l'appelant
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.move_message_to_folder(p_message_id uuid, p_user_id uuid, p_folder_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Garde (lot 3, Q143) : on n'agit que sur SON compte. auth.uid() NULL =
  -- appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  -- Verify folder belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM user_folders
    WHERE id = p_folder_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Folder not found or does not belong to you';
  END IF;

  UPDATE message_inbox
  SET folder_id = p_folder_id
  WHERE message_id = p_message_id
    AND recipient_id = p_user_id;
END;
$function$
;

REVOKE EXECUTE ON FUNCTION public.move_message_to_folder(uuid, uuid, uuid) FROM PUBLIC, anon;

-- -----------------------------------------------------------------------------
-- F10 toggle_message_star : p_user_id doit être l'appelant
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_message_star(p_message_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_value BOOLEAN;
BEGIN
  -- Garde (lot 3, Q143) : on n'agit que sur SON compte. auth.uid() NULL =
  -- appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  UPDATE message_inbox
  SET is_starred = NOT is_starred
  WHERE message_id = p_message_id
    AND recipient_id = p_user_id
  RETURNING is_starred INTO v_new_value;

  RETURN v_new_value;
END;
$function$
;

REVOKE EXECUTE ON FUNCTION public.toggle_message_star(uuid, uuid) FROM PUBLIC, anon;

-- -----------------------------------------------------------------------------
-- F10 mark_message_as_read : p_user_id doit être l'appelant
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_message_as_read(p_message_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Garde (lot 3, Q143) : on n'agit que sur SON compte. auth.uid() NULL =
  -- appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  UPDATE message_inbox
  SET read_at = NOW()
  WHERE message_id = p_message_id
    AND recipient_id = p_user_id
    AND read_at IS NULL; -- Only update if not already read
END;
$function$
;

REVOKE EXECUTE ON FUNCTION public.mark_message_as_read(uuid, uuid) FROM PUBLIC, anon;

-- -----------------------------------------------------------------------------
-- F11 mark_conversation_read : p_user_id doit être l'appelant
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid, p_user_id uuid, p_message_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Garde (lot 3, Q143) : on n'agit que sur SON compte. auth.uid() NULL =
  -- appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  -- Update last_read_at and optionally last_read_message_id
  UPDATE conversation_participants
  SET
    last_read_at = NOW(),
    last_read_message_id = COALESCE(p_message_id, last_read_message_id)
  WHERE conversation_id = p_conversation_id
  AND user_id = p_user_id;
END;
$function$
;

REVOKE EXECUTE ON FUNCTION public.mark_conversation_read(uuid, uuid, uuid) FROM PUBLIC, anon;

-- -----------------------------------------------------------------------------
-- F11 create_1on1_chat : p_user1_id doit être l'appelant
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_1on1_chat(p_user1_id uuid, p_user2_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_conversation_id UUID;
  v_are_friends BOOLEAN;
BEGIN
  -- Garde (lot 3, Q143) : on n'agit que sur SON compte. auth.uid() NULL =
  -- appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user1_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  -- Check if users are friends
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE (
      (requester_id = p_user1_id AND addressee_id = p_user2_id)
      OR (requester_id = p_user2_id AND addressee_id = p_user1_id)
    )
    AND status = 'accepted'
  ) INTO v_are_friends;

  IF NOT v_are_friends THEN
    RAISE EXCEPTION 'Users must be friends to create a 1-on-1 chat';
  END IF;

  -- Check if conversation already exists between these two users
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.is_group = false
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id
    AND cp1.user_id = p_user1_id
  )
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id
    AND cp2.user_id = p_user2_id
  )
  LIMIT 1;

  -- If conversation exists, return it
  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (is_group, created_at)
  VALUES (false, NOW())
  RETURNING id INTO v_conversation_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
  VALUES
    (v_conversation_id, p_user1_id, NOW()),
    (v_conversation_id, p_user2_id, NOW());

  RETURN v_conversation_id;
END;
$function$
;

REVOKE EXECUTE ON FUNCTION public.create_1on1_chat(uuid, uuid) FROM PUBLIC, anon;

-- -----------------------------------------------------------------------------
-- F11 upsert_user_presence : p_user_id doit être l'appelant
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_user_presence(p_user_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
  -- Garde (lot 3, Q143) : on n'agit que sur SON compte. auth.uid() NULL =
  -- appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  INSERT INTO user_presence (user_id, status, last_heartbeat, updated_at)
  VALUES (p_user_id, p_status, now(), now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    last_heartbeat = EXCLUDED.last_heartbeat,
    updated_at = EXCLUDED.updated_at;
END;
$function$
;

REVOKE EXECUTE ON FUNCTION public.upsert_user_presence(uuid, text) FROM PUBLIC, anon;

-- -----------------------------------------------------------------------------
-- vérif. insert_tutor_messages : p_user_id doit être l'appelant
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_tutor_messages(p_conversation_id uuid, p_user_id uuid, p_messages jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  msg JSONB;
  inserted_ids UUID[] := '{}';
  new_id UUID;
BEGIN
  -- Garde (lot 3, Q143) : on n'agit que sur SON compte. auth.uid() NULL =
  -- appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  -- Security check: Verify user owns the conversation and it's active
  IF NOT EXISTS (
    SELECT 1 FROM tutor_conversations
    WHERE id = p_conversation_id
    AND student_id = p_user_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: user does not own this conversation or conversation is not active'
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  -- Insert each message from the JSONB array
  FOR msg IN SELECT * FROM jsonb_array_elements(p_messages)
  LOOP
    INSERT INTO tutor_messages (
      conversation_id,
      role,
      content,
      help_level,
      help_method_used,
      cheat_detected
    ) VALUES (
      p_conversation_id,
      msg->>'role',
      msg->>'content',
      (msg->>'help_level')::INTEGER,
      msg->>'help_method_used',
      COALESCE((msg->>'cheat_detected')::BOOLEAN, false)
    )
    RETURNING id INTO new_id;

    inserted_ids := array_append(inserted_ids, new_id);
  END LOOP;

  -- Return the inserted message IDs
  RETURN jsonb_build_object(
    'success', true,
    'inserted_ids', to_jsonb(inserted_ids),
    'count', array_length(inserted_ids, 1)
  );
END;
$function$
;

REVOKE EXECUTE ON FUNCTION public.insert_tutor_messages(uuid, uuid, jsonb) FROM PUBLIC, anon;

-- -----------------------------------------------------------------------------
-- vérif. update_tutor_conversation_stats : p_user_id doit être l'appelant
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_tutor_conversation_stats(p_conversation_id uuid, p_user_id uuid, p_message_count integer, p_max_help_level integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Garde (lot 3, Q143) : on n'agit que sur SON compte. auth.uid() NULL =
  -- appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  -- Security check: Verify user owns the conversation
  IF NOT EXISTS (
    SELECT 1 FROM tutor_conversations
    WHERE id = p_conversation_id
    AND student_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: user does not own this conversation'
      USING ERRCODE = '42501';
  END IF;

  -- Update the conversation
  UPDATE tutor_conversations
  SET
    message_count = p_message_count,
    max_help_level_reached = GREATEST(max_help_level_reached, p_max_help_level)
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object('success', true);
END;
$function$
;

REVOKE EXECUTE ON FUNCTION public.update_tutor_conversation_stats(uuid, uuid, integer, integer) FROM PUBLIC, anon;

-- -----------------------------------------------------------------------------
-- F12 / Q141 : récompenses réservées au serveur (client service)
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.upsert_2048_score(uuid, integer, boolean, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_buddy_xp(uuid, integer, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_achievement_event(text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_achievement_progress(uuid, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_2048_score(uuid, integer, boolean, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_buddy_xp(uuid, integer, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_achievement_event(text, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_achievement_progress(uuid, text, numeric, text) TO service_role;

-- =============================================================================
-- ROLLBACK (intégral) — à exécuter tel quel, dans une transaction :
-- =============================================================================
-- BEGIN;
-- GRANT EXECUTE ON FUNCTION public.upsert_2048_score(uuid, integer, boolean, boolean) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.add_buddy_xp(uuid, integer, boolean) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.process_achievement_event(text, uuid, jsonb) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.update_achievement_progress(uuid, text, numeric, text) TO authenticated;
--
-- -- Corps d'origine (prod) des fonctions gardées ; leurs droits n'ont pas bougé
-- -- (les REVOKE PUBLIC/anon ci-dessus retiraient des droits qu'elles n'avaient pas).
--
-- CREATE OR REPLACE FUNCTION public.update_message_status(p_message_id uuid, p_user_id uuid, p_status text)
--  RETURNS void
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- BEGIN
--   IF p_status NOT IN ('inbox', 'archived', 'trash') THEN
--     RAISE EXCEPTION 'Invalid status. Must be inbox, archived, or trash';
--   END IF;
--
--   UPDATE message_inbox
--   SET status = p_status
--   WHERE message_id = p_message_id
--     AND recipient_id = p_user_id;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.move_message_to_folder(p_message_id uuid, p_user_id uuid, p_folder_id uuid)
--  RETURNS void
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- BEGIN
--   -- Verify folder belongs to user
--   IF NOT EXISTS (
--     SELECT 1 FROM user_folders
--     WHERE id = p_folder_id AND user_id = p_user_id
--   ) THEN
--     RAISE EXCEPTION 'Folder not found or does not belong to you';
--   END IF;
--
--   UPDATE message_inbox
--   SET folder_id = p_folder_id
--   WHERE message_id = p_message_id
--     AND recipient_id = p_user_id;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.toggle_message_star(p_message_id uuid, p_user_id uuid)
--  RETURNS boolean
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   v_new_value BOOLEAN;
-- BEGIN
--   UPDATE message_inbox
--   SET is_starred = NOT is_starred
--   WHERE message_id = p_message_id
--     AND recipient_id = p_user_id
--   RETURNING is_starred INTO v_new_value;
--
--   RETURN v_new_value;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.mark_message_as_read(p_message_id uuid, p_user_id uuid)
--  RETURNS void
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- BEGIN
--   UPDATE message_inbox
--   SET read_at = NOW()
--   WHERE message_id = p_message_id
--     AND recipient_id = p_user_id
--     AND read_at IS NULL; -- Only update if not already read
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid, p_user_id uuid, p_message_id uuid DEFAULT NULL::uuid)
--  RETURNS void
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- BEGIN
--   -- Update last_read_at and optionally last_read_message_id
--   UPDATE conversation_participants
--   SET
--     last_read_at = NOW(),
--     last_read_message_id = COALESCE(p_message_id, last_read_message_id)
--   WHERE conversation_id = p_conversation_id
--   AND user_id = p_user_id;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.create_1on1_chat(p_user1_id uuid, p_user2_id uuid)
--  RETURNS uuid
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   v_conversation_id UUID;
--   v_are_friends BOOLEAN;
-- BEGIN
--   -- Check if users are friends
--   SELECT EXISTS (
--     SELECT 1 FROM friendships
--     WHERE (
--       (requester_id = p_user1_id AND addressee_id = p_user2_id)
--       OR (requester_id = p_user2_id AND addressee_id = p_user1_id)
--     )
--     AND status = 'accepted'
--   ) INTO v_are_friends;
--
--   IF NOT v_are_friends THEN
--     RAISE EXCEPTION 'Users must be friends to create a 1-on-1 chat';
--   END IF;
--
--   -- Check if conversation already exists between these two users
--   SELECT c.id INTO v_conversation_id
--   FROM conversations c
--   WHERE c.is_group = false
--   AND EXISTS (
--     SELECT 1 FROM conversation_participants cp1
--     WHERE cp1.conversation_id = c.id
--     AND cp1.user_id = p_user1_id
--   )
--   AND EXISTS (
--     SELECT 1 FROM conversation_participants cp2
--     WHERE cp2.conversation_id = c.id
--     AND cp2.user_id = p_user2_id
--   )
--   LIMIT 1;
--
--   -- If conversation exists, return it
--   IF v_conversation_id IS NOT NULL THEN
--     RETURN v_conversation_id;
--   END IF;
--
--   -- Create new conversation
--   INSERT INTO conversations (is_group, created_at)
--   VALUES (false, NOW())
--   RETURNING id INTO v_conversation_id;
--
--   -- Add both participants
--   INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
--   VALUES
--     (v_conversation_id, p_user1_id, NOW()),
--     (v_conversation_id, p_user2_id, NOW());
--
--   RETURN v_conversation_id;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.upsert_user_presence(p_user_id uuid, p_status text)
--  RETURNS void
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
-- BEGIN
--   INSERT INTO user_presence (user_id, status, last_heartbeat, updated_at)
--   VALUES (p_user_id, p_status, now(), now())
--   ON CONFLICT (user_id)
--   DO UPDATE SET
--     status = EXCLUDED.status,
--     last_heartbeat = EXCLUDED.last_heartbeat,
--     updated_at = EXCLUDED.updated_at;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.insert_tutor_messages(p_conversation_id uuid, p_user_id uuid, p_messages jsonb)
--  RETURNS jsonb
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   msg JSONB;
--   inserted_ids UUID[] := '{}';
--   new_id UUID;
-- BEGIN
--   -- Security check: Verify user owns the conversation and it's active
--   IF NOT EXISTS (
--     SELECT 1 FROM tutor_conversations
--     WHERE id = p_conversation_id
--     AND student_id = p_user_id
--     AND is_active = true
--   ) THEN
--     RAISE EXCEPTION 'Unauthorized: user does not own this conversation or conversation is not active'
--       USING ERRCODE = '42501'; -- insufficient_privilege
--   END IF;
--
--   -- Insert each message from the JSONB array
--   FOR msg IN SELECT * FROM jsonb_array_elements(p_messages)
--   LOOP
--     INSERT INTO tutor_messages (
--       conversation_id,
--       role,
--       content,
--       help_level,
--       help_method_used,
--       cheat_detected
--     ) VALUES (
--       p_conversation_id,
--       msg->>'role',
--       msg->>'content',
--       (msg->>'help_level')::INTEGER,
--       msg->>'help_method_used',
--       COALESCE((msg->>'cheat_detected')::BOOLEAN, false)
--     )
--     RETURNING id INTO new_id;
--
--     inserted_ids := array_append(inserted_ids, new_id);
--   END LOOP;
--
--   -- Return the inserted message IDs
--   RETURN jsonb_build_object(
--     'success', true,
--     'inserted_ids', to_jsonb(inserted_ids),
--     'count', array_length(inserted_ids, 1)
--   );
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.update_tutor_conversation_stats(p_conversation_id uuid, p_user_id uuid, p_message_count integer, p_max_help_level integer)
--  RETURNS jsonb
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- BEGIN
--   -- Security check: Verify user owns the conversation
--   IF NOT EXISTS (
--     SELECT 1 FROM tutor_conversations
--     WHERE id = p_conversation_id
--     AND student_id = p_user_id
--   ) THEN
--     RAISE EXCEPTION 'Unauthorized: user does not own this conversation'
--       USING ERRCODE = '42501';
--   END IF;
--
--   -- Update the conversation
--   UPDATE tutor_conversations
--   SET
--     message_count = p_message_count,
--     max_help_level_reached = GREATEST(max_help_level_reached, p_max_help_level)
--   WHERE id = p_conversation_id;
--
--   RETURN jsonb_build_object('success', true);
-- END;
-- $function$
-- ;
-- COMMIT;
