/**
 * Template Validator
 * ==================
 *
 * Validates question template structure and syntax.
 *
 * @module questions/validators/template-validator
 */

import type { QuestionTemplate, QuestionVariation } from '../types';

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
	if (!template.type) {
		errors.push('Missing required field: type');
	}

	if (!template.grades || template.grades.length === 0) {
		errors.push('Missing required field: grades');
	}

	// Validate variations array
	if (!template.variations || template.variations.length === 0) {
		errors.push('Missing required field: variations (at least 1 variation required)');
		// Cannot continue validation without variations
		return errors;
	}

	// Validate each variation
	template.variations.forEach((variation, index) => {
		const variationErrors = validateVariation(variation, template.type, index);
		errors.push(...variationErrors);
	});

	// Categorization fields
	if (!template.theme || template.theme.trim() === '') {
		errors.push('Missing required field: theme');
	}

	if (!template.domain || template.domain.trim() === '') {
		errors.push('Missing required field: domain');
	}

	if (!template.level || template.level <= 0) {
		errors.push('level must be a positive integer');
	}

	// Type-specific validation (shared config)
	switch (template.type) {
		case 'algebraic_transform':
			if (!template.transformType) {
				errors.push('algebraic_transform requires transformType');
			}
			break;
	}

	// Validate delay (if present)
	if (template.delay !== undefined && template.delay <= 0) {
		errors.push('delay must be positive');
	}

	// Validate precision (if present)
	if (template.precision) {
		const precision = template.precision;

		if (
			precision.type === 'decimal' ||
			precision.type === 'significant' ||
			precision.type === 'magnitude'
		) {
			if (!('digits' in precision) || precision.digits <= 0) {
				errors.push(`${precision.type} precision requires positive digits`);
			}
		}

		if (precision.type === 'tolerance') {
			if (!('tolerance' in precision) || precision.tolerance <= 0) {
				errors.push('tolerance precision requires positive tolerance value');
			}
			if (!('mode' in precision)) {
				errors.push('tolerance precision requires mode (absolute or relative)');
			}
		}
	}

	return errors;
}

/**
 * Validate a single question variation
 *
 * @param variation - Variation to validate
 * @param questionType - Question type from template
 * @param index - Variation index (for error messages)
 * @returns Array of error messages
 */
function validateVariation(
	variation: QuestionVariation,
	questionType: string,
	index: number
): string[] {
	const errors: string[] = [];
	const prefix = `Variation ${index + 1}:`;

	// Validate statement (now a TemplateMarkdown string)
	if (typeof variation.statement !== 'string') {
		errors.push(`${prefix} Missing required field: statement`);
	} else if (variation.statement.trim().length === 0) {
		errors.push(`${prefix} Statement cannot be empty`);
	}

	// Validate solution
	if (!variation.solution) {
		errors.push(`${prefix} Missing required field: solution`);
	}

	// Validate correction (if present, now a QuestionCorrection object)
	if (variation.correction !== undefined) {
		if (typeof variation.correction !== 'object' || variation.correction === null) {
			errors.push(`${prefix} Correction must be an object with feedback and/or steps`);
		} else {
			const { feedback, steps } = variation.correction;
			// At least one of feedback or steps should be present for a non-empty correction
			if (!feedback && !steps) {
				errors.push(`${prefix} Correction must have at least feedback or steps`);
			}
		}
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
			if (!variation.blanks || variation.blanks.length === 0) {
				errors.push(`${prefix} fill_in_blanks requires at least one blank`);
			}
			break;

		case 'multiple_choice':
			if (!variation.choices || variation.choices.length < 2) {
				errors.push(`${prefix} multiple_choice requires at least 2 choices`);
			}

			// Check that at least one choice is correct
			if (variation.choices) {
				const hasCorrect = variation.choices.some((choice) => choice.isCorrect);
				if (!hasCorrect) {
					errors.push(`${prefix} multiple_choice requires at least one correct choice`);
				}
			}
			break;
	}

	return errors;
}

/**
 * Check if template is valid (no errors)
 */
export function isValidTemplate(template: QuestionTemplate): boolean {
	return validateTemplate(template).length === 0;
}
