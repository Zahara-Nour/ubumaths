/**
 * Garde-fou permanent : fonctions SECURITY DEFINER appelables par un élève
 * ========================================================================
 *
 * Décision de David (Q145), après la passe qui a corrigé ~60 fonctions
 * SECURITY DEFINER qui ne contrôlaient pas l'appelant (migrations `rpc_lot*`).
 *
 * Une fonction SECURITY DEFINER s'exécute avec les droits de `postgres` : la
 * RLS ne la protège pas. Si `authenticated` (un élève connecté) ou `anon` peut
 * l'appeler en RPC, seule une garde dans son corps l'empêche de lire ou
 * d'écrire le compte d'un autre. Ce fichier rend ce contrôle OBLIGATOIRE pour
 * toute nouvelle fonction :
 *
 *   (a) toute fonction du schéma public, SECURITY DEFINER, non-trigger,
 *       exécutable par authenticated ou anon, doit figurer dans
 *       `fixtures/fonctions-definer-verifiees.ts` avec sa justification
 *       (et `anon: true` si anon peut l'appeler) ;
 *   (b) toute entrée de cette liste doit encore exister ET être exécutable :
 *       sinon on la retire, pour que la liste ne pourrisse pas ;
 *   (c) toute fonction SECURITY DEFINER du schéma public (triggers compris)
 *       doit finir son search_path par pg_temp — sans lui, pg_temp est
 *       cherché EN PREMIER pour les tables et une table temporaire homonyme
 *       détournerait la fonction (cf. migration rpc_lot4_hygiene).
 *
 * Hors périmètre : les fonctions trigger et event_trigger, que Postgres refuse
 * d'exécuter hors de leur déclencheur (« can only be called as triggers »).
 *
 *   (d) les fonctions de trigger SECURITY DEFINER DÉCLARÉES (`DECLENCHEURS_DEFINER_VERIFIES`)
 *       sont définies comme annoncé : trigger, DEFINER, propriétaire postgres, EXECUTE retiré à
 *       PUBLIC, anon et authenticated, et garde d'appelant présente dans le corps.
 *
 * Que faire quand il échoue : docs/pratiques/rls-echecs-silencieux.md, § « Nouvelle
 * fonction SECURITY DEFINER ».
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { getPostgresClient } from '../helpers/database/postgres-client';
import {
	DECLENCHEURS_DEFINER_VERIFIES,
	FONCTIONS_DEFINER_VERIFIEES
} from './fixtures/fonctions-definer-verifiees';

// ============================================================================
// TYPES
// ============================================================================

interface FonctionDefiner {
	signature: string;
	authenticated: boolean;
	anon: boolean;
}

interface SearchPathDefiner {
	signature: string;
	search_path: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FICHIER_LISTE = 'tests/integration/fixtures/fonctions-definer-verifiees.ts';

const REQUETE_APPELABLES = `
	select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signature,
	       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
	       has_function_privilege('anon', p.oid, 'EXECUTE') as anon
	from pg_proc p
	join pg_namespace n on n.oid = p.pronamespace
	where n.nspname = 'public'
	  and p.prosecdef
	  and p.prorettype not in ('trigger'::regtype, 'event_trigger'::regtype)
	order by 1`;

const REQUETE_SEARCH_PATH = `
	select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signature,
	       (select substr(c, length('search_path=') + 1)
	          from unnest(p.proconfig) c
	         where c like 'search_path=%') as search_path
	from pg_proc p
	join pg_namespace n on n.oid = p.pronamespace
	where n.nspname = 'public'
	  and p.prosecdef
	order by 1`;

// ============================================================================
// HELPERS
// ============================================================================

/** Dernier schéma du search_path (guillemets et espaces retirés). */
function dernierSchema(searchPath: string): string {
	const schemas = searchPath.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
	return schemas[schemas.length - 1];
}

// ============================================================================
// TESTS
// ============================================================================

describe('Garde-fou Q145 : fonctions SECURITY DEFINER appelables par un élève', () => {
	let fonctions: FonctionDefiner[] = [];

	beforeAll(async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<FonctionDefiner>(REQUETE_APPELABLES);
		fonctions = rows;
	});

	it('l’inventaire n’est pas vide (sinon le garde-fou ne prouve rien)', () => {
		expect(fonctions.length).toBeGreaterThan(100);
	});

	it('(a) chaque fonction appelable par authenticated ou anon est vérifiée', () => {
		const nonListees = fonctions
			.filter((f) => (f.authenticated || f.anon) && !(f.signature in FONCTIONS_DEFINER_VERIFIEES))
			.map((f) => f.signature);

		const message = nonListees
			.map(
				(sig) =>
					`Nouvelle fonction SECURITY DEFINER appelable par un élève : ${sig}. ` +
					`Vérifie qu'elle contrôle l'appelant, puis ajoute-la à ` +
					`fonctions-definer-verifiees.ts avec sa justification.`
			)
			.join('\n');
		expect(nonListees, message).toEqual([]);
	});

	it('(a) anon n’appelle que les fonctions marquées « anon: true »', () => {
		const anonNonPrevues = fonctions
			.filter((f) => f.anon && FONCTIONS_DEFINER_VERIFIEES[f.signature]?.anon !== true)
			.map((f) => f.signature);

		const message = anonNonPrevues
			.map(
				(sig) =>
					`Fonction SECURITY DEFINER appelable SANS CONNEXION (anon) : ${sig}. ` +
					`Révoque EXECUTE à anon, ou marque-la « anon: true » dans ` +
					`fonctions-definer-verifiees.ts si une page publique en a besoin.`
			)
			.join('\n');
		expect(anonNonPrevues, message).toEqual([]);
	});

	it('(b) chaque entrée de la liste existe encore et reste appelable', () => {
		const parSignature = new Map(fonctions.map((f) => [f.signature, f]));
		const perimees: string[] = [];

		for (const [sig, entree] of Object.entries(FONCTIONS_DEFINER_VERIFIEES)) {
			const f = parSignature.get(sig);
			if (!f) {
				perimees.push(`${sig} : n'existe plus (ou n'est plus SECURITY DEFINER)`);
			} else if (!f.authenticated && !f.anon) {
				perimees.push(`${sig} : n'est plus exécutable par authenticated ni anon`);
			} else if (entree.anon === true && !f.anon) {
				perimees.push(`${sig} : marquée « anon: true » mais anon n'a plus EXECUTE`);
			}
		}

		const message = perimees
			.map((p) => `Entrée périmée de ${FICHIER_LISTE} — retire-la (ou corrige-la) : ${p}`)
			.join('\n');
		expect(perimees, message).toEqual([]);
	});

	it('chaque justification tient en une ligne non vide', () => {
		const fautives = Object.entries(FONCTIONS_DEFINER_VERIFIEES)
			.filter(([, e]) => e.justification.trim().length < 10 || e.justification.includes('\n'))
			.map(([sig]) => sig);
		expect(fautives).toEqual([]);
	});
});

describe('Garde-fou Q145 : search_path des fonctions SECURITY DEFINER', () => {
	it('(c) toute fonction SECURITY DEFINER de public finit son search_path par pg_temp', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<SearchPathDefiner>(REQUETE_SEARCH_PATH);
		expect(rows.length).toBeGreaterThan(100);

		const fautives = rows
			.filter((r) => r.search_path === null || dernierSchema(r.search_path) !== 'pg_temp')
			.map((r) => `${r.signature} (search_path = ${r.search_path ?? 'non fixé'})`);

		const message = fautives
			.map(
				(f) =>
					`Fonction SECURITY DEFINER sans pg_temp en dernière position : ${f}. ` +
					`Ajoute « SET search_path = public, pg_temp » (cf. rpc_lot4_hygiene).`
			)
			.join('\n');
		expect(fautives, message).toEqual([]);
	});
});

describe('Garde-fou Q145 : fonctions de trigger SECURITY DEFINER déclarées', () => {
	it('(d) chacune existe, est un trigger DEFINER de postgres, sans EXECUTE public, avec sa garde d’appelant', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{
			signature: string;
			trigger: boolean;
			definer: boolean;
			owner: string;
			executable: boolean;
			garde: boolean;
		}>(
			`select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signature,
			        p.prorettype = 'trigger'::regtype as trigger,
			        p.prosecdef as definer,
			        p.proowner::regrole::text as owner,
			        has_function_privilege('anon', p.oid, 'EXECUTE')
			          or has_function_privilege('authenticated', p.oid, 'EXECUTE')
			          or exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
			                      where a.grantee = 0 and a.privilege_type = 'EXECUTE') as executable,
			        p.prosrc like '%auth.role()%' and p.prosrc like '%public.is_teacher_or_admin()%' as garde
			   from pg_proc p
			   join pg_namespace n on n.oid = p.pronamespace
			  where n.nspname = 'public'`
		);
		const parSignature = new Map(rows.map((r) => [r.signature, r]));
		const fautives = Object.keys(DECLENCHEURS_DEFINER_VERIFIES).flatMap((sig) => {
			const f = parSignature.get(sig);
			if (!f) return [`${sig} : n'existe pas`];
			const ecarts = [
				!f.trigger && 'pas une fonction de trigger',
				!f.definer && 'pas SECURITY DEFINER',
				f.owner !== 'postgres' && `propriétaire ${f.owner}`,
				f.executable && 'EXECUTE accordé à PUBLIC, anon ou authenticated',
				!f.garde && 'garde d’appelant absente'
			].filter(Boolean);
			return ecarts.length > 0 ? [`${sig} : ${ecarts.join(', ')}`] : [];
		});
		expect(fautives).toEqual([]);
		expect(Object.keys(DECLENCHEURS_DEFINER_VERIFIES)).toHaveLength(6);
	});
});
