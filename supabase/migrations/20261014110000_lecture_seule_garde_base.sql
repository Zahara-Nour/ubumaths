-- ============================================================================
-- RGPD art. 8 — le mode lecture seule est gardé par la base (constat A2)
-- ============================================================================
--
-- Un élève en lecture seule (consentement parental requis, ni accordé ni en période
-- de grâce) était arrêté par requireConsent dans CERTAINES routes seulement. La base
-- le laissait écrire directement (prouvé par tests/integration/lecture-seule-garde-base) :
-- insert du chat dans messages, messages privés, annonces et échanges du marché,
-- parties de démineur, file et match multijoueur (fonction SECURITY DEFINER).
--
-- Décision de David (2026-10-10) : un trigger BEFORE INSERT par table, qui regarde
-- l'AUTEUR de la ligne. Un trigger s'exécute aussi sous une fonction SECURITY DEFINER
-- et sous service_role : il ferme la route, l'appel direct et les RPC d'un coup.
-- Question d'accès en miroir — qui ne pourra plus écrire ce qu'il écrivait ? Les
-- élèves en lecture seule seulement (11 en prod le 2026-10-10, tous archivés). Le prof
-- qui écrit à un tel élève n'est pas gêné : seul l'auteur est regardé — sauf pour un
-- échange du marché, où le PARTENAIRE l'est aussi (un ami ne fait pas échanger un
-- élève en lecture seule).
--
-- Hors périmètre, volontairement : les récompenses (décision du 2026-10-10 : seules
-- les tâches automatiques sauteront ces élèves, filtrées dans la tâche elle-même,
-- cf. E19 — un trigger ferait échouer le versement de toute la classe).
--
-- Additive : deux fonctions, des triggers ; aucune donnée touchée.
--
-- ROLLBACK :
--   DROP TRIGGER guard_read_only_author_trg ON public.messages;  (et les 10 autres
--   tables ci-dessous, même nom de trigger)
--   DROP FUNCTION public.guard_read_only_author();
--   DROP FUNCTION public.has_full_access(uuid);
-- ============================================================================

-- Copie exacte de hasValidConsent (src/lib/utils/consent.ts) : accès complet si le
-- compte n'est pas élève, n'est pas soumis, a le consentement, ou est en période de
-- grâce. Un compte inconnu n'est pas bloqué ici (la clé étrangère le refusera).
CREATE OR REPLACE FUNCTION public.has_full_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
	SELECT coalesce((
		SELECT p.role IS DISTINCT FROM 'student'::user_role
			OR NOT coalesce(p.consent_required, false)
			OR p.consent_granted_at IS NOT NULL
			OR (p.consent_grace_period_ends IS NOT NULL AND p.consent_grace_period_ends > now())
		FROM profiles p
		WHERE p.id = p_user_id
	), true);
$$;

COMMENT ON FUNCTION public.has_full_access(uuid) IS
	'Copie de hasValidConsent : false pour un élève en lecture seule (consentement requis, '
	'ni accordé ni en grâce). Non exposée (révélerait le statut de consentement d''autrui).';

REVOKE EXECUTE ON FUNCTION public.has_full_access(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_full_access(uuid) TO service_role;

-- Trigger générique : TG_ARGV = les colonnes « auteur » de la table. Une valeur NULL
-- (partie de démineur anonyme) n'est pas un auteur.
CREATE OR REPLACE FUNCTION public.guard_read_only_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
	v_row jsonb := to_jsonb(NEW);
	v_col text;
	v_author uuid;
BEGIN
	FOREACH v_col IN ARRAY TG_ARGV LOOP
		v_author := (v_row ->> v_col)::uuid;
		IF v_author IS NOT NULL AND NOT public.has_full_access(v_author) THEN
			RAISE EXCEPTION 'Consentement parental requis : compte en lecture seule (%.%)',
				TG_TABLE_NAME, v_col
				USING ERRCODE = '42501';
		END IF;
	END LOOP;
	RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_read_only_author() FROM PUBLIC, anon, authenticated;

-- Messages
CREATE TRIGGER guard_read_only_author_trg BEFORE INSERT ON public.messages
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_author('sender_id');
CREATE TRIGGER guard_read_only_author_trg BEFORE INSERT ON public.private_messages
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_author('sender_id');
CREATE TRIGGER guard_read_only_author_trg BEFORE INSERT ON public.marketplace_chat_messages
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_author('sender_id');

-- Marché
CREATE TRIGGER guard_read_only_author_trg BEFORE INSERT ON public.marketplace_listings
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_author('creator_id');
CREATE TRIGGER guard_read_only_author_trg BEFORE INSERT ON public.marketplace_proposals
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_author('proposer_id');
CREATE TRIGGER guard_read_only_author_trg BEFORE INSERT ON public.marketplace_trade_offers
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_author('offered_by');
CREATE TRIGGER guard_read_only_author_trg BEFORE INSERT ON public.marketplace_trades
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_author('initiator_id', 'partner_id');

-- Démineur (solo, multijoueur — un match crée une ligne d'état par joueur —, tournois)
CREATE TRIGGER guard_read_only_author_trg BEFORE INSERT ON public.minesweeper_games
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_author('student_id');
CREATE TRIGGER guard_read_only_author_trg BEFORE INSERT ON public.minesweeper_multiplayer_queue
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_author('student_id');
CREATE TRIGGER guard_read_only_author_trg BEFORE INSERT ON public.minesweeper_multiplayer_game_state
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_author('player_id');
CREATE TRIGGER guard_read_only_author_trg BEFORE INSERT ON public.minesweeper_tournament_games
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_author('student_id');
