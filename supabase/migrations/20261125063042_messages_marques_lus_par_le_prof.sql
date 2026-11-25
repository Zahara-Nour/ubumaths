-- =============================================================================
-- Écart T21 — le prof lit les messages MARQUÉS des conversations à deux entre
-- élèves, et les messages marqués supprimés
-- =============================================================================
-- Avant : l'onglet « Messages marqués » de la modération lisait `messages` avec
-- le client du prof. La RLS ne lui rend aucun message d'une conversation à deux
-- entre élèves (la policy SELECT lit `conversation_participants` sous ses
-- droits, où il ne voit que ses propres conversations) ni aucun message supprimé
-- (`deleted_at IS NULL`). En prod, tous les messages du chat sont dans des
-- conversations à deux entre élèves : l'onglet ne pouvait rien montrer.
--
-- Après : une fonction réservée au prof rend les messages marqués, et eux seuls.
--
-- Accès (tranché par David le 2026-11-25) — qui lit quoi, qu'il ne lisait pas :
--   • le PROF lit, pour un message marqué automatiquement (`is_flagged`) d'une
--     conversation à deux entre deux élèves : son texte, sa date, la raison de
--     la marque et le nom de son auteur. Élèves hors-classe compris. Il ne lit
--     NI les messages non marqués de la conversation, NI le nom de l'autre élève ;
--   • le PROF lit aussi le texte des messages marqués SUPPRIMÉS (la suppression
--     ne fait que dater le message), dans ces conversations et dans celles qu'il
--     lisait déjà (les siennes et les chats de groupe) ;
--   • rien ne change pour l'admin ni pour les élèves : la fonction les refuse,
--     et aucune policy n'est touchée (la lecture directe de `messages` reste ce
--     qu'elle était).
--
-- Une conversation à deux où l'un des participants n'est pas un élève (admin et
-- élève, par exemple) n'est pas ouverte au prof.
--
-- `deleted_by_moderation` : vrai quand une suppression par le prof ou l'admin est
-- tracée dans `moderation_logs`. Faux ne prouve PAS que l'auteur a supprimé :
-- `review_report` et `soft_delete_message` suppriment sans trace, et `messages`
-- n'a pas de colonne `deleted_by`. L'onglet écrit donc « supprimé par la
-- modération » ou « supprimé » seul.
--
-- Message d'erreur sans accent : PostgREST rend un 500 sans code sur un message
-- accentué, et le code lit `error.code`.
--
-- Test : tests/integration/messages-marques-prof.test.ts (rouge sans cette
-- migration).
--
-- ROLLBACK (additive : rien d'autre à défaire) :
--   DROP FUNCTION IF EXISTS public.get_flagged_messages_for_teacher(integer);
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_flagged_messages_for_teacher(p_limit integer DEFAULT 100)
RETURNS TABLE (
	id uuid,
	conversation_id uuid,
	plain_text text,
	flag_reason text,
	created_at timestamptz,
	deleted_at timestamptz,
	deleted_by_moderation boolean,
	sender_firstname text,
	sender_lastname text,
	conversation_name text,
	is_group boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
	v_uid uuid := auth.uid();
BEGIN
	-- Garde d'appelant : le prof seulement (ni élève, ni admin, ni service).
	IF v_uid IS NULL OR NOT EXISTS (
		SELECT 1 FROM profiles p WHERE p.id = v_uid AND p.role = 'teacher'
	) THEN
		RAISE EXCEPTION 'Acces refuse : reserve au professeur' USING ERRCODE = '42501';
	END IF;

	RETURN QUERY
	SELECT
		m.id,
		m.conversation_id,
		m.plain_text,
		m.flag_reason,
		m.created_at,
		m.deleted_at,
		(m.deleted_at IS NOT NULL AND EXISTS (
			SELECT 1 FROM moderation_logs ml
			WHERE ml.action = 'delete_message'
			  AND ml.target_type = 'message'
			  AND ml.target_id = m.id
		)) AS deleted_by_moderation,
		s.firstname::text,
		s.lastname::text,
		c.name::text,
		c.is_group
	FROM messages m
	JOIN conversations c ON c.id = m.conversation_id
	LEFT JOIN profiles s ON s.id = m.sender_id
	WHERE m.is_flagged IS TRUE
	  AND (
		-- Ce que le prof lisait déjà : ses conversations et les chats de groupe.
		EXISTS (
			SELECT 1 FROM conversation_participants cp
			WHERE cp.conversation_id = m.conversation_id AND cp.user_id = v_uid
		)
		OR c.is_group IS TRUE
		-- Nouveau : conversation à deux dont les deux participants sont des élèves.
		OR (
			c.is_group IS FALSE
			AND (
				SELECT count(*) FROM conversation_participants cp
				WHERE cp.conversation_id = m.conversation_id
			) = 2
			AND NOT EXISTS (
				SELECT 1
				FROM conversation_participants cp
				LEFT JOIN profiles pp ON pp.id = cp.user_id
				WHERE cp.conversation_id = m.conversation_id
				  AND pp.role IS DISTINCT FROM 'student'
			)
		)
	  )
	ORDER BY m.created_at DESC, m.id DESC
	LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);
END;
$$;

COMMENT ON FUNCTION public.get_flagged_messages_for_teacher(integer) IS
	'Onglet « Messages marqués » du prof (écart T21) : messages marqués automatiquement, supprimés compris, des conversations du prof, des chats de groupe et des conversations à deux entre élèves. Réservée au prof (garde sur le rôle de auth.uid()).';

REVOKE ALL ON FUNCTION public.get_flagged_messages_for_teacher(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_flagged_messages_for_teacher(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_flagged_messages_for_teacher(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_flagged_messages_for_teacher(integer) TO service_role;
