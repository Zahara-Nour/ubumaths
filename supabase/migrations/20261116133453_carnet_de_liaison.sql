-- ============================================================================
-- Carnet de liaison : la page d'UN parent sur UN élève, lue par un lien
-- ============================================================================
-- ADR 0040, chantier `partage-parents` (docs/wip/partage-parents-progress.md).
--
-- QUESTION D'ACCÈS (posée et tranchée par David, tour 4, Q16) : le détenteur
-- du lien d'un parent lit, pour UN SEUL élève :
--   · le palier de régularité de 5 semaines (0, 1, 2-3, 4+ jours actifs ; même
--     règle que la grille du prof, `class_regularity_weeks` ; jamais de date
--     ni de nombre de jours, Q25) ;
--   · le nombre de révisions en retard (carte déjà révisée, échéance passée,
--     jour de Paris ; Q24) ;
--   · les évaluations publiées qui lui sont assignées : titre, échéance, faite
--     ou non — SANS note ;
--   · les liens du cahier et du cours de ses classes au carnet activé ;
--   · son prénom.
-- JAMAIS : notes, réponses, messages, avertissements, profil (nom de famille,
-- adresse), adresses des parents, tout autre élève.
-- L'élève lit son propre carnet (aucun accès nouveau). Le professeur lit les
-- adresses confirmées et l'état des liens. Personne d'autre.
--
-- PORTES : aucune policy `anon`. Les fonctions qui reçoivent un lien (lecture,
-- confirmation, refus, arrêt des courriels, émission) sont réservées au
-- service role : c'est le serveur qui les appelle, après ses propres gardes
-- (limite de débit). Les liens sont stockés HACHÉS (sha256, Q22) : une copie
-- de la base n'ouvre aucun carnet.
--
-- ADDITIVE : cinq tables neuves, neuf fonctions neuves, aucune donnée touchée.
--
-- ROLLBACK :
--   drop function if exists public.get_my_carnet();
--   drop function if exists public.get_carnet_by_token(text);
--   drop function if exists public.set_parent_emails_stopped(text, boolean);
--   drop function if exists public.refuse_parent_contact(text);
--   drop function if exists public.confirm_parent_contact(text);
--   drop function if exists public.issue_parent_carnet_link(uuid, text, timestamptz);
--   drop function if exists public.carnet_payload(uuid);
--   drop function if exists public.carnet_student_is_shared(uuid);
--   drop table if exists public.parent_notifications;
--   drop table if exists public.student_carnet_opt_outs;
--   drop table if exists public.parent_carnet_links;
--   drop table if exists public.parent_contacts;
--   drop table if exists public.class_carnet_settings;
--   drop function if exists public.parent_contacts_normalize();
--   drop function if exists public.parent_contacts_limit();
--   drop function if exists public.student_carnet_opt_out_revokes_links();
--   (⚠️ perd les adresses confirmées et les liens émis : les parents tombent
--   sur « lien invalide ». Aucune donnée d'élève n'est touchée.)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Réglages par classe (D1)
-- ---------------------------------------------------------------------------
-- Pas de ligne = carnet désactivé : le carnet part au geste du professeur (Q17).
create table if not exists public.class_carnet_settings (
	class_id uuid primary key references public.classes(id) on delete cascade,
	enabled boolean not null default false,
	-- Exceptions (Q7) : évaluation non faite à l'échéance, révisions en retard
	-- depuis N jours, aucun jour actif depuis N jours.
	evaluation_missed_alert boolean not null default true,
	overdue_reviews_days integer not null default 7
		constraint class_carnet_settings_overdue_days check (overdue_reviews_days between 1 and 60),
	inactivity_days integer not null default 15
		constraint class_carnet_settings_inactivity_days check (inactivity_days between 3 and 60),
	quarterly_message boolean not null default true,
	updated_at timestamptz not null default now(),
	updated_by uuid references public.profiles(id) on delete set null default auth.uid()
);

comment on table public.class_carnet_settings is
	'Carnet de liaison (ADR 0040) : activation et seuils des courriels d''exception, par classe. Pas de ligne = désactivé.';

alter table public.class_carnet_settings enable row level security;

drop policy if exists "Teachers and admins manage carnet settings" on public.class_carnet_settings;
create policy "Teachers and admins manage carnet settings"
	on public.class_carnet_settings for all
	to authenticated
	using (public.is_teacher_or_admin())
	with check (public.is_teacher_or_admin());

-- Les DEUX révocations : le baseline pose des droits par défaut pour `anon` ET
-- `authenticated` ; `ALL` inclut TRUNCATE, qui ignore la RLS.
revoke all on public.class_carnet_settings from public, anon, authenticated;
grant select, insert, update, delete on public.class_carnet_settings to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Adresses des parents (A1-A6)
-- ---------------------------------------------------------------------------
-- Deux adresses actives (en attente ou confirmées) au plus par élève (Q8).
-- « Je ne suis pas le parent » (A5) : l'adresse est effacée, son empreinte
-- reste, et l'unicité (élève, empreinte) interdit de la ressaisir.
create table if not exists public.parent_contacts (
	id uuid primary key default gen_random_uuid(),
	student_id uuid not null references public.profiles(id) on delete cascade,
	email text,
	-- sha256 de l'adresse normalisée, posée par trigger ; survit à l'effacement.
	email_hash text not null,
	status text not null default 'pending',
	source text not null,
	consent_id uuid references public.parental_consents(id) on delete set null,
	confirm_token_hash text unique,
	confirm_expires_at timestamptz,
	confirm_sent_count integer not null default 0,
	confirm_last_sent_at timestamptz,
	confirmed_at timestamptz,
	emails_stopped_at timestamptz,
	created_at timestamptz not null default now(),
	created_by uuid references public.profiles(id) on delete set null,
	constraint parent_contacts_status check (status in ('pending', 'confirmed', 'refused', 'invalid')),
	constraint parent_contacts_source check (source in ('consent', 'teacher', 'student')),
	-- Une adresse refusée est effacée ; toutes les autres en ont une.
	constraint parent_contacts_email_presence check ((status = 'refused') = (email is null)),
	constraint parent_contacts_email_format check (
		email is null
		or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
	),
	constraint parent_contacts_confirm_sent_count check (confirm_sent_count between 0 and 3),
	constraint parent_contacts_confirm_token_hash check (
		confirm_token_hash is null or confirm_token_hash ~ '^[0-9a-f]{64}$'
	),
	constraint parent_contacts_student_email unique (student_id, email_hash)
);

comment on table public.parent_contacts is
	'Carnet de liaison (ADR 0040) : adresses des parents d''un élève, deux actives au plus. Rien ne part vers une adresse non confirmée. Écrite par le serveur seul (service role).';

create index if not exists idx_parent_contacts_student on public.parent_contacts (student_id);

-- Normalise l'adresse et pose son empreinte.
create or replace function public.parent_contacts_normalize()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
	if new.email is not null then
		new.email := lower(trim(new.email));
		new.email_hash := encode(extensions.digest(new.email, 'sha256'), 'hex');
	end if;
	return new;
end;
$$;

drop trigger if exists parent_contacts_normalize on public.parent_contacts;
create trigger parent_contacts_normalize
	before insert or update of email on public.parent_contacts
	for each row execute function public.parent_contacts_normalize();

-- Deux adresses actives au plus (A3). Verrou par élève : deux insertions
-- simultanées ne passent pas toutes les deux.
create or replace function public.parent_contacts_limit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
	if new.status in ('pending', 'confirmed') then
		perform pg_advisory_xact_lock(hashtext('parent_contacts:' || new.student_id::text));
		if (
			select count(*)
			from public.parent_contacts c
			where c.student_id = new.student_id
				and c.status in ('pending', 'confirmed')
				and c.id <> new.id
		) >= 2 then
			raise exception 'UBP01 : deux adresses de parents au plus'
				using errcode = 'UBP01';
		end if;
	end if;
	return new;
end;
$$;

drop trigger if exists parent_contacts_limit on public.parent_contacts;
create trigger parent_contacts_limit
	before insert or update of status on public.parent_contacts
	for each row execute function public.parent_contacts_limit();

alter table public.parent_contacts enable row level security;

-- Le professeur lit les adresses (D2). Aucune écriture par un compte connecté :
-- ajouter une adresse envoie un courriel, c'est le serveur qui le fait.
drop policy if exists "Teachers and admins read parent contacts" on public.parent_contacts;
create policy "Teachers and admins read parent contacts"
	on public.parent_contacts for select
	to authenticated
	using (public.is_teacher_or_admin());

-- Droits PAR COLONNE : le professeur ne lit ni l'empreinte de l'adresse
-- (sha256 non salé : deviner une adresse suffirait à savoir qu'elle a été
-- saisie puis refusée) ni celle du lien de confirmation.
revoke all on public.parent_contacts from public, anon, authenticated;
grant select (
	id, student_id, email, status, source, consent_id, confirm_expires_at,
	confirm_sent_count, confirm_last_sent_at, confirmed_at, emails_stopped_at,
	created_at, created_by
) on public.parent_contacts to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Liens du carnet (un par adresse, Q10)
-- ---------------------------------------------------------------------------
create table if not exists public.parent_carnet_links (
	id uuid primary key default gen_random_uuid(),
	contact_id uuid not null references public.parent_contacts(id) on delete cascade,
	-- sha256 (hex) du jeton ; le jeton en clair n'est jamais stocké (Q22).
	token_hash text not null unique,
	-- Le serveur pose le 31 août suivant (B5).
	expires_at timestamptz not null,
	revoked_at timestamptz,
	access_count integer not null default 0,
	last_accessed_at timestamptz,
	created_at timestamptz not null default now(),
	constraint parent_carnet_links_token_hash check (token_hash ~ '^[0-9a-f]{64}$')
);

comment on table public.parent_carnet_links is
	'Carnet de liaison (ADR 0040) : liens de lecture, un actif par adresse, stockés hachés. Révoquer = poser revoked_at.';

create unique index if not exists idx_parent_carnet_links_active_contact
	on public.parent_carnet_links (contact_id)
	where revoked_at is null;

alter table public.parent_carnet_links enable row level security;

drop policy if exists "Teachers and admins read carnet links" on public.parent_carnet_links;
create policy "Teachers and admins read carnet links"
	on public.parent_carnet_links for select
	to authenticated
	using (public.is_teacher_or_admin());

-- Droits par colonne : jamais l'empreinte du jeton.
revoke all on public.parent_carnet_links from public, anon, authenticated;
grant select (
	id, contact_id, expires_at, revoked_at, access_count, last_accessed_at, created_at
) on public.parent_carnet_links to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Partage coupé par le professeur (élève majeur, Q4 ; D3)
-- ---------------------------------------------------------------------------
create table if not exists public.student_carnet_opt_outs (
	student_id uuid primary key references public.profiles(id) on delete cascade,
	stopped_at timestamptz not null default now(),
	stopped_by uuid references public.profiles(id) on delete set null default auth.uid()
);

comment on table public.student_carnet_opt_outs is
	'Carnet de liaison (ADR 0040) : partage coupé pour un élève (élève majeur qui le demande). Une ligne révoque les liens de ses parents.';

alter table public.student_carnet_opt_outs enable row level security;

drop policy if exists "Teachers and admins manage carnet opt outs" on public.student_carnet_opt_outs;
create policy "Teachers and admins manage carnet opt outs"
	on public.student_carnet_opt_outs for all
	to authenticated
	using (public.is_teacher_or_admin())
	with check (public.is_teacher_or_admin());

-- L'élève sait que le partage est arrêté (C3) ; il ne l'arrête pas lui-même.
drop policy if exists "Students read own carnet opt out" on public.student_carnet_opt_outs;
create policy "Students read own carnet opt out"
	on public.student_carnet_opt_outs for select
	to authenticated
	using (student_id = auth.uid());

revoke all on public.student_carnet_opt_outs from public, anon, authenticated;
grant select, insert, delete on public.student_carnet_opt_outs to authenticated;

-- Couper le partage révoque les liens (D3). `SECURITY DEFINER` assumé : le
-- professeur insère par la RLS mais n'a aucun droit d'écriture sur les liens.
-- Fonction de trigger : jamais appelable directement.
create or replace function public.student_carnet_opt_out_revokes_links()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
	-- Même verrou que `issue_parent_carnet_link` : pas de lien émis pendant
	-- qu'on coupe le partage.
	perform pg_advisory_xact_lock(hashtext('carnet_links:' || new.student_id::text));
	update public.parent_carnet_links l
	set revoked_at = now()
	from public.parent_contacts c
	where c.id = l.contact_id
		and c.student_id = new.student_id
		and l.revoked_at is null;
	return new;
end;
$$;

revoke execute on function public.student_carnet_opt_out_revokes_links() from public, anon, authenticated;

drop trigger if exists student_carnet_opt_out_revokes_links on public.student_carnet_opt_outs;
create trigger student_carnet_opt_out_revokes_links
	after insert on public.student_carnet_opt_outs
	for each row execute function public.student_carnet_opt_out_revokes_links();

-- ---------------------------------------------------------------------------
-- 5. Courriels envoyés (C2, A4, E6)
-- ---------------------------------------------------------------------------
create table if not exists public.parent_notifications (
	id uuid primary key default gen_random_uuid(),
	student_id uuid not null references public.profiles(id) on delete cascade,
	contact_id uuid references public.parent_contacts(id) on delete set null,
	kind text not null,
	reasons text[] not null default '{}',
	status text not null,
	created_at timestamptz not null default now(),
	constraint parent_notifications_kind check (kind in ('confirmation', 'link', 'exception', 'quarterly')),
	constraint parent_notifications_status check (status in ('sent', 'failed')),
	constraint parent_notifications_reasons check (
		reasons <@ array['evaluation_missed', 'reviews_overdue', 'inactivity']::text[]
		and cardinality(reasons) <= 3
	)
);

comment on table public.parent_notifications is
	'Carnet de liaison (ADR 0040) : courriels envoyés aux parents (date, nature, motifs). L''élève lit les siens, jamais les adresses.';

create index if not exists idx_parent_notifications_student
	on public.parent_notifications (student_id, created_at desc);

alter table public.parent_notifications enable row level security;

drop policy if exists "Teachers admins and the student read parent notifications"
	on public.parent_notifications;
create policy "Teachers admins and the student read parent notifications"
	on public.parent_notifications for select
	to authenticated
	using (student_id = auth.uid() or public.is_teacher_or_admin());

revoke all on public.parent_notifications from public, anon, authenticated;
grant select on public.parent_notifications to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Le carnet
-- ---------------------------------------------------------------------------
-- Le partage d'un élève est ouvert s'il n'est pas coupé et s'il est membre
-- actif d'au moins une classe active au carnet activé (B4). Interne.
create or replace function public.carnet_student_is_shared(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
	select not exists (
			select 1 from public.student_carnet_opt_outs o where o.student_id = p_student_id
		)
		and exists (
			select 1
			from public.class_members cm
			join public.classes c on c.id = cm.class_id
			join public.class_carnet_settings s on s.class_id = cm.class_id
			where cm.student_id = p_student_id
				and cm.status = 'active'
				and c.is_active
				and s.enabled
		);
$$;

revoke execute on function public.carnet_student_is_shared(uuid) from public, anon, authenticated;

-- Le contenu du carnet d'un élève. Interne : jamais appelable par un compte ;
-- les deux portes ci-dessous l'appellent après leurs gardes.
--
-- Jour actif = au moins 5 traces autonomes le même jour de Paris, hors
-- contrôle : MÊME règle que `class_regularity_weeks` et
-- `MIN_TRACES_PER_ACTIVE_DAY` (src/lib/server/stats/class-regularity.ts) — les
-- changer ensemble.
create or replace function public.carnet_payload(p_student_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
	v_today date := (now() at time zone 'Europe/Paris')::date;
	v_monday date := v_today - (extract(isodow from v_today)::integer - 1);
	v_start date := v_monday - 28;
	v_year_id uuid;
	v_first_day date;
	v_result jsonb;
begin
	-- Rentrée : comme la grille du prof (`regularityFirstDay`,
	-- `readSchoolYearOfSchool`) — année scolaire active la plus récente déjà
	-- commencée de l'école d'une classe au carnet ; à défaut, le 1er septembre
	-- écoulé. Aucune semaine d'avant la rentrée.
	select sy.id, sy.start_date into v_year_id, v_first_day
	from public.school_years sy
	where sy.is_active
		and sy.start_date <= v_today
		and sy.school_id in (
			select c.school_id
			from public.class_members cm
			join public.classes c on c.id = cm.class_id
			join public.class_carnet_settings s on s.class_id = cm.class_id
			where cm.student_id = p_student_id
				and cm.status = 'active'
				and c.is_active
				and s.enabled
		)
	order by sy.start_date desc
	limit 1;

	if v_first_day is null then
		v_first_day := make_date(extract(year from v_today)::integer, 9, 1);
		if v_first_day > v_today then
			v_first_day := make_date(extract(year from v_today)::integer - 1, 9, 1);
		end if;
	end if;

	with
	classes_du_carnet as (
		select c.id, c.name
		from public.class_members cm
		join public.classes c on c.id = cm.class_id
		join public.class_carnet_settings s on s.class_id = cm.class_id
		where cm.student_id = p_student_id
			and cm.status = 'active'
			and c.is_active
			and s.enabled
	),
	jours_actifs as (
		select (a.created_at at time zone 'Europe/Paris')::date as day
		from public.skill_attempts a
		where a.student_id = p_student_id
			and a.source in ('auto', 'srs', 'student_self')
			and a.place is distinct from 'evaluation'
			-- Un jour de marge : minuit à Paris tombe la veille en UTC (index)
			and a.created_at >= (v_start - 1)::timestamp at time zone 'UTC'
			and (a.created_at at time zone 'Europe/Paris')::date >= greatest(v_start, v_first_day)
		group by day
		having count(*) >= 5
	),
	semaines as (
		select gs::date as week_start
		from generate_series(v_start, v_monday, interval '7 days') gs
		-- Semaine qui touche la rentrée ou après
		where gs::date + 6 >= v_first_day
	),
	paliers as (
		select
			s.week_start,
			(select count(*) from jours_actifs j
				where j.day >= s.week_start and j.day < s.week_start + 7) as n,
			exists (
				select 1
				from public.school_holidays h
				where h.school_year_id = v_year_id
					and h.start_date <= s.week_start + 6 and h.end_date >= s.week_start
			) as holiday
		from semaines s
	),
	-- Évaluations : à venir, et passées dans la même fenêtre de 5 semaines que
	-- la régularité (Q14) ; une évaluation sans échéance, si créée dans la fenêtre.
	evaluations_eleve as (
		select distinct e.id, sr.title, e.deadline
		from public.evaluations e
		join public.series sr on sr.id = e.series_id
		join public.evaluation_assignments ea on ea.evaluation_id = e.id
		where e.status = 'published'
			and (
				ea.student_id = p_student_id
				or ea.class_id in (select k.id from classes_du_carnet k)
			)
			and (
				e.deadline >= v_start::timestamp at time zone 'Europe/Paris'
				or (e.deadline is null and e.created_at >= v_start::timestamp at time zone 'Europe/Paris')
			)
	)
	select jsonb_build_object(
		'firstname', (select p.firstname from public.profiles p where p.id = p_student_id),
		'weeks', (
			select coalesce(jsonb_agg(jsonb_build_object(
				'week_start', pa.week_start,
				'level', case
					when pa.n = 0 then '0'
					when pa.n = 1 then '1'
					when pa.n <= 3 then '2-3'
					else '4+'
				end,
				'holiday', pa.holiday
			) order by pa.week_start), '[]'::jsonb)
			from paliers pa
		),
		'revisions', jsonb_build_object(
			'overdue', (
				select count(*)
				from public.srs_card_stats st
				where st.user_id = p_student_id
					-- Carte déjà révisée ; une carte jamais vue n'est pas un retard (Q24)
					and st.last_review is not null
					and (st.next_review at time zone 'Europe/Paris')::date < v_today
			)
		),
		'evaluations', (
			select coalesce(jsonb_agg(jsonb_build_object(
				'title', ev.title,
				'deadline', ev.deadline,
				'done', exists (
					select 1 from public.test_sessions ts
					where ts.evaluation_id = ev.id
						and ts.user_id = p_student_id
						and ts.completed_at is not null
				)
			) order by ev.deadline nulls last, ev.title), '[]'::jsonb)
			from evaluations_eleve ev
		),
		'classes', (
			select coalesce(jsonb_agg(jsonb_build_object(
				'name', k.name,
				'journal_token', (
					select t.token from public.class_journal_share_tokens t
					where t.class_id = k.id and t.is_active
						and (t.expires_at is null or t.expires_at > now())
					order by t.created_at desc limit 1
				),
				'course_token', (
					select t.token from public.class_course_share_tokens t
					where t.class_id = k.id and t.is_active
						and (t.expires_at is null or t.expires_at > now())
					order by t.created_at desc limit 1
				)
			) order by k.name), '[]'::jsonb)
			from classes_du_carnet k
		)
	) into v_result;

	return v_result;
end;
$$;

revoke execute on function public.carnet_payload(uuid) from public, anon, authenticated;

-- Porte du parent. Réservée au service role (le serveur, après sa limite de
-- débit). Ne dit JAMAIS pourquoi un lien échoue : révoqué, expiré, inexistant,
-- adresse non confirmée, partage coupé, élève sorti de la classe → null.
create or replace function public.get_carnet_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_link record;
begin
	if p_token is null or char_length(p_token) not between 32 and 128 then
		return null;
	end if;

	select l.id, c.student_id, c.emails_stopped_at into v_link
	from public.parent_carnet_links l
	join public.parent_contacts c on c.id = l.contact_id
	where l.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
		and l.revoked_at is null
		and l.expires_at > now()
		and c.status = 'confirmed';

	if not found or not public.carnet_student_is_shared(v_link.student_id) then
		return null;
	end if;

	update public.parent_carnet_links
	set access_count = access_count + 1, last_accessed_at = now()
	where id = v_link.id;

	return public.carnet_payload(v_link.student_id)
		|| jsonb_build_object('emails_stopped', v_link.emails_stopped_at is not null);
end;
$$;

-- Porte de l'élève (C1) : son propre carnet, toujours (même partage coupé ou
-- carnet désactivé), avec ce qu'il doit savoir — partage ouvert ou non, nombre
-- de parents qui le reçoivent ; jamais leurs adresses.
create or replace function public.get_my_carnet()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
	v_uid uuid := auth.uid();
begin
	-- Garde d'appelant : un élève connecté, et lui seul.
	if v_uid is null or not exists (
		select 1 from public.profiles p where p.id = v_uid and p.role = 'student'
	) then
		return null;
	end if;

	return public.carnet_payload(v_uid) || jsonb_build_object(
		'shared', public.carnet_student_is_shared(v_uid),
		'opted_out', exists (select 1 from public.student_carnet_opt_outs o where o.student_id = v_uid),
		'parents', (
			select count(*) from public.parent_contacts c
			where c.student_id = v_uid and c.status = 'confirmed'
		)
	);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Adresses et liens : écritures du serveur
-- ---------------------------------------------------------------------------
-- Émettre un lien pour une adresse CONFIRMÉE (A1, A6, D2) : révoque le lien
-- actif, pose le nouveau. Le serveur génère le jeton (CSPRNG) et n'envoie ici
-- que son empreinte. Rend false si l'adresse n'est pas confirmée ou si le
-- partage est coupé.
create or replace function public.issue_parent_carnet_link(
	p_contact_id uuid,
	p_token_hash text,
	p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_contact record;
begin
	if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' or p_expires_at is null then
		return false;
	end if;

	select c.id, c.student_id, c.status into v_contact
	from public.parent_contacts c
	where c.id = p_contact_id
	for update;

	-- Même verrou que la coupure du partage (trigger d'opt-out), puis
	-- relecture de l'opt-out après le verrou.
	if found then
		perform pg_advisory_xact_lock(hashtext('carnet_links:' || v_contact.student_id::text));
	end if;

	if not found or v_contact.status <> 'confirmed' or exists (
		select 1 from public.student_carnet_opt_outs o where o.student_id = v_contact.student_id
	) then
		return false;
	end if;

	update public.parent_carnet_links
	set revoked_at = now()
	where contact_id = p_contact_id and revoked_at is null;

	insert into public.parent_carnet_links (contact_id, token_hash, expires_at)
	values (p_contact_id, p_token_hash, p_expires_at);

	return true;
end;
$$;

-- Confirmer une adresse (A2) : une fois, avant l'échéance. Rend l'adresse et
-- l'élève (le serveur émet alors le lien), ou null.
create or replace function public.confirm_parent_contact(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_contact record;
begin
	if p_token is null or char_length(p_token) not between 32 and 128 then
		return null;
	end if;

	update public.parent_contacts
	set status = 'confirmed',
		confirmed_at = now(),
		confirm_token_hash = null,
		confirm_expires_at = null
	where confirm_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
		and status = 'pending'
		and confirm_expires_at > now()
	returning id, student_id into v_contact;

	if not found then
		return null;
	end if;

	return jsonb_build_object('contact_id', v_contact.id, 'student_id', v_contact.student_id);
end;
$$;

-- « Je ne suis pas le parent de cet élève » (A5) : l'adresse est effacée, son
-- empreinte reste (elle ne peut plus être saisie pour cet élève). Possible même
-- après l'échéance de la confirmation.
create or replace function public.refuse_parent_contact(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_student uuid;
begin
	if p_token is null or char_length(p_token) not between 32 and 128 then
		return null;
	end if;

	update public.parent_contacts
	set status = 'refused',
		email = null,
		confirm_token_hash = null,
		confirm_expires_at = null
	where confirm_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
		and status = 'pending'
	returning student_id into v_student;

	if not found then
		return null;
	end if;

	return jsonb_build_object('student_id', v_student);
end;
$$;

-- « Ne plus recevoir ces courriels » / reprendre (Q9, E5), par le lien du
-- carnet. Le carnet reste ouvert.
create or replace function public.set_parent_emails_stopped(p_token text, p_stopped boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
	if p_token is null or char_length(p_token) not between 32 and 128 or p_stopped is null then
		return false;
	end if;

	update public.parent_contacts c
	set emails_stopped_at = case when p_stopped then coalesce(c.emails_stopped_at, now()) end
	from public.parent_carnet_links l
	where l.contact_id = c.id
		and l.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
		and l.revoked_at is null
		and l.expires_at > now()
		and c.status = 'confirmed'
		-- Même porte que la lecture : un carnet fermé (élève sorti de la
		-- classe, carnet désactivé) ne doit pas se trahir ici (ADR 0040).
		and public.carnet_student_is_shared(c.student_id);

	return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Droits d'exécution
-- ---------------------------------------------------------------------------
revoke execute on function public.get_carnet_by_token(text) from public, anon, authenticated;
revoke execute on function public.issue_parent_carnet_link(uuid, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.confirm_parent_contact(text) from public, anon, authenticated;
revoke execute on function public.refuse_parent_contact(text) from public, anon, authenticated;
revoke execute on function public.set_parent_emails_stopped(text, boolean) from public, anon, authenticated;
grant execute on function public.get_carnet_by_token(text) to service_role;
grant execute on function public.issue_parent_carnet_link(uuid, text, timestamptz) to service_role;
grant execute on function public.confirm_parent_contact(text) to service_role;
grant execute on function public.refuse_parent_contact(text) to service_role;
grant execute on function public.set_parent_emails_stopped(text, boolean) to service_role;

revoke execute on function public.get_my_carnet() from public, anon;
grant execute on function public.get_my_carnet() to authenticated, service_role;

revoke execute on function public.parent_contacts_normalize() from public, anon, authenticated;
revoke execute on function public.parent_contacts_limit() from public, anon, authenticated;
