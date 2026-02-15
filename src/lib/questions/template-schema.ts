/**
 * Zod schema for QuestionTemplate — strict structural validation.
 *
 * Mirrors the QuestionTemplate interface from types.ts with .strict() at every
 * object level to reject unknown/misspelled keys.
 *
 * Used by:
 * - QuestionTemplateForm JSON mode (client-side validation)
 * - Server-side API validation (can extend with .min()/.max() business rules)
 */

import { z } from 'zod';

// === Primitives ===

const constraintModeZ = z.enum(['strict', 'warn', 'off']);

const requiredFormZ = z.union([
	z.enum(['product', 'sum', 'fraction', 'power']),
	z.object({ pattern: z.string() }).strict()
]);

const unitZ = z.object({ expected: z.boolean(), required: z.string().optional() }).strict();

const precisionZ = z.discriminatedUnion('type', [
	z.object({ type: z.literal('none') }).strict(),
	z.object({ type: z.literal('decimal'), digits: z.number() }).strict(),
	z.object({ type: z.literal('significant'), digits: z.number() }).strict(),
	z.object({ type: z.literal('magnitude'), digits: z.number() }).strict(),
	z
		.object({
			type: z.literal('tolerance'),
			tolerance: z.number(),
			mode: z.enum(['absolute', 'relative'])
		})
		.strict()
]);

const validationRuleZ = z.discriminatedUnion('type', [
	z.object({ type: z.literal('divisor'), dividend: z.string() }).strict(),
	z.object({ type: z.literal('multiple'), base: z.string() }).strict(),
	z
		.object({
			type: z.literal('range'),
			min: z.string(),
			max: z.string(),
			inclusive: z.boolean().optional()
		})
		.strict(),
	z
		.object({
			type: z.literal('equation_root'),
			equation: z.string(),
			variable: z.string().optional()
		})
		.strict(),
	z.object({ type: z.literal('equivalent'), expression: z.string() }).strict(),
	z
		.object({
			type: z.literal('predicate'),
			predicate: z.enum([
				'isPrime',
				'isComposite',
				'isEven',
				'isOdd',
				'isPositive',
				'isNegative',
				'isInteger'
			])
		})
		.strict(),
	z
		.object({
			type: z.literal('custom'),
			expression: z.string(),
			description: z.string().optional()
		})
		.strict()
]);

const correctChoiceIndexZ = z.union([z.string(), z.array(z.string())]);

// === Nested objects ===

const correctionZ = z
	.object({
		steps: z.array(z.string())
	})
	.strict();

const displayOptionsZ = z
	.object({
		shuffleTerms: z.boolean().optional(),
		shuffleFactors: z.boolean().optional(),
		shuffleTermsAndFactors: z.boolean().optional(),
		shallowShuffleTerms: z.boolean().optional(),
		shallowShuffleFactors: z.boolean().optional(),
		removeNullTerms: z.boolean().optional(),
		removeUnnecessaryBrackets: z.boolean().optional(),
		removeSpaces: z.boolean().optional()
	})
	.strict();

const variableZ = z
	.object({
		name: z.string(),
		expression: z.string(),
		displayOptions: displayOptionsZ.optional()
	})
	.strict();

const choiceZ = z
	.object({
		content: z.string(),
		isCorrect: z.boolean().optional()
	})
	.strict();

const blankDefaultsZ = z
	.object({
		precision: precisionZ.optional(),
		requiredForm: requiredFormZ.optional(),
		unit: unitZ.optional()
	})
	.strict();

const blankZ = z
	.object({
		expectedAnswer: z.string(),
		prefilled: z.string().optional(),
		pool: z.array(z.string()).optional(),
		precision: precisionZ.optional(),
		requiredForm: requiredFormZ.optional(),
		validationRules: z.array(validationRuleZ).optional(),
		unit: unitZ.optional()
	})
	.strict();

const constraintsZ = z
	.object({
		spaces: constraintModeZ.optional(),
		products: constraintModeZ.optional(),
		brackets: constraintModeZ.optional(),
		zeros: constraintModeZ.optional(),
		form: constraintModeZ.optional(),
		allowBracketsInFirstNegativeTerm: z.boolean().optional(),
		nullTerms: constraintModeZ.optional(),
		factorOne: constraintModeZ.optional(),
		factorZero: constraintModeZ.optional(),
		signs: constraintModeZ.optional(),
		reducedFractions: constraintModeZ.optional(),
		unit: constraintModeZ.optional()
	})
	.strict();

const optionsZ = z
	.object({
		allowEquivalent: z.boolean().optional(),
		allowDifferentForms: z.boolean().optional(),
		canonicalForm: z.enum(['fraction', 'decimal', 'scientific']).optional(),
		orderIndependent: z.boolean().optional(),
		validator: z.enum(['checkEquivalence', 'checkAlgebraic', 'checkNumeric']).optional(),
		validatorParams: z.record(z.string(), z.unknown()).optional(),
		constraints: constraintsZ.optional(),
		shuffleChoices: z.boolean().optional()
	})
	.strict();

const sharedZ = z
	.object({
		statement: z.string().optional(),
		variables: z.array(variableZ).optional(),
		correctChoiceIndex: correctChoiceIndexZ.optional(),
		correction: correctionZ.optional().nullable(),
		choices: z.array(choiceZ).optional(),
		validationRules: z.array(validationRuleZ).optional(),
		requiredForm: requiredFormZ.optional(),
		blankDefaults: blankDefaultsZ.optional(),
		answerFormats: z.record(z.string(), z.string()).optional()
	})
	.strict();

const variationZ = z
	.object({
		statement: z.string(),
		variables: z.array(variableZ).optional(),
		correctChoiceIndex: correctChoiceIndexZ.optional(),
		correction: correctionZ.optional().nullable(),
		blanks: z.array(blankZ).optional(),
		blankDefaults: blankDefaultsZ.optional(),
		answerFormats: z.record(z.string(), z.string()).optional(),
		choices: z.array(choiceZ).optional(),
		validationRules: z.array(validationRuleZ).optional(),
		requiredForm: requiredFormZ.optional()
	})
	.strict();

// === QuestionTemplate schema ===

/**
 * Strict Zod schema matching QuestionTemplate (without audit fields: id, created_at, etc.)
 *
 * Every object level uses .strict() to reject unknown/misspelled keys.
 */
export const questionTemplateSchema = z
	.object({
		title: z.string(),
		description: z.string().optional().nullable(),
		shared: sharedZ.optional().nullable(),
		defaultDisplayOptions: displayOptionsZ.optional().nullable(),
		variations: z.array(variationZ),
		exerciseInstruction: z.string().optional().nullable(),
		options: optionsZ.optional().nullable(),
		grades: z.array(z.string()),
		theme: z.string(),
		domain: z.string(),
		subdomain: z.string().optional().nullable(),
		level: z.number(),
		status: z.enum(['draft', 'published']),
		delay: z.number().optional().nullable(),
		multipleAnswers: z.boolean().optional().nullable()
	})
	.strict();
