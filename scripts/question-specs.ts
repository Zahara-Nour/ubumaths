/**
 * Vérifier une question : specs de test, tirages, structure
 * =========================================================
 *
 * LECTURE SEULE — n'écrit jamais en base.
 *
 * Usage :
 *   pnpm question:specs --file scripts/questions/<…>.json   fichier de modèle (source)
 *   pnpm question:specs --template <uuid>                   template en base (question_templates)
 *
 * Options :
 *   --instances N   tirages par variation (défaut : 50)
 *   --apercu N      affiche N instances générées (énoncé, réponses attendues, correction)
 *
 * Avertissements (« Avertissement : … ») : à relire, sans effet sur le verdict ni sur
 * le code de sortie — ex. variable qui peut être négative citée sans parenthèses.
 *
 * Code de sortie : 0 si tout est importable, 1 sinon (aucune spec = échec).
 */

import { readFileSync } from 'node:fs';
import type { QuestionTemplate } from '../src/lib/questions/types';
import { checkTemplate, formatCheckReport } from '../src/lib/questions/review/check-template';
import { generateInstance } from '../src/lib/questions/generator/instance-generator';
import { toQuestionTemplate } from '../src/lib/types/question-template';
import { argValue, createScriptClient, hasFlag } from './relecture/common';
import { readTemplateFile } from './lib/template-file';

// ============================================================================
// SOURCES
// ============================================================================

function templateFromFile(path: string): QuestionTemplate {
	const raw: unknown = JSON.parse(readFileSync(path, 'utf-8'));
	const extrait = readTemplateFile(raw, path);
	if (!extrait.ok) throw new Error(extrait.error);
	return extrait.template as unknown as QuestionTemplate;
}

async function templateFromDatabase(id: string): Promise<QuestionTemplate> {
	const { supabase, target } = createScriptClient(false);
	console.log(`Base : ${target} (lecture seule)`);
	const { data, error } = await supabase
		.from('question_templates')
		.select('*')
		.eq('id', id)
		.single();
	if (error || !data) throw new Error(`template ${id} : ${error?.message ?? 'introuvable'}`);
	return toQuestionTemplate(data);
}

// ============================================================================
// APERÇU
// ============================================================================

function printPreview(template: QuestionTemplate, count: number): void {
	for (let seed = 1; seed <= count; seed++) {
		const result = generateInstance(template, seed);
		console.log(`\n--- Aperçu, tirage ${seed} ---`);
		if (!result.success) {
			console.log(`  ❌ ${result.errors.join('; ')}`);
			continue;
		}
		const { instance } = result;
		const variables = (instance.resolvedVariables ?? []).map((v) => `${v.name}=${v.value}`);
		console.log(`Variables : ${variables.join(', ') || '(aucune)'}`);
		console.log(`Énoncé : ${instance.statement}`);
		if (instance.blanks) {
			console.log(
				`Réponses attendues : ${instance.blanks.map((b) => b.expectedAnswer).join(' | ')}`
			);
		}
		if (instance.choices) {
			instance.choices.forEach((choice, i) =>
				console.log(`  ${choice.isCorrect ? '✔' : ' '} ${i}. ${choice.content}`)
			);
		}
		for (const step of instance.correction?.steps ?? []) console.log(`Correction : ${step}`);
	}
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<number> {
	const instances = Number(argValue('--instances') ?? 50);
	const preview = Number(argValue('--apercu') ?? 0);

	const file = argValue('--file');
	const id = argValue('--template');
	const template = file ? templateFromFile(file) : id ? await templateFromDatabase(id) : undefined;
	if (!template) {
		console.error('Préciser --file ou --template (voir l’en-tête du script).');
		return 1;
	}

	console.log(`\n${template.title} — ${template.variations.length} variation(s)`);
	if (preview > 0) printPreview(template, preview);
	const report = checkTemplate(template, { instances });
	console.log(`\n${formatCheckReport(report)}`);
	return report.passed ? 0 : 1;
}

if (hasFlag('--help')) {
	console.log('Voir l’en-tête de scripts/question-specs.ts');
} else {
	main()
		.then((code) => process.exit(code))
		.catch((error: unknown) => {
			console.error(`Erreur : ${error instanceof Error ? error.message : String(error)}`);
			process.exit(1);
		});
}
