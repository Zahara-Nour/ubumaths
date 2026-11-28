-- Grille de régularité comptée dans la base (outils-manquants n° 28, chantier
-- `regularite-sql`, phase 0 validée par David le 2026-11-12)
--
-- `getClassRegularityGrid` lisait toutes les traces autonomes de la classe depuis
-- la rentrée, par pages de 1000, à chaque ouverture de la grille. Cette fonction
-- rend directement les jours actifs par élève et par semaine : une ligne par
-- élève × semaine (≤ ~45 lignes par élève sur l'année).
--
-- Règles, identiques au calcul en TypeScript (`class-regularity.ts`) :
--   - travail autonome = sources `auto`, `srs`, `student_self`, hors lieu
--     `evaluation` ; une trace sans lieu compte (décision R6) ;
--   - jour = jour de Paris ; jour actif = au moins `p_min_traces` traces ;
--   - semaine = lundi → dimanche (lundi rendu dans `week_start`) ;
--   - jours à partir de `p_first_day` (la rentrée) ; élèves membres `active`
--     de la classe.
--
-- Accès : personne ne gagne rien. `security invoker` : la RLS de
-- `skill_attempts` et de `class_members` s'applique à l'appelant. Le prof ne
-- compte que les traces de ses élèves (`is_my_student`), qu'il lit déjà ; un
-- élève ne compte que les siennes ; `anon` n'a pas l'exécution.
--
-- Rollback :
--   drop function if exists public.class_regularity_weeks(uuid, date, integer);

create or replace function public.class_regularity_weeks(
	p_class_id uuid,
	p_first_day date,
	p_min_traces integer
)
returns table (student_id uuid, week_start date, active_days integer)
language sql
stable
security invoker
set search_path = ''
as $$
	with active_days as (
		select a.student_id, (a.created_at at time zone 'Europe/Paris')::date as day
		from public.skill_attempts a
		join public.class_members cm
			on cm.student_id = a.student_id
			and cm.class_id = p_class_id
			and cm.status = 'active'
		where a.source in ('auto', 'srs', 'student_self')
			and a.place is distinct from 'evaluation'
			-- Un jour de marge : minuit à Paris tombe la veille en UTC (index)
			and a.created_at >= (p_first_day - 1)::timestamp at time zone 'UTC'
			and (a.created_at at time zone 'Europe/Paris')::date >= p_first_day
		group by a.student_id, day
		having count(*) >= p_min_traces
	)
	select
		d.student_id,
		d.day - (extract(isodow from d.day)::integer - 1) as week_start,
		count(*)::integer as active_days
	from active_days d
	group by d.student_id, week_start;
$$;

comment on function public.class_regularity_weeks(uuid, date, integer) is
	'Grille de régularité : jours actifs (≥ p_min_traces traces autonomes, jour de Paris) par élève actif de la classe et par semaine (lundi), depuis p_first_day. Security invoker : RLS de l''appelant.';

revoke execute on function public.class_regularity_weeks(uuid, date, integer) from public, anon;
grant execute on function public.class_regularity_weeks(uuid, date, integer) to authenticated;
