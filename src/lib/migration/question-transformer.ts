/**
 * Question Transformer - TinyMath to UbuMaths v2
 * ===============================================
 *
 * Comprehensive transformer for converting old TinyMath QuestionBase objects
 * to new UbuMaths v2 QuestionTemplate objects as part of Phase 1.4 of the
 * migration project.
 *
 * Features:
 * - Automatic question type detection
 * - Variable syntax conversion
 * - Answer format transformation
 * - Validation option mapping
 * - Comprehensive error handling
 * - Warning generation for manual review items
 *
 * @module migration/question-transformer
 */

import type {
	QuestionBase,
	OldGrade,
	Choice,
	CorrectionDetail,
	Variables,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	VariableName
} from './old-question-types';

import type {
	QuestionTemplate,
	QuestionType,
	QuestionVariation,
	QuestionVariable,
	ContentField,
	GradeLevel,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	PrecisionType,
	AlgebraicTransformType
} from '$lib/questions/types';

import {
	hasChoices,
	hasMultipleAnswers,
	hasFillInBlanks,
	hasAnswerFields,
	hasImages,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	hasVariables,
	hasTestAnswers,
	getVariationCount,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	detectQuestionType as detectOldQuestionType
} from './old-question-types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { convertTinyCASToNew, type ConversionResult } from './syntax-converter';

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Result of a question transformation
 */
export interface TransformResult {
	/** Whether transformation succeeded */
	success: boolean;

	/** Transformed template if successful */
	template?: QuestionTemplate;

	/** List of warnings about items needing review */
	warnings?: string[];

	/** List of errors that prevented transformation */
	errors?: string[];

	/** Statistics about the transformation */
	stats?: TransformStats;
}

/**
 * Statistics about a transformation
 */
export interface TransformStats {
	/** Number of variations created */
	variations: number;

	/** Number of variables converted */
	variables: number;

	/** Number of syntax conversions performed */
	syntaxConversions: number;

	/** Number of validation options mapped */
	optionsMapped: number;

	/** Question type detected */
	detectedType: string;

	/** Whether images were skipped */
	hasImages: boolean;

	/** Whether custom validation was detected */
	hasCustomValidation: boolean;
}

// ============================================================================
// GRADE MAPPING
// ============================================================================

/**
 * Map old grade format to new format
 */
function mapGrade(oldGrade: OldGrade): GradeLevel {
	const gradeMap: Record<OldGrade, GradeLevel> = {
		CP: 'CP',
		CE1: 'CE1',
		CE2: 'CE2',
		CM1: 'CM1',
		CM2: 'CM2',
		'6': '6', // Note: old system used '6', new uses '6'
		'5': '5',
		'4': '4',
		'3': '3',
		'2': '2',
		SPE_1: 'SPE_1',
		SPE_T: 'SPE_T',
		T_EXP: 'T_EXP',
		T_COMP: 'T_COMP',
		STMG: 'STMG'
	};

	return gradeMap[oldGrade] || 'CM1'; // Default to CM1 if unknown
}

// ============================================================================
// QUESTION TYPE DETECTION
// ============================================================================

/**
 * Detect new question type from old question structure
 */
function detectQuestionType(oldQuestion: QuestionBase): QuestionType {
	// Multiple choice with multiple answers
	if (hasMultipleAnswers(oldQuestion)) {
		return 'multiple_choice';
	}

	// Single choice
	if (hasChoices(oldQuestion)) {
		return 'multiple_choice';
	}

	// Fill in blanks (expressions with ?)
	if (hasFillInBlanks(oldQuestion)) {
		return 'fill_in_blanks';
	}

	// Decimal result type
	if (oldQuestion['result-type'] === 'decimal') {
		return 'numerical_decimal';
	}

	// Has custom answer fields - usually means specific format required
	if (hasAnswerFields(oldQuestion)) {
		// Check if answer field suggests algebraic transformation
		const answerField = oldQuestion.answerFields?.[0] || '';
		if (answerField.includes('factoriser') || answerField.includes('développer')) {
			return 'algebraic_transform';
		}
		return 'numerical_exact';
	}

	// Default to numerical exact
	return 'numerical_exact';
}

// ============================================================================
// VARIABLE CONVERSION
// ============================================================================

/**
 * Convert old variable definitions to new format
 */
function convertVariables(
	oldVars: Variables | undefined,
	warnings: string[]
): QuestionVariable[] | undefined {
	if (!oldVars) return undefined;

	const variables: QuestionVariable[] = [];

	for (const [varName, expression] of Object.entries(oldVars)) {
		// Remove & prefix from variable name
		const name = varName.substring(1);

		// Convert TinyCAS syntax to new syntax
		const conversionResult = convertTinyCASToNew(expression);

		if (!conversionResult.success) {
			warnings.push(
				`Failed to convert variable ${varName}: ${conversionResult.errors?.join(', ')}`
			);
			// Use original expression as fallback
			variables.push({
				name,
				expression
			});
		} else {
			if (conversionResult.warnings) {
				warnings.push(...conversionResult.warnings.map((w) => `Variable ${varName}: ${w}`));
			}

			variables.push({
				name,
				expression: conversionResult.converted || expression
			});
		}
	}

	return variables.length > 0 ? variables : undefined;
}

// ============================================================================
// STATEMENT CONVERSION
// ============================================================================

/**
 * Convert statement and expression to ContentField array
 */
function convertStatement(
	enonce: string | undefined,
	expression: string | undefined,
	warnings: string[]
): ContentField[] {
	const fields: ContentField[] = [];

	// Process enonce (statement text)
	if (enonce) {
		const conversionResult = convertTinyCASToNew(enonce);

		if (!conversionResult.success) {
			warnings.push(`Failed to convert statement: ${conversionResult.errors?.join(', ')}`);
			fields.push({ type: 'text', content: enonce });
		} else {
			if (conversionResult.warnings) {
				warnings.push(...conversionResult.warnings.map((w) => `Statement: ${w}`));
			}
			fields.push({ type: 'text', content: conversionResult.converted || enonce });
		}
	}

	// Process expression (mathematical content)
	if (expression) {
		const conversionResult = convertTinyCASToNew(expression);

		if (!conversionResult.success) {
			warnings.push(`Failed to convert expression: ${conversionResult.errors?.join(', ')}`);
			// Wrap expression in LaTeX delimiters if not already
			const content = expression.includes('$$') ? expression : `$$${expression}$$`;
			fields.push({ type: 'text', content });
		} else {
			if (conversionResult.warnings) {
				warnings.push(...conversionResult.warnings.map((w) => `Expression: ${w}`));
			}
			const converted = conversionResult.converted || expression;
			// Wrap in LaTeX delimiters if not already
			const content = converted.includes('$$') ? converted : `$$${converted}$$`;
			fields.push({ type: 'text', content });
		}
	}

	// Fallback if nothing was provided
	if (fields.length === 0) {
		fields.push({ type: 'text', content: 'Question content missing' });
		warnings.push('No statement or expression provided');
	}

	return fields;
}

// ============================================================================
// ANSWER CONVERSION
// ============================================================================

/**
 * Convert answer(s) to new format
 */
function convertAnswer(
	solutions: (string | number)[] | undefined,
	questionType: QuestionType,
	warnings: string[]
): string | string[] {
	if (!solutions || solutions.length === 0) {
		warnings.push('No solutions provided');
		return questionType === 'multiple_choice' ? ['0'] : '';
	}

	// For multiple choice, solutions are indices
	if (questionType === 'multiple_choice') {
		return solutions.map((s) => String(s));
	}

	// For other types, convert the expression syntax
	const answer = String(solutions[0]);
	const conversionResult = convertTinyCASToNew(answer);

	if (!conversionResult.success) {
		warnings.push(`Failed to convert answer: ${conversionResult.errors?.join(', ')}`);
		return answer;
	}

	if (conversionResult.warnings) {
		warnings.push(...conversionResult.warnings.map((w) => `Answer: ${w}`));
	}

	return conversionResult.converted || answer;
}

// ============================================================================
// CHOICES CONVERSION
// ============================================================================

/**
 * Convert choices for multiple choice questions
 */
function convertChoices(
	choices: Choice[] | undefined,
	correctIndices: (string | number)[] | undefined,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	warnings: string[]
): QuestionVariation['choices'] {
	if (!choices || choices.length === 0) {
		return undefined;
	}

	const correctSet = new Set(
		(correctIndices || []).map((idx) => (typeof idx === 'string' ? parseInt(idx, 10) : idx))
	);

	return choices.map((choice, index) => {
		const contentField: ContentField = choice.text
			? { type: 'text', content: convertTinyCASToNew(choice.text).converted || choice.text }
			: choice.image
				? { type: 'image', content: choice.image, alt: `Choice ${index + 1}` }
				: { type: 'text', content: `Choice ${index + 1}` };

		return {
			content: contentField,
			isCorrect: correctSet.has(index)
		};
	});
}

// ============================================================================
// CORRECTION CONVERSION
// ============================================================================

/**
 * Convert correction details to ContentField array
 */
function convertCorrection(
	correctionDetails: CorrectionDetail[] | undefined,
	warnings: string[]
): ContentField[] | undefined {
	if (!correctionDetails || correctionDetails.length === 0) {
		return undefined;
	}

	return correctionDetails.map((detail) => {
		const conversionResult = convertTinyCASToNew(detail.text);

		if (!conversionResult.success) {
			warnings.push(`Failed to convert correction: ${conversionResult.errors?.join(', ')}`);
		}

		return {
			type: 'text' as const,
			content: conversionResult.converted || detail.text
		};
	});
}

// ============================================================================
// OPTIONS CONVERSION
// ============================================================================

/**
 * Convert old validation options to new format
 */
function convertOptions(
	oldOptions: string[] | undefined,
	warnings: string[]
): QuestionTemplate['options'] | undefined {
	if (!oldOptions || oldOptions.length === 0) {
		return undefined;
	}

	const options: QuestionTemplate['options'] = {};
	let mappedCount = 0;

	for (const option of oldOptions) {
		switch (option) {
			// Fraction requirements
			case 'require-reduced-fractions':
				options.canonicalForm = 'fraction';
				options.allowDifferentForms = false;
				mappedCount++;
				break;
			case 'no-penalty-for-non-reduced-fractions':
				options.allowDifferentForms = true;
				mappedCount++;
				break;

			// Bracket handling
			case 'no-penalty-for-extraneous-brackets':
			case 'no-penalty-for-extraneous-brackets-in-first-negative-term':
				options.allowDifferentForms = true;
				mappedCount++;
				break;

			// Algebraic form requirements
			case 'require-no-extraneaous-zeros':
			case 'require-no-extraneaous-signs':
			case 'require-no-factor-one':
			case 'require-no-factor-zero':
			case 'require-no-null-terms':
				options.allowEquivalent = false;
				mappedCount++;
				break;

			// Solution order
			case 'solutions-order-not-important':
				options.allowDifferentForms = true;
				mappedCount++;
				break;

			// Complex validators
			case 'require-implicit-products':
			case 'disallow-terms-permutation':
			case 'disallow-factors-permutation':
				options.validator = 'checkAlgebraic';
				if (!options.validatorParams) {
					options.validatorParams = {};
				}
				options.validatorParams[option] = true;
				mappedCount++;
				break;

			default:
				warnings.push(`Unknown option: ${option} - needs manual review`);
		}
	}

	return mappedCount > 0 ? options : undefined;
}

// ============================================================================
// CATEGORY ASSIGNMENT
// ============================================================================

/**
 * Assign category based on old question structure
 */
function assignCategory(oldQuestion: QuestionBase): {
	theme: string;
	domain: string;
	subdomain?: string;
	level: number;
} {
	// For Phase 1, use simple defaults based on grade and description
	// Later phases can implement more sophisticated extraction

	const description = oldQuestion.description.toLowerCase();

	// Try to detect theme from description
	let theme = 'Nombres';
	let domain = 'Arithmétique';
	let subdomain: string | undefined;

	if (description.includes('fraction')) {
		theme = 'Nombres';
		domain = 'Fractions';
	} else if (description.includes('équation') || description.includes('equation')) {
		theme = 'Algèbre';
		domain = 'Équations';
	} else if (
		description.includes('géométr') ||
		description.includes('angle') ||
		description.includes('triangle')
	) {
		theme = 'Géométrie';
		domain = 'Figures planes';
	} else if (description.includes('fonction')) {
		theme = 'Fonctions';
		domain = 'Généralités';
	} else if (description.includes('probabilité') || description.includes('statistique')) {
		theme = 'Probabilités et statistiques';
		domain = 'Probabilités';
	} else if (description.includes('addition') || description.includes('soustraction')) {
		theme = 'Nombres';
		domain = 'Opérations';
		subdomain = description.includes('addition') ? 'Addition' : 'Soustraction';
	} else if (description.includes('multiplication') || description.includes('division')) {
		theme = 'Nombres';
		domain = 'Opérations';
		subdomain = description.includes('multiplication') ? 'Multiplication' : 'Division';
	}

	// Assign level based on grade
	const gradeLevel = oldQuestion.grade;
	let level = 1;

	if (['CP', 'CE1'].includes(gradeLevel)) {
		level = 1;
	} else if (['CE2', 'CM1', 'CM2'].includes(gradeLevel)) {
		level = 2;
	} else if (['6', '5'].includes(gradeLevel)) {
		level = 3;
	} else if (['4', '3'].includes(gradeLevel)) {
		level = 4;
	} else if (['2', 'SPE_1', 'SPE_T'].includes(gradeLevel)) {
		level = 5;
	} else {
		level = 6;
	}

	return { theme, domain, subdomain, level };
}

// ============================================================================
// VARIATION CREATION
// ============================================================================

/**
 * Create variations from old question structure
 */
function createVariations(
	oldQuestion: QuestionBase,
	questionType: QuestionType,
	warnings: string[],
	stats: TransformStats
): QuestionVariation[] {
	const variationCount = getVariationCount(oldQuestion);
	const variations: QuestionVariation[] = [];

	stats.variations = variationCount;

	for (let i = 0; i < variationCount; i++) {
		// Get data for this variation (arrays indexed by variation)
		const enonce = oldQuestion.enounces?.[i] || oldQuestion.enounces?.[0];
		const expression = oldQuestion.expressions?.[i] || oldQuestion.expressions?.[0];
		const variables = oldQuestion.variabless?.[i] || oldQuestion.variabless?.[0];
		const solutions = oldQuestion.solutionss?.[i] || oldQuestion.solutionss?.[0];
		const choices = oldQuestion.choicess?.[i] || oldQuestion.choicess?.[0];
		const correctionDetails =
			oldQuestion.correctionDetailss?.[i] || oldQuestion.correctionDetailss?.[0];
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const answerField = oldQuestion.answerFields?.[i] || oldQuestion.answerFields?.[0];
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const prefilled = oldQuestion.prefilleds?.[i] || oldQuestion.prefilleds?.[0];

		// Convert statement
		const statement = convertStatement(enonce, expression, warnings);

		// Convert variables
		const convertedVars = convertVariables(variables, warnings);
		if (convertedVars) {
			stats.variables += convertedVars.length;
		}

		// Convert answer
		const answer = convertAnswer(solutions, questionType, warnings);

		// Convert correction
		const correction = convertCorrection(correctionDetails, warnings);

		// Create variation
		const variation: QuestionVariation = {
			statement,
			answer
		};

		// Add optional fields
		if (convertedVars && convertedVars.length > 0) {
			variation.variables = convertedVars;
		}

		if (correction) {
			variation.correction = correction;
		}

		// Handle type-specific fields
		if (questionType === 'multiple_choice' && choices) {
			variation.choices = convertChoices(choices, solutions, warnings);
		}

		if (questionType === 'fill_in_blanks' && expression) {
			// Extract blanks from expression with ?
			const blanks = extractBlanks(expression, solutions, warnings);
			if (blanks && blanks.length > 0) {
				variation.blanks = blanks;
			}
		}

		variations.push(variation);
	}

	return variations;
}

/**
 * Extract blank positions and answers from expression with ?
 */
function extractBlanks(
	expression: string,
	solutions: (string | number)[] | undefined,
	warnings: string[]
): QuestionVariation['blanks'] {
	const blanks: NonNullable<QuestionVariation['blanks']> = [];

	// Count ? marks in expression
	const questionMarks = (expression.match(/\?/g) || []).length;

	if (questionMarks === 0) {
		warnings.push('Fill-in-blanks detected but no ? marks found in expression');
		return undefined;
	}

	// Each ? corresponds to a solution
	for (let i = 0; i < questionMarks; i++) {
		const answer = solutions?.[i];
		if (answer !== undefined) {
			const conversionResult = convertTinyCASToNew(String(answer));
			blanks.push({
				position: i,
				expectedAnswer: conversionResult.converted || String(answer)
			});
		} else {
			warnings.push(`Missing solution for blank at position ${i}`);
			blanks.push({
				position: i,
				expectedAnswer: ''
			});
		}
	}

	return blanks.length > 0 ? blanks : undefined;
}

// ============================================================================
// MAIN TRANSFORMER
// ============================================================================

/**
 * Transform a single old question to new format
 */
export function transformQuestion(
	oldQuestion: QuestionBase,
	questionIndex: number,
	options?: {
		skipImages?: boolean;
		skipCustomValidation?: boolean;
	}
): TransformResult {
	const warnings: string[] = [];
	const errors: string[] = [];
	const stats: TransformStats = {
		variations: 0,
		variables: 0,
		syntaxConversions: 0,
		optionsMapped: 0,
		detectedType: '',
		hasImages: false,
		hasCustomValidation: false
	};

	try {
		// Check for unsupported features
		if (hasImages(oldQuestion)) {
			stats.hasImages = true;
			if (options?.skipImages) {
				errors.push('Question contains images - skipping for Phase 1');
				return { success: false, errors, stats };
			} else {
				warnings.push('Question contains images - will need manual review');
			}
		}

		if (hasTestAnswers(oldQuestion)) {
			stats.hasCustomValidation = true;
			if (options?.skipCustomValidation) {
				errors.push('Question has custom validation - skipping for Phase 1');
				return { success: false, errors, stats };
			} else {
				warnings.push(
					'Question has custom validation (testAnswers) - needs Phase 4 implementation'
				);
			}
		}

		// Detect question type
		const questionType = detectQuestionType(oldQuestion);
		stats.detectedType = questionType;

		// Create variations
		const variations = createVariations(oldQuestion, questionType, warnings, stats);

		if (variations.length === 0) {
			errors.push('No variations could be created');
			return { success: false, errors, warnings, stats };
		}

		// Convert options
		const convertedOptions = convertOptions(oldQuestion.options, warnings);
		if (convertedOptions) {
			stats.optionsMapped = Object.keys(convertedOptions).length;
		}

		// Assign category
		const category = assignCategory(oldQuestion);

		// Determine if algebraic transform type is needed
		let transformType: AlgebraicTransformType | undefined;
		if (questionType === 'algebraic_transform') {
			const description = oldQuestion.description.toLowerCase();
			if (description.includes('factoriser')) {
				transformType = 'factor';
			} else if (description.includes('développer')) {
				transformType = 'expand';
			} else if (description.includes('simplifier')) {
				transformType = 'simplify';
			} else if (description.includes('résoudre') || description.includes('resoudre')) {
				transformType = 'solve';
			}
		}

		// Create the template
		const template: QuestionTemplate = {
			id: '', // Will be assigned during import
			type: questionType,
			title: oldQuestion.description,
			description: oldQuestion.subdescription,
			variations,
			exerciseInstruction: oldQuestion.help,
			options: convertedOptions,
			grades: [mapGrade(oldQuestion.grade)],
			...category,
			status: 'draft', // Import as draft for review
			multipleAnswers: oldQuestion.multipleAnswers
		};

		// Add optional fields
		if (oldQuestion.defaultDelay > 0) {
			template.delay = oldQuestion.defaultDelay;
		}

		if (transformType) {
			template.transformType = transformType;
		}

		// Add precision for decimal questions
		if (questionType === 'numerical_decimal') {
			template.precision = { type: 'decimal', digits: 2 }; // Default to 2 decimal places
			warnings.push('Decimal precision set to 2 places by default - verify if correct');
		}

		return {
			success: true,
			template,
			warnings: warnings.length > 0 ? warnings : undefined,
			stats
		};
	} catch (error) {
		errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
		return {
			success: false,
			errors,
			warnings: warnings.length > 0 ? warnings : undefined,
			stats
		};
	}
}

// ============================================================================
// BATCH TRANSFORMATION
// ============================================================================

/**
 * Transform multiple questions in batch
 */
export function transformQuestionBatch(
	questions: QuestionBase[],
	options?: {
		skipImages?: boolean;
		skipCustomValidation?: boolean;
		onProgress?: (current: number, total: number) => void;
	}
): {
	results: TransformResult[];
	summary: {
		total: number;
		successful: number;
		failed: number;
		warnings: number;
		skippedImages: number;
		skippedCustomValidation: number;
	};
} {
	const results: TransformResult[] = [];
	const summary = {
		total: questions.length,
		successful: 0,
		failed: 0,
		warnings: 0,
		skippedImages: 0,
		skippedCustomValidation: 0
	};

	for (let i = 0; i < questions.length; i++) {
		// Report progress
		if (options?.onProgress) {
			options.onProgress(i + 1, questions.length);
		}

		// Transform question
		const result = transformQuestion(questions[i], i, {
			skipImages: options?.skipImages,
			skipCustomValidation: options?.skipCustomValidation
		});

		results.push(result);

		// Update summary
		if (result.success) {
			summary.successful++;
			if (result.warnings && result.warnings.length > 0) {
				summary.warnings++;
			}
		} else {
			summary.failed++;

			// Check why it failed
			if (result.stats?.hasImages) {
				summary.skippedImages++;
			}
			if (result.stats?.hasCustomValidation) {
				summary.skippedCustomValidation++;
			}
		}
	}

	return { results, summary };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a transformed template
 */
export function validateTransformedTemplate(template: QuestionTemplate): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Check required fields
	if (!template.type) {
		errors.push('Missing question type');
	}

	if (!template.title) {
		errors.push('Missing title');
	}

	if (!template.variations || template.variations.length === 0) {
		errors.push('No variations provided');
	}

	if (!template.grades || template.grades.length === 0) {
		errors.push('No grades specified');
	}

	if (!template.theme) {
		errors.push('Missing theme');
	}

	if (!template.domain) {
		errors.push('Missing domain');
	}

	if (typeof template.level !== 'number' || template.level < 1) {
		errors.push('Invalid level');
	}

	if (!template.status) {
		errors.push('Missing status');
	}

	// Validate each variation
	template.variations.forEach((variation, index) => {
		if (!variation.statement || variation.statement.length === 0) {
			errors.push(`Variation ${index}: missing statement`);
		}

		if (variation.answer === undefined || variation.answer === null) {
			errors.push(`Variation ${index}: missing answer`);
		}

		// Type-specific validation
		if (template.type === 'multiple_choice' && !variation.choices) {
			errors.push(`Variation ${index}: multiple choice question missing choices`);
		}

		if (template.type === 'fill_in_blanks' && !variation.blanks) {
			errors.push(`Variation ${index}: fill-in-blanks question missing blanks`);
		}
	});

	return {
		valid: errors.length === 0,
		errors
	};
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
	transformQuestion,
	transformQuestionBatch,
	validateTransformedTemplate
};
