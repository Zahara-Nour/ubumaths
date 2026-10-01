-- Sécurité : trois points mineurs (Q76, Q77, Q78 — tranchés par David le 2026-10-01)
-- ==================================================================================
--
-- Q76 — Preuve du consentement parental (parental_consents)
--   Avant : le professeur et l'admin pouvaient écrire consent_ip, consent_user_agent,
--   consent_given_at, ou passer une demande à « granted », sans clic du parent.
--   Après : pour les rôles de l'API, ces quatre éléments sont refusés (42501).
--   Seule grant_parental_consent (SECURITY DEFINER, appelée par le serveur quand le
--   parent clique sur son lien) les écrit. Le professeur garde : créer une demande
--   (en attente), changer l'e-mail du parent, relancer, et dispenser l'élève via
--   profiles.consent_required.
--
-- Q77 — Notifications du professeur (notifications)
--   Avant : un professeur pouvait créer une notification « système » ou sans auteur,
--   puis élargir ses destinataires à toute l'école après l'envoi.
--   Après : pour les rôles de l'API hors admin, une notification créée porte
--   is_system = false et created_by = l'appelant ; une notification existante ne peut
--   plus qu'être masquée (deleted_at). L'admin et le serveur ne sont pas concernés.
--
-- Q78 — Traçabilité du profil (profiles)
--   Avant : un élève pouvait modifier class_ids, status_changed_by, status_changed_at
--   et rejection_reason sur son propre profil.
--   Après : réservé au professeur, à l'admin et au serveur (garde
--   guard_profile_reserved_fields, qui conserve ses règles précédentes).
--
-- Personne ne gagne de droit. Aucune donnée existante modifiée.
--
-- ROLLBACK :
--   drop trigger if exists guard_parental_consent_proof_trg on public.parental_consents;
--   drop function if exists public.guard_parental_consent_proof();
--   drop trigger if exists guard_notification_authorship_trg on public.notifications;
--   drop function if exists public.guard_notification_authorship();
--   puis recréer guard_profile_reserved_fields telle que dans
--   20261001210000_consentement_par_categorie.sql (create or replace).

-- ---------------------------------------------------------------------------
-- Q76
-- ---------------------------------------------------------------------------

create or replace function public.guard_parental_consent_proof()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	if current_user not in ('authenticated', 'anon') then
		return new;
	end if;

	if tg_op = 'INSERT' then
		if new.status is distinct from 'pending'::public.consent_status
			or new.consent_ip is not null
			or new.consent_user_agent is not null
			or new.consent_given_at is not null then
			raise exception 'Une demande de consentement se crée en attente, sans preuve : seul le lien envoyé au parent l''accorde.'
				using errcode = '42501';
		end if;
		return new;
	end if;

	if new.consent_ip is distinct from old.consent_ip
		or new.consent_user_agent is distinct from old.consent_user_agent
		or new.consent_given_at is distinct from old.consent_given_at
		or (new.status = 'granted'::public.consent_status
			and old.status is distinct from 'granted'::public.consent_status) then
		raise exception 'La preuve du consentement n''est écrite que par le lien envoyé au parent.'
			using errcode = '42501';
	end if;

	return new;
end;
$$;

comment on function public.guard_parental_consent_proof() is
	'Refuse aux rôles de l''API d''écrire la preuve du consentement (IP, navigateur, date) ou de le passer à granted (Q76).';

create trigger guard_parental_consent_proof_trg
	before insert or update
	on public.parental_consents
	for each row
	execute function public.guard_parental_consent_proof();

-- ---------------------------------------------------------------------------
-- Q77
-- ---------------------------------------------------------------------------

create or replace function public.guard_notification_authorship()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	if current_user not in ('authenticated', 'anon') or public.is_admin() then
		return new;
	end if;

	if tg_op = 'INSERT' then
		if new.is_system is distinct from false or new.created_by is distinct from auth.uid() then
			raise exception 'Une notification créée par un compte est à son nom et n''est pas « système ».'
				using errcode = '42501';
		end if;
		return new;
	end if;

	-- Après l'envoi : seul le masquage (deleted_at) reste possible.
	if (to_jsonb(new) - 'deleted_at' - 'updated_at') is distinct from
		(to_jsonb(old) - 'deleted_at' - 'updated_at') then
		raise exception 'Une notification envoyée ne peut plus qu''être masquée.'
			using errcode = '42501';
	end if;

	return new;
end;
$$;

comment on function public.guard_notification_authorship() is
	'Hors admin et serveur : notification créée à son nom, non système ; après envoi, seul le masquage est permis (Q77).';

create trigger guard_notification_authorship_trg
	before insert or update
	on public.notifications
	for each row
	execute function public.guard_notification_authorship();

-- ---------------------------------------------------------------------------
-- Q78
-- ---------------------------------------------------------------------------

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

	if (
		new.class_ids is distinct from old.class_ids
		or new.status_changed_by is distinct from old.status_changed_by
		or new.status_changed_at is distinct from old.status_changed_at
		or new.rejection_reason is distinct from old.rejection_reason
	) and not public.is_teacher_or_admin() then
		raise exception 'Les classes et l''historique de statut ne sont modifiables que par le professeur ou l''administrateur.'
			using errcode = '42501';
	end if;

	return new;
end;
$$;

comment on function public.guard_profile_reserved_fields() is
	'Refuse, pour les rôles de l''API : is_test hors admin ; hausse de bonus, niveau, classes et historique de statut hors professeur/admin (Q66, Q67, Q78).';
