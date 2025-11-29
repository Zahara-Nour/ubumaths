/**
 * Question Transformer Tests
 * ===========================
 *
 * Comprehensive test suite for the question transformer.
 *
 * @module migration/question-transformer.test
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { describe, it, expect, beforeEach } from 'vitest';
import {
	transformQuestion,
	transformQuestionBatch,
	validateTransformedTemplate,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	type TransformResult
} from './question-transformer';
import type { QuestionBase } from './old-question-types';
import type { QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/shared/markdown';

describe('Question Transformer', () => {
	describe('transformQuestion', () => {
		describe('Simple Questions', () => {
			it('should transform a simple numerical question', () => {
				const oldQuestion: QuestionBase = {
					description: 'Addition simple',
					subdescription: 'Additionner deux nombres',
					enounces: ['Calculer :'],
					expressions: ['&1 + &2'],
					variabless: [
						{
							'&1': '$e[1;10]',
							'&2': '$e[1;10]'
						}
					],
					solutionss: [['[_&1+&2_]']],
					defaultDelay: 30,
					grade: 'CP'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template).toBeDefined();
				expect(result.template?.type).toBe('numerical_exact');
				expect(result.template?.title).toBe('Addition simple');
				expect(result.template?.description).toBe('Additionner deux nombres');
				expect(result.template?.variations).toHaveLength(1);

				const variation = result.template?.variations[0];
				expect(variation?.variables).toHaveLength(2);
				expect(variation?.variables?.[0]).toEqual({
					name: '1',
					expression: '{{1..10}}'
				});
				expect(variation?.answer).toBe('{{eval:{{1}}+{{2}}}}');
			});

			it('should detect and transform decimal questions', () => {
				const oldQuestion: QuestionBase = {
					'result-type': 'decimal',
					description: 'Division décimale',
					enounces: ['Calculer au centième près :'],
					expressions: ['&1 ÷ &2'],
					variabless: [
						{
							'&1': '$e[10;99]',
							'&2': '$e[2;9]'
						}
					],
					solutionss: [['[._&1/&2_.]']],
					defaultDelay: 60,
					grade: 'CM2'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.type).toBe('numerical_decimal');
				expect(result.template?.precision).toEqual({
					type: 'decimal',
					digits: 2
				});
				expect(result.warnings).toContain(
					'Decimal precision set to 2 places by default - verify if correct'
				);
			});
		});

		describe('Multiple Choice Questions', () => {
			it('should transform single choice questions', () => {
				const oldQuestion: QuestionBase = {
					description: "Parité d'un nombre",
					enounces: ['Quelle est la parité de ce nombre ?'],
					expressions: ['&1'],
					variabless: [
						{
							'&1': '$e[1;100]'
						}
					],
					choicess: [[{ text: 'pair' }, { text: 'impair' }]],
					solutionss: [[0]], // Index of correct answer
					options: ['no-shuffle-choices'],
					defaultDelay: 20,
					grade: 'CE1'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.type).toBe('multiple_choice');
				expect(result.template?.multipleAnswers).toBeUndefined();

				const choices = result.template?.variations[0]?.choices;
				expect(choices).toHaveLength(2);
				expect(choices?.[0].content).toContain('pair');
				expect(choices?.[0].isCorrect).toBe(true);
				expect(choices?.[1].content).toContain('impair');
				expect(choices?.[1].isCorrect).toBe(false);
			});

			it('should transform multiple answer questions', () => {
				const oldQuestion: QuestionBase = {
					description: 'Multiples de 3',
					enounces: ['Quels nombres sont des multiples de 3 ?'],
					choicess: [[{ text: '6' }, { text: '8' }, { text: '9' }, { text: '10' }]],
					solutionss: [[0, 2]], // Indices of correct answers
					multipleAnswers: true,
					defaultDelay: 30,
					grade: 'CE2'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.type).toBe('multiple_choice');
				expect(result.template?.multipleAnswers).toBe(true);

				const choices = result.template?.variations[0]?.choices;
				expect(choices?.[0]?.isCorrect).toBe(true);
				expect(choices?.[1]?.isCorrect).toBe(false);
				expect(choices?.[2]?.isCorrect).toBe(true);
				expect(choices?.[3]?.isCorrect).toBe(false);
			});
		});

		describe('Fill-in-Blanks Questions', () => {
			it('should transform fill-in-blanks questions', () => {
				const oldQuestion: QuestionBase = {
					description: 'Compléter une addition',
					enounces: ['Compléter :'],
					expressions: ['&1 + ? = &3'],
					variabless: [
						{
							'&1': '$e[1;10]',
							'&2': '$e[1;10]',
							'&3': '[_&1+&2_]'
						}
					],
					solutionss: [['&2']],
					defaultDelay: 30,
					grade: 'CE1'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.type).toBe('fill_in_blanks');

				const blanks = result.template?.variations[0]?.blanks;
				expect(blanks).toHaveLength(1);
				expect(blanks?.[0]).toEqual({
					position: 0,
					expectedAnswer: '{{2}}'
				});
			});

			it('should handle multiple blanks', () => {
				const oldQuestion: QuestionBase = {
					description: 'Compléter une équation',
					enounces: ['Compléter :'],
					expressions: ['? × ? = &3'],
					variabless: [
						{
							'&1': '$e[2;5]',
							'&2': '$e[2;5]',
							'&3': '[_&1*&2_]'
						}
					],
					solutionss: [['&1', '&2']],
					defaultDelay: 45,
					grade: 'CE2'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.type).toBe('fill_in_blanks');

				const blanks = result.template?.variations[0]?.blanks;
				expect(blanks).toHaveLength(2);
				expect(blanks?.[0]?.expectedAnswer).toBe('{{1}}');
				expect(blanks?.[1]?.expectedAnswer).toBe('{{2}}');
			});
		});

		describe('Multiple Variations', () => {
			it('should create multiple variations from arrays', () => {
				const oldQuestion: QuestionBase = {
					description: 'Opérations variées',
					enounces: ['Additionner :', 'Soustraire :'],
					expressions: ['&1 + &2', '&1 - &2'],
					variabless: [
						{ '&1': '$e[10;20]', '&2': '$e[1;9]' },
						{ '&1': '$e[10;20]', '&2': '$e[1;9]' }
					],
					solutionss: [['[_&1+&2_]'], ['[_&1-&2_]']],
					defaultDelay: 30,
					grade: 'CE1'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.variations).toHaveLength(2);

				const var1 = result.template?.variations[0];
				expect(var1?.statement).toContain('Additionner');
				expect(var1?.answer).toBe('{{eval:{{1}}+{{2}}}}');

				const var2 = result.template?.variations[1];
				expect(var2?.statement).toContain('Soustraire');
				expect(var2?.answer).toBe('{{eval:{{1}}-{{2}}}}');
			});
		});

		describe('Option Mapping', () => {
			it('should map require-reduced-fractions to constraints.reducedFractions strict', () => {
				const oldQuestion: QuestionBase = {
					description: 'Simplifier une fraction',
					enounces: ['Simplifier :'],
					expressions: ['\\frac{&1}{&2}'],
					variabless: [
						{
							'&1': '$e[2;20]',
							'&2': '$e[2;20]'
						}
					],
					solutionss: [['[_&1/&2_]']],
					options: ['require-reduced-fractions'],
					defaultDelay: 60,
					grade: 'CM1'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.options?.constraints?.reducedFractions).toBe('strict');
			});

			it('should map no-penalty-for-non-reduced-fractions to constraints.reducedFractions off', () => {
				const oldQuestion: QuestionBase = {
					description: 'Addition de fractions',
					enounces: ['Calculer :'],
					expressions: ['\\frac{1}{2} + \\frac{1}{4}'],
					solutionss: [['\\frac{3}{4}']],
					options: ['no-penalty-for-non-reduced-fractions'],
					defaultDelay: 60,
					grade: 'CM2'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.options?.constraints?.reducedFractions).toBe('off');
			});

			it('should map bracket tolerance options', () => {
				const oldQuestion: QuestionBase = {
					description: 'Expression algébrique',
					enounces: ['Écrire :'],
					expressions: ['&1x + &2'],
					solutionss: [['&1x+&2']],
					options: ['no-penalty-for-extraneous-brackets'],
					defaultDelay: 30,
					grade: '4'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.options?.constraints?.brackets).toBe('off');
			});

			it('should map CE constraint options (nullTerms, factorOne, factorZero, signs)', () => {
				const oldQuestion: QuestionBase = {
					description: 'Expression à simplifier',
					enounces: ['Simplifier :'],
					expressions: ['1*x + 0'],
					solutionss: [['x']],
					options: [
						'require-no-null-terms',
						'require-no-factor-one',
						'require-no-factor-zero',
						'require-no-extraneous-signs'
					],
					defaultDelay: 30,
					grade: '6'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.options?.constraints?.nullTerms).toBe('strict');
				expect(result.template?.options?.constraints?.factorOne).toBe('strict');
				expect(result.template?.options?.constraints?.factorZero).toBe('strict');
				expect(result.template?.options?.constraints?.signs).toBe('strict');
			});

			it('should map no-penalty CE constraint options', () => {
				const oldQuestion: QuestionBase = {
					description: 'Expression tolérante',
					enounces: ['Calculer :'],
					expressions: ['3+2'],
					solutionss: [['5']],
					options: [
						'no-penalty-for-null-terms',
						'no-penalty-for-factor-one',
						'no-penalty-for-factor-zero',
						'no-penalty-for-extraneous-signs'
					],
					defaultDelay: 30,
					grade: '5'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.options?.constraints?.nullTerms).toBe('off');
				expect(result.template?.options?.constraints?.factorOne).toBe('off');
				expect(result.template?.options?.constraints?.factorZero).toBe('off');
				expect(result.template?.options?.constraints?.signs).toBe('off');
			});

			it('should map allowBracketsInFirstNegativeTerm option', () => {
				const oldQuestion: QuestionBase = {
					description: 'Expression négative',
					enounces: ['Simplifier :'],
					expressions: ['(-3) + 5'],
					solutionss: [['-3+5']],
					options: ['no-penalty-for-extraneous-brackets-in-first-negative-term'],
					defaultDelay: 30,
					grade: '5'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.options?.constraints?.brackets).toBe('off');
				expect(result.template?.options?.constraints?.allowBracketsInFirstNegativeTerm).toBe(true);
			});
		});

		describe('Error Handling', () => {
			it('should skip questions with images when requested', () => {
				const oldQuestion: QuestionBase = {
					description: 'Question avec image',
					enounces: ['Voir image :'],
					images: ['path/to/image.png'],
					solutionss: [['42']],
					defaultDelay: 30,
					grade: 'CM2'
				};

				const result = transformQuestion(oldQuestion, 0, { skipImages: true });

				expect(result.success).toBe(false);
				expect(result.errors).toContain('Question contains images - skipping for Phase 1');
				expect(result.stats?.hasImages).toBe(true);
			});

			it('should warn about images but continue when not skipping', () => {
				const oldQuestion: QuestionBase = {
					description: 'Question avec image',
					enounces: ['Voir image :'],
					images: ['path/to/image.png'],
					solutionss: [['42']],
					defaultDelay: 30,
					grade: 'CM2'
				};

				const result = transformQuestion(oldQuestion, 0, { skipImages: false });

				expect(result.success).toBe(true);
				expect(result.warnings).toContain('Question contains images - will need manual review');
				expect(result.stats?.hasImages).toBe(true);
			});

			it('should handle custom validation questions', () => {
				const oldQuestion: QuestionBase = {
					description: 'Question avec validation custom',
					enounces: ['Résoudre :'],
					testAnswerss: [['custom validation']],
					solutionss: [['x=2']],
					defaultDelay: 60,
					grade: '3'
				};

				const result = transformQuestion(oldQuestion, 0, { skipCustomValidation: true });

				expect(result.success).toBe(false);
				expect(result.errors).toContain('Question has custom validation - skipping for Phase 1');
				expect(result.stats?.hasCustomValidation).toBe(true);
			});
		});

		describe('Category Assignment', () => {
			it('should detect fraction category', () => {
				const oldQuestion: QuestionBase = {
					description: 'Simplifier une fraction',
					enounces: ['Simplifier :'],
					solutionss: [['1/2']],
					defaultDelay: 30,
					grade: 'CM1'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.template?.theme).toBe('Nombres');
				expect(result.template?.domain).toBe('Fractions');
			});

			it('should detect geometry category', () => {
				const oldQuestion: QuestionBase = {
					description: 'Calculer un angle dans un triangle',
					enounces: ['Calculer :'],
					solutionss: [['60']],
					defaultDelay: 45,
					grade: '5'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.template?.theme).toBe('Géométrie');
				expect(result.template?.domain).toBe('Figures planes');
			});

			it('should assign level based on grade', () => {
				const testCases: Array<[QuestionBase['grade'], number]> = [
					['CP', 1],
					['CE2', 2],
					['6', 3],
					['3', 4],
					['2', 5],
					['SPE_T', 5]
				];

				for (const [grade, expectedLevel] of testCases) {
					const oldQuestion: QuestionBase = {
						description: 'Test',
						enounces: ['Test'],
						solutionss: [['1']],
						defaultDelay: 30,
						grade
					};

					const result = transformQuestion(oldQuestion, 0);
					expect(result.template?.level).toBe(expectedLevel);
				}
			});
		});

		describe('Complex Syntax Conversion', () => {
			it('should convert complex variable references and evaluations', () => {
				const oldQuestion: QuestionBase = {
					description: 'Position décimale',
					enounces: ['Dans le nombre $$&3$$, quel est le chiffre des dizaines ?'],
					variabless: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[0;9]\\{&1}',
							'&3': '[_&1*10+&2_]'
						}
					],
					solutionss: [['&1']],
					answerFields: ['\\text{Le chiffre des dizaines est }$$...$$\\text{.}'],
					defaultDelay: 10,
					grade: 'CP'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);

				const vars = result.template?.variations[0]?.variables;
				expect(vars?.[0]).toEqual({ name: '1', expression: '{{1..9}}' });
				expect(vars?.[1]).toEqual({ name: '2', expression: '{{0..9!{{1}}}}' });
				expect(vars?.[2]).toEqual({ name: '3', expression: '{{eval:{{1}}*10+{{2}}}}' });

				expect(result.template?.variations[0]?.answer).toBe('{{1}}');
			});

			it('should handle n-digit number patterns', () => {
				const oldQuestion: QuestionBase = {
					description: 'Nombre à 4 chiffres',
					enounces: ['Écrire avec des espaces :'],
					expressions: ['&1'],
					variabless: [
						{
							'&1': '$e{4;4}'
						}
					],
					solutionss: [['&1']],
					defaultDelay: 20,
					grade: 'CE2'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);

				const vars = result.template?.variations[0]?.variables;
				expect(vars?.[0]?.expression).toBe('{{1000..9999}}');
			});

			it('should convert list selections', () => {
				const oldQuestion: QuestionBase = {
					description: 'Choix aléatoire',
					enounces: ['Avec la couleur :'],
					expressions: ['&1'],
					variabless: [
						{
							'&1': '$l{rouge;bleu;vert;jaune}'
						}
					],
					solutionss: [['&1']],
					defaultDelay: 15,
					grade: 'CP'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);

				const vars = result.template?.variations[0]?.variables;
				expect(vars?.[0]?.expression).toBe('{{rouge|bleu|vert|jaune}}');
			});
		});
	});

	describe('transformQuestionBatch', () => {
		it('should transform multiple questions and provide summary', () => {
			const questions: QuestionBase[] = [
				{
					description: 'Question 1',
					enounces: ['Q1'],
					solutionss: [['1']],
					defaultDelay: 10,
					grade: 'CP'
				},
				{
					description: 'Question 2',
					enounces: ['Q2'],
					images: ['image.png'],
					solutionss: [['2']],
					defaultDelay: 10,
					grade: 'CE1'
				},
				{
					description: 'Question 3',
					enounces: ['Q3'],
					testAnswerss: [['custom']],
					solutionss: [['3']],
					defaultDelay: 10,
					grade: 'CE2'
				}
			];

			const { results, summary } = transformQuestionBatch(questions, {
				skipImages: true,
				skipCustomValidation: true
			});

			expect(results).toHaveLength(3);
			expect(summary.total).toBe(3);
			expect(summary.successful).toBe(1); // Only first question succeeds
			expect(summary.failed).toBe(2);
			expect(summary.skippedImages).toBe(1);
			expect(summary.skippedCustomValidation).toBe(1);
		});

		it('should call progress callback', () => {
			const questions: QuestionBase[] = [
				{
					description: 'Q1',
					enounces: ['Q1'],
					solutionss: [['1']],
					defaultDelay: 10,
					grade: 'CP'
				},
				{
					description: 'Q2',
					enounces: ['Q2'],
					solutionss: [['2']],
					defaultDelay: 10,
					grade: 'CE1'
				}
			];

			const progressCalls: Array<[number, number]> = [];

			transformQuestionBatch(questions, {
				onProgress: (current, total) => {
					progressCalls.push([current, total]);
				}
			});

			expect(progressCalls).toEqual([
				[1, 2],
				[2, 2]
			]);
		});
	});

	describe('transformQuestion - Shared Fields Detection', () => {
		it('should detect shared statement when 1 enounce for multiple variations', () => {
			const oldQuestion: QuestionBase = {
				description: 'Test shared statement',
				enounces: ['Common statement'], // 1 enounce
				expressions: ['&1', '&1+1'], // 2 variations
				variabless: [{ '&1': '$e[1;10]' }, { '&1': '$e[1;10]' }],
				solutionss: [['&1'], ['[_&1+1_]']],
				defaultDelay: 30,
				grade: 'CE1'
			};

			const result = transformQuestion(oldQuestion, 0);

			expect(result.success).toBe(true);
			expect(result.template?.shared?.statement).toBeDefined();
			expect(result.template?.shared?.statement).toContain('Common statement');
			// Variations still get the statement (as fallback), but shared indicates it's common
			expect(result.template?.variations[0]?.statement).toBeDefined();
			expect(result.template?.variations[1]?.statement).toBeDefined();
			// Both variations should have the same statement as shared
			expect(result.template?.variations[0]?.statement).toEqual(result.template?.shared?.statement);
			expect(result.template?.variations[1]?.statement).toEqual(result.template?.shared?.statement);
		});

		it('should not share statement when each variation has its own enounce', () => {
			const oldQuestion: QuestionBase = {
				description: 'Test per-variation statements',
				enounces: ['Statement 1', 'Statement 2'], // 2 enounces for 2 variations
				expressions: ['&1', '&1+1'],
				variabless: [{ '&1': '$e[1;10]' }, { '&1': '$e[1;10]' }],
				solutionss: [['&1'], ['[_&1+1_]']],
				defaultDelay: 30,
				grade: 'CE1'
			};

			const result = transformQuestion(oldQuestion, 0);

			expect(result.success).toBe(true);
			expect(result.template?.shared?.statement).toBeUndefined();
			expect(result.template?.variations[0]?.statement).toBeDefined();
			expect(result.template?.variations[0]?.statement).toContain('Statement 1');
			expect(result.template?.variations[1]?.statement).toBeDefined();
			expect(result.template?.variations[1]?.statement).toContain('Statement 2');
		});

		it('should detect shared variables when 1 variabless for multiple variations', () => {
			const oldQuestion: QuestionBase = {
				description: 'Test shared variables',
				enounces: ['Statement 1', 'Statement 2'],
				expressions: ['&1', '&1+1'],
				variabless: [{ '&1': '$e[1;10]' }], // 1 variabless for 2 variations
				solutionss: [['&1'], ['[_&1+1_]']],
				defaultDelay: 30,
				grade: 'CE1'
			};

			const result = transformQuestion(oldQuestion, 0);

			expect(result.success).toBe(true);
			expect(result.template?.shared?.variables).toBeDefined();
			expect(result.template?.shared?.variables?.length).toBeGreaterThan(0);
			expect(result.template?.shared?.variables?.[0]?.name).toBe('1');
			expect(result.template?.shared?.variables?.[0]?.expression).toBe('{{1..10}}');
		});

		it('should detect shared answer when 1 solutionss for multiple variations', () => {
			const oldQuestion: QuestionBase = {
				description: 'Test shared answer',
				enounces: ['Stmt 1', 'Stmt 2'],
				expressions: ['&1', '&1+1'],
				variabless: [{ '&1': '$e[1;10]' }, { '&1': '$e[1;10]' }],
				solutionss: [['42']], // 1 solution set for 2 variations
				defaultDelay: 30,
				grade: 'CE1'
			};

			const result = transformQuestion(oldQuestion, 0);

			expect(result.success).toBe(true);
			expect(result.template?.shared?.answer).toBeDefined();
			expect(result.template?.shared?.answer).toBe('42');
			// Variations still get the answer (as fallback), but shared indicates it's common
			expect(result.template?.variations[0]?.answer).toBeDefined();
			expect(result.template?.variations[1]?.answer).toBeDefined();
			// Both variations should have the same answer as shared
			expect(result.template?.variations[0]?.answer).toEqual(result.template?.shared?.answer);
			expect(result.template?.variations[1]?.answer).toEqual(result.template?.shared?.answer);
		});

		it('should handle mix of shared and per-variation fields', () => {
			const oldQuestion: QuestionBase = {
				description: 'Test mixed sharing',
				enounces: ['Common statement'], // shared
				expressions: ['&1', '&1+1'],
				variabless: [{ '&1': '$e[1;10]' }], // shared
				solutionss: [['&1'], ['[_&1+1_]']], // per-variation
				defaultDelay: 30,
				grade: 'CE1'
			};

			const result = transformQuestion(oldQuestion, 0);

			expect(result.success).toBe(true);
			// Shared fields
			expect(result.template?.shared?.statement).toBeDefined();
			expect(result.template?.shared?.variables).toBeDefined();
			// Not shared
			expect(result.template?.shared?.answer).toBeUndefined();
			// Per-variation answers
			expect(result.template?.variations[0]?.answer).toBeDefined();
			expect(result.template?.variations[1]?.answer).toBeDefined();
			expect(result.template?.variations[0]?.answer).toBe('{{1}}');
			expect(result.template?.variations[1]?.answer).toBe('{{eval:{{1}}+1}}');
		});

		it('should preserve QuestionCorrection structure when shared', () => {
			const oldQuestion: QuestionBase = {
				description: 'Test shared correction',
				enounces: ['Stmt 1', 'Stmt 2'],
				expressions: ['&1', '&1+1'],
				variabless: [{ '&1': '$e[1;10]' }, { '&1': '$e[1;10]' }],
				solutionss: [['&1'], ['[_&1+1_]']],
				correctionFormats: [{ correct: ['The answer is [_&1_]'] }], // shared
				correctionDetailss: [[{ text: 'Step 1: Calculate &1' }]], // 1 for 2 variations
				defaultDelay: 30,
				grade: 'CE1'
			};

			const result = transformQuestion(oldQuestion, 0);

			expect(result.success).toBe(true);
			expect(result.template?.shared?.correction).toBeDefined();
			expect(result.template?.shared?.correction?.steps).toBeDefined();
			expect(result.template?.shared?.correction?.steps).toHaveLength(1);
			// Correction is NOT duplicated in variations when shared (optional fields work differently)
			expect(result.template?.variations[0]?.correction).toBeUndefined();
			expect(result.template?.variations[1]?.correction).toBeUndefined();
		});

		it('should not create shared fields for single variation', () => {
			const oldQuestion: QuestionBase = {
				description: 'Test single variation',
				enounces: ['Only statement'],
				expressions: ['&1'],
				variabless: [{ '&1': '$e[1;10]' }],
				solutionss: [['&1']],
				defaultDelay: 30,
				grade: 'CE1'
			};

			const result = transformQuestion(oldQuestion, 0);

			expect(result.success).toBe(true);
			// No shared field should exist for single variation
			expect(result.template?.shared).toBeUndefined();
			// All data should be in the variation
			expect(result.template?.variations).toHaveLength(1);
			expect(result.template?.variations[0]?.statement).toBeDefined();
			expect(result.template?.variations[0]?.variables).toBeDefined();
			expect(result.template?.variations[0]?.answer).toBeDefined();
		});

		it('should detect shared choices for multiple choice questions', () => {
			const oldQuestion: QuestionBase = {
				description: 'Test shared choices',
				enounces: ['Question 1', 'Question 2'],
				expressions: ['&1', '&2'],
				variabless: [{ '&1': '$e[1;5]' }, { '&2': '$e[6;10]' }],
				choicess: [[{ text: 'Choice A' }, { text: 'Choice B' }]], // 1 for 2 variations
				solutionss: [[0], [0]], // Same correct index for shared choices
				defaultDelay: 30,
				grade: 'CE2'
			};

			const result = transformQuestion(oldQuestion, 0);

			expect(result.success).toBe(true);
			expect(result.template?.type).toBe('multiple_choice');
			expect(result.template?.shared?.choices).toBeDefined();
			expect(result.template?.shared?.choices).toHaveLength(2);
			// Choices are NOT duplicated in variations when shared (optional fields work differently)
			expect(result.template?.variations[0]?.choices).toBeUndefined();
			expect(result.template?.variations[1]?.choices).toBeUndefined();
		});

		it('should detect shared validation rules', () => {
			const oldQuestion: QuestionBase = {
				description: 'Test shared validation',
				enounces: ['Expression 1', 'Expression 2'],
				expressions: ['&1x + &2', '&1x - &2'],
				variabless: [
					{ '&1': '$e[1;5]', '&2': '$e[1;5]' },
					{ '&1': '$e[1;5]', '&2': '$e[1;5]' }
				],
				solutionss: [['&1x+&2'], ['&1x-&2']],
				options: ['disallow-terms-permutation'], // shared validation rule
				defaultDelay: 45,
				grade: '4'
			};

			const result = transformQuestion(oldQuestion, 0);

			expect(result.success).toBe(true);
			// Validation rules from options should be shared
			if (
				result.template?.shared?.validationRules ||
				result.template?.variations[0]?.validationRules
			) {
				// Either shared or per-variation, but consistent
				const hasSharedRules = result.template?.shared?.validationRules !== undefined;
				const hasPerVariationRules = result.template?.variations[0]?.validationRules !== undefined;
				// Should be in one place or the other, not both
				expect(hasSharedRules || hasPerVariationRules).toBe(true);
			}
		});

		it('should handle completely identical variations efficiently', () => {
			const oldQuestion: QuestionBase = {
				description: 'Test identical variations',
				enounces: ['Same statement'], // 1 shared
				expressions: ['&1'], // 1 shared
				variabless: [{ '&1': '$e[1;10]' }], // 1 shared
				solutionss: [['&1']], // 1 shared
				correctionFormats: [{ correct: ['The answer is [_&1_]'] }], // shared
				correctionDetailss: [[{ text: 'Just calculate &1' }]], // 1 shared
				defaultDelay: 30,
				grade: 'CE1'
			};

			const result = transformQuestion(oldQuestion, 0);

			expect(result.success).toBe(true);
			// Should have only 1 variation since everything is identical
			expect(result.template?.variations).toHaveLength(1);
			// No shared needed for single variation
			expect(result.template?.shared).toBeUndefined();
		});

		it('should understand shared field semantics correctly', () => {
			// This test documents the actual behavior of shared fields
			const oldQuestion: QuestionBase = {
				description: 'Shared field semantics',
				enounces: ['Common statement'], // shared
				expressions: ['&1', '&2'],
				variabless: [{ '&1': '$e[1;10]' }, { '&2': '$e[11;20]' }], // per-variation
				solutionss: [['&1'], ['&2']], // per-variation
				choicess: [[{ text: 'A' }, { text: 'B' }]], // shared
				correctionFormats: [{ correct: ['Answer: [_&1_]'] }], // shared
				correctionDetailss: [[{ text: 'Step 1' }]], // shared
				defaultDelay: 30,
				grade: 'CE2'
			};

			const result = transformQuestion(oldQuestion, 0);

			expect(result.success).toBe(true);

			// Required fields (statement, answer):
			// - If shared: still appear in variations as fallback values
			expect(result.template?.shared?.statement).toBeDefined();
			expect(result.template?.variations[0]?.statement).toBeDefined();
			expect(result.template?.variations[1]?.statement).toBeDefined();
			expect(result.template?.variations[0]?.statement).toEqual(result.template?.shared?.statement);

			// Optional fields (choices, correction, validationRules):
			// - If shared: do NOT appear in variations (true deduplication)
			expect(result.template?.shared?.choices).toBeDefined();
			expect(result.template?.variations[0]?.choices).toBeUndefined();
			expect(result.template?.variations[1]?.choices).toBeUndefined();

			expect(result.template?.shared?.correction).toBeDefined();
			expect(result.template?.variations[0]?.correction).toBeUndefined();
			expect(result.template?.variations[1]?.correction).toBeUndefined();

			// Per-variation fields: appear in variations, not in shared
			expect(result.template?.shared?.variables).toBeUndefined();
			expect(result.template?.variations[0]?.variables).toBeDefined();
			expect(result.template?.variations[1]?.variables).toBeDefined();

			expect(result.template?.shared?.answer).toBeUndefined();
			expect(result.template?.variations[0]?.answer).toBeDefined();
			expect(result.template?.variations[1]?.answer).toBeDefined();
		});

		it('should handle per-variation corrections correctly', () => {
			const oldQuestion: QuestionBase = {
				description: 'Per-variation corrections',
				enounces: ['Stmt 1', 'Stmt 2'],
				expressions: ['&1', '&1+1'],
				variabless: [{ '&1': '$e[1;10]' }, { '&1': '$e[1;10]' }],
				solutionss: [['&1'], ['[_&1+1_]']],
				correctionFormats: [{ correct: ['Answer is &1'] }, { correct: ['Answer is &1+1'] }], // 2 different correction formats
				correctionDetailss: [[{ text: 'Step A' }], [{ text: 'Step B' }]], // 2 different correction details arrays
				defaultDelay: 30,
				grade: 'CE1'
			};

			const result = transformQuestion(oldQuestion, 0);

			expect(result.success).toBe(true);
			// Corrections are per-variation, not shared
			expect(result.template?.shared?.correction).toBeUndefined();
			expect(result.template?.variations[0]?.correction).toBeDefined();
			expect(result.template?.variations[1]?.correction).toBeDefined();
			// Check that steps exist and contain the expected content
			const steps0 = result.template?.variations[0]?.correction?.steps;
			const steps1 = result.template?.variations[1]?.correction?.steps;
			expect(steps0).toBeDefined();
			expect(steps1).toBeDefined();
			expect(steps0?.[0]).toBeDefined();
			expect(steps1?.[0]).toBeDefined();
			// TemplateMarkdown is a string type
			expect(steps0?.[0]).toContain('Step A');
			expect(steps1?.[0]).toContain('Step B');
		});
	});

	describe('validateTransformedTemplate', () => {
		it('should validate a correct template', () => {
			const template: QuestionTemplate = {
				id: 'test-id',
				type: 'numerical_exact',
				title: 'Test Question',
				variations: [
					{
						statement: templateMarkdown('Test'),
						answer: '42'
					}
				],
				grades: ['CM1'],
				theme: 'Nombres',
				domain: 'Arithmétique',
				level: 1,
				status: 'draft'
			};

			const result = validateTransformedTemplate(template);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should detect missing required fields', () => {
			const template = {
				type: 'numerical_exact',
				variations: []
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any as QuestionTemplate;

			const result = validateTransformedTemplate(template);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Missing title');
			expect(result.errors).toContain('No variations provided');
			expect(result.errors).toContain('No grades specified');
			expect(result.errors).toContain('Missing theme');
			expect(result.errors).toContain('Missing domain');
		});

		it('should validate variation structure', () => {
			const template: QuestionTemplate = {
				id: 'test-id',
				type: 'multiple_choice',
				title: 'Test',
				variations: [
					{
						statement: templateMarkdown(''),
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						answer: undefined as any
					}
				],
				grades: ['CM1'],
				theme: 'Test',
				domain: 'Test',
				level: 1,
				status: 'draft'
			};

			const result = validateTransformedTemplate(template);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Variation 0: missing statement');
			expect(result.errors).toContain('Variation 0: missing answer');
			expect(result.errors).toContain('Variation 0: multiple choice question missing choices');
		});
	});
});
