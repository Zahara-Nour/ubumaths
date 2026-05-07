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
	ResolvedCorrection,
	InstanceBlank
} from '../types';
import type { ResolvedMarkdown } from '$lib/ubumark';
import { templateMarkdown, resolvedMarkdown, detectCircularDependencies } from '$lib/ubumark';
import { validateTemplate } from '../validators/template-validator';
import { resolveVariables } from './variable-resolver';
import {
	resolveMarkdownContent,
	resolveSolution,
	resolveExpression,
	insertExpressionMarkers,
	resolveAnswerFormat,
	convertToLatex
} from './content-resolver';
import { shuffleChoices } from './choice-shuffler';
import { assignBlankIndices } from './assign-blank-indices';
import { normalizeExpression } from '$lib/ubumark/parameterization';
import { applyRemoveSpaces } from '$lib/ubumark/parameterization/resolver/variable-resolver';
import { buildCorrectionContext, resolveCorrectionContent } from './correction-resolver';
import { generateCorrection } from './correction-generator';
import { evaluateConditions } from './condition-evaluator';

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

		// correctChoiceIndex: allow explicit empty array/string (use ??)
		correctChoiceIndex: variation.correctChoiceIndex ?? shared.correctChoiceIndex,

		// correction: full structure (use ??)
		correction: variation.correction ?? shared.correction,

		// choices: per-variation overrides entirely (use ??)
		choices: variation.choices ?? shared.choices,

		// validationRules: per-variation overrides entirely (use ??)
		validationRules: variation.validationRules ?? shared.validationRules,

		// requiredForm: per-variation overrides shared
		requiredForm: variation.requiredForm ?? shared.requiredForm,

		// variables: MERGE (shared first, per-variation can reference/override)
		variables: mergeVariables(shared.variables, variation.variables),

		// conditions: per-variation overrides shared
		conditions: variation.conditions ?? shared.conditions,

		// blanks: per-variation only (no shared equivalent for now)
		blanks: variation.blanks,

		// blankDefaults: per-variation overrides shared
		blankDefaults: variation.blankDefaults ?? shared.blankDefaults,

		// answerFormats: per-variation overrides shared
		answerFormats: variation.answerFormats ?? shared.answerFormats
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
 *   correctChoiceIndex: '{eval:{@:a}+{@:b}}',
 *   grades: ['6'],
 *   delay: 30
 * };
 *
 * const result = generateInstance(template, 42);
 * if (result.success) {
 *   console.log(result.instance.statement[0].content);  // "Calculate $$7 + 3$$"
 *   console.log(result.instance.correctChoiceIndex);     // "10"
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

		// 5. Resolve variables in declaration order (with condition retry loop)
		const MAX_CONDITION_RETRIES = 100;
		let resolvedVariables = resolveVariables(resolvedVariation.variables || [], seed);
		let conditionRetryCount = 0;

		if (resolvedVariation.conditions?.length) {
			while (
				!evaluateConditions(resolvedVariation.conditions, resolvedVariables) &&
				conditionRetryCount < MAX_CONDITION_RETRIES
			) {
				conditionRetryCount++;
				const effectiveSeed = seed !== undefined ? seed + conditionRetryCount * 7919 : undefined;
				resolvedVariables = resolveVariables(resolvedVariation.variables || [], effectiveSeed);
			}

			if (conditionRetryCount >= MAX_CONDITION_RETRIES) {
				return {
					success: false,
					errors: [
						`Failed to generate variables satisfying conditions after ${MAX_CONDITION_RETRIES} retries. Conditions: ${resolvedVariation.conditions.join(', ')}`
					]
				};
			}
		}

		// 5b. Detect expression variable names (convention: name starts with "expression")
		const expressionNames = new Set(
			resolvedVariables.filter((v) => v.name.startsWith('expression')).map((v) => v.name)
		);

		// 5c. Insert <<expr:NAME>> markers in template before variable resolution
		let statementTemplate = resolvedVariation.statement;
		if (expressionNames.size > 0) {
			const markedStatement = insertExpressionMarkers(String(statementTemplate), expressionNames);
			statementTemplate = templateMarkdown(markedStatement);
		}

		// 6. Resolve statement markdown (with expression markers if present)
		const resolvedStatement: ResolvedMarkdown = resolveMarkdownContent(
			statementTemplate,
			resolvedVariables,
			seed
		);

		// Resolve correctChoiceIndex from explicit value or derive from isCorrect on choices
		let resolvedCorrectChoiceIndex: string | string[] | undefined;
		if (resolvedVariation.correctChoiceIndex) {
			resolvedCorrectChoiceIndex = resolveSolution(
				resolvedVariation.correctChoiceIndex,
				resolvedVariables,
				seed
			);
		} else if (resolvedVariation.choices) {
			// Derive from isCorrect flags on choices
			const correctIndexes = resolvedVariation.choices
				.map((choice, i) => (choice.isCorrect ? String(i) : null))
				.filter((i): i is string => i !== null);
			if (correctIndexes.length === 1) {
				resolvedCorrectChoiceIndex = correctIndexes[0];
			} else if (correctIndexes.length > 1) {
				resolvedCorrectChoiceIndex = correctIndexes;
			}
		}

		// 7. Resolve type-specific fields from resolved variation (inferred from structure)
		let resolvedChoices;
		let shuffledChoices;
		let resolvedBlanks: InstanceBlank[] | undefined;
		let expressionsArray: QuestionInstance['expressions'] = undefined;
		let finalStatement: ResolvedMarkdown = resolvedStatement;

		if (resolvedVariation.blanks) {
			// 7a. Fill-in-blanks pipeline

			// Resolve answerFormats for expression variables (variable resolution + LaTeX conversion)
			let resolvedAnswerFormats: Record<string, string> | undefined;
			if (expressionNames.size > 0) {
				resolvedAnswerFormats = {};
				for (const exprName of Array.from(expressionNames)) {
					const rawFormat = resolvedVariation.answerFormats?.[exprName] ?? '?';
					resolvedAnswerFormats[exprName] = resolveAnswerFormat(rawFormat, resolvedVariables, seed);
				}
			}

			// Call assignBlankIndices (? → \placeholder[N]{}, [_] → {{blank:N}})
			const blankResult = assignBlankIndices(String(resolvedStatement), resolvedAnswerFormats);

			// Coherence check: totalBlanks must match blanks[] length
			if (blankResult.totalBlanks !== resolvedVariation.blanks.length) {
				return {
					success: false,
					errors: [
						`Blank count mismatch: statement has ${blankResult.totalBlanks} blank(s) but blanks[] has ${resolvedVariation.blanks.length} entry/entries`
					]
				};
			}

			// Use modified statement from assignBlankIndices
			finalStatement = resolvedMarkdown(blankResult.statement);

			// Build instance.blanks[] with inferred types and merged validation
			resolvedBlanks = resolvedVariation.blanks.map((blank, i) => {
				// Resolve expectedAnswer:
				// - Math blanks: normalize then resolve, like variables do.
				//   normalizeExpression converts "eval:a+b" → "{{eval:a+b}}", etc.
				// - Text blanks: only resolve if already contains {{...}}.
				//   Bare words like "pair", "entier" are literal text, not variable refs.
				const rawExpected = blank.expectedAnswer;
				const isMathBlank = blankResult.blankTypes[i] === 'math';
				const normalized = isMathBlank ? normalizeExpression(rawExpected) : rawExpected;
				const expectedAnswer = normalized.includes('{{')
					? resolveExpression(normalized, resolvedVariables, seed)
					: normalized;

				// `i` matches the blank counter assigned by `assignBlankIndices`
				// (left-to-right, consecutive, 0-based). If that contract changes,
				// this lookup silently returns undefined.
				const expressionName = blankResult.expressionNameByIndex?.[i];
				const resolved: InstanceBlank = {
					expectedAnswer,
					type: blankResult.blankTypes[i],
					precision: blank.precision ?? resolvedVariation.blankDefaults?.precision,
					requiredForm: blank.requiredForm ?? resolvedVariation.blankDefaults?.requiredForm,
					validationRules: blank.validationRules ?? resolvedVariation.validationRules,
					unit: blank.unit ?? resolvedVariation.blankDefaults?.unit,
					pool: blank.pool,
					...(expressionName !== undefined && { expressionName })
				};
				if (blank.prefilled) {
					resolved.prefilled = resolveExpression(
						normalizeExpression(blank.prefilled),
						resolvedVariables,
						seed
					);
					const hasRemoveSpaces =
						blank.removeSpaces ??
						resolvedVariation.blankDefaults?.removeSpaces ??
						template.defaultDisplayOptions?.removeSpaces;
					if (resolved.type === 'math' && hasRemoveSpaces) {
						resolved.prefilled = applyRemoveSpaces(resolved.prefilled);
					}
				}
				// Generate expectedAnswerLatex for math blanks
				if (resolved.type === 'math') {
					resolved.expectedAnswerLatex = convertToLatex(resolved.expectedAnswer);
				}
				return resolved;
			});

			// Build instance.expressions[] from expression variables
			if (expressionNames.size > 0) {
				expressionsArray = [];
				for (const exprName of Array.from(expressionNames)) {
					const variable = resolvedVariables.find((v) => v.name === exprName);
					if (!variable) {
						return {
							success: false,
							errors: [
								`Expression variable "${exprName}" referenced in statement but not found in resolved variables`
							]
						};
					}
					expressionsArray.push({
						name: exprName,
						latex: convertToLatex(variable.value),
						displayLatex: variable.displayValue ?? undefined,
						answerFormat: blankResult.answerFormats?.[exprName],
						value: variable.value
					});
				}
			}
		}

		if (resolvedVariation.choices) {
			// 7b. Multiple choice — resolve choice content if it has variable references.
			// Bare text like "pair" must NOT go through resolveMarkdownContent because
			// normalizeExpression treats identifiers as variable references.

			// Build set of correct indexes from resolvedCorrectChoiceIndex
			const correctIndexSet = new Set<number>();
			if (resolvedCorrectChoiceIndex) {
				const indexes = Array.isArray(resolvedCorrectChoiceIndex)
					? resolvedCorrectChoiceIndex
					: [resolvedCorrectChoiceIndex];
				for (const idx of indexes) {
					const n = parseInt(idx, 10);
					if (!isNaN(n)) correctIndexSet.add(n);
				}
			}

			resolvedChoices = resolvedVariation.choices.map((choice, i) => {
				const content = choice.content;
				const resolvedContent: ResolvedMarkdown = content.includes('{{')
					? resolveMarkdownContent(content, resolvedVariables, seed)
					: resolvedMarkdown(content);
				// Use choice.isCorrect if set, otherwise derive from correctChoiceIndex
				const isCorrect =
					correctIndexSet.size > 0 ? correctIndexSet.has(i) : (choice.isCorrect ?? false);
				return {
					content: resolvedContent,
					isCorrect
				};
			});

			// Shuffle choices
			shuffledChoices = shuffleChoices(resolvedChoices, seed);
		}

		// 7c. Resolve correction with pseudo-variables (AFTER blanks and choices)
		let resolvedCorrection: ResolvedCorrection | undefined;
		if (resolvedVariation.correction) {
			const correctionContext = buildCorrectionContext(
				resolvedBlanks,
				resolvedChoices, // Pre-shuffle: indices match correctChoiceIndex
				resolvedCorrectChoiceIndex,
				resolvedVariables
			);

			const { feedback, steps, generatedSteps } = resolvedVariation.correction;
			resolvedCorrection = {};

			// Mode B — copy `generatedSteps` declaration as-is (no resolution :
			// `expression` / `equation` may still hold `{{vars}}` ; resolution
			// happens inside `generateCorrection()` later in the pipeline).
			if (generatedSteps) {
				resolvedCorrection.generatedSteps = generatedSteps;
			}

			if (feedback) {
				resolvedCorrection.feedback = {};
				if (feedback.correct) {
					resolvedCorrection.feedback.correct = resolveCorrectionContent(
						feedback.correct,
						resolvedVariables,
						correctionContext,
						seed
					);
				}
				if (feedback.incorrect) {
					resolvedCorrection.feedback.incorrect = resolveCorrectionContent(
						feedback.incorrect,
						resolvedVariables,
						correctionContext,
						seed
					);
				}
				if (feedback.partial) {
					resolvedCorrection.feedback.partial = resolveCorrectionContent(
						feedback.partial,
						resolvedVariables,
						correctionContext,
						seed
					);
				}
			}

			if (steps) {
				resolvedCorrection.steps = steps.map((step) =>
					resolveCorrectionContent(step, resolvedVariables, correctionContext, seed)
				);
			}
		}

		// 8. Construct instance
		const instance: QuestionInstance = {
			templateId: template.id,
			statement: finalStatement,
			resolvedVariables,
			correctChoiceIndex: resolvedCorrectChoiceIndex,
			exerciseInstruction: template.exerciseInstruction,
			options: template.options,
			grades: template.grades,
			theme: template.theme,
			domain: template.domain,
			subdomain: template.subdomain,
			level: template.level,
			delay: template.delay,
			correction: resolvedCorrection,
			blanks: resolvedBlanks,
			expressions: expressionsArray,
			choices: resolvedChoices,
			shuffledChoices,
			multipleAnswers: template.multipleAnswers,
			requiredForm: resolvedVariation.requiredForm,
			generatedAt: new Date().toISOString(),
			seed,
			selectedVariationIndex: variationIndex
		};

		// 9. Mode B — pre-render pedagogical steps if `correction.generatedSteps`
		// was declared. Strict early-return inside when absent, so this is a
		// no-op for the vast majority of templates. Coupling with
		// `correction-generator.ts` is intentional and unidirectional.
		const finalInstance = generateCorrection(instance);

		return {
			success: true,
			instance: finalInstance
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
