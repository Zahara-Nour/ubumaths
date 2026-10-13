-- Messages privés : un message envoyé ne se réécrit plus.
--
-- La policy UPDATE « Senders can edit their messages » n'a pas de liste de colonnes :
-- l'expéditeur pouvait réécrire le sujet, le texte ou le fil d'un message déjà lu par
-- son destinataire. Décision de David (2026-10-13) : personne ne modifie un message
-- envoyé. L'application n'écrit qu'une colonne, `deleted_by_sender` (« retirer de mes
-- envoyés », DELETE /api/messages/[id]) : c'est la seule que les rôles de l'API
-- peuvent encore modifier.
--
-- Non touchés : la policy (elle reste le filtre « mes messages ») ; `service_role` ;
-- `send_private_message`, SECURITY DEFINER, qui écrit `thread_root_id` avec les droits
-- de son propriétaire ; la garde de lecture seule (`guard_read_only_actor`).
--
-- Additive : aucune donnée touchée, seuls des droits changent.
-- Test : tests/integration/messages-prives-non-modifiables.test.ts
--
-- Rollback :
--   GRANT UPDATE ON public.private_messages TO anon, authenticated;

REVOKE UPDATE ON public.private_messages FROM anon, authenticated;
GRANT UPDATE (deleted_by_sender) ON public.private_messages TO authenticated;
