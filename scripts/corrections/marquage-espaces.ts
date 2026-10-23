/**
 * Marquage « Espaces dès 4 chiffres » des modèles en prod (`lib/marquage-espaces.ts`)
 * ===================================================================================
 *
 * ⚠️ SIMULATION PAR DÉFAUT : rien n'est écrit sans `--publier`.
 * ⚠️ À lancer avec `--publier` JUSTE APRÈS le `deploy:prod` qui livre #1642, sur le
 *    feu vert de David : avant, l'éditeur de la prod (schéma strict) refuse le
 *    réglage ; après sans marquage, la numération accepte `7900` sans remarque.
 *
 * Usage :
 *   pnpm corrections:marquage-espaces              (simulation : lit la prod, affiche le diff)
 *   pnpm corrections:marquage-espaces --publier    (écrit `options` ou `test_specs`)
 *
 * Avant toute écriture :
 * 1. la règle, appliquée à la prod COURANTE, retrouve exactement les listes figées ;
 * 2. chaque modèle traité passe `checkTemplate` (schéma strict, toutes les specs
 *    vertes, 50 tirages par variation) ;
 * 3. un seul modèle en échec fait refuser le lot ENTIER (rien n'est écrit).
 * Écriture : sauvegarde JSON des lignes d'origine (dossier ignoré par git), puis la
 * seule colonne modifiée, sous condition `updated_at` inchangé depuis la lecture ;
 * la ligne rendue est relue (la RLS échoue en silence : 0 ligne).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { QuestionTemplate } from '../../src/lib/questions/types';
import type { Database, Json } from '../../src/lib/types/database';
import { toQuestionTemplate } from '../../src/lib/types/question-template';
import { checkTemplate } from '../../src/lib/migration/review/check-template';
import { createScriptClient, hasFlag } from '../relecture/common';
import { parseRows } from './lib/files';
import {
	bipmTestSpecs,
	LYCEE_DRAFT_IDS,
	markSchoolRule,
	needsSchoolRule,
	SCHOOL_RULE_IDS,
	selectionGap
} from './lib/marquage-espaces';
import { publishRefusal } from './lib/publish-gate';
import { canonical } from './lib/retouches';

// ============================================================================
// TYPES
// ============================================================================

type TemplateUpdate = Database['public']['Tables']['question_templates']['Update'];

interface Ready {
	id: string;
	updatedAt: string | null;
	column: 'options' | 'test_specs';
	value: Json;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BACKUP_DIR = 'data/migration-output/backups';

/** Garde-fou de pagination : PostgREST plafonne une réponse à 1 000 lignes */
const MAX_ROWS = 1000;

// ============================================================================
// FUNCTIONS
// ============================================================================

function toUpdate(row: Ready): TemplateUpdate {
	return row.column === 'options' ? { options: row.value } : { test_specs: row.value };
}

function printGap(label: string, expected: readonly string[], found: readonly string[]): boolean {
	const { missing, unexpected } = selectionGap(expected, found);
	for (const id of missing) console.log(`  ✗ ${label} : ${id} figé mais plus sélectionné`);
	for (const id of unexpected)
		console.log(`  ✗ ${label} : ${id} sélectionné mais absent de la liste`);
	return missing.length === 0 && unexpected.length === 0;
}

async function main(): Promise<number> {
	const publish = hasFlag('--publier');
	const { supabase, target } = createScriptClient(publish);
	console.log(`${publish ? 'ÉCRITURE' : 'SIMULATION'} — base : ${target}\n`);

	// Modèles dont au moins une spec attend la contrainte `spaces`
	const { data, error } = await supabase
		.from('question_templates')
		.select('*')
		.contains('test_specs', JSON.stringify([{ expected: { constraintViolations: ['spaces'] } }]));
	if (error) throw new Error(`lecture des modèles : ${error.message}`);
	if ((data?.length ?? 0) >= MAX_ROWS) throw new Error(`${MAX_ROWS} lignes lues : paginer`);
	const liveRows = parseRows(data, 'question_templates');
	const templates = liveRows.map(toQuestionTemplate);

	const selected = templates.filter(needsSchoolRule).map((t) => t.id);
	console.log(`${liveRows.length} modèles avec une spec « spaces », ${selected.length} à traiter.`);
	const toMark = selected.filter((id) => !LYCEE_DRAFT_IDS.includes(id));
	const toFix = selected.filter((id) => LYCEE_DRAFT_IDS.includes(id));
	const agreed =
		printGap('marquage', SCHOOL_RULE_IDS, toMark) && printGap('lycée', LYCEE_DRAFT_IDS, toFix);
	console.log(agreed ? '  ✓ sélection conforme aux listes figées\n' : '');

	const planned = [
		...SCHOOL_RULE_IDS.map((id) => ({ id, kind: 'marquage' as const })),
		...LYCEE_DRAFT_IDS.map((id) => ({ id, kind: 'specs' as const }))
	];
	const ready: Ready[] = [];
	for (const { id, kind } of planned) {
		const row = liveRows.find((r) => r.id === id);
		const label = id.slice(0, 8);
		if (!row) {
			console.log(`✗ ${label} : absent de la lecture\n`);
			continue;
		}
		const before = toQuestionTemplate(row);
		console.log(`${label} « ${before.title} » (${row.status}, ${row.grades.join(' ')})`);
		let after: QuestionTemplate;
		try {
			after = kind === 'marquage' ? markSchoolRule(before) : bipmTestSpecs(before);
		} catch (e) {
			console.log(`  ✗ ${e instanceof Error ? e.message : e}\n`);
			continue;
		}
		if (kind === 'marquage') {
			console.log('  options.constraints.spacesFromFourDigits : true');
		} else {
			(before.testSpecs ?? []).forEach((spec, i) => {
				const fixed = after.testSpecs?.[i];
				if (canonical(spec) === canonical(fixed)) return;
				console.log(`  - ${spec.description} → ${JSON.stringify(spec.expected)}`);
				console.log(`  + ${fixed?.description} → ${JSON.stringify(fixed?.expected)}`);
			});
		}

		// Champs portés par la base, absents du schéma strict de l'éditeur
		const { created_at: _ca, updated_at: _ua, created_by: _cb, ...candidate } = after;
		const check = checkTemplate(candidate);
		for (const schemaError of check.schemaErrors) console.log(`    schéma : ${schemaError}`);
		for (const spec of check.specs.filter((s) => !s.passed)) {
			console.log(`    spec rouge : ${spec.description}`);
		}
		const specs = `${check.specs.filter((s) => s.passed).length}/${check.specs.length} specs`;
		const draws = `${check.generation.attempts - check.generation.failures.length}/${check.generation.attempts} tirages`;
		console.log(
			`  ${check.passed ? '✓' : '✗'} checkTemplate ${check.passed ? 'vert' : `ROUGE (${check.reasons.join(', ')})`} : ${specs}, ${draws}\n`
		);
		if (!check.passed) continue;
		ready.push(
			kind === 'marquage'
				? { id, updatedAt: row.updated_at, column: 'options', value: after.options as Json }
				: { id, updatedAt: row.updated_at, column: 'test_specs', value: after.testSpecs as Json }
		);
	}

	console.log(`${ready.length}/${planned.length} modèle(s) prêt(s).`);
	const refusal = agreed
		? publishRefusal(ready.length, planned.length)
		: 'sélection différente des listes figées';
	if (!publish) {
		console.log('Simulation : rien n’a été écrit. Ajouter --publier après feu vert.');
		return refusal ? 1 : 0;
	}
	if (refusal) {
		console.error(`ÉCRITURE REFUSÉE : ${refusal}.`);
		return 1;
	}

	mkdirSync(BACKUP_DIR, { recursive: true });
	const backup = join(
		BACKUP_DIR,
		`marquage-espaces-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
	);
	writeFileSync(backup, JSON.stringify(liveRows, null, 2));
	console.log(`Sauvegarde : ${backup}`);

	for (const row of ready) {
		let query = supabase.from('question_templates').update(toUpdate(row)).eq('id', row.id);
		query =
			row.updatedAt === null ? query.is('updated_at', null) : query.eq('updated_at', row.updatedAt);
		const { data: written, error: writeError } = await query.select('*');
		if (writeError) throw new Error(`${row.id} : ${writeError.message}`);
		if (!written || written.length !== 1) {
			throw new Error(`${row.id} : ${written?.length ?? 0} ligne écrite (modifié entre-temps ?)`);
		}
		// Relecture : la colonne écrite doit être celle voulue
		const stored = (written[0] as Record<string, unknown>)[row.column];
		if (canonical(stored ?? null) !== canonical(row.value ?? null)) {
			throw new Error(`${row.id} : colonne ${row.column} relue différente de l'écriture`);
		}
		console.log(`  écrit ${row.id} (${row.column})`);
	}
	return 0;
}

main()
	.then((code) => process.exit(code))
	.catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
