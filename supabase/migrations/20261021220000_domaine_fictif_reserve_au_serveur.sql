-- ============================================================================
-- Domaine fictif des comptes d'enfants : réservé au serveur
-- ============================================================================
--
-- Un enfant inscrit par son parent se connecte par un identifiant (`noelie42`), stocké
-- dans auth.users comme `noelie42@eleves.chiph.re` (domaine qui ne reçoit aucun courriel).
-- Faille (audit de la PR 1, Moyen 1) : n'importe qui pouvait créer ce compte par l'API
-- publique (signUp GoTrue direct, clé anon) et bloquer l'identifiant d'un enfant.
--
-- Correctif : un trigger sur auth.users refuse toute adresse du domaine fictif, à la
-- création comme au changement d'adresse, sauf si le compte porte
-- `raw_app_meta_data.child_account = true`. Les app_metadata ne sont écrites que par la
-- clé service (auth.admin.createUser) : jamais par signUp ni updateUser.
--
-- Question d'accès posée à David (2026-10-21) : personne ne gagne de lecture. En miroir,
-- personne ne perd rien : 0 compte sur ce domaine en prod (mesuré le 2026-10-21).
-- Prouvé par tests/integration/domaine-fictif-reserve-au-serveur.test.ts.
--
-- ROLLBACK :
--   drop trigger if exists guard_child_account_domain_trg on auth.users;
--   drop function if exists public.guard_child_account_domain();
-- ============================================================================

-- ⚠️ GoTrue insère le compte AVANT d'écrire ses app_metadata (UPDATE dans la même
-- transaction) : un trigger BEFORE INSERT ne voit jamais la marque. D'où un trigger de
-- contrainte DIFFÉRÉ, vérifié au commit sur l'état final de la ligne (relue par id).
create or replace function public.guard_child_account_domain()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
	v_email text;
	v_app jsonb;
begin
	select u.email, u.raw_app_meta_data
	into v_email, v_app
	from auth.users u
	where u.id = new.id;

	-- Compte supprimé entre-temps dans la transaction : rien à garder.
	if not found then
		return null;
	end if;

	if lower(v_email) like '%@eleves.chiph.re'
		and coalesce(v_app ->> 'child_account', '') <> 'true' then
		raise exception 'Le domaine eleves.chiph.re est réservé aux comptes créés par le serveur.'
			using errcode = '42501';
	end if;
	return null;
end;
$$;

comment on function public.guard_child_account_domain() is
	'Refuse au commit, dans auth.users, toute adresse @eleves.chiph.re sans app_metadata.child_account = true (posée par le serveur seul).';

revoke all on function public.guard_child_account_domain() from public, anon, authenticated;

drop trigger if exists guard_child_account_domain_trg on auth.users;
create constraint trigger guard_child_account_domain_trg
	after insert or update of email, raw_app_meta_data on auth.users
	deferrable initially deferred
	for each row execute function public.guard_child_account_domain();
