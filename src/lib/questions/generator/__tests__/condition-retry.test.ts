/**
 * Integration tests for condition retry loop in instance-generator
 * ================================================================
 *
 * Tests that the generateInstance function correctly retries variable
 * generation when conditions are not satisfied.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import type { QuestionTemplate } from '../../types';
import { templateMarkdown } from '$lib/ubumark';

function makeTemplate(overrides: Partial<QuestionTemplate> = {}): QuestionTemplate {
	return {
		id: 'test-conditions',
		title: 'Test Conditions',
		status: 'draft',
		variations: [],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		...overrides
	};
}

describe('generateInstance with conditions', () => {
	it('generates variables satisfying a simple condition', () => {
		const template = makeTemplate({
			variations: [
				{
					statement: templateMarkdown('$? + {{b}}$'),
					blanks: [{ expectedAnswer: '{{a}}' }],
					variables: [
						{ name: 'a', expression: '{{random:1..10}}' },
						{ name: 'b', expression: '{{random:1..10}}' }
					],
					conditions: ['a != b']
				}
			]
		});

		// Run multiple times to increase confidence
		for (let seed = 0; seed < 20; seed++) {
			const result = generateInstance(template, seed);
			expect(result.success).toBe(true);
			if (result.success) {
				const a = result.instance.resolvedVariables?.find((v) => v.name === 'a');
				const b = result.instance.resolvedVariables?.find((v) => v.name === 'b');
				expect(a).toBeDefined();
				expect(b).toBeDefined();
				expect(a!.value).not.toBe(b!.value);
			}
		}
	});

	it('generates variables satisfying a*b != 0 condition', () => {
		const template = makeTemplate({
			variations: [
				{
					statement: templateMarkdown('$? \\times {{b}}$'),
					blanks: [{ expectedAnswer: '{{a}}' }],
					variables: [
						{ name: 'a', expression: '{{random:-5..5}}' },
						{ name: 'b', expression: '{{random:-5..5}}' }
					],
					conditions: ['a*b!=0']
				}
			]
		});

		for (let seed = 0; seed < 20; seed++) {
			const result = generateInstance(template, seed);
			expect(result.success).toBe(true);
			if (result.success) {
				const a = Number(result.instance.resolvedVariables?.find((v) => v.name === 'a')?.value);
				const b = Number(result.instance.resolvedVariables?.find((v) => v.name === 'b')?.value);
				expect(a * b).not.toBe(0);
			}
		}
	});

	it('uses shared conditions from template shared field', () => {
		const template = makeTemplate({
			shared: {
				variables: [
					{ name: 'a', expression: '{{random:1..10}}' },
					{ name: 'b', expression: '{{random:1..10}}' }
				],
				conditions: ['a != b']
			},
			variations: [
				{
					statement: templateMarkdown('$? + {{b}}$'),
					blanks: [{ expectedAnswer: '{{a}}' }]
				}
			]
		});

		for (let seed = 0; seed < 20; seed++) {
			const result = generateInstance(template, seed);
			expect(result.success).toBe(true);
			if (result.success) {
				const a = result.instance.resolvedVariables?.find((v) => v.name === 'a');
				const b = result.instance.resolvedVariables?.find((v) => v.name === 'b');
				expect(a!.value).not.toBe(b!.value);
			}
		}
	});

	it('fails after max retries for impossible conditions', () => {
		const template = makeTemplate({
			variations: [
				{
					statement: templateMarkdown('$?$'),
					blanks: [{ expectedAnswer: '{{a}}' }],
					variables: [
						// Range 1..1 always gives 1, but condition requires != 1
						{ name: 'a', expression: '{{random:1..1}}' }
					],
					conditions: ['a != 1']
				}
			]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors[0]).toContain('conditions');
			expect(result.errors[0]).toContain('100');
		}
	});

	it('handles gcd condition', () => {
		const template = makeTemplate({
			variations: [
				{
					statement: templateMarkdown('$?/{{b}}$'),
					blanks: [{ expectedAnswer: '{{a}}' }],
					variables: [
						{ name: 'a', expression: '{{random:1..20}}' },
						{ name: 'b', expression: '{{random:2..20}}' }
					],
					conditions: ['gcd(a,b)=1']
				}
			]
		});

		for (let seed = 0; seed < 10; seed++) {
			const result = generateInstance(template, seed);
			expect(result.success).toBe(true);
			if (result.success) {
				const a = Number(result.instance.resolvedVariables?.find((v) => v.name === 'a')?.value);
				const b = Number(result.instance.resolvedVariables?.find((v) => v.name === 'b')?.value);
				// Check they are coprime
				function gcd(x: number, y: number): number {
					x = Math.abs(x);
					y = Math.abs(y);
					while (y) {
						[x, y] = [y, x % y];
					}
					return x;
				}
				expect(gcd(a, b)).toBe(1);
			}
		}
	});
});
