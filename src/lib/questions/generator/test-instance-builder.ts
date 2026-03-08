/**
 * Test Instance Builder
 * =====================
 *
 * Generates a question instance from a template with fixed (deterministic) variables.
 * Used by the test spec runner to validate questions without randomness.
 *
 * @module questions/generator/test-instance-builder
 */

import type {
	QuestionTemplate,
	QuestionVariation,
	QuestionVariable,
	SharedVariationDefaults,
	GenerationResult
} from '../types';
import { generateInstance } from './instance-generator';

/**
 * Merge shared defaults with variation-specific values.
 * Re-implemented here to access merged variables for validation.
 */
function resolveVariationWithShared(
	shared: SharedVariationDefaults | undefined,
	variation: QuestionVariation
): QuestionVariation {
	if (!shared) return variation;

	const sharedVars = shared.variables ?? [];
	const variationVars = variation.variables ?? [];
	const overriddenNames = new Set(variationVars.map((v) => v.name));
	const effectiveShared = sharedVars.filter((v) => !overriddenNames.has(v.name));
	const mergedVariables =
		effectiveShared.length || variationVars.length
			? [...effectiveShared, ...variationVars]
			: undefined;

	return {
		statement: variation.statement || shared.statement || '',
		correctChoiceIndex: variation.correctChoiceIndex ?? shared.correctChoiceIndex,
		correction: variation.correction ?? shared.correction,
		choices: variation.choices ?? shared.choices,
		validationRules: variation.validationRules ?? shared.validationRules,
		requiredForm: variation.requiredForm ?? shared.requiredForm,
		variables: mergedVariables,
		conditions: variation.conditions ?? shared.conditions,
		blanks: variation.blanks,
		blankDefaults: variation.blankDefaults ?? shared.blankDefaults,
		answerFormats: variation.answerFormats ?? shared.answerFormats
	};
}

/**
 * Generate a question instance with fixed (non-random) variable values.
 *
 * Strategy: Create a temporary template where all variables are replaced
 * with literal expressions matching the fixed values. Then delegate to
 * the standard `generateInstance()` for the full pipeline.
 *
 * @param template - The question template
 * @param fixedVariables - Map of variable name → resolved value
 * @param variationIndex - Which variation to use (default: 0)
 * @returns GenerationResult with the deterministic instance
 */
export function generateInstanceWithFixedVariables(
	template: QuestionTemplate,
	fixedVariables: Record<string, string>,
	variationIndex: number = 0
): GenerationResult {
	if (variationIndex < 0 || variationIndex >= template.variations.length) {
		return {
			success: false,
			errors: [
				`Variation index ${variationIndex} out of range (0..${template.variations.length - 1})`
			]
		};
	}

	// Get the resolved variation to find all expected variable names
	const variation = template.variations[variationIndex];
	const resolved = resolveVariationWithShared(template.shared, variation);
	const expectedVars = resolved.variables ?? [];

	// Check that all expected variables have a fixed value
	const missingVars = expectedVars.filter((v) => !(v.name in fixedVariables));
	if (missingVars.length > 0) {
		return {
			success: false,
			errors: [`Missing fixed variables: ${missingVars.map((v) => v.name).join(', ')}`]
		};
	}

	// Build a modified template where:
	// - Only the target variation exists (at index 0)
	// - All variables are replaced with literal values
	const fixedVars: QuestionVariable[] = expectedVars.map((v) => ({
		name: v.name,
		expression: fixedVariables[v.name],
		displayOptions: v.displayOptions
	}));

	// Build modified variation with fixed variables and no conditions
	const modifiedVariation: QuestionVariation = {
		...variation,
		variables: fixedVars,
		conditions: undefined // Skip conditions since variables are fixed
	};

	// Build modified shared with no variables (all moved to variation)
	const modifiedShared: SharedVariationDefaults | undefined = template.shared
		? {
				...template.shared,
				variables: undefined, // All vars handled in variation
				conditions: undefined
			}
		: undefined;

	const modifiedTemplate: QuestionTemplate = {
		...template,
		shared: modifiedShared,
		variations: [modifiedVariation]
	};

	// Use seed 0 (deterministic, variation index will be 0 % 1 = 0)
	const result = generateInstance(modifiedTemplate, 0);

	// Restore original variation index in the result
	if (result.success) {
		result.instance.selectedVariationIndex = variationIndex;
	}

	return result;
}
