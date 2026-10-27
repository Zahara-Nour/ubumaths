/**
 * Vérifier les modèles écrits par un script de lot (forme « ligne de base ») — LECTURE SEULE
 * ===========================================================================================
 *
 * `question:specs --file` attend la forme d'un fichier de modèle ; les scripts de lot écrivent la
 * ligne de base (`test_specs`…). Ce script passe chaque fichier par `toQuestionTemplate` puis
 * `checkTemplate` (specs + tirages), et montre un aperçu si on le demande. La ligne « Schéma :
 * Unrecognized keys created_at… » vient de la ligne de base entière, pas du modèle (comme
 * `question:specs --template`) : seules comptent les specs et les tirages.
 *
 *   pnpm tsx docs/wip/questions-2de/verifier-contenu.ts <dossier> [--apercu N]
 */
import { readdirSync, readFileSync } from 'node:fs';
import { checkTemplate, formatCheckReport } from '../../../src/lib/migration/review/check-template';
import { generateInstance } from '../../../src/lib/questions/generator/instance-generator';
import { toQuestionTemplate } from '../../../src/lib/types/question-template';

const [dossier] = process.argv.slice(2);
const i = process.argv.indexOf('--apercu');
const apercu = i > 0 ? Number(process.argv[i + 1]) : 0;
let echecs = 0;
for (const nom of readdirSync(dossier)
	.filter((n) => n.endsWith('.json'))
	.sort()) {
	const ligne = JSON.parse(readFileSync(`${dossier}/${nom}`, 'utf-8'));
	const template = toQuestionTemplate(ligne);
	console.log(
		`\n=== ${nom.slice(0, 8)} — ${template.title} (${template.variations.length} variation(s))`
	);
	for (let k = 0; k < apercu; k++) {
		const r = generateInstance(template, k + 1);
		if (!r.success) {
			console.log(`  ❌ ${r.errors.join('; ')}`);
			continue;
		}
		const { instance } = r;
		console.log(
			`--- tirage ${k + 1} : ${(instance.resolvedVariables ?? []).map((v) => `${v.name}=${v.value}`).join(', ')}`
		);
		console.log(`Énoncé : ${instance.statement}`);
		console.log(`Réponses : ${(instance.blanks ?? []).map((b) => b.expectedAnswer).join(' | ')}`);
		for (const step of instance.correction?.steps ?? []) console.log(`Correction : ${step}`);
	}
	const report = checkTemplate(template, { instances: 100 });
	console.log(formatCheckReport(report));
	if (
		report.specs.some((x) => !x.passed) ||
		report.generation.failures.length > 0 ||
		report.templateErrors.length > 0
	)
		echecs++;
}
process.exit(echecs ? 1 : 0);
