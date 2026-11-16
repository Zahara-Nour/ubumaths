-- ============================================================================
-- Carnet de liaison : une adresse RETIRÉE par le professeur (ADR 0040, Q31)
-- ============================================================================
-- Chantier `partage-parents`, PR 3. Révoquer un lien ne suffisait pas :
-- l'adresse restait « confirmée » et récupérait un lien neuf (« J'ai perdu mon
-- lien », « Envoyer les liens manquants »). Et rien ne retirait une adresse
-- bidon qui occupait une des deux places.
--
-- Nouvel état `removed` : l'adresse est effacée (son empreinte reste), ses
-- liens sont révoqués par trigger, elle ne compte plus dans les deux places.
-- Elle ne revient ni par l'élève, ni par un consentement, ni par « lien perdu »
-- (seules les adresses `confirmed` reçoivent un lien) ; le professeur seul peut
-- la ressaisir (le serveur la remet en attente).
--
-- QUESTION D'ACCÈS (tranchée par David le 2026-11-16) : personne ne lit rien
-- de nouveau. Un état de plus dans une colonne déjà lue par le professeur.
--
-- ADDITIVE : deux contraintes élargies, un trigger neuf, aucune donnée touchée.
--
-- ROLLBACK :
--   drop trigger if exists parent_contacts_removed_revokes_links on public.parent_contacts;
--   drop function if exists public.parent_contacts_removed_revokes_links();
--   (d'abord, sans perte : update public.parent_contacts set status = 'refused'
--    where status = 'removed'; — l'empreinte reste, l'adresse reste bloquée ;
--    seul le professeur perd la possibilité de la ressaisir)
--   alter table public.parent_contacts drop constraint parent_contacts_status;
--   alter table public.parent_contacts add constraint parent_contacts_status
--     check (status in ('pending', 'confirmed', 'refused', 'invalid'));
--   alter table public.parent_contacts drop constraint parent_contacts_email_presence;
--   alter table public.parent_contacts add constraint parent_contacts_email_presence
--     check ((status = 'refused') = (email is null));
-- ============================================================================

alter table public.parent_contacts drop constraint if exists parent_contacts_status;
alter table public.parent_contacts add constraint parent_contacts_status
	check (status in ('pending', 'confirmed', 'refused', 'invalid', 'removed'));

-- Refusée par le destinataire ou retirée par le professeur : plus d'adresse en clair.
alter table public.parent_contacts drop constraint if exists parent_contacts_email_presence;
alter table public.parent_contacts add constraint parent_contacts_email_presence
	check ((status in ('refused', 'removed')) = (email is null));

-- Retirer révoque les liens. `SECURITY DEFINER` comme le trigger de l'opt-out ;
-- fonction de trigger, jamais appelable directement.
create or replace function public.parent_contacts_removed_revokes_links()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
	-- Même verrou que `issue_parent_carnet_link` : pas de lien émis pendant le retrait.
	perform pg_advisory_xact_lock(hashtext('carnet_links:' || new.student_id::text));
	update public.parent_carnet_links
	set revoked_at = now()
	where contact_id = new.id
		and revoked_at is null;
	return new;
end;
$$;

revoke execute on function public.parent_contacts_removed_revokes_links() from public, anon, authenticated;

drop trigger if exists parent_contacts_removed_revokes_links on public.parent_contacts;
create trigger parent_contacts_removed_revokes_links
	after update of status on public.parent_contacts
	for each row
	when (new.status = 'removed' and old.status is distinct from 'removed')
	execute function public.parent_contacts_removed_revokes_links();
