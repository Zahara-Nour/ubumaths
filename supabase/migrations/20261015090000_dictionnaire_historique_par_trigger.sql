-- ============================================================================
-- Dictionnaire : l'historique ne s'écrit plus que par le trigger (ADR 0022)
-- ============================================================================
--
-- Audit de sécurité de la PR #1036 (2026-10-10) : la policy « Admins can write dictionary
-- history » et le droit INSERT d'authenticated permettaient à l'admin d'insérer à la main une
-- version fabriquée (contenu arbitraire, à son nom). Ils n'existaient que parce que le trigger
-- d'historique s'exécutait avec les droits de l'appelant.
--
-- Question d'accès tranchée par David (2026-10-10, « oui ») :
--   - personne ne lit rien de nouveau (historique : admin seul ; dictionnaire : inchangé) ;
--   - en miroir, l'admin ne peut plus écrire directement dans l'historique : seule la
--     modification d'une entrée y ajoute la version précédente, avec son auteur réel.
-- Aucune donnée perdue : les versions existantes restent. Le code ne fait que LIRE
-- dictionary_entry_versions (src/lib/server/dictionary/admin.ts).
--
-- Le trigger passe en SECURITY DEFINER, gardé : un appelant anon ou authenticated qui n'est
-- pas admin est refusé (42501). Les migrations et le client service (auth.role() = service_role
-- ou NULL) passent.
--
-- Rollback :
--   grant insert on public.dictionary_entry_versions to authenticated;
--   create policy "Admins can write dictionary history"
--     on public.dictionary_entry_versions for insert to authenticated
--     with check ((select public.is_admin()) and saved_by = (select auth.uid()));
--   create or replace function public.dictionary_entries_keep_version()
--   returns trigger language plpgsql set search_path = '' as $$
--   begin
--     if tg_op = 'UPDATE' then
--       insert into public.dictionary_entry_versions (entry_id, entry, saved_by)
--       values (old.id, to_jsonb(old), auth.uid());
--       new.created_at := old.created_at;
--     else
--       new.created_at := now();
--     end if;
--     new.updated_at := now();
--     new.updated_by := auth.uid();
--     return new;
--   end;
--   $$;
--   -- (sans « security definer », create or replace la repasse en SECURITY INVOKER)

create or replace function public.dictionary_entries_keep_version()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
	-- Garde d'appelant, avant toute lecture : session anonyme ou non admin → refus neutre (42501)
	if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_admin() then
		raise exception 'Écriture refusée : droits insuffisants.' using errcode = 'insufficient_privilege';
	end if;
	if tg_op = 'UPDATE' then
		insert into public.dictionary_entry_versions (entry_id, entry, saved_by)
		values (old.id, to_jsonb(old), auth.uid());
		new.created_at := old.created_at;
	else
		new.created_at := now();
	end if;
	new.updated_at := now();
	new.updated_by := auth.uid();
	return new;
end;
$$;

alter function public.dictionary_entries_keep_version() owner to postgres;
revoke execute on function public.dictionary_entries_keep_version() from public, anon, authenticated;

-- Plus d'écriture directe dans l'historique, pour personne
drop policy "Admins can write dictionary history" on public.dictionary_entry_versions;
revoke insert on public.dictionary_entry_versions from authenticated;
