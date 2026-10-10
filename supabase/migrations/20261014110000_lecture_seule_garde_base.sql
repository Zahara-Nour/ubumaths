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
-- security-auditor (2026-10-10) puis décisions de David, ajoutées ici :
--   - « Retirer oui, agir non » : ce qu'un élève a commencé AVANT la lecture seule, il
--     peut le supprimer ou l'annuler (message supprimé, annonce ou échange annulé,
--     proposition retirée ou refusée), pas le poursuivre (modifier un message, réactiver
--     une annonce, conclure un échange, accepter une proposition, continuer une partie).
--     Garde BEFORE UPDATE qui regarde QUI AGIT (auth.uid()) : un prof qui supprime le
--     message d'un élève, une tâche système (auth.uid() NULL) ne sont pas gênés.
--   - réactions et pièces jointes : gardées à la création, comme les messages ;
--   - matchmaking : un adversaire en lecture seule est ignoré (sinon il bloquait la file) ;
--   - annonces d'un auteur en lecture seule : masquées du marché (filtre de la route, via
--     marketplace_hidden_creators) et aucune nouvelle proposition n'y est acceptée.
--
-- Additive : des fonctions, des triggers ; join_multiplayer_queue redéfinie (une
-- condition ajoutée). Aucune donnée touchée.
--
-- ROLLBACK :
--   DROP TRIGGER guard_read_only_author_trg ON <chaque table ci-dessous>;
--   DROP TRIGGER guard_read_only_actor_trg ON <chaque table ci-dessous>;
--   DROP TRIGGER guard_proposal_listing_open_trg ON public.marketplace_proposals;
--   DROP FUNCTION public.guard_read_only_author(), public.guard_read_only_actor(),
--     public.guard_proposal_listing_open(), public.marketplace_hidden_creators();
--   join_multiplayer_queue : recréer depuis pg_get_functiondef en retirant la ligne
--     « AND public.has_full_access(student_id) » ;
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
		-- Une colonne mal nommée ne doit pas ouvrir la garde en silence.
		IF NOT v_row ? v_col THEN
			RAISE EXCEPTION 'guard_read_only_author: no column % on %', v_col, TG_TABLE_NAME;
		END IF;
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

-- Réactions et pièces jointes
CREATE TRIGGER guard_read_only_author_trg BEFORE INSERT ON public.message_reactions
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_author('user_id');
CREATE TRIGGER guard_read_only_author_trg BEFORE INSERT ON public.message_attachments
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_author('uploaded_by');
CREATE TRIGGER guard_read_only_author_trg BEFORE INSERT ON public.message_attachments_v2
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_author('uploaded_by');

-- ----------------------------------------------------------------------------
-- « Retirer oui, agir non » : garde des MODIFICATIONS, sur qui agit
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_read_only_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
	v_actor uuid := auth.uid();
	v_forbidden boolean;
BEGIN
	-- Tâche système, service_role, ou compte avec accès complet : rien à garder.
	IF v_actor IS NULL OR public.has_full_access(v_actor) THEN
		RETURN NEW;
	END IF;

	-- IF / ELSIF et non CASE : chaque branche ne cite que les colonnes de SA table
	-- (une expression CASE est préparée en entier → 42703 sur les autres tables).
	IF TG_TABLE_NAME = 'messages' THEN
		-- Supprimer (deleted_at) oui ; réécrire non.
		v_forbidden := NEW.content IS DISTINCT FROM OLD.content
			OR NEW.plain_text IS DISTINCT FROM OLD.plain_text;
	ELSIF TG_TABLE_NAME = 'private_messages' THEN
		-- Supprimer (deleted_by_sender) oui ; réécrire non.
		v_forbidden := NEW.content IS DISTINCT FROM OLD.content
			OR NEW.subject IS DISTINCT FROM OLD.subject;
	ELSIF TG_TABLE_NAME = 'marketplace_listings' THEN
		-- Annuler oui ; réactiver, prolonger, changer l'offre non. Les compteurs (vues,
		-- propositions) bougent quand l'élève consulte : laissés libres.
		v_forbidden := (NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled')
			OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
			OR NEW.offered_card_ids IS DISTINCT FROM OLD.offered_card_ids
			OR NEW.offered_gidouilles IS DISTINCT FROM OLD.offered_gidouilles
			OR NEW.wanted_card_template_ids IS DISTINCT FROM OLD.wanted_card_template_ids
			OR NEW.wanted_gidouilles IS DISTINCT FROM OLD.wanted_gidouilles;
	ELSIF TG_TABLE_NAME = 'marketplace_trades' THEN
		-- Un échange : seulement l'annuler.
		v_forbidden := NEW.status IS DISTINCT FROM 'cancelled';
	ELSIF TG_TABLE_NAME = 'marketplace_proposals' THEN
		-- Une proposition : la retirer ou la refuser, pas l'accepter.
		v_forbidden := NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted';
	ELSE
		-- Une partie (solo, tournoi, multijoueur) : plus rien.
		v_forbidden := true;
	END IF;

	IF v_forbidden THEN
		RAISE EXCEPTION 'Consentement parental requis : compte en lecture seule (%)', TG_TABLE_NAME
			USING ERRCODE = '42501';
	END IF;
	RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_read_only_actor() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER guard_read_only_actor_trg BEFORE UPDATE ON public.messages
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_actor();
CREATE TRIGGER guard_read_only_actor_trg BEFORE UPDATE ON public.private_messages
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_actor();
CREATE TRIGGER guard_read_only_actor_trg BEFORE UPDATE ON public.marketplace_listings
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_actor();
CREATE TRIGGER guard_read_only_actor_trg BEFORE UPDATE ON public.marketplace_trades
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_actor();
CREATE TRIGGER guard_read_only_actor_trg BEFORE UPDATE ON public.marketplace_proposals
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_actor();
CREATE TRIGGER guard_read_only_actor_trg BEFORE UPDATE ON public.minesweeper_games
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_actor();
CREATE TRIGGER guard_read_only_actor_trg BEFORE UPDATE ON public.minesweeper_tournament_games
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_actor();
CREATE TRIGGER guard_read_only_actor_trg BEFORE UPDATE ON public.minesweeper_multiplayer_game_state
	FOR EACH ROW EXECUTE FUNCTION public.guard_read_only_actor();

-- ----------------------------------------------------------------------------
-- Annonces d'un auteur en lecture seule : masquées, et fermées aux propositions
-- ----------------------------------------------------------------------------

-- Auteurs d'annonces ACTIVES de l'école de l'appelant qui sont en lecture seule :
-- la route du marché les retire de la liste. Ne révèle que ce que leur disparition
-- du marché révèle déjà (rien sur un élève sans annonce active).
CREATE OR REPLACE FUNCTION public.marketplace_hidden_creators()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
	SELECT coalesce(array_agg(DISTINCT l.creator_id), '{}')
	FROM marketplace_listings l
	WHERE l.status = 'active'
	  AND l.school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
	  AND NOT public.has_full_access(l.creator_id);
$$;

REVOKE EXECUTE ON FUNCTION public.marketplace_hidden_creators() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marketplace_hidden_creators() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_proposal_listing_open()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM marketplace_listings l
		WHERE l.id = NEW.listing_id AND NOT public.has_full_access(l.creator_id)
	) THEN
		RAISE EXCEPTION 'Annonce indisponible' USING ERRCODE = '42501';
	END IF;
	RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_proposal_listing_open() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER guard_proposal_listing_open_trg BEFORE INSERT ON public.marketplace_proposals
	FOR EACH ROW EXECUTE FUNCTION public.guard_proposal_listing_open();

-- ----------------------------------------------------------------------------
-- Matchmaking : un adversaire en lecture seule est ignoré
-- (définition identique à la prod, md5 vérifié le 2026-10-10, + une condition)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_multiplayer_queue(p_difficulty text, p_match_type text DEFAULT 'quick'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_student_id UUID := auth.uid();
  v_rank INTEGER;
  v_opponent_record RECORD;
  v_match_id UUID;
  v_seed TEXT;
BEGIN
  -- Validate authenticated
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate difficulty
  IF p_difficulty NOT IN ('beginner', 'intermediate', 'expert') THEN
    RAISE EXCEPTION 'Invalid difficulty: %', p_difficulty;
  END IF;

  -- Validate match_type
  IF p_match_type NOT IN ('quick', 'ranked') THEN
    RAISE EXCEPTION 'Invalid match_type: %', p_match_type;
  END IF;

  -- Get player's ELO (ensure stats exist first)
  PERFORM ensure_player_stats_exist(v_student_id);

  -- Q160 : la colonne s'appelle rank (ranked_elo n'existe pas → 42703), et on
  -- lit la saison courante, celle que crée ensure_player_stats_exist.
  SELECT rank INTO v_rank
  FROM minesweeper_player_stats
  WHERE student_id = v_student_id
    AND season = TO_CHAR(NOW(), 'YYYY-MM');

  -- Check if already in queue
  IF EXISTS (
    SELECT 1 FROM minesweeper_multiplayer_queue
    WHERE student_id = v_student_id
      AND status = 'waiting'
  ) THEN
    RAISE EXCEPTION 'Already in queue';
  END IF;

  -- Check if already in active match
  IF EXISTS (
    SELECT 1 FROM minesweeper_multiplayer_matches
    WHERE (player1_id = v_student_id OR player2_id = v_student_id)
      AND status IN ('waiting', 'countdown', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'Already in active match';
  END IF;

  -- Try to find opponent (within ±200 ELO, same difficulty & match_type)
  SELECT
    student_id,
    rank,
    joined_at,
    id AS queue_id
  INTO v_opponent_record
  FROM minesweeper_multiplayer_queue
  WHERE difficulty = p_difficulty
    AND match_type = p_match_type
    AND status = 'waiting'
    AND student_id != v_student_id
    AND ABS(rank - v_rank) <= 200  -- MMR tolerance
    -- Lecture seule (A2) : un adversaire passé en lecture seule pendant son attente ne
    -- doit pas faire échouer le matchmaking de tous les suivants.
    AND public.has_full_access(student_id)
  ORDER BY joined_at ASC  -- First come first served within MMR range
  LIMIT 1;

  IF v_opponent_record.student_id IS NOT NULL THEN
    -- Match found! Create match
    -- Q160 : pgcrypto vit dans le schéma extensions, hors du search_path (42883).
    v_seed := encode(extensions.gen_random_bytes(16), 'hex');  -- Generate random seed

    INSERT INTO minesweeper_multiplayer_matches (
      match_type,
      difficulty,
      seed,
      player1_id,
      player2_id,
      status
    ) VALUES (
      p_match_type,
      p_difficulty,
      v_seed,
      v_opponent_record.student_id,  -- Opponent is player 1 (they joined first)
      v_student_id,                  -- We are player 2
      'countdown'                     -- Start in countdown phase
    ) RETURNING id INTO v_match_id;

    -- Mark both players as matched in queue
    UPDATE minesweeper_multiplayer_queue
    SET status = 'matched'
    WHERE student_id IN (v_student_id, v_opponent_record.student_id)
      AND status = 'waiting';

    -- Initialize game state for both players
    INSERT INTO minesweeper_multiplayer_game_state (match_id, player_id)
    VALUES
      (v_match_id, v_opponent_record.student_id),
      (v_match_id, v_student_id);

    RETURN jsonb_build_object(
      'matched', true,
      'match_id', v_match_id,
      'opponent_id', v_opponent_record.student_id,
      'seed', v_seed,
      'difficulty', p_difficulty,
      'match_type', p_match_type,
      'player_number', 2  -- We are player 2
    );
  ELSE
    -- No match found, join queue
    INSERT INTO minesweeper_multiplayer_queue (
      student_id,
      difficulty,
      match_type,
      rank,
      status
    ) VALUES (
      v_student_id,
      p_difficulty,
      p_match_type,
      v_rank,
      'waiting'
    );

    RETURN jsonb_build_object(
      'matched', false,
      'waiting', true,
      'difficulty', p_difficulty,
      'match_type', p_match_type,
      'rank', v_rank
    );
  END IF;
END;
$function$;
