-- ============================================================================
-- Retirer TRUNCATE à `anon` et `authenticated` sur tout le schéma public
-- ============================================================================
-- TRUNCATE est le seul verbe de manipulation de données qui **ignore la RLS**.
-- Une table peut n'avoir aucune policy pour `anon` et être malgré tout vidée
-- par lui s'il détient ce privilège.
--
-- ÉTAT CONSTATÉ AVANT CETTE MIGRATION (prod, 2026-09-10) :
--   201 tables sur 209 accordaient TRUNCATE à `anon`
--   204 tables sur 209 l'accordaient à `authenticated`
--
-- Ce n'est pas un oubli ponctuel : le baseline pose
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--     GRANT ALL ON TABLES TO anon, authenticated;
-- (20260616220000:46144-46145). `ALL` inclut TRUNCATE, et cette règle s'applique
-- à TOUTE table créée depuis — donc corriger table par table ne suffit pas, il
-- faut aussi désarmer la règle elle-même. C'est l'objet des deux temps
-- ci-dessous.
--
-- QUESTION D'ACCÈS : **personne ne gagne quoi que ce soit.** Cette migration ne
-- fait que RETIRER un privilège. `anon` et `authenticated` conservent SELECT,
-- INSERT, UPDATE et DELETE — tous soumis à la RLS, qui reste l'unique garde
-- d'accès. Les rôles `postgres` et `service_role` gardent TRUNCATE : ce sont eux
-- qui font tourner les migrations, les seeds et le nettoyage des tests.
--
-- CE QUE ÇA NE CASSE PAS : l'application n'émet jamais de TRUNCATE (`grep -rni
-- truncate src scripts tests supabase/seed` ne renvoie que des occurrences sans
-- rapport, dans le code mathématique et le rendu PDF), et PostgREST n'expose
-- aucun verbe TRUNCATE. Le privilège retiré n'était donc utilisé par personne.
--
-- ⚠️ NON DESTRUCTIVE : aucune donnée n'est touchée, aucune table ni colonne
-- supprimée. Seul un droit change.
--
-- ROLLBACK :
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--     GRANT TRUNCATE ON TABLES TO anon, authenticated;
--   GRANT TRUNCATE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Les tables qui existent aujourd'hui
-- ---------------------------------------------------------------------------
-- `REVOKE TRUNCATE` et non `REVOKE ALL` : on retire le seul privilège qui
-- contourne la RLS, et on laisse intacts ceux dont l'application se sert
-- réellement. Un `REVOKE ALL` suivi de `GRANT select, insert, update, delete`
-- aurait aussi retiré REFERENCES et TRIGGER — un périmètre plus large que ce
-- qui a été décidé, et donc un risque de régression sans contrepartie.
revoke truncate on all tables in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Les tables à venir
-- ---------------------------------------------------------------------------
-- Sans ce second temps, la prochaine table créée renaîtrait avec TRUNCATE pour
-- `anon` : la règle du baseline continuerait de s'appliquer, et le point 1
-- ne serait qu'un nettoyage à refaire indéfiniment.
--
-- `FOR ROLE postgres` reprend exactement la portée de la règle d'origine : les
-- migrations Supabase s'exécutent sous ce rôle, donc c'est bien sa règle par
-- défaut qu'il faut amender.
--
-- ⚠️ CE QUE CETTE MIGRATION NE PEUT PAS COUVRIR. Il existe une SECONDE règle par
-- défaut, appartenant à `supabase_admin`, qui accorde elle aussi `ALL` :
--   {postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, …}
-- Elle est hors d'atteinte : `postgres` n'est pas membre de `supabase_admin`
-- (vérifié en local ET en prod), donc `ALTER DEFAULT PRIVILEGES FOR ROLE
-- supabase_admin` échouerait.
--
-- Conséquence concrète : une table créée par `supabase_admin` — c'est-à-dire
-- **via le Dashboard Supabase** — renaîtrait avec TRUNCATE pour `anon`. Le
-- projet interdit déjà de modifier le schéma par le Dashboard (CLAUDE.md,
-- § Base de données) ; cette migration donne une raison de plus de s'y tenir.
-- Les tables créées par les migrations, elles, sont bien couvertes.
--
-- ⚠️ SECOND CHEMIN RÉSIDUEL, plus probable que le Dashboard : un `GRANT ALL ON
-- TABLE … TO anon` écrit à la main dans une migration l'emporte sur la règle par
-- défaut et réarme TRUNCATE. C'est un usage établi du dépôt —
-- 20260621100000_curriculum_tracking.sql:187-192 et
-- 20260827120000_python_submission_server_verification.sql:104-105 en portent
-- six occurrences, antérieures à celle-ci et déjà soldées par le temps 1.
--
-- **Consigne pour la suite : écrire `grant select, insert, update, delete on
-- table … to anon, authenticated`, jamais `grant all`.** Le garde-fou du temps 3
-- ne se déclenche qu'au moment de CETTE migration ; il ne surveillera pas les
-- suivantes.
alter default privileges for role postgres in schema public
	revoke truncate on tables from anon;
alter default privileges for role postgres in schema public
	revoke truncate on tables from authenticated;

-- ---------------------------------------------------------------------------
-- 3. Garde-fou
-- ---------------------------------------------------------------------------
-- La migration échoue si elle n'a pas produit son effet, plutôt que de laisser
-- croire au succès. Un REVOKE ne rend jamais d'erreur quand il ne s'applique à
-- rien : sans cette vérification, une portée mal écrite passerait inaperçue.
do $$
declare
	v_restantes integer;
	v_defaut integer;
begin
	-- `relkind in ('r','p','f')` et non le seul 'r' : une table PARTITIONNÉE ou
	-- DISTANTE se TRUNCATE aussi. Le schéma n'en contient aucune aujourd'hui,
	-- mais le jour venu le REVOKE la couvrirait sans que ce garde la regarde —
	-- un faux succès silencieux, exactement ce qu'un garde-fou doit exclure.
	select count(*) into v_restantes
	from pg_class c
	join pg_namespace n on n.oid = c.relnamespace
	where n.nspname = 'public'
		and c.relkind in ('r', 'p', 'f')
		and (
			has_table_privilege('anon', c.oid, 'TRUNCATE')
			or has_table_privilege('authenticated', c.oid, 'TRUNCATE')
		);

	if v_restantes > 0 then
		raise exception 'TRUNCATE subsiste sur % table(s) pour anon ou authenticated', v_restantes;
	end if;

	-- Le temps 2 doit être vérifié LUI AUSSI. Sans ce second contrôle, deux
	-- `ALTER DEFAULT PRIVILEGES` restés sans effet passeraient pour un succès, et
	-- la prochaine table créée réarmerait TRUNCATE sans que rien ne l'annonce.
	--
	-- `left join` sur le schéma : une règle par défaut GLOBALE (posée sans
	-- `IN SCHEMA`, donc `defaclnamespace = 0`) s'applique à `public` tout en
	-- échappant à une jointure interne. Il n'en existe aucune aujourd'hui — c'est
	-- une ceinture, pas une correction.
	select count(*) into v_defaut
	from pg_default_acl d
	left join pg_namespace n on n.oid = d.defaclnamespace
	join pg_roles proprietaire on proprietaire.oid = d.defaclrole
	cross join lateral aclexplode(d.defaclacl) a
	join pg_roles beneficiaire on beneficiaire.oid = a.grantee
	where (d.defaclnamespace = 0 or n.nspname = 'public')
		and d.defaclobjtype = 'r'
		and proprietaire.rolname = 'postgres'
		and beneficiaire.rolname in ('anon', 'authenticated')
		and a.privilege_type = 'TRUNCATE';

	if v_defaut > 0 then
		raise exception 'La règle par défaut de postgres accorde encore TRUNCATE (% entrée(s))', v_defaut;
	end if;
end;
$$;
