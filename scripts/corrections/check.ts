/**
 * Vérifier les propositions d'un lot
 * ==================================
 *
 * Usage : pnpm corrections:check pilote [--instances 50]
 *
 * Par défaut, chaque variation est vérifiée sur TOUT son domaine quand il compte
 * au plus 20 000 combinaisons, sinon sur 5 000 graines ; `--instances N` impose N
 * graines (relecture rapide, ne vaut pas preuve).
 *
 * Travaille sur l'instantané `docs/corrections/<lot>/_modeles.json` (aucune base).
 * Code de sortie : 0 si toutes les propositions passent, 1 sinon.
 */

import { argValue } from '../relecture/common';
import { readProposal, readSnapshot } from './lib/files';
import { verifyProposal, type ProposalReport } from './lib/verify';
import { findLot } from './lots';

const MAX_FAILURES_SHOWN = 3;

function printReport(report: ProposalReport): void {
	const mark = report.passed ? '✓' : '✗';
	console.log(
		`${mark} ${report.code} ${report.templateId.slice(0, 8)} ${report.title} — ` +
			`${report.instances} tirage(s), ${report.failures.length} échec(s)`
	);
	report.samplings.forEach((sampling, index) => {
		const how =
			sampling.mode === 'exhaustive'
				? `domaine entier (${sampling.size} combinaisons)`
				: `${sampling.size} graines (${sampling.reason})`;
		console.log(`    variation ${index} : ${how}`);
	});
	for (const error of report.templateErrors) console.log(`    modèle : ${error}`);
	for (const failure of report.failures.slice(0, MAX_FAILURES_SHOWN)) {
		console.log(
			`    variation ${failure.variationIndex}, ${failure.draw} : ${failure.reasons.join(' ; ')}`
		);
	}
	if (report.failures.length > MAX_FAILURES_SHOWN) {
		console.log(`    … ${report.failures.length - MAX_FAILURES_SHOWN} autre(s) échec(s)`);
	}
}

function main(): number {
	const lot = findLot(process.argv[2]);
	const raw = argValue('--instances');
	const seeds = raw === undefined ? undefined : Number(raw);
	if (seeds !== undefined && (!Number.isInteger(seeds) || seeds < 1 || seeds > 10000)) {
		throw new Error('--instances : entier entre 1 et 10000');
	}
	const templates = readSnapshot(lot.name);
	let passed = 0;
	let total = 0;
	for (const entry of lot.entries) {
		const template = templates.get(entry.templateId);
		if (!template) throw new Error(`${entry.templateId} absent de l'instantané`);
		const report = verifyProposal(template, readProposal(lot.name, entry.templateId), { seeds });
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
