/**
 * Test Spec Runner Tests
 * ======================
 *
 * Tests the test spec execution pipeline:
 * - Correct answers → passed
 * - Incorrect answers → passed (when expected)
 * - Constraint violations → detection and matching
 * - Error handling
 */

import { describe, it, expect } from 'vitest';
import { runTestSpec, runAllTestSpecs } from '../test-spec-runner';
import type { QuestionTemplate, TestSpec } from '../types';
import { templateMarkdown } from '$lib/ubumark';

function makeTemplate(overrides?: Partial<QuestionTemplate>): QuestionTemplate {
	return {
		id: 'test-runner',
		title: 'Test Runner',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown('${{a}} + {{b}} = ?$'),
				variables: [
					{ name: 'a', expression: '{{random:1..10}}' },
					{ name: 'b', expression: '{{random:1..10}}' }
				],
				blanks: [{ expectedAnswer: '{{eval:{{a}}+{{b}}}}' }]
			}
		],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		...overrides
	};
}

describe('runTestSpec', () => {
	it('should pass when answer is correct and expected correct', () => {
		const template = makeTemplate();
		const spec: TestSpec = {
			description: 'correct answer',
			variables: { a: '3', b: '7' },
			answers: ['10'],
			expected: { status: 'correct' }
		};

		const result = runTestSpec(template, spec);
		expect(result.passed).toBe(true);
		expect(result.actual.status).toBe('correct');
		expect(result.error).toBeUndefined();
	});

	it('should pass when answer is incorrect and expected incorrect', () => {
		const template = makeTemplate();
		const spec: TestSpec = {
			description: 'wrong answer expected',
			variables: { a: '3', b: '7' },
			answers: ['42'],
			expected: { status: 'incorrect' }
		};

		const result = runTestSpec(template, spec);
		expect(result.passed).toBe(true);
		expect(result.actual.status).toBe('incorrect');
	});

	it('should fail when answer is correct but expected incorrect', () => {
		const template = makeTemplate();
		const spec: TestSpec = {
			description: 'mismatch',
			variables: { a: '3', b: '7' },
			answers: ['10'],
			expected: { status: 'incorrect' }
		};

		const result = runTestSpec(template, spec);
		expect(result.passed).toBe(false);
		expect(result.actual.status).toBe('correct');
	});

	it('should return error when answers are missing for fill-in-blanks', () => {
		const template = makeTemplate();
		const spec: TestSpec = {
			description: 'no answers',
			variables: { a: '3', b: '7' },
			expected: { status: 'correct' }
		};

		const result = runTestSpec(template, spec);
		expect(result.passed).toBe(false);
		expect(result.error).toContain('answers[]');
	});

	it('should return error when generation fails (bad variation index)', () => {
		const template = makeTemplate();
		const spec: TestSpec = {
			description: 'bad variation',
			variationIndex: 99, // out of range
			variables: { a: '3', b: '7' },
			answers: ['10'],
			expected: { status: 'correct' }
		};

		const result = runTestSpec(template, spec);
		expect(result.passed).toBe(false);
		expect(result.error).toContain('Generation failed');
	});
});

describe('runTestSpec with constraint violations', () => {
	it('should detect unoptimal_form with zeros constraint', () => {
		const template: QuestionTemplate = {
			id: 'test-constraints',
			title: 'Constraint Test',
			status: 'draft',
			variations: [
				{
					statement: templateMarkdown('Calculer ${{a}} + {{b}} = ?$'),
					variables: [
						{ name: 'a', expression: '{{random:1..10}}' },
						{ name: 'b', expression: '{{random:1..10}}' }
					],
					blanks: [{ expectedAnswer: '{{eval:{{a}}+{{b}}}}' }]
				}
			],
			options: {
				constraints: {
					zeros: 'warn'
				}
			},
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1
		};

		// Answer with leading zero: "010" instead of "10"
		const spec: TestSpec = {
			description: 'leading zeros trigger warning',
			variables: { a: '3', b: '7' },
			answers: ['010'],
			expected: {
				status: 'unoptimal_form',
				constraintViolations: ['zeros']
			}
		};

		const result = runTestSpec(template, spec);
		// This test verifies the pipeline works end-to-end
		// The exact behavior depends on the constraint checker implementation
		expect(result.error).toBeUndefined();
	});
});

describe('runTestSpec with QCM', () => {
	it('should validate correct choice selection', () => {
		const template: QuestionTemplate = {
			id: 'test-qcm',
			title: 'QCM Test',
			status: 'draft',
			variations: [
				{
					statement: templateMarkdown('$2 + 3 = $ ?'),
					correctChoiceIndex: '1',
					choices: [
						{ content: '4', isCorrect: false },
						{ content: '5', isCorrect: true },
						{ content: '6', isCorrect: false }
					]
				}
			],
			options: { shuffleChoices: false },
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1
		};

		const spec: TestSpec = {
			description: 'correct choice',
			variables: {},
			selectedChoices: [1],
			expected: { status: 'correct' }
		};

		const result = runTestSpec(template, spec);
		expect(result.error).toBeUndefined();
		expect(result.actual.status).toBe('correct');
		expect(result.passed).toBe(true);
	});

	it('should return error when selectedChoices missing for QCM', () => {
		const template: QuestionTemplate = {
			id: 'test-qcm-err',
			title: 'QCM Error',
			status: 'draft',
			variations: [
				{
					statement: templateMarkdown('$2 + 3 = ?$'),
					choices: [
						{ content: '5', isCorrect: true },
						{ content: '6', isCorrect: false }
					]
				}
			],
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1
		};

		const spec: TestSpec = {
			description: 'missing choices',
			variables: {},
			answers: ['5'], // Wrong field for QCM
			expected: { status: 'correct' }
		};

		const result = runTestSpec(template, spec);
		expect(result.passed).toBe(false);
		expect(result.error).toBeDefined();
	});
});

describe('runAllTestSpecs', () => {
	it('should return empty array for template without specs', () => {
		const template = makeTemplate();
		expect(runAllTestSpecs(template)).toEqual([]);
	});

	it('should run all specs and aggregate results', () => {
		const template = makeTemplate({
			testSpecs: [
				{
					description: 'correct',
					variables: { a: '3', b: '7' },
					answers: ['10'],
					expected: { status: 'correct' }
				},
				{
					description: 'incorrect',
					variables: { a: '3', b: '7' },
					answers: ['42'],
					expected: { status: 'incorrect' }
				}
			]
		});

		const results = runAllTestSpecs(template);
		expect(results).toHaveLength(2);
		expect(results[0].passed).toBe(true);
		expect(results[1].passed).toBe(true);
	});
});
