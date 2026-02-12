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
import { templateMarkdown } from '$lib/ubumark';

describe('validateTemplate - Valid Templates', () => {
	it('should validate simple fill_in_blanks template', () => {
		const template: QuestionTemplate = {
			id: 'test-1',
			title: 'Simple Addition',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('Calculate 2 + 3'),
					variables: [],
					blanks: [{ expectedAnswer: '5' }]
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
			title: 'Test with Variables',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('Calculate {@:a} + {@:b}'),
					variables: [
						{ name: 'a', expression: '{#:1-10}' },
						{ name: 'b', expression: '{#:1-10}' }
					],
					blanks: [{ expectedAnswer: '{eval:{@:a} + {@:b}}' }]
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

	it('should validate fill_in_blanks template (inferred from no choices)', () => {
		const template: QuestionTemplate = {
			id: 'test-fill',
			title: 'Test fill_in_blanks',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [],
					blanks: [{ expectedAnswer: 'answer' }]
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

	it('should validate multiple_choice template (inferred from choices)', () => {
		const template: QuestionTemplate = {
			id: 'test-mc',
			title: 'Test multiple_choice',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [],
					solution: '0',
					choices: [
						{ content: templateMarkdown('A'), isCorrect: true },
						{ content: templateMarkdown('B'), isCorrect: false },
						{ content: templateMarkdown('C'), isCorrect: false },
						{ content: templateMarkdown('D'), isCorrect: false }
					]
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			multipleAnswers: false,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const errors = validateTemplate(template);
		expect(errors).toEqual([]);
	});

	it('should validate template with multiple variations', () => {
		const template: QuestionTemplate = {
			id: 'test-multi-var',
			title: 'Test Multiple Variations',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('Calculate {@:a} + {@:b}'),
					variables: [
						{ name: 'a', expression: '{#:1-10}' },
						{ name: 'b', expression: '{#:1-10}' }
					],
					blanks: [{ expectedAnswer: '{eval:{@:a}+{@:b}}' }]
				},
				{
					statement: templateMarkdown('Calculate {@:a} - {@:b}'),
					variables: [
						{ name: 'a', expression: '{#:10-20}' },
						{ name: 'b', expression: '{#:1-{@:a}}' }
					],
					blanks: [{ expectedAnswer: '{eval:{@:a}-{@:b}}' }]
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
	it('should infer type from choices (type no longer a field)', () => {
		// Template without choices → fill_in_blanks (valid)
		const template = {
			id: 'test',
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [],
					blanks: [{ expectedAnswer: '5' }]
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

		// No type-related errors since type is now inferred
		expect(errors.some((e) => e.includes('type'))).toBe(false);
	});

	it('should fail on missing variations', () => {
		const template = {
			id: 'test',
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
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					variables: [],
					blanks: [{ expectedAnswer: '5' }]
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

	it('should fail on missing solution for multiple_choice variation', () => {
		const template = {
			id: 'test',
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [],
					choices: [
						{ text: 'A', isCorrect: true },
						{ text: 'B', isCorrect: false }
					]
					// solution missing — required for multiple_choice
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

		expect(errors.some((e) => e.includes('solution'))).toBe(true);
	});

	it('should accept fill_in_blanks with blanks (no solution needed)', () => {
		const template = {
			id: 'test',
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [],
					blanks: [{ expectedAnswer: '42' }]
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

		expect(errors).toEqual([]);
	});

	it('should fail on missing grades', () => {
		const template = {
			id: 'test',
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [],
					blanks: [{ expectedAnswer: '5' }]
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
			title: 'Test Empty Grades',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [],
					blanks: [{ expectedAnswer: '5' }]
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
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [],
					blanks: [{ expectedAnswer: '5' }]
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
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [],
					blanks: [{ expectedAnswer: '5' }]
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
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [],
					blanks: [{ expectedAnswer: '5' }]
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
			title: 'Test Empty Statement',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown(''),
					variables: [],
					blanks: [{ expectedAnswer: '5' }]
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

		expect(errors.some((e) => e.includes('Statement cannot be empty'))).toBe(true);
	});

	it('should fail on statement with empty text content', () => {
		const template: QuestionTemplate = {
			id: 'test',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown(''),
					variables: [],
					blanks: [{ expectedAnswer: '5' }]
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

		expect(errors.some((e) => e.includes('Statement cannot be empty'))).toBe(true);
	});

	it('should validate statement with image field', () => {
		const template: QuestionTemplate = {
			id: 'test',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('What is this?\n\n![Example](https://example.com/image.png)'),
					variables: [],
					blanks: [{ expectedAnswer: '5' }]
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
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [
						{ name: 'a', expression: '{#:1-10}' },
						{ name: 'a', expression: '{#:1-10}' }
					],
					blanks: [{ expectedAnswer: '{@:a}' }]
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
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [{ name: '', expression: '{#:1-10}' }],
					blanks: [{ expectedAnswer: '5' }]
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
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [
						{ name: 'a', expression: '{#:1-10}' },
						{ name: '_private', expression: '{#:1-10}' },
						{ name: 'var123', expression: '{#:1-10}' },
						{ name: 'my_var', expression: '{#:1-10}' }
					],
					blanks: [{ expectedAnswer: '5' }]
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
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('Question 1'),
					variables: [{ name: 'a', expression: '{#:1-10}' }],
					blanks: [{ expectedAnswer: '{@:a}' }]
				},
				{
					statement: templateMarkdown('Question 2'),
					variables: [{ name: 'a', expression: '{#:10-20}' }], // Same name, different variation OK
					blanks: [{ expectedAnswer: '{@:a}' }]
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
	it('should fail fill_in_blanks without blanks', () => {
		const template = {
			id: 'test',
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: []
					// no blanks[]
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

		expect(errors.some((e) => e.includes('blanks'))).toBe(true);
	});

	it('should fail multiple_choice with less than 2 choices in variation', () => {
		const template = {
			id: 'test',
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [],
					solution: '0',
					// Only 1 choice — multiple_choice requires at least 2
					choices: [{ content: templateMarkdown('Only one'), isCorrect: true }]
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

		expect(errors.some((e) => e.includes('choices') || e.includes('2'))).toBe(true);
	});

	it('should fail multiple_choice with less than 2 choices', () => {
		const template: QuestionTemplate = {
			id: 'test',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [],
					solution: '0',
					choices: [{ content: templateMarkdown('Only one'), isCorrect: true }]
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
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('Valid'),
					variables: [],
					blanks: [{ expectedAnswer: '5' }]
				},
				{
					statement: templateMarkdown(''), // Invalid
					variables: [],
					blanks: [{ expectedAnswer: '10' }]
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
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown(''), // Invalid variation 1: empty statement
					variables: [],
					blanks: [{ expectedAnswer: '5' }]
				},
				{
					statement: templateMarkdown(''), // Invalid variation 2: also empty statement
					variables: [],
					blanks: [{ expectedAnswer: '5' }]
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

		// Should have errors for both variations (empty statements)
		expect(errors.length).toBeGreaterThan(1);
		expect(errors.some((e) => e.includes('Variation 1'))).toBe(true);
		expect(errors.some((e) => e.includes('Variation 2'))).toBe(true);
	});
});

describe('validateTemplate - Edge Cases', () => {
	it('should validate template with optional delay', () => {
		const template: QuestionTemplate = {
			id: 'test',
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [],
					blanks: [{ expectedAnswer: '5' }]
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
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [],
					blanks: [{ expectedAnswer: '5' }],
					correction: {
						feedback: {
							correct: templateMarkdown('Correct!'),
							incorrect: templateMarkdown('The answer is 5')
						}
					}
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
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables: [],
					blanks: [{ expectedAnswer: '5' }]
				}
			],
			precision: { type: 'none' },
			grades: [
				'CP',
				'CE1',
				'CE2',
				'CM1',
				'CM2',
				'6',
				'5',
				'4',
				'3',
				'2',
				'1_SPE',
				'T_SPE',
				'T_STMG'
			],
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
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('a'.repeat(5000)),
					variables: [],
					blanks: [{ expectedAnswer: '5' }]
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
			title: 'Test Template',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('Question'),
					variables,
					blanks: [{ expectedAnswer: '5' }]
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
			title: 'Test Template',
			status: 'published' as const,
			variations: [
				{
					statement: templateMarkdown(''),
					variables: [
						{ name: 'a', expression: '{#:1-10}' },
						{ name: 'a', expression: '{#:1-10}' }
					]
					// no blanks — will also trigger blanks error
				}
			],
			grades: [],
			// missing theme, domain, level
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		} as unknown as QuestionTemplate;

		const errors = validateTemplate(template);

		expect(errors.length).toBeGreaterThan(1);

		// Should have errors for: empty statement, duplicate variable, empty grades, missing fields, missing blanks
		expect(errors.some((e) => e.includes('Statement cannot be empty'))).toBe(true);
		expect(errors.some((e) => e.includes('Duplicate') || e.includes('duplicate'))).toBe(true);
		expect(errors.some((e) => e.includes('grade'))).toBe(true);
		expect(errors.some((e) => e.includes('theme'))).toBe(true);
		expect(errors.some((e) => e.includes('domain'))).toBe(true);
		expect(errors.some((e) => e.includes('level'))).toBe(true);
		expect(errors.some((e) => e.includes('blanks'))).toBe(true);
	});
});
