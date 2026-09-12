-- Clôture de l'année 2025-2026 du Lycée Franco-Qatari Voltaire
-- ============================================================
--
-- ⚠️ MIGRATION QUI CHANGE DES DONNÉES. Validée explicitement par David le
-- 2026-09-14, après mesure de son effet.
--
-- POURQUOI. David a quitté cet établissement ; il enseigne désormais au Lycée
-- polyvalent Blaise Pascal. Les 77 élèves de Voltaire restaient inscrits comme
-- membres ACTIFS de classes qu'il ne suit plus. Cette clôture met la base en
-- accord avec la réalité.
--
-- EFFET MESURÉ en production avant écriture :
--   classes de l'année ............ 6  (dont 0 à fermer : déjà inactives)
--   adhésions à archiver .......... 77
--   élèves concernés .............. 77
--   participants de salon ......... 1  (sortira)
--   fiches de ces classes ......... 10 (déjà inaccessibles, classes fermées)
--
-- CE QUE LES 77 ÉLÈVES PERDENT, par les cinq volets déjà en production : les
-- fiches, les exercices, le Python, les notifications de classe, le salon de
-- groupe et les cartes kanban — pour ces classes-là.
--
-- CE QU'ILS GARDENT : leur compte, leur adresse, leurs 352 gidouilles, leurs
-- succès, leurs signalements d'erreur et les réponses reçues. Conserver et
-- donner accès sont deux décisions distinctes : la conservation court jusqu'au
-- 2031-06-30 (`school_years.purge_after`), conformément au registre des
-- traitements.
--
-- ⚠️ POURQUOI CE SQL PLUTÔT QU'UN APPEL À `close_school_year()`. Cette
-- fonction exige `is_admin()`, ce qui suppose un utilisateur AUTHENTIFIÉ. Une
-- migration s'exécute sans session : `auth.uid()` y est nul, et la fonction se
-- refuserait à elle-même. Le geste est donc reproduit ici à l'identique — même
-- ordre, même trace — avec `closed_by` à NULL, qui dit la vérité : cette
-- clôture vient d'une migration, pas d'un clic.
--
-- RÉVERSIBLE de la même manière que par la fonction : la trace enregistrée
-- ci-dessous permet à `reopen_school_year()` de restaurer exactement ces
-- lignes, et rien d'autre.
--
-- ROLLBACK MANUEL, si la fonction n'est pas utilisable :
--   update public.class_members set status = 'active'
--     where id = any (select unnest(class_member_ids) from public.school_year_closures
--                     where school_year_id = '481a379a-ccd3-4f8d-9181-1180c215fe3d');
--   delete from public.school_year_closures
--     where school_year_id = '481a379a-ccd3-4f8d-9181-1180c215fe3d';

do $$
declare
	v_annee uuid;
	v_classes uuid[];
	v_membres uuid[];
begin
	-- L'année est retrouvée par son école et son nom, pas par un identifiant en
	-- dur : une base locale reconstruite n'a pas les mêmes UUID.
	select sy.id into v_annee
	from public.school_years sy
	join public.schools s on s.id = sy.school_id
	where s.name like '%Voltaire%'
		and sy.name = '2025-2026';

	if v_annee is null then
		raise notice 'Année Voltaire 2025-2026 absente : rien à clôturer (base locale ou de test).';
		return;
	end if;

	if exists (select 1 from public.school_year_closures where school_year_id = v_annee) then
		raise notice 'Année déjà clôturée : rien à faire.';
		return;
	end if;

	with concernees as (
		select cm.id
		from public.class_members cm
		join public.classes c on c.id = cm.class_id
		where c.school_year_id = v_annee
			and cm.status = 'active'
	),
	archivees as (
		update public.class_members cm
		set status = 'archived'
		from concernees
		where cm.id = concernees.id
		returning cm.id
	)
	select coalesce(array_agg(id), array[]::uuid[]) into v_membres from archivees;

	with fermees as (
		update public.classes
		set is_active = false
		where school_year_id = v_annee
			and is_active
		returning id
	)
	select coalesce(array_agg(id), array[]::uuid[]) into v_classes from fermees;

	insert into public.school_year_closures (school_year_id, closed_by, class_ids, class_member_ids)
	values (v_annee, null, v_classes, v_membres);

	raise notice 'Voltaire 2025-2026 clôturée : % classe(s) fermée(s), % adhésion(s) archivée(s).',
		cardinality(v_classes), cardinality(v_membres);
end $$;
