-- ============================================================================
-- La voie 1 cesse de décider de l'accès aux fiches (temps 1/2)
-- ============================================================================
-- Une fiche atteint un élève par trois chemins :
--
--   voie 1 — `worksheet_assignments.class_id`, colonne HISTORIQUE ;
--   voie 2 — `worksheet_assignment_classes`, la jonction ;
--   voie 3 — `worksheet_assignment_students`, l'élève nommément désigné.
--
-- Ce ne sont pas trois mécanismes : depuis la distribution multi-classes,
-- l'API écrit TOUTES les classes dans la jonction — première comprise — et
-- recopie la première dans la colonne « pour compatibilité » :
--
--     class_id: classIds[0] || null   -- api/worksheets/[id]/assignments/+server.ts
--
-- La voie 1 ne dit donc rien que la voie 2 ne dise déjà. C'est une redondance,
-- et c'est elle qui a produit le bug du 2026-09-08 : la fonction d'accès ne
-- lisait que la colonne, quand la création remplissait surtout la jonction.
--
-- ÉTAT EN PROD (2026-09-11) : 11 affectations, 11 lignes de jonction, **zéro**
-- affectation à `class_id` sans jonction. Retirer la voie 1 ne retire donc
-- aucun accès. Le garde-fou du §5 le revérifie à l'application.
--
-- ---------------------------------------------------------------------------
-- CE QUE CETTE MIGRATION RÉPARE, au-delà du ménage
-- ---------------------------------------------------------------------------
-- `student_has_exercise_access(uuid)` garde la policy « Students can view
-- assigned exercises » sur `exercises`. Elle joignait `class_members` sur
-- `wa.class_id` — la voie 1 SEULE. La correction du 2026-09-08 avait étendu
-- `student_has_worksheet_access` aux trois voies et, à travers elle, les
-- policies de `worksheets`, `worksheet_exercises` et `worksheet_sections` —
-- mais cette fonction-ci est passée à travers.
--
-- Conséquence, déjà en production : un élève atteint par la voie 2 ou 3 ouvre
-- la fiche et voit ses sections, mais AUCUN énoncé. Une fiche vide, sans
-- message. Invisible chez le professeur unique tant qu'il ne distribue qu'à une
-- classe à la fois.
--
-- ⚠️ `student_has_exercise_access` est SURCHARGÉE — deux signatures, `(uuid)` et
-- `(uuid, uuid)`. Seule la première est reprise ici. Le générateur de types
-- saute les fonctions surchargées : leur absence de `database.ts` ne dit rien
-- de leur existence.
--
-- QUESTION D'ACCÈS (posée et tranchée avec David) : **un élève atteint par la
-- voie 2 ou la voie 3 pourra lire les EXERCICES de la fiche.** Il lisait déjà la
-- fiche elle-même, ses sections et son affectation — c'est l'incohérence qu'on
-- répare. Aucun autre élargissement : mêmes voies, mêmes conditions
-- (`status='active'`, `available_from`, `classes.is_active`), `auth.uid()`
-- épinglé dans chacune. Personne ne perd rien.
--
-- ---------------------------------------------------------------------------
-- CE QUI RESTE HORS PÉRIMÈTRE, ET POURQUOI LE TEMPS 2 EST BLOQUÉ
-- ---------------------------------------------------------------------------
-- L'attribution des gidouilles de signalement d'erreur lit encore
-- `worksheet_assignments.class_id` pour savoir DANS QUELLE CLASSE créditer
-- l'élève (api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]).
-- Décision de David : hors périmètre, traité à part.
--
-- ⚠️ **PRÉREQUIS DU TEMPS 2** : tant que ce code lit la colonne, elle ne peut
-- pas être supprimée. À traiter avant tout `DROP COLUMN`.
--
-- NON DESTRUCTIVE : aucune colonne supprimée, aucune donnée touchée. La colonne
-- reste écrite et lisible ; elle cesse seulement de DÉCIDER.
--
-- ROLLBACK : restaurer les trois fonctions et la policy depuis
--   supabase/migrations/20260908200000_worksheet_access_all_distribution_paths.sql
--   et 20260616220000_baseline_schema.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. L'accès à une FICHE : les deux voies qui restent
-- ---------------------------------------------------------------------------
create or replace function public.student_has_worksheet_access(p_worksheet_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
	select exists (
		select 1
		from worksheet_assignments wa
		where wa.worksheet_id = p_worksheet_id
			and wa.status = 'active'
			and (wa.available_from is null or wa.available_from <= now())
			and (
				-- Par la classe — la jonction porte TOUTES les classes de
				-- l'affectation, la première comprise.
				exists (
					select 1
					from worksheet_assignment_classes wac
					join class_members cm on cm.class_id = wac.class_id
					join classes c on c.id = wac.class_id
					where wac.assignment_id = wa.id
						and cm.student_id = auth.uid()
						and c.is_active
				)
				-- Par désignation nominale. Pas de condition de classe : c'est
				-- précisément le cas de l'élève hors classe.
				or exists (
					select 1
					from worksheet_assignment_students was
					where was.assignment_id = wa.id
						and was.student_id = auth.uid()
				)
			)
	);
$function$;

comment on function public.student_has_worksheet_access(uuid) is
	'Un élève a-t-il accès à cette fiche ? Par la jonction des classes ou par désignation nominale. La colonne historique class_id ne décide plus.';

-- ---------------------------------------------------------------------------
-- 2. L'accès aux EXERCICES d'une fiche — la correction
-- ---------------------------------------------------------------------------
-- Déléguée à la fonction ci-dessus plutôt que réécrite : dupliquer les deux
-- voies ici, c'était garantir qu'elles divergent — ce qui est EXACTEMENT ce qui
-- s'est produit, cette fonction étant restée sur la voie 1 quand l'autre passait
-- aux trois.
create or replace function public.student_has_exercise_access(p_exercise_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
	select exists (
		select 1
		from worksheet_exercises we
		where we.exercise_id = p_exercise_id
			and public.student_has_worksheet_access(we.worksheet_id)
	);
$function$;

comment on function public.student_has_exercise_access(uuid) is
	'Un élève a-t-il accès à cet exercice via une fiche qui lui est distribuée ? Délègue à student_has_worksheet_access pour qu''il n''existe qu''UNE définition des voies d''accès.';

-- ---------------------------------------------------------------------------
-- 3. L'accès à une AFFECTATION
-- ---------------------------------------------------------------------------
-- Couvrait déjà les trois voies : on retire la branche redondante, rien d'autre.
-- Le professeur créateur garde son accès inconditionnel.
create or replace function public.can_access_assignment(p_assignment_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
	v_user_id UUID;
BEGIN
	v_user_id := auth.uid();

	RETURN EXISTS (
		SELECT 1 FROM public.worksheet_assignments wa
		WHERE wa.id = p_assignment_id
		AND (
			-- Le créateur, toujours.
			wa.created_by = v_user_id
			OR (
				wa.status = 'active'
				AND (wa.available_from IS NULL OR wa.available_from <= NOW())
				AND (
					EXISTS (
						SELECT 1 FROM public.worksheet_assignment_classes wac
						JOIN public.class_members cm ON cm.class_id = wac.class_id
						JOIN public.classes c ON c.id = wac.class_id
						WHERE wac.assignment_id = wa.id
						AND cm.student_id = v_user_id
						AND c.is_active = TRUE
					)
					OR EXISTS (
						SELECT 1 FROM public.worksheet_assignment_students was
						WHERE was.assignment_id = wa.id
						AND was.student_id = v_user_id
					)
				)
			)
		)
	);
EXCEPTION
	WHEN OTHERS THEN
		RETURN FALSE;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. La policy : retirer le test redondant
-- ---------------------------------------------------------------------------
-- Elle testait `is_in_assigned_class(id)` ET, en plus, `class_members` sur
-- `worksheet_assignments.class_id` — la même information, deux fois.
drop policy if exists "Students can view their assignments" on public.worksheet_assignments;
create policy "Students can view their assignments"
	on public.worksheet_assignments for select
	to authenticated
	using (
		status = 'active'
		and (available_from is null or available_from <= now())
		and (public.is_in_assigned_class(id) or public.has_individual_assignment(id))
	);

-- ---------------------------------------------------------------------------
-- 5. Garde-fou
-- ---------------------------------------------------------------------------
-- ⚠️ Placé APRÈS les `create or replace`, son `raise` ne les annule que si le
-- fichier tourne dans une transaction — ce que fait `supabase db push`. Appliqué
-- instruction par instruction depuis un éditeur SQL, les fonctions seraient déjà
-- remplacées et l'échec n'annulerait rien.
-- Une affectation qui n'aurait QUE la colonne historique perdrait son accès.
-- Il n'en existe aucune — mais c'est à l'application de le vérifier, pas à moi
-- de le parier sur un constat vieux de quelques heures.
do $$
declare
	v_orphelines integer;
begin
	-- Le prédicat qui compte est « class_id ABSENT DE la jonction », pas « aucune
	-- ligne de jonction ». Une affectation dont la jonction vise B et C mais dont
	-- la colonne vaut A ferait perdre l'accès aux élèves de A — et un test sur la
	-- seule présence de lignes répondrait « tout va bien ».
	--
	-- Ce n'est pas théorique : le PATCH d'une affectation écrit la jonction puis,
	-- SEULEMENT APRÈS, la colonne, en trois allers-retours non transactionnels
	-- (api/worksheets/assignments/[assignmentId]/+server.ts:300, :313, :330). Un
	-- échec entre les deux laisse exactement cet état.
	select count(*) into v_orphelines
	from public.worksheet_assignments wa
	where wa.class_id is not null
		and not exists (
			select 1 from public.worksheet_assignment_classes wac
			where wac.assignment_id = wa.id
				and wac.class_id = wa.class_id
		);

	if v_orphelines > 0 then
		raise exception
			'% affectation(s) ont un class_id absent de leur jonction : retirer la voie 1 ferait perdre l''accès aux élèves de cette classe. Recopier class_id dans worksheet_assignment_classes avant de rejouer.',
			v_orphelines;
	end if;
end;
$$;
