/**
 * Virgule décimale → point dans les modèles et exercices EN BASE
 * ===============================================================
 *
 * ⚠️ SIMULATION PAR DÉFAUT : rien n'est écrit sans `--ecrire`.
 *
 * Préalable à la PR 6 de lecture-grandeurs (2026-10-21) : le parseur maison ne lit plus
 * la virgule décimale (`DECIMAL_COMMA`). Les écritures de la base qui en dépendaient,
 * inventoriées en prod le 2026-10-21 (MCP en lecture seule), sont réécrites au point —
 * ce que le code en prod lit déjà : à faire AVANT le `deploy:prod` qui livre le refus.
 *
 * Remplacements EXACTS (chaîne entière, ou formule `~…~` entière), comptés : un décompte
 * qui diffère de l'inventaire arrête le script avant toute écriture.
 *  - 8 modèles publiés : variables (`2,5|3,5`, `?*0,5 = …`, `(-a,5)+b`), valeurs des
 *    specs (`a = "2,5"`) et réponses attendues (`{{a}},{{c}}`) ;
 *  - 4 exercices : 7 formules `~…~` (`~0,02~`, `~f''(0,2)~`…).
 *
 * Comme `reecrire-pi-nu-base.ts` : sauvegarde (`data/migration-output/backups/`),
 * écriture seulement si `updated_at` n'a pas bougé depuis la lecture, relecture champ
 * par champ, idempotent (relancé, il ne trouve plus rien).
 *
 * Usage :
 *   pnpm tsx scripts/reecrire-virgule-decimale-base.ts            (simulation)
 *   pnpm tsx scripts/reecrire-virgule-decimale-base.ts --ecrire   (écrit)
 * La base visée est celle de `.env` (PUBLIC_SUPABASE_URL) : prod ou locale seulement.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { Json } from '$lib/types/database';
import { createScriptClient, hasFlag } from './relecture/common';

// ============================================================================
// TYPES
// ============================================================================

type Table = 'question_templates' | 'exercises';

interface Target {
	readonly table: Table;
	readonly id: string;
	readonly fields: readonly string[];
	/** Chaîne entière → sa réécriture, et le nombre d'occurrences attendu */
	readonly strings?: readonly (readonly [string, string, number])[];
	/** Formule `~…~` (dans une chaîne) → sa réécriture, et le nombre attendu */
	readonly formulas?: readonly (readonly [string, string, number])[];
}

type Row = Record<string, unknown> & { id: string; updated_at: string | null };

// ============================================================================
// CONSTANTS
// ============================================================================

const BACKUP_DIR = 'data/migration-output/backups';
const TEMPLATE_FIELDS = ['variations', 'shared', 'options', 'test_specs'] as const;
const EXERCISE_FIELDS = ['variations', 'shared', 'variables', 'resources'] as const;

/** L'inventaire de prod du 2026-10-21 */
const TARGETS: readonly Target[] = [
	{
		table: 'question_templates',
		id: 'e0ccaf84-14b4-4422-8dc0-f5da48c87c42',
		fields: TEMPLATE_FIELDS,
		strings: [
			['2,5|3,5', '2.5|3.5', 1],
			['2,5', '2.5', 9]
		]
	},
	{
		table: 'question_templates',
		id: '9cc8cd82-371c-4d7d-ab1f-40f45766ae5a',
		fields: TEMPLATE_FIELDS,
		strings: [
			['?*0,5 = {{eval:0.5*c;d}}', '?*0.5 = {{eval:0.5*c;d}}', 1],
			['?*0,5 = {{eval:c*0.5;d}}', '?*0.5 = {{eval:c*0.5;d}}', 1]
		]
	},
	{
		table: 'question_templates',
		id: 'f9a3333d-94ad-4a9b-b5d4-22325d67f6d9',
		fields: TEMPLATE_FIELDS,
		strings: [
			['?*0,01 = {{eval:c*0.01;d}}', '?*0.01 = {{eval:c*0.01;d}}', 1],
			['0,01*? = {{eval:0.01*c;d}}', '0.01*? = {{eval:0.01*c;d}}', 1]
		]
	},
	{
		table: 'question_templates',
		id: '59ac62a2-3539-44f4-af7f-7c03cb4617f0',
		fields: TEMPLATE_FIELDS,
		strings: [
			['?*0,1 = {{eval:c*0.1;d}}', '?*0.1 = {{eval:c*0.1;d}}', 1],
			['0,1*? = {{eval:0.1*c;d}}', '0.1*? = {{eval:0.1*c;d}}', 1]
		]
	},
	{
		table: 'question_templates',
		id: '99c4ab73-9824-46e6-9c55-98cf8250fca3',
		fields: TEMPLATE_FIELDS,
		strings: [
			['?*0,001 = {{eval:c*0.001;d}}', '?*0.001 = {{eval:c*0.001;d}}', 1],
			['0,001*?={{eval:0.001*c;d}}', '0.001*?={{eval:0.001*c;d}}', 1]
		]
	},
	{
		table: 'question_templates',
		id: '5b53b1be-f9e7-4fc1-bbeb-be84e180a4fd',
		fields: TEMPLATE_FIELDS,
		strings: [
			['(-a,5)+b', '(-a.5)+b', 1],
			['(-a,5)-b', '(-a.5)-b', 1],
			['a,5-b', 'a.5-b', 1]
		]
	},
	// Réponse attendue `1,16` : lue par la correction guidée et son vérificateur (relevé par la CI)
	{
		table: 'question_templates',
		id: '953574d4-e345-4a5d-9435-7faecc3ff7ac',
		fields: TEMPLATE_FIELDS,
		strings: [['{{a}},{{c}}', '{{a}}.{{c}}', 1]]
	},
	{
		table: 'question_templates',
		id: '9f380957-48db-4b31-9f28-61fc4bfb5420',
		fields: TEMPLATE_FIELDS,
		strings: [['{{a}},{{c}}', '{{a}}.{{c}}', 1]]
	},
	{
		table: 'exercises',
		id: '0dbc7705-d47d-4708-9ff0-a1ce06940b63',
		fields: EXERCISE_FIELDS,
		formulas: [['~0,02~', '~0.02~', 1]]
	},
	{
		table: 'exercises',
		id: '5b1d190a-2158-48fd-819e-0cb647dfbc80',
		fields: EXERCISE_FIELDS,
		formulas: [['~0,57~', '~0.57~', 1]]
	},
	{
		table: 'exercises',
		id: '8617ef91-5afe-4e6a-9667-d6a367952dca',
		fields: EXERCISE_FIELDS,
		formulas: [["~f''(0,2)~", "~f''(0.2)~", 1]]
	},
	{
		table: 'exercises',
		id: '3712da66-0aab-4379-a15a-511df8a7861d',
		fields: EXERCISE_FIELDS,
		formulas: [
			[
				'~cos^2(x)+sin^2(x)=0,8^{2}+0,5^{2}=0,64+0,25=0,89~',
				'~cos^2(x)+sin^2(x)=0.8^{2}+0.5^{2}=0.64+0.25=0.89~',
				1
			],
			['~0,89!=1~', '~0.89!=1~', 1],
			['~cos(x)=0,8~', '~cos(x)=0.8~', 1],
			['~sin(x)=0,5~', '~sin(x)=0.5~', 1]
		]
	}
];

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Les occurrences comptées par règle (index dans `strings` puis `formulas`) */
function rewrite(value: unknown, target: Target, counts: number[]): unknown {
	if (typeof value === 'string') {
		const strings = target.strings ?? [];
		const whole = strings.findIndex(([before]) => before === value);
		if (whole !== -1) {
			counts[whole]++;
			return strings[whole][1];
		}
		let text = value;
		(target.formulas ?? []).forEach(([before, after], index) => {
			const found = text.split(before).length - 1;
			if (found === 0) return;
			counts[strings.length + index] += found;
			text = text.split(before).join(after);
		});
		return text;
	}
	if (Array.isArray(value)) return value.map((item) => rewrite(item, target, counts));
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, rewrite(item, target, counts)])
		);
	}
	return value;
}

function rules(target: Target): readonly (readonly [string, string, number])[] {
	return [...(target.strings ?? []), ...(target.formulas ?? [])];
}

// ============================================================================
// MAIN
// ============================================================================

const write = hasFlag('--ecrire');
const { supabase, target: base } = createScriptClient(write);
console.log(`Base : ${base} · ${write ? 'ÉCRITURE' : 'simulation'}`);

const planned: { target: Target; row: Row; update: Record<string, Json> }[] = [];
let done = 0;
for (const target of TARGETS) {
	const { data, error } = await supabase
		.from(target.table)
		.select(['id', 'updated_at', ...target.fields].join(', '))
		.eq('id', target.id)
		.maybeSingle();
	if (error) throw error;
	if (!data) throw new Error(`${target.table} ${target.id} : introuvable`);
	const row = data as unknown as Row;
	const counts = rules(target).map(() => 0);
	const update: Record<string, Json> = {};
	for (const field of target.fields) {
		const after = rewrite(row[field], target, counts);
		if (!isDeepStrictEqual(after, row[field])) update[field] = after as Json;
	}
	const total = counts.reduce((sum, n) => sum + n, 0);
	if (total === 0) {
		console.log(`= ${target.id.slice(0, 8)} déjà réécrit`);
		done++;
		continue;
	}
	rules(target).forEach(([before, after, expected], index) => {
		console.log(`  ${target.id.slice(0, 8)} « ${before} » → « ${after} » : ${counts[index]}`);
		if (counts[index] !== expected) {
			throw new Error(
				`${target.id} : « ${before} » trouvé ${counts[index]} fois, ${expected} attendu(s)`
			);
		}
	});
	planned.push({ target, row, update });
}
console.log(
	`${planned.length} ligne(s) à réécrire, ${done} déjà réécrite(s), sur ${TARGETS.length}`
);

if (write && planned.length > 0) {
	mkdirSync(BACKUP_DIR, { recursive: true });
	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	const backup = join(BACKUP_DIR, `virgule-decimale-${stamp}.json`);
	writeFileSync(
		backup,
		JSON.stringify(
			planned.map(({ target, row }) => ({ table: target.table, row })),
			null,
			2
		)
	);
	console.log(`Sauvegarde : ${backup}`);

	for (const { target, row, update } of planned) {
		const query = supabase.from(target.table).update(update).eq('id', row.id);
		// Ligne modifiée depuis la lecture : rien n'est écrasé (0 ligne, arrêt ci-dessous)
		const { data, error } = await (
			row.updated_at === null
				? query.is('updated_at', null)
				: query.eq('updated_at', row.updated_at)
		).select(['id', ...target.fields].join(', '));
		if (error) throw error;
		// Zéro ligne : modifiée depuis la lecture (ou refus RLS, silencieux)
		if (!data || data.length !== 1) {
			throw new Error(`${row.id} : ${data?.length ?? 0} ligne(s) écrite(s) ; relancer le script`);
		}
		const written = data[0] as unknown as Row;
		for (const field of target.fields) {
			const expected = field in update ? update[field] : row[field];
			if (!isDeepStrictEqual(written[field], expected)) {
				throw new Error(`${row.id} : ${field} relu différent de l'écriture`);
			}
		}
		console.log(`✅ ${target.table} ${row.id.slice(0, 8)} réécrit`);
	}
}
