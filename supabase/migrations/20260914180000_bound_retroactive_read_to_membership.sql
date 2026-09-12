-- Referme can_read_assignment, et borne la lecture au séjour de l'élève
-- =====================================================================
--
-- Deux défauts de la migration 20260914160000, trouvés à l'audit avant sa mise
-- en production.
--
-- 1. `can_read_assignment` était STRICTEMENT PLUS PERMISSIVE que ce que son
--    commentaire promettait. Elle se contentait de
--    `can_access_assignment(...) or had_class_access_to_assignment(...)`, or ce
--    second terme ne vérifie ni `wa.status = 'active'` ni
--    `available_from <= now()`. Les deux autres chemins de lecture, eux, les
--    vérifient. Un ancien membre pouvait donc relire une affectation en
--    BROUILLON, ou une affectation programmée pour plus tard — c'est-à-dire des
--    fiches que personne n'a jamais reçues. Vérifié par exécution sur la base
--    locale avant correction.
--
--    La fonction n'a aujourd'hui aucun appelant : le trou n'a jamais été
--    atteignable. Mais elle allait en recevoir un à l'étape suivante, et elle y
--    serait arrivée trouée.
--
-- 2. La borne du séjour manquait. Le commentaire de 20260914160000 disait que
--    `class_members` ne date pas l'archivage — exact pour la borne HAUTE, mais
--    la table porte bien `joined_at`, et la borne BASSE était donc absente. Un
--    élève arrivé en mai, archivé en juin, relisait tout ce que la classe avait
--    reçu depuis septembre. La promesse écrite est « relire ce qui lui AVAIT
--    ÉTÉ DISTRIBUÉ » : elle est plus étroite que ce que le code appliquait.
--
-- Accès : cette migration RESTREINT, elle n'ouvre rien. Elle retire de la
-- lecture rétroactive (a) les affectations en brouillon ou pas encore
-- disponibles, (b) les fiches distribuées avant l'arrivée de l'élève dans la
-- classe. Personne ne gagne d'accès. En production aujourd'hui, aucune
-- affectation n'est concernée : la 20260914160000 n'y est pas encore appliquée.
--
-- Rollback : restaurer les deux définitions de la migration 20260914160000.

-- La borne basse : la fiche doit avoir été distribuée pendant que l'élève
-- était dans la classe, pas seulement pendant l'année de la classe.
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
			and cm.status = 'archived'
			-- Distribuée pendant l'année de la classe…
			and coalesce(wa.available_from, wa.assigned_at, wa.created_at)::date
				between sy.start_date and sy.end_date
			-- …et après l'arrivée de l'élève dans cette classe.
			and coalesce(wa.available_from, wa.assigned_at, wa.created_at) >= cm.joined_at
	);
$$;

revoke all on function public.had_class_access_to_assignment(uuid) from public;
revoke all on function public.had_class_access_to_assignment(uuid) from anon;
grant execute on function public.had_class_access_to_assignment(uuid) to authenticated;

-- Le pendant lecture porte désormais les mêmes gardes que les deux autres
-- chemins : statut actif et disponibilité échue. Ce n'est plus une simple
-- disjonction, sans quoi le nom « pendant de can_access_assignment » ment.
create or replace function public.can_read_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
	select public.can_access_assignment(p_assignment_id)
		or exists (
			select 1
			from worksheet_assignments wa
			where wa.id = p_assignment_id
				and wa.status = 'active'
				and (wa.available_from is null or wa.available_from <= now())
				and public.had_class_access_to_assignment(wa.id)
		);
$$;

comment on function public.can_read_assignment(uuid) is
	'Pendant LECTURE de can_access_assignment : y ajoute l''ancien membre archivé, sous les mêmes gardes de statut et de disponibilité. À n''utiliser que sur des chemins de lecture — can_access_assignment reste le garde des écritures.';

revoke all on function public.can_read_assignment(uuid) from public;
revoke all on function public.can_read_assignment(uuid) from anon;
grant execute on function public.can_read_assignment(uuid) to authenticated;
