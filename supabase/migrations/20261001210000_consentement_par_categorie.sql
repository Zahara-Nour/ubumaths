-- Consentement : recalculé seulement au changement de CATÉGORIE de niveau
-- =======================================================================
--
-- Avant (20261001190000) : tout changement de niveau relançait 30 jours de grâce et
-- remettait consent_required selon le niveau. Effets indésirables :
--   * un élève dont le délai a expiré (parents sans réponse) regagnait 30 jours à
--     chaque rentrée ;
--   * une dispense accordée par le professeur (consent_required = false sur un
--     élève de 6e, ex. accord papier) sautait en silence au passage en 5e.
--
-- Décision (David, 2026-10-01) : ne recalculer qu'au changement de catégorie.
--   Catégories : « soumis » = tout niveau sauf 1re / terminale, et niveau inconnu ;
--                « non soumis » = 1re et terminale.
--   * même catégorie (6e → 5e, 3e → 2nde) : consentement, délai et dispense inchangés ;
--   * non soumis → soumis : consentement requis, 30 jours de grâce (sauf consentement
--     déjà accordé) ;
--   * soumis → non soumis : plus soumis ;
--   * la réponse d'âge est remise à zéro à tout changement de niveau (elle ne vaut que
--     pour la 2nde) ; une dispense qui venait d'un « 15 ans ou plus » tombe avec elle
--     si l'élève reste dans la catégorie « soumis » ;
--   * un consentement accordé n'est jamais effacé.
--
-- Verrou ajouté, nécessaire à cette règle : un élève ne peut plus changer son propre
-- niveau (aucun code ne le fait ; le niveau vient de la classe). Sans lui, un élève
-- de 6e pouvait se mettre en 2nde (même catégorie, donc sans toucher au
-- consentement), puis répondre « 15 ans ou plus » à la question d'âge.
--
-- Qui perd quoi : un élève dont le délai a expiré ne récupère plus 30 jours à la
-- rentrée ; un élève ne peut plus modifier son niveau. Personne ne gagne rien.
-- Aucune donnée existante modifiée.
--
-- ROLLBACK : recréer apply_consent_rule_by_grade telle que dans
-- 20261001190000_consentement_par_niveau.sql et guard_profile_reserved_fields telle
-- que dans 20261001180000_profil_is_test_et_bonus_verrouilles.sql (create or replace,
-- aucun objet supprimé). ⚠️ Restaurer les DEUX ensemble : la garde seule (version
-- 180000) sous la nouvelle règle rouvrirait le trou « 6e → 2nde, puis 15 ans ou plus ».

create or replace function public.apply_consent_rule_by_grade()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
	v_lycee text[] := array['1_GEN', '1_SPE', '1_STMG', 'T_GEN', 'T_SPE', 'T_EXP', 'T_COMP', 'T_STMG'];
	v_requires boolean;
	v_required_before boolean;
	v_dispense_par_age boolean;
begin
	-- Création directe de son propre profil par un compte de l'API : un consentement
	-- ou une réponse d'âge ne se fabriquent pas (seconde barrière, cf. 20261001200000).
	if tg_op = 'INSERT'
		and current_user in ('authenticated', 'anon')
		and not public.is_teacher_or_admin() then
		new.consent_granted_at := null;
		new.age_declaration := null;
		new.age_declared_at := null;
	end if;

	-- Professeur / admin : jamais soumis.
	if new.role is distinct from 'student'::public.user_role then
		if tg_op = 'INSERT' or old.role is distinct from new.role then
			new.consent_required := false;
			new.consent_grace_period_ends := null;
		end if;
		return new;
	end if;

	-- Par défaut prudent : tout niveau est soumis SAUF 1re et terminale.
	v_requires := new.grade is null or not (new.grade = any (v_lycee));

	-- Création, ou retour au rôle élève : la règle s'applique entièrement.
	if tg_op = 'INSERT' or old.role is distinct from new.role then
		if tg_op = 'UPDATE' then
			-- Retour au rôle élève : une ancienne réponse d'âge ne vaut plus.
			new.age_declaration := null;
			new.age_declared_at := null;
		end if;
		new.consent_required := v_requires;
		if v_requires and new.consent_granted_at is null then
			new.consent_grace_period_ends := now() + interval '30 days';
		end if;
		return new;
	end if;

	-- Toute autre modification qu'un changement de niveau : rien.
	if new.grade is not distinct from old.grade then
		return new;
	end if;

	-- Changement de niveau : la réponse d'âge ne vaut plus.
	v_dispense_par_age := old.age_declaration = '15_plus';
	new.age_declaration := null;
	new.age_declared_at := null;

	v_required_before := old.grade is null or not (old.grade = any (v_lycee));

	if v_requires and (not v_required_before or v_dispense_par_age) then
		-- Entrée dans la catégorie « soumis », ou dispense par l'âge qui tombe.
		new.consent_required := true;
		if new.consent_granted_at is null then
			new.consent_grace_period_ends := now() + interval '30 days';
		end if;
	elsif not v_requires and v_required_before then
		new.consent_required := false;
	end if;
	-- Même catégorie, sans dispense par l'âge : consentement, délai et dispense inchangés.

	return new;
end;
$$;

comment on function public.apply_consent_rule_by_grade() is
	'Consentement parental par catégorie de niveau (soumis = tout sauf 1re/terminale) : appliqué à la création et au changement de catégorie seulement ; ne touche jamais consent_granted_at.';

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

	if new.grade is distinct from old.grade and not public.is_teacher_or_admin() then
		raise exception 'Le niveau n''est modifiable que par le professeur ou l''administrateur.'
			using errcode = '42501';
	end if;

	return new;
end;
$$;

comment on function public.guard_profile_reserved_fields() is
	'Refuse, pour les rôles de l''API : is_test hors admin, hausse de bonus et changement de niveau hors professeur/admin (Q66, Q67, 2026-10-01).';
