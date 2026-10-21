/**
 * `pi` nu → `\pi` dans les calculs des modèles EN BASE
 * ====================================================
 *
 * ⚠️ SIMULATION PAR DÉFAUT : rien n'est écrit sans `--ecrire`.
 *
 * Préalable au retrait de la tolérance `BARE_PI` (chantier lecture-grandeurs) : un
 * `{{eval:…}}`, une condition ou une expression de variable qui écrit `pi` nu est
 * désormais refusé. La réécriture `\pi` ne change aucune valeur calculée, ni avec
 * l'ancien code (qui lisait déjà `\pi`), ni avec le nouveau.
 *
 * Pour chaque modèle concerné (`rewriteBarePi`) :
 *  - seuls les champs qui changent sont écrits (`variations`, `shared`, `options`,
 *    `test_specs`) ; rien d'autre, `status` compris ;
 *  - la simulation affiche chaque calcul avant / après ;
 *  - avant écriture, les lignes visées sont sauvegardées (`data/migration-output/backups/`) ;
 *  - l'écriture n'a lieu que si `updated_at` n'a pas bougé depuis la lecture ;
 *  - après écriture, la ligne est relue et comparée champ par champ ; arrêt à la
 *    première différence. Le script est idempotent : le relancer reprend où il s'est arrêté.
 *
 * Usage :
 *   pnpm tsx scripts/reecrire-pi-nu-base.ts            (simulation)
 *   pnpm tsx scripts/reecrire-pi-nu-base.ts --ecrire   (écrit)
 * La base visée est celle de `.env` (PUBLIC_SUPABASE_URL) : prod ou locale seulement.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { rewriteBarePi } from '$lib/ubumark/parameterization/validator/bare-pi';
import type { Json, Tables, TablesUpdate } from '$lib/types/database';
import { createScriptClient, hasFlag } from './relecture/common';

// ============================================================================
// TYPES
// ============================================================================

type Row = Pick<
	Tables<'question_templates'>,
	'id' | 'title' | 'status' | 'updated_at' | 'variations' | 'shared' | 'options' | 'test_specs'
>;

type Field = 'variations' | 'shared' | 'options' | 'test_specs';

// ============================================================================
// CONSTANTS
// ============================================================================

const FIELDS: Field[] = ['variations', 'shared', 'options', 'test_specs'];
const BACKUP_DIR = 'data/migration-output/backups';
const PAGE = 500;

// ============================================================================
// FUNCTIONS
// ============================================================================

async function loadRows(supabase: ReturnType<typeof createScriptClient>['supabase']) {
	const rows: Row[] = [];
	for (let from = 0; ; from += PAGE) {
		const { data, error } = await supabase
			.from('question_templates')
			.select('id, title, status, updated_at, variations, shared, options, test_specs')
			.order('id')
			.range(from, from + PAGE - 1);
		if (error) throw error;
		rows.push(...data);
		if (data.length < PAGE) return rows;
	}
}

// ============================================================================
// MAIN
// ============================================================================

const write = hasFlag('--ecrire');
const { supabase, target } = createScriptClient(write);
console.log(`Base : ${target} · ${write ? 'ÉCRITURE' : 'simulation'}`);

const rows = await loadRows(supabase);
const targets: { row: Row; update: TablesUpdate<'question_templates'>; count: number }[] = [];
for (const row of rows) {
	const update: TablesUpdate<'question_templates'> = {};
	let count = 0;
	for (const field of FIELDS) {
		const { value, occurrences } = rewriteBarePi(row[field]);
		if (occurrences.length === 0) continue;
		update[field] = value as Json;
		count += occurrences.reduce((sum, o) => sum + o.count, 0);
		for (const o of occurrences) {
			console.log(
				`  ${row.id.slice(0, 8)} ${field}${o.path.startsWith('[') ? '' : '.'}${o.path} (${o.count})`
			);
		}
	}
	if (count > 0) targets.push({ row, update, count });
}

const total = targets.reduce((sum, t) => sum + t.count, 0);
for (const { row, count } of targets) {
	console.log(`${count}\t${row.status}\t${row.id}\t${row.title}`);
}
console.log(`TOTAL ${total} pi nus dans ${targets.length} modèles (sur ${rows.length} lus)`);

if (write && targets.length > 0) {
	mkdirSync(BACKUP_DIR, { recursive: true });
	const backup = join(BACKUP_DIR, `pi-nu-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
	writeFileSync(
		backup,
		JSON.stringify(
			targets.map((t) => t.row),
			null,
			2
		)
	);
	console.log(`Sauvegarde : ${backup}`);

	for (const { row, update } of targets) {
		const query = supabase.from('question_templates').update(update).eq('id', row.id);
		// Modèle modifié depuis la lecture : rien n'est écrasé (0 ligne, arrêt ci-dessous)
		const { data, error } = await (
			row.updated_at === null
				? query.is('updated_at', null)
				: query.eq('updated_at', row.updated_at)
		).select('id, title, status, updated_at, variations, shared, options, test_specs');
		if (error) throw error;
		// Zéro ligne : modèle modifié depuis la lecture (ou refus RLS, silencieux)
		if (data.length !== 1) {
			throw new Error(`${row.id} : ${data.length} ligne(s) écrite(s) ; relancer le script`);
		}
		const written = data[0];
		for (const field of FIELDS) {
			const expected = field in update ? update[field] : row[field];
			if (!isDeepStrictEqual(written[field], expected)) {
				throw new Error(`${row.id} : ${field} relu différent de l'écriture`);
			}
		}
		if (written.status !== row.status) throw new Error(`${row.id} : status changé`);
		console.log(`✅ ${row.id.slice(0, 8)} réécrit`);
	}
	const after = (await loadRows(supabase)).filter((row) =>
		FIELDS.some((field) => rewriteBarePi(row[field]).occurrences.length > 0)
	);
	console.log(`Relecture : ${after.length} modèle(s) avec pi nu restant(s)`);
}
