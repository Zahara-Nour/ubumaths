-- ============================================================================
-- « Mon cours » partageable par lien (jeton de lecture par classe)
-- ============================================================================
-- Tous les élèves n'ont pas de compte. Le cahier de texte a déjà son lien
-- (20260908150000_class_journal_share_tokens) ; « Mon cours » — le plan des
-- chapitres et les contenus publiés — n'en avait pas. Même contrainte : rendre
-- lisible sans authentifier, et sans rien ouvrir d'autre.
--
-- QUESTION D'ACCÈS (posée et tranchée par David) : **toute personne détenant le
-- lien du COURS d'une classe pourra lire, sans compte**, pour les chapitres
-- visibles (`is_visible`) d'une classe active (`is_active`), les contenus dont
-- la date de mise à disposition est PASSÉE (`published_at <= now()` ; NULL =
-- préparé, invisible ; date future = programmé, invisible) :
--   · le plan : titre, description, couleur, icône et ordre des chapitres, et
--     les sections — seulement celles qui portent au moins un contenu renvoyé ;
--   · les documents : leurs métadonnées, SANS `storage_path` (le fichier
--     s'obtient côté SERVEUR par une RPC réservée au service role, puis une URL
--     signée courte : le visiteur ne voit jamais le chemin de stockage) ;
--   · les fiches : identifiant et titre — uniquement si publiées dans le chapitre
--     ET distribuées à CETTE classe (affectation active, ouverte). Miroir de
--     `student_has_worksheet_access` : publier sans distribuer ne montre rien ;
--   · les checklists : énoncé, description, ordre — sans aucune progression ;
--   · les séries : identifiant, titre, description, catégories, forme.
-- JAMAIS : exercices de chapitre, questions de quiz, paquets (decks), progression
-- des checklists, élèves, `join_code`.
--
-- Aucune donnée personnelle d'élève n'est lisible : le risque n'est pas
-- RGPD-mineurs, c'est qu'un contenu de classe devienne indexable — d'où un
-- jeton révocable et des gardes de publication strictes.
--
-- ⚠️ LIEN DISTINCT DU CAHIER : table séparée. Un jeton de cahier n'ouvre RIEN
-- ici, et inversement : deux liens, deux révocations indépendantes. Et toujours
-- la séparation d'avec `classes.join_code`, qui INSCRIT — ce jeton ne fait que
-- LIRE.
--
-- ADDITIVE : une table neuve, trois fonctions neuves. Aucune donnée touchée.
--
-- ROLLBACK :
--   drop function if exists public.get_course_document_by_share_token(text, uuid);
--   drop function if exists public.get_course_worksheet_by_share_token(text, uuid);
--   drop function if exists public.get_class_course_by_share_token(text);
--   drop table if exists public.class_course_share_tokens;
--   (⚠️ le DROP TABLE perd les liens émis : les familles qui les détiennent
--   tombent sur « lien invalide ». Aucun contenu de cours n'est touché.)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Les jetons
-- ---------------------------------------------------------------------------
-- Calque exact de `class_journal_share_tokens`. Révoquer = désactiver, pas
-- supprimer, pour garder trace de ce qui a circulé.
create table if not exists public.class_course_share_tokens (
	id uuid primary key default gen_random_uuid(),
	class_id uuid not null references public.classes(id) on delete cascade,
	-- Généré côté application avec un CSPRNG (voir generateShareTokenString) :
	-- Math.random() est prédictible (finding H8 de l'audit d'août).
	token text not null unique,
	is_active boolean not null default true,
	-- NULL = pas d'expiration. En pratique l'application pose le 31 août suivant.
	expires_at timestamptz,
	access_count integer not null default 0,
	last_accessed_at timestamptz,
	created_at timestamptz not null default now(),
	created_by uuid references public.profiles(id),
	constraint class_course_share_tokens_token_length check (char_length(token) between 16 and 64)
);

comment on table public.class_course_share_tokens is
	'Jetons de lecture seule de « Mon cours » d''une classe, pour les élèves sans compte. Distincts des jetons du cahier de texte. N''INSCRIT PERSONNE — à ne jamais confondre avec classes.join_code, qui, lui, inscrit.';

-- Un seul lien actif par classe : deux liens vivants seraient deux secrets à
-- révoquer le jour où l'un fuite.
create unique index if not exists idx_class_course_share_tokens_active_class
	on public.class_course_share_tokens (class_id)
	where is_active;

-- ---------------------------------------------------------------------------
-- 2. RLS : la table n'est JAMAIS lue directement par un visiteur
-- ---------------------------------------------------------------------------
-- L'accès anonyme passe exclusivement par les fonctions ci-dessous, qui exigent
-- le jeton exact. Laisser `anon` lire la table lui donnerait la liste des liens
-- vivants (finding H8, « Anyone can read valid tokens »).
alter table public.class_course_share_tokens enable row level security;

drop policy if exists "Teachers and admins manage course share tokens"
	on public.class_course_share_tokens;
create policy "Teachers and admins manage course share tokens"
	on public.class_course_share_tokens for all
	to authenticated
	using (public.is_teacher_or_admin())
	with check (public.is_teacher_or_admin());

-- Les DEUX révocations sont nécessaires : le baseline pose `ALTER DEFAULT
-- PRIVILEGES ... GRANT ALL ON TABLES` pour `anon` ET `authenticated`, et
-- `revoke from public` ne retire aucune de ces entrées. `ALL` inclut TRUNCATE,
-- qui IGNORE la RLS.
revoke all on public.class_course_share_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.class_course_share_tokens to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Le plan et les contenus publiés
-- ---------------------------------------------------------------------------
-- `SECURITY DEFINER` indispensable et assumé : l'appelant est anonyme, il ne
-- peut par construction rien lire des tables sources (aucun droit `anon` sur
-- les tables de chapitre depuis 20261001110000). La fonction est la seule
-- porte : jeton EXACT, contenus publiés et passés, aucune colonne d'élève.
--
-- Elle ne dit JAMAIS pourquoi un jeton échoue : révoqué, expiré, inexistant et
-- classe archivée renvoient tous `null`.
create or replace function public.get_class_course_by_share_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_token record;
	v_result jsonb;
begin
	-- Garde de forme avant toute lecture.
	if p_token is null or char_length(p_token) not between 16 and 64 then
		return null;
	end if;

	select t.id, t.class_id into v_token
	from public.class_course_share_tokens t
	where t.token = p_token
		and t.is_active
		and (t.expires_at is null or t.expires_at > now());

	if not found then
		return null;
	end if;

	-- Les ensembles visibles sont calculés UNE fois (CTE) : la règle « une section
	-- n'apparaît que si elle porte un contenu renvoyé » relit exactement ce qui
	-- est renvoyé, sans recopier les conditions de publication.
	with
	chapitres as (
		select ch.*
		from public.class_chapters ch
		where ch.class_id = v_token.class_id
			and ch.is_visible
	),
	documents as (
		select d.*
		from public.chapter_documents d
		join chapitres ch on ch.id = d.chapter_id
		-- `<= now()` et jamais `is not null` seul : une date future = programmé.
		where d.published_at <= now()
	),
	fiches as (
		select cw.*, w.title as worksheet_title
		from public.chapter_worksheets cw
		join chapitres ch on ch.id = cw.chapter_id
		join public.worksheets w on w.id = cw.worksheet_id
		where cw.published_at <= now()
			-- Distribuée à CETTE classe (miroir de student_has_worksheet_access,
			-- branche « par la classe ») : publier sans distribuer ne montre rien.
			and exists (
				select 1
				from public.worksheet_assignments wa
				join public.worksheet_assignment_classes wac on wac.assignment_id = wa.id
				where wa.worksheet_id = cw.worksheet_id
					and wac.class_id = v_token.class_id
					and wa.status = 'active'
					and (wa.available_from is null or wa.available_from <= now())
			)
	),
	items as (
		select ci.*
		from public.chapter_checklist_items ci
		join chapitres ch on ch.id = ci.chapter_id
		where ci.published_at <= now()
	),
	series_publiees as (
		select cs.*, s.title as series_title, s.description as series_description,
			s.categories as series_categories
		from public.chapter_series cs
		join chapitres ch on ch.id = cs.chapter_id
		join public.series s on s.id = cs.series_id
		where cs.published_at <= now()
	),
	sections as (
		select sec.*
		from public.chapter_sections sec
		join chapitres ch on ch.id = sec.chapter_id
		where exists (select 1 from documents x where x.section_id = sec.id)
			or exists (select 1 from fiches x where x.section_id = sec.id)
			or exists (select 1 from items x where x.section_id = sec.id)
			or exists (select 1 from series_publiees x where x.section_id = sec.id)
	)
	select jsonb_build_object(
		'class_name', c.name,
		'class_grade', c.grade,
		'chapters', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'id', ch.id,
					'title', ch.title,
					'description', ch.description,
					'color', ch.color,
					'icon', ch.icon,
					'display_order', ch.display_order,
					'sections', coalesce((
						select jsonb_agg(
							jsonb_build_object(
								'id', sec.id,
								'title', sec.title,
								'display_order', sec.display_order
							) order by sec.display_order, sec.id
						)
						from sections sec
						where sec.chapter_id = ch.id
					), '[]'::jsonb),
					-- SANS storage_path : le fichier passe par
					-- get_course_document_by_share_token puis une URL signée courte.
					'documents', coalesce((
						select jsonb_agg(
							jsonb_build_object(
								'id', d.id,
								'title', d.title,
								'description', d.description,
								'source_type', d.source_type,
								'file_name', d.file_name,
								'mime_type', d.mime_type,
								'file_size', d.file_size,
								'google_drive_url', d.google_drive_url,
								'section_id', d.section_id,
								'section_order', d.section_order,
								'display_order', d.display_order
							) order by d.display_order, d.id
						)
						from documents d
						where d.chapter_id = ch.id
					), '[]'::jsonb),
					'worksheets', coalesce((
						select jsonb_agg(
							jsonb_build_object(
								'id', f.id,
								'worksheet_id', f.worksheet_id,
								'title', f.worksheet_title,
								'section_id', f.section_id,
								'section_order', f.section_order,
								'display_order', f.display_order
							) order by f.display_order, f.id
						)
						from fiches f
						where f.chapter_id = ch.id
					), '[]'::jsonb),
					-- Aucune progression : student_checklist_progress n'est pas lue.
					'checklist_items', coalesce((
						select jsonb_agg(
							jsonb_build_object(
								'id', i.id,
								'content', i.content,
								'description', i.description,
								'section_id', i.section_id,
								'section_order', i.section_order,
								'display_order', i.display_order
							) order by i.display_order, i.id
						)
						from items i
						where i.chapter_id = ch.id
					), '[]'::jsonb),
					'series', coalesce((
						select jsonb_agg(
							jsonb_build_object(
								'id', sp.id,
								'series_id', sp.series_id,
								'title', sp.series_title,
								'description', sp.series_description,
								'categories', sp.series_categories,
								'form', sp.form,
								'section_id', sp.section_id,
								'section_order', sp.section_order,
								'display_order', sp.display_order
							) order by sp.display_order, sp.id
						)
						from series_publiees sp
						where sp.chapter_id = ch.id
					), '[]'::jsonb)
				)
				order by ch.display_order, ch.id
			)
			from chapitres ch
		), '[]'::jsonb)
	) into v_result
	from public.classes c
	where c.id = v_token.class_id
		-- Archiver une classe vaut révocation de son lien.
		and c.is_active;

	-- Classe archivée : même réponse qu'un jeton invalide.
	if v_result is null then
		return null;
	end if;

	-- Comptabilité d'accès, après la lecture : un échec de mise à jour ne doit
	-- pas priver le lecteur de son cours.
	update public.class_course_share_tokens
	set access_count = access_count + 1,
		last_accessed_at = now()
	where id = v_token.id;

	return v_result;
end;
$$;

comment on function public.get_class_course_by_share_token(text) is
	'Résout un jeton de partage de « Mon cours » : chapitres visibles d''une classe active et contenus publiés (published_at <= now()) ; fiches seulement si distribuées à la classe ; documents sans storage_path. SECURITY DEFINER car l''appelant est anonyme par construction. Renvoie NULL sans distinguer révoqué / expiré / inexistant / classe archivée.';

revoke all on function public.get_class_course_by_share_token(text) from public;
grant execute on function public.get_class_course_by_share_token(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Une fiche du cours
-- ---------------------------------------------------------------------------
-- Même charge utile que `get_worksheet_by_share_token` (le cahier), autre
-- garde : la fiche doit être PUBLIÉE dans un chapitre visible de la classe du
-- jeton ET distribuée à cette classe. Le jeton n'ouvre pas le catalogue.
create or replace function public.get_course_worksheet_by_share_token(
	p_token text,
	p_worksheet_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_class_id uuid;
	v_visible boolean;
	v_result jsonb;
begin
	-- Garde de forme avant toute lecture.
	if p_token is null or char_length(p_token) not between 16 and 64 then
		return null;
	end if;
	if p_worksheet_id is null then
		return null;
	end if;

	select t.class_id into v_class_id
	from public.class_course_share_tokens t
	join public.classes c on c.id = t.class_id
	where t.token = p_token
		and t.is_active
		and (t.expires_at is null or t.expires_at > now())
		and c.is_active;

	if not found then
		return null;
	end if;

	select exists (
		select 1
		from public.chapter_worksheets cw
		join public.class_chapters ch on ch.id = cw.chapter_id
		where cw.worksheet_id = p_worksheet_id
			and ch.class_id = v_class_id
			and ch.is_visible
			and cw.published_at <= now()
	)
	and exists (
		select 1
		from public.worksheet_assignments wa
		join public.worksheet_assignment_classes wac on wac.assignment_id = wa.id
		where wa.worksheet_id = p_worksheet_id
			and wac.class_id = v_class_id
			and wa.status = 'active'
			and (wa.available_from is null or wa.available_from <= now())
	) into v_visible;

	-- Même réponse qu'un jeton invalide : ne rien apprendre sur l'existence de
	-- la fiche à qui essaierait des identifiants au hasard.
	if not v_visible then
		return null;
	end if;

	select jsonb_build_object(
		'id', w.id,
		'title', w.title,
		'description', w.description,
		'type', w.type,
		'config', w.config,
		'status', w.status,
		'grades', w.grades,
		'translations', w.translations,
		'total_points', w.total_points,
		'estimated_duration_minutes', w.estimated_duration_minutes,
		'sections', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'id', s.id,
					'worksheet_id', s.worksheet_id,
					'title', s.title,
					'instructions', s.instructions,
					'position', s.position,
					'points_total', s.points_total,
					'translations', s.translations
				) order by s.position
			)
			from public.worksheet_sections s
			where s.worksheet_id = w.id
		), '[]'::jsonb),
		'exercises', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'id', we.id,
					'worksheet_id', we.worksheet_id,
					'exercise_id', we.exercise_id,
					'section_id', we.section_id,
					'position', we.position,
					'points', we.points,
					'is_essential', we.is_essential,
					'custom_instructions', we.custom_instructions,
					'variant_mode', we.variant_mode,
					'variant_config', we.variant_config,
					'variation_index', we.variation_index,
					'translations', we.translations,
					'exercise', jsonb_build_object(
						'id', e.id,
						'title', e.title,
						'variables', e.variables,
						'shared', e.shared,
						'variations', e.variations,
						-- Lettres déclarées comme fonctions (C'(x) dans le PDF)
						'generic_functions', e.generic_functions
					)
				) order by we.position
			)
			from public.worksheet_exercises we
			join public.exercises e on e.id = we.exercise_id
			where we.worksheet_id = w.id
		), '[]'::jsonb)
	) into v_result
	from public.worksheets w
	where w.id = p_worksheet_id;

	return v_result;
end;
$$;

comment on function public.get_course_worksheet_by_share_token(text, uuid) is
	'Fiche ouverte par le lien de « Mon cours » : même charge utile que get_worksheet_by_share_token. Garde : fiche publiée (published_at <= now()) dans un chapitre visible de la classe du jeton ET distribuée à cette classe. NULL sinon, sans distinguer.';

revoke all on function public.get_course_worksheet_by_share_token(text, uuid) from public;
grant execute on function public.get_course_worksheet_by_share_token(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Un document du cours — RÉSERVÉE AU SERVICE ROLE
-- ---------------------------------------------------------------------------
-- Rend ce qu'il faut pour servir le fichier : le serveur l'appelle avec le
-- client service role (après validation Zod du jeton), puis signe une URL
-- courte. `storage_path` ne sort QUE par ici, document par document, et
-- seulement s'il est publié dans un chapitre visible.
--
-- Ni `anon` ni `authenticated` ne l'exécutent : le chemin de stockage ne doit
-- jamais atteindre un navigateur, même avec un jeton valide. La garde par jeton
-- reste dans le corps : le serveur ne fait que relayer ce que le jeton ouvre.
create or replace function public.get_course_document_by_share_token(
	p_token text,
	p_document_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_class_id uuid;
	v_result jsonb;
begin
	-- Garde de forme avant toute lecture.
	if p_token is null or char_length(p_token) not between 16 and 64 then
		return null;
	end if;
	if p_document_id is null then
		return null;
	end if;

	select t.class_id into v_class_id
	from public.class_course_share_tokens t
	join public.classes c on c.id = t.class_id
	where t.token = p_token
		and t.is_active
		and (t.expires_at is null or t.expires_at > now())
		and c.is_active;

	if not found then
		return null;
	end if;

	select jsonb_build_object(
		'storage_path', d.storage_path,
		'file_name', d.file_name,
		'mime_type', d.mime_type,
		'source_type', d.source_type,
		'google_drive_url', d.google_drive_url
	) into v_result
	from public.chapter_documents d
	join public.class_chapters ch on ch.id = d.chapter_id
	where d.id = p_document_id
		and ch.class_id = v_class_id
		and ch.is_visible
		and d.published_at <= now();

	-- Absent : `v_result` reste NULL — même réponse qu'un jeton invalide.
	return v_result;
end;
$$;

comment on function public.get_course_document_by_share_token(text, uuid) is
	'Document ouvert par le lien de « Mon cours » : storage_path, nom, type, source, URL Drive — seulement s''il est publié (published_at <= now()) dans un chapitre visible de la classe du jeton. NULL sinon, sans distinguer. RÉSERVÉE au service role : le serveur signe ensuite une URL courte.';

-- `revoke from public` ne suffit pas : le baseline accorde aussi EXECUTE par
-- défaut à anon et authenticated (ALTER DEFAULT PRIVILEGES).
revoke all on function public.get_course_document_by_share_token(text, uuid) from public, anon, authenticated;
grant execute on function public.get_course_document_by_share_token(text, uuid) to service_role;
