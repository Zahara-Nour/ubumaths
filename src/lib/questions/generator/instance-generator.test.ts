/**
 * Instance Generator Tests
 * =========================
 *
 * Tests for the main instance generation orchestrator.
 * This is the entry point that validates, resolves variables, and generates full question instances.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from './instance-generator';
import type { QuestionTemplate } from '../types';

describe('generateInstance - Numerical Exact Questions', () => {
	it('should generate simple numerical question instance', () => {
		const template: QuestionTemplate = {
			id: 'test-1',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Calculate {@:a} + {@:b}' }],
			variables: [
				{ name: 'a', expression: '{#:1-10}' },
				{ name: 'b', expression: '{#:1-10}' }
			],
			answer: '{eval:{@:a} + {@:b}}',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		expect(result.instance).toBeDefined();
		expect(result.instance!.type).toBe('numerical_exact');
		expect(result.instance!.resolvedVariables).toHaveProperty('a');
		expect(result.instance!.resolvedVariables).toHaveProperty('b');
		expect(result.instance!.answer).toBe(
			result.instance!.resolvedVariables.a + result.instance!.resolvedVariables.b
		);
	});

	it('should generate reproducible instance with seed', () => {
		const template: QuestionTemplate = {
			id: 'test-2',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Value: {@:x}' }],
			variables: [{ name: 'x', expression: '{#:1-100}' }],
			answer: '{@:x}',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result1 = generateInstance(template, 12345);
		const result2 = generateInstance(template, 12345);

		expect(result1.instance).toEqual(result2.instance);
	});

	it('should generate different instances with different seeds', () => {
		const template: QuestionTemplate = {
			id: 'test-3',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Value: {@:x}' }],
			variables: [{ name: 'x', expression: '{#:1-1000}' }],
			answer: '{@:x}',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result1 = generateInstance(template, 11111);
		const result2 = generateInstance(template, 22222);

		expect(result1.instance!.resolvedVariables.x).not.toBe(
			result2.instance!.resolvedVariables.x
		);
	});
});

describe('generateInstance - Algebraic Transform Questions', () => {
	it('should generate algebraic transform instance', () => {
		const template: QuestionTemplate = {
			id: 'test-4',
			type: 'algebraic_transform',
			statement: [{ type: 'text', content: 'Factor: $$x^2 - {@:c}$$' }],
			variables: [
				{ name: 'a', expression: '{#:2-9}' },
				{ name: 'c', expression: '{eval:{@:a}^2}' }
			],
			answer: '(x-{@:a})(x+{@:a})',
			transform_type: 'factor',
			grades: ['3'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		expect(result.instance!.type).toBe('algebraic_transform');
		expect(result.instance!.transform_type).toBe('factor');
		expect(result.instance!.resolvedVariables.c).toBe(
			result.instance!.resolvedVariables.a ** 2
		);
	});
});

describe('generateInstance - Fill-in-Blanks Questions', () => {
	it('should generate fill-in-blanks instance', () => {
		const template: QuestionTemplate = {
			id: 'test-5',
			type: 'fill_in_blanks',
			statement: [{ type: 'text', content: 'Complete: {@:a} + {@:b} = ___' }],
			variables: [
				{ name: 'a', expression: '{#:1-10}' },
				{ name: 'b', expression: '{#:1-10}' }
			],
			answer: ['{eval:{@:a} + {@:b}}'],
			blanks: [0],
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		expect(result.instance!.type).toBe('fill_in_blanks');
		expect(Array.isArray(result.instance!.answer)).toBe(true);
		expect(result.instance!.answer[0]).toBe(
			result.instance!.resolvedVariables.a + result.instance!.resolvedVariables.b
		);
	});

	it('should generate fill-in-blanks with multiple blanks', () => {
		const template: QuestionTemplate = {
			id: 'test-6',
			type: 'fill_in_blanks',
			statement: [{ type: 'text', content: '___ + ___ = {@:sum}' }],
			variables: [
				{ name: 'a', expression: '{#:1-10}' },
				{ name: 'b', expression: '{#:1-10}' },
				{ name: 'sum', expression: '{eval:{@:a} + {@:b}}' }
			],
			answer: ['{@:a}', '{@:b}'],
			blanks: [0, 1],
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		expect(result.instance!.answer).toHaveLength(2);
		expect(result.instance!.blanks).toEqual([0, 1]);
	});
});

describe('generateInstance - Multiple Choice Questions', () => {
	it('should generate multiple choice instance with shuffled choices', () => {
		const template: QuestionTemplate = {
			id: 'test-7',
			type: 'multiple_choice',
			statement: [{ type: 'text', content: 'What is {@:a} + {@:b}?' }],
			variables: [
				{ name: 'a', expression: '{#:1-10}' },
				{ name: 'b', expression: '{#:1-10}' },
				{ name: 'correct', expression: '{eval:{@:a} + {@:b}}' },
				{ name: 'wrong1', expression: '{eval:{@:a} + {@:b} + 1}' },
				{ name: 'wrong2', expression: '{eval:{@:a} + {@:b} - 1}' }
			],
			answer: '0',
			choices: ['{@:correct}', '{@:wrong1}', '{@:wrong2}', '{eval:{@:a} * {@:b}}'],
			multiple_answers: false,
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 12345);

		expect(result.success).toBe(true);
		expect(result.instance!.type).toBe('multiple_choice');
		expect(result.instance!.shuffledChoices).toHaveLength(4);
		expect(result.instance!.multiple_answers).toBe(false);

		// Verify correct answer is tracked
		const correctAnswer = result.instance!.resolvedVariables.correct;
		const shuffledCorrectIndex = parseInt(result.instance!.answer as string);
		expect(result.instance!.shuffledChoices![shuffledCorrectIndex]).toBe(
			correctAnswer.toString()
		);
	});

	it('should generate multiple choice with multiple correct answers', () => {
		const template: QuestionTemplate = {
			id: 'test-8',
			type: 'multiple_choice',
			statement: [{ type: 'text', content: 'Select all prime numbers:' }],
			variables: [],
			answer: ['0', '2'],
			choices: ['2', '4', '7', '9'],
			multiple_answers: true,
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 54321);

		expect(result.success).toBe(true);
		expect(result.instance!.multiple_answers).toBe(true);
		expect(Array.isArray(result.instance!.answer)).toBe(true);

		const answerIndices = result.instance!.answer as string[];
		const correctChoices = answerIndices.map(
			(i) => result.instance!.shuffledChoices![parseInt(i)]
		);

		expect(correctChoices).toContain('2');
		expect(correctChoices).toContain('7');
	});
});

describe('generateInstance - Complex Variable Resolution', () => {
	it('should generate fraction addition instance', () => {
		const template: QuestionTemplate = {
			id: 'test-9',
			type: 'numerical_exact',
			statement: [
				{
					type: 'text',
					content: 'Calculer: $$\\frac{{@:num1}}{{@:den}} + \\frac{{@:num2}}{{@:den}}$$'
				}
			],
			variables: [
				{ name: 'den', expression: '{#:2-9}' },
				{ name: 'num1', expression: '{#:1-{@:den}-1}' },
				{ name: 'num2', expression: '{#:1-{@:den}-1!{@:num1}}' }
			],
			answer: '{eval:({@:num1}+{@:num2})/{@:den}}',
			precision: { type: 'none' },
			grades: ['6', '5'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 99999);

		expect(result.success).toBe(true);

		const { num1, num2, den } = result.instance!.resolvedVariables;
		expect(num1).not.toBe(num2); // Exclusion working
		expect(num1).toBeLessThan(den); // Bounds working
		expect(num2).toBeLessThan(den);
		expect(result.instance!.answer).toBeCloseTo((num1 + num2) / den, 5);
	});

	it('should generate GCD simplification instance', () => {
		const template: QuestionTemplate = {
			id: 'test-10',
			type: 'numerical_exact',
			statement: [
				{ type: 'text', content: 'Simplifier: $$\\frac{{@:num}}{{@:den}}$$' }
			],
			variables: [
				{ name: 'gcd', expression: '{#:2-5}' },
				{ name: 'a', expression: '{#:2-9}' },
				{ name: 'b', expression: '{#:2-9!{@:a}}' },
				{ name: 'num', expression: '{eval:{@:a}*{@:gcd}}' },
				{ name: 'den', expression: '{eval:{@:b}*{@:gcd}}' }
			],
			answer: '{eval:{@:num}/{@:den}}',
			precision: { type: 'none' },
			grades: ['6', '5'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 33333);

		expect(result.success).toBe(true);

		const { gcd, a, b, num, den } = result.instance!.resolvedVariables;
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
			statement: [{ type: 'text', content: 'What is {@:x} × {@:y}?' }],
			variables: [
				{ name: 'x', expression: '{#:2-9}' },
				{ name: 'y', expression: '{#:2-9}' }
			],
			answer: '{eval:{@:x} * {@:y}}',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 77777);

		expect(result.success).toBe(true);

		const { x, y } = result.instance!.resolvedVariables;
		expect(result.instance!.statement[0].content).toBe(`What is ${x} × ${y}?`);
	});

	it('should resolve LaTeX in statement', () => {
		const template: QuestionTemplate = {
			id: 'test-12',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: '$$\\frac{{@:a}}{{@:b}}$$' }],
			variables: [
				{ name: 'a', expression: '{#:1-10}' },
				{ name: 'b', expression: '{#:1-10}' }
			],
			answer: '{eval:{@:a}/{@:b}}',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 44444);

		expect(result.success).toBe(true);

		const { a, b } = result.instance!.resolvedVariables;
		expect(result.instance!.statement[0].content).toBe(`$$\\frac{${a}}{${b}}$$`);
	});

	it('should resolve correction field', () => {
		const template: QuestionTemplate = {
			id: 'test-13',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Calculate {@:a} + {@:b}' }],
			variables: [
				{ name: 'a', expression: '{#:1-10}' },
				{ name: 'b', expression: '{#:1-10}' }
			],
			answer: '{eval:{@:a} + {@:b}}',
			precision: { type: 'none' },
			grades: ['6'],
			correction: [
				{ type: 'text', content: 'The answer is {@:a} + {@:b} = {eval:{@:a} + {@:b}}' }
			],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 66666);

		expect(result.success).toBe(true);

		const { a, b } = result.instance!.resolvedVariables;
		const sum = a + b;
		expect(result.instance!.correction![0].content).toBe(
			`The answer is ${a} + ${b} = ${sum}`
		);
	});
});

describe('generateInstance - Precision Handling', () => {
	it('should include decimal precision', () => {
		const template: QuestionTemplate = {
			id: 'test-14',
			type: 'numerical_decimal',
			statement: [{ type: 'text', content: 'Calculate {@:a} / {@:b}' }],
			variables: [
				{ name: 'a', expression: '{#:1-10}' },
				{ name: 'b', expression: '{#:2-9}' }
			],
			answer: '{eval:{@:a}/{@:b}}',
			precision: { type: 'decimal', digits: 2 },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		expect(result.instance!.precision).toEqual({ type: 'decimal', digits: 2 });
	});

	it('should include tolerance precision', () => {
		const template: QuestionTemplate = {
			id: 'test-15',
			type: 'numerical_rounded',
			statement: [{ type: 'text', content: 'Estimate sqrt({@:a})' }],
			variables: [{ name: 'a', expression: '{#:10-100}' }],
			answer: '{eval:sqrt({@:a})}',
			precision: { type: 'tolerance', tolerance: 0.1, mode: 'absolute' },
			grades: ['3'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		expect(result.instance!.precision).toEqual({
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
			statement: [{ type: 'text', content: 'Value: {@:a}' }],
			variables: [
				{ name: 'a', expression: '{@:b}' },
				{ name: 'b', expression: '{@:a}' }
			],
			answer: '{@:a}',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(false);
		expect(result.errors).toBeDefined();
		expect(result.errors!.length).toBeGreaterThan(0);
	});

	it('should fail on min > max after variable resolution', () => {
		const template: QuestionTemplate = {
			id: 'test-17',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Value: {@:x}' }],
			variables: [
				{ name: 'min', expression: '10' },
				{ name: 'max', expression: '5' },
				{ name: 'x', expression: '{#:{@:min}-{@:max}}' }
			],
			answer: '{@:x}',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(false);
		expect(result.errors).toBeDefined();
	});

	it('should fail on invalid eval expression', () => {
		const template: QuestionTemplate = {
			id: 'test-18',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Value' }],
			variables: [{ name: 'a', expression: '{eval:invalid syntax}' }],
			answer: '{@:a}',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(false);
		expect(result.errors).toBeDefined();
	});
});

describe('generateInstance - Edge Cases', () => {
	it('should generate instance with no variables', () => {
		const template: QuestionTemplate = {
			id: 'test-19',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'What is 2 + 2?' }],
			variables: [],
			answer: '4',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		expect(result.instance!.resolvedVariables).toEqual({});
		expect(result.instance!.answer).toBe('4');
	});

	it('should generate instance with delay parameter', () => {
		const template: QuestionTemplate = {
			id: 'test-20',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [],
			answer: '42',
			precision: { type: 'none' },
			grades: ['6'],
			delay: 120,
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		expect(result.instance!.delay).toBe(120);
	});

	it('should generate instance with multiple statement fields', () => {
		const template: QuestionTemplate = {
			id: 'test-21',
			type: 'numerical_exact',
			statement: [
				{ type: 'text', content: 'Given {@:a}' },
				{ type: 'image', content: 'https://example.com/image.png' },
				{ type: 'text', content: 'Calculate {@:a} × 2' }
			],
			variables: [{ name: 'a', expression: '{#:1-10}' }],
			answer: '{eval:{@:a} * 2}',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		expect(result.success).toBe(true);
		expect(result.instance!.statement).toHaveLength(3);

		const a = result.instance!.resolvedVariables.a;
		expect(result.instance!.statement[0].content).toBe(`Given ${a}`);
		expect(result.instance!.statement[2].content).toBe(`Calculate ${a} × 2`);
	});
});

describe('generateInstance - Real-World Templates', () => {
	it('should generate quadratic equation instance', () => {
		const template: QuestionTemplate = {
			id: 'test-22',
			type: 'algebraic_transform',
			statement: [{ type: 'text', content: 'Résoudre: ${@:a}x^2 + {@:b}x + {@:c} = 0$' }],
			variables: [
				{ name: 'a', expression: '{#:1-5}' },
				{ name: 'b', expression: '{#:-10-10}' },
				{ name: 'c', expression: '{#:-10-10}' },
				{ name: 'disc', expression: '{eval:{@:b}^2 - 4*{@:a}*{@:c}}' }
			],
			answer: 'x = \\frac{-{@:b} \\pm \\sqrt{{@:disc}}}{2{@:a}}',
			transform_type: 'solve',
			grades: ['3', '2', '1'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 88888);

		expect(result.success).toBe(true);

		const { a, b, c, disc } = result.instance!.resolvedVariables;
		expect(disc).toBe(b ** 2 - 4 * a * c);
	});

	it('should generate percentage calculation instance', () => {
		const template: QuestionTemplate = {
			id: 'test-23',
			type: 'numerical_exact',
			statement: [
				{
					type: 'text',
					content:
						'Un article coûte {@:price}€. Il y a {@:discount}% de réduction. Quel est le prix final?'
				}
			],
			variables: [
				{ name: 'price', expression: '{#:50-200}' },
				{ name: 'discount', expression: '{#:10-50}' },
				{ name: 'reduction', expression: '{eval:{@:price} * {@:discount} / 100}' }
			],
			answer: '{eval:{@:price} - {@:reduction}}',
			precision: { type: 'decimal', digits: 2 },
			grades: ['6', '5'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template, 55555);

		expect(result.success).toBe(true);

		const { price, discount, reduction } = result.instance!.resolvedVariables;
		expect(reduction).toBeCloseTo((price * discount) / 100, 5);
		expect(result.instance!.answer).toBeCloseTo(price - reduction, 5);
	});
});
