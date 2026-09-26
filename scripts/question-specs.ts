/**
 * Vérifier une question : specs de test, tirages, structure
 * =========================================================
 *
 * LECTURE SEULE — n'écrit jamais en base.
 *
 * Usage :
 *   pnpm question:specs --index 120                  transformation actuelle de l'ancienne question #120
 *   pnpm question:specs --file docs/relecture/relatifs/120.json   fichier de verdict (ou template brut)
 *   pnpm question:specs --lot docs/relecture/relatifs             tous les verdicts d'un lot (résumé)
 *   pnpm question:specs --template <uuid>            template en base (question_templates)
 *
 * Options :
 *   --instances N   tirages par variation (défaut : 50)
 *   --apercu N      affiche N instances générées (énoncé, réponses attendues, correction)
 *
 * Code de sortie : 0 si tout est importable, 1 sinon (aucune spec = échec).
 */

import { readFileSync } from 'node:fs';
import type { QuestionTemplate } from '../src/lib/questions/types';
import { transformQuestion } from '../src/lib/migration/question-transformer';
import { checkTemplate, formatCheckReport } from '../src/lib/migration/review/check-template';
import { parseReviewFile, draftTemplate } from '../src/lib/migration/review/review-file';
import { generateInstance } from '../src/lib/questions/generator/instance-generator';
import { toQuestionTemplate } from '../src/lib/types/question-template';
import {
	argValue,
	createScriptClient,
	hasFlag,
	loadOldQuestions,
	readReviewFiles
} from './relecture/common';

// ============================================================================
// SOURCES
// ============================================================================

async function templateFromIndex(index: number): Promise<QuestionTemplate> {
	const old = (await loadOldQuestions()).get(index);
	if (!old) throw new Error(`ancienne question #${index} introuvable`);
	const result = transformQuestion(old, index);
	if (!result.success || !result.template) {
		throw new Error(`transformation de #${index} impossible : ${result.errors?.join('; ')}`);
	}
	if (result.warnings?.length) {
		console.log(`Avertissements du transformateur (${result.warnings.length}) :`);
		for (const warning of result.warnings) console.log(`  ⚠️  ${warning}`);
	}
	return result.template;
}

function templateFromFile(path: string): QuestionTemplate {
	const raw: unknown = JSON.parse(readFileSync(path, 'utf-8'));
	// Fichier de verdict (porte `verdict`) ou template brut
	if (raw && typeof raw === 'object' && 'verdict' in raw) {
		const template = draftTemplate(parseReviewFile(raw, path));
		if (!template) throw new Error(`${path} : ce verdict ne porte pas de template`);
		return template;
	}
	return raw as QuestionTemplate;
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

	const lot = argValue('--lot');
	if (lot) {
		const reviews = readReviewFiles(lot);
		let failures = 0;
		for (const review of reviews) {
			const template = draftTemplate(review);
			if (!template) {
				console.log(`#${review.globalIndex} ${review.verdict} (sans template)`);
				continue;
			}
			const report = checkTemplate(template, { instances });
			if (!report.passed) failures++;
			const specs = `${report.specs.filter((s) => s.passed).length}/${report.specs.length} specs`;
			const draws = `${report.generation.attempts - report.generation.failures.length}/${report.generation.attempts} tirages`;
			console.log(
				`#${review.globalIndex} ${review.verdict} — ${specs}, ${draws} — ${report.passed ? '✅' : `❌ ${report.reasons.join(', ')}`}`
			);
		}
		console.log(`\n${reviews.length} verdict(s) analysé(s), ${failures} non importable(s).`);
		return failures === 0 && reviews.length > 0 ? 0 : 1;
	}

	const index = argValue('--index');
	const file = argValue('--file');
	const id = argValue('--template');
	const template = index
		? await templateFromIndex(Number(index))
		: file
			? templateFromFile(file)
			: id
				? await templateFromDatabase(id)
				: undefined;
	if (!template) {
		console.error('Préciser --index, --file, --lot ou --template (voir l’en-tête du script).');
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
