/**
 * Tests for test system validation schemas
 * Comprehensive testing of test results, sessions, and answers
 */

import { describe, it, expect } from 'vitest';
import { saveTestSchema, saveTestResponseSchema, validateSaveTest } from './tests';

describe('test system validation schemas', () => {
	// ============================================================================
	// SAVE TEST SCHEMA
	// ============================================================================

	describe('saveTestSchema', () => {
		const createValidTestData = () => ({
			result: {
				sessionId: '550e8400-e29b-41d4-a716-446655440000',
				mode: 'interactive' as 'display' | 'interactive' | 'course',
				score: 7.5,
				scorePercentage: 75,
				totalQuestions: 10,
				correctAnswers: 7,
				timeSpent: 600,
				averageTime: 60,
				answers: [
					{
						index: 0,
						instance: {
							templateId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
							statement: 'What is 2 + 2?',
							answer: 4,
							type: 'input-number' as const,
							variables: { a: 2, b: 2 }
						},
						userAnswer: 4,
						isCorrect: true,
						timeSpent: 30,
						attempts: 1
					},
					{
						index: 1,
						instance: {
							statement: 'What is the capital of France?',
							answer: 'Paris',
							type: 'input-text' as const,
							choices: ['Paris', 'London', 'Berlin', 'Madrid']
						},
						userAnswer: 'Paris',
						isCorrect: true,
						timeSpent: 45,
						attempts: 1
					},
					{
						index: 2,
						instance: {
							statement: 'Which is larger: 5 or 3?',
							answer: '5',
							type: 'qcm' as const,
							choices: ['3', '5']
						},
						userAnswer: '5',
						isCorrect: true,
						timeSpent: 20,
						attempts: 1
					},
					{
						index: 3,
						instance: {
							statement: 'Simplify 2/4',
							answer: { numerator: 1, denominator: 2 },
							type: 'fraction' as const
						},
						userAnswer: { numerator: 1, denominator: 2 },
						isCorrect: true,
						timeSpent: 90,
						attempts: 2
					},
					{
						index: 4,
						instance: {
							statement: 'Match the terms',
							answer: ['a-1', 'b-2', 'c-3'],
							type: 'matching' as const
						},
						userAnswer: ['a-1', 'b-2', 'c-3'],
						isCorrect: true,
						timeSpent: 120,
						attempts: 1
					},
					{
						index: 5,
						instance: {
							statement: 'Sort these numbers',
							answer: [1, 2, 3, 4],
							type: 'sorting' as const
						},
						userAnswer: [1, 2, 3, 4],
						isCorrect: true,
						timeSpent: 60,
						attempts: 1
					},
					{
						index: 6,
						instance: {
							statement: 'Drag and drop',
							answer: ['item1', 'item2'],
							type: 'drag-drop' as const
						},
						userAnswer: ['item1', 'item2'],
						isCorrect: true,
						timeSpent: 75,
						attempts: 1
					},
					{
						index: 7,
						instance: {
							statement: 'What is 10 / 2?',
							answer: 5,
							type: 'input-number' as const
						},
						userAnswer: 4, // Wrong answer
						isCorrect: false,
						timeSpent: 40,
						attempts: 1
					},
					{
						index: 8,
						instance: {
							statement: 'Is this true?',
							answer: true,
							type: 'qcm' as const,
							choices: ['true', 'false']
						},
						userAnswer: false, // Wrong answer
						isCorrect: false,
						timeSpent: 25,
						attempts: 1
					},
					{
						index: 9,
						instance: {
							statement: 'Last question',
							answer: 'correct',
							type: 'input-text' as const
						},
						userAnswer: 'wrong', // Wrong answer
						isCorrect: false,
						timeSpent: 95,
						attempts: 3
					}
				],
				completedAt: '2025-01-01T12:00:00.000Z'
			},
			categories: [
				{
					category: {
						theme: 'Algebra',
						domain: 'Equations',
						subdomain: 'Linear',
						level: 1
					},
					quantity: 5,
					delay: 60
				},
				{
					category: {
						theme: 'Arithmétique',
						domain: 'Opérations',
						subdomain: null,
						level: 2
					},
					quantity: 5,
					delay: 90
				}
			],
			assignmentId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
		});

		it('should accept valid test data', () => {
			const data = createValidTestData();
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept all test modes', () => {
			const modes = ['display', 'interactive', 'course'] as const;
			modes.forEach((mode) => {
				const data = createValidTestData();
				data.result.mode = mode as 'display' | 'interactive' | 'course';
				const result = saveTestSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should accept all question types', () => {
			const types = [
				'qcm',
				'input-number',
				'input-text',
				'fraction',
				'drag-drop',
				'matching',
				'sorting'
			] as const;

			types.forEach((type) => {
				const data = createValidTestData();
				data.result.answers[0].instance.type = type;
				const result = saveTestSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should accept test without sessionId', () => {
			const data = createValidTestData();
			delete (data.result as any).sessionId;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept test without assignmentId', () => {
			const data = createValidTestData();
			delete (data as any).assignmentId;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept answer with null userAnswer', () => {
			const data = createValidTestData();
			data.result.answers[0].userAnswer = null as any;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept answer without userAnswer field', () => {
			const data = createValidTestData();
			delete (data.result.answers[0] as any).userAnswer;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept instance without templateId', () => {
			const data = createValidTestData();
			delete data.result.answers[0].instance.templateId;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept instance without variables', () => {
			const data = createValidTestData();
			delete data.result.answers[0].instance.variables;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept instance without choices', () => {
			const data = createValidTestData();
			delete data.result.answers[0].instance.choices;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept category with null subdomain', () => {
			const data = createValidTestData();
			data.categories[0].category.subdomain = null;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject score below 0', () => {
			const data = createValidTestData();
			data.result.score = -1;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject score above 10', () => {
			const data = createValidTestData();
			data.result.score = 11;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject scorePercentage below 0', () => {
			const data = createValidTestData();
			data.result.scorePercentage = -5;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject scorePercentage above 100', () => {
			const data = createValidTestData();
			data.result.scorePercentage = 101;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject zero totalQuestions', () => {
			const data = createValidTestData();
			data.result.totalQuestions = 0;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject negative correctAnswers', () => {
			const data = createValidTestData();
			data.result.correctAnswers = -1;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject negative timeSpent', () => {
			const data = createValidTestData();
			data.result.timeSpent = -10;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject negative averageTime', () => {
			const data = createValidTestData();
			data.result.averageTime = -5;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject too many answers', () => {
			const data = createValidTestData();
			data.result.answers = Array.from({ length: 501 }, (_, i) => ({
				index: i,
				instance: {
					templateId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
					statement: `Question ${i}`,
					answer: 42,
					type: 'input-number' as const,
					variables: {}
				},
				userAnswer: 42,
				isCorrect: true,
				timeSpent: 30,
				attempts: 1
			})) as any;
			data.result.totalQuestions = 501;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject empty statement', () => {
			const data = createValidTestData();
			data.result.answers[0].instance.statement = '';
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid question type', () => {
			const data = createValidTestData();
			// @ts-expect-error Testing invalid type
			data.result.answers[0].instance.type = 'invalid-type';
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject negative index', () => {
			const data = createValidTestData();
			data.result.answers[0].index = -1;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject negative timeSpent in answer', () => {
			const data = createValidTestData();
			data.result.answers[0].timeSpent = -10;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject zero attempts', () => {
			const data = createValidTestData();
			data.result.answers[0].attempts = 0;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject too many categories', () => {
			const data = createValidTestData();
			data.categories = Array.from({ length: 51 }, (_, i) => ({
				category: {
					theme: `Theme ${i}`,
					domain: `Domain ${i}`,
					subdomain: null,
					level: 1
				},
				quantity: 1,
				delay: 60
			}));
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject empty categories array', () => {
			const data = createValidTestData();
			data.categories = [];
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid category level', () => {
			const data = createValidTestData();
			data.categories[0].category.level = 0;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject category level above 5', () => {
			const data = createValidTestData();
			data.categories[0].category.level = 6;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject zero quantity', () => {
			const data = createValidTestData();
			data.categories[0].quantity = 0;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject quantity exceeding max', () => {
			const data = createValidTestData();
			data.categories[0].quantity = 101;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject zero delay', () => {
			const data = createValidTestData();
			data.categories[0].delay = 0;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject delay exceeding max', () => {
			const data = createValidTestData();
			data.categories[0].delay = 301;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject empty theme', () => {
			const data = createValidTestData();
			data.categories[0].category.theme = '';
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject theme exceeding max length', () => {
			const data = createValidTestData();
			data.categories[0].category.theme = 'a'.repeat(101);
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject empty domain', () => {
			const data = createValidTestData();
			data.categories[0].category.domain = '';
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid mode', () => {
			const data = createValidTestData();
			// @ts-expect-error Testing invalid mode
			data.result.mode = 'invalid-mode';
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid sessionId UUID', () => {
			const data = createValidTestData();
			data.result.sessionId = 'not-a-uuid';
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid assignmentId UUID', () => {
			const data = createValidTestData();
			data.assignmentId = 'not-a-uuid';
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid completedAt datetime', () => {
			const data = createValidTestData();
			data.result.completedAt = '2025-01-01'; // Missing time
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject when answers count does not match totalQuestions', () => {
			const data = createValidTestData();
			data.result.totalQuestions = 5; // But we have 10 answers
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Answers count must match totalQuestions');
			}
		});

		it('should reject when correctAnswers count does not match actual correct answers', () => {
			const data = createValidTestData();
			data.result.correctAnswers = 5; // But we have 7 correct answers
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Correct answers count mismatch');
			}
		});

		it('should accept when counts match correctly', () => {
			const data = createValidTestData();
			// Verify counts are correct
			expect(data.result.answers.length).toBe(data.result.totalQuestions);
			const actualCorrect = data.result.answers.filter((a) => a.isCorrect).length;
			expect(actualCorrect).toBe(data.result.correctAnswers);

			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept minimum valid test', () => {
			const data = {
				result: {
					mode: 'display' as const,
					score: 0,
					scorePercentage: 0,
					totalQuestions: 1,
					correctAnswers: 0,
					timeSpent: 0,
					averageTime: 0,
					answers: [
						{
							index: 0,
							instance: {
								statement: 'Q',
								answer: 'A',
								type: 'input-text' as const
							},
							isCorrect: false
						}
					],
					completedAt: '2025-01-01T00:00:00.000Z'
				},
				categories: [
					{
						category: {
							theme: 'T',
							domain: 'D',
							subdomain: null,
							level: 1
						},
						quantity: 1,
						delay: 1
					}
				]
			};

			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept maximum values at boundaries', () => {
			const data = createValidTestData();
			data.result.score = 10;
			data.result.scorePercentage = 100;
			data.categories[0].category.level = 5;
			data.categories[0].quantity = 100;
			data.categories[0].delay = 300;

			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(true);
		});
	});

	// ============================================================================
	// VALIDATION HELPER FUNCTION
	// ============================================================================

	describe('validateSaveTest', () => {
		it('should validate using helper function', () => {
			const data = {
				result: {
					mode: 'interactive',
					score: 8,
					scorePercentage: 80,
					totalQuestions: 1,
					correctAnswers: 1,
					timeSpent: 60,
					averageTime: 60,
					answers: [
						{
							index: 0,
							instance: {
								statement: 'Test',
								answer: 42,
								type: 'input-number'
							},
							userAnswer: 42,
							isCorrect: true
						}
					],
					completedAt: '2025-01-01T12:00:00Z'
				},
				categories: [
					{
						category: {
							theme: 'Math',
							domain: 'Arithmetic',
							subdomain: null,
							level: 1
						},
						quantity: 1,
						delay: 60
					}
				]
			};

			const result = validateSaveTest(data);
			expect(result.success).toBe(true);
		});

		it('should return error for invalid data', () => {
			const data = {
				result: {
					mode: 'invalid'
				}
			};

			const result = validateSaveTest(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// RESPONSE SCHEMAS
	// ============================================================================

	describe('saveTestResponseSchema', () => {
		it('should accept valid response', () => {
			const data = {
				sessionId: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = saveTestResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid sessionId UUID', () => {
			const data = {
				sessionId: 'not-a-uuid'
			};

			const result = saveTestResponseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject missing sessionId', () => {
			const result = saveTestResponseSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});
});
