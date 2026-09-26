/**
 * Vérification d'un template avant import
 * =======================================
 *
 * Un template n'est importable que si TOUT passe :
 * - `validateTemplate` (structure) et le schéma Zod strict (clés mal orthographiées) ;
 * - au moins une spec de test, et toutes vertes (même validateur que l'élève) ;
 * - chaque variation génère une instance sur `instances` tirages (0 échec).
 *
 * « 0 problème » n'est une preuve que si on sait combien d'éléments ont été
 * analysés : le rapport compte les specs et les tirages.
 */

import type { QuestionTemplate } from '$lib/questions/types';
import { validateTemplate } from '$lib/questions/validators/template-validator';
import { questionTemplateSchema } from '$lib/questions/template-schema';
import { runAllTestSpecs, type TestSpecResult } from '$lib/questions/test-spec-runner';
import { generateInstance } from '$lib/questions/generator/instance-generator';

// ============================================================================
// TYPES
// ============================================================================

export interface GenerationFailure {
	variationIndex: number;
	seed: number;
	errors: string[];
}

export interface TemplateCheckReport {
	templateErrors: string[];
	schemaErrors: string[];
	specs: TestSpecResult[];
	generation: {
		/** Tirages tentés, toutes variations confondues */
		attempts: number;
		failures: GenerationFailure[];
	};
	passed: boolean;
	/** Raisons de l'échec, en français (vide si `passed`) */
	reasons: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_INSTANCES_PER_VARIATION = 50;

// ============================================================================
// FUNCTIONS
// ============================================================================

/** `id` est porté par la base, absent du schéma strict de l'éditeur */
function withoutId(template: QuestionTemplate): Omit<QuestionTemplate, 'id'> {
	const { id: _id, ...rest } = template;
	return rest;
}

/** Chaque variation, seule, génère-t-elle sur `instances` tirages ? */
function checkGeneration(
	template: QuestionTemplate,
	instances: number
): TemplateCheckReport['generation'] {
	const failures: GenerationFailure[] = [];
	let attempts = 0;

	template.variations.forEach((variation, variationIndex) => {
		const single: QuestionTemplate = { ...template, variations: [variation] };
		for (let seed = 1; seed <= instances; seed++) {
			attempts++;
			const result = generateInstance(single, seed);
			if (!result.success) failures.push({ variationIndex, seed, errors: result.errors });
		}
	});

	return { attempts, failures };
}

export function checkTemplate(
	template: QuestionTemplate,
	options: { instances?: number } = {}
): TemplateCheckReport {
	const instances = options.instances ?? DEFAULT_INSTANCES_PER_VARIATION;

	const templateErrors = validateTemplate(template);
	const schema = questionTemplateSchema.safeParse(withoutId(template));
	const schemaErrors = schema.success
		? []
		: schema.error.issues.map((issue) => `${issue.path.join('.')} : ${issue.message}`);
	const specs = runAllTestSpecs(template);
	const generation = checkGeneration(template, instances);

	const reasons: string[] = [];
	// Contrainte `question_templates_level_positive` ; les niveaux TinyMath commencent à 0
	if (!(template.level >= 1))
		reasons.push(`niveau ${template.level} : la base exige un niveau ≥ 1`);
	if (templateErrors.length > 0) reasons.push(`${templateErrors.length} erreur(s) de structure`);
	if (schemaErrors.length > 0) reasons.push(`${schemaErrors.length} erreur(s) de schéma`);
	if (specs.length === 0) reasons.push('aucune spec de test');
	const failedSpecs = specs.filter((spec) => !spec.passed).length;
	if (failedSpecs > 0) reasons.push(`${failedSpecs} spec(s) rouge(s) sur ${specs.length}`);
	if (generation.failures.length > 0) {
		reasons.push(`${generation.failures.length} tirage(s) en échec sur ${generation.attempts}`);
	}

	return {
		templateErrors,
		schemaErrors,
		specs,
		generation,
		passed: reasons.length === 0,
		reasons
	};
}

/** Rapport lisible (terminal), qui dit toujours combien d'éléments ont été analysés */
export function formatCheckReport(report: TemplateCheckReport): string {
	const lines: string[] = [];
	const green = report.specs.filter((spec) => spec.passed).length;
	lines.push(`Specs : ${green}/${report.specs.length} vertes`);
	for (const result of report.specs) {
		const mark = result.passed ? '✅' : '❌';
		const detail = result.passed
			? ''
			: ` — attendu ${result.spec.expected.status}, obtenu ${result.actual.status}${result.error ? ` (${result.error})` : ''}`;
		lines.push(`  ${mark} ${result.spec.description}${detail}`);
	}
	const { attempts, failures } = report.generation;
	lines.push(`Tirages : ${attempts - failures.length}/${attempts} réussis`);
	for (const failure of failures.slice(0, 5)) {
		lines.push(
			`  ❌ variation ${failure.variationIndex + 1}, tirage ${failure.seed} : ${failure.errors.join('; ')}`
		);
	}
	if (failures.length > 5) lines.push(`  … et ${failures.length - 5} autre(s)`);
	for (const error of report.templateErrors) lines.push(`Structure : ${error}`);
	for (const error of report.schemaErrors) lines.push(`Schéma : ${error}`);
	lines.push(
		report.passed
			? 'VERDICT : importable'
			: `VERDICT : NON importable — ${report.reasons.join(', ')}`
	);
	return lines.join('\n');
}
