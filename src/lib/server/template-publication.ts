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

import type { QuestionTemplate } from '#lib/questions/types.ts';
import { detectCircularDependencies } from '#lib/questions/index.ts';
import { checkTemplate } from '#lib/questions/review/check-template.ts';

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

/** Messages d'erreurs prévues obtenus, pour l'auteur */
function formatMessages(messages: string[]): string {
	return messages.length === 0 ? 'aucun' : messages.map((message) => `« ${message} »`).join(', ');
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

	// Premier échec de génération, puis de figure (l'auteur voit POURQUOI)
	const failureDetail = [report.generation.failures[0], report.figures.failures[0]].flatMap(
		(failure) =>
			failure
				? [
						`Variation ${failure.variationIndex + 1}, tirage ${failure.seed} : ${failure.errors.join('; ')}`
					]
				: []
	);
	const failedSpecs = report.specs
		.filter((result) => !result.passed)
		.map((result) =>
			result.actual.status === result.spec.expected.status &&
			result.spec.expected.expectedErrorMessage !== undefined
				? `Spec « ${result.spec.description} » : message d’erreur prévue attendu « ${result.spec.expected.expectedErrorMessage} », obtenu ${formatMessages(result.actual.expectedErrorMessages)}`
				: `Spec « ${result.spec.description} » : attendu ${result.spec.expected.status}, obtenu ${result.actual.status}`
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
