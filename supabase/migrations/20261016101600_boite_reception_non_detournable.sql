-- Boîte de réception : le destinataire ne change que ses marques.
--
-- La policy UPDATE « Users can update their inbox entries » de `message_inbox` n'a pas
-- de liste de colonnes. Un élève pouvait remplacer `message_id` de sa propre ligne par
-- l'identifiant du message privé d'un autre élève ; la policy SELECT de
-- `private_messages` (« Users can view their sent or received messages ») passe par
-- `message_inbox` et lui en ouvrait la lecture. Trouvé par security-auditor le
-- 2026-10-13 ; en prod, 4 lignes, aucune trace de détournement.
--
-- Décision de David (2026-10-13) : le destinataire ne change que ses marques — lu
-- (`read_at`), étoile (`is_starred`), statut (`status`), dossier (`folder_id`),
-- supprimé (`deleted`). Plus `message_id`, `recipient_id`, `received_at` ni `id`.
-- L'application n'écrit que `read_at` et `deleted` en direct : ce sont les seules
-- colonnes que les rôles de l'API peuvent encore modifier. Statut, dossier et étoile
-- restent possibles par les fonctions SECURITY DEFINER (`update_message_status`,
-- `move_message_to_folder`, `toggle_message_star`), non touchées, qui vérifient le
-- propriétaire du dossier. En direct, `folder_id` laissait viser le dossier d'un autre
-- (son compteur `message_count` montait) : security-auditor, 2026-10-13.
--
-- Additive : aucune donnée touchée, seuls des droits changent.
-- Test : tests/integration/boite-reception-non-detournable.test.ts
--
-- Rollback :
--   GRANT UPDATE ON public.message_inbox TO anon, authenticated;

REVOKE UPDATE ON public.message_inbox FROM anon, authenticated;
GRANT UPDATE (read_at, deleted) ON public.message_inbox TO authenticated;
