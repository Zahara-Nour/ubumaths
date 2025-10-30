/**
 * Test system validation schemas
 * Validates test results, sessions, and answers
 */

import { z } from 'zod';
import { uuidSchema } from './common';

// ============================================================================
// QUESTION CATEGORY & CART ITEM SCHEMAS
// ============================================================================

/**
 * Question category schema
 */
const questionCategorySchema = z.object({
	theme: z.string().min(1, 'Theme is required').max(100),
	domain: z.string().min(1, 'Domain is required').max(100),
	subdomain: z.string().max(100).nullable(),
	level: z.number().int().min(1).max(5)
});

/**
 * Cart item schema (category + quantity + delay)
 */
const cartItemSchema = z.object({
	category: questionCategorySchema,
	quantity: z
		.number()
		.int()
		.positive('Quantity must be positive')
		.max(100, 'Maximum 100 questions'),
	delay: z.number().int().positive('Delay must be positive').max(300, 'Maximum 300 seconds delay')
});

// ============================================================================
// QUESTION INSTANCE SCHEMA
// ============================================================================

/**
 * Question instance schema (simplified - validates core structure)
 * Full validation is done by QuestionInstance type at runtime
 */
const questionInstanceSchema = z.object({
	templateId: z.string().uuid().optional().nullable(),
	statement: z.string().min(1, 'Statement is required'),
	answer: z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.array(z.any()),
		z.record(z.string(), z.any())
	]),
	type: z.enum([
		'qcm',
		'input-number',
		'input-text',
		'fraction',
		'drag-drop',
		'matching',
		'sorting'
	]),
	variables: z.record(z.string(), z.any()).optional(),
	choices: z.array(z.string()).optional(),
	metadata: z.record(z.string(), z.any()).optional()
});

// ============================================================================
// ANSWER DATA SCHEMA
// ============================================================================

/**
 * Answer data schema (user's answer to a question)
 * Format varies by question type
 */
const answerDataSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.array(z.any()),
	z.record(z.string(), z.any()),
	z.null()
]);

// ============================================================================
// TEST ANSWER RESULT SCHEMA
// ============================================================================

/**
 * Test answer result schema (individual answer in test results)
 */
const testAnswerResultSchema = z.object({
	index: z.number().int().nonnegative('Index must be non-negative'),
	instance: questionInstanceSchema,
	userAnswer: answerDataSchema.optional(),
	isCorrect: z.boolean(),
	timeSpent: z.number().nonnegative('Time spent must be non-negative').optional(),
	attempts: z.number().int().positive('Attempts must be positive').default(1).optional()
});

// ============================================================================
// TEST RESULT SCHEMA
// ============================================================================

/**
 * Test result schema (complete test results)
 */
const testResultSchema = z.object({
	sessionId: uuidSchema.optional(),
	mode: z.enum(['display', 'interactive', 'course']),
	score: z.number().min(0).max(10, 'Score must be between 0 and 10'),
	scorePercentage: z.number().min(0).max(100, 'Score percentage must be between 0 and 100'),
	totalQuestions: z.number().int().positive('Total questions must be positive'),
	correctAnswers: z.number().int().nonnegative('Correct answers must be non-negative'),
	timeSpent: z.number().nonnegative('Time spent must be non-negative'),
	averageTime: z.number().nonnegative('Average time must be non-negative'),
	answers: z.array(testAnswerResultSchema).max(500, 'Maximum 500 answers'),
	completedAt: z.string().datetime('Invalid completion datetime')
});

// ============================================================================
// SAVE TEST SCHEMA
// ============================================================================

/**
 * Schema for saving test results (POST /api/tests/save)
 * Includes test result, categories, and optional assignment ID
 */
export const saveTestSchema = z
	.object({
		result: testResultSchema,
		categories: z
			.array(cartItemSchema)
			.min(1, 'At least one category required')
			.max(50, 'Maximum 50 categories'),
		assignmentId: uuidSchema.optional()
	})
	.refine(
		(data) => {
			// Validate that answers count matches totalQuestions
			return data.result.answers.length === data.result.totalQuestions;
		},
		{
			message: 'Answers count must match totalQuestions'
		}
	)
	.refine(
		(data) => {
			// Validate that correctAnswers count matches actual correct answers
			const actualCorrect = data.result.answers.filter((a) => a.isCorrect).length;
			return actualCorrect === data.result.correctAnswers;
		},
		{
			message: 'Correct answers count mismatch'
		}
	);

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate save test request body
 */
export function validateSaveTest(data: unknown) {
	return saveTestSchema.safeParse(data);
}

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Save test response schema
 */
export const saveTestResponseSchema = z.object({
	sessionId: uuidSchema
});
