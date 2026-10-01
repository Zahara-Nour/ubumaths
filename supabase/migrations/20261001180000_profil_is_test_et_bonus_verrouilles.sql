-- Profil : « compte de test » et bonus plus modifiables par l'élève
-- =================================================================
--
-- Failles (signalées par l'audit de la PR #590) : la policy « Users can update own
-- profile » ne fige ni is_test ni bonus. Avec la clé publique de l'API, un élève
-- connecté pouvait :
--   * se marquer is_test = true : il disparaît des listes d'élèves du professeur,
--     qui écartent les comptes de test (src/lib/server/students.ts) — un mineur
--     peut se rendre invisible ;
--   * gonfler son propre bonus, affiché avec les gidouilles de la classe.
--
-- Décisions (Q66, Q67, 2026-10-01) :
--   * is_test : modifiable seulement par l'admin et le serveur (ni élève, ni prof) ;
--   * bonus : l'élève peut le faire baisser, jamais monter (même règle que les
--     gidouilles, migration 20260902097000). Le professeur et l'admin gardent la
--     main ; les gains légitimes passent par update_student_bonus (SECURITY
--     DEFINER) et ne sont pas concernés.
--
-- Mise en œuvre : trigger BEFORE UPDATE. Il ne refuse que lorsque l'instruction est
-- exécutée par les rôles de l'API (authenticated, anon). Le serveur (service_role)
-- et les fonctions SECURITY DEFINER (exécutées en tant que propriétaire) passent.
--
-- Qui perd quoi : l'élève ne peut plus changer is_test ni augmenter son bonus ; le
-- professeur ne peut plus changer is_test. Aucune donnée touchée.
--
-- ROLLBACK :
--   drop trigger if exists guard_profile_reserved_fields_trg on public.profiles;
--   drop function if exists public.guard_profile_reserved_fields();

create or replace function public.guard_profile_reserved_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	if current_user not in ('authenticated', 'anon') then
		return new;
	end if;

	if new.is_test is distinct from old.is_test and not public.is_admin() then
		raise exception 'Le statut « compte de test » n''est modifiable que par l''administrateur.'
			using errcode = '42501';
	end if;

	if coalesce(new.bonus, 0) > coalesce(old.bonus, 0) and not public.is_teacher_or_admin() then
		raise exception 'Le bonus ne peut être augmenté que par le professeur ou l''administrateur.'
			using errcode = '42501';
	end if;

	return new;
end;
$$;

comment on function public.guard_profile_reserved_fields() is
	'Refuse is_test hors admin et la hausse de bonus hors professeur/admin, pour les rôles de l''API (Q66, Q67).';

create trigger guard_profile_reserved_fields_trg
	before update
	on public.profiles
	for each row
	execute function public.guard_profile_reserved_fields();
