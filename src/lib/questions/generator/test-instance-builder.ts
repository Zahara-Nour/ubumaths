/**
 * Test Instance Builder
 * =====================
 *
 * Generates a question instance from a template with fixed (deterministic) variables.
 * Used by the test spec runner to validate questions without randomness.
 *
 * Only "root" variables (those that don't depend on other variables) need
 * to be fixed. Derived variables are resolved normally by the pipeline.
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
import { getVariableNames } from '$lib/ubumark';

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
 * Identify root variables — those that don't depend on any other variable
 * in the same set.
 *
 * Uses the same dependency extraction as the circular dependency detector
 * (getVariableNames from the tokenizer). A variable is "root" if none of its
 * referenced names are in the variable set.
 *
 * @param variables - All variables (merged shared + variation)
 * @returns Names of root variables that need fixed values in test specs
 */
export function getRootVariableNames(variables: QuestionVariable[]): Set<string> {
	const allNames = new Set(variables.map((v) => v.name));
	const roots = new Set<string>();

	for (const v of variables) {
		// First try tokenizer-based detection ({{varName}} syntax)
		let deps = getVariableNames(v.expression);

		// Fallback: detect bare variable names in expressions without {{}} syntax
		// (legacy migration format like "(a*1000) + (b*100) + c")
		if (deps.length === 0) {
			deps = Array.from(allNames).filter(
				(name) => name !== v.name && new RegExp(`\\b${name}\\b`).test(v.expression)
			);
		}

		const hasInternalDep = deps.some((dep) => allNames.has(dep));
		if (!hasInternalDep) {
			roots.add(v.name);
		}
	}

	return roots;
}

/**
 * Generate a question instance with fixed (non-random) variable values.
 *
 * Only variables present in `fixedVariables` are replaced with literal values.
 * Other variables keep their original expressions and are resolved normally
 * by the pipeline. This means only root variables (random sources) need
 * to be provided; derived variables are computed automatically.
 *
 * @param template - The question template
 * @param fixedVariables - Map of variable name → resolved value (only root vars needed)
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

	// Build modified variables: replace only those with a fixed value,
	// keep original expressions for derived variables
	const modifiedVars: QuestionVariable[] = expectedVars.map((v) => {
		if (v.name in fixedVariables) {
			return {
				name: v.name,
				expression: fixedVariables[v.name],
				displayOptions: v.displayOptions
			};
		}
		// Keep original expression — will be resolved by the pipeline
		return v;
	});

	// Build modified variation with (partially) fixed variables and no conditions
	const modifiedVariation: QuestionVariation = {
		...variation,
		variables: modifiedVars,
		conditions: undefined // Skip conditions since root variables are fixed
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
