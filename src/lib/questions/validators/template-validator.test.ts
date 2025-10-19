/**
 * Template Validator Tests
 * =========================
 *
 * Tests for validating question template structure and syntax.
 */

import { describe, it, expect } from 'vitest';
import { validateTemplate } from './template-validator';
import type { QuestionTemplate } from '../types';

describe('validateTemplate - Valid Templates', () => {
	it('should validate simple numerical exact template', () => {
		const template: QuestionTemplate = {
			id: 'test-1',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Calculate 2 + 3' }],
			variables: [],
			answer: '5',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it('should validate template with variables', () => {
		const template: QuestionTemplate = {
			id: 'test-2',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Calculate {@:a} + {@:b}' }],
			variables: [
				{ name: 'a', expression: '{#:1-10}' },
				{ name: 'b', expression: '{#:1-10}' }
			],
			answer: '{eval:{@:a} + {@:b}}',
			precision: { type: 'none' },
			grades: ['6', '5'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it('should validate all question types', () => {
		const types = [
			'numerical_exact',
			'numerical_decimal',
			'numerical_rounded',
			'algebraic_transform',
			'fill_in_blanks',
			'multiple_choice'
		] as const;

		for (const type of types) {
			const template: any = {
				id: `test-${type}`,
				type,
				statement: [{ type: 'text', content: 'Question' }],
				variables: [],
				answer: type === 'fill_in_blanks' ? ['answer'] : type === 'multiple_choice' ? '0' : '42',
				precision: { type: 'none' },
				grades: ['6'],
				created_at: new Date(),
				updated_at: new Date(),
				created_by: 'test-user'
			};

			if (type === 'algebraic_transform') {
				template.transform_type = 'simplify';
			}

			if (type === 'fill_in_blanks') {
				template.blanks = [0];
			}

			if (type === 'multiple_choice') {
				template.choices = ['A', 'B', 'C', 'D'];
				template.multiple_answers = false;
			}

			const result = validateTemplate(template);
			expect(result.valid).toBe(true);
		}
	});
});

describe('validateTemplate - Required Fields', () => {
	it('should fail on missing id', () => {
		const template: any = {
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [],
			answer: '5',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Template must have an id');
	});

	it('should fail on missing type', () => {
		const template: any = {
			id: 'test',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [],
			answer: '5',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Template must have a type');
	});

	it('should fail on missing statement', () => {
		const template: any = {
			id: 'test',
			type: 'numerical_exact',
			variables: [],
			answer: '5',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('statement'))).toBe(true);
	});

	it('should fail on missing answer', () => {
		const template: any = {
			id: 'test',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [],
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('answer'))).toBe(true);
	});

	it('should fail on missing grades', () => {
		const template: any = {
			id: 'test',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [],
			answer: '5',
			precision: { type: 'none' },
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('grades'))).toBe(true);
	});

	it('should fail on empty grades array', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [],
			answer: '5',
			precision: { type: 'none' },
			grades: [],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('at least one grade'))).toBe(true);
	});
});

describe('validateTemplate - Statement Validation', () => {
	it('should fail on empty statement array', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			statement: [],
			variables: [],
			answer: '5',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('at least one statement field'))).toBe(true);
	});

	it('should fail on statement with all empty text fields', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			statement: [
				{ type: 'text', content: '' },
				{ type: 'text', content: '   ' }
			],
			variables: [],
			answer: '5',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('non-empty text field'))).toBe(true);
	});

	it('should validate statement with image field', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			statement: [
				{ type: 'text', content: 'What is this?' },
				{ type: 'image', content: 'https://example.com/image.png' }
			],
			variables: [],
			answer: '5',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(true);
	});
});

describe('validateTemplate - Variable Validation', () => {
	it('should fail on duplicate variable names', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [
				{ name: 'a', expression: '{#:1-10}' },
				{ name: 'a', expression: '{#:1-10}' }
			],
			answer: '{@:a}',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('Duplicate variable name'))).toBe(true);
	});

	it('should fail on invalid variable name (empty)', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [{ name: '', expression: '{#:1-10}' }],
			answer: '5',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('Invalid variable name'))).toBe(true);
	});

	it('should fail on invalid variable name (special characters)', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [{ name: 'my-var', expression: '{#:1-10}' }],
			answer: '5',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('Invalid variable name'))).toBe(true);
	});

	it('should validate valid variable names', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [
				{ name: 'a', expression: '{#:1-10}' },
				{ name: '_private', expression: '{#:1-10}' },
				{ name: 'var123', expression: '{#:1-10}' },
				{ name: 'my_var', expression: '{#:1-10}' }
			],
			answer: '5',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(true);
	});
});

describe('validateTemplate - Type-Specific Validation', () => {
	it('should fail algebraic_transform without transform_type', () => {
		const template: any = {
			id: 'test',
			type: 'algebraic_transform',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [],
			answer: 'x + 1',
			grades: ['3'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('transform_type'))).toBe(true);
	});

	it('should validate algebraic_transform with all transform types', () => {
		const transformTypes = ['simplify', 'expand', 'factor', 'solve', 'canonical'];

		for (const transform_type of transformTypes) {
			const template: QuestionTemplate = {
				id: `test-${transform_type}`,
				type: 'algebraic_transform',
				statement: [{ type: 'text', content: 'Question' }],
				variables: [],
				answer: 'x + 1',
				transform_type: transform_type as any,
				grades: ['3'],
				created_at: new Date(),
				updated_at: new Date(),
				created_by: 'test-user'
			};

			const result = validateTemplate(template);
			expect(result.valid).toBe(true);
		}
	});

	it('should fail fill_in_blanks without blanks array', () => {
		const template: any = {
			id: 'test',
			type: 'fill_in_blanks',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [],
			answer: ['answer'],
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('blanks'))).toBe(true);
	});

	it('should fail fill_in_blanks with non-array answer', () => {
		const template: any = {
			id: 'test',
			type: 'fill_in_blanks',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [],
			answer: 'single answer',
			blanks: [0],
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('must be an array'))).toBe(true);
	});

	it('should fail multiple_choice without choices', () => {
		const template: any = {
			id: 'test',
			type: 'multiple_choice',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [],
			answer: '0',
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('choices'))).toBe(true);
	});

	it('should fail multiple_choice with less than 2 choices', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'multiple_choice',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [],
			answer: '0',
			choices: ['Only one'],
			multiple_answers: false,
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('at least 2 choices'))).toBe(true);
	});

	it('should fail multiple_choice without multiple_answers field', () => {
		const template: any = {
			id: 'test',
			type: 'multiple_choice',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [],
			answer: '0',
			choices: ['A', 'B', 'C'],
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('multiple_answers'))).toBe(true);
	});
});

describe('validateTemplate - Edge Cases', () => {
	it('should validate template with optional delay', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [],
			answer: '5',
			precision: { type: 'none' },
			grades: ['6'],
			delay: 120,
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(true);
	});

	it('should validate template with optional correction', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [],
			answer: '5',
			precision: { type: 'none' },
			grades: ['6'],
			correction: [{ type: 'text', content: 'The answer is 5' }],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(true);
	});

	it('should validate template with all grade levels', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [],
			answer: '5',
			precision: { type: 'none' },
			grades: ['6', '5', '4', '3', '2', '1', 'Tale'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(true);
	});

	it('should fail on invalid grade level', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Question' }],
			variables: [],
			answer: '5',
			precision: { type: 'none' },
			grades: ['6', 'invalid' as any],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('Invalid grade level'))).toBe(true);
	});

	it('should validate template with very long statement', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'a'.repeat(5000) }],
			variables: [],
			answer: '5',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(true);
	});

	it('should validate template with many variables', () => {
		const variables = Array.from({ length: 50 }, (_, i) => ({
			name: `var${i}`,
			expression: '{#:1-10}'
		}));

		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			statement: [{ type: 'text', content: 'Question' }],
			variables,
			answer: '5',
			precision: { type: 'none' },
			grades: ['6'],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(true);
	});
});

describe('validateTemplate - Multiple Errors', () => {
	it('should collect multiple validation errors', () => {
		const template: any = {
			id: 'test',
			type: 'algebraic_transform',
			statement: [],
			variables: [
				{ name: 'a', expression: '{#:1-10}' },
				{ name: 'a', expression: '{#:1-10}' }
			],
			answer: 'x',
			grades: [],
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(1);

		// Should have errors for: empty statement, duplicate variable, empty grades, missing transform_type
		expect(result.errors.some((e) => e.includes('statement'))).toBe(true);
		expect(result.errors.some((e) => e.includes('Duplicate'))).toBe(true);
		expect(result.errors.some((e) => e.includes('grade'))).toBe(true);
		expect(result.errors.some((e) => e.includes('transform_type'))).toBe(true);
	});
});
