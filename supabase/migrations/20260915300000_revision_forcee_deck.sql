-- Révision forcée : revoir TOUTES les cartes d'un deck, pas seulement les échues
-- ==============================================================================
--
-- `get_due_cards_for_deck` ne rend que les cartes dont l'échéance est passée.
-- C'est le bon défaut pour une révision espacée — et le mauvais la veille d'un
-- contrôle, où l'élève veut vérifier une dernière fois qu'il a tout compris.
-- Aujourd'hui il ouvre son deck et le trouve vide : non parce qu'il n'y a rien
-- à travailler, mais parce que l'algorithme a jugé que ce n'était pas l'heure.
--
-- Le verrou tenait en UNE ligne — `and coalesce(s.next_review, now()) <= now()`.
-- Ni la route, ni `ReviewSession`, ni `FlashCard`, ni les boutons FSRS ne
-- supposent l'échéance : seul ce filtre la connaît.
--
-- QUESTION D'ACCÈS : personne ne gagne d'accès. `p_all` ne change pas À QUI
-- appartiennent les cartes rendues — uniquement LESQUELLES de ses propres
-- cartes l'élève reçoit. La route appelante vérifie déjà que le deck lui
-- appartient.
--
-- ⚠️ DROP puis CREATE, et NON un second `create or replace` avec un paramètre
-- de plus : ajouter une surcharge laisserait DEUX signatures, et le générateur
-- de types saute en silence une fonction surchargée — elle disparaîtrait de
-- `database.ts` sans cesser d'exister. Piège déjà payé sur ce dépôt.
-- Les appelants passant deux arguments restent valides : `p_all` a un défaut.
--
-- USAGES vérifiés avant le DROP (`grep -rn get_due_cards_for_deck src`) :
--   src/routes/api/srs/review/due/+server.ts:101  ← le seul appelant
--   src/routes/api/srs/__tests__/api-routes.test.ts:1079  ← un commentaire
--   src/lib/types/database.ts:15706  ← type auto-généré
-- Aucune jointure PostgREST, aucun schéma Zod ne nomme cette fonction.
--
-- Aucune donnée n'est touchée : c'est une fonction de lecture.
--
-- ROLLBACK :
--   drop function if exists public.get_due_cards_for_deck(uuid, uuid, boolean);
--   -- puis recréer la version à deux arguments, identique à celle-ci mais
--   -- sans `p_all` et avec le filtre d'échéance inconditionnel.

drop function if exists public.get_due_cards_for_deck(uuid, uuid);

create or replace function public.get_due_cards_for_deck(
	p_user_id uuid,
	p_deck_id uuid,
	-- `false` par défaut : la révision espacée reste le comportement normal.
	-- Un appelant qui ne connaît pas ce paramètre garde exactement l'ancien.
	p_all boolean default false
)
returns table(
	card_id uuid,
	template_id uuid,
	card_type text,
	difficulty real,
	stability real,
	state text,
	next_review timestamp with time zone
)
language plpgsql
stable
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
begin
	return query
	select
		c.id as card_id,
		c.template_id,
		c.card_type,
		coalesce(s.difficulty, 5.0) as difficulty,
		coalesce(s.stability, 0.0) as stability,
		coalesce(s.state, 'new'::text) as state,
		coalesce(s.next_review, now()) as next_review
	from srs_cards c
	left join srs_card_stats s on (
		s.user_id = p_user_id
		and s.card_reference_type = c.card_type
		and (
			(c.card_type = 'template' and s.card_reference_id::text = c.template_id::text)
			or (c.card_type = 'custom' and s.card_reference_id::text = c.id::text)
		)
	)
	where
		c.deck_id = p_deck_id
		-- LA ligne. `p_all` la court-circuite sans rien changer d'autre : l'ordre
		-- reste celui de l'échéance, donc le plus en retard passe en premier même
		-- en révision forcée.
		and (p_all or coalesce(s.next_review, now()) <= now())
	order by coalesce(s.next_review, now()) asc;
end;
$function$;

comment on function public.get_due_cards_for_deck(uuid, uuid, boolean) is
	'Cartes à réviser dans un deck. `p_all = true` force TOUTES les cartes, échéance ignorée (révision de veille de contrôle) ; `false` garde la sélection par échéance, qui reste le défaut.';

-- Mêmes droits que la version remplacée, `anon` exclu (audit d'août 2026 :
-- `pg_default_acl` accorde EXECUTE à PUBLIC par défaut, il faut le retirer).
revoke execute on function public.get_due_cards_for_deck(uuid, uuid, boolean) from public, anon;
grant execute on function public.get_due_cards_for_deck(uuid, uuid, boolean) to authenticated, service_role;
