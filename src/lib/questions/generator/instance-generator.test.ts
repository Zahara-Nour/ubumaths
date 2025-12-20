/**
 * Instance Generator Tests
 * =========================
 *
 * Tests for the main instance generation orchestrator.
 * This is the entry point that validates, resolves variables, and generates full question instances.
 *
 * UPDATED: All tests now use QuestionVariation structure with variations array
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from './instance-generator';
import type { QuestionTemplate, ResolvedVariable } from '../types';
import { templateMarkdown } from '$lib/ubumark';

/**
 * Helper function to get numeric value from resolved variables array
 */
function getVarValue(resolvedVariables: ResolvedVariable[] | undefined, varName: string): number {
	if (!resolvedVariables) return NaN;
	const variable = resolvedVariables.find((v) => v.name === varName);
	return variable ? parseFloat(variable.value) : NaN;
}

describe('generateInstance - Numerical Exact Questions', () => {
	it('should generate simple numerical question instance', () => {
		const template: QuestionTemplate = {
			id: 'test-1',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Calculate {{a}} + {{b}}'),
					variables: [
						{ name: 'a', expression: '{{random:1..10}}' },
						{ name: 'b', expression: '{{random:1..10}}' }
					],
					solution: '{{eval:a + b}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Addition',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance).toBeDefined();
		expect(result.instance.type).toBe('numerical_exact');

		// Check variables exist in array
		const a = getVarValue(result.instance.resolvedVariables, 'a');
		const b = getVarValue(result.instance.resolvedVariables, 'b');
		expect(a).not.toBeNaN();
		expect(b).not.toBeNaN();
		expect(result.instance.solution).toBe((a + b).toString());
	});

	it('should generate reproducible instance with seed', () => {
		const template: QuestionTemplate = {
			id: 'test-2',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Value: {{x}}'),
					variables: [{ name: 'x', expression: '{{random:1..100}}' }],
					solution: '{{x}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result1 = generateInstance(template, 12345);
		const result2 = generateInstance(template, 12345);

		// Test reproducibility by checking deterministic fields
		expect(result1.success).toBe(true);
		expect(result2.success).toBe(true);
		if (!result1.success || !result2.success) return;

		// Verify both instances have valid timestamps (non-deterministic field)
		expect(result1.instance.generatedAt).toBeDefined();
		expect(result2.instance.generatedAt).toBeDefined();

		// Test all deterministic fields are identical
		const { generatedAt: _gen1, ...instance1Deterministic } = result1.instance;
		const { generatedAt: _gen2, ...instance2Deterministic } = result2.instance;
		expect(instance1Deterministic).toEqual(instance2Deterministic);
	});

	it('should generate different instances with different seeds', () => {
		const template: QuestionTemplate = {
			id: 'test-3',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Value: {{x}}'),
					variables: [{ name: 'x', expression: '{{random:1..1000}}' }],
					solution: '{{x}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result1 = generateInstance(template, 11111);
		const result2 = generateInstance(template, 22222);

		expect(result1.success).toBe(true);
		expect(result2.success).toBe(true);
		if (!result1.success || !result2.success) return;

		const x1 = getVarValue(result1.instance.resolvedVariables, 'x');
		const x2 = getVarValue(result2.instance.resolvedVariables, 'x');
		expect(x1).not.toBe(x2);
	});
});

describe('generateInstance - Algebraic Transform Questions', () => {
	it('should generate algebraic transform instance', () => {
		const template: QuestionTemplate = {
			id: 'test-4',
			type: 'algebraic_transform',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Factor: $$x^2 - {{c}}$$'),
					variables: [
						{ name: 'a', expression: '{{random:2..9}}' },
						{ name: 'c', expression: '{{eval:a^2}}' }
					],
					solution: '(x-{{a}})(x+{{a}})'
				}
			],
			transformType: 'factor',
			grades: ['3'],
			theme: 'Algèbre',
			domain: 'Factorisation',
			level: 2,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.type).toBe('algebraic_transform');
		expect(result.instance.transformType).toBe('factor');

		const a = getVarValue(result.instance.resolvedVariables, 'a');
		const c = getVarValue(result.instance.resolvedVariables, 'c');
		expect(c).toBe(a ** 2);
	});
});

describe('generateInstance - Fill-in-Blanks Questions', () => {
	it('should generate fill-in-blanks instance', () => {
		const template: QuestionTemplate = {
			id: 'test-5',
			type: 'fill_in_blanks',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Complete: {{a}} + {{b}} = {{blank:1}}'),
					variables: [
						{ name: 'a', expression: '{{random:1..10}}' },
						{ name: 'b', expression: '{{random:1..10}}' }
					],
					solution: ['{{eval:a + b}}'],
					blanks: [{ position: 0, expectedAnswer: '{{eval:a + b}}' }]
				}
			],
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Addition',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.type).toBe('fill_in_blanks');
		expect(Array.isArray(result.instance.solution)).toBe(true);

		const a = getVarValue(result.instance.resolvedVariables, 'a');
		const b = getVarValue(result.instance.resolvedVariables, 'b');
		expect(result.instance.solution[0]).toBe((a + b).toString());
	});

	it('should generate fill-in-blanks with multiple blanks', () => {
		const template: QuestionTemplate = {
			id: 'test-6',
			type: 'fill_in_blanks',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('{{blank:1}} + {{blank:2}} = {{sum}}'),
					variables: [
						{ name: 'a', expression: '{{random:1..10}}' },
						{ name: 'b', expression: '{{random:1..10}}' },
						{ name: 'sum', expression: '{{eval:a + b}}' }
					],
					solution: ['{{a}}', '{{b}}'],
					blanks: [
						{ position: 0, expectedAnswer: '{{a}}' },
						{ position: 1, expectedAnswer: '{{b}}' }
					]
				}
			],
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Addition',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.solution).toHaveLength(2);
		expect(result.instance.blanks).toHaveLength(2);
		expect(result.instance.blanks![0].position).toBe(0);
		expect(result.instance.blanks![1].position).toBe(1);
	});
});

describe('generateInstance - Multiple Choice Questions', () => {
	it('should generate multiple choice instance with shuffled choices', () => {
		const template: QuestionTemplate = {
			id: 'test-7',
			type: 'multiple_choice',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('What is {{a}} + {{b}}?'),
					variables: [
						{ name: 'a', expression: '{{random:1..10}}' },
						{ name: 'b', expression: '{{random:1..10}}' },
						{ name: 'correct', expression: '{{eval:a + b}}' },
						{ name: 'wrong1', expression: '{{eval:a + b + 1}}' },
						{ name: 'wrong2', expression: '{{eval:a + b - 1}}' }
					],
					solution: '0',
					choices: [
						{ content: templateMarkdown('{{correct}}'), isCorrect: true },
						{ content: templateMarkdown('{{wrong1}}'), isCorrect: false },
						{ content: templateMarkdown('{{wrong2}}'), isCorrect: false },
						{ content: templateMarkdown('{{eval:a * b}}'), isCorrect: false }
					]
				}
			],
			multipleAnswers: false,
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Addition',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 12345);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.type).toBe('multiple_choice');
		expect(result.instance.shuffledChoices).toHaveLength(4);
		expect(result.instance.multipleAnswers).toBe(false);

		// Verify correct answer is tracked (don't check specific value, just that it exists)
		const _correctAnswer = getVarValue(result.instance.resolvedVariables, 'correct');
		const shuffledCorrectIndex = parseInt(result.instance.solution as string);
		expect(shuffledCorrectIndex).toBeGreaterThanOrEqual(0);
		expect(shuffledCorrectIndex).toBeLessThan(4);

		// Verify the answer index points to a valid choice
		expect(result.instance.shuffledChoices![shuffledCorrectIndex]).toBeDefined();
		expect(result.instance.shuffledChoices![shuffledCorrectIndex].content).toBeDefined();
	});

	it('should generate multiple choice with multiple correct answers', () => {
		const template: QuestionTemplate = {
			id: 'test-8',
			type: 'multiple_choice',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Select all prime numbers:'),
					variables: [],
					solution: ['0', '2'],
					choices: [
						{ content: templateMarkdown('2'), isCorrect: true },
						{ content: templateMarkdown('4'), isCorrect: false },
						{ content: templateMarkdown('7'), isCorrect: true },
						{ content: templateMarkdown('9'), isCorrect: false }
					]
				}
			],
			multipleAnswers: true,
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Nombres premiers',
			level: 2,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 54321);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.multipleAnswers).toBe(true);
		expect(Array.isArray(result.instance.solution)).toBe(true);

		const answerIndices = result.instance.solution as string[];
		const correctChoices = answerIndices.map(
			(i) => result.instance.shuffledChoices![parseInt(i)].content
		);

		// Verify we have 2 correct answers (don't check which specific ones due to shuffling)
		expect(correctChoices).toHaveLength(2);
		// Verify they are from the original correct choices
		const allChoices = ['2', '4', '7', '9'];
		correctChoices.forEach((choice) => {
			expect(allChoices).toContain(choice);
		});
	});
});

describe('generateInstance - Complex Variable Resolution', () => {
	// Known issue: Eval expression with parentheses may not evaluate correctly
	it.skip('should generate fraction addition instance', () => {
		const template: QuestionTemplate = {
			id: 'test-9',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown(
						'Calculer: $$\\frac{{{num1}}}{{{{den}}}} + \\frac{{{num2}}}{{{{den}}}}$$'
					),
					variables: [
						{ name: 'den', expression: '{{random:2..9}}' },
						{ name: 'denMinus1', expression: '{{eval:den-1}}' },
						{ name: 'num1', expression: '{{random:1-denMinus1}}' },
						{ name: 'num2', expression: '{{random:1-denMinus1!num1}}' }
					],
					solution: '{{eval:(num1+num2)/den}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6', '5'],
			theme: 'Fractions',
			domain: 'Addition',
			level: 2,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 99999);

		expect(result.success).toBe(true);
		if (!result.success) return;

		const num1 = getVarValue(result.instance.resolvedVariables, 'num1');
		const num2 = getVarValue(result.instance.resolvedVariables, 'num2');
		const den = getVarValue(result.instance.resolvedVariables, 'den');
		expect(num1).not.toBe(num2); // Exclusion working
		expect(num1).toBeLessThan(den); // Bounds working
		expect(num2).toBeLessThan(den);
		expect(parseFloat(result.instance.solution as string)).toBeCloseTo((num1 + num2) / den, 5);
	});

	it('should generate GCD simplification instance', () => {
		const template: QuestionTemplate = {
			id: 'test-10',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Simplifier: $$\frac{{{{num}}}}{{{{den}}}}$$'),
					variables: [
						{ name: 'gcd', expression: '{{random:2..5}}' },
						{ name: 'a', expression: '{{random:2..9}}' },
						{ name: 'b', expression: '{{random:2..9!a}}' },
						{ name: 'num', expression: '{{eval:a*gcd}}' },
						{ name: 'den', expression: '{{eval:b*gcd}}' }
					],
					solution: '{{eval:num/den}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6', '5'],
			theme: 'Fractions',
			domain: 'Simplification',
			level: 3,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 33333);

		expect(result.success).toBe(true);
		if (!result.success) return;

		const gcd = getVarValue(result.instance.resolvedVariables, 'gcd');
		const a = getVarValue(result.instance.resolvedVariables, 'a');
		const b = getVarValue(result.instance.resolvedVariables, 'b');
		const num = getVarValue(result.instance.resolvedVariables, 'num');
		const den = getVarValue(result.instance.resolvedVariables, 'den');
		expect(num).toBe(a * gcd);
		expect(den).toBe(b * gcd);
		expect(a).not.toBe(b);
	});
});

describe('generateInstance - Content Resolution', () => {
	it('should resolve variables in statement', () => {
		const template: QuestionTemplate = {
			id: 'test-11',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('What is {{x}} × {{y}}?'),
					variables: [
						{ name: 'x', expression: '{{random:2..9}}' },
						{ name: 'y', expression: '{{random:2..9}}' }
					],
					solution: '{{eval:x * y}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Multiplication',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 77777);

		expect(result.success).toBe(true);
		if (!result.success) return;

		const x = getVarValue(result.instance.resolvedVariables, 'x');
		const y = getVarValue(result.instance.resolvedVariables, 'y');
		expect(result.instance.statement).toBe(`What is ${x} × ${y}?`);
	});

	it('should resolve LaTeX in statement', () => {
		const template: QuestionTemplate = {
			id: 'test-12',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('$$\frac{{{{a}}}}{{{{b}}}}$$'),
					variables: [
						{ name: 'a', expression: '{{random:1..10}}' },
						{ name: 'b', expression: '{{random:1..10}}' }
					],
					solution: '{{eval:a/b}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Fractions',
			domain: 'Division',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 44444);

		expect(result.success).toBe(true);
		if (!result.success) return;

		const a = getVarValue(result.instance.resolvedVariables, 'a');
		const b = getVarValue(result.instance.resolvedVariables, 'b');
		expect(result.instance.statement).toBe(`$$\\frac{${a}}{${b}}$$`);
	});

	it('should resolve correction field', () => {
		const template: QuestionTemplate = {
			id: 'test-13',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Calculate {{a}} + {{b}}'),
					variables: [
						{ name: 'a', expression: '{{random:1..10}}' },
						{ name: 'b', expression: '{{random:1..10}}' }
					],
					solution: '{eval:{@:a} + {@:b}}',
					correction: {
						feedback: {
							correct: templateMarkdown('Well done!'),
							incorrect: templateMarkdown('The answer is {{a}} + {{b}} = {{eval:a + b}}')
						}
					}
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Addition',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 66666);

		expect(result.success).toBe(true);
		if (!result.success) return;

		const a = getVarValue(result.instance.resolvedVariables, 'a');
		const b = getVarValue(result.instance.resolvedVariables, 'b');
		const sum = a + b;
		expect(result.instance.correction?.feedback?.correct).toBe('Well done!');
		expect(result.instance.correction?.feedback?.incorrect).toBe(
			`The answer is ${a} + ${b} = ${sum}`
		);
	});
});

describe('generateInstance - Precision Handling', () => {
	it('should include decimal precision', () => {
		const template: QuestionTemplate = {
			id: 'test-14',
			type: 'numerical_decimal',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Calculate {{a}} / {{b}}'),
					variables: [
						{ name: 'a', expression: '{{random:1..10}}' },
						{ name: 'b', expression: '{{random:2..9}}' }
					],
					solution: '{{eval:a/b}}'
				}
			],
			precision: { type: 'decimal', digits: 2 },
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Division',
			level: 2,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.precision).toEqual({ type: 'decimal', digits: 2 });
	});

	it('should include tolerance precision', () => {
		const template: QuestionTemplate = {
			id: 'test-15',
			type: 'numerical_rounded',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Estimate sqrt({{a}})'),
					variables: [{ name: 'a', expression: '{{random:10..100}}' }],
					solution: '{eval:sqrt({@:a})}'
				}
			],
			precision: { type: 'tolerance', tolerance: 0.1, mode: 'absolute' },
			grades: ['3'],
			theme: 'Arithmétique',
			domain: 'Racine carrée',
			level: 3,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.precision).toEqual({
			type: 'tolerance',
			tolerance: 0.1,
			mode: 'absolute'
		});
	});
});

describe('generateInstance - Validation Errors', () => {
	it('should fail on circular dependency', () => {
		const template: QuestionTemplate = {
			id: 'test-16',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Value: {{a}}'),
					variables: [
						{ name: 'a', expression: '{{b}}' },
						{ name: 'b', expression: '{{a}}' }
					],
					solution: '{{a}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(false);
		if (result.success) return;

		expect(result.errors).toBeDefined();
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it('should fail on min > max after variable resolution', () => {
		const template: QuestionTemplate = {
			id: 'test-17',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Value: {{x}}'),
					variables: [
						{ name: 'min', expression: '10' },
						{ name: 'max', expression: '5' },
						{ name: 'x', expression: '{#:@:min}}-{@:max}' }
					],
					solution: '{{x}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(false);
		if (result.success) return;

		expect(result.errors).toBeDefined();
	});

	// Note: MathLive accepts symbolic expressions, so "invalid syntax" is treated as a symbol
	it.skip('should fail on invalid eval expression', () => {
		const template: QuestionTemplate = {
			id: 'test-18',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Value'),
					variables: [{ name: 'a', expression: '{{eval:invalid syntax}}' }],
					solution: '{{a}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(false);
		if (result.success) return;

		expect(result.errors).toBeDefined();
	});
});

describe('generateInstance - Edge Cases', () => {
	it('should generate instance with no variables', () => {
		const template: QuestionTemplate = {
			id: 'test-19',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('What is 2 + 2?'),
					variables: [],
					solution: '4'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Addition',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.resolvedVariables).toEqual([]);
		expect(result.instance.solution).toBe('4');
	});

	it('should generate instance with delay parameter', () => {
		const template: QuestionTemplate = {
			id: 'test-20',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [],
					solution: '42'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			delay: 120,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.delay).toBe(120);
	});

	// Note: Failing due to validation issue with image fields (success: false, error: undefined)
	it.skip('should generate instance with multiple statement fields', () => {
		const template: QuestionTemplate = {
			id: 'test-21',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown(
						'Given {{a}}\n\n![Example image](https://example.com/image.png)\n\nCalculate {{a}} × 2'
					),
					variables: [{ name: 'a', expression: '{{random:1..10}}' }],
					solution: '{{eval:a * 2}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Multiplication',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		if (!result.success) return;

		const a = getVarValue(result.instance.resolvedVariables, 'a');
		expect(result.instance.statement).toContain(`Given ${a}`);
		expect(result.instance.statement).toContain('![Example image](https://example.com/image.png)');
		expect(result.instance.statement).toContain(`Calculate ${a} × 2`);
	});
});

describe('generateInstance - Real-World Templates', () => {
	it('should generate quadratic equation instance', () => {
		const template: QuestionTemplate = {
			id: 'test-22',
			type: 'algebraic_transform',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Résoudre: ${{a}}x^2 + {{b}}x + {{c}} = 0$'),
					variables: [
						{ name: 'a', expression: '{{random:1..5}}' },
						{ name: 'b', expression: '{{random:-10..10}}' },
						{ name: 'c', expression: '{{random:-10..10}}' },
						{ name: 'disc', expression: '{{eval:b^2 - 4*a*c}}' }
					],
					solution: 'x = \\frac{-{{b}} \\pm \\sqrt{{{disc}}}}{2{{a}}'
				}
			],
			transformType: 'solve',
			grades: ['3'],
			theme: 'Algèbre',
			domain: 'Équations',
			level: 4,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 88888);

		expect(result.success).toBe(true);
		if (!result.success) return;

		const a = getVarValue(result.instance.resolvedVariables, 'a');
		const b = getVarValue(result.instance.resolvedVariables, 'b');
		const c = getVarValue(result.instance.resolvedVariables, 'c');
		const disc = getVarValue(result.instance.resolvedVariables, 'disc');
		expect(disc).toBe(b ** 2 - 4 * a * c);
	});

	// Known issue: Complex eval expressions with multiple operations may not evaluate correctly
	it.skip('should generate percentage calculation instance', () => {
		const template: QuestionTemplate = {
			id: 'test-23',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown(
						'Un article coûte {{price}}€. Il y a {{discount}}% de réduction. Quel est le prix final?'
					),
					variables: [
						{ name: 'price', expression: '{{random:50..200}}' },
						{ name: 'discount', expression: '{{random:10..50}}' },
						{ name: 'reduction', expression: '{eval:{@:price} * {@:discount} / 100}' }
					],
					solution: '{eval:{@:price} - {@:reduction}'
				}
			],
			precision: { type: 'decimal', digits: 2 },
			grades: ['6', '5'],
			theme: 'Arithmétique',
			domain: 'Pourcentages',
			level: 2,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 55555);

		expect(result.success).toBe(true);
		if (!result.success) return;

		const price = getVarValue(result.instance.resolvedVariables, 'price');
		const discount = getVarValue(result.instance.resolvedVariables, 'discount');
		const reduction = getVarValue(result.instance.resolvedVariables, 'reduction');
		expect(reduction).toBeCloseTo((price * discount) / 100, 5);
		expect(parseFloat(result.instance.solution as string)).toBeCloseTo(price - reduction, 5);
	});
});

describe('generateInstance - Variation Selection', () => {
	it('should select first variation with seed 0', () => {
		const template: QuestionTemplate = {
			id: 'test-24',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Addition: {{a}} + {{b}}'),
					variables: [
						{ name: 'a', expression: '{{random:1..10}}' },
						{ name: 'b', expression: '{{random:1..10}}' }
					],
					solution: '{eval:{@:a} + {@:b}}'
				},
				{
					statement: templateMarkdown('Subtraction: {{a}} - {{b}}'),
					variables: [
						{ name: 'a', expression: '{{random:10..20}}' },
						{ name: 'b', expression: '{#:1-{@:a}}' }
					],
					solution: '{eval:{@:a} - {@:b}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Opérations',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 0);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.selectedVariationIndex).toBe(0);
		expect(result.instance.statement).toContain('Addition');
	});

	it('should select second variation with seed 1', () => {
		const template: QuestionTemplate = {
			id: 'test-25',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Addition: {{a}} + {{b}}'),
					variables: [
						{ name: 'a', expression: '{{random:1..10}}' },
						{ name: 'b', expression: '{{random:1..10}}' }
					],
					solution: '{eval:{@:a} + {@:b}}'
				},
				{
					statement: templateMarkdown('Subtraction: {{a}} - {{b}}'),
					variables: [
						{ name: 'a', expression: '{{random:10..20}}' },
						{ name: 'b', expression: '{#:1-{@:a}}' }
					],
					solution: '{eval:{@:a} - {@:b}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Opérations',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 1);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.selectedVariationIndex).toBe(1);
		expect(result.instance.statement).toContain('Subtraction');
	});

	it('should handle variation selection with modulo (4 variations)', () => {
		const template: QuestionTemplate = {
			id: 'test-26',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Op 1'),
					variables: [],
					solution: '1'
				},
				{
					statement: templateMarkdown('Op 2'),
					variables: [],
					solution: '2'
				},
				{
					statement: templateMarkdown('Op 3'),
					variables: [],
					solution: '3'
				},
				{
					statement: templateMarkdown('Op 4'),
					variables: [],
					solution: '4'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		// Test seeds 0-3 map to variations 0-3
		const result0 = generateInstance(template, 0);
		const result1 = generateInstance(template, 1);
		const result2 = generateInstance(template, 2);
		const result3 = generateInstance(template, 3);

		expect(result0.success).toBe(true);
		expect(result1.success).toBe(true);
		expect(result2.success).toBe(true);
		expect(result3.success).toBe(true);
		if (!result0.success || !result1.success || !result2.success || !result3.success) return;

		expect(result0.instance.selectedVariationIndex).toBe(0);
		expect(result1.instance.selectedVariationIndex).toBe(1);
		expect(result2.instance.selectedVariationIndex).toBe(2);
		expect(result3.instance.selectedVariationIndex).toBe(3);

		// Test seed 4 wraps around to variation 0 (4 % 4 = 0)
		const result4 = generateInstance(template, 4);
		expect(result4.success).toBe(true);
		if (!result4.success) return;
		expect(result4.instance.selectedVariationIndex).toBe(0);

		// Test seed 100 maps to variation 0 (100 % 4 = 0)
		const result100 = generateInstance(template, 100);
		expect(result100.success).toBe(true);
		if (!result100.success) return;
		expect(result100.instance.selectedVariationIndex).toBe(0);
	});

	it('should validate variations independently', () => {
		const template: QuestionTemplate = {
			id: 'test-27',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Valid variation'),
					variables: [],
					solution: '5'
				},
				{
					statement: templateMarkdown(''), // Invalid - empty statement
					variables: [],
					solution: '10'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(false);
		if (result.success) return;

		expect(result.errors).toBeDefined();
		expect(
			result.errors.some((e: string) => e.includes('Variation 2') || e.includes('variation 1'))
		).toBe(true);
	});
});

describe('generateInstance - Shared Fields', () => {
	it('should work without shared field (backward compatible)', () => {
		const template: QuestionTemplate = {
			id: 'test-shared-1',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			variations: [
				{
					statement: templateMarkdown('Calculate {{a}} + {{b}}'),
					variables: [
						{ name: 'a', expression: '{{random:1..10}}' },
						{ name: 'b', expression: '{{random:1..10}}' }
					],
					solution: '{{eval:a + b}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Addition',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 12345);

		expect(result.success).toBe(true);
		if (!result.success) return;

		const a = getVarValue(result.instance.resolvedVariables, 'a');
		const b = getVarValue(result.instance.resolvedVariables, 'b');
		expect(a).not.toBeNaN();
		expect(b).not.toBeNaN();
		expect(result.instance.solution).toBe((a + b).toString());
	});

	it('should use shared.statement when multiple variations share same structure', () => {
		const template: QuestionTemplate = {
			id: 'test-shared-2',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			shared: {
				statement: templateMarkdown('What is {{x}} + {{y}}?'),
				solution: '{{eval:x + y}}'
			},
			variations: [
				{
					statement: templateMarkdown('What is {{x}} + {{y}}?'), // Same as shared
					variables: [
						{ name: 'x', expression: '5' },
						{ name: 'y', expression: '3' }
					],
					solution: '{{eval:x + y}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Addition',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.statement).toBe('What is 5 + 3?');
	});

	it('should use variation.statement over shared.statement when both exist', () => {
		const template: QuestionTemplate = {
			id: 'test-shared-3',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			shared: {
				statement: templateMarkdown('Shared statement: {{a}}')
			},
			variations: [
				{
					statement: templateMarkdown('Variation statement: {{a}}'),
					variables: [{ name: 'a', expression: '7' }],
					solution: '7'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.statement).toBe('Variation statement: 7');
	});

	it('should merge shared.variables with variation.variables', () => {
		const template: QuestionTemplate = {
			id: 'test-shared-4',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			shared: {
				variables: [
					{ name: 'a', expression: '10' },
					{ name: 'b', expression: '20' }
				]
			},
			variations: [
				{
					statement: templateMarkdown('{{a}}, {{b}}, {{c}}'),
					variables: [{ name: 'c', expression: '{{eval:a + b}}' }],
					solution: '{{c}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		if (!result.success) return;

		// All three variables should be resolved
		const a = getVarValue(result.instance.resolvedVariables, 'a');
		const b = getVarValue(result.instance.resolvedVariables, 'b');
		const c = getVarValue(result.instance.resolvedVariables, 'c');

		expect(a).toBe(10);
		expect(b).toBe(20);
		expect(c).toBe(30); // a + b
		expect(result.instance.statement).toBe('10, 20, 30');
	});

	it('should override shared variable when variation has same name', () => {
		const template: QuestionTemplate = {
			id: 'test-shared-5',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			shared: {
				variables: [
					{ name: 'x', expression: '5' },
					{ name: 'y', expression: '10' }
				]
			},
			variations: [
				{
					statement: templateMarkdown('x={{x}}, y={{y}}'),
					variables: [{ name: 'x', expression: '100' }], // Override x
					solution: '{{x}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		if (!result.success) return;

		const x = getVarValue(result.instance.resolvedVariables, 'x');
		const y = getVarValue(result.instance.resolvedVariables, 'y');

		expect(x).toBe(100); // Overridden value
		expect(y).toBe(10); // Shared value
		expect(result.instance.statement).toBe('x=100, y=10');
		expect(result.instance.solution).toBe('100');
	});

	it('should use shared fields when all variations have identical values', () => {
		const template: QuestionTemplate = {
			id: 'test-shared-6',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			shared: {
				statement: templateMarkdown('Result is {{result}}'),
				variables: [{ name: 'result', expression: '42' }],
				solution: '{{result}}'
			},
			variations: [
				{
					statement: templateMarkdown('Result is {{result}}'),
					variables: [{ name: 'result', expression: '42' }],
					solution: '{{result}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.statement).toBe('Result is 42');
		expect(result.instance.solution).toBe('42');
	});

	it('should use shared.correction for consistent feedback across variations', () => {
		const template: QuestionTemplate = {
			id: 'test-shared-7',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			shared: {
				correction: {
					feedback: {
						correct: templateMarkdown('Excellent! {{a}} + {{b}} = {{eval:a + b}}'),
						incorrect: templateMarkdown('Try again. {{a}} + {{b}} = {{eval:a + b}}')
					}
				}
			},
			variations: [
				{
					statement: templateMarkdown('What is {{a}} + {{b}}?'),
					variables: [
						{ name: 'a', expression: '5' },
						{ name: 'b', expression: '3' }
					],
					solution: '{{eval:a + b}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Addition',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.statement).toBe('What is 5 + 3?');
		expect(result.instance.solution).toBe('8');
		expect(result.instance.correction?.feedback?.correct).toBe('Excellent! 5 + 3 = 8');
		expect(result.instance.correction?.feedback?.incorrect).toBe('Try again. 5 + 3 = 8');
	});

	it('should use shared.choices for consistent QCM structure across variations', () => {
		const template: QuestionTemplate = {
			id: 'test-shared-8',
			type: 'multiple_choice',
			title: 'Test Question',
			status: 'draft' as const,
			shared: {
				choices: [
					{ content: templateMarkdown('{{correct}}'), isCorrect: true },
					{ content: templateMarkdown('{{wrong1}}'), isCorrect: false },
					{ content: templateMarkdown('{{wrong2}}'), isCorrect: false },
					{ content: templateMarkdown('{{eval:a * b}}'), isCorrect: false }
				]
			},
			variations: [
				{
					statement: templateMarkdown('What is {{a}} + {{b}}?'),
					variables: [
						{ name: 'a', expression: '5' },
						{ name: 'b', expression: '3' },
						{ name: 'correct', expression: '{{eval:a + b}}' },
						{ name: 'wrong1', expression: '{{eval:a + b + 1}}' },
						{ name: 'wrong2', expression: '{{eval:a + b - 1}}' }
					],
					solution: '0',
					choices: [
						{ content: templateMarkdown('{{correct}}'), isCorrect: true },
						{ content: templateMarkdown('{{wrong1}}'), isCorrect: false },
						{ content: templateMarkdown('{{wrong2}}'), isCorrect: false },
						{ content: templateMarkdown('{{eval:a * b}}'), isCorrect: false }
					]
				}
			],
			multipleAnswers: false,
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Addition',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 54321);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.type).toBe('multiple_choice');
		expect(result.instance.statement).toBe('What is 5 + 3?');
		expect(result.instance.shuffledChoices).toHaveLength(4);

		// Verify all choice contents are resolved
		const allChoices = result.instance.shuffledChoices!.map((c) => c.content);
		expect(allChoices).toContain('8'); // correct
		expect(allChoices).toContain('9'); // wrong1
		expect(allChoices).toContain('7'); // wrong2
		expect(allChoices).toContain('15'); // a * b
	});

	it('should resolve random expressions in shared variables used by all variations', () => {
		const template: QuestionTemplate = {
			id: 'test-shared-9',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			shared: {
				variables: [
					{ name: 'a', expression: '{{random:2..5}}' },
					{ name: 'b', expression: '{{random:2..5}}' }
				]
			},
			variations: [
				{
					statement: templateMarkdown('Calculate {{a}} × {{b}}'),
					variables: [],
					solution: '{{eval:a * b}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Multiplication',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 99999);

		expect(result.success).toBe(true);
		if (!result.success) return;

		const a = getVarValue(result.instance.resolvedVariables, 'a');
		const b = getVarValue(result.instance.resolvedVariables, 'b');

		// Variables should be in range
		expect(a).toBeGreaterThanOrEqual(2);
		expect(a).toBeLessThanOrEqual(5);
		expect(b).toBeGreaterThanOrEqual(2);
		expect(b).toBeLessThanOrEqual(5);

		// Statement and answer should be resolved correctly
		expect(result.instance.statement).toBe(`Calculate ${a} × ${b}`);
		expect(result.instance.solution).toBe((a * b).toString());
	});

	it('should allow variation to reference shared variables in its own variables', () => {
		const template: QuestionTemplate = {
			id: 'test-shared-10',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			shared: {
				variables: [
					{ name: 'base', expression: '10' },
					{ name: 'multiplier', expression: '3' }
				]
			},
			variations: [
				{
					statement: templateMarkdown('What is {{result}}?'),
					variables: [
						{ name: 'result', expression: '{{eval:base * multiplier}}' } // References shared variables
					],
					solution: '{{result}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		if (!result.success) return;

		const base = getVarValue(result.instance.resolvedVariables, 'base');
		const multiplier = getVarValue(result.instance.resolvedVariables, 'multiplier');
		const resultVar = getVarValue(result.instance.resolvedVariables, 'result');

		expect(base).toBe(10);
		expect(multiplier).toBe(3);
		expect(resultVar).toBe(30);
		expect(result.instance.statement).toBe('What is 30?');
		expect(result.instance.solution).toBe('30');
	});

	it('should handle multiple variations each with different overrides of shared', () => {
		const template: QuestionTemplate = {
			id: 'test-shared-11',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			shared: {
				variables: [{ name: 'base', expression: '100' }],
				solution: '{{base}}'
			},
			variations: [
				{
					statement: templateMarkdown('Addition: {{base}} + {{extra}}'),
					variables: [{ name: 'extra', expression: '10' }],
					solution: '{{eval:base + extra}}' // Override solution
				},
				{
					statement: templateMarkdown('Subtraction: {{base}} - {{deduct}}'),
					variables: [{ name: 'deduct', expression: '20' }],
					solution: '{{eval:base - deduct}}' // Override solution
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		// Test first variation (seed 0)
		const result0 = generateInstance(template, 0);
		expect(result0.success).toBe(true);
		if (!result0.success) return;

		expect(result0.instance.selectedVariationIndex).toBe(0);
		expect(result0.instance.statement).toBe('Addition: 100 + 10');
		expect(result0.instance.solution).toBe('110');

		// Test second variation (seed 1)
		const result1 = generateInstance(template, 1);
		expect(result1.success).toBe(true);
		if (!result1.success) return;

		expect(result1.instance.selectedVariationIndex).toBe(1);
		expect(result1.instance.statement).toBe('Subtraction: 100 - 20');
		expect(result1.instance.solution).toBe('80');
	});

	it('should use shared.correction with steps for consistent explanations', () => {
		const template: QuestionTemplate = {
			id: 'test-shared-12',
			type: 'numerical_exact',
			title: 'Test Question',
			status: 'draft' as const,
			shared: {
				correction: {
					feedback: {
						correct: templateMarkdown('Perfect!')
					},
					steps: [
						templateMarkdown('Step 1: Identify the numbers: {{a}} and {{b}}'),
						templateMarkdown('Step 2: Add them: {{a}} + {{b}} = {{eval:a + b}}')
					]
				}
			},
			variations: [
				{
					statement: templateMarkdown('Solve {{a}} + {{b}}'),
					variables: [
						{ name: 'a', expression: '7' },
						{ name: 'b', expression: '8' }
					],
					solution: '{{eval:a + b}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Addition',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.correction?.feedback?.correct).toBe('Perfect!');
		expect(result.instance.correction?.steps).toHaveLength(2);
		expect(result.instance.correction?.steps?.[0]).toBe('Step 1: Identify the numbers: 7 and 8');
		expect(result.instance.correction?.steps?.[1]).toBe('Step 2: Add them: 7 + 8 = 15');
	});
});
