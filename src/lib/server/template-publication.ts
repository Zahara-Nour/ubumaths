/**
 * Contrôle de publication d'un modèle de question
 * ===============================================
 *
 * LE point de contrôle unique, partagé par la publication d'un modèle seul
 * (`PUT /api/questions/templates/[id]`) et la publication par lot
 * (`publishTemplates`) : un chemin moins exigeant que l'autre laissait une
 * question cassée atteindre les élèves.
 *
 * - `checkTemplate` : structure, schéma strict, specs vertes (une « correct »
 *   par variation), 50 tirages par variation ;
 * - dépendances circulaires entre variables, pour un message lisible (le
 *   tirage échouerait de toute façon).
 *
 * Messages en français : le détail d'abord (ce que l'éditeur affiche), puis
 * les raisons résumées de `checkTemplate`.
 */

import type { QuestionTemplate } from '$lib/questions/types';
import { detectCircularDependencies } from '$lib/questions';
import { checkTemplate } from '$lib/migration/review/check-template';

// ============================================================================
// FUNCTIONS
// ============================================================================

function circularDependencyErrors(template: QuestionTemplate): string[] {
	const errors: string[] = [];
	(template.variations ?? []).forEach((variation, index) => {
		const result = detectCircularDependencies(variation.variables || []);
		if (!result.valid) {
			errors.push(...result.errors.map((err) => `Variation ${index + 1}: ${err.message}`));
		}
	});
	return errors;
}

/**
 * Raisons qui empêchent de publier `template` (vide = publiable). Le modèle
 * doit être débarrassé des colonnes de la base (`withoutDbMetadata`) : le
 * schéma strict les refuserait comme clés inconnues.
 */
export function templatePublicationErrors(template: QuestionTemplate): string[] {
	const report = checkTemplate(template);
	const circularErrors = circularDependencyErrors(template);
	if (report.passed && circularErrors.length === 0) return [];

	const firstFailure = report.generation.failures[0];
	const failureDetail = firstFailure
		? [
				`Variation ${firstFailure.variationIndex + 1}, tirage ${firstFailure.seed} : ${firstFailure.errors.join('; ')}`
			]
		: [];
	const failedSpecs = report.specs
		.filter((result) => !result.passed)
		.map(
			(result) =>
				`Spec « ${result.spec.description} » : attendu ${result.spec.expected.status}, obtenu ${result.actual.status}`
		);

	return [
		...report.templateErrors,
		...report.schemaErrors,
		...circularErrors,
		...failedSpecs,
		...failureDetail,
		...report.reasons
	];
}
