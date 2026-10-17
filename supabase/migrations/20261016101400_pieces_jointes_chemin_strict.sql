-- Pièces jointes de la messagerie : chemin enregistré de la forme exacte du serveur
-- ===============================================================================
--
-- Audit de #1256 (2026-10-13) : la policy d'insertion de message_attachments_v2 ne refusait
-- que le motif littéral « /../ ». Un chemin portant %2e%2e ou une barre oblique inverse
-- passait ; signé par le client service, il sortait du message, voire du bucket (storage-js
-- place le chemin tel quel dans l'URL, que Node normalise). Le serveur ne signe plus qu'un
-- chemin de la forme qu'il produit (src/lib/utils/message-attachment-rules.ts,
-- isServerAttachmentPath) ; la policy exige désormais la même forme :
--   messages/<message>/<uuid>-<nom en [A-Za-z0-9._-], 1 à 200 caractères>
--
-- Accès : aucun gagné ; l'expéditeur ne peut plus enregistrer un chemin d'une autre forme.
-- Prod : 0 ligne dans message_attachments_v2 (aucune donnée concernée).
--
-- Tests : tests/integration/messagerie-pieces-jointes.test.ts,
--         tests/integration/messagerie-pieces-jointes-liens.test.ts
--
-- Rollback : recréer la policy telle que dans 20261016101300_messagerie_pieces_jointes.sql.

drop policy "Users can upload attachments to their messages" on public.message_attachments_v2;

create policy "Users can upload attachments to their messages"
	on public.message_attachments_v2
	for insert
	to authenticated
	with check (
		(select auth.uid()) = uploaded_by
		and exists (
			select 1 from public.private_messages pm
			where pm.id = message_attachments_v2.message_id
			  and pm.sender_id = (select auth.uid())
		)
		and storage_path ~ (
			'^messages/' || message_id::text
			|| '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[A-Za-z0-9._-]{1,200}$'
		)
	);
