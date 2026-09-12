-- Clôturer une année scolaire
-- ===========================
--
-- Phase 2 de la bascule d'année. Le geste que les cinq volets « élève
-- archivé » ont rendu possible, et qui n'existait nulle part : AUCUN code
-- n'écrivait jamais `class_members.status = 'archived'`. Le statut existait,
-- tout le monde le respectait, et rien ne le posait.
--
-- CETTE MIGRATION NE CHANGE RIEN PAR ELLE-MÊME. Elle crée deux fonctions, une
-- table de trace et une colonne dérivée ; c'est leur APPEL qui agit.
--
-- ⚠️ LA RÉVERSIBILITÉ SE MÉMORISE, ELLE NE SE DÉDUIT PAS. Une première version
-- rouvrait « toutes les classes inactives de l'année ». Sur les données
-- réelles, les six classes de Voltaire 2025-2026 étaient DÉJÀ inactives avant
-- toute clôture : la réouverture en aurait ouvert six que personne n'avait
-- fermées, écrasant des décisions prises classe par classe. D'où
-- `school_year_closures`, qui enregistre exactement ce que la clôture a
-- touché — et qui sert au passage de trace pour le registre des traitements.
--
-- LES CASCADES. Archiver une adhésion réveille trois triggers écrits ce jour :
-- sortie du salon de classe, nettoyage des cartes kanban, recalcul de
-- `profiles.class_ids`. Ils sont AFTER … FOR EACH ROW, donc mis en file et
-- exécutés à la FIN de l'instruction : quand le premier s'exécute, toutes les
-- lignes sont déjà archivées, ce qui rend le recalcul correct pour un élève
-- inscrit dans deux classes de la même année. Ne pas convertir en
-- `for each statement` sans revoir ce point.
--
-- AUCUN BLOC `exception` ICI, VOLONTAIREMENT. PostgREST enveloppe l'appel dans
-- une transaction ; sans sous-transaction, toute erreur annule tout, effets de
-- triggers compris. Ajouter un `exception when others`, même pour journaliser,
-- casserait cette garantie.
--
-- RÉSERVÉ À L'ADMINISTRATION — mais ce n'est pas une frontière de sécurité :
-- la policy `teachers_update_members` permet déjà à un professeur d'archiver
-- les adhésions UNE PAR UNE. La garde distingue le geste en masse du geste
-- unitaire, et impose un humain nommé derrière une bascule qui touche une
-- promotion entière.
--
-- ROLLBACK :
--   drop function public.close_school_year(uuid);
--   drop function public.reopen_school_year(uuid);
--   drop table public.school_year_closures;
--   alter table public.school_years drop column purge_after;

-- ============================================================================
-- L'échéance de conservation : DÉRIVÉE, pas posée
-- ============================================================================
--
-- Une échéance qu'un geste d'exploitation pose et qu'une réouverture efface
-- n'est pas une durée de conservation : elle vaut pour toutes les années,
-- clôturées ou non, parce qu'elle découle du registre des traitements
-- (« scolarité + 5 ans ») et non d'une manipulation.
--
-- ⚠️ ELLE N'APPLIQUE RIEN. Le 30 juin 2031, cette date passera et il ne se
-- passera rien. C'est un repère, pas une purge — supprimer des données
-- d'élèves ne doit pas s'exécuter tout seul. Le rapport d'échéances reste à
-- faire.
alter table public.school_years
	add column if not exists purge_after date
	generated always as ((end_date + interval '5 years')::date) stored;

comment on column public.school_years.purge_after is
	'Échéance de conservation DÉRIVÉE de end_date (+5 ans, registre des traitements). Repère, non appliqué : rien ne purge automatiquement.';

-- ============================================================================
-- La trace de ce qu'une clôture a réellement changé
-- ============================================================================
create table if not exists public.school_year_closures (
	school_year_id uuid primary key references public.school_years(id) on delete cascade,
	closed_at timestamptz not null default now(),
	closed_by uuid references public.profiles(id) on delete set null,
	class_ids uuid[] not null,
	class_member_ids uuid[] not null
);

comment on table public.school_year_closures is
	'Ce qu''une clôture d''année a effectivement fermé. La réouverture ne restaure que ces lignes-là : sans cette mémoire, elle rouvrirait aussi ce qui était déjà fermé pour d''autres raisons.';

alter table public.school_year_closures enable row level security;

create policy "Admins manage school year closures"
	on public.school_year_closures
	for all
	to authenticated
	using (public.is_admin())
	with check (public.is_admin());

-- ============================================================================
-- Clôturer
-- ============================================================================
create or replace function public.close_school_year(p_school_year_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
	v_classes uuid[];
	v_membres uuid[];
begin
	-- Les cascades touchent trois tables par adhésion ; le rôle `authenticated`
	-- est plafonné à 8 s, ce qui pourrait être court sur une grosse promotion.
	set local statement_timeout = '60s';

	if not public.is_admin() then
		raise exception 'closing a school year requires admin privileges'
			using errcode = '42501';
	end if;

	perform 1 from public.school_years where id = p_school_year_id;
	if not found then
		raise exception 'unknown school year %', p_school_year_id
			using errcode = '22023';
	end if;

	if exists (select 1 from public.school_year_closures where school_year_id = p_school_year_id) then
		raise exception 'school year % is already closed — reopen it first', p_school_year_id
			using errcode = '22023';
	end if;

	with concernees as (
		select cm.id
		from public.class_members cm
		join public.classes c on c.id = cm.class_id
		where c.school_year_id = p_school_year_id
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
		where school_year_id = p_school_year_id
			and is_active
		returning id
	)
	select coalesce(array_agg(id), array[]::uuid[]) into v_classes from fermees;

	insert into public.school_year_closures (school_year_id, closed_by, class_ids, class_member_ids)
	values (p_school_year_id, auth.uid(), v_classes, v_membres);

	return jsonb_build_object(
		'classes_fermees', cardinality(v_classes),
		'adhesions_archivees', cardinality(v_membres)
	);
end;
$function$;

comment on function public.close_school_year(uuid) is
	'Ferme les classes ENCORE ouvertes d''une année et archive leurs adhésions ACTIVES, en mémorisant lesquelles. Les comptes demeurent. Réservé à l''administration.';

-- ============================================================================
-- Rouvrir — exactement ce que la clôture avait changé, rien d'autre
-- ============================================================================
create or replace function public.reopen_school_year(p_school_year_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
	v_trace public.school_year_closures%rowtype;
	v_classes integer;
	v_membres integer;
begin
	set local statement_timeout = '60s';

	if not public.is_admin() then
		raise exception 'reopening a school year requires admin privileges'
			using errcode = '42501';
	end if;

	select * into v_trace
	from public.school_year_closures
	where school_year_id = p_school_year_id;

	if not found then
		raise exception 'school year % was never closed — nothing to reopen', p_school_year_id
			using errcode = '22023';
	end if;

	update public.classes
	set is_active = true
	where id = any (v_trace.class_ids);
	get diagnostics v_classes = row_count;

	update public.class_members
	set status = 'active'
	where id = any (v_trace.class_member_ids);
	get diagnostics v_membres = row_count;

	delete from public.school_year_closures where school_year_id = p_school_year_id;

	return jsonb_build_object(
		'classes_rouvertes', v_classes,
		'adhesions_reactivees', v_membres
	);
end;
$function$;

comment on function public.reopen_school_year(uuid) is
	'Annule une clôture en restaurant EXACTEMENT ce qu''elle avait changé. Refuse si l''année n''a jamais été clôturée.';

-- `pg_default_acl` accorde encore `anon=X` sur toute fonction nouvelle : les
-- révocations ci-dessous ne sont pas redondantes.
revoke execute on function public.close_school_year(uuid) from public;
revoke execute on function public.close_school_year(uuid) from anon;
revoke execute on function public.reopen_school_year(uuid) from public;
revoke execute on function public.reopen_school_year(uuid) from anon;
grant execute on function public.close_school_year(uuid) to authenticated;
grant execute on function public.reopen_school_year(uuid) to authenticated;
