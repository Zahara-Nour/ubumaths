/**
 * Générer les propositions de correction d'un lot
 * ===============================================
 *
 * Usage :
 *   pnpm corrections:generate pilote                       (modèles lus en prod, LECTURE SEULE)
 *   pnpm corrections:generate pilote --source rows.json    (modèles lus dans un JSON local)
 *   pnpm corrections:generate pilote --source snapshot     (instantané déjà présent)
 *
 * Écrit `data/corrections/<lot>/_modeles.json` (instantané) et une proposition
 * `<id>.json` par modèle. N'écrit RIEN en base.
 */

import { readFileSync } from 'node:fs';
import type { QuestionTemplateRow } from '../../src/lib/types/question-template';
import { toQuestionTemplate } from '../../src/lib/types/question-template';
import { argValue, createScriptClient } from '../relecture/common';
import { buildCorrection } from './lib/lot';
import { parseRows, readSnapshotRows, writeProposal, writeSnapshot } from './lib/files';
import type { Proposal } from './lib/proposal';
import { parseProposal } from './lib/proposal';
import { findLot } from './lots';

async function loadRows(
	ids: string[],
	source: string,
	lot: string
): Promise<QuestionTemplateRow[]> {
	if (source === 'snapshot') return readSnapshotRows(lot);
	if (source !== 'prod') return parseRows(JSON.parse(readFileSync(source, 'utf8')), source);
	// Lecture seule : aucun appel d'écriture dans ce script
	const { supabase, target } = createScriptClient(false);
	console.log(`Lecture des modèles : ${target}`);
	const { data, error } = await supabase.from('question_templates').select('*').in('id', ids);
	if (error) throw new Error(`lecture des modèles : ${error.message}`);
	return parseRows(data, 'question_templates');
}

async function main(): Promise<number> {
	const lot = findLot(process.argv[2]);
	const source = argValue('--source') ?? 'prod';
	const ids = lot.entries.map((entry) => entry.templateId);
	const rows = (await loadRows(ids, source, lot.name)).filter((row) => ids.includes(row.id));
	const missing = ids.filter((id) => !rows.some((row) => row.id === id));
	if (missing.length > 0) throw new Error(`modèle(s) introuvable(s) : ${missing.join(', ')}`);
	// Ordre du lot, pour un instantané stable
	rows.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
	if (source !== 'snapshot') console.log(`Instantané : ${await writeSnapshot(lot.name, rows)}`);

	let failures = 0;
	for (const entry of lot.entries) {
		const row = rows.find((r) => r.id === entry.templateId);
		if (!row) continue;
		const template = toQuestionTemplate(row);
		try {
			const correction = buildCorrection(entry, template);
			const proposal: Proposal = parseProposal(
				{
					templateId: template.id,
					title: template.title,
					classe: entry.classe,
					code: entry.code,
					source: correction.source,
					steps: correction.steps,
					notes: correction.notes
				},
				template.id
			);
			console.log(
				`  ✓ ${entry.code} ${template.id.slice(0, 8)} ${template.title} → ${await writeProposal(lot.name, proposal)}`
			);
		} catch (error) {
			failures++;
			console.log(
				`  ✗ ${entry.code} ${template.id.slice(0, 8)} ${template.title} : ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}
	console.log(`\n${lot.entries.length - failures}/${lot.entries.length} proposition(s) écrite(s).`);
	return failures === 0 ? 0 : 1;
}

main()
	.then((code) => process.exit(code))
	.catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
