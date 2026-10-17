-- Signalement d'erreur sur une fiche : les champs du prof restent au prof
-- ======================================================================
--
-- Constat I4 de l'audit RGPD, élargi le 2026-10-13 : la RLS de worksheet_error_reports
-- laisse l'élève écrire reviewed_by (l'identifiant d'un autre élève bloquait la
-- suppression de son compte) et, à la création, fixer lui-même status, reviewed_at et
-- response — un signalement « traité par le prof » forgé. À la modification de son
-- signalement en attente, il peut aussi changer reviewed_at et response.
--
-- Décision de David (2026-10-13) : seuls le prof et l'admin remplissent ces champs.
-- Une policy ne voit pas les colonnes, et un droit de colonne ne distingue pas l'élève du
-- prof (même rôle authenticated) : un déclencheur refuse donc, à un compte qui n'est ni
-- prof ni admin, de créer un signalement autrement qu'en attente et sans relecture, puis
-- de changer status, reviewed_by, reviewed_at ou response — ni, en modification, rien
-- d'autre que la description (affectation, exercice, auteur, version et graine).
--
-- Accès perdu : l'élève ne remplit plus les champs du prof et ne déplace plus son
-- signalement vers une autre affectation. Accès gagné : aucun.
-- Prod (2026-10-13) : 14 signalements, 13 traités, aucun « relu par » rempli par un élève ;
-- le déclencheur ne vise que les écritures futures.
--
-- Tests : tests/integration/signalement-fiche-champs-du-prof.test.ts
--
-- Rollback :
--   drop trigger guard_worksheet_error_report_teacher_fields on public.worksheet_error_reports;
--   drop function public.guard_worksheet_error_report_teacher_fields();

create function public.guard_worksheet_error_report_teacher_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
	-- Tâche système (client service, sans identité), prof ou admin : rien à garder.
	if (select auth.uid()) is null or public.is_teacher_or_admin() then
		return new;
	end if;

	if tg_op = 'INSERT' then
		if new.status is distinct from 'pending'
			or new.reviewed_by is not null
			or new.reviewed_at is not null
			or new.response is not null then
			raise exception 'Seul le professeur traite un signalement' using errcode = '42501';
		end if;
	-- En modification, l'élève ne change que sa description (audit de #1266 : la policy
	-- ne revérifie pas l'affectation, il déplaçait son signalement vers une autre).
	elsif new.status is distinct from old.status
		or new.reviewed_by is distinct from old.reviewed_by
		or new.reviewed_at is distinct from old.reviewed_at
		or new.response is distinct from old.response
		or new.assignment_id is distinct from old.assignment_id
		or new.worksheet_exercise_id is distinct from old.worksheet_exercise_id
		or new.student_id is distinct from old.student_id
		or new.variation_index is distinct from old.variation_index
		or new.seed is distinct from old.seed then
		raise exception 'Seul le professeur traite un signalement' using errcode = '42501';
	end if;

	return new;
end;
$$;

comment on function public.guard_worksheet_error_report_teacher_fields() is
	'Signalement d''erreur sur une fiche : status, reviewed_by, reviewed_at et response '
	'réservés au prof et à l''admin (constat I4, décision de David du 2026-10-13).';

revoke all on function public.guard_worksheet_error_report_teacher_fields()
	from public, anon, authenticated;

create trigger guard_worksheet_error_report_teacher_fields
	before insert or update on public.worksheet_error_reports
	for each row execute function public.guard_worksheet_error_report_teacher_fields();
