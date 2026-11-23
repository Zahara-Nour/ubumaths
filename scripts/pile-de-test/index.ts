/**
 * Pile Supabase de TEST : la démarrer, la mettre d'accord avec la branche, lancer les tests dessus
 * ===============================================================================================
 *
 *   tsx scripts/pile-de-test/index.ts lancer -- <commande…>   prépare la pile, puis lance la commande
 *   tsx scripts/pile-de-test/index.ts stop                    arrête la pile (ses données restent)
 *   tsx scripts/pile-de-test/index.ts reset                   la reconstruit de zéro
 *
 * Appelé sous le verrou `supabase-test` par scripts/pile-de-test.sh (`pnpm test:integration`,
 * `pnpm db:test:stop`, `pnpm db:test:reset`). Règles : ./regles.ts ; pourquoi :
 * docs/archive/wip/base-locale-progress.md § 12.
 *
 * La base de dev (ports 5432x) n'est jamais touchée : tout passe par un dossier de travail à
 * part (`--workdir`), dont le `config.toml` porte un autre nom de projet et d'autres ports.
 */

import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import pg from 'pg';
import { mettreAJour } from '../db-a-jour/appliquer';
import { lireFichier } from '../db-a-jour/regles';
import {
	CLE_DECOR,
	configDeTest,
	deciderPreparation,
	empreinte,
	environnementDeTest,
	PORT_API,
	PORT_DB,
	PROJET,
	TABLE_EMPREINTES,
	type FichierDeMigration
} from './regles';

// ============================================================================
// Constantes
// ============================================================================

const RACINE = process.cwd();
const SOURCE = resolve(RACINE, 'supabase');
const MIGRATIONS = join(SOURCE, 'migrations');
/** Dossier de travail de la CLI pour la pile de test (ignoré par git, propre à chaque worktree). */
const TRAVAIL = resolve(RACINE, 'node_modules/.cache/pile-de-test');
const CLI = resolve(RACINE, 'node_modules/.bin/supabase');
/** Services non démarrés : les mêmes qu'en CI (.github/workflows/nightly-integration.yml). */
const EXCLUS = 'imgproxy,studio,edge-runtime,logflare,vector,mailpit,postgres-meta';
const PG_URL = `postgresql://postgres:postgres@127.0.0.1:${PORT_DB}/postgres`;
const VOLUME = `supabase_db_${PROJET}`;

// ============================================================================
// Fonctions
// ============================================================================

function dire(ligne: string): void {
	console.log(ligne);
}

class Echec extends Error {}

/** Lance la CLI Supabase sur le dossier de travail de la pile de test. */
function cli(args: string[]): void {
	const r = spawnSync(CLI, ['--workdir', TRAVAIL, ...args], { stdio: 'inherit' });
	if (r.status !== 0) {
		throw new Echec(
			`\`supabase ${args.join(' ')}\` a échoué sur la pile de test (voir ci-dessus). ` +
				`Port ${PORT_API} ou ${PORT_DB} déjà pris ? \`pnpm db:test:reset\` la reconstruit.`
		);
	}
}

function dockerRepond(): boolean {
	return spawnSync('docker', ['info'], { stdio: 'ignore' }).status === 0;
}

function volumePresent(): boolean {
	return spawnSync('docker', ['volume', 'inspect', VOLUME], { stdio: 'ignore' }).status === 0;
}

function fichiersDeLaBranche(): FichierDeMigration[] {
	const fichiers: FichierDeMigration[] = [];
	for (const nom of readdirSync(MIGRATIONS)) {
		const m = lireFichier(nom);
		if (!m) continue;
		fichiers.push({
			version: m.version,
			fichier: nom,
			empreinte: empreinte(readFileSync(join(MIGRATIONS, nom), 'utf8'))
		});
	}
	return fichiers;
}

/** Tous les fichiers d'un dossier, triés, chemin et contenu. */
function contenuDuDossier(dossier: string): string[] {
	return readdirSync(dossier, { withFileTypes: true, recursive: true })
		.filter((e) => e.isFile())
		.map((e) => join(e.parentPath, e.name))
		.sort()
		.map((chemin) => `${chemin.slice(dossier.length)}\n${readFileSync(chemin, 'utf8')}`);
}

/** Tout ce qui change la pile sans être une migration : configuration, seeds, version de la CLI. */
function empreinteDuDecor(): string {
	const version = JSON.parse(
		readFileSync(resolve(RACINE, 'node_modules/supabase/package.json'), 'utf8')
	) as { version: string };
	return empreinte(
		[
			version.version,
			EXCLUS,
			configDeTest(readFileSync(join(SOURCE, 'config.toml'), 'utf8')),
			readFileSync(join(SOURCE, 'seed.sql'), 'utf8'),
			...contenuDuDossier(join(SOURCE, 'seed'))
		].join('\n')
	);
}

/** Recopie dans le dossier de travail ce que la CLI lit pour construire la pile. */
function preparerLeDossierDeTravail(): void {
	const cible = join(TRAVAIL, 'supabase');
	rmSync(cible, { recursive: true, force: true });
	mkdirSync(cible, { recursive: true });
	writeFileSync(
		join(cible, 'config.toml'),
		configDeTest(readFileSync(join(SOURCE, 'config.toml'), 'utf8'))
	);
	cpSync(join(SOURCE, 'seed.sql'), join(cible, 'seed.sql'));
	cpSync(join(SOURCE, 'seed'), join(cible, 'seed'), { recursive: true });
	cpSync(MIGRATIONS, join(cible, 'migrations'), { recursive: true });
}

async function connecter(): Promise<pg.Client | null> {
	const db = new pg.Client({ connectionString: PG_URL, connectionTimeoutMillis: 2000 });
	try {
		await db.connect();
		return db;
	} catch {
		await db.end().catch(() => {});
		return null;
	}
}

async function apiRepond(): Promise<boolean> {
	try {
		const r = await fetch(`http://127.0.0.1:${PORT_API}/auth/v1/health`, {
			signal: AbortSignal.timeout(3000)
		});
		return r.ok;
	} catch {
		return false;
	}
}

async function lireLEtat(db: pg.Client): Promise<{
	appliquees: string[];
	empreintes: Map<string, string> | null;
	decorEnBase: string | null;
}> {
	const present = await db.query<{ present: boolean }>(
		`select to_regclass('supabase_migrations.schema_migrations') is not null as present`
	);
	if (!present.rows[0].present) {
		throw new Echec(
			'La pile de test répond, mais sans historique de migrations (construction interrompue ?) : `pnpm db:test:reset`.'
		);
	}
	const historique = await db.query<{ version: string }>(
		`select version from supabase_migrations.schema_migrations`
	);
	const appliquees = historique.rows.map((r) => r.version);
	const { rows } = await db.query<{ present: boolean }>(
		`select to_regclass('${TABLE_EMPREINTES}') is not null as present`
	);
	if (!rows[0].present) return { appliquees, empreintes: null, decorEnBase: null };
	const lignes = await db.query<{ cle: string; empreinte: string }>(
		`select cle, empreinte from ${TABLE_EMPREINTES}`
	);
	const empreintes = new Map(lignes.rows.map((r) => [r.cle, r.empreinte]));
	const decorEnBase = empreintes.get(CLE_DECOR) ?? null;
	empreintes.delete(CLE_DECOR);
	return { appliquees, empreintes, decorEnBase };
}

/** Note l'empreinte des migrations données (celles qui viennent d'être jouées), et du décor. */
async function noterLesEmpreintes(
	db: pg.Client,
	fichiers: readonly FichierDeMigration[],
	decor: string
): Promise<void> {
	await db.query(
		`create table if not exists ${TABLE_EMPREINTES} (cle text primary key, empreinte text not null)`
	);
	const cles = [CLE_DECOR, ...fichiers.map((f) => f.version)];
	const valeurs = [decor, ...fichiers.map((f) => f.empreinte)];
	await db.query(
		`insert into ${TABLE_EMPREINTES} (cle, empreinte)
		 select * from unnest($1::text[], $2::text[])
		 on conflict (cle) do update set empreinte = excluded.empreinte`,
		[cles, valeurs]
	);
}

/**
 * Construit la pile de zéro : conteneurs et volumes supprimés, puis `supabase start`, qui joue
 * les migrations de la branche et le seed simple. Rend la connexion à la base neuve.
 */
async function construire(
	fichiers: readonly FichierDeMigration[],
	decor: string
): Promise<pg.Client> {
	const debut = Date.now();
	preparerLeDossierDeTravail();
	cli(['stop', '--no-backup']);
	cli(['start', '-x', EXCLUS]);
	const db = await connecter();
	if (!db) throw new Echec('Pile de test démarrée, mais sa base ne répond pas.');
	const { appliquees } = await lireLEtat(db);
	const faites = new Set(appliquees);
	await noterLesEmpreintes(
		db,
		fichiers.filter((f) => faites.has(f.version)),
		decor
	);
	dire(`✅ Pile de test construite en ${Math.round((Date.now() - debut) / 1000)} s.`);
	return db;
}

/**
 * Met la pile de test d'accord avec la branche : démarrée, portant exactement ses migrations.
 * `forcer` : reconstruire sans regarder (`pnpm db:test:reset`).
 */
async function preparer(forcer = false): Promise<void> {
	if (!dockerRepond()) {
		throw new Echec('Docker ne répond pas : démarre Docker Desktop, puis relance.');
	}
	const fichiers = fichiersDeLaBranche();
	const decor = empreinteDuDecor();

	let db = forcer ? null : await connecter();
	if (!forcer && db && !(await apiRepond())) {
		// Base debout mais API muette : pile à moitié arrêtée. On la relance, ses données restent.
		await db.end();
		dire('↻ Pile de test à moitié arrêtée : redémarrage…');
		preparerLeDossierDeTravail();
		cli(['stop']);
		cli(['start', '-x', EXCLUS]);
		db = await connecter();
	} else if (!forcer && !db && volumePresent()) {
		dire('▶ Pile de test arrêtée : démarrage…');
		preparerLeDossierDeTravail();
		cli(['start', '-x', EXCLUS]);
		db = await connecter();
	}

	if (!db) {
		dire(
			forcer
				? '↻ Pile de test : reconstruction de zéro (environ 1 min)…'
				: '▶ Pile de test absente : construction (environ 1 min, la première fois plus)…'
		);
		db = await construire(fichiers, decor);
	}

	try {
		const etat = await lireLEtat(db);
		const decision = deciderPreparation({ fichiers, ...etat, decor });
		if (decision.action === 'reconstruire') {
			dire(`↻ Pile de test reconstruite de zéro (environ 1 min) : ${decision.raison}.`);
			await db.end();
			db = await construire(fichiers, decor);
			return;
		}
		if (decision.action === 'appliquer') {
			const bilan = await mettreAJour(db, { dossier: MIGRATIONS, dire });
			const jouees = new Set(
				[...bilan.jouees, ...bilan.notees.map((n) => n.migration)].map((m) => m.version)
			);
			await noterLesEmpreintes(
				db,
				fichiers.filter((f) => jouees.has(f.version)),
				decor
			);
			if (bilan.arret) {
				throw new Echec(
					`Migration en échec sur la pile de test : ${bilan.arret.migration.fichier}\n` +
						`   Erreur : ${bilan.arret.message}\n` +
						`   Les tests ne sont pas lancés. Corrige la migration, puis relance.`
				);
			}
			dire(`✅ Pile de test à jour : ${bilan.jouees.length} migration(s) jouée(s).`);
		}
	} finally {
		await db.end().catch(() => {});
	}
}

async function main(): Promise<number> {
	const [commande, ...reste] = process.argv.slice(2);
	if (process.env.GITHUB_ACTIONS) {
		throw new Echec('En CI, la pile de test est celle du workflow : cette commande ne fait rien.');
	}
	if (commande === 'stop') {
		preparerLeDossierDeTravail();
		cli(['stop']);
		return 0;
	}
	if (commande === 'reset') {
		await preparer(true);
		return 0;
	}
	if (commande === 'lancer' && reste[0] === '--' && reste.length > 1) {
		await preparer();
		const r = spawnSync(reste[1], reste.slice(2), {
			stdio: 'inherit',
			env: { ...process.env, ...environnementDeTest() }
		});
		if (r.error) throw new Echec(`Commande de test non lancée : ${r.error.message}`);
		return r.status ?? 1;
	}
	throw new Echec('Usage : index.ts lancer -- <commande…> | stop | reset');
}

main()
	.then((code) => process.exit(code))
	.catch((e) => {
		console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
		process.exit(1);
	});
