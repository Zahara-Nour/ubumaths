-- Carnet de liaison, PR 4 : courriels d'exception, message trimestriel,
-- effacement des adresses (ADR 0040 ; chantier `partage-parents`, E1-E7, Q19,
-- Q21, Q27, Q33-Q38).
--
-- Question d'accès (Q37, Q38, tranchées par David le 2026-11-16) :
--  - les épisodes d'exception ne sont lus par PERSONNE via l'API (service role
--    seul) ;
--  - le détenteur d'un lien lit en plus les évaluations SANS échéance non
--    faites créées avant la fenêtre de 5 semaines (titre, faite ou non) — Q27 ;
--  - chaque courriel porte son propre jeton (haché sur sa ligne du journal) :
--    son détenteur lit le carnet et arrête les courriels, aux mêmes conditions
--    que le lien du parent (adresse confirmée, lien actif, partage ouvert) — Q38 ;
--  - effacement (Q35) : le parent effacé perd son carnet ; personne d'autre ne
--    perd rien.
--
-- Additive : deux colonnes, une table, des fonctions. Aucune donnée n'est
-- effacée par la migration elle-même ; `carnet_erase_orphan_contacts` efface,
-- à l'appel du cron, les adresses d'un élève sans classe active depuis 90 jours
-- (perte voulue, RGPD, Q35).
--
-- Rollback :
--   drop function if exists public.carnet_erase_orphan_contacts();
--   drop function if exists public.carnet_quarterly_plan();
--   drop function if exists public.carnet_exception_plan();
--   drop function if exists public.carnet_sync_exception_episodes();
--   drop function if exists public.carnet_current_exceptions();
--   drop function if exists public.carnet_contact_by_token(text);
--   drop function if exists public.carnet_is_holiday(uuid, date);
--   drop function if exists public.carnet_school_year(uuid);
--   drop table if exists public.parent_exception_episodes;
--   alter table public.parent_notifications drop constraint if exists parent_notifications_access_token_kind;
--   alter table public.parent_notifications drop column if exists access_token_hash;
--   alter table public.parent_contacts drop column if exists orphaned_since;
--   puis rejouer, depuis 20261116133453_carnet_de_liaison.sql, les corps de
--   carnet_payload, get_carnet_by_token et set_parent_emails_stopped.

-- ---------------------------------------------------------------------------
-- 1. Colonnes
-- ---------------------------------------------------------------------------
-- Jeton propre à un courriel (Q38) : sha256 hex ; le jeton en clair n'existe
-- que dans le courriel.
alter table public.parent_notifications
	add column if not exists access_token_hash text unique
		constraint parent_notifications_access_token_hash
		check (access_token_hash is null or access_token_hash ~ '^[0-9a-f]{64}$');

-- Seuls les courriels du cron portent un jeton : jamais une confirmation, qui
-- part vers une adresse non vérifiée.
alter table public.parent_notifications
	drop constraint if exists parent_notifications_access_token_kind;
alter table public.parent_notifications
	add constraint parent_notifications_access_token_kind
	check (access_token_hash is null or kind in ('exception', 'quarterly'));

-- Premier jour (Paris) où l'élève n'était membre actif d'aucune classe active ;
-- remis à null s'il revient (Q35). `class_members.left_at` reste vide à
-- l'archivage : il ne peut pas servir.
alter table public.parent_contacts
	add column if not exists orphaned_since date;

-- Ni le professeur ni l'élève ne lisent ces colonnes : les droits par colonne
-- de `parent_contacts` et `parent_notifications` ne les nomment pas. Pour
-- `parent_notifications`, la lecture se fait par table entière : on la
-- remplace par une liste de colonnes, sans l'empreinte.
revoke select on public.parent_notifications from authenticated;
grant select (id, student_id, contact_id, kind, reasons, status, created_at)
	on public.parent_notifications to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Épisodes d'exception (E2)
-- ---------------------------------------------------------------------------
-- Un épisode = une exception en cours pour un parent. Il est signalé une fois
-- (notified_at), et se ferme quand l'exception disparaît ; elle ne repart que
-- si elle revient (nouvel épisode). Une évaluation non faite = un épisode par
-- évaluation.
create table if not exists public.parent_exception_episodes (
	id uuid primary key default gen_random_uuid(),
	contact_id uuid not null references public.parent_contacts(id) on delete cascade,
	student_id uuid not null references public.profiles(id) on delete cascade,
	reason text not null,
	evaluation_id uuid references public.evaluations(id) on delete cascade,
	opened_at timestamptz not null default now(),
	notified_at timestamptz,
	closed_at timestamptz,
	constraint parent_exception_episodes_reason check (
		reason in ('evaluation_missed', 'reviews_overdue', 'inactivity')
	),
	constraint parent_exception_episodes_evaluation check (
		(reason = 'evaluation_missed') = (evaluation_id is not null)
	)
);

comment on table public.parent_exception_episodes is
	'Carnet de liaison (ADR 0040, E2) : exceptions en cours par parent, signalées une fois. Service role seul.';

create unique index if not exists idx_parent_exception_episodes_open
	on public.parent_exception_episodes (
		contact_id, reason, coalesce(evaluation_id, '00000000-0000-0000-0000-000000000000'::uuid)
	)
	where closed_at is null;

alter table public.parent_exception_episodes enable row level security;
-- Aucune policy : personne ne lit ni n'écrit par l'API (Q37).
revoke all on public.parent_exception_episodes from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Calendrier de l'élève (internes)
-- ---------------------------------------------------------------------------
-- Année scolaire et rentrée : même règle que `carnet_payload` (année active la
-- plus récente déjà commencée de l'école d'une classe au carnet ; à défaut, le
-- 1er septembre écoulé, sans année).
create or replace function public.carnet_school_year(
	p_student_id uuid,
	out year_id uuid,
	out first_day date
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
	v_today date := (now() at time zone 'Europe/Paris')::date;
begin
	select sy.id, sy.start_date into year_id, first_day
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

	if first_day is null then
		first_day := make_date(extract(year from v_today)::integer, 9, 1);
		if first_day > v_today then
			first_day := make_date(extract(year from v_today)::integer - 1, 9, 1);
		end if;
	end if;
end;
$$;

-- Jour de vacances scolaires (bornes incluses, comme la grille du prof).
create or replace function public.carnet_is_holiday(p_year_id uuid, p_day date)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
	select p_year_id is not null and exists (
		select 1 from public.school_holidays h
		where h.school_year_id = p_year_id
			and h.start_date <= p_day
			and h.end_date >= p_day
	);
$$;

-- ---------------------------------------------------------------------------
-- 4. Jeton d'accès : lien du parent OU jeton d'un courriel (Q38)
-- ---------------------------------------------------------------------------
-- Rend l'adresse visée si le jeton est le lien actif d'une adresse, ou le
-- jeton d'un courriel dont l'adresse a ENCORE un lien actif (le professeur qui
-- retire l'adresse, coupe le partage ou laisse le lien expirer coupe aussi les
-- jetons des courriels). Les appelants vérifient ensuite l'état de l'adresse et
-- le partage.
create or replace function public.carnet_contact_by_token(p_token text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
	with h as (select encode(extensions.digest(p_token, 'sha256'), 'hex') as hash)
	select coalesce(
		(
			select l.contact_id
			from public.parent_carnet_links l, h
			where l.token_hash = h.hash
				and l.revoked_at is null
				and l.expires_at > now()
		),
		(
			select n.contact_id
			from public.parent_notifications n, h
			where n.access_token_hash = h.hash
				and n.contact_id is not null
				and exists (
					select 1 from public.parent_carnet_links l
					where l.contact_id = n.contact_id
						and l.revoked_at is null
						and l.expires_at > now()
						-- Le lien qui était actif quand le courriel est parti : un
						-- lien plus récent (retrait puis ressaisie, rentrée, lien
						-- perdu) ne ranime pas les anciens courriels.
						and n.created_at >= l.created_at
				)
		)
	);
$$;

-- ---------------------------------------------------------------------------
-- 5. Le carnet : Q27 (évaluation sans échéance non faite gardée)
-- ---------------------------------------------------------------------------
-- Corps identique à 20261116133453, sauf `evaluations_eleve` : une évaluation
-- sans échéance reste tant qu'elle n'est pas faite, même créée avant la fenêtre.
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
	select y.year_id, y.first_day into v_year_id, v_first_day
	from public.carnet_school_year(p_student_id) y;

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
	-- la régularité (Q14) ; une évaluation sans échéance, si créée dans la
	-- fenêtre, ou tant qu'elle n'est pas faite (Q27).
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
				or (
					e.deadline is null
					and (
						e.created_at >= v_start::timestamp at time zone 'Europe/Paris'
						or not exists (
							select 1 from public.test_sessions ts
							where ts.evaluation_id = e.id
								and ts.user_id = p_student_id
								and ts.completed_at is not null
						)
					)
				)
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

-- ---------------------------------------------------------------------------
-- 6. Portes du parent : lien OU jeton d'un courriel (Q38)
-- ---------------------------------------------------------------------------
create or replace function public.get_carnet_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_contact_id uuid;
	v_contact record;
begin
	if p_token is null or char_length(p_token) not between 32 and 128 then
		return null;
	end if;

	v_contact_id := public.carnet_contact_by_token(p_token);
	if v_contact_id is null then
		return null;
	end if;

	select c.student_id, c.status, c.emails_stopped_at into v_contact
	from public.parent_contacts c
	where c.id = v_contact_id;

	if not found
		or v_contact.status <> 'confirmed'
		or not public.carnet_student_is_shared(v_contact.student_id) then
		return null;
	end if;

	update public.parent_carnet_links
	set access_count = access_count + 1, last_accessed_at = now()
	where contact_id = v_contact_id
		and revoked_at is null
		and expires_at > now();

	return public.carnet_payload(v_contact.student_id)
		|| jsonb_build_object('emails_stopped', v_contact.emails_stopped_at is not null);
end;
$$;

create or replace function public.set_parent_emails_stopped(p_token text, p_stopped boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_contact_id uuid;
begin
	if p_token is null or char_length(p_token) not between 32 and 128 or p_stopped is null then
		return false;
	end if;

	v_contact_id := public.carnet_contact_by_token(p_token);
	if v_contact_id is null then
		return false;
	end if;

	update public.parent_contacts c
	set emails_stopped_at = case when p_stopped then coalesce(c.emails_stopped_at, now()) end
	where c.id = v_contact_id
		and c.status = 'confirmed'
		-- Même porte que la lecture : un carnet fermé ne se trahit pas ici.
		and public.carnet_student_is_shared(c.student_id);

	return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Exceptions en cours (E1, E3)
-- ---------------------------------------------------------------------------
-- Pour chaque élève au partage ouvert qui a au moins une adresse confirmée :
--  - evaluation_missed : évaluation publiée qui lui est assignée (à lui ou à
--    une classe au carnet), échéance passée depuis moins de 7 jours, non faite
--    (une ligne par évaluation) ; si le réglage de la classe l'active ;
--  - reviews_overdue : la plus ancienne échéance dépassée d'une carte déjà vue
--    date de plus de N jours (Q24) ;
--  - inactivity : aucun jour actif sur les N derniers jours hors vacances
--    (aujourd'hui exclu du compte, compris dans la recherche), depuis la
--    rentrée ; moins de N jours de classe depuis la rentrée, ou année scolaire
--    inconnue → pas d'alerte.
-- Plusieurs classes au carnet : le seuil le plus court, l'alerte si une classe
-- la demande.
create or replace function public.carnet_current_exceptions()
returns table (student_id uuid, reason text, evaluation_id uuid)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
	v_today date := (now() at time zone 'Europe/Paris')::date;
	v_student record;
	v_year_id uuid;
	v_first_day date;
	v_oldest date;
	v_window_start date;
	v_days integer;
begin
	for v_student in
		select
			cm.student_id as sid,
			bool_or(s.evaluation_missed_alert) as eval_alert,
			min(s.overdue_reviews_days) as overdue_days,
			min(s.inactivity_days) as inactivity_days,
			array_agg(cm.class_id) as class_ids
		from public.class_members cm
		join public.classes k on k.id = cm.class_id and k.is_active
		join public.class_carnet_settings s on s.class_id = cm.class_id and s.enabled
		where cm.status = 'active'
			and exists (
				select 1 from public.parent_contacts pc
				where pc.student_id = cm.student_id and pc.status = 'confirmed'
			)
			and not exists (
				select 1 from public.student_carnet_opt_outs o where o.student_id = cm.student_id
			)
		group by cm.student_id
	loop
		-- Évaluations non faites à l'échéance
		if v_student.eval_alert then
			return query
			select v_student.sid, 'evaluation_missed'::text, e.id
			from public.evaluations e
			where e.status = 'published'
				and e.deadline < now()
				and e.deadline >= now() - interval '7 days'
				and exists (
					select 1 from public.evaluation_assignments ea
					where ea.evaluation_id = e.id
						and (ea.student_id = v_student.sid or ea.class_id = any (v_student.class_ids))
				)
				and not exists (
					select 1 from public.test_sessions ts
					where ts.evaluation_id = e.id
						and ts.user_id = v_student.sid
						and ts.completed_at is not null
				);
		end if;

		-- Révisions en retard depuis plus de N jours
		select min((st.next_review at time zone 'Europe/Paris')::date) into v_oldest
		from public.srs_card_stats st
		where st.user_id = v_student.sid
			and st.last_review is not null
			and (st.next_review at time zone 'Europe/Paris')::date < v_today;

		if v_oldest is not null and v_oldest < v_today - v_student.overdue_days then
			student_id := v_student.sid;
			reason := 'reviews_overdue';
			evaluation_id := null;
			return next;
		end if;

		-- Aucun jour actif sur les N derniers jours de classe
		select y.year_id, y.first_day into v_year_id, v_first_day
		from public.carnet_school_year(v_student.sid) y;

		select min(w.d), count(*) into v_window_start, v_days
		from (
			select gs::date as d
			from generate_series(v_today - 1, v_first_day, interval '-1 day') gs
			where not public.carnet_is_holiday(v_year_id, gs::date)
			order by gs desc
			limit v_student.inactivity_days
		) w;

		-- Année scolaire inconnue (classe sans école) : on ne connaît pas les
		-- vacances (E3), pas d'alerte d'inactivité. Aucune classe de la prod
		-- n'est dans ce cas (mesuré le 2026-11-16).
		if v_year_id is not null and v_days >= v_student.inactivity_days and not exists (
			select 1
			from public.skill_attempts a
			where a.student_id = v_student.sid
				and a.source in ('auto', 'srs', 'student_self')
				and a.place is distinct from 'evaluation'
				and a.created_at >= (v_window_start - 1)::timestamp at time zone 'UTC'
				and (a.created_at at time zone 'Europe/Paris')::date >= v_window_start
			group by (a.created_at at time zone 'Europe/Paris')::date
			having count(*) >= 5
		) then
			student_id := v_student.sid;
			reason := 'inactivity';
			evaluation_id := null;
			return next;
		end if;
	end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Épisodes : ouvrir et fermer (E2)
-- ---------------------------------------------------------------------------
-- Ouvre un épisode par (adresse qui reçoit les courriels, exception en cours)
-- s'il n'y en a pas d'ouvert ; ferme tout épisode ouvert dont l'exception a
-- disparu, ou dont l'adresse ne reçoit plus de courriels.
create or replace function public.carnet_sync_exception_episodes()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
	with
	cibles as (
		select pc.id as contact_id, x.student_id, x.reason, x.evaluation_id
		from public.carnet_current_exceptions() x
		join public.parent_contacts pc on pc.student_id = x.student_id
		where pc.status = 'confirmed'
			and pc.email is not null
			and pc.emails_stopped_at is null
	),
	fermees as (
		update public.parent_exception_episodes ep
		set closed_at = now()
		where ep.closed_at is null
			and not exists (
				select 1 from cibles c
				where c.contact_id = ep.contact_id
					and c.reason = ep.reason
					and c.evaluation_id is not distinct from ep.evaluation_id
			)
		returning ep.id
	)
	insert into public.parent_exception_episodes (contact_id, student_id, reason, evaluation_id)
	select c.contact_id, c.student_id, c.reason, c.evaluation_id
	from cibles c
	where not exists (
		select 1 from public.parent_exception_episodes ep
		where ep.closed_at is null
			and ep.contact_id = c.contact_id
			and ep.reason = c.reason
			and ep.evaluation_id is not distinct from c.evaluation_id
	);
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Ce qui part aujourd'hui (E3, E7, Q19, Q33)
-- ---------------------------------------------------------------------------
-- Un courriel par adresse qui a des épisodes ouverts non signalés, si :
--  - l'adresse est confirmée, reçoit les courriels, et le partage est ouvert (E7) ;
--  - aucun courriel d'exception ni trimestriel n'est PARTI vers elle depuis
--    7 jours (Q19, Q33 ; 6 j 12 h : le cron ne passe pas à la minute près) ;
--  - pendant les vacances (E3), seules les évaluations non faites partent.
-- Le courriel regroupe les épisodes encore ouverts : une exception résolue
-- entre-temps a été fermée par `carnet_sync_exception_episodes`.
-- ⚠️ Contrat avec le cron : envoyer ET journaliser les courriels de ce plan
-- AVANT de lire `carnet_quarterly_plan` ; sinon une adresse peut recevoir deux
-- courriels le même jour (Q19).
create or replace function public.carnet_exception_plan()
returns table (
	contact_id uuid,
	student_id uuid,
	email text,
	firstname text,
	reasons text[],
	episode_ids uuid[],
	overdue_days integer,
	inactivity_days integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
	v_today date := (now() at time zone 'Europe/Paris')::date;
begin
	return query
	with
	eligibles as (
		select pc.id, pc.student_id, pc.email,
			public.carnet_is_holiday(
				(select y.year_id from public.carnet_school_year(pc.student_id) y), v_today
			) as en_vacances
		from public.parent_contacts pc
		where pc.status = 'confirmed'
			and pc.email is not null
			and pc.emails_stopped_at is null
			and public.carnet_student_is_shared(pc.student_id)
			and not exists (
				select 1 from public.parent_notifications n
				where n.contact_id = pc.id
					and n.kind in ('exception', 'quarterly')
					and n.status = 'sent'
					and n.created_at > now() - interval '6 days 12 hours'
			)
	),
	ouverts as (
		select ep.id, ep.contact_id, ep.reason
		from public.parent_exception_episodes ep
		join eligibles e on e.id = ep.contact_id
		where ep.closed_at is null
			and ep.notified_at is null
			and (not e.en_vacances or ep.reason = 'evaluation_missed')
	)
	select
		e.id,
		e.student_id,
		e.email,
		p.firstname,
		array_agg(distinct o.reason order by o.reason),
		array_agg(o.id),
		(
			select min(s.overdue_reviews_days)
			from public.class_members cm
			join public.classes k on k.id = cm.class_id and k.is_active
			join public.class_carnet_settings s on s.class_id = cm.class_id and s.enabled
			where cm.student_id = e.student_id and cm.status = 'active'
		),
		(
			select min(s.inactivity_days)
			from public.class_members cm
			join public.classes k on k.id = cm.class_id and k.is_active
			join public.class_carnet_settings s on s.class_id = cm.class_id and s.enabled
			where cm.student_id = e.student_id and cm.status = 'active'
		)
	from ouverts o
	join eligibles e on e.id = o.contact_id
	join public.profiles p on p.id = e.student_id
	group by e.id, e.student_id, e.email, p.firstname;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Message trimestriel (E4, Q34)
-- ---------------------------------------------------------------------------
-- Pour chaque adresse qui reçoit les courriels, dans une classe dont le
-- réglage le demande : le dernier trimestre terminé (`academic_periods` de
-- l'année de l'élève) depuis 30 jours au plus, sans message trimestriel déjà
-- parti vers elle après sa fin. Hors vacances, et pas de courriel d'exception
-- ni trimestriel depuis 7 jours (plafond, Q19). Rend les adresses qui ont
-- quelque chose de VRAI à dire :
--  - regular : au moins un jour actif dans 2 semaines de classe sur 3 du
--    trimestre (semaine de classe = au moins 3 jours ouvrés hors vacances) ;
--  - reviews_up_to_date : au moins une carte déjà vue, aucune en retard.
create or replace function public.carnet_quarterly_plan()
returns table (
	contact_id uuid,
	student_id uuid,
	email text,
	firstname text,
	period_id uuid,
	regular boolean,
	reviews_up_to_date boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
	v_today date := (now() at time zone 'Europe/Paris')::date;
	v_contact record;
	v_year_id uuid;
	v_first_day date;
	v_period record;
	v_start date;
	v_class_weeks integer;
	v_active_weeks integer;
	v_regular boolean;
	v_reviews boolean;
begin
	for v_contact in
		select pc.id as cid, pc.student_id as sid, pc.email as mail, p.firstname as prenom
		from public.parent_contacts pc
		join public.profiles p on p.id = pc.student_id
		where pc.status = 'confirmed'
			and pc.email is not null
			and pc.emails_stopped_at is null
			and public.carnet_student_is_shared(pc.student_id)
			and exists (
				select 1
				from public.class_members cm
				join public.classes k on k.id = cm.class_id and k.is_active
				join public.class_carnet_settings s on s.class_id = cm.class_id and s.enabled
				where cm.student_id = pc.student_id and cm.status = 'active' and s.quarterly_message
			)
			and not exists (
				select 1 from public.parent_notifications n
				where n.contact_id = pc.id
					and n.kind in ('exception', 'quarterly')
					and n.status = 'sent'
					and n.created_at > now() - interval '6 days 12 hours'
			)
	loop
		select y.year_id, y.first_day into v_year_id, v_first_day
		from public.carnet_school_year(v_contact.sid) y;

		if v_year_id is null or public.carnet_is_holiday(v_year_id, v_today) then
			continue;
		end if;

		select ap.id, ap.start_date, ap.end_date into v_period
		from public.academic_periods ap
		where ap.school_year_id = v_year_id
			and ap.end_date < v_today
			and ap.end_date >= v_today - 30
		order by ap.end_date desc
		limit 1;

		if not found then
			continue;
		end if;

		if exists (
			select 1 from public.parent_notifications n
			where n.contact_id = v_contact.cid
				and n.kind = 'quarterly'
				and n.status = 'sent'
				and n.created_at >= (v_period.end_date + 1)::timestamp at time zone 'Europe/Paris'
		) then
			continue;
		end if;

		v_start := greatest(v_period.start_date, v_first_day);

		with
		jours_actifs as (
			select (a.created_at at time zone 'Europe/Paris')::date as day
			from public.skill_attempts a
			where a.student_id = v_contact.sid
				and a.source in ('auto', 'srs', 'student_self')
				and a.place is distinct from 'evaluation'
				and a.created_at >= (v_start - 1)::timestamp at time zone 'UTC'
				and (a.created_at at time zone 'Europe/Paris')::date between v_start and v_period.end_date
			group by day
			having count(*) >= 5
		),
		semaines as (
			select gs::date as w
			from generate_series(
				v_start - (extract(isodow from v_start)::integer - 1),
				v_period.end_date,
				interval '7 days'
			) gs
		),
		semaines_de_classe as (
			select s.w
			from semaines s
			where (
				select count(*)
				from generate_series(s.w, s.w + 4, interval '1 day') d
				where d::date between v_start and v_period.end_date
					and not public.carnet_is_holiday(v_year_id, d::date)
			) >= 3
		)
		select
			count(*),
			count(*) filter (where exists (
				select 1 from jours_actifs j where j.day >= sc.w and j.day < sc.w + 7
			))
		into v_class_weeks, v_active_weeks
		from semaines_de_classe sc;

		v_regular := v_class_weeks > 0 and 3 * v_active_weeks >= 2 * v_class_weeks;

		v_reviews := exists (
			select 1 from public.srs_card_stats st
			where st.user_id = v_contact.sid and st.last_review is not null
		) and not exists (
			select 1 from public.srs_card_stats st
			where st.user_id = v_contact.sid
				and st.last_review is not null
				and (st.next_review at time zone 'Europe/Paris')::date < v_today
		);

		if v_regular or v_reviews then
			contact_id := v_contact.cid;
			student_id := v_contact.sid;
			email := v_contact.mail;
			firstname := v_contact.prenom;
			period_id := v_period.id;
			regular := v_regular;
			reviews_up_to_date := v_reviews;
			return next;
		end if;
	end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Effacement des adresses (Q21, Q35)
-- ---------------------------------------------------------------------------
-- Pose `orphaned_since` (aujourd'hui, Paris) sur les adresses d'un élève qui
-- n'est membre actif d'aucune classe active, l'efface s'il est revenu, puis
-- efface les adresses orphelines depuis 90 jours : ligne entière (adresse,
-- empreinte), liens et épisodes par cascade ; le journal des courriels garde
-- ses lignes, sans adresse (contact_id à null). Rend le nombre d'adresses
-- effacées.
create or replace function public.carnet_erase_orphan_contacts()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_today date := (now() at time zone 'Europe/Paris')::date;
	v_erased integer;
begin
	update public.parent_contacts pc
	set orphaned_since = null
	where pc.orphaned_since is not null
		and exists (
			select 1 from public.class_members cm
			join public.classes c on c.id = cm.class_id
			where cm.student_id = pc.student_id and cm.status = 'active' and c.is_active
		);

	update public.parent_contacts pc
	set orphaned_since = v_today
	where pc.orphaned_since is null
		and not exists (
			select 1 from public.class_members cm
			join public.classes c on c.id = cm.class_id
			where cm.student_id = pc.student_id and cm.status = 'active' and c.is_active
		);

	delete from public.parent_contacts pc
	where pc.orphaned_since is not null
		and pc.orphaned_since <= v_today - 90;
	get diagnostics v_erased = row_count;

	return v_erased;
end;
$$;

-- ---------------------------------------------------------------------------
-- 12. Droits d'exécution
-- ---------------------------------------------------------------------------
-- Internes : appelées par les fonctions ci-dessus seulement.
revoke execute on function public.carnet_school_year(uuid) from public, anon, authenticated;
revoke execute on function public.carnet_is_holiday(uuid, date) from public, anon, authenticated;
revoke execute on function public.carnet_contact_by_token(text) from public, anon, authenticated;

-- Le cron (service role) seul.
revoke execute on function public.carnet_current_exceptions() from public, anon, authenticated;
revoke execute on function public.carnet_sync_exception_episodes() from public, anon, authenticated;
revoke execute on function public.carnet_exception_plan() from public, anon, authenticated;
revoke execute on function public.carnet_quarterly_plan() from public, anon, authenticated;
revoke execute on function public.carnet_erase_orphan_contacts() from public, anon, authenticated;
grant execute on function public.carnet_current_exceptions() to service_role;
grant execute on function public.carnet_sync_exception_episodes() to service_role;
grant execute on function public.carnet_exception_plan() to service_role;
grant execute on function public.carnet_quarterly_plan() to service_role;
grant execute on function public.carnet_erase_orphan_contacts() to service_role;

-- Inchangés (create or replace garde les droits) : get_carnet_by_token et
-- set_parent_emails_stopped restent au service role seul ; carnet_payload
-- reste interne.
