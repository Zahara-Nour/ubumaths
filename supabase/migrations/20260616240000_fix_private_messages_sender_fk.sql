-- =============================================================================
-- Fix — private_messages.sender_id : FK ON DELETE SET NULL incompatible NOT NULL
-- =============================================================================
-- Bug : private_messages.sender_id est NOT NULL, mais son FK vers profiles(id)
--   est ON DELETE SET NULL. Supprimer un profil EXPÉDITEUR déclenche
--   `SET sender_id = NULL` → viole NOT NULL (SQLSTATE 23502) → la suppression
--   du profil ÉCHOUE. C'est le SEUL FK « SET NULL sur colonne NOT NULL » du schéma
--   (vérifié via pg_constraint sur la prod EU, 2026-06-16).
--
-- Double impact :
--   - PROD / RGPD : un utilisateur ayant envoyé un message privé ne peut pas être
--     supprimé (droit à l'effacement bloqué).
--   - TESTS : casse le nettoyage (un prof-expéditeur ne peut être supprimé →
--     reste → enforce_single_teacher bloque les profs suivants → contamination
--     « un seul professeur autorisé »).
--
-- Correctif : ON DELETE CASCADE — supprimer un profil supprime ses messages privés
--   envoyés (cohérent avec marketplace_chat_messages.sender_id, déjà CASCADE, et
--   approprié pour l'effacement RGPD du contenu personnel). private_messages n'a
--   pas de FK recipient_id (les destinataires passent par message_inbox), donc
--   sender_id est la seule référence à profiles à corriger ici.
--
-- ADDITIVE côté objets (remplace une contrainte par une équivalente cohérente),
-- SAFE TO PUSH. NON poussée automatiquement — David pousse via db:migrate.
-- =============================================================================

ALTER TABLE public.private_messages
	DROP CONSTRAINT IF EXISTS private_messages_sender_id_fkey;

ALTER TABLE public.private_messages
	ADD CONSTRAINT private_messages_sender_id_fkey
	FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
