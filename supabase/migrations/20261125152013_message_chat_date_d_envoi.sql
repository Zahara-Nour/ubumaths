-- ============================================================================
-- Chat : un compte connecté ne choisit pas la date de son message (écart T30)
-- ============================================================================
-- Constat du security-auditor sur la garde de réécriture (2026-11-25) : la garde
-- `guard_message_reecriture` ferme l'antidatage APRÈS l'envoi, mais la policy
-- INSERT de `messages` ne contrôle aucune date. Par l'API de la base, un élève
-- pouvait donc envoyer un message :
--   - daté d'il y a quatre ans : il passait derrière la limite de l'onglet
--     « Messages marqués » du prof, et la purge de conservation (3 ans)
--     l'effaçait à son prochain passage ;
--   - daté de 2099 : il restait en tête de l'onglet du prof et de la
--     conversation pour toujours ;
--   - déjà « modifié » (`edited_at`) ou déjà « supprimé » (`deleted_at`).
-- Existe depuis le schéma d'origine.
--
-- Accès : personne ne lit ni n'écrit rien de plus. Un compte connecté (élève,
-- prof, admin) perd le choix de trois dates qu'aucun écran ne lui proposait :
-- l'application n'envoie que `id`, `conversation_id`, `sender_id`, `content`,
-- `plain_text` (src/lib/stores/chat.svelte.ts, seul `insert` sur `messages`).
-- Le serveur (service_role, tâche système : pas d'utilisateur connecté) garde
-- la main.
--
-- Règle : à l'INSERT par un compte connecté, les trois dates sont FORCÉES, sans
-- erreur (le message part) : `created_at` = maintenant, `edited_at` et
-- `deleted_at` vides. `is_flagged` et `flag_reason` sont déjà réglés par
-- `process_message_content`.
--
-- Ordre des triggers BEFORE INSERT (alphabétique) : `guard_message_envoi_trg`,
-- `guard_read_only_author_trg`, `trigger_process_message_content`. Aucun des deux
-- autres ne lit ces dates ; `update_conversation_last_message` (AFTER INSERT) lit
-- donc la date forcée.
--
-- Aucune policy touchée, aucune donnée modifiée. Prouvée par
-- tests/integration/messages-chat-non-reecrits.test.ts § « à l'envoi » (rouge
-- sans elle).
--
-- Rollback :
--   DROP TRIGGER IF EXISTS guard_message_envoi_trg ON public.messages;
--   DROP FUNCTION IF EXISTS public.guard_message_envoi();
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_message_envoi() RETURNS trigger
	LANGUAGE plpgsql
	SET search_path TO 'public', 'pg_temp'
	AS $$
BEGIN
	-- Serveur (service_role, tâche système) : rien à garder.
	IF auth.uid() IS NULL THEN
		RETURN NEW;
	END IF;

	NEW.created_at := now();
	NEW.edited_at := NULL;
	NEW.deleted_at := NULL;

	RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_message_envoi() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER guard_message_envoi_trg
	BEFORE INSERT ON public.messages
	FOR EACH ROW
	EXECUTE FUNCTION public.guard_message_envoi();
