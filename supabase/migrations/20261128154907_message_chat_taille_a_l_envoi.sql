-- ============================================================================
-- Chat : un message trop lourd ne part pas, même par l'API de la base (écart L124)
-- ============================================================================
-- Constat de code-reviewer sur #3115 : le site borne un message (10 000
-- caractères de texte, 100 000 de JSON, src/lib/server/validation/messages.ts),
-- mais la policy INSERT de `messages` ne borne rien. Par l'API de la base, un
-- compte connecté pouvait envoyer un message de plusieurs mégaoctets, qui
-- ralentissait le marquage (`process_message_content`) à l'envoi.
--
-- Accès (tranché par David le 2026-11-28) : personne ne lit ni n'écrit rien de
-- plus. Seul effet : un message de plus de 200 000 caractères (JSON écrit par la
-- base, plus long que celui du navigateur : espaces après `:` et `,`) envoyé par
-- un compte connecté est refusé. Le site n'en envoie jamais.
--
-- Pourquoi un trigger BEFORE INSERT et pas une contrainte CHECK : la prod garde
-- trois messages de janvier 2026 plus lourds (jusqu'à 299 000 caractères, images
-- rangées dans le message avant le stockage des pièces jointes). Une CHECK se
-- revérifie à chaque UPDATE : leur suppression (`deleted_at`) serait refusée. Un
-- message envoyé ne se réécrit plus (`guard_message_reecriture`), la borne à
-- l'envoi suffit.
--
-- Ordre des triggers BEFORE INSERT (alphabétique) : `guard_message_envoi_trg`,
-- `guard_message_taille_trg`, `guard_read_only_author_trg`,
-- `trigger_process_message_content` : le refus passe avant le marquage.
-- Message d'erreur sans accent : PostgREST rend un 500 sans code pour un message accentue.
--
-- Aucune policy touchée, aucune donnée modifiée. Prouvée par
-- tests/integration/messages-taille-a-l-envoi.test.ts (rouge sans elle).
--
-- Rollback :
--   DROP TRIGGER IF EXISTS guard_message_taille_trg ON public.messages;
--   DROP FUNCTION IF EXISTS public.guard_message_taille();
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_message_taille() RETURNS trigger
	LANGUAGE plpgsql
	SET search_path TO 'public', 'pg_temp'
	AS $$
BEGIN
	-- Serveur (service_role, tâche système) : rien à garder.
	IF auth.uid() IS NULL THEN
		RETURN NEW;
	END IF;

	IF length(NEW.content::text) > 200000 THEN
		RAISE EXCEPTION 'message trop long (200000 caracteres au plus)'
			USING ERRCODE = '22001';
	END IF;

	RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_message_taille() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER guard_message_taille_trg
	BEFORE INSERT ON public.messages
	FOR EACH ROW
	EXECUTE FUNCTION public.guard_message_taille();
