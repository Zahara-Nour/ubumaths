-- =============================================================================
-- Échanges de cartes : canal temps réel PRIVÉ réservé aux deux élèves (PR 1)
-- =============================================================================
--
-- ROLLBACK (à exécuter tel quel ; ne touche que ce que cette migration crée) :
--   DROP POLICY IF EXISTS "trade_realtime_participants_receive" ON realtime.messages;
--   DROP POLICY IF EXISTS "trade_realtime_participants_send" ON realtime.messages;
--   ⚠️ Sans risque tant que le client utilise le canal PUBLIC. APRÈS la PR 2
--   (client en `private: true`), ce rollback COUPE le temps réel des échanges :
--   sans policy, tout canal privé est refusé. Revenir d'abord au client public.
--
-- LIMITE CONNUE : Realtime ne vérifie la policy qu'à la jonction du canal et au
-- rafraîchissement du JWT. Un canal déjà ouvert le reste jusqu'à la reconnexion
-- ou au rafraîchissement du jeton (~1 h). ⚠️ initiator_id / partner_id ne sont
-- PAS figés : la policy marketplace_trades_update_participants exige seulement
-- que l'appelant reste initiateur ou partenaire APRÈS l'UPDATE, et aucun
-- trigger ni droit par colonne ne protège ces deux colonnes. Un élève A peut
-- donc poser partner_id = O, laisser O rejoindre le canal, puis remettre B :
-- O reste abonné (reçoit et diffuse) jusqu'au rafraîchissement de son JWT.
-- Correctif de fond à décider dans une PR séparée (trigger ou
-- REVOKE UPDATE (initiator_id, partner_id)). Idem si la ligne est supprimée.
--
-- La policy INSERT n'inspecte PAS le payload : chacun des deux élèves peut
-- diffuser un `from` / `senderId` forgé. Le client (PR 2) ne doit pas croire le
-- payload pour ce qui compte (l'échange final est validé en base).
--
-- Décision de David (question d'accès tranchée le 2026-10-04) :
--   « Seuls les deux élèves de l'échange peuvent écouter et écrire sur son canal
--   temps réel. Ni le prof, ni l'admin, ni les autres élèves. Quelqu'un qui
--   pouvait écouter ou diffuser sur l'échange d'un autre ne le pourra plus. »
--
-- Qui gagne quel accès : l'INITIATEUR et le PARTENAIRE d'un échange
-- (marketplace_trades.initiator_id / partner_id) peuvent recevoir et diffuser
-- des broadcasts sur le canal PRIVÉ `trade:<trade_id>`. Rien d'autre : ni
-- présence, ni autre topic, ni anon, ni prof/admin (qui LISENT pourtant la
-- ligne de l'échange via marketplace_trades_select_teacher / _admin : la policy
-- exige l'égalité avec auth.uid(), pas la simple visibilité de la ligne).
--
-- Qui perd : personne AUJOURD'HUI. Les policies de realtime.messages ne
-- s'appliquent qu'aux canaux privés ; le client des échanges
-- (src/lib/stores/tradeRealtime.svelte.ts) ouvre encore un canal PUBLIC. La
-- fermeture effective viendra avec la PR 2 (client en `private: true`), APRÈS
-- application de cette migration en production.
--
-- Non-croisement avec le chat : les policies permissives de realtime.messages
-- se combinent en OU. Celles du chat exigent un topic `chat-<uuid>`, celles-ci
-- un topic `trade:<uuid>` : aucun préfixe n'est préfixe de l'autre, un topic ne
-- peut satisfaire les deux. Prouvé par test (conversation et échange de même
-- uuid).
--
-- Conception (même modèle que 20261004090000_realtime_chat_prive.sql) :
--   - Comparaison TEXTE ('trade:' || t.id::text = topic), sans cast ::uuid du
--     topic : un topic mal formé ne correspond à aucune ligne → refus, jamais
--     d'erreur 22P02.
--   - Pas de SECURITY DEFINER : la sous-requête s'exécute avec les droits de
--     l'appelant ; la policy marketplace_trades_select_participants lui laisse
--     voir sa propre ligne d'échange.
--   - (select …) autour de auth.uid() et realtime.topic() : évalués une fois.
--   - Coût : la comparaison texte n'utilise pas l'index de clé primaire ; le
--     filtre initiator_id peut prendre idx_marketplace_trades_participants.
--     Évalué seulement à la jonction du canal et au rafraîchissement du JWT,
--     sur une table de taille modeste : acceptable, à surveiller.
--
-- Tests : tests/integration/realtime-trade-prive.test.ts
-- =============================================================================

-- Recevoir (s'abonner au canal privé et y lire les broadcasts).
CREATE POLICY "trade_realtime_participants_receive"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
	realtime.messages.extension = 'broadcast'
	AND EXISTS (
		SELECT 1
		FROM public.marketplace_trades t
		WHERE 'trade:' || t.id::text = (SELECT realtime.topic())
			AND (
				t.initiator_id = (SELECT auth.uid())
				OR t.partner_id = (SELECT auth.uid())
			)
	)
);

COMMENT ON POLICY "trade_realtime_participants_receive" ON realtime.messages IS
	'Échanges : seuls les deux élèves de l''échange reçoivent les broadcasts du canal privé trade:<trade_id>.';

-- Diffuser sur le canal privé.
CREATE POLICY "trade_realtime_participants_send"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
	realtime.messages.extension = 'broadcast'
	AND EXISTS (
		SELECT 1
		FROM public.marketplace_trades t
		WHERE 'trade:' || t.id::text = (SELECT realtime.topic())
			AND (
				t.initiator_id = (SELECT auth.uid())
				OR t.partner_id = (SELECT auth.uid())
			)
	)
);

COMMENT ON POLICY "trade_realtime_participants_send" ON realtime.messages IS
	'Échanges : seuls les deux élèves de l''échange diffusent sur le canal privé trade:<trade_id>.';
