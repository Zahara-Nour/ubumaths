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

import type { QuestionTemplate, QuestionInstance, GenerationResult } from '../types';
import type { ResolvedMarkdown } from '$lib/shared/markdown';
import { validateTemplate } from '../validators/template-validator';
import { detectCircularDependencies } from '$lib/shared/parameterization/validator/circular-dependency';
import { resolveVariables } from './variable-resolver';
import { resolveMarkdownContent, resolveAnswer, resolveExpression } from './content-resolver';
import { shuffleChoices } from './choice-shuffler';

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
 *   answer: '{eval:{@:a}+{@:b}}',
 *   grades: ['6'],
 *   delay: 30
 * };
 *
 * const result = generateInstance(template, 42);
 * if (result.success) {
 *   console.log(result.instance.statement[0].content);  // "Calculate $$7 + 3$$"
 *   console.log(result.instance.answer);                 // "10"
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

		// 3. Detect circular dependencies in selected variation
		if (selectedVariation.variables) {
			const circularResult = detectCircularDependencies(selectedVariation.variables);
			if (!circularResult.valid) {
				return {
					success: false,
					errors: circularResult.errors.map((err) => err.message)
				};
			}
		}

		// 4. Resolve variables in declaration order
		const resolvedVariables = resolveVariables(selectedVariation.variables || [], seed);

		// 5. Resolve statement markdown
		const resolvedStatement: ResolvedMarkdown = resolveMarkdownContent(
			selectedVariation.statement,
			resolvedVariables,
			seed
		);

		// Resolve answer (stays the same - it's a plain string)
		const resolvedAnswer = resolveAnswer(selectedVariation.answer, resolvedVariables, seed);

		// Resolve correction if present
		let resolvedCorrection: ResolvedMarkdown | undefined;
		if (selectedVariation.correction) {
			resolvedCorrection = resolveMarkdownContent(
				selectedVariation.correction,
				resolvedVariables,
				seed
			);
		}

		// 6. Resolve type-specific fields from selected variation
		let resolvedChoices;
		let shuffledChoices;
		let resolvedBlanks;

		if (template.type === 'multiple_choice' && selectedVariation.choices) {
			// Resolve choice content
			resolvedChoices = selectedVariation.choices.map((choice) => {
				const resolvedContent: ResolvedMarkdown = resolveMarkdownContent(
					choice.content,
					resolvedVariables,
					seed
				);
				return {
					content: resolvedContent,
					isCorrect: choice.isCorrect
				};
			});

			// Shuffle choices
			shuffledChoices = shuffleChoices(resolvedChoices, seed);
		}

		if (template.type === 'fill_in_blanks' && selectedVariation.blanks) {
			resolvedBlanks = selectedVariation.blanks.map((blank) => ({
				position: blank.position,
				expectedAnswer: resolveExpression(blank.expectedAnswer, resolvedVariables, seed)
			}));
		}

		// 7. Construct instance
		const instance: QuestionInstance = {
			templateId: template.id,
			type: template.type,
			statement: resolvedStatement, // Now ResolvedMarkdown
			resolvedVariables,
			answer: resolvedAnswer,
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
