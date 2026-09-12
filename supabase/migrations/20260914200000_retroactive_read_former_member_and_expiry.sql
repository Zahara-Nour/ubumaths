-- « Ancien membre » et extinction de la lecture rétroactive
-- ==========================================================
--
-- Deux décisions de David du 2026-09-14, sur le prédicat posé par
-- 20260914160000 puis borné par 20260914180000.
--
-- 1. « ANCIEN MEMBRE » N'EST PAS « ADHÉSION ARCHIVÉE ». Le prédicat testait
--    `cm.status = 'archived'`, une égalité. Conséquence absurde : un élève
--    resté ACTIF dans une classe fermée était plus mal loti qu'un camarade
--    archivé de la même classe — le premier ne relisait rien, le second si.
--
--    Rien ne cassait, parce que `close_school_year` archive toutes les
--    adhésions. Mais la règle tenait à cette coïncidence, et cette
--    configuration a réellement existé : les classes de Voltaire étaient déjà
--    désactivées AVANT que la clôture ne tourne. Pendant cette fenêtre, ces
--    élèves n'avaient ni accès courant (la classe est fermée) ni accès
--    rétroactif (l'adhésion était encore active). Le jour où une classe est
--    désactivée à la main sans clôture d'année, le trou revient en silence.
--
--    La règle devient : adhésion archivée OU classe fermée.
--
-- 2. LA LECTURE S'ÉTEINT. Rien ne l'arrêtait : un élève parti en 2026 aurait
--    relu ses fiches en 2031, jusqu'à la purge. Or la migration de clôture
--    (20260914090000) pose elle-même le principe : « conserver et donner accès
--    sont deux décisions distinctes ». Sans borne haute, la Phase 3
--    transformait en silence une conservation de cinq ans en accès permanent,
--    dans une école où le professeur n'enseigne plus.
--
--    Le besoin énoncé était « réviser en septembre ce qu'on a travaillé en
--    juin ». Douze mois après la fin de l'année le couvrent largement, l'été
--    suivant compris. La borne est calculée sur `school_years.end_date`, une
--    date fixe : elle ne dépend pas de l'existence d'une année suivante.
--
-- Accès — tranché par David avant écriture :
--   GAGNENT : les élèves restés actifs dans une classe fermée, qui relisent
--     désormais comme les archivés de la même classe. Mesuré en production :
--     0 adhésion dans ce cas aujourd'hui. La correction ferme un piège futur.
--   PERDENT : les anciens membres d'une année terminée depuis plus de douze
--     mois. Mesuré en production : 0 adhésion aujourd'hui. Les fiches
--     2025-2026 restent lisibles jusqu'au 2027-06-30, celles de 2026-2027
--     jusqu'au 2028-07-15.
--   Rien d'autre ne bouge : ni les écritures, ni la frontière d'école, ni la
--   borne basse du séjour.
--
-- Rollback : restaurer la définition de 20260914180000 (deux conditions à
-- retirer : `or not c.is_active` et la comparaison sur `sy.end_date`).

create or replace function public.had_class_access_to_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
	select exists (
		select 1
		from worksheet_assignment_classes wac
		join class_members cm on cm.class_id = wac.class_id
		join classes c on c.id = wac.class_id
		join school_years sy on sy.id = c.school_year_id
		join worksheet_assignments wa on wa.id = wac.assignment_id
		where wac.assignment_id = p_assignment_id
			and cm.student_id = auth.uid()
			-- Ancien membre : l'adhésion est archivée, OU la classe est fermée.
			-- Les deux disent la même chose — cet élève n'est plus en cours
			-- d'année dans cette classe — et une clôture peut n'en produire
			-- qu'une seule des deux.
			and (cm.status = 'archived' or not c.is_active)
			-- Distribuée pendant l'année de la classe…
			and coalesce(wa.available_from, wa.assigned_at, wa.created_at)::date
				between sy.start_date and sy.end_date
			-- …et après l'arrivée de l'élève dans cette classe.
			and coalesce(wa.available_from, wa.assigned_at, wa.created_at) >= cm.joined_at
			-- …et la relecture s'éteint douze mois après la fin de l'année.
			and sy.end_date >= (current_date - interval '12 months')
	);
$$;

comment on function public.had_class_access_to_assignment(uuid) is
	'Vrai si l''appelant est un ANCIEN membre (adhésion archivée ou classe fermée) d''une classe destinataire de cette affectation, distribuée pendant l''année de la classe et après son arrivée, l''année s''étant terminée il y a moins de douze mois. Sert uniquement à ouvrir la LECTURE rétroactive ; n''autorise aucune écriture.';

revoke all on function public.had_class_access_to_assignment(uuid) from public;
revoke all on function public.had_class_access_to_assignment(uuid) from anon;
grant execute on function public.had_class_access_to_assignment(uuid) to authenticated;
