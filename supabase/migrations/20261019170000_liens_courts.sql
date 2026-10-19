-- ============================================================================
-- Liens courts des QR codes (`https://www.chiph.re/l/<code>`)
-- ============================================================================
-- Un QR code tient au plus 220 octets (version 15, correction H). Un lien de
-- série porte toute sa composition dans l'adresse : ≈ 350 caractères dès une
-- catégorie, donc jamais de QR. Le lien court enregistre l'adresse longue et
-- la rend sous un code de 8 caractères.
-- Phase 0 : docs/wip/liens-courts-phase0.md (tranchée par David le 2026-10-19).
--
-- QUESTION D'ACCÈS (tranchée par David) : **celui qui a le code lit la cible,
-- et rien d'autre.** La cible est le lien long que le prof a déjà partagé : elle
-- n'apprend rien de neuf. Personne ne liste la table, pas même un prof par
-- l'API. L'auteur et la date sont gardés sans être exposés. Aucune donnée
-- d'élève.
--
-- Seul un prof ou l'admin CRÉE un lien : le panier est public, et une table
-- que des inconnus remplissent serait une réserve à spam.
--
-- ⚠️ La cible est un chemin INTERNE (`/…`). Une cible libre ferait de
-- `chiph.re/l/…` une redirection ouverte : un lien à notre nom qui mène à un
-- site piégé. `//hote` et `/\hote` sont refusés : les navigateurs les lisent
-- comme un autre domaine.
--
-- Les liens ne meurent pas : un QR imprimé sur une fiche ne se reprend pas.
--
-- ROLLBACK :
--   drop function if exists public.resolve_short_link(text);
--   drop function if exists public.create_short_link(text);
--   drop table if exists public.short_links;
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. La table
-- ---------------------------------------------------------------------------
create table if not exists public.short_links (
	-- 8 caractères sans les ambigus 0 O o 1 l I : 56^8 ≈ 10^14 codes, rien à
	-- deviner ni à énumérer.
	code text primary key,
	target text not null,
	-- L'unicité porte sur l'empreinte : un index btree refuse les valeurs de plus
	-- de ~2,7 Ko, et un lien de 50 catégories en fait bien plus. Colonne simple
	-- (une colonne générée exige une expression IMMUTABLE, et l'encodage du texte
	-- ne l'est pas) : remplie par create_short_link, recoupée par la contrainte.
	target_hash bytea not null,
	created_by uuid references public.profiles(id) on delete set null,
	created_at timestamptz not null default now(),
	constraint short_links_code_shape check (code ~ '^[a-km-np-zA-HJ-NP-Z2-9]{8}$'),
	constraint short_links_target_internal check (
		char_length(target) <= 16384
		and target ~ '^/([^/\\[:space:][:cntrl:]][^\\[:space:][:cntrl:]]*)?$'
	),
	constraint short_links_target_hash_matches check (target_hash = sha256(textsend(target))),
	constraint short_links_target_hash_unique unique (target_hash)
);

comment on table public.short_links is
	'Liens courts /l/<code> des QR codes : un code vers un chemin interne du site. Lue seulement par resolve_short_link, écrite seulement par create_short_link.';

-- ---------------------------------------------------------------------------
-- 2. Personne ne lit ni n'écrit la table directement
-- ---------------------------------------------------------------------------
-- RLS active et AUCUNE policy : tout passe par les deux fonctions ci-dessous.
-- Les révocations sont nécessaires en plus : le baseline pose
-- `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES` pour anon ET authenticated,
-- et `ALL` inclut TRUNCATE, qui ignore la RLS.
alter table public.short_links enable row level security;
revoke all on public.short_links from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. La création : prof ou admin seulement
-- ---------------------------------------------------------------------------
-- Même cible → même code. La cible est vérifiée ici (22023, message clair) et
-- par la contrainte de la table (filet).
create or replace function public.create_short_link(p_target text)
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
	v_alphabet constant text := 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	v_code text;
	v_bytes bytea;
	v_attempt integer;
begin
	if not public.is_teacher_or_admin() then
		raise exception 'Seul un prof crée un lien court' using errcode = '42501';
	end if;

	if p_target is null
		or char_length(p_target) > 16384
		or p_target !~ '^/([^/\\[:space:][:cntrl:]][^\\[:space:][:cntrl:]]*)?$'
	then
		raise exception 'Un lien court mène à une adresse du site' using errcode = '22023';
	end if;

	select s.code into v_code
	from public.short_links s
	where s.target_hash = sha256(textsend(p_target));
	if found then
		return v_code;
	end if;

	-- Collision de code : improbable (10^14), on retire au sort. Collision de
	-- cible : un autre appel vient de l'enregistrer, on relit son code.
	for v_attempt in 1..5 loop
		v_bytes := extensions.gen_random_bytes(8);
		v_code := '';
		for i in 0..7 loop
			v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 56) + 1, 1);
		end loop;

		insert into public.short_links (code, target, target_hash, created_by)
		values (v_code, p_target, sha256(textsend(p_target)), auth.uid())
		on conflict do nothing;
		if found then
			return v_code;
		end if;

		select s.code into v_code
		from public.short_links s
		where s.target_hash = sha256(textsend(p_target));
		if found then
			return v_code;
		end if;
	end loop;

	raise exception 'Lien court impossible à créer' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_short_link(text) from public, anon, authenticated;
grant execute on function public.create_short_link(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. La lecture : quiconque a le code, même sans compte
-- ---------------------------------------------------------------------------
-- Ne rend que la cible. Code inconnu et code mal formé rendent tous deux null.
create or replace function public.resolve_short_link(p_code text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
	select s.target
	from public.short_links s
	where p_code ~ '^[a-km-np-zA-HJ-NP-Z2-9]{8}$'
		and s.code = p_code;
$$;

revoke all on function public.resolve_short_link(text) from public, anon, authenticated;
grant execute on function public.resolve_short_link(text) to anon, authenticated;
