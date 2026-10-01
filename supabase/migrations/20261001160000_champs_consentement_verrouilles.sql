-- Champs de consentement d'un profil : plus modifiables par l'élève
-- =================================================================
--
-- Faille : la policy « Users can update own profile » ne fige que role, status,
-- gidouilles et school_id. Un élève connecté pouvait donc, avec la clé publique de
-- l'API, écrire sur son propre profil consent_granted_at = now() ou
-- consent_required = false : le garde d'accès (src/lib/utils/consent.ts) le
-- considérait alors comme couvert par un consentement parental qui n'existe pas.
--
-- Décision (Q65, option b, 2026-10-01) : les trois champs consent_required,
-- consent_granted_at et consent_grace_period_ends ne sont plus modifiables que par
--   * le serveur (service_role) ;
--   * les fonctions SECURITY DEFINER (grant_parental_consent, appelée par le lien
--     envoyé au parent) — elles s'exécutent en tant que propriétaire ;
--   * le professeur et l'admin (dispense, prolongation du délai de grâce).
--
-- Mise en œuvre : trigger BEFORE UPDATE. Il ne refuse que lorsque l'instruction est
-- exécutée par les rôles de l'API (authenticated, anon) ET que l'appelant n'est ni
-- professeur ni admin. Une mise à jour qui ne change pas ces champs passe, quel
-- que soit l'appelant.
--
-- Qui perd quoi : l'élève ne peut plus modifier ces trois champs de son propre
-- profil. Aucune donnée touchée ; aucun code applicatif ne les écrit.
--
-- ROLLBACK :
--   drop trigger if exists guard_profile_consent_fields_trg on public.profiles;
--   drop function if exists public.guard_profile_consent_fields();

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
	'Refuse à un élève la modification de consent_required, consent_granted_at et consent_grace_period_ends (Q65).';

create trigger guard_profile_consent_fields_trg
	before update of consent_required, consent_granted_at, consent_grace_period_ends
	on public.profiles
	for each row
	execute function public.guard_profile_consent_fields();

-- Commentaire périmé depuis 20261001150000 (la fonction n'est plus appelée par anon).
comment on function public.grant_parental_consent(uuid, inet, text) is
	'Accorde le consentement parental d''un élève. Appelée par le serveur seul (client service, page /consent/[token]), avec l''IP et le navigateur de la requête reçue.';
