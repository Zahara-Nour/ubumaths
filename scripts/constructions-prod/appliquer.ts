/**
 * Écriture de la réécriture des constructions publiques (`contenu.ts`)
 * ====================================================================
 *
 * ⚠️ SIMULATION PAR DÉFAUT : rien n'est écrit en prod sans `--publier`.
 * ⚠️ `--cible prod --publier` : lancé par David, après sa relecture du rendu en local.
 *
 * Usage :
 *   pnpm constructions:reecrire --cible local              (aperçu : insère les 3 constructions
 *                                                          réécrites dans la base locale)
 *   pnpm constructions:reecrire --cible prod               (simulation : diff + sauvegarde)
 *   pnpm constructions:reecrire --cible prod --publier
 *
 * Local (`.env.local`) : aperçu du rendu seulement, sans lire la prod. Prod (`.env`),
 * avant toute écriture :
 * 1. sauvegarde des lignes lues dans `scripts/constructions-prod/avant-2026-10-23.json`
 *    (à commiter : c'est le retour arrière ; hors de `data/`, ignoré par git) ; `--publier`
 *    refuse si la sauvegarde ne contient pas l'état d'avant de chaque ligne à écrire ;
 * 2. chaque ligne doit porter son titre d'avant (sinon : déjà faite → sautée, ou modifiée
 *    entre-temps → lot refusé en entier) ;
 * 3. écriture sous condition `updated_at` inchangé, ligne rendue relue et comparée aux
 *    valeurs voulues (une garde qui échoue rend 0 ligne, sans erreur). Une écriture
 *    interrompue se relance telle quelle : les lignes déjà faites sont sautées.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { parse } from 'dotenv';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Database } from '../../src/lib/types/database';
import { CHANGES, type ConstructionChange } from './contenu';

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
	| 'author_id'
	| 'created_at'
	| 'updated_at'
>;

// ============================================================================
// CONSTANTES
// ============================================================================

const PROD_HOST = 'cnevnzsvixxpnurautls.supabase.co';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);
const BACKUP_FILE = 'scripts/constructions-prod/avant-2026-10-23.json';
const COLUMNS =
	'id, title, description, script, dsl_script, format, is_public, author_id, created_at, updated_at';

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

async function readRows(supabase: SupabaseClient<Database>): Promise<Row[]> {
	const { data, error } = await supabase
		.from('constructions')
		.select(COLUMNS)
		.in(
			'id',
			CHANGES.map((c) => c.id)
		);
	if (error) throw new Error(`lecture des constructions : ${error.message}`);
	return data ?? [];
}

function writeBackup(rows: Row[]): void {
	const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id));
	const content = JSON.stringify(sorted, null, '\t') + '\n';
	if (existsSync(BACKUP_FILE) && readFileSync(BACKUP_FILE, 'utf8') !== content) {
		// La sauvegarde est le retour arrière : ne jamais l'écraser par un état déjà réécrit
		console.log(`  sauvegarde déjà présente et différente, gardée telle quelle : ${BACKUP_FILE}`);
		return;
	}
	mkdirSync(dirname(BACKUP_FILE), { recursive: true });
	writeFileSync(BACKUP_FILE, content);
	console.log(`  sauvegarde : ${BACKUP_FILE}`);
}

/** Lignes à écrire dont la sauvegarde ne garde pas l'état lu (retour arrière incomplet) */
function missingFromBackup(rows: Row[]): string[] {
	const saved: unknown = existsSync(BACKUP_FILE)
		? JSON.parse(readFileSync(BACKUP_FILE, 'utf8'))
		: [];
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

async function findLocalAdmin(supabase: SupabaseClient<Database>): Promise<string> {
	const { data, error } = await supabase.from('profiles').select('id').eq('role', 'admin');
	if (error) throw new Error(`lecture des admins locaux : ${error.message}`);
	if (!data || data.length !== 1) throw new Error(`base locale : ${data?.length ?? 0} admin(s)`);
	return data[0].id;
}

/** Aperçu local : les constructions réécrites, auteur = l'admin local (remplacées si déjà là) */
async function insertPreview(supabase: SupabaseClient<Database>): Promise<void> {
	const adminId = await findLocalAdmin(supabase);
	const rewritten = CHANGES.filter((c) => c.dslScript !== undefined);
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
				is_public: c.isPublic,
				author_id: adminId
			}))
		)
		.select('id');
	if (error) throw new Error(`aperçu local : ${error.message}`);
	if ((data ?? []).length !== rewritten.length) {
		throw new Error(`aperçu local : ${data?.length ?? 0} ligne(s) sur ${rewritten.length}`);
	}
	for (const c of rewritten) console.log(`  ${c.title} : /constructions/${c.id}`);
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

	if (cible === 'local') {
		const local = clientFrom('.env.local', 'SUPABASE_URL', (h) => LOCAL_HOSTS.has(h));
		console.log('Cible : base LOCALE (aperçu)');
		await insertPreview(local);
		return;
	}

	const prod = clientFrom('.env', 'PUBLIC_SUPABASE_URL', (h) => h === PROD_HOST);
	const rows = await readRows(prod);
	console.log(`Cible : PRODUCTION${publish ? '' : ' (simulation)'}, ${rows.length} lignes lues`);
	writeBackup(rows);
	const byId = new Map(rows.map((r) => [r.id, r]));

	const todo: { row: Row; change: ConstructionChange }[] = [];
	const refusals: string[] = [];
	for (const change of CHANGES) {
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
	const unsaved = missingFromBackup(todo.map((t) => t.row));
	if (unsaved.length > 0) {
		throw new Error(
			`sauvegarde ${BACKUP_FILE} sans l'état d'avant de : ${unsaved.join(', ')} ; rien n'est écrit`
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
