-- Carnet de liaison : effacement du journal des courriels au bout d'un an
-- (ADR 0040 ; chantier `partage-parents`, Q42).
--
-- `parent_notifications` (date, nature, motifs, sans adresse) n'avait pas de
-- durée propre : il vivait avec le profil de l'élève. Décidé le 2026-11-17 :
-- le passage quotidien du carnet efface les lignes de plus d'un an, quelle que
-- soit leur nature (confirmation, lien, exception, trimestriel) ou leur issue.
--
-- Aucune règle ne regarde plus loin qu'un an en arrière : plafond hebdomadaire
-- (6 j 12 h), message trimestriel déjà parti (depuis la fin du trimestre), jeton
-- d'un courriel (le lien expire le 31 août), dernier envoi vu par le professeur.
--
-- Accès : personne ne lit rien de nouveau. En miroir, l'élève, le professeur et
-- l'admin ne lisent plus les traces de plus d'un an (perte voulue, RGPD).
-- Fonction appelée par le cron (service role) seul.
--
-- Rollback (aucune donnée à rendre : les lignes effacées sont perdues) :
--   drop function if exists public.carnet_erase_old_notifications();

create or replace function public.carnet_erase_old_notifications()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_erased integer;
begin
	delete from public.parent_notifications n
	where n.created_at < now() - interval '1 year';
	get diagnostics v_erased = row_count;

	return v_erased;
end;
$$;

comment on function public.carnet_erase_old_notifications() is
	'Carnet de liaison (ADR 0040, Q42) : efface les courriels du journal de plus d''un an. Cron (service role) seul ; rend le nombre de lignes effacées.';

revoke execute on function public.carnet_erase_old_notifications() from public, anon, authenticated;
grant execute on function public.carnet_erase_old_notifications() to service_role;
