/**
 * Retouches ciblées de modèles en prod (`lib/retouches.ts`)
 * =========================================================
 *
 * ⚠️ SIMULATION PAR DÉFAUT : rien n'est écrit sans `--publier`.
 *
 * Usage :
 *   pnpm corrections:retouches              (simulation : lit la prod, affiche le diff)
 *   pnpm corrections:retouches --publier    (écrit les colonnes modifiées)
 *
 * Pour chaque retouche, appliquée à la ligne de prod COURANTE, avant toute écriture :
 * 1. le modèle retouché passe `checkTemplate` (structure, schéma strict, toutes les
 *    specs vertes, 50 tirages par variation) ;
 * 2. s'il a une correction, elle passe le vérificateur (domaine entier ou 5 000
 *    graines), avec les contrôles déclarés par son lot s'il en a un ;
 * 3. une seule retouche en échec fait refuser le lot ENTIER (rien n'est écrit).
 * Écriture : sauvegarde JSON des lignes d'origine (dossier ignoré par git), puis
 * seules les colonnes modifiées, sous condition `updated_at` inchangé depuis la
 * lecture ; la ligne rendue est relue (la RLS échoue en silence : 0 ligne).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { QuestionTemplate } from '../../src/lib/questions/types';
import type { Database, Json } from '../../src/lib/types/database';
import { toQuestionTemplate } from '../../src/lib/types/question-template';
import { checkTemplate } from '../../src/lib/migration/review/check-template';
import { createScriptClient, hasFlag } from '../relecture/common';
import { parseRows } from './lib/files';
import type { LotEntry } from './lib/lot';
import type { Proposal } from './lib/proposal';
import { publishRefusal } from './lib/publish-gate';
import { canonical, changedColumns, readableDiff, RETOUCHES } from './lib/retouches';
import { verifyProposal } from './lib/verify';
import { LOTS } from './lots';

// ============================================================================
// CONSTANTS
// ============================================================================

const BACKUP_DIR = 'data/migration-output/backups';

type TemplateUpdate = Database['public']['Tables']['question_templates']['Update'];

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Colonnes modifiées → mise à jour typée (seules les colonnes retouchables) */
function toUpdate(columns: Record<string, unknown>): TemplateUpdate {
	const update: TemplateUpdate = {};
	if ('title' in columns) update.title = String(columns.title);
	if ('variations' in columns) update.variations = columns.variations as Json;
	if ('shared' in columns) update.shared = columns.shared as Json;
	if ('test_specs' in columns) update.test_specs = columns.test_specs as Json;
	return update;
}

/** Dernière entrée de lot qui nomme ce modèle (contrôles déclarés, code) */
function lotEntry(templateId: string): LotEntry | undefined {
	return Object.values(LOTS)
		.flatMap((lot) => lot.entries)
		.filter((entry) => entry.templateId === templateId)
		.at(-1);
}

/**
 * Vérificateur de corrections sur un modèle qui en a DÉJÀ une : la correction est
 * sortie du modèle et reproposée telle quelle (même chemin que l'import).
 */
function verifyExistingCorrection(template: QuestionTemplate): { passed: boolean; detail: string } {
	const entry = lotEntry(template.id);
	const proposal: Proposal = {
		templateId: template.id,
		title: template.title || 'retouche',
		classe: entry?.classe ?? 'N',
		code: entry?.code ?? 'N-RETOUCHE',
		source: 'written',
		steps: {
			byVariation: template.variations.map((variation) =>
				(variation.correction?.steps ?? []).map(String)
			)
		},
		notes: []
	};
	const bare: QuestionTemplate = {
		...template,
		variations: template.variations.map(({ correction: _c, ...rest }) => rest)
	};
	const report = verifyProposal(bare, proposal, { checks: entry?.checks });
	const first = report.failures[0];
	return {
		passed: report.passed,
		detail: report.passed
			? `${report.instances} tirages verts`
			: [
					...report.templateErrors,
					`${report.failures.length} tirage(s) rouges sur ${report.instances}`,
					first
						? `ex. variation ${first.variationIndex + 1}, ${first.draw} : ${first.reasons[0]}`
						: ''
				]
					.filter(Boolean)
					.join(' ; ')
	};
}

async function main(): Promise<number> {
	const publish = hasFlag('--publier');
	const { supabase, target } = createScriptClient(publish);
	console.log(`${publish ? 'ÉCRITURE' : 'SIMULATION'} — base : ${target}\n`);

	const ids = [...new Set(RETOUCHES.map((r) => r.templateId))];
	if (ids.length !== RETOUCHES.length) throw new Error('deux retouches visent le même modèle');
	const { data, error } = await supabase.from('question_templates').select('*').in('id', ids);
	if (error) throw new Error(`lecture des modèles : ${error.message}`);
	const liveRows = parseRows(data, 'question_templates');

	const ready: { id: string; updatedAt: string | null; columns: Record<string, unknown> }[] = [];
	for (const retouche of RETOUCHES) {
		const row = liveRows.find((r) => r.id === retouche.templateId);
		const label = retouche.templateId.slice(0, 8);
		if (!row) {
			console.log(`✗ ${label} : absent de la prod`);
			continue;
		}
		const before = toQuestionTemplate(row);
		console.log(`${label} « ${before.title} » (${row.status})\n  ${retouche.note}`);
		let after: QuestionTemplate;
		let columns: Record<string, unknown>;
		try {
			after = retouche.apply(before);
			columns = changedColumns(before, after);
		} catch (e) {
			console.log(`  ✗ retouche inapplicable : ${e instanceof Error ? e.message : e}\n`);
			continue;
		}
		if (Object.keys(columns).length === 0) {
			console.log('  ✗ la retouche ne change rien\n');
			continue;
		}
		for (const line of readableDiff(before, after)) console.log(line);

		// Champs portés par la base, absents du schéma strict de l'éditeur
		const { created_at: _ca, updated_at: _ua, created_by: _cb, ...candidate } = after;
		const check = checkTemplate(candidate);
		for (const schemaError of check.schemaErrors) console.log(`    schéma : ${schemaError}`);
		const specs = `${check.specs.filter((s) => s.passed).length}/${check.specs.length} specs`;
		const draws = `${check.generation.attempts - check.generation.failures.length}/${check.generation.attempts} tirages`;
		const hasCorrection = after.variations.some((v) => v.correction) || !!after.shared?.correction;
		const verified = hasCorrection ? verifyExistingCorrection(after) : null;
		const ok = check.passed && (verified?.passed ?? true);
		console.log(
			`  ${ok ? '✓' : '✗'} checkTemplate ${check.passed ? 'vert' : `ROUGE (${check.reasons.join(', ')})`} : ${specs}, ${draws}` +
				(verified
					? ` ; vérificateur ${verified.passed ? 'vert' : 'ROUGE'} : ${verified.detail}`
					: '') +
				'\n'
		);
		if (ok) ready.push({ id: row.id, updatedAt: row.updated_at, columns });
	}

	console.log(`${ready.length}/${RETOUCHES.length} retouche(s) prête(s).`);
	const refusal = publishRefusal(ready.length, RETOUCHES.length);
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
		`retouches-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
	);
	writeFileSync(backup, JSON.stringify(liveRows, null, 2));
	console.log(`Sauvegarde : ${backup}`);

	for (const row of ready) {
		let query = supabase.from('question_templates').update(toUpdate(row.columns)).eq('id', row.id);
		query =
			row.updatedAt === null ? query.is('updated_at', null) : query.eq('updated_at', row.updatedAt);
		const { data: written, error: writeError } = await query.select('*');
		if (writeError) throw new Error(`${row.id} : ${writeError.message}`);
		if (!written || written.length !== 1) {
			throw new Error(`${row.id} : ${written?.length ?? 0} ligne écrite (modifié entre-temps ?)`);
		}
		// Relecture : chaque colonne écrite doit être celle voulue
		for (const [column, value] of Object.entries(row.columns)) {
			const stored = (written[0] as Record<string, unknown>)[column];
			if (canonical(stored ?? null) !== canonical(value ?? null)) {
				throw new Error(`${row.id} : colonne ${column} relue différente de l'écriture`);
			}
		}
		console.log(`  écrit ${row.id} (${Object.keys(row.columns).join(', ')})`);
	}
	return 0;
}

main()
	.then((code) => process.exit(code))
	.catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
