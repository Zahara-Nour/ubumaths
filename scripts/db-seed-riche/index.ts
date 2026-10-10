/**
 * `pnpm db:seed-riche` — remplir la base LOCALE : contenu de la prod, élèves fictifs.
 *
 * Décision de David du 2026-10-10. Inventaire : docs/wip/base-locale-inventaire.md.
 * Règles (testées) : ./regles.ts.
 *
 * 1. Lit la prod (URL et clé de .env) en LECTURE SEULE : des `select`, rien d'autre.
 * 2. Écrit dans le Postgres local (127.0.0.1:54322), déclencheurs suspendus
 *    (session_replication_role = replica) : ni notification, ni garde métier
 *    déclenchés par le chargement.
 * 3. Une ligne dont un utilisateur n'est ni le prof ni l'admin n'est jamais
 *    copiée ; le prof et l'admin de prod deviennent les comptes locaux de
 *    supabase/seed/dev_accounts.sql. Aucun identifiant de la prod n'arrive en local.
 * 4. Crée 30 élèves fictifs (eleveNN@local.test / local-eleve) répartis dans
 *    les classes copiées, plus un élève hors classe.
 *
 * À lancer après `pnpm db:reset` (base repartie de zéro), sous le verrou
 * Supabase : `pnpm db:seed-riche`.
 */

import { createClient } from '@supabase/supabase-js';
import { parse } from 'dotenv';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import {
	COPIE,
	detecterFuite,
	filtrerLignes,
	neutraliser,
	remplacerIds,
	valeurPg,
	verifierCibles,
	type Ligne
} from './regles';

const PROF_LOCAL = '11111111-1111-4111-8111-111111111111';
const ADMIN_LOCAL = '33333333-3333-4333-8333-333333333333';
const NB_ELEVES = 30;
const PAGE = 1000;
const LOT = 300;

interface Colonne {
	nom: string;
	type: string;
	insérable: boolean;
}

async function colonnesLocales(db: pg.Client, table: string): Promise<Colonne[]> {
	const r = await db.query(
		`select column_name, data_type, is_generated, identity_generation
		   from information_schema.columns
		  where table_schema = 'public' and table_name = $1
		  order by ordinal_position`,
		[table]
	);
	return r.rows.map((c) => ({
		nom: c.column_name,
		type: c.data_type === 'ARRAY' ? 'ARRAY' : c.data_type,
		insérable: c.is_generated !== 'ALWAYS'
	}));
}

/** Colonnes de la table qui désignent un utilisateur (clé étrangère vers auth.users ou profiles). */
async function colonnesUtilisateur(db: pg.Client, table: string): Promise<string[]> {
	const r = await db.query(
		`select a.attname
		   from pg_constraint c
		   join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
		  where c.contype = 'f'
		    and c.conrelid = ('public.' || quote_ident($1))::regclass
		    and c.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)`,
		[table]
	);
	return r.rows.map((x) => x.attname as string);
}

async function clePrimaire(db: pg.Client, table: string): Promise<string[]> {
	const r = await db.query(
		`select a.attname
		   from pg_index i
		   join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
		  where i.indrelid = ('public.' || quote_ident($1))::regclass and i.indisprimary`,
		[table]
	);
	return r.rows.map((x) => x.attname as string);
}

async function lireProd(
	prod: ReturnType<typeof createClient>,
	table: string,
	ordre: string[]
): Promise<Ligne[]> {
	const lignes: Ligne[] = [];
	for (let debut = 0; ; debut += PAGE) {
		let q = prod.from(table).select('*');
		for (const col of ordre) q = q.order(col);
		const { data, error } = await q.range(debut, debut + PAGE - 1);
		if (error) throw new Error(`lecture prod de ${table} : ${error.message}`);
		lignes.push(...((data ?? []) as Ligne[]));
		if (!data || data.length < PAGE) return lignes;
	}
}

async function inserer(db: pg.Client, table: string, colonnes: Colonne[], lignes: Ligne[]) {
	if (lignes.length === 0) return;
	const presentes = colonnes.filter((c) => c.insérable && c.nom in lignes[0]);
	const noms = presentes.map((c) => `"${c.nom}"`).join(', ');
	for (let i = 0; i < lignes.length; i += LOT) {
		const lot = lignes.slice(i, i + LOT);
		const valeurs: unknown[] = [];
		const tuples = lot.map((ligne) => {
			const places = presentes.map((c) => {
				valeurs.push(valeurPg(ligne[c.nom], c.type));
				return `$${valeurs.length}`;
			});
			return `(${places.join(', ')})`;
		});
		await db.query(
			`insert into public."${table}" (${noms}) overriding system value values ${tuples.join(', ')}`,
			valeurs
		);
	}
}

async function creerEleves(db: pg.Client): Promise<number> {
	const classes = (
		await db.query(`select id from public.classes where join_code like 'LOCAL%' order by name`)
	).rows.map((c) => c.id as string);
	for (let n = 1; n <= NB_ELEVES + 1; n++) {
		const nn = String(n).padStart(2, '0');
		const id = `5eed0000-0000-4000-8000-0000000000${nn}`;
		const email = `eleve${nn}@local.test`;
		const nom = n > NB_ELEVES ? `Élève hors classe` : `Élève ${nn}`;
		await db.query(
			`insert into auth.users (
				instance_id, id, aud, role, email, encrypted_password,
				email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
				confirmation_token, recovery_token, email_change_token_new, email_change,
				email_change_token_current, phone_change, phone_change_token, reauthentication_token
			) values (
				'00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated',
				$2, extensions.crypt('local-eleve', extensions.gen_salt('bf')),
				now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
				jsonb_build_object('full_name', $3::text, 'email_verified', true),
				'', '', '', '', '', '', '', ''
			) on conflict (id) do nothing`,
			[id, email, nom]
		);
		await db.query(
			`insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
			 values ($1::text, $1::uuid, jsonb_build_object('sub', $1::text, 'email', $2::text, 'email_verified', true), 'email', now(), now(), now())
			 on conflict (provider, provider_id) do nothing`,
			[id, email]
		);
		await db.query(
			`insert into public.profiles (id, email, role, full_name) values ($1, $2, 'student', $3)
			 on conflict (id) do nothing`,
			[id, email, nom]
		);
		if (n <= NB_ELEVES && classes.length > 0) {
			await db.query(
				`insert into public.class_members (class_id, student_id) values ($1, $2) on conflict do nothing`,
				[classes[(n - 1) % classes.length], id]
			);
		}
	}
	return classes.length;
}

async function main() {
	const envProd = parse(readFileSync('.env'));
	const envLocal = parse(readFileSync('.env.local'));
	const source = envProd.PUBLIC_SUPABASE_URL;
	const cle = envProd.SUPABASE_SERVICE_ROLE_KEY;
	const cible = envLocal.PUBLIC_SUPABASE_URL;
	const pgUrl =
		process.env.SEED_RICHE_PG_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
	verifierCibles({ source, cible, pg: pgUrl });
	if (!cle) throw new Error('SUPABASE_SERVICE_ROLE_KEY absente de .env');

	const prod = createClient(source, cle, { auth: { persistSession: false } });
	const db = new pg.Client({ connectionString: pgUrl });
	await db.connect();

	try {
		// Identifiants et noms restent en mémoire : ils servent aux gardes, jamais à un affichage.
		const utilisateurs: { id: string; role: string; full_name: string | null }[] = [];
		for (let debut = 0; ; debut += PAGE) {
			const { data, error } = await prod
				.from('profiles')
				.select('id, role, full_name')
				.order('id')
				.range(debut, debut + PAGE - 1);
			if (error) throw new Error(`lecture des profils : ${error.message}`);
			utilisateurs.push(...(data ?? []));
			if (!data || data.length < PAGE) break;
		}
		const correspondance = new Map<string, string>(
			utilisateurs
				.filter((u) => u.role === 'teacher' || u.role === 'admin')
				.map((u) => [u.id, u.role === 'teacher' ? PROF_LOCAL : ADMIN_LOCAL])
		);
		const interdits = {
			ids: utilisateurs.map((u) => u.id),
			noms: utilisateurs
				.filter((u) => u.role === 'student' && u.full_name)
				.map((u) => u.full_name as string)
		};

		// La cible ne doit contenir AUCUN compte de la prod : c'est la preuve que
		// ce n'est pas la prod (atteinte par un tunnel ou une URL trompeuse).
		const intrus = await db.query(
			'select count(*)::int n from auth.users where id = any($1::uuid[])',
			[interdits.ids]
		);
		if (intrus.rows[0].n > 0) {
			throw new Error(
				'La base cible contient des comptes de la prod : ce n’est pas la base locale. Rien n’est écrit.'
			);
		}
		console.log(`Personnel de prod : ${correspondance.size} compte(s) → comptes locaux.`);

		// Les comptes locaux (prof, admin, élève de dev) doivent exister avant le contenu.
		await db.query(readFileSync('supabase/seed/dev_accounts.sql', 'utf8'));

		await db.query('begin');
		await db.query('set local session_replication_role = replica');
		let total = 0;
		for (const table of COPIE) {
			const colonnes = await colonnesLocales(db, table);
			if (colonnes.length === 0) {
				console.log(`  ⚠️  ${table} : absente en local, ignorée`);
				continue;
			}
			const cle = await clePrimaire(db, table);
			if (cle.length === 0)
				throw new Error(`${table} : pas de clé primaire, lecture paginée non fiable`);
			const brutes = await lireProd(prod, table, cle);
			const { gardees, ecartees } = filtrerLignes(
				brutes,
				await colonnesUtilisateur(db, table),
				correspondance
			);
			const lignes = gardees.map((l, i) => neutraliser(table, remplacerIds(l, correspondance), i));
			for (const ligne of lignes) {
				const fuite = detecterFuite(ligne, interdits);
				if (fuite) throw new Error(`${table} : une ligne contient ${fuite}. Rien n’est écrit.`);
			}
			await db.query(`delete from public."${table}"`);
			await inserer(db, table, colonnes, lignes);
			total += lignes.length;
			console.log(
				`  ${table.padEnd(38)} ${String(lignes.length).padStart(5)}${ecartees ? `  (${ecartees} écartée(s) : un élève)` : ''}`
			);
		}
		await db.query('commit');

		// Rejoué après la copie : la classe et la configuration de dev, effacées par
		// le remplacement des tables, reviennent (on conflict do nothing).
		await db.query(readFileSync('supabase/seed/dev_accounts.sql', 'utf8'));
		const nbClasses = await creerEleves(db);
		console.log(`\n✅ ${total} lignes de contenu copiées.`);
		console.log(
			`✅ ${NB_ELEVES} élèves fictifs répartis dans ${nbClasses} classe(s), plus un hors classe : eleve01…eleve${NB_ELEVES + 1}@local.test / local-eleve`
		);
	} catch (e) {
		await db.query('rollback').catch(() => {});
		throw e;
	} finally {
		await db.end();
	}
}

main().catch((e) => {
	console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
