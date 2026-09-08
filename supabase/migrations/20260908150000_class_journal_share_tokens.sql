-- ============================================================================
-- Cahier de texte partageable par lien (token de lecture par classe)
-- ============================================================================
-- Tous les élèves n'ont pas de compte. Sans ce lien, ceux-là n'ont aucun moyen
-- de savoir ce qu'il y a à faire — ce qui vide le cahier de texte de sa raison
-- d'être. La contrainte est donc de rendre lisible sans authentifier, et sans
-- rien ouvrir d'autre.
--
-- QUESTION D'ACCÈS (posée et tranchée avec David) : **toute personne détenant le
-- lien pourra lire les entrées PUBLIÉES d'une classe, sans compte.** Jamais les
-- brouillons, jamais les entrées futures, jamais la liste des élèves, jamais
-- autre chose que le contenu de cours et les devoirs.
--
-- Ce que ça n'ouvre PAS, et c'est le point le plus important : `class_journal_entries`
-- ne contient aucune donnée personnelle d'élève (entry_date, lesson_content,
-- homework_content, homework_due_date, is_published, class_id). Le risque n'est
-- donc pas RGPD-mineurs, c'est qu'un contenu de classe devienne indexable.
--
-- ⚠️ SÉPARATION STRICTE D'AVEC `classes.join_code`. Les deux sont des secrets qui
-- circulent, mais le code d'inscription INSCRIT un élève dans la classe, alors
-- que ce token ne fait que LIRE. Les confondre transformerait un lien de lecture
-- partagé à des familles en porte d'entrée dans la classe. Deux colonnes, deux
-- tables, deux durées de vie : jamais de raccourci entre elles.
--
-- ROLLBACK :
--   drop function if exists public.get_class_journal_by_share_token(text);
--   drop table if exists public.class_journal_share_tokens;
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Les tokens
-- ---------------------------------------------------------------------------
-- Un token par classe (contrainte d'unicité partielle sur les actifs) : chaque
-- classe a son cahier, donc son lien. Révoquer = désactiver, pas supprimer, pour
-- garder trace de ce qui a circulé.
create table if not exists public.class_journal_share_tokens (
	id uuid primary key default gen_random_uuid(),
	class_id uuid not null references public.classes(id) on delete cascade,
	-- Généré côté application avec un CSPRNG (voir generateShareTokenString) :
	-- Math.random() est prédictible, et quelques tokens émis suffisent à retrouver
	-- l'état du générateur — c'est la leçon du finding H8 de l'audit d'août.
	token text not null unique,
	is_active boolean not null default true,
	-- NULL = pas d'expiration. En pratique l'application pose le 31 août suivant :
	-- un lien d'année scolaire meurt de lui-même à la rentrée.
	expires_at timestamptz,
	access_count integer not null default 0,
	last_accessed_at timestamptz,
	created_at timestamptz not null default now(),
	created_by uuid references public.profiles(id),
	constraint class_journal_share_tokens_token_length check (char_length(token) between 16 and 64)
);

comment on table public.class_journal_share_tokens is
	'Tokens de lecture seule du cahier de texte d''une classe, pour les élèves sans compte. N''INSCRIT PERSONNE — à ne jamais confondre avec classes.join_code, qui, lui, inscrit.';

-- Un seul lien actif par classe : deux liens vivants seraient deux secrets à
-- révoquer le jour où l'un fuite.
create unique index if not exists idx_class_journal_share_tokens_active_class
	on public.class_journal_share_tokens (class_id)
	where is_active;

create index if not exists idx_class_journal_share_tokens_token
	on public.class_journal_share_tokens (token);

-- ---------------------------------------------------------------------------
-- 2. RLS : la table n'est JAMAIS lue directement par un visiteur
-- ---------------------------------------------------------------------------
-- L'accès anonyme passe exclusivement par la fonction ci-dessous, qui exige le
-- token exact. Laisser `anon` lire la table lui donnerait la liste des tokens
-- vivants — c'est précisément l'erreur corrigée par le finding H8 sur les
-- exercices (« Anyone can read valid tokens »).
alter table public.class_journal_share_tokens enable row level security;

drop policy if exists "Teachers and admins manage journal share tokens"
	on public.class_journal_share_tokens;
create policy "Teachers and admins manage journal share tokens"
	on public.class_journal_share_tokens for all
	to authenticated
	using (public.is_teacher_or_admin())
	with check (public.is_teacher_or_admin());

-- Les DEUX révocations sont nécessaires : le baseline pose
-- `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES` à la fois pour `anon` et
-- `authenticated` (20260616220000:46144-46145), et `revoke from public` ne
-- retire aucune de ces entrées — PUBLIC est un pseudo-rôle, pas un ensemble de
-- rôles. `ALL` inclut TRUNCATE, qui IGNORE la RLS.
revoke all on public.class_journal_share_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.class_journal_share_tokens to authenticated;

-- `class_journal_entries` porte encore le `GRANT ALL ... TO anon` du baseline
-- (20260616220000:45031), jamais révoqué. La RLS bloque déjà tout (ses policies
-- passent toutes par `auth.uid()`), mais `ALL` inclut TRUNCATE, qui IGNORE la
-- RLS — et `anon` n'a désormais AUCUN besoin légitime sur cette table, puisque
-- la fonction ci-dessous est SECURITY DEFINER. On ferme pendant qu'on y est.
revoke all on public.class_journal_entries from anon;

-- ---------------------------------------------------------------------------
-- 3. La résolution du token
-- ---------------------------------------------------------------------------
-- `SECURITY DEFINER` est ici indispensable et assumé : l'appelant est anonyme,
-- il ne peut par construction rien lire des tables sources. La fonction est donc
-- la seule porte, et elle est étroite — elle exige le token EXACT, ne renvoie que
-- des entrées publiées et non futures, et n'expose aucune colonne d'élève.
--
-- Elle ne dit JAMAIS pourquoi un token échoue : révoqué, expiré et inexistant
-- renvoient tous `null`. Distinguer ces cas confirmerait à un visiteur qu'un
-- token a existé, ce qui aide à en deviner d'autres.
create or replace function public.get_class_journal_by_share_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_token record;
	v_result jsonb;
begin
	-- Garde de forme avant toute lecture : évite un balayage sur une entrée vide
	-- ou aberrante.
	if p_token is null or char_length(p_token) not between 16 and 64 then
		return null;
	end if;

	select t.id, t.class_id into v_token
	from public.class_journal_share_tokens t
	where t.token = p_token
		and t.is_active
		and (t.expires_at is null or t.expires_at > now());

	if not found then
		return null;
	end if;

	-- `c.is_active` : archiver une classe doit valoir révocation de son lien.
	-- Sans ça, le cahier d'une classe de l'an dernier resterait lisible jusqu'à
	-- l'expiration du jeton.
	select jsonb_build_object(
		'class_name', c.name,
		'class_grade', c.grade,
		'entries', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'id', e.id,
					'entry_date', e.entry_date,
					'lesson_content', e.lesson_content,
					'homework_content', e.homework_content,
					'homework_due_date', e.homework_due_date
				)
				order by e.entry_date desc
			)
			from public.class_journal_entries e
			where e.class_id = v_token.class_id
				and e.is_published
				-- Une séance future publiée par avance ne doit pas fuiter le
				-- programme du prochain contrôle.
				and e.entry_date <= current_date
		), '[]'::jsonb)
	) into v_result
	from public.classes c
	where c.id = v_token.class_id
		and c.is_active;

	-- Classe archivée : même réponse qu'un jeton invalide, pour ne rien apprendre.
	if v_result is null then
		return null;
	end if;

	-- Comptabilité d'accès. Volontairement après la lecture : un échec de mise à
	-- jour ne doit pas priver le lecteur de son cahier.
	update public.class_journal_share_tokens
	set access_count = access_count + 1,
		last_accessed_at = now()
	where id = v_token.id;

	return v_result;
end;
$$;

comment on function public.get_class_journal_by_share_token(text) is
	'Résout un token de partage en cahier de texte lisible : entrées publiées et non futures d''une classe. SECURITY DEFINER car l''appelant est anonyme par construction. Renvoie NULL sans distinguer révoqué / expiré / inexistant.';

revoke all on function public.get_class_journal_by_share_token(text) from public;
grant execute on function public.get_class_journal_by_share_token(text) to anon, authenticated;
