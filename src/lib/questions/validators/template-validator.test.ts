/**
 * Template Validator Tests
 * =========================
 *
 * Tests for validating question template structure and syntax.
 * Updated for variations structure.
 */

import { describe, it, expect } from 'vitest';
import { validateTemplate } from './template-validator';
import type { QuestionTemplate } from '../types';

describe('validateTemplate - Valid Templates', () => {
	it('should validate simple numerical exact template', () => {
		const template: QuestionTemplate = {
			id: 'test-1',
			type: 'numerical_exact',
			title: 'Simple Addition',
			status: 'published',
			variations: [
				{
					statement: [{ type: 'text', content: 'Calculate 2 + 3' }],
					variables: [],
					answer: '5'
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

		const errors = validateTemplate(template);

		expect(errors).toEqual([]);
	});

	it('should validate template with variables', () => {
		const template: QuestionTemplate = {
			id: 'test-2',
			type: 'numerical_exact',
			title: 'Test with Variables',
			status: 'published',
			variations: [
				{
					statement: [{ type: 'text', content: 'Calculate {@:a} + {@:b}' }],
					variables: [
						{ name: 'a', expression: '{#:1-10}' },
						{ name: 'b', expression: '{#:1-10}' }
					],
					answer: '{eval:{@:a} + {@:b}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6', '5'],
			theme: 'Arithmétique',
			domain: 'Addition',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const errors = validateTemplate(template);

		expect(errors).toEqual([]);
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
			const template: QuestionTemplate = {
				id: `test-${type}`,
				type,
				title: `Test ${type}`,
				status: 'published' as const,
				variations: [
					{
						statement: [{ type: 'text', content: 'Question' }],
						variables: [],
						answer:
							type === 'fill_in_blanks' ? ['answer'] : type === 'multiple_choice' ? '0' : '42',
						blanks:
							type === 'fill_in_blanks' ? [{ position: 0, expectedAnswer: 'answer' }] : undefined,
						choices:
							type === 'multiple_choice'
								? [
										{ content: { type: 'text', content: 'A' }, isCorrect: true },
										{ content: { type: 'text', content: 'B' }, isCorrect: false },
										{ content: { type: 'text', content: 'C' }, isCorrect: false },
										{ content: { type: 'text', content: 'D' }, isCorrect: false }
									]
								: undefined
					}
				],
				precision: { type: 'none' },
				grades: ['6'],
				theme: 'Test',
				domain: 'Test',
				level: 1,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				created_by: 'test-user',
				transformType: type === 'algebraic_transform' ? 'simplify' : undefined,
				multipleAnswers: type === 'multiple_choice' ? false : undefined
			};

			const errors = validateTemplate(template);
			expect(errors).toEqual([]);
		}
	});

	it('should validate template with multiple variations', () => {
		const template: QuestionTemplate = {
			id: 'test-multi-var',
			type: 'numerical_exact',
			title: 'Test Multiple Variations',
			status: 'published',
			variations: [
				{
					statement: [{ type: 'text', content: 'Calculate {@:a} + {@:b}' }],
					variables: [
						{ name: 'a', expression: '{#:1-10}' },
						{ name: 'b', expression: '{#:1-10}' }
					],
					answer: '{eval:{@:a}+{@:b}}'
				},
				{
					statement: [{ type: 'text', content: 'Calculate {@:a} - {@:b}' }],
					variables: [
						{ name: 'a', expression: '{#:10-20}' },
						{ name: 'b', expression: '{#:1-{@:a}}' }
					],
					answer: '{eval:{@:a}-{@:b}}'
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

		const errors = validateTemplate(template);

		expect(errors).toEqual([]);
	});
});

describe('validateTemplate - Required Fields', () => {
	it('should fail on missing type', () => {
		const template = {
			id: 'test',
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: [],
					answer: '5'
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
		} as unknown as QuestionTemplate;

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('type'))).toBe(true);
	});

	it('should fail on missing variations', () => {
		const template = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published' as const,
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		} as unknown as QuestionTemplate;

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('variations'))).toBe(true);
	});

	it('should fail on empty variations array', () => {
		const template = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published' as const,
			variations: [],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		} as unknown as QuestionTemplate;

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('variations') && e.includes('at least 1'))).toBe(true);
	});

	it('should fail on missing statement in variation', () => {
		const template = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					variables: [],
					answer: '5'
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
		} as unknown as QuestionTemplate;

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('statement'))).toBe(true);
	});

	it('should fail on missing answer in variation', () => {
		const template = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: []
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
		} as unknown as QuestionTemplate;

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('answer'))).toBe(true);
	});

	it('should fail on missing grades', () => {
		const template = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: [],
					answer: '5'
				}
			],
			precision: { type: 'none' },
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		} as unknown as QuestionTemplate;

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('grades'))).toBe(true);
	});

	it('should fail on empty grades array', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Empty Grades',
			status: 'published',
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: [],
					answer: '5'
				}
			],
			precision: { type: 'none' },
			grades: [],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('grades'))).toBe(true);
	});

	it('should fail on missing theme', () => {
		const template = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: [],
					answer: '5'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		} as unknown as QuestionTemplate;

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('theme'))).toBe(true);
	});

	it('should fail on missing domain', () => {
		const template = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: [],
					answer: '5'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		} as unknown as QuestionTemplate;

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('domain'))).toBe(true);
	});

	it('should fail on missing level', () => {
		const template = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: [],
					answer: '5'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		} as unknown as QuestionTemplate;

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('level'))).toBe(true);
	});
});

describe('validateTemplate - Statement Validation', () => {
	it('should fail on empty statement array', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Empty Statement',
			status: 'published',
			variations: [
				{
					statement: [],
					variables: [],
					answer: '5'
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

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('statement'))).toBe(true);
	});

	it('should fail on statement with empty text content', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: [{ type: 'text', content: '' }],
					variables: [],
					answer: '5'
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

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('Text content'))).toBe(true);
	});

	it('should validate statement with image field', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: [
						{ type: 'text', content: 'What is this?' },
						{ type: 'image', content: 'https://example.com/image.png', alt: 'Example' }
					],
					variables: [],
					answer: '5'
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

		const errors = validateTemplate(template);

		expect(errors).toEqual([]);
	});
});

describe('validateTemplate - Variable Validation', () => {
	it('should fail on duplicate variable names in same variation', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: [
						{ name: 'a', expression: '{#:1-10}' },
						{ name: 'a', expression: '{#:1-10}' }
					],
					answer: '{@:a}'
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

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('Duplicate') || e.includes('duplicate'))).toBe(true);
	});

	it('should fail on missing variable name', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: [{ name: '', expression: '{#:1-10}' }],
					answer: '5'
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

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('must have a name'))).toBe(true);
	});

	it('should validate valid variable names', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: [
						{ name: 'a', expression: '{#:1-10}' },
						{ name: '_private', expression: '{#:1-10}' },
						{ name: 'var123', expression: '{#:1-10}' },
						{ name: 'my_var', expression: '{#:1-10}' }
					],
					answer: '5'
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

		const errors = validateTemplate(template);

		expect(errors).toEqual([]);
	});

	it('should allow same variable names in different variations', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: [{ type: 'text', content: 'Question 1' }],
					variables: [{ name: 'a', expression: '{#:1-10}' }],
					answer: '{@:a}'
				},
				{
					statement: [{ type: 'text', content: 'Question 2' }],
					variables: [{ name: 'a', expression: '{#:10-20}' }], // Same name, different variation OK
					answer: '{@:a}'
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

		const errors = validateTemplate(template);

		expect(errors).toEqual([]);
	});
});

describe('validateTemplate - Type-Specific Validation', () => {
	it('should fail algebraic_transform without transformType', () => {
		const template = {
			id: 'test',
			type: 'algebraic_transform',
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: [],
					answer: 'x + 1'
				}
			],
			grades: ['3'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		} as unknown as QuestionTemplate;

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('transformType'))).toBe(true);
	});

	it('should validate algebraic_transform with all transform types', () => {
		const transformTypes = ['simplify', 'expand', 'factor', 'solve'];

		for (const transformType of transformTypes) {
			const template: QuestionTemplate = {
				id: `test-${transformType}`,
				type: 'algebraic_transform',
				title: `Test ${transformType}`,
				status: 'published',
				variations: [
					{
						statement: [{ type: 'text', content: 'Question' }],
						variables: [],
						answer: 'x + 1'
					}
				],
				transformType: transformType as never,
				grades: ['3'],
				theme: 'Test',
				domain: 'Test',
				level: 1,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				created_by: 'test-user'
			};

			const errors = validateTemplate(template);
			expect(errors).toEqual([]);
		}
	});

	it('should fail fill_in_blanks without blanks array in variation', () => {
		const template = {
			id: 'test',
			type: 'fill_in_blanks',
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: [],
					answer: ['answer']
				}
			],
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		} as unknown as QuestionTemplate;

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('blanks') || e.includes('blank'))).toBe(true);
	});

	it('should fail multiple_choice without choices in variation', () => {
		const template = {
			id: 'test',
			type: 'multiple_choice',
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: [],
					answer: '0'
				}
			],
			multipleAnswers: false,
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		} as unknown as QuestionTemplate;

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('choices'))).toBe(true);
	});

	it('should fail multiple_choice with less than 2 choices', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'multiple_choice',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: [],
					answer: '0',
					choices: [{ content: { type: 'text', content: 'Only one' }, isCorrect: true }]
				}
			],
			multipleAnswers: false,
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('at least 2') || e.includes('2 choices'))).toBe(true);
	});
});

describe('validateTemplate - Variation-Specific Error Messages', () => {
	it('should prefix errors with variation index', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: [{ type: 'text', content: 'Valid' }],
					variables: [],
					answer: '5'
				},
				{
					statement: [], // Invalid
					variables: [],
					answer: '10'
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

		const errors = validateTemplate(template);

		expect(errors.some((e) => e.includes('Variation 2') || e.includes('variation 1'))).toBe(true);
	});

	it('should validate each variation independently', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: [], // Invalid variation 1
					variables: [],
					answer: '5'
				},
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: [],
					answer: '' // Invalid variation 2
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

		const errors = validateTemplate(template);

		// Should have errors for both variations
		expect(errors.length).toBeGreaterThan(1);
	});
});

describe('validateTemplate - Edge Cases', () => {
	it('should validate template with optional delay', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: [],
					answer: '5'
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

		const errors = validateTemplate(template);

		expect(errors).toEqual([]);
	});

	it('should validate template with optional correction in variation', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: [],
					answer: '5',
					correction: [{ type: 'text', content: 'The answer is 5' }]
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

		const errors = validateTemplate(template);

		expect(errors).toEqual([]);
	});

	it('should validate template with all grade levels', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables: [],
					answer: '5'
				}
			],
			precision: { type: 'none' },
			grades: ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6', '5', '4', '3', '2', 'SPE_1', 'SPE_T', 'STMG'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const errors = validateTemplate(template);

		expect(errors).toEqual([]);
	});

	it('should validate template with very long statement', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: [{ type: 'text', content: 'a'.repeat(5000) }],
					variables: [],
					answer: '5'
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

		const errors = validateTemplate(template);

		expect(errors).toEqual([]);
	});

	it('should validate template with many variables in variation', () => {
		const variables = Array.from({ length: 50 }, (_, i) => ({
			name: `var${i}`,
			expression: '{#:1-10}'
		}));

		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: [{ type: 'text', content: 'Question' }],
					variables,
					answer: '5'
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

		const errors = validateTemplate(template);

		expect(errors).toEqual([]);
	});
});

describe('validateTemplate - Multiple Errors', () => {
	it('should collect multiple validation errors', () => {
		const template = {
			id: 'test',
			type: 'algebraic_transform',
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: [],
					variables: [
						{ name: 'a', expression: '{#:1-10}' },
						{ name: 'a', expression: '{#:1-10}' }
					],
					answer: 'x'
				}
			],
			grades: [],
			// missing theme, domain, level, transformType
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		} as unknown as QuestionTemplate;

		const errors = validateTemplate(template);

		expect(errors.length).toBeGreaterThan(1);

		// Should have errors for: empty statement, duplicate variable, empty grades, missing fields
		expect(errors.some((e) => e.includes('statement'))).toBe(true);
		expect(errors.some((e) => e.includes('Duplicate') || e.includes('duplicate'))).toBe(true);
		expect(errors.some((e) => e.includes('grade'))).toBe(true);
		expect(errors.some((e) => e.includes('transformType'))).toBe(true);
		expect(errors.some((e) => e.includes('theme'))).toBe(true);
		expect(errors.some((e) => e.includes('domain'))).toBe(true);
		expect(errors.some((e) => e.includes('level'))).toBe(true);
	});
});
