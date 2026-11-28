-- Taux de réussite par point : comptes par élève et par modèle, faits par la
-- base (chantier `taux-par-point`, décision T1 de David le 2026-11-14)
--
-- Le widget « Taux de réussite » de l'analytique de la classe a besoin de
-- toutes les réponses corrigées de la classe depuis la rentrée. Les lire en
-- TypeScript (pages de 1000) est la lecture que `regularite-sql` a retirée de
-- la grille de régularité (outils-manquants n° 28). Cette fonction rend une
-- ligne par élève × modèle : quelques milliers au plus. Le regroupement par
-- point et par notion, la moyenne par élève et le seuil restent en TypeScript
-- (`class-success-rate.ts`).
--
-- Règles :
--   - prouvé = sources `auto` + `teacher` (l'appli ou un adulte a jugé) ; les
--     contrôles en font partie (lieu `evaluation`, source `auto`) ;
--   - déclaré = sources `srs` + `student_self` (l'élève a dit « je sais ») ;
--   - traces de modèle seulement (`template_id` non NULL ; le CHECK
--     `chk_attempt_family_regime` y garantit `success` non NULL) ;
--   - jour = jour de Paris, à partir de `p_first_day` (la rentrée) ;
--   - élèves membres `active` de la classe.
--
-- Accès : personne ne gagne rien. `security invoker` : la RLS de
-- `skill_attempts` et de `class_members` s'applique à l'appelant. Le prof ne
-- compte que les traces de ses élèves (`is_my_student`), qu'il lit déjà ; un
-- élève ne compte que les siennes ; `anon` n'a pas l'exécution.
--
-- Rollback :
--   drop function if exists public.class_template_success(uuid, date);

create or replace function public.class_template_success(
	p_class_id uuid,
	p_first_day date
)
returns table (
	student_id uuid,
	template_id uuid,
	proved_done integer,
	proved_succeeded integer,
	declared_done integer
)
language sql
stable
security invoker
set search_path = ''
as $$
	select
		a.student_id,
		a.template_id,
		(count(*) filter (where a.source in ('auto', 'teacher')))::integer as proved_done,
		(count(*) filter (where a.source in ('auto', 'teacher') and a.success))::integer
			as proved_succeeded,
		(count(*) filter (where a.source in ('srs', 'student_self')))::integer as declared_done
	from public.skill_attempts a
	join public.class_members cm
		on cm.student_id = a.student_id
		and cm.class_id = p_class_id
		and cm.status = 'active'
	where a.template_id is not null
		-- Un jour de marge : minuit à Paris tombe la veille en UTC (index)
		and a.created_at >= (p_first_day - 1)::timestamp at time zone 'UTC'
		and (a.created_at at time zone 'Europe/Paris')::date >= p_first_day
	group by a.student_id, a.template_id;
$$;

comment on function public.class_template_success(uuid, date) is
	'Taux de réussite par point : réponses prouvées (auto, teacher) faites et justes, réponses déclarées (srs, student_self), par élève actif de la classe et par modèle, depuis p_first_day (jour de Paris). Security invoker : RLS de l''appelant.';

revoke execute on function public.class_template_success(uuid, date) from public, anon;
grant execute on function public.class_template_success(uuid, date) to authenticated;
