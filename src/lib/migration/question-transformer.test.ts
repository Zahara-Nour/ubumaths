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
					expression: '{#:1-10}'
				});
				expect(variation?.answer).toBe('{eval:{@:1}+{@:2}}');
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
				expect(choices?.[0]).toEqual({
					content: { type: 'text', content: 'pair' },
					isCorrect: true
				});
				expect(choices?.[1]).toEqual({
					content: { type: 'text', content: 'impair' },
					isCorrect: false
				});
			});

			it('should transform multiple answer questions', () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
					expectedAnswer: '{@:2}'
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
				expect(blanks?.[0]?.expectedAnswer).toBe('{@:1}');
				expect(blanks?.[1]?.expectedAnswer).toBe('{@:2}');
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
				expect(var1?.statement[0].content).toContain('Additionner');
				expect(var1?.answer).toBe('{eval:{@:1}+{@:2}}');

				const var2 = result.template?.variations[1];
				expect(var2?.statement[0].content).toContain('Soustraire');
				expect(var2?.answer).toBe('{eval:{@:1}-{@:2}}');
			});
		});

		describe('Option Mapping', () => {
			it('should map fraction reduction options', () => {
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
				expect(result.template?.options?.canonicalForm).toBe('fraction');
				expect(result.template?.options?.allowDifferentForms).toBe(false);
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
				expect(result.template?.options?.allowDifferentForms).toBe(true);
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
				expect(vars?.[0]).toEqual({ name: '1', expression: '{#:1-9}' });
				expect(vars?.[1]).toEqual({ name: '2', expression: '{#:0-9!{@:1}}' });
				expect(vars?.[2]).toEqual({ name: '3', expression: '{eval:{@:1}*10+{@:2}}' });

				expect(result.template?.variations[0]?.answer).toBe('{@:1}');
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
				expect(vars?.[0]?.expression).toBe('{#:1000-9999}');
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
				expect(vars?.[0]?.expression).toBe('{#list:rouge,bleu,vert,jaune}');
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

	describe('validateTransformedTemplate', () => {
		it('should validate a correct template', () => {
			const template: QuestionTemplate = {
				id: 'test-id',
				type: 'numerical_exact',
				title: 'Test Question',
				variations: [
					{
						statement: [{ type: 'text', content: 'Test' }],
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
						statement: [],
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
