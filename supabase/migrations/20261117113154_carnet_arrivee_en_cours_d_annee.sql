-- Carnet de liaison : arrivée en cours d'année (Q43) et Q27 bornée à l'année
-- scolaire (chantier `partage-parents`, décisions de David du 2026-11-17).
--
-- Un élève arrivé en cours d'année était jugé depuis la rentrée de l'école :
-- fausse alerte d'inactivité, alerte pour une évaluation échue avant son
-- arrivée, semaines et évaluations d'avant son arrivée dans le carnet. Tout se
-- compte désormais depuis son arrivée dans une classe au carnet (la plus
-- ancienne de ses adhésions actives, `class_members.joined_at`). Une
-- évaluation sans échéance non faite, hors de la fenêtre de 5 semaines, ne
-- reste que si elle date de l'année scolaire en cours (créée au plus tôt un
-- mois avant la rentrée).
--
-- Question d'accès (tranchée par David le 2026-11-17) : personne ne lit rien
-- de nouveau. En miroir, le parent (et l'élève, même carnet) ne lit plus les
-- semaines et les évaluations échues d'avant l'arrivée de l'élève, ni les
-- évaluations sans échéance non faites d'une année passée.
--
-- Additive : deux corps de fonction remplacés, aucune table, aucune donnée.
-- `create or replace` garde les droits (carnet_payload interne,
-- carnet_current_exceptions au service role seul).
--
-- Rollback : rejouer, tels quels, les deux `create or replace function` de
-- 20261116215952_carnet_courriels_exception.sql : carnet_payload (lignes
-- 215-368) et carnet_current_exceptions (lignes 453-566). Signatures
-- identiques : les droits restent en place.

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
	-- Arrivée dans une classe au carnet (Q43) : la plus ancienne des adhésions actives
	v_joined timestamptz;
	v_result jsonb;
begin
	select y.year_id, y.first_day into v_year_id, v_first_day
	from public.carnet_school_year(p_student_id) y;

	select min(cm.joined_at) into v_joined
	from public.class_members cm
	join public.classes c on c.id = cm.class_id
	join public.class_carnet_settings s on s.class_id = cm.class_id
	where cm.student_id = p_student_id
		and cm.status = 'active'
		and c.is_active
		and s.enabled;

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
		-- Semaine qui touche la rentrée et l'arrivée de l'élève (Q43), ou après
		-- (greatest ignore une arrivée inconnue)
		where gs::date + 6 >= greatest(v_first_day, (v_joined at time zone 'Europe/Paris')::date)
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
	-- la régularité (Q14), mais pas échues avant l'arrivée de l'élève (Q43) ;
	-- une évaluation sans échéance de l'année scolaire en cours, si créée dans
	-- la fenêtre, ou tant qu'elle n'est pas faite (Q27, bornée le 2026-11-17).
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
				(
					e.deadline >= v_start::timestamp at time zone 'Europe/Paris'
					and e.deadline >= coalesce(v_joined, '-infinity'::timestamptz)
				)
				or (
					e.deadline is null
					and (
						e.created_at >= v_start::timestamp at time zone 'Europe/Paris'
						or (
							-- Non faite : seulement de l'année en cours (Q27 bornée). Un
							-- mois de marge avant la rentrée : le professeur prépare en
							-- été ; juin de l'année passée reste dehors.
							e.created_at >= (v_first_day - 31)::timestamp at time zone 'Europe/Paris'
							and not exists (
								select 1 from public.test_sessions ts
								where ts.evaluation_id = e.id
									and ts.user_id = p_student_id
									and ts.completed_at is not null
							)
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
			array_agg(cm.class_id) as class_ids,
			-- Arrivée dans une classe au carnet (Q43)
			min(cm.joined_at) as joined_at
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
				-- Échue avant son arrivée : pas un oubli de l'élève (Q43)
				and e.deadline >= v_student.joined_at
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
			-- Depuis la rentrée, et depuis l'arrivée de l'élève (Q43)
			from generate_series(
				v_today - 1,
				greatest(v_first_day, (v_student.joined_at at time zone 'Europe/Paris')::date),
				interval '-1 day'
			) gs
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
