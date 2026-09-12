-- L'élève archivé ne reçoit plus les notifications de la classe quittée
-- =====================================================================
--
-- Quatrième et dernier volet, après les fiches (20260912090000), les exercices
-- (20260912150000) et Python (20260912170000).
--
-- Le trou est double, et il n'est pas là où un inventaire par mot-clé le situe.
-- Les occurrences de `class_ids` dans les policies de `notifications`
-- désignent `target_class_ids`, la CIBLE de la notification — pas les classes
-- de l'élève. Le vrai contrôle d'accès lit `class_members` directement.
--
--   A. la policy « Users can view notifications targeting them » ne regardait
--      pas `cm.status` ;
--   B. `profiles.class_ids`, colonne dénormalisée qui alimente le filtre
--      applicatif de `getNotifications`, n'ignorait pas les adhésions
--      archivées — et surtout, AUCUN trigger ne se déclenchait sur UPDATE :
--      archiver un élève ne recalculait rien du tout, filtre ou pas. C'est le
--      trigger manquant qui rendait le reste inopérant.
--
-- QUI PERD QUOI : un élève dont l'adhésion est `archived` ne voit plus les
-- notifications adressées à cette classe. Ne changent pas : les notifications
-- qui le visent nommément, celles adressées à tous ou à son rôle, l'élève
-- actif, et le professeur.
--
-- ⚠️ LE PROFESSEUR N'EST PAS UN MEMBRE. `class_members` ne le concerne pas, et
-- un recalcul aveugle viderait son `class_ids` — que `getNotifications` lit
-- pour TOUT utilisateur, lui compris. Le trigger ne touche donc que la ligne
-- de l'élève concerné, et le rattrapage ci-dessous ne vise que les profils de
-- rôle `student`.
--
-- RATTRAPAGE : quatre élèves de production ont `class_ids` à `{}` — un tableau
-- VIDE, pas NULL (vérifié : zéro NULL en base, la colonne a un défaut `'{}'`)
-- alors qu'ils sont membres d'une classe. C'est l'inverse du trou, et tout
-- aussi silencieux : ils ne voient AUCUNE notification de classe. Rien n'est
-- perdu — la colonne est recalculée depuis `class_members`, sa source de
-- vérité, et le dry-run sur la production donne zéro identifiant retiré pour
-- les 81 élèves.
--
-- Préventif pour le reste au 2026-09-12 : 78 adhésions, toutes actives, donc
-- zéro élève perd un accès aujourd'hui.
--
-- ROLLBACK :
--   drop trigger sync_class_members_update on public.class_members;
--   puis rejouer la fonction et la policy sans la condition `status`.

-- A. Le contrôle d'accès.
drop policy if exists "Users can view notifications targeting them" on public.notifications;
create policy "Users can view notifications targeting them"
	on public.notifications
	for select
	-- Pas de `to authenticated` : en production les six policies de cette table
	-- sont en rôles `{public}`, et la branche `target_type = 'all'` ne demande
	-- aucune identité. Restreindre le rôle priverait un visiteur anonyme des
	-- annonces générales — un changement que personne n'a demandé. On ne touche
	-- ici QUE le filtre de statut.
	using (
		deleted_at is null
		and expires_at > now()
		and (
			target_type = 'all'
			or (
				target_type = 'role'
				and (select profiles.role::text from profiles where profiles.id = auth.uid())
					= any (target_roles)
			)
			or (
				target_type = 'classes'
				and exists (
					select 1 from class_members cm
					where cm.student_id = auth.uid()
						and cm.class_id = any (notifications.target_class_ids)
						and cm.status = 'active'
				)
			)
			or (target_type = 'users' and auth.uid() = any (target_user_ids))
			or created_by = auth.uid()
		)
	);

-- B. La synchronisation de la colonne dénormalisée.
create or replace function public.sync_class_members_to_class_ids()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
	v_student_id uuid;
	v_class_grade text;
begin
	v_student_id := coalesce(new.student_id, old.student_id);

	-- Seules les adhésions ACTIVES : `archived` = a quitté la classe.
	update profiles
	set class_ids = (
		-- `order by` : `is distinct from` sur un tableau compare l'ORDRE. Sans
		-- lui, un élève à deux classes pouvait être réécrit à contenu identique.
		select coalesce(array_agg(class_id order by class_id), array[]::uuid[])
		from class_members
		where student_id = v_student_id
			and status = 'active'
	)
	where id = v_student_id;

	-- Une adhésion réattribuée d'un élève à un autre : `coalesce` ne rend que le
	-- NOUVEAU. Sans ce bloc, l'ANCIEN garderait indéfiniment la classe qu'il
	-- vient de quitter — le trou même que cette migration ferme, rouvert par une
	-- autre porte. La clause WHEN du trigger prévoit ce cas.
	if tg_op = 'UPDATE' and old.student_id is distinct from new.student_id then
		update profiles
		set class_ids = (
			select coalesce(array_agg(class_id order by class_id), array[]::uuid[])
			from class_members
			where student_id = old.student_id
				and status = 'active'
		)
		where id = old.student_id;
	end if;

	-- On INSERT: also sync grade from the class to the student profile
	if tg_op = 'INSERT' then
		select grade into v_class_grade
		from classes
		where id = new.class_id;

		if v_class_grade is not null then
			update profiles
			set grade = v_class_grade
			where id = v_student_id
				and (grade is null or grade != v_class_grade);
		end if;
	end if;

	return coalesce(new, old);
end;
$function$;

-- Le trigger qui manquait. Sans lui, passer une adhésion à `archived` — un
-- UPDATE — ne déclenchait aucun recalcul : la colonne gardait la classe
-- quittée indéfiniment, et le filtre ajouté ci-dessus n'aurait jamais servi.
drop trigger if exists sync_class_members_update on public.class_members;
create trigger sync_class_members_update
	after update on public.class_members
	for each row
	when (
		old.status is distinct from new.status
		or old.class_id is distinct from new.class_id
		or old.student_id is distinct from new.student_id
	)
	execute function public.sync_class_members_to_class_ids();

-- RATTRAPAGE, limité aux ÉLÈVES pour ne pas vider le `class_ids` des
-- professeurs, qui ne vient pas de `class_members`.
update public.profiles p
set class_ids = (
	select coalesce(array_agg(cm.class_id order by cm.class_id), array[]::uuid[])
	from public.class_members cm
	where cm.student_id = p.id
		and cm.status = 'active'
)
where p.role = 'student'
	and coalesce(p.class_ids, array[]::uuid[]) is distinct from (
		select coalesce(array_agg(cm.class_id order by cm.class_id), array[]::uuid[])
		from public.class_members cm
		where cm.student_id = p.id
			and cm.status = 'active'
	);

comment on function public.sync_class_members_to_class_ids() is
	'Recalcule profiles.class_ids depuis les adhésions ACTIVES. Déclenchée sur INSERT, UPDATE (statut/classe/élève) et DELETE.';
