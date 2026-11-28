/**
 * Écriture d'un lot de réécriture des constructions publiques
 * ===========================================================
 *
 * Lots (`--lot`) :
 * - `2026-10-23` (`contenu.ts`) : réécriture des 9 constructions publiques ;
 * - `v76` (`arcs-carre.ts`, 2026-11-28) : les arcs de compas du carré s'effacent.
 *
 * ⚠️ SIMULATION PAR DÉFAUT : rien n'est écrit en prod sans `--publier`.
 * ⚠️ `--cible prod --publier` : lancé par David, après sa relecture du rendu en local.
 *
 * Usage :
 *   pnpm constructions:reecrire --lot <lot> --cible local    (aperçu : les constructions réécrites
 *                                                          + titres et descriptions des autres)
 *   pnpm constructions:reecrire --lot <lot> --cible prod     (simulation : diff + sauvegarde)
 *   pnpm constructions:reecrire --lot <lot> --cible prod --publier
 *
 * Local (`.env.local`) : aperçu du rendu seulement, sans lire la prod. Prod (`.env`),
 * avant toute écriture :
 * 1. sauvegarde des lignes lues dans le fichier du lot (`scripts/constructions-prod/avant-<lot>.json`)
 *    (à commiter : c'est le retour arrière ; hors de `data/`, que git ignore) ; `--publier`
 *    refuse si la sauvegarde ne contient pas l'état d'avant de chaque ligne à écrire ;
 * 2. chaque ligne doit porter son titre d'avant ; quand le lot donne le script d'avant (lot qui
 *    ne change que le script), aussi ce script, sa description et sa publication (sinon : déjà
 *    faite → sautée, ou modifiée entre-temps → lot refusé en entier) ;
 * 3. écriture sous condition `updated_at` inchangé, ligne rendue relue et comparée aux
 *    valeurs voulues (une garde qui échoue rend 0 ligne, sans erreur). Une écriture
 *    interrompue se relance telle quelle : les lignes déjà faites sont sautées.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { parse } from 'dotenv';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Database } from '../../src/lib/types/database';
import { CHANGES as CHANGES_2026_10_23, type ConstructionChange } from './contenu';
import { CHANGES as CHANGES_V76 } from './arcs-carre';

// ============================================================================
// TYPES
// ============================================================================

type Row = Pick<
	Database['public']['Tables']['constructions']['Row'],
	| 'id'
	| 'title'
	| 'description'
	| 'script'
	| 'dsl_script'
	| 'format'
	| 'is_public'
	| 'created_at'
	| 'updated_at'
>;

// ============================================================================
// CONSTANTES
// ============================================================================

const PROD_HOST = 'cnevnzsvixxpnurautls.supabase.co';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);
const LOTS: Record<string, { changes: readonly ConstructionChange[]; backupFile: string }> = {
	'2026-10-23': {
		changes: CHANGES_2026_10_23,
		backupFile: 'scripts/constructions-prod/avant-2026-10-23.json'
	},
	v76: { changes: CHANGES_V76, backupFile: 'scripts/constructions-prod/avant-v76.json' }
};
const COLUMNS =
	'id, title, description, script, dsl_script, format, is_public, created_at, updated_at';

// ============================================================================
// FONCTIONS
// ============================================================================

function argValue(flag: string): string | undefined {
	const index = process.argv.indexOf(flag);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

function clientFrom(file: string, urlKey: string, expected: (host: string) => boolean) {
	const env = parse(readFileSync(file));
	const url = env[urlKey];
	const key = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error(`${urlKey} et SUPABASE_SERVICE_ROLE_KEY requis (${file})`);
	const host = new URL(url).hostname;
	if (!expected(host)) throw new Error(`${file} vise ${host} : base inattendue, arrêt`);
	return createClient<Database>(url, key, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

async function readRows(
	supabase: SupabaseClient<Database>,
	changes: readonly ConstructionChange[]
): Promise<Row[]> {
	const { data, error } = await supabase
		.from('constructions')
		.select(COLUMNS)
		.in(
			'id',
			changes.map((c) => c.id)
		);
	if (error) throw new Error(`lecture des constructions : ${error.message}`);
	return data ?? [];
}

function writeBackup(rows: Row[], backupFile: string): void {
	const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id));
	const content = JSON.stringify(sorted, null, '\t') + '\n';
	if (existsSync(backupFile) && readFileSync(backupFile, 'utf8') !== content) {
		// La sauvegarde est le retour arrière : ne jamais l'écraser par un état déjà réécrit
		console.log(`  sauvegarde déjà présente et différente, gardée telle quelle : ${backupFile}`);
		return;
	}
	mkdirSync(dirname(backupFile), { recursive: true });
	writeFileSync(backupFile, content);
	console.log(`  sauvegarde : ${backupFile}`);
}

/** Lignes à écrire dont la sauvegarde ne garde pas l'état lu (retour arrière incomplet) */
function missingFromBackup(rows: Row[], backupFile: string): string[] {
	const saved: unknown = existsSync(backupFile) ? JSON.parse(readFileSync(backupFile, 'utf8')) : [];
	const savedById = new Map<string, unknown>(
		Array.isArray(saved)
			? saved.flatMap((s: unknown) =>
					s && typeof s === 'object' && 'id' in s && typeof s.id === 'string' ? [[s.id, s]] : []
				)
			: []
	);
	return rows
		.filter((row) => {
			const s = savedById.get(row.id);
			return !(
				s &&
				typeof s === 'object' &&
				'title' in s &&
				s.title === row.title &&
				'dsl_script' in s &&
				s.dsl_script === row.dsl_script
			);
		})
		.map((row) => row.id);
}

/** 'todo' à écrire, 'done' déjà écrite, sinon la raison du refus */
function rowState(row: Row | undefined, change: ConstructionChange): 'todo' | 'done' | string {
	if (!row) return 'absente de la base';
	const done =
		row.title === change.title &&
		row.description === change.description &&
		row.dsl_script === (change.dslScript ?? row.dsl_script) &&
		row.is_public === change.isPublic;
	if (done) return 'done';
	if (row.title !== change.titreAvant) return `titre inattendu « ${row.title} »`;
	if (change.dslAvant !== undefined) {
		// Lot qui ne change que le script : description et publication doivent être
		// celles qu'il réécrit, sinon il écraserait un changement fait entre-temps.
		if (row.dsl_script !== change.dslAvant) {
			return 'script modifié depuis la sauvegarde dont le nouveau est tiré';
		}
		if (row.description !== change.description) return 'description modifiée entre-temps';
		if (row.is_public !== change.isPublic) return 'publication modifiée entre-temps';
	}
	return 'todo';
}

function describeChange(row: Row, change: ConstructionChange): string {
	const parts: string[] = [];
	if (row.title !== change.title) parts.push(`titre « ${row.title} » → « ${change.title} »`);
	if (row.description !== change.description) parts.push('description');
	if (change.dslScript && change.dslScript !== row.dsl_script) parts.push('script réécrit');
	if (row.is_public !== change.isPublic) parts.push(change.isPublic ? 'publiée' : 'dépubliée');
	return parts.join(', ');
}

/**
 * Aperçu local : les constructions réécrites, sans auteur comme en prod (remplacées si déjà
 * là) ; les autres, si la base locale les a (copie de `db:seed-riche`), reçoivent titre,
 * description et publication.
 */
async function insertPreview(
	supabase: SupabaseClient<Database>,
	changes: readonly ConstructionChange[]
): Promise<void> {
	const rewritten = changes.filter((c) => c.dslScript !== undefined);
	const { data, error } = await supabase
		.from('constructions')
		.upsert(
			rewritten.map((c) => ({
				id: c.id,
				title: c.title,
				description: c.description,
				dsl_script: c.dslScript,
				script: {},
				format: 'dsl',
				is_public: c.isPublic
			}))
		)
		.select('id');
	if (error) throw new Error(`aperçu local : ${error.message}`);
	if ((data ?? []).length !== rewritten.length) {
		throw new Error(`aperçu local : ${data?.length ?? 0} ligne(s) sur ${rewritten.length}`);
	}
	for (const c of rewritten) console.log(`  ${c.title} : /constructions/${c.id}`);

	for (const c of changes.filter((change) => change.dslScript === undefined)) {
		const { data: updated, error: updateError } = await supabase
			.from('constructions')
			.update({ title: c.title, description: c.description, is_public: c.isPublic })
			.eq('id', c.id)
			.select('id');
		if (updateError) throw new Error(`aperçu local : ${updateError.message}`);
		console.log(
			`  ${c.title} : ${(updated ?? []).length === 1 ? 'mise à jour' : 'absente en local'}`
		);
	}
}

async function applyChange(
	supabase: SupabaseClient<Database>,
	row: Row,
	change: ConstructionChange
): Promise<void> {
	const { data, error } = await supabase
		.from('constructions')
		.update({
			title: change.title,
			description: change.description,
			dsl_script: change.dslScript ?? row.dsl_script,
			is_public: change.isPublic,
			updated_at: new Date().toISOString()
		})
		.eq('id', row.id)
		.eq('updated_at', row.updated_at)
		.select(COLUMNS);
	if (error) throw new Error(`${row.id} : ${error.message}`);
	if ((data ?? []).length !== 1) {
		throw new Error(`${row.id} : 0 ligne écrite (modifiée entre la lecture et l'écriture ?)`);
	}
	if (rowState(data?.[0], change) !== 'done') {
		throw new Error(`${row.id} : la ligne rendue ne porte pas les valeurs voulues`);
	}
}

async function main(): Promise<void> {
	const cible = argValue('--cible');
	if (cible !== 'local' && cible !== 'prod') throw new Error('--cible local|prod requis');
	const publish = process.argv.includes('--publier');
	const lotName = argValue('--lot');
	const lot = lotName ? LOTS[lotName] : undefined;
	if (!lot) throw new Error(`--lot ${Object.keys(LOTS).join('|')} requis`);

	if (cible === 'local') {
		const local = clientFrom('.env.local', 'SUPABASE_URL', (h) => LOCAL_HOSTS.has(h));
		console.log('Cible : base LOCALE (aperçu)');
		await insertPreview(local, lot.changes);
		return;
	}

	const prod = clientFrom('.env', 'PUBLIC_SUPABASE_URL', (h) => h === PROD_HOST);
	const rows = await readRows(prod, lot.changes);
	console.log(`Cible : PRODUCTION${publish ? '' : ' (simulation)'}, ${rows.length} lignes lues`);
	writeBackup(rows, lot.backupFile);
	const byId = new Map(rows.map((r) => [r.id, r]));

	const todo: { row: Row; change: ConstructionChange }[] = [];
	const refusals: string[] = [];
	for (const change of lot.changes) {
		const row = byId.get(change.id);
		const state = rowState(row, change);
		if (state === 'done') console.log(`  = ${change.title} : déjà faite`);
		else if (state === 'todo' && row) {
			todo.push({ row, change });
			console.log(`  → ${change.title} : ${describeChange(row, change)}`);
		} else refusals.push(`${change.id} : ${state}`);
	}
	if (refusals.length > 0) {
		for (const r of refusals) console.log(`  ✗ ${r}`);
		throw new Error('lot refusé en entier, rien n’est écrit');
	}
	if (!publish) {
		console.log(`Simulation : ${todo.length} ligne(s) à écrire. Relancer avec --publier.`);
		return;
	}
	const unsaved = missingFromBackup(
		todo.map((t) => t.row),
		lot.backupFile
	);
	if (unsaved.length > 0) {
		throw new Error(
			`sauvegarde ${lot.backupFile} sans l'état d'avant de : ${unsaved.join(', ')} ; rien n'est écrit`
		);
	}
	try {
		for (const { row, change } of todo) await applyChange(prod, row, change);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`${message} — relancer la même commande : les lignes faites sont sautées`);
	}
	console.log(`${todo.length} ligne(s) écrite(s).`);
}

// ============================================================================
// EXÉCUTION
// ============================================================================

main().catch((err: unknown) => {
	console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
	process.exit(1);
});
