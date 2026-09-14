-- `get_due_cards_for_deck` : l'identité ne se passe plus en paramètre
-- ====================================================================
--
-- La fonction est SECURITY DEFINER — elle contourne donc la RLS de `srs_cards`
-- et `srs_card_stats` — et prend `p_user_id` EN PARAMÈTRE sans jamais le
-- comparer à `auth.uid()`. Or `authenticated` a le droit de l'exécuter, et
-- PostgREST expose toute fonction exécutable sur
-- `POST /rest/v1/rpc/get_due_cards_for_deck`.
--
-- Conséquence : un élève connecté, avec sa propre clé et son propre jeton,
-- envoie `{"p_user_id": "<identifiant d'un camarade>", "p_deck_id": "..."}` et
-- reçoit son échéancier carte par carte — difficulté, stabilité, prochaine
-- révision. C'est le profil de maîtrise d'un élève mineur.
--
-- Le contrôle qui devrait l'empêcher existe, mais il vit dans la ROUTE
-- (`api/srs/review/due`, `.eq('owner_id', user.id)`) : du bon côté du pare-feu
-- pour l'application, du mauvais pour PostgREST, qui n'emprunte jamais la
-- route.
--
-- ⚠️ DÉFAUT PRÉ-EXISTANT, présent depuis le baseline. `p_all` (migration
-- 20260915300000) ne l'a pas créé et ne l'a pas élargi : il augmente seulement
-- le nombre de lignes rendues par un appel déjà abusif.
--
-- QUESTION D'ACCÈS, posée et tranchée par David : la garde est STRICTE, sans
-- exception pour le professeur. Vérifié avant de l'écrire — le professeur n'en
-- a pas besoin : la policy « Teachers can view stats for assigned decks » sur
-- `srs_card_stats` lui donne déjà les statistiques des élèves À QUI IL A
-- LUI-MÊME assigné un deck, ce qui est plus précis qu'une exception globale.
-- Personne ne perd donc d'accès légitime.
--
-- DEUXIÈME GARDE, ajoutée dans le même geste : `p_deck_id` n'était pas gardé
-- non plus. Avec son PROPRE identifiant et le deck d'un camarade, un élève
-- obtenait la composition de ce deck (identifiants de cartes et de modèles),
-- assortie de statistiques par défaut. Même famille de défaut, même fonction,
-- et la vérifier ici ne change rien pour l'appelant légitime : la route fait
-- déjà exactement ce contrôle.
--
-- ADDITIVE au sens des données : aucune ligne n'est touchée, c'est une
-- fonction de lecture. Elle REFUSE désormais des appels qu'elle acceptait —
-- c'est l'objet même du correctif.
--
-- ROLLBACK : rejouer `20260915300000_revision_forcee_deck.sql`, qui contient la
-- version sans garde.

create or replace function public.get_due_cards_for_deck(
	p_user_id uuid,
	p_deck_id uuid,
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
	-- `auth.uid()` NULL = appel hors jeton (postgres, service_role, tests par
	-- connexion directe) : ces rôles contournent déjà la RLS, la garde
	-- n'ajouterait rien et casserait des appels légitimes.
	--
	-- Sous jeton, en revanche, l'identité n'est plus négociable.
	if auth.uid() is not null and p_user_id <> auth.uid() then
		raise exception 'Accès refusé : p_user_id doit être l''appelant'
			using errcode = '42501';
	end if;

	-- Le deck doit appartenir à l'utilisateur dont on lit l'échéancier. Une
	-- assignation crée une COPIE par élève (`api/srs/decks/[id]/assign`), donc
	-- la propriété est bien le bon critère — c'est celui que la route applique.
	if auth.uid() is not null and not exists (
		select 1 from srs_decks d
		where d.id = p_deck_id and d.owner_id = p_user_id
	) then
		raise exception 'Accès refusé : ce deck ne vous appartient pas'
			using errcode = '42501';
	end if;

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
		and (p_all or coalesce(s.next_review, now()) <= now())
	order by coalesce(s.next_review, now()) asc
	-- Filet, pas limite de produit — cf. migration 20260915300000.
	limit 500;
end;
$function$;

alter function public.get_due_cards_for_deck(uuid, uuid, boolean) owner to postgres;

comment on function public.get_due_cards_for_deck(uuid, uuid, boolean) is
	'Cartes à réviser dans un deck. Sous jeton, `p_user_id` DOIT être l''appelant et le deck lui appartenir : la fonction est SECURITY DEFINER et exposée par PostgREST, l''identité ne peut donc pas venir d''un paramètre. `p_all = true` force toutes les cartes, échéance ignorée.';

revoke execute on function public.get_due_cards_for_deck(uuid, uuid, boolean) from public, anon;
grant execute on function public.get_due_cards_for_deck(uuid, uuid, boolean) to authenticated, service_role;
