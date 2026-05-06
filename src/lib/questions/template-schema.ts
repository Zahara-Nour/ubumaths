/**
 * Zod schema for QuestionTemplate — strict structural validation.
 *
 * Mirrors the QuestionTemplate interface from types.ts with .strict() at every
 * object level to reject unknown/misspelled keys.
 *
 * Building blocks are exported WITHOUT .strict() for reuse by server-side
 * validation schemas (questions.ts, migration-review.ts). The strict versions
 * are used only locally for the questionTemplateSchema (JsonEditor validation).
 *
 * Used by:
 * - QuestionTemplateForm JSON mode (client-side validation)
 * - Server-side API validation (imports building blocks)
 */

import { z } from 'zod';

// ============================================================================
// BUILDING BLOCKS (exported, non-strict)
// ============================================================================

// === Primitives ===

export const constraintModeSchema = z.enum(['strict', 'warn', 'off']);

export const requiredFormSchema = z.union([
	z.enum(['product', 'sum', 'fraction', 'power']),
	z.object({ pattern: z.string() })
]);

export const unitSchema = z.object({ expected: z.boolean(), required: z.string().optional() });

// --- Precision: individual members for strict reuse ---
const precisionNone = z.object({ type: z.literal('none') });
const precisionDecimal = z.object({ type: z.literal('decimal'), digits: z.number() });
const precisionSignificant = z.object({ type: z.literal('significant'), digits: z.number() });
const precisionMagnitude = z.object({ type: z.literal('magnitude'), digits: z.number() });
const precisionTolerance = z.object({
	type: z.literal('tolerance'),
	tolerance: z.number(),
	mode: z.enum(['absolute', 'relative'])
});

export const precisionSchema = z.discriminatedUnion('type', [
	precisionNone,
	precisionDecimal,
	precisionSignificant,
	precisionMagnitude,
	precisionTolerance
]);

// --- Validation rules: individual members for strict reuse ---
const validationRuleDivisor = z.object({ type: z.literal('divisor'), dividend: z.string() });
const validationRuleMultiple = z.object({ type: z.literal('multiple'), base: z.string() });
const validationRuleRange = z.object({
	type: z.literal('range'),
	min: z.string(),
	max: z.string(),
	inclusive: z.boolean().optional()
});
const validationRuleEquationRoot = z.object({
	type: z.literal('equation_root'),
	equation: z.string(),
	variable: z.string().optional()
});
const validationRuleEquivalent = z.object({
	type: z.literal('equivalent'),
	expression: z.string()
});
const validationRulePredicate = z.object({
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
});
const validationRuleCustom = z.object({
	type: z.literal('custom'),
	expression: z.string(),
	description: z.string().optional()
});

export const validationRuleSchema = z.discriminatedUnion('type', [
	validationRuleDivisor,
	validationRuleMultiple,
	validationRuleRange,
	validationRuleEquationRoot,
	validationRuleEquivalent,
	validationRulePredicate,
	validationRuleCustom
]);

export const correctChoiceIndexSchema = z.union([z.string(), z.array(z.string())]);

// === Test Specs ===

export const constraintIdSchema = z.enum([
	'spaces',
	'products',
	'brackets',
	'zeros',
	'form',
	'nullTerms',
	'factorOne',
	'factorZero',
	'signs',
	'reducedFractions',
	'unit'
]);

export const testSpecExpectedSchema = z.object({
	status: z.enum(['correct', 'unoptimal_form', 'bad_form', 'incorrect', 'empty']),
	constraintViolations: z.array(constraintIdSchema).optional()
});

export const testSpecSchema = z.object({
	description: z.string().min(1),
	variationIndex: z.number().int().nonnegative().optional(),
	variables: z.record(z.string(), z.string()),
	answers: z.array(z.string()).optional(),
	selectedChoices: z.array(z.number().int().nonnegative()).optional(),
	expected: testSpecExpectedSchema
});

// === Nested objects ===

// === Mode B — Generated steps ===

const schoolLevelSchema = z.union([
	z.literal('auto'),
	z.enum(['primaire', 'college', 'lycee', 'superieur'])
]);

export const generatedStepsOptionsSchema = z.object({
	schoolLevel: schoolLevelSchema.optional(),
	verbosity: z.enum(['summarized', 'detailed']).optional()
});

const generatedStepsArithmetic = z.object({
	kind: z.literal('arithmetic'),
	expression: z.string().min(1),
	options: generatedStepsOptionsSchema.optional()
});

const generatedStepsLinearEquation = z.object({
	kind: z.literal('linear-equation'),
	equation: z.string().min(1),
	options: generatedStepsOptionsSchema.optional()
});

const generatedStepsQuadraticEquation = z.object({
	kind: z.literal('quadratic-equation'),
	equation: z.string().min(1),
	options: generatedStepsOptionsSchema.optional()
});

const generatedStepsDifferentiate = z.object({
	kind: z.literal('differentiate'),
	expression: z.string().min(1),
	variable: z.string().min(1).optional(),
	options: generatedStepsOptionsSchema.optional()
});

const generatedStepsLinearInequality = z.object({
	kind: z.literal('linear-inequality'),
	inequality: z.string().min(1),
	options: generatedStepsOptionsSchema.optional()
});

export const generatedStepsSchema = z.discriminatedUnion('kind', [
	generatedStepsArithmetic,
	generatedStepsLinearEquation,
	generatedStepsQuadraticEquation,
	generatedStepsDifferentiate,
	generatedStepsLinearInequality
]);

/**
 * FIX: correctionZ only had `steps` (required). The TypeScript QuestionCorrection
 * interface has `feedback` (optional) + `steps` (optional).
 */
export const correctionSchema = z.object({
	feedback: z
		.object({
			correct: z.string().optional(),
			incorrect: z.string().optional(),
			partial: z.string().optional()
		})
		.optional(),
	steps: z.array(z.string()).optional(),
	generatedSteps: generatedStepsSchema.optional()
});

export const displayOptionsSchema = z.object({
	shuffleTerms: z.boolean().optional(),
	shuffleFactors: z.boolean().optional(),
	shuffleTermsAndFactors: z.boolean().optional(),
	shallowShuffleTerms: z.boolean().optional(),
	shallowShuffleFactors: z.boolean().optional(),
	removeNullTerms: z.boolean().optional(),
	removeUnnecessaryBrackets: z.boolean().optional(),
	removeSpaces: z.boolean().optional()
});

export const variableSchema = z.object({
	name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Variable name must be valid identifier'),
	expression: z.string().min(1, 'Expression is required'),
	displayOptions: displayOptionsSchema.optional()
});

export const choiceSchema = z.object({
	content: z.string(),
	isCorrect: z.boolean().optional()
});

export const blankDefaultsSchema = z.object({
	precision: precisionSchema.optional(),
	requiredForm: requiredFormSchema.optional(),
	removeSpaces: z.boolean().optional(),
	unit: unitSchema.optional()
});

export const blankSchema = z.object({
	expectedAnswer: z.string(),
	prefilled: z.string().optional(),
	pool: z.array(z.string()).optional(),
	precision: precisionSchema.optional(),
	requiredForm: requiredFormSchema.optional(),
	removeSpaces: z.boolean().optional(),
	validationRules: z.array(validationRuleSchema).optional(),
	unit: unitSchema.optional()
});

export const constraintsSchema = z.object({
	spaces: constraintModeSchema.optional(),
	products: constraintModeSchema.optional(),
	brackets: constraintModeSchema.optional(),
	zeros: constraintModeSchema.optional(),
	form: constraintModeSchema.optional(),
	allowBracketsInFirstNegativeTerm: z.boolean().optional(),
	nullTerms: constraintModeSchema.optional(),
	factorOne: constraintModeSchema.optional(),
	factorZero: constraintModeSchema.optional(),
	signs: constraintModeSchema.optional(),
	reducedFractions: constraintModeSchema.optional(),
	unit: constraintModeSchema.optional()
});

export const optionsSchema = z.object({
	orderIndependent: z.boolean().optional(),
	constraints: constraintsSchema.optional(),
	shuffleChoices: z.boolean().optional()
});

// ============================================================================
// STRICT VERSIONS (local, for questionTemplateSchema only)
// ============================================================================

const requiredFormStrictZ = z.union([
	z.enum(['product', 'sum', 'fraction', 'power']),
	z.object({ pattern: z.string() }).strict()
]);

const unitStrictZ = unitSchema.strict();

const precisionStrictZ = z.discriminatedUnion('type', [
	precisionNone.strict(),
	precisionDecimal.strict(),
	precisionSignificant.strict(),
	precisionMagnitude.strict(),
	precisionTolerance.strict()
]);

const validationRuleStrictZ = z.discriminatedUnion('type', [
	validationRuleDivisor.strict(),
	validationRuleMultiple.strict(),
	validationRuleRange.strict(),
	validationRuleEquationRoot.strict(),
	validationRuleEquivalent.strict(),
	validationRulePredicate.strict(),
	validationRuleCustom.strict()
]);

const generatedStepsOptionsStrictZ = generatedStepsOptionsSchema.strict();

const generatedStepsArithmeticStrictZ = z
	.object({
		kind: z.literal('arithmetic'),
		expression: z.string().min(1),
		options: generatedStepsOptionsStrictZ.optional()
	})
	.strict();

const generatedStepsLinearEquationStrictZ = z
	.object({
		kind: z.literal('linear-equation'),
		equation: z.string().min(1),
		options: generatedStepsOptionsStrictZ.optional()
	})
	.strict();

const generatedStepsQuadraticEquationStrictZ = z
	.object({
		kind: z.literal('quadratic-equation'),
		equation: z.string().min(1),
		options: generatedStepsOptionsStrictZ.optional()
	})
	.strict();

const generatedStepsDifferentiateStrictZ = z
	.object({
		kind: z.literal('differentiate'),
		expression: z.string().min(1),
		variable: z.string().min(1).optional(),
		options: generatedStepsOptionsStrictZ.optional()
	})
	.strict();

const generatedStepsLinearInequalityStrictZ = z
	.object({
		kind: z.literal('linear-inequality'),
		inequality: z.string().min(1),
		options: generatedStepsOptionsStrictZ.optional()
	})
	.strict();

const generatedStepsStrictZ = z.discriminatedUnion('kind', [
	generatedStepsArithmeticStrictZ,
	generatedStepsLinearEquationStrictZ,
	generatedStepsQuadraticEquationStrictZ,
	generatedStepsDifferentiateStrictZ,
	generatedStepsLinearInequalityStrictZ
]);

const correctionStrictZ = z
	.object({
		feedback: z
			.object({
				correct: z.string().optional(),
				incorrect: z.string().optional(),
				partial: z.string().optional()
			})
			.strict()
			.optional(),
		steps: z.array(z.string()).optional(),
		generatedSteps: generatedStepsStrictZ.optional()
	})
	.strict();

const displayOptionsStrictZ = displayOptionsSchema.strict();

const variableStrictZ = z
	.object({
		name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Variable name must be valid identifier'),
		expression: z.string().min(1, 'Expression is required'),
		displayOptions: displayOptionsStrictZ.optional()
	})
	.strict();

const choiceStrictZ = choiceSchema.strict();

const blankDefaultsStrictZ = z
	.object({
		precision: precisionStrictZ.optional(),
		requiredForm: requiredFormStrictZ.optional(),
		removeSpaces: z.boolean().optional(),
		unit: unitStrictZ.optional()
	})
	.strict();

const blankStrictZ = z
	.object({
		expectedAnswer: z.string(),
		prefilled: z.string().optional(),
		pool: z.array(z.string()).optional(),
		precision: precisionStrictZ.optional(),
		requiredForm: requiredFormStrictZ.optional(),
		removeSpaces: z.boolean().optional(),
		validationRules: z.array(validationRuleStrictZ).optional(),
		unit: unitStrictZ.optional()
	})
	.strict();

const constraintsStrictZ = constraintsSchema.strict();

const optionsStrictZ = z
	.object({
		orderIndependent: z.boolean().optional(),
		constraints: constraintsStrictZ.optional(),
		shuffleChoices: z.boolean().optional()
	})
	.strict();

const sharedStrictZ = z
	.object({
		statement: z.string().optional(),
		variables: z.array(variableStrictZ).optional(),
		correctChoiceIndex: correctChoiceIndexSchema.optional(),
		correction: correctionStrictZ.optional().nullable(),
		choices: z.array(choiceStrictZ).optional(),
		validationRules: z.array(validationRuleStrictZ).optional(),
		requiredForm: requiredFormStrictZ.optional(),
		blankDefaults: blankDefaultsStrictZ.optional(),
		answerFormats: z.record(z.string(), z.string()).optional(),
		conditions: z.array(z.string()).optional()
	})
	.strict();

const variationStrictZ = z
	.object({
		statement: z.string().optional(),
		variables: z.array(variableStrictZ).optional(),
		correctChoiceIndex: correctChoiceIndexSchema.optional(),
		correction: correctionStrictZ.optional().nullable(),
		blanks: z.array(blankStrictZ).optional(),
		blankDefaults: blankDefaultsStrictZ.optional(),
		answerFormats: z.record(z.string(), z.string()).optional(),
		choices: z.array(choiceStrictZ).optional(),
		validationRules: z.array(validationRuleStrictZ).optional(),
		requiredForm: requiredFormStrictZ.optional(),
		conditions: z.array(z.string()).optional()
	})
	.strict();

// ============================================================================
// QuestionTemplate schema (strict — for JsonEditor validation)
// ============================================================================

/**
 * Strict Zod schema matching QuestionTemplate (without audit fields: id, created_at, etc.)
 *
 * Every object level uses .strict() to reject unknown/misspelled keys.
 */
export const questionTemplateSchema = z
	.object({
		title: z.string(),
		description: z.string().optional().nullable(),
		shared: sharedStrictZ.optional().nullable(),
		defaultDisplayOptions: displayOptionsStrictZ.optional().nullable(),
		variations: z.array(variationStrictZ),
		exerciseInstruction: z.string().optional().nullable(),
		options: optionsStrictZ.optional().nullable(),
		grades: z.array(z.string()),
		theme: z.string(),
		domain: z.string(),
		subdomain: z.string().optional().nullable(),
		level: z.number(),
		status: z.enum(['draft', 'published']),
		delay: z.number().optional().nullable(),
		multipleAnswers: z.boolean().optional().nullable(),
		testSpecs: z.array(testSpecSchema).optional().nullable()
	})
	.strict()
	.refine(
		(data) => {
			const hasSharedStatement = data.shared?.statement && data.shared.statement.trim().length > 0;
			return data.variations.every(
				(v) => (v.statement && v.statement.trim().length > 0) || hasSharedStatement
			);
		},
		{
			message:
				'Chaque variation doit avoir un énoncé, ou un énoncé partagé doit être défini dans shared',
			path: ['variations']
		}
	);
