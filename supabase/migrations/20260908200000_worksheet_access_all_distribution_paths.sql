-- ============================================================================
-- L'accès élève à une fiche ignorait deux des trois voies de distribution
-- ============================================================================
-- `student_has_worksheet_access` ne connaissait que la colonne HISTORIQUE
-- `worksheet_assignments.class_id`. Or la création d'une affectation n'y écrit
-- que la première classe :
--
--     class_id: classIds[0] || null   -- api/worksheets/[id]/assignments/+server.ts
--
-- Les classes suivantes vivent dans `worksheet_assignment_classes`, et les
-- élèves nommément désignés dans `worksheet_assignment_students`. Pour eux, la
-- fonction répondait FAUX.
--
-- CONSÉQUENCE, plus large que les liens du cahier de texte : cette fonction
-- garde les policies SELECT de `worksheets`, `worksheet_exercises` et
-- `worksheet_sections`. Une fiche distribuée à deux classes n'était donc
-- lisible que par la première — elle n'apparaissait même pas dans la liste des
-- fiches de l'élève, puisque `/api/student/worksheets` fait un `worksheets!inner`.
-- Une distribution purement individuelle n'était lisible par personne.
--
-- Incohérence patente : la policy de `worksheet_assignments`, elle, couvre
-- déjà les trois voies (via `is_in_assigned_class` et `has_individual_assignment`).
-- L'élève voyait donc la ligne d'affectation sans pouvoir lire la fiche.
--
-- QUESTION D'ACCÈS : cette migration ÉLARGIT délibérément un accès. Elle ne
-- l'élargit pas au-delà de ce que `worksheet_assignments` accorde déjà : mêmes
-- trois voies, mêmes conditions (`status='active'`, `available_from`,
-- `classes.is_active`), même épinglage de `auth.uid()` dans CHACUNE. Un élève
-- n'obtient que les fiches qu'un professeur lui a effectivement distribuées.
--
-- Les conditions de la voie historique sont reprises À L'IDENTIQUE, sans
-- resserrement opportuniste (pas de filtre ajouté sur `class_members.status`,
-- que ni cette fonction ni `is_in_assigned_class` n'appliquaient) : retirer un
-- accès existant serait un autre changement, qui mérite sa propre décision.
--
-- ÉTAT EN PROD AU MOMENT DE L'ÉCRITURE : 11 affectations, toutes pourvues d'un
-- `class_id`, aucune classe hors colonne historique, une affectation
-- individuelle dont l'élève est aussi membre de la classe. Personne n'était
-- donc affecté ; le défaut se serait déclenché à la première distribution
-- multi-classes ou hors-classe.
--
-- ROLLBACK : recréer la version à une seule voie depuis
--   supabase/migrations/20260616220000_baseline_schema.sql (ligne ~18826).
-- ============================================================================

create or replace function public.student_has_worksheet_access(p_worksheet_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
	select exists (
		select 1
		from worksheet_assignments wa
		where wa.worksheet_id = p_worksheet_id
			and wa.status = 'active'
			and (wa.available_from is null or wa.available_from <= now())
			and (
				-- Voie 1 — colonne historique (la première classe, ou une
				-- affectation créée avant la jonction).
				exists (
					select 1
					from class_members cm
					join classes c on c.id = cm.class_id
					where cm.class_id = wa.class_id
						and cm.student_id = auth.uid()
						and c.is_active
				)
				-- Voie 2 — jonction multi-classes.
				or exists (
					select 1
					from worksheet_assignment_classes wac
					join class_members cm on cm.class_id = wac.class_id
					join classes c on c.id = wac.class_id
					where wac.assignment_id = wa.id
						and cm.student_id = auth.uid()
						and c.is_active
				)
				-- Voie 3 — élève nommément désigné. Pas de condition de classe :
				-- c'est précisément le cas d'un élève hors classe.
				or exists (
					select 1
					from worksheet_assignment_students was
					where was.assignment_id = wa.id
						and was.student_id = auth.uid()
				)
			)
	);
$$;

comment on function public.student_has_worksheet_access(uuid) is
	'Vrai si l''élève connecté a une distribution active de cette fiche, par l''une des TROIS voies : colonne historique worksheet_assignments.class_id, jonction worksheet_assignment_classes, ou désignation individuelle worksheet_assignment_students. Aligne la lecture du CONTENU (worksheets, worksheet_exercises, worksheet_sections) sur ce que la policy de worksheet_assignments accorde déjà.';

-- L'ACL est déjà correcte depuis la remédiation d'août (ni anon ni PUBLIC) ;
-- `create or replace` la conserve. On la réaffirme quand même : cette fonction
-- est SECURITY DEFINER, c'est-à-dire exactement la catégorie que le baseline
-- avait ouverte à `anon` par `ALTER DEFAULT PRIVILEGES`.
revoke all on function public.student_has_worksheet_access(uuid) from public;
revoke all on function public.student_has_worksheet_access(uuid) from anon;
grant execute on function public.student_has_worksheet_access(uuid) to authenticated;
