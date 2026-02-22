/**
 * Tests for conditions migration in question-transformer
 * ======================================================
 *
 * Tests that old TinyMath conditions are correctly converted
 * to the new format with proper variable references, function
 * names, and separator syntax.
 */

import { describe, it, expect } from 'vitest';
import { transformQuestion } from '../question-transformer';
import type { QuestionBase } from '../old-question-types';

/** Helper to add _migration metadata to a test question */
function withMigration(q: QuestionBase): QuestionBase {
	return {
		...q,
		_migration: { theme: 'Test', domain: 'Test', subdomain: 'Test', level: 1, globalIndex: 0 }
	} as QuestionBase;
}

/** Helper to create a minimal old question with conditions */
function makeOldQuestion(overrides: Partial<QuestionBase> = {}): QuestionBase {
	return {
		description: 'Test question',
		enounces: ['$&1 + &2$'],
		variabless: [{ '&1': '$e[1;10]', '&2': '$e[1;10]' }],
		defaultDelay: 20,
		grade: '6',
		...overrides
	};
}

describe('Conditions migration', () => {
	describe('variable reference conversion', () => {
		it('converts &1*&2!=0 to a*b!=0', () => {
			const result = transformQuestion(
				withMigration(makeOldQuestion({ conditions: ['&1*&2!=0'] })),
				0
			);
			expect(result.success).toBe(true);
			const template = result.template!;
			// Conditions could be on variation or shared
			const conditions = template.variations[0].conditions ?? template.shared?.conditions;
			expect(conditions).toBeDefined();
			expect(conditions).toContain('a*b!=0');
		});

		it('converts &1!=&2 to a!=b', () => {
			const result = transformQuestion(
				withMigration(makeOldQuestion({ conditions: ['&1!=&2'] })),
				0
			);
			expect(result.success).toBe(true);
			const template = result.template!;
			const conditions = template.variations[0].conditions ?? template.shared?.conditions;
			expect(conditions).toContain('a!=b');
		});

		it('converts complex expressions with multiple variables', () => {
			const result = transformQuestion(
				withMigration(
					makeOldQuestion({
						variabless: [{ '&1': '$e[1;10]', '&2': '$e[1;10]', '&3': '$e[1;10]' }],
						conditions: ['abs(&1) != abs(&2) && abs(&1) != abs(&3)']
					})
				),
				0
			);
			expect(result.success).toBe(true);
			const template = result.template!;
			const conditions = template.variations[0].conditions ?? template.shared?.conditions;
			expect(conditions).toBeDefined();
			expect(conditions![0]).toBe('abs(a) != abs(b) && abs(a) != abs(c)');
		});
	});

	describe('function name conversion', () => {
		it('converts pgcd to gcd', () => {
			const result = transformQuestion(
				withMigration(
					makeOldQuestion({
						variabless: [{ '&1': '$e[1;10]', '&2': '$e[1;10]', '&3': '$e[1;10]' }],
						conditions: ['pgcd(&1+&2;&3)=1']
					})
				),
				0
			);
			expect(result.success).toBe(true);
			const template = result.template!;
			const conditions = template.variations[0].conditions ?? template.shared?.conditions;
			expect(conditions).toBeDefined();
			expect(conditions![0]).toBe('gcd(a+b,c)=1');
		});

		it('converts mod with semicolons to commas', () => {
			const result = transformQuestion(
				withMigration(
					makeOldQuestion({
						conditions: ['mod(&1*&2;10)!=0']
					})
				),
				0
			);
			expect(result.success).toBe(true);
			const template = result.template!;
			const conditions = template.variations[0].conditions ?? template.shared?.conditions;
			expect(conditions).toBeDefined();
			expect(conditions![0]).toBe('mod(a*b,10)!=0');
		});
	});

	describe('shared vs per-variation conditions', () => {
		it('puts single condition as shared when multiple variations exist', () => {
			const result = transformQuestion(
				withMigration(
					makeOldQuestion({
						enounces: ['$&1$', '$&1 + &2$'],
						variabless: [{ '&1': '$e[1;10]', '&2': '$e[1;10]' }],
						conditions: ['&1!=&2']
					})
				),
				0
			);
			expect(result.success).toBe(true);
			const template = result.template!;
			// Single condition with 2 variations → shared
			expect(template.shared?.conditions).toContain('a!=b');
		});

		it('puts per-variation conditions on each variation', () => {
			const result = transformQuestion(
				withMigration(
					makeOldQuestion({
						enounces: ['$&1$', '$&1 + &2$'],
						variabless: [{ '&1': '$e[1;10]', '&2': '$e[1;10]' }],
						conditions: ['&1!=0', '&1!=&2']
					})
				),
				0
			);
			expect(result.success).toBe(true);
			const template = result.template!;
			// 2 conditions for 2 variations → per-variation
			expect(template.variations[0].conditions).toContain('a!=0');
			expect(template.variations[1].conditions).toContain('a!=b');
		});
	});

	describe('edge cases', () => {
		it('handles no conditions gracefully', () => {
			const result = transformQuestion(withMigration(makeOldQuestion()), 0);
			expect(result.success).toBe(true);
			const template = result.template!;
			expect(template.variations[0].conditions).toBeUndefined();
			// shared.conditions should also be absent
			expect(template.shared?.conditions).toBeUndefined();
		});

		it('handles condition "true" (always satisfied)', () => {
			const result = transformQuestion(withMigration(makeOldQuestion({ conditions: ['true'] })), 0);
			expect(result.success).toBe(true);
			const template = result.template!;
			const conditions = template.variations[0].conditions ?? template.shared?.conditions;
			expect(conditions).toContain('true');
		});
	});
});
