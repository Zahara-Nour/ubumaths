/**
 * Question Instance Generator
 * ===========================
 *
 * Main orchestrator for generating question instances from templates.
 * Handles complete resolution pipeline:
 * 1. Template validation
 * 2. Circular dependency detection
 * 3. Variable resolution
 * 4. Content resolution
 * 5. Choice shuffling (for QCM)
 *
 * @module questions/generator/instance-generator
 */

import type {
	QuestionTemplate,
	QuestionInstance,
	GenerationResult,
	QuestionVariation,
	QuestionVariable,
	SharedVariationDefaults,
	ResolvedCorrection
} from '../types';
import type { ResolvedMarkdown } from '$lib/ubumark';
import { templateMarkdown, detectCircularDependencies } from '$lib/ubumark';
import { validateTemplate } from '../validators/template-validator';
import { resolveVariables } from './variable-resolver';
import { resolveMarkdownContent, resolveSolution, resolveExpression } from './content-resolver';
import { shuffleChoices } from './choice-shuffler';

// ============================================================================
// SHARED DEFAULTS MERGING
// ============================================================================

/**
 * Merge shared and per-variation variables.
 *
 * Per-variation variables can reference shared variables (resolved in declaration order).
 * If a per-variation variable has the same name as a shared variable, it overrides it.
 *
 * @param shared - Shared variable definitions (resolved first)
 * @param perVariation - Per-variation variable definitions (can override shared)
 * @returns Merged array of variables, or undefined if both are empty
 */
function mergeVariables(
	shared: QuestionVariable[] | undefined,
	perVariation: QuestionVariable[] | undefined
): QuestionVariable[] | undefined {
	if (!shared?.length) return perVariation;
	if (!perVariation?.length) return shared;

	// Collect names that are overridden by per-variation
	const overriddenNames = new Set(perVariation.map((v) => v.name));

	// Filter out shared variables that are overridden
	const effectiveShared = shared.filter((v) => !overriddenNames.has(v.name));

	// Shared variables first (so per-variation can reference them), then per-variation
	return [...effectiveShared, ...perVariation];
}

/**
 * Merge shared defaults with variation-specific values.
 *
 * Variation values override shared values for most fields.
 * Special case: `variables` are MERGED (shared first, per-variation can reference/override).
 *
 * @param shared - Shared defaults that apply to all variations
 * @param variation - Variation-specific values
 * @returns Resolved variation with shared defaults applied
 */
function resolveVariationWithShared(
	shared: SharedVariationDefaults | undefined,
	variation: QuestionVariation
): QuestionVariation {
	if (!shared) return variation;

	return {
		// statement: empty string falls through to shared (use ||)
		// Fall back to empty TemplateMarkdown if neither has value (edge case)
		statement: variation.statement || shared.statement || templateMarkdown(''),

		// solution: allow explicit empty array/string (use ??)
		solution: variation.solution ?? shared.solution ?? '',

		// correction: full structure (use ??)
		correction: variation.correction ?? shared.correction,

		// choices: per-variation overrides entirely (use ??)
		choices: variation.choices ?? shared.choices,

		// validationRules: per-variation overrides entirely (use ??)
		validationRules: variation.validationRules ?? shared.validationRules,

		// variables: MERGE (shared first, per-variation can reference/override)
		variables: mergeVariables(shared.variables, variation.variables),

		// blanks: per-variation only (no shared equivalent)
		blanks: variation.blanks
	};
}

/**
 * Generate a question instance from a template
 *
 * @param template - Question template
 * @param seed - Optional seed for reproducible generation
 * @returns Generation result (success with instance or failure with errors)
 *
 * @example
 * ```typescript
 * const template: QuestionTemplate = {
 *   id: 'uuid',
 *   type: 'numerical_exact',
 *   statement: [{ type: 'text', content: 'Calculate $${@:a} + {@:b}$$' }],
 *   variables: [
 *     { name: 'a', expression: '{#:1-10}' },
 *     { name: 'b', expression: '{#:1-10}' }
 *   ],
 *   solution: '{eval:{@:a}+{@:b}}',
 *   grades: ['6'],
 *   delay: 30
 * };
 *
 * const result = generateInstance(template, 42);
 * if (result.success) {
 *   console.log(result.instance.statement[0].content);  // "Calculate $$7 + 3$$"
 *   console.log(result.instance.solution);               // "10"
 * }
 * ```
 */
export function generateInstance(template: QuestionTemplate, seed?: number): GenerationResult {
	try {
		// 1. Validate template structure
		const validationErrors = validateTemplate(template);
		if (validationErrors.length > 0) {
			return {
				success: false,
				errors: validationErrors
			};
		}

		// 2. Select a variation (random or based on seed)
		const variationIndex =
			seed !== undefined
				? Math.abs(seed) % template.variations.length
				: Math.floor(Math.random() * template.variations.length);
		const selectedVariation = template.variations[variationIndex];

		// 3. Merge shared defaults with variation-specific values
		const resolvedVariation = resolveVariationWithShared(template.shared, selectedVariation);

		// 4. Detect circular dependencies in resolved variation
		if (resolvedVariation.variables) {
			const circularResult = detectCircularDependencies(resolvedVariation.variables);
			if (!circularResult.valid) {
				return {
					success: false,
					errors: circularResult.errors.map((err) => err.message)
				};
			}
		}

		// 5. Resolve variables in declaration order
		const resolvedVariables = resolveVariables(resolvedVariation.variables || [], seed);

		// 6. Resolve statement markdown
		const resolvedStatement: ResolvedMarkdown = resolveMarkdownContent(
			resolvedVariation.statement,
			resolvedVariables,
			seed
		);

		// Resolve solution (stays the same - it's a plain string)
		const resolvedSolution = resolveSolution(resolvedVariation.solution, resolvedVariables, seed);

		// Resolve correction if present (QuestionCorrection has feedback and/or steps)
		let resolvedCorrection: ResolvedCorrection | undefined;
		if (resolvedVariation.correction) {
			const { feedback, steps } = resolvedVariation.correction;
			resolvedCorrection = {};

			// Resolve feedback messages (correct/incorrect/partial)
			if (feedback) {
				resolvedCorrection.feedback = {};
				if (feedback.correct) {
					resolvedCorrection.feedback.correct = resolveMarkdownContent(
						feedback.correct,
						resolvedVariables,
						seed
					);
				}
				if (feedback.incorrect) {
					resolvedCorrection.feedback.incorrect = resolveMarkdownContent(
						feedback.incorrect,
						resolvedVariables,
						seed
					);
				}
				if (feedback.partial) {
					resolvedCorrection.feedback.partial = resolveMarkdownContent(
						feedback.partial,
						resolvedVariables,
						seed
					);
				}
			}

			// Resolve step-by-step explanation
			if (steps) {
				resolvedCorrection.steps = steps.map((step) =>
					resolveMarkdownContent(step, resolvedVariables, seed)
				);
			}
		}

		// 7. Resolve type-specific fields from resolved variation
		let resolvedChoices;
		let shuffledChoices;
		let resolvedBlanks;

		if (template.type === 'multiple_choice' && resolvedVariation.choices) {
			// Resolve choice content
			resolvedChoices = resolvedVariation.choices.map((choice) => {
				const resolvedContent: ResolvedMarkdown = resolveMarkdownContent(
					choice.content,
					resolvedVariables,
					seed
				);
				return {
					content: resolvedContent,
					isCorrect: choice.isCorrect ?? false
				};
			});

			// Shuffle choices
			shuffledChoices = shuffleChoices(resolvedChoices, seed);
		}

		if (template.type === 'fill_in_blanks' && resolvedVariation.blanks) {
			resolvedBlanks = resolvedVariation.blanks.map((blank) => ({
				position: blank.position,
				expectedAnswer: resolveExpression(blank.expectedAnswer, resolvedVariables, seed)
			}));
		}

		// 8. Construct instance
		const instance: QuestionInstance = {
			templateId: template.id,
			type: template.type,
			statement: resolvedStatement, // Now ResolvedMarkdown
			resolvedVariables,
			solution: resolvedSolution,
			exerciseInstruction: template.exerciseInstruction,
			options: template.options,
			precision: template.precision,
			grades: template.grades,
			theme: template.theme,
			domain: template.domain,
			subdomain: template.subdomain,
			level: template.level,
			delay: template.delay,
			correction: resolvedCorrection, // Now ResolvedMarkdown
			transformType: template.transformType,
			blanks: resolvedBlanks,
			choices: resolvedChoices, // Now with ResolvedMarkdown content
			shuffledChoices, // Now with ResolvedMarkdown content
			multipleAnswers: template.multipleAnswers,
			generatedAt: new Date().toISOString(),
			seed,
			selectedVariationIndex: variationIndex
		};

		return {
			success: true,
			instance
		};
	} catch (error) {
		return {
			success: false,
			errors: [error instanceof Error ? error.message : `Unknown error: ${String(error)}`]
		};
	}
}

/**
 * Generate multiple instances from a template
 *
 * Useful for creating practice sets or test banks.
 *
 * @param template - Question template
 * @param count - Number of instances to generate
 * @param baseSeed - Base seed (instances will use baseSeed + index)
 * @returns Array of generation results
 */
export function generateMultipleInstances(
	template: QuestionTemplate,
	count: number,
	baseSeed?: number
): GenerationResult[] {
	const results: GenerationResult[] = [];

	for (let i = 0; i < count; i++) {
		const seed = baseSeed !== undefined ? baseSeed + i : undefined;
		results.push(generateInstance(template, seed));
	}

	return results;
}
