-- Carnet de liaison : la régularité depuis la rentrée (chantier `carnet-heatmap`,
-- PR 2, décisions de David du 2026-11-17).
--
-- Le carnet montre la régularité en une rangée de cases, une par semaine,
-- comme une ligne de la grille du professeur (PR 1, #2786, en prod depuis
-- v0.94.0 : Zod accepte jusqu'à 53 semaines). `carnet_payload` rend désormais
-- les paliers depuis la semaine de la rentrée, ou de l'arrivée de l'élève si
-- elle est plus tardive (Q43), au plus 53 semaines. Les évaluations gardent
-- leur fenêtre de 5 semaines (Q14) ; les courriels sur exception
-- (`carnet_current_exceptions`) ne changent pas.
--
-- Année scolaire inconnue (classe sans école, ou école sans année active) :
-- `carnet_school_year` rend une rentrée par défaut (1er septembre) sans
-- vacances connues ; on garde alors 5 semaines (L3).
--
-- Question d'accès (tranchée par David le 2026-11-17, « je valide ») : le
-- détenteur d'un lien de parent, et l'élève dans « Mon carnet », lisent les
-- paliers de régularité de l'élève depuis la rentrée au lieu des 5 dernières
-- semaines. Rien d'autre ne s'ouvre : ni les jours, ni les notes, ni un autre
-- élève.
--
-- Additive : un corps de fonction remplacé, aucune table, aucune donnée.
-- Signature et type de retour (`jsonb`) inchangés : `create or replace` garde
-- les droits (carnet_payload reste interne), `db:types` n'est pas en jeu.
--
-- Rollback : rejouer, tel quel, le `create or replace function
-- public.carnet_payload` de 20261117113154_carnet_arrivee_en_cours_d_annee.sql
-- (lignes 27-198).

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
	-- Fenêtre des évaluations : 5 semaines (Q14), inchangée
	v_start date := v_monday - 28;
	-- Fenêtre de la régularité : depuis la rentrée (D2), calculée plus bas
	v_weeks_start date;
	v_year_id uuid;
	v_first_day date;
	-- Arrivée dans une classe au carnet (Q43) : la plus ancienne des adhésions actives
	v_joined timestamptz;
	v_result jsonb;
begin
	select y.year_id, y.first_day into v_year_id, v_first_day
	from public.carnet_school_year(p_student_id) y;

	-- Régularité depuis le lundi de la semaine de la rentrée, au plus 53
	-- semaines (L4). Année scolaire inconnue (classe sans école, ou école sans
	-- année active) : 5 semaines, comme avant (L3).
	if v_year_id is null then
		v_weeks_start := v_start;
	else
		v_weeks_start := greatest(
			v_first_day - (extract(isodow from v_first_day)::integer - 1),
			v_monday - 52 * 7
		);
	end if;

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
			and a.created_at >= (v_weeks_start - 1)::timestamp at time zone 'UTC'
			and (a.created_at at time zone 'Europe/Paris')::date >= greatest(v_weeks_start, v_first_day)
		group by day
		having count(*) >= 5
	),
	semaines as (
		select gs::date as week_start
		from generate_series(v_weeks_start, v_monday, interval '7 days') gs
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
	-- Évaluations : à venir, et passées dans une fenêtre de 5 semaines (Q14),
	-- distincte de celle de la régularité, mais pas échues avant l'arrivée de l'élève (Q43) ;
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
