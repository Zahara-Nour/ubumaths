-- Messagerie : pièces jointes privées (scan du cahier envoyé au prof, etc.)
-- =========================================================================
--
-- Mesuré en prod le 2026-10-13 : le bucket message-attachments n'existait pas ; toute
-- pièce jointe de la messagerie échouait en silence (0 ligne dans message_attachments_v2).
--
-- Décision de David (2026-10-13), question d'accès tranchée :
--   - qui joint : l'expéditeur du message (la messagerie ne relie qu'élève et prof) ;
--   - qui lit : l'expéditeur, les destinataires qui ne l'ont pas supprimé, l'admin ;
--   - bucket PRIVÉ, lien temporaire ; images JPEG/PNG/WebP/HEIC et PDF, 10 Mo, 3 par message ;
--   - conservation : celle du message ; retirés à la suppression du compte (#1243, #1246).
--
-- 1. Bucket privé, SANS policy sur storage.objects : seul le client service y dépose et en
--    tire des liens signés (routes serveur, qui vérifient l'accès avec la RLS de
--    l'utilisateur). Une migration ne peut d'ailleurs pas poser de policy sur
--    storage.objects en prod (table de supabase_storage_admin).
-- 2. message_attachments_v2 : le chemin enregistré doit être rangé sous le message
--    (messages/<message>/…, aucun segment « .. ») — c'est lui que le serveur signe et que
--    la suppression de compte retire.
-- 3. L'admin lit les pièces jointes (il lit déjà tous les messages privés).
--
-- Accès gagné : l'admin lit la ligne des pièces jointes (nom, type, taille, chemin).
-- Accès perdu : un expéditeur ne peut plus enregistrer un chemin rangé hors de son message.
--
-- Tests : tests/integration/messagerie-pieces-jointes.test.ts
--
-- Rollback :
--   drop policy "Admins can view all message attachments" on public.message_attachments_v2;
--   drop policy "Users can upload attachments to their messages" on public.message_attachments_v2;
--   create policy "Users can upload attachments to their messages" on public.message_attachments_v2
--     for insert to public with check ((auth.uid() = uploaded_by) and (exists (select 1
--     from private_messages where private_messages.id = message_attachments_v2.message_id
--     and private_messages.sender_id = auth.uid())));
--   -- bucket vide seulement ; en prod, le déclencheur protect_buckets_delete l'interdit sans :
--   set local storage.allow_delete_query = 'true';
--   delete from storage.buckets where id = 'message-attachments';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'message-attachments',
	'message-attachments',
	false,
	10485760, -- 10 Mo
	array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

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
		and starts_with(storage_path, 'messages/' || message_id::text || '/')
		and ('/' || storage_path || '/') not like '%/../%'
	);

create policy "Admins can view all message attachments"
	on public.message_attachments_v2
	for select
	to authenticated
	using ((select public.is_admin()));
