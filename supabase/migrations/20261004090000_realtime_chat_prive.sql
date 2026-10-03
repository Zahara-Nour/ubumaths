-- =============================================================================
-- Chat : canal temps réel PRIVÉ réservé aux participants (S3, PR 1)
-- =============================================================================
--
-- ROLLBACK (à exécuter tel quel ; ne touche que ce que cette migration crée) :
--   DROP POLICY IF EXISTS "chat_realtime_participants_receive" ON realtime.messages;
--   DROP POLICY IF EXISTS "chat_realtime_participants_send" ON realtime.messages;
--
-- Décision de David (question d'accès tranchée le 2026-10-03) :
--   « Seuls les participants d'une conversation peuvent écouter et diffuser sur
--   son canal temps réel ; l'expéditeur affiché est celui enregistré en base.
--   Quelqu'un qui pouvait écouter ou diffuser dans une conversation dont il
--   n'est pas membre ne le pourra plus. »
--
-- Qui gagne quel accès : un PARTICIPANT d'une conversation (ligne dans
-- conversation_participants) peut recevoir et diffuser des broadcasts sur le
-- canal PRIVÉ `chat-<conversation_id>`. Rien d'autre : ni présence, ni autre
-- topic, ni anon, ni prof/admin non participant.
--
-- Qui perd : personne AUJOURD'HUI. Les policies de realtime.messages ne
-- s'appliquent qu'aux canaux privés (`config: { private: true }`) ; aucun canal
-- de l'application n'est privé à ce jour (inventaire :
-- docs/wip/realtime-chat-prive-progress.md). Sans policy, la RLS (activée sur
-- realtime.messages) refuse tout canal privé : cette migration est donc
-- purement additive. La fermeture effective du canal public viendra avec la
-- PR 2 (client en `private: true`), APRÈS application de cette migration en
-- production — sinon le temps réel du chat serait coupé.
--
-- Conception :
--   - Le topic est lu par realtime.topic() (posé par le serveur Realtime à la
--     vérification d'accès), forme exacte `chat-<uuid en minuscules>` (le client
--     construit `chat-${conversationId}` avec l'id rendu par la base).
--   - Comparaison TEXTE ('chat-' || conversation_id::text = topic) plutôt
--     qu'un cast ::uuid du topic : un topic mal formé (pas un uuid, majuscules,
--     suffixe, NULL) ne correspond à aucune ligne → refus, jamais d'erreur 22P02.
--   - Pas de fonction SECURITY DEFINER : la sous-requête s'exécute avec les
--     droits de l'appelant (authenticated) ; elle ne cherche que SA propre ligne
--     de participant (user_id = auth.uid()), que la policy
--     conversation_participants."Users can view conversation participants"
--     lui laisse voir (user_id = auth.uid()). Rien à ajouter au garde-fou
--     SECURITY DEFINER.
--   - (select …) autour de auth.uid() et realtime.topic() : évalués une fois
--     (initPlan), pas par ligne.
--   - Index utilisé : idx_participants_user (user_id, joined_at DESC).
--
-- Tests : tests/integration/realtime-chat-prive.test.ts (bout en bout contre
-- le serveur Realtime local + niveau SQL).
-- =============================================================================

-- Recevoir (s'abonner au canal privé et y lire les broadcasts).
CREATE POLICY "chat_realtime_participants_receive"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
	realtime.messages.extension = 'broadcast'
	AND EXISTS (
		SELECT 1
		FROM public.conversation_participants cp
		WHERE cp.user_id = (SELECT auth.uid())
			AND 'chat-' || cp.conversation_id::text = (SELECT realtime.topic())
	)
);

COMMENT ON POLICY "chat_realtime_participants_receive" ON realtime.messages IS
	'Chat (S3) : seuls les participants reçoivent les broadcasts du canal privé chat-<conversation_id>.';

-- Diffuser sur le canal privé.
CREATE POLICY "chat_realtime_participants_send"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
	realtime.messages.extension = 'broadcast'
	AND EXISTS (
		SELECT 1
		FROM public.conversation_participants cp
		WHERE cp.user_id = (SELECT auth.uid())
			AND 'chat-' || cp.conversation_id::text = (SELECT realtime.topic())
	)
);

COMMENT ON POLICY "chat_realtime_participants_send" ON realtime.messages IS
	'Chat (S3) : seuls les participants diffusent sur le canal privé chat-<conversation_id>.';
