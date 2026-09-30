/**
 * Tests for test system validation schemas
 * Comprehensive testing of test results, sessions, and answers
 */

import { describe, it, expect } from 'vitest';
import { saveTestSchema, saveTestResponseSchema, validateSaveTest } from '../tests';

// Helper type for tests that need to modify objects
type _Mutable<T> = { -readonly [P in keyof T]: T[P] extends object ? _Mutable<T[P]> : T[P] };

describe('test system validation schemas', () => {
	// ============================================================================
	// SAVE TEST SCHEMA
	// ============================================================================

	describe('saveTestSchema', () => {
		// Forme RÉELLE d'une instance (`generateInstance`) et d'une réponse
		// (`AnswerData` de `QuestionCard`). L'ancien fixture fabriquait `answer`
		// et `type`, que le générateur ne produit plus : il restait vert pendant
		// que la route refusait toute session réelle. Voir aussi
		// `tests-real-instances.test.ts` (instances générées).
		type FixtureInstance = { templateId?: string; statement: string; theme?: string };
		const TEMPLATE_ID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
		const makeAnswer = (index: number, isCorrect: boolean) => ({
			index,
			instance: {
				templateId: TEMPLATE_ID,
				statement: `$$${index}+1$$`,
				theme: 'Entiers'
			} as FixtureInstance,
			userAnswer: {
				value: [String(index + 1)] as string | string[] | number | number[],
				isCorrect,
				timeSpent: 30,
				attempts: 1,
				submittedAt: '2025-01-01T11:59:00.000Z'
			},
			isCorrect,
			timeSpent: 30,
			attempts: 1
		});

		const createValidTestData = () => ({
			result: {
				sessionId: '550e8400-e29b-41d4-a716-446655440000',
				mode: 'interactive' as 'display' | 'interactive' | 'course' | 'flash',
				score: 7,
				scorePercentage: 70,
				totalQuestions: 10,
				correctAnswers: 7,
				timeSpent: 600,
				averageTime: 60,
				// 7 bonnes réponses, 3 fausses
				answers: Array.from({ length: 10 }, (_, i) => makeAnswer(i, i < 7)),
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

		// Forme « Flash-cards » (2026-09-30) : score auto-évalué, jamais une évaluation
		it('should accept flash mode without assignmentId', () => {
			const { assignmentId: _assignmentId, ...data } = createValidTestData();
			data.result.mode = 'flash';
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject flash mode with an assignmentId', () => {
			const data = createValidTestData();
			data.result.mode = 'flash';
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toEqual(['assignmentId']);
			}
		});

		it('should strip unknown instance fields (never stored in test_answers)', () => {
			const data = createValidTestData();
			Object.assign(data.result.answers[0].instance, { answer: 4, type: 'qcm', blanks: [] });
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(Object.keys(result.data.result.answers[0].instance).sort()).toEqual([
					'statement',
					'templateId',
					'theme'
				]);
			}
		});

		it('Q20 : garde la graine de l’instance (archivée avec la réponse)', () => {
			const data = createValidTestData();
			Object.assign(data.result.answers[0].instance, { seed: 123456789 });
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.result.answers[0].instance).toMatchObject({ seed: 123456789 });
			}
		});

		it('Q20 : refuse une graine non entière ou hors bornes', () => {
			for (const seed of [1.5, -1, 2 ** 31]) {
				const data = createValidTestData();
				Object.assign(data.result.answers[0].instance, { seed });
				expect(saveTestSchema.safeParse(data).success).toBe(false);
			}
		});

		it('should accept test without sessionId', () => {
			const data = createValidTestData();
			const { sessionId: _sessionId, ...resultWithoutSessionId } = data.result;
			const testData = { ...data, result: resultWithoutSessionId };
			const result = saveTestSchema.safeParse(testData);
			expect(result.success).toBe(true);
		});

		it('should accept test without assignmentId', () => {
			const data = createValidTestData();
			const { assignmentId: _assignmentId, ...testData } = data;
			const result = saveTestSchema.safeParse(testData);
			expect(result.success).toBe(true);
		});

		it('should accept answer with null userAnswer', () => {
			const data = createValidTestData();
			const answer = data.result.answers[0];
			const modifiedAnswer = { ...answer, userAnswer: null as never };
			const testData = {
				...data,
				result: {
					...data.result,
					answers: [modifiedAnswer, ...data.result.answers.slice(1)]
				}
			};
			const result = saveTestSchema.safeParse(testData);
			expect(result.success).toBe(true);
		});

		it('should accept answer without userAnswer field', () => {
			const data = createValidTestData();
			const { userAnswer: _userAnswer, ...answerWithoutUserAnswer } = data.result.answers[0];
			const testData = {
				...data,
				result: {
					...data.result,
					answers: [answerWithoutUserAnswer, ...data.result.answers.slice(1)]
				}
			};
			const result = saveTestSchema.safeParse(testData);
			expect(result.success).toBe(true);
		});

		it('should reject instance without templateId (the generator always sets it)', () => {
			const data = createValidTestData();
			delete data.result.answers[0].instance.templateId;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should accept instance with only templateId and statement', () => {
			const data = createValidTestData();
			delete data.result.answers[0].instance.theme;
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
			data.result.answers = Array.from({ length: 501 }, (_, i) => makeAnswer(i, true));
			data.result.totalQuestions = 501;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject statement exceeding max length', () => {
			const data = createValidTestData();
			data.result.answers[0].instance.statement = 'x'.repeat(20_001);
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

		it('should accept zero attempts (time expired, TestInteractive)', () => {
			const data = createValidTestData();
			data.result.answers[0].attempts = 0;
			data.result.answers[0].userAnswer.attempts = 0;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject attempts above 100', () => {
			const data = createValidTestData();
			data.result.answers[0].attempts = 101;
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

		it('should accept category level 20 (highest level in production)', () => {
			const data = createValidTestData();
			data.categories[0].category.level = 20;
			const result = saveTestSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject category level above 100', () => {
			const data = createValidTestData();
			data.categories[0].category.level = 101;
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
								templateId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
								statement: 'Q'
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
								templateId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
								statement: 'Test'
							},
							userAnswer: {
								value: ['42'],
								isCorrect: true,
								timeSpent: 12,
								attempts: 1,
								submittedAt: '2025-01-01T11:59:00Z'
							},
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
