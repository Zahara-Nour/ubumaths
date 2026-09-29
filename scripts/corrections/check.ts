/**
 * Vérifier les propositions d'un lot
 * ==================================
 *
 * Usage : pnpm corrections:check pilote [--instances 50]
 *
 * Travaille sur l'instantané `docs/corrections/<lot>/_modeles.json` (aucune base).
 * Code de sortie : 0 si toutes les propositions passent, 1 sinon.
 */

import { argValue } from '../relecture/common';
import { readProposal, readSnapshot } from './lib/files';
import { DEFAULT_INSTANCES, verifyProposal, type ProposalReport } from './lib/verify';
import { findLot } from './lots';

const MAX_FAILURES_SHOWN = 3;

function printReport(report: ProposalReport): void {
	const mark = report.passed ? '✓' : '✗';
	console.log(
		`${mark} ${report.code} ${report.templateId.slice(0, 8)} ${report.title} — ` +
			`${report.instances} tirage(s), ${report.failures.length} échec(s), ` +
			`${report.unreadSegments} membre(s) non numérique(s) non vérifié(s)`
	);
	for (const error of report.templateErrors) console.log(`    modèle : ${error}`);
	for (const failure of report.failures.slice(0, MAX_FAILURES_SHOWN)) {
		console.log(
			`    variation ${failure.variationIndex}, graine ${failure.seed} : ${failure.reasons.join(' ; ')}`
		);
	}
	if (report.failures.length > MAX_FAILURES_SHOWN) {
		console.log(`    … ${report.failures.length - MAX_FAILURES_SHOWN} autre(s) échec(s)`);
	}
}

function main(): number {
	const lot = findLot(process.argv[2]);
	const instances = Number(argValue('--instances') ?? DEFAULT_INSTANCES);
	if (!Number.isInteger(instances) || instances < 1 || instances > 1000) {
		throw new Error('--instances : entier entre 1 et 1000');
	}
	const templates = readSnapshot(lot.name);
	let passed = 0;
	let total = 0;
	for (const entry of lot.entries) {
		const template = templates.get(entry.templateId);
		if (!template) throw new Error(`${entry.templateId} absent de l'instantané`);
		const report = verifyProposal(template, readProposal(lot.name, entry.templateId), instances);
		printReport(report);
		total += report.instances;
		if (report.passed) passed++;
	}
	console.log(
		`\n${passed}/${lot.entries.length} proposition(s) valides — ${total} tirage(s) analysé(s).`
	);
	return passed === lot.entries.length ? 0 : 1;
}

try {
	process.exit(main());
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
