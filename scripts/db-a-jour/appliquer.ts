/**
 * `pnpm db:a-jour` : jouer les migrations en attente sur une base locale, sans rien effacer
 * ========================================================================================
 *
 * Pourquoi pas `supabase migration up --local` : la CLI refuse de tourner dès que la base
 * porte une version sans fichier (`MigrationMissingLocalError`), ce qui est l'état normal d'une
 * base partagée par des worktrees sur des branches différentes ; et elle s'arrête sur la
 * première migration de contenu dont les modèles sont déjà venus de la prod (mesuré le
 * 2026-11-21, docs/archive/wip/base-locale-progress.md § 9).
 *
 * Chaque migration tourne dans SA transaction, avec sa ligne dans l'historique
 * (`supabase_migrations.schema_migrations`, le même que la CLI) : jouée en entier, ou pas du tout.
 *
 * Testé sur une vraie base : tests/integration/db-a-jour.test.ts.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type pg from 'pg';
import { deciderApresEchec, enAttente, porteSaTransaction, type Migration } from './regles';

// ============================================================================
// Types
// ============================================================================

export interface Options {
	/** Dossier des migrations (`supabase/migrations`). */
	dossier: string;
	/** Ne jouer que ces fichiers (mode automatique : ceux d'`origin/main`). Absent : tous. */
	seulement?: ReadonlySet<string>;
	/** Ne rien écrire : rendre ce qui serait joué. */
	essai?: boolean;
	/**
	 * Délai d'attente d'un verrou, par migration (ex. `'5s'`). Sans lui, un `alter table` attend
	 * sans fin la transaction ouverte d'un autre serveur de dev. Le dépassement arrête la mise à jour.
	 */
	attenteVerrou?: string;
	/** Une ligne par migration traitée. */
	dire?: (ligne: string) => void;
}

export interface Bilan {
	jouees: Migration[];
	/** Migrations de contenu notées comme faites sans être jouées, avec l'erreur rencontrée. */
	notees: { migration: Migration; message: string }[];
	/** En attente mais écartées par `seulement` (migrations de la branche). */
	ecartees: Migration[];
	/** La migration qui a arrêté la mise à jour ; les suivantes ne sont pas jouées. */
	arret?: { migration: Migration; message: string; raison: string };
	/** Mode essai : ce qui serait joué. */
	prevues: Migration[];
}

// ============================================================================
// Constantes
// ============================================================================

/** Schéma et table de l'état de la base locale ; n'existent jamais en prod. */
const ETAT = 'base_locale.etat';

// ============================================================================
// Fonctions
// ============================================================================

/** L'historique existe-t-il ? Sur une base vide (Postgres nu), non. */
async function versionsAppliquees(db: pg.Client): Promise<string[]> {
	const { rows } = await db.query<{ present: boolean }>(
		`select to_regclass('supabase_migrations.schema_migrations') is not null as present`
	);
	if (!rows[0].present) {
		throw new Error(
			'Historique des migrations absent : la base n’a pas été créée par `pnpm db:start`.'
		);
	}
	const res = await db.query<{ version: string }>(
		'select version from supabase_migrations.schema_migrations'
	);
	return res.rows.map((r) => r.version);
}

/** La base porte-t-elle le contenu de la prod (`pnpm db:seed-riche`) ? */
export async function porteLeContenuDeProd(db: pg.Client): Promise<boolean> {
	const { rows } = await db.query<{ present: boolean }>(
		`select to_regclass('${ETAT}') is not null as present`
	);
	if (!rows[0].present) return false;
	const res = await db.query(`select 1 from ${ETAT} where cle = 'contenu' and valeur = 'prod'`);
	return res.rowCount === 1;
}

/**
 * Marque la base : son contenu vient de la prod. Appelé par `db:seed-riche` après la copie.
 * Un `db:reset` recrée la base : la marque disparaît avec le contenu.
 */
export async function marquerContenuDeProd(db: pg.Client): Promise<void> {
	await db.query(`
		create schema if not exists base_locale;
		create table if not exists ${ETAT} (
			cle text primary key,
			valeur text not null,
			maj timestamptz not null default now()
		);
		insert into ${ETAT} (cle, valeur) values ('contenu', 'prod')
		on conflict (cle) do update set valeur = excluded.valeur, maj = now();
	`);
}

async function noter(db: pg.Client, m: Migration, sql: string | null): Promise<void> {
	await db.query(
		`insert into supabase_migrations.schema_migrations (version, name, statements)
		 values ($1, $2, $3) on conflict (version) do nothing`,
		[m.version, m.nom, sql === null ? null : [sql]]
	);
}

/**
 * Joue une migration et l'inscrit à l'historique, dans une seule transaction. Une migration qui
 * porte sa propre transaction est jouée telle quelle, inscrite ensuite : son `commit` validerait
 * la nôtre en cours de route.
 */
async function jouer(db: pg.Client, m: Migration, sql: string): Promise<void> {
	if (porteSaTransaction(sql)) {
		try {
			await db.query(sql);
		} catch (e) {
			await db.query('rollback').catch(() => {});
			throw e;
		}
		await noter(db, m, sql);
		return;
	}
	await db.query('begin');
	try {
		await db.query(sql);
		await noter(db, m, sql);
		await db.query('commit');
	} catch (e) {
		await db.query('rollback').catch(() => {});
		throw e;
	}
}

function lireEchec(e: unknown): { code?: string; message: string } {
	if (e instanceof Error) {
		const code = (e as { code?: unknown }).code;
		return { code: typeof code === 'string' ? code : undefined, message: e.message };
	}
	return { message: String(e) };
}

/**
 * Met la base à jour : joue, dans l'ordre, les migrations dont le fichier est présent et la
 * version absente de l'historique. S'arrête à la première qui échoue sans pouvoir être notée.
 */
export async function mettreAJour(db: pg.Client, options: Options): Promise<Bilan> {
	const dire = options.dire ?? (() => {});
	const fichiers = readdirSync(options.dossier).filter((f) => f.endsWith('.sql'));
	const attente = enAttente(fichiers, await versionsAppliquees(db));
	const retenues = options.seulement
		? attente.filter((m) => options.seulement?.has(m.fichier))
		: attente;
	const bilan: Bilan = {
		jouees: [],
		notees: [],
		ecartees: attente.filter((m) => !retenues.includes(m)),
		prevues: []
	};
	if (options.essai) {
		bilan.prevues = retenues;
		return bilan;
	}
	if (retenues.length === 0) return bilan;

	if (options.attenteVerrou) {
		await db.query(`select set_config('lock_timeout', $1, false)`, [options.attenteVerrou]);
	}
	const contenuDeProd = await porteLeContenuDeProd(db);
	for (const m of retenues) {
		const sql = readFileSync(join(options.dossier, m.fichier), 'utf8');
		try {
			await jouer(db, m, sql);
			bilan.jouees.push(m);
			dire(`  ✓ ${m.fichier}`);
		} catch (e) {
			const echec = lireEchec(e);
			const decision = deciderApresEchec(sql, echec, contenuDeProd);
			if (decision.action === 'arreter') {
				bilan.arret = { migration: m, message: echec.message, raison: decision.raison };
				break;
			}
			await noter(db, m, sql);
			bilan.notees.push({ migration: m, message: echec.message });
			dire(`  ↷ ${m.fichier} : notée comme faite (${decision.raison})`);
		}
	}
	// PostgREST garde le schéma en mémoire : sans ce signal, une colonne neuve reste inconnue de l'API.
	if (bilan.jouees.length > 0) await db.query(`notify pgrst, 'reload schema'`);
	return bilan;
}

/**
 * Note une version comme faite sans la jouer, à la demande (`pnpm db:a-jour --noter <version>`) :
 * la sortie de secours quand une migration de contenu échoue pour une raison que les règles ne
 * reconnaissent pas.
 */
export async function noterALaMain(
	db: pg.Client,
	dossier: string,
	version: string
): Promise<Migration> {
	const fichiers = readdirSync(dossier).filter((f) => f.endsWith('.sql'));
	const [m] = enAttente(fichiers, await versionsAppliquees(db)).filter(
		(x) => x.version === version
	);
	if (!m) throw new Error(`Aucune migration en attente ne porte la version ${version}.`);
	await noter(db, m, readFileSync(join(dossier, m.fichier), 'utf8'));
	return m;
}
