-- Consentement parental décidé par le niveau, question d'âge en 2nde
-- ===================================================================
--
-- Constat (prod, 2026-10-01) : consent_required valait false par défaut et rien ne
-- le passait à true à l'inscription. Seuls 11 élèves sur 81 y étaient soumis ;
-- 30 des 37 élèves de 6e ne l'étaient pas.
--
-- Décisions (Q69-Q73, 2026-10-01) :
--   * pas de date de naissance enregistrée ;
--   * le NIVEAU décide (src/lib/utils/consent.ts, GRADES_REQUIRING_CONSENT) :
--     6e, 5e, 4e, 3e, 2nde et niveau inconnu → consentement requis, délai de grâce
--     de 30 jours ; 1re et terminale → non soumis ;
--   * la règle s'applique à la création du profil ET à chaque changement de niveau ;
--     un consentement déjà accordé (consent_granted_at) n'est jamais effacé ;
--   * en 2nde, l'élève répond une fois à « As-tu 15 ans ou plus ? » (réponse et date
--     enregistrées, pas l'âge). Cette réponse passe par le serveur (PR suivante) ;
--     l'élève ne peut pas l'écrire lui-même : elle rejoint les champs verrouillés.
--   * les profils existants ne sont pas recalculés (classes toutes archivées).
--
-- Mise en œuvre :
--   * colonnes age_declaration ('15_plus' | 'under_15' | null) et age_declared_at ;
--   * trigger BEFORE INSERT OR UPDATE « consent_rule_by_grade_trg ». Son nom le fait
--     passer AVANT guard_profile_consent_fields_trg (ordre alphabétique) : un élève
--     qui changerait lui-même son niveau pour échapper au consentement est donc
--     arrêté par le garde ;
--   * guard_profile_consent_fields protège aussi les deux nouvelles colonnes.
--
-- Qui gagne / perd quoi : personne ne gagne de droit en base. L'élève ne peut pas
-- écrire sa réponse d'âge directement. Aucune donnée existante modifiée.
--
-- ROLLBACK :
--   drop trigger if exists consent_rule_by_grade_trg on public.profiles;
--   drop function if exists public.apply_consent_rule_by_grade();
--   (puis recréer guard_profile_consent_fields telle que dans 20261001160000)
--   alter table public.profiles drop column if exists age_declared_at;   -- ⚠️ perd les réponses
--   alter table public.profiles drop column if exists age_declaration;   -- ⚠️ perd les réponses

alter table public.profiles
	add column age_declaration text
		constraint profiles_age_declaration_check check (age_declaration in ('15_plus', 'under_15')),
	add column age_declared_at timestamptz;

comment on column public.profiles.age_declaration is
	'Réponse de l''élève de 2nde à « As-tu 15 ans ou plus ? » : 15_plus, under_15, ou null (pas de réponse). Aucune date de naissance n''est enregistrée.';
comment on column public.profiles.age_declared_at is
	'Date de la réponse à la question d''âge (null si pas de réponse).';

create or replace function public.apply_consent_rule_by_grade()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
	v_requires boolean;
begin
	-- Professeur / admin : jamais soumis. Couvre aussi le passage d'un profil créé
	-- « élève » par handle_new_user vers un autre rôle.
	if new.role is distinct from 'student'::public.user_role then
		if tg_op = 'INSERT' or old.role is distinct from new.role then
			new.consent_required := false;
			new.consent_grace_period_ends := null;
		end if;
		return new;
	end if;

	-- Seuls la création et un changement de niveau (ou un retour au rôle élève)
	-- déclenchent la règle ; toute autre modification du profil n'y touche pas.
	if tg_op = 'UPDATE'
		and new.grade is not distinct from old.grade
		and new.role is not distinct from old.role then
		return new;
	end if;

	v_requires := new.grade is null or new.grade in ('6', '5', '4', '3', '2');

	if tg_op = 'UPDATE' then
		-- Nouveau niveau : la réponse d'âge éventuelle ne vaut plus.
		new.age_declaration := null;
		new.age_declared_at := null;
	end if;

	if v_requires then
		new.consent_required := true;
		if new.consent_granted_at is null then
			new.consent_grace_period_ends := now() + interval '30 days';
		end if;
	else
		new.consent_required := false;
	end if;

	return new;
end;
$$;

comment on function public.apply_consent_rule_by_grade() is
	'Consentement parental décidé par le niveau (6e-2nde ou inconnu → requis, 30 j de grâce), à la création et au changement de niveau. Ne touche jamais consent_granted_at (Q69-Q73).';

create trigger consent_rule_by_grade_trg
	before insert or update
	on public.profiles
	for each row
	execute function public.apply_consent_rule_by_grade();

create or replace function public.guard_profile_consent_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	if (
		new.consent_required is distinct from old.consent_required
		or new.consent_granted_at is distinct from old.consent_granted_at
		or new.consent_grace_period_ends is distinct from old.consent_grace_period_ends
		or new.age_declaration is distinct from old.age_declaration
		or new.age_declared_at is distinct from old.age_declared_at
	)
	and current_user in ('authenticated', 'anon')
	and not public.is_teacher_or_admin() then
		raise exception 'Les champs de consentement ne sont modifiables que par le professeur ou l''administrateur.'
			using errcode = '42501';
	end if;
	return new;
end;
$$;

comment on function public.guard_profile_consent_fields() is
	'Refuse à un élève la modification des champs de consentement et de sa réponse d''âge (Q65, Q72).';
