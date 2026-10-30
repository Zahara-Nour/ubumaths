/**
 * Template Validator
 * ==================
 *
 * Validates question template structure and syntax.
 *
 * @module questions/validators/template-validator
 */

import type { QuestionTemplate, QuestionVariation, SharedVariationDefaults } from '../types';
import { getQuestionType } from '../types';
import { hasCourseCardBackSource } from '../course-card';
import { findRulesSufficeBlanksWithoutRules } from '../rules-suffice';
import { assumptionCollisionMessage, findAssumptionCollisions } from '../answer-assumptions';
import { choiceAnswerCountErrors } from './choice-answer-count';
import { assignBlankIndices } from '../generator/assign-blank-indices';
import { hasCollectionToBuild } from '$lib/ubumark/parser/collection-parser';
import { hasMonnaieToBuild } from '$lib/ubumark/parser/monnaie-parser';
import { hasLineToPlace } from '$lib/ubumark/parser/number-line-parser';
import { hasHorlogeToPlace } from '$lib/ubumark/parser/horloge-parser';
import { hasBarsToPlace } from '$lib/ubumark/parser/stat-chart-parser';
import { hasRangerToPlace } from '$lib/ubumark/parser/ranger-parser';
import { hasPartageToColorier } from '$lib/ubumark/parser/partage-parser';
import { hasCubesToBuild } from '$lib/ubumark/parser/espace-parser';
import { WORK_FIGURE_ALONE_MESSAGE } from '$lib/ubumark/parser/construction-parser';

/**
 * Validate a question template
 *
 * Checks:
 * - Required fields are present
 * - Variations array has at least 1 element
 * - Each variation is valid
 * - Type-specific fields are valid
 * - Syntax of special expressions
 * - Field consistency
 *
 * @param template - Question template to validate
 * @returns Array of error messages (empty if valid)
 */
export function validateTemplate(template: QuestionTemplate): string[] {
	const errors: string[] = [];

	// Required fields
	if (!template.grades || template.grades.length === 0) {
		errors.push('Missing required field: grades');
	}

	// Validate variations array
	if (!template.variations || template.variations.length === 0) {
		errors.push('Missing required field: variations (at least 1 variation required)');
		// Cannot continue validation without variations
		return errors;
	}

	// Type for type-specific checks (carte de cours : marqueur explicite)
	const inferredType = getQuestionType({ options: template.options });

	// Validate each variation (pass shared defaults for merged field checks)
	template.variations.forEach((variation, index) => {
		const variationErrors = validateVariation(variation, inferredType, index, template.shared);
		errors.push(...variationErrors);
	});

	// Case choix : exactement une bonne réponse, au moins une avec `plusieurs: oui` (V1)
	errors.push(...choiceAnswerCountErrors(template));

	// Hypothèses de l'énoncé : jamais sur une variable tirée (ADR 0012)
	for (const name of findAssumptionCollisions(template.options?.answerAssumptions, template)) {
		errors.push(assumptionCollisionMessage(name));
	}

	// Categorization fields
	if (!template.theme || template.theme.trim() === '') {
		errors.push('Missing required field: theme');
	}

	if (!template.domain || template.domain.trim() === '') {
		errors.push('Missing required field: domain');
	}

	if (template.level == null || template.level < 0) {
		errors.push('level must be a non-negative integer');
	}

	// Délai (s'il est présent) : une ligne lue en base porte `null` pour
	// « pas de délai », et `null <= 0` vaut `true` → `!= null` écarte les deux
	if (template.delay != null && template.delay <= 0) {
		errors.push('delay must be positive');
	}

	return errors;
}

/**
 * Validate a single question variation
 *
 * @param variation - Variation to validate
 * @param questionType - Question type from template
 * @param index - Variation index (for error messages)
 * @param shared - Shared defaults (for merged field checks like statement)
 * @returns Array of error messages
 */
function validateVariation(
	variation: QuestionVariation,
	questionType: string,
	index: number,
	shared?: SharedVariationDefaults
): string[] {
	const errors: string[] = [];
	const prefix = `Variation ${index + 1}:`;

	// Validate statement (now a TemplateMarkdown string, can fall back to shared)
	const hasOwnStatement =
		typeof variation.statement === 'string' && variation.statement.trim().length > 0;
	const hasSharedStatement =
		typeof shared?.statement === 'string' && shared.statement.trim().length > 0;
	if (!hasOwnStatement && !hasSharedStatement) {
		if (typeof variation.statement !== 'string') {
			errors.push(`${prefix} Missing required field: statement`);
		} else {
			errors.push(`${prefix} Statement cannot be empty`);
		}
	}

	// rulesSuffice sans aucune règle : toute réponse serait juste
	for (const blankIndex of findRulesSufficeBlanksWithoutRules(variation, shared)) {
		errors.push(
			`${prefix} blank ${blankIndex + 1} has rulesSuffice but no validationRules (every answer would be accepted)`
		);
	}

	// Validate correction (if present, now a QuestionCorrection object)
	if (variation.correction !== undefined) {
		if (typeof variation.correction !== 'object' || variation.correction === null) {
			errors.push(
				`${prefix} Correction must be an object with feedback, steps and/or generatedSteps`
			);
		} else {
			const { feedback, steps, generatedSteps } = variation.correction;
			// At least one content channel must be present for a non-empty correction.
			// Mode A = `steps` (manual) ; Mode B = `generatedSteps` (declarative).
			if (!feedback && !steps && !generatedSteps) {
				errors.push(`${prefix} Correction must have at least feedback, steps or generatedSteps`);
			}
		}
	}

	// Q36 (D4) : la réponse d'une intégrale à bornes est un nombre, sans forme à demander
	const generatedSteps = (variation.correction ?? shared?.correction)?.generatedSteps;
	if (
		generatedSteps?.kind === 'integrate' &&
		generatedSteps.definite !== undefined &&
		generatedSteps.finalForm !== undefined
	) {
		errors.push(`${prefix} generatedSteps.finalForm is not allowed on a definite integral`);
	}

	// Validate variable names (no duplicates within variation)
	if (variation.variables) {
		const varNames = new Set<string>();
		for (const variable of variation.variables) {
			if (!variable.name) {
				errors.push(`${prefix} Variable must have a name`);
			} else if (varNames.has(variable.name)) {
				errors.push(`${prefix} Duplicate variable name: ${variable.name}`);
			} else {
				varNames.add(variable.name);
			}

			if (!variable.expression) {
				errors.push(`${prefix} Variable "${variable.name}" must have an expression`);
			}
		}
	}

	// Type-specific validation (per-variation)
	switch (questionType) {
		case 'fill_in_blanks':
			// Un bloc ```operation à remplir porte sa propre case (sa réponse vient du calcul),
			// un bloc ```figure-a-completer aussi (la figure de l'élève), un bloc ```collection
			// ou ```monnaie à construire aussi (sa réponse est sa valeur), une droite ou une horloge
			// à placer aussi, un diagramme en barres à construire aussi, des étiquettes à ranger aussi, une figure à colorier aussi,
			// un assemblage de cubes à geste aussi
			if (
				(!variation.blanks || variation.blanks.length === 0) &&
				!hasOperationToFill(String(variation.statement ?? shared?.statement ?? '')) &&
				!hasCollectionToBuild(String(variation.statement ?? shared?.statement ?? '')) &&
				!hasMonnaieToBuild(String(variation.statement ?? shared?.statement ?? '')) &&
				!hasLineToPlace(String(variation.statement ?? shared?.statement ?? '')) &&
				!hasHorlogeToPlace(String(variation.statement ?? shared?.statement ?? '')) &&
				!hasBarsToPlace(String(variation.statement ?? shared?.statement ?? '')) &&
				!hasRangerToPlace(String(variation.statement ?? shared?.statement ?? '')) &&
				!hasPartageToColorier(String(variation.statement ?? shared?.statement ?? '')) &&
				!hasCubesToBuild(String(variation.statement ?? shared?.statement ?? '')) &&
				!/^\s*>?\s*```figure-a-completer\s*$/m.test(
					String(variation.statement ?? shared?.statement ?? '')
				)
			) {
				// Une figure de travail porte une case, mais jamais notée : le dire quand
				// l'énoncé n'en a pas d'autre (sinon, seul blanks[] manque)
				const numbered = assignBlankIndices(String(variation.statement ?? shared?.statement ?? ''));
				const workFigureCount = Object.keys(numbered.workFigureBlanks ?? {}).length;
				const workFigureOnly = workFigureCount > 0 && workFigureCount === numbered.totalBlanks;
				errors.push(
					`${prefix} ${workFigureOnly ? WORK_FIGURE_ALONE_MESSAGE : 'fill_in_blanks requires blanks[]'}`
				);
			}
			break;

		case 'course_card': {
			// Carte de cours : aucune case ; le verso (correction) est obligatoire
			if ((variation.blanks?.length ?? 0) > 0) {
				errors.push(`${prefix} course_card cannot have blanks[]`);
			}
			const correction = variation.correction ?? shared?.correction;
			if (!hasCourseCardBackSource(correction)) {
				errors.push(
					`${prefix} course_card requires a correction (verso): non-empty steps or generatedSteps`
				);
			}
			break;
		}
	}

	return errors;
}

/** Énoncé avec un bloc ```operation à remplir (pas `cases: aucune`) */
function hasOperationToFill(statement: string): boolean {
	// En retrait ou cité compris : le générateur dira qu'il doit être au premier niveau
	const blocks = statement.split(/^\s*>?\s*```operation\s*$/m).slice(1);
	return blocks.some((rest) => {
		const body = rest.replace(/^\n/, '').split(/^\s*>?\s*```\s*$|^\s*$/m)[0] ?? '';
		return !/^\s*cases\s*:\s*aucune\s*$/im.test(body);
	});
}

/**
 * Check if template is valid (no errors)
 */
export function isValidTemplate(template: QuestionTemplate): boolean {
	return validateTemplate(template).length === 0;
}
