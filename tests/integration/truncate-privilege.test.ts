/**
 * TRUNCATE retiré à `anon` et `authenticated` (nécessite une base locale)
 * ======================================================================
 *
 * Migration : 20260910160000_revoke_truncate_anon_authenticated.sql
 *
 * TRUNCATE est le seul verbe de manipulation de données qui **ignore la RLS** :
 * une table sans aucune policy pour `anon` peut malgré tout être vidée par lui
 * s'il détient ce privilège. Le baseline l'accordait à tout le monde, sur 201
 * tables sur 209.
 *
 * Ces tests portent sur l'état des DROITS, pas sur un comportement applicatif :
 * c'est la seule façon de vérifier un privilège que PostgREST n'expose pas et
 * qu'aucune requête de l'application n'emprunte.
 *
 * @vitest-environment node
 */
import { describe, it, expect, afterAll } from 'vitest';
import { getPostgresClient, closePostgresClient } from '../helpers/database/postgres-client';

/**
 * Compte via une connexion Postgres DIRECTE.
 *
 * PostgREST n'expose ni `pg_class` ni `pg_default_acl`, et il n'est pas question
 * d'ajouter une fonction qui exécuterait du SQL arbitraire — ce serait ouvrir
 * exactement le genre de porte que cette migration referme. L'introspection des
 * droits se fait donc hors de l'API, comme les tests de triggers du projet.
 */
async function compter(sql: string): Promise<number> {
	const client = await getPostgresClient();
	const { rows } = await client.query<{ count: string }>(sql);
	return Number(rows[0].count);
}

describe('privilège TRUNCATE', () => {
	afterAll(async () => {
		await closePostgresClient();
	});

	// Requête d'introspection : combien de tables du schéma public laissent
	// encore TRUNCATE à l'un des deux rôles publics.
	const RESTANTES = `
		select count(*)
		from pg_class c
		join pg_namespace n on n.oid = c.relnamespace
		where n.nspname = 'public'
			-- Mêmes relkind que le garde-fou de la migration : une table
			-- partitionnée ou distante se TRUNCATE aussi.
			and c.relkind in ('r', 'p', 'f')
			and (
				has_table_privilege('anon', c.oid, 'TRUNCATE')
				or has_table_privilege('authenticated', c.oid, 'TRUNCATE')
			)
	`;

	it('n’est plus accordé à anon ni à authenticated, sur AUCUNE table', async () => {
		expect(await compter(RESTANTES)).toBe(0);
	});

	it('reste accordé à service_role', async () => {
		// Témoin : si la migration avait retiré TRUNCATE à TOUT le monde, le test
		// précédent passerait aussi, et il ne prouverait plus rien de son périmètre.
		//
		// (Le nettoyage des tests, lui, ne dépend pas de ce privilège :
		// `postgres-client.ts` se connecte en `postgres` et supprime par `DELETE`
		// sous `session_replication_role = replica`. Ni service_role, ni TRUNCATE.)
		const pourService = `
			select count(*)
			from pg_class c
			join pg_namespace n on n.oid = c.relnamespace
			where n.nspname = 'public'
				and c.relkind = 'r'
				and has_table_privilege('service_role', c.oid, 'TRUNCATE')
		`;
		expect(await compter(pourService)).toBeGreaterThan(100);
	});

	it('ne sera pas rendu aux tables créées par les MIGRATIONS', async () => {
		// Le point que le nettoyage table par table ne réglait pas : sans amender
		// `ALTER DEFAULT PRIVILEGES`, la prochaine table créée renaîtrait avec
		// TRUNCATE pour `anon`.
		//
		// La règle visée est celle de `postgres`, sous lequel s'exécutent les
		// migrations. Celle de `supabase_admin` accorde encore ALL et restera
		// ainsi : `postgres` n'est pas membre de ce rôle, la migration ne peut pas
		// y toucher. Une table créée par le Dashboard échapperait donc à cette
		// garde — ce que le projet interdit déjà par ailleurs.
		//
		// `aclexplode` plutôt qu'un `LIKE` sur le texte de l'ACL : `'%anon=%D%'`
		// matche aussi le `D` d'un rôle listé APRÈS anon, donc de service_role,
		// qui lui garde légitimement TRUNCATE. Le test aurait échoué sans rien
		// signaler de vrai.
		const parDefaut = `
			select count(*)
			from pg_default_acl d
			join pg_namespace n on n.oid = d.defaclnamespace
			join pg_roles proprietaire on proprietaire.oid = d.defaclrole
			cross join lateral aclexplode(d.defaclacl) a
			join pg_roles beneficiaire on beneficiaire.oid = a.grantee
			where n.nspname = 'public'
				and d.defaclobjtype = 'r'
				and proprietaire.rolname = 'postgres'
				and beneficiaire.rolname in ('anon', 'authenticated')
				and a.privilege_type = 'TRUNCATE'
		`;
		expect(await compter(parDefaut)).toBe(0);
	});

	it('laisse intacts les verbes dont l’application se sert', async () => {
		// Un `REVOKE ALL` aurait aussi emporté SELECT/INSERT/UPDATE/DELETE, et
		// cassé toute l'application derrière la RLS. On vérifie qu'on a bien
		// retiré UN privilège, pas tous.
		const lectureAuthenticated = `
			select count(*)
			from pg_class c
			join pg_namespace n on n.oid = c.relnamespace
			where n.nspname = 'public'
				and c.relkind = 'r'
				and has_table_privilege('authenticated', c.oid, 'SELECT')
		`;
		expect(await compter(lectureAuthenticated)).toBeGreaterThan(100);
	});
});
