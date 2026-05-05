/**
 * Tests for `extractPedagogicalTarget`.
 *
 * Coverage :
 * - Cascade `blank > variation/instance` for each field
 * - `answerFormat` lookup via `expressionName` argument
 * - Strict-cosmetics filter (only `'strict'` modes kept)
 * - `TargetForm` derivation heuristics:
 *     1. requiredForm pass-through
 *     2. answerFormat scientific override
 *     3. reducedFractions + fraction context → 'reduced-fraction'
 *     4. precision decimal + non-fraction → 'decimal'
 *     5. fallback undefined
 * - Defensive behavior on absent fields / empty instances.
 */

import { describe, expect, it } from 'vitest';
import type {
	InstanceBlank,
	QuestionInstance,
	ConstraintOptions,
	PrecisionType
} from '$lib/questions/types';
import { extractPedagogicalTarget } from '../target-extractor';

// =============================================================================
// Builders
// =============================================================================

function buildInstance(overrides: Partial<QuestionInstance> = {}): QuestionInstance {
	return {
		templateId: 't1',
		statement: [],
		grades: ['college'],
		generatedAt: '2026-05-05T00:00:00Z',
		level: 1,
		...overrides
	} as QuestionInstance;
}

function buildBlank(overrides: Partial<InstanceBlank> = {}): InstanceBlank {
	return {
		expectedAnswer: '0',
		type: 'math',
		...overrides
	} as InstanceBlank;
}

// =============================================================================
// Tests
// =============================================================================

describe('extractPedagogicalTarget', () => {
	describe('cascade blank > variation/instance', () => {
		it('uses blank.requiredForm over instance.requiredForm', () => {
			const instance = buildInstance({ requiredForm: 'sum' });
			const blank = buildBlank({ requiredForm: 'product' });
			const target = extractPedagogicalTarget(instance, blank);
			expect(target.structure).toBe('product');
		});

		it('falls back to instance.requiredForm when blank has none', () => {
			const instance = buildInstance({ requiredForm: 'sum' });
			const blank = buildBlank({ requiredForm: undefined });
			const target = extractPedagogicalTarget(instance, blank);
			expect(target.structure).toBe('sum');
		});

		it('precision comes from blank only (instance has no precision)', () => {
			const precision: PrecisionType = { type: 'decimal', digits: 2 };
			const blank = buildBlank({ precision });
			const target = extractPedagogicalTarget(buildInstance(), blank);
			expect(target.precision).toEqual(precision);
		});

		it('validationRules: blank overrides instance', () => {
			const instanceRules = [{ id: 'r-instance' }] as never;
			const blankRules = [{ id: 'r-blank' }] as never;
			const instance = buildInstance({ validationRules: instanceRules });
			const blank = buildBlank({ validationRules: blankRules });
			const target = extractPedagogicalTarget(instance, blank);
			expect(target.validationRules).toBe(blankRules);
		});

		it('validationRules: falls back to instance when blank empty', () => {
			const instanceRules = [{ id: 'r-instance' }] as never;
			const instance = buildInstance({ validationRules: instanceRules });
			const target = extractPedagogicalTarget(instance, buildBlank());
			expect(target.validationRules).toBe(instanceRules);
		});

		it('unit comes from blank only', () => {
			const blank = buildBlank({ unit: { expected: true, required: 'm' } });
			const target = extractPedagogicalTarget(buildInstance(), blank);
			expect(target.unit).toEqual({ expected: true, required: 'm' });
		});
	});

	describe('answerFormat lookup', () => {
		it('returns format from instance.expressions matching expressionName', () => {
			const instance = buildInstance({
				expressions: [
					{ name: 'expression1', latex: '5000000', answerFormat: '10^?' },
					{ name: 'expression2', latex: '12', answerFormat: '?' }
				]
			});
			const target = extractPedagogicalTarget(instance, undefined, 'expression1');
			expect(target.answerFormat).toBe('10^?');
		});

		it('returns undefined when expressionName is omitted', () => {
			const instance = buildInstance({
				expressions: [{ name: 'expression1', latex: '5', answerFormat: '10^?' }]
			});
			const target = extractPedagogicalTarget(instance);
			expect(target.answerFormat).toBeUndefined();
		});

		it('returns undefined when expressions array is missing', () => {
			const target = extractPedagogicalTarget(buildInstance(), undefined, 'expression1');
			expect(target.answerFormat).toBeUndefined();
		});

		it('returns undefined when expressionName is not found', () => {
			const instance = buildInstance({
				expressions: [{ name: 'expression1', latex: '5', answerFormat: '10^?' }]
			});
			const target = extractPedagogicalTarget(instance, undefined, 'expression42');
			expect(target.answerFormat).toBeUndefined();
		});
	});

	describe('strict-cosmetics filter', () => {
		it('keeps only strict modes', () => {
			const constraints: ConstraintOptions = {
				reducedFractions: 'strict',
				signs: 'warn',
				nullTerms: 'strict',
				factorOne: 'off',
				zeros: 'strict'
			};
			const instance = buildInstance({ options: { constraints } });
			const target = extractPedagogicalTarget(instance);
			expect(target.strictCosmetics).toEqual({
				reducedFractions: 'strict',
				nullTerms: 'strict',
				zeros: 'strict'
			});
		});

		it('returns undefined when no strict mode present', () => {
			const instance = buildInstance({
				options: { constraints: { signs: 'warn', factorOne: 'off' } }
			});
			const target = extractPedagogicalTarget(instance);
			expect(target.strictCosmetics).toBeUndefined();
		});

		it('returns undefined when constraints absent', () => {
			const target = extractPedagogicalTarget(buildInstance());
			expect(target.strictCosmetics).toBeUndefined();
		});
	});

	describe('TargetForm derivation', () => {
		// Heuristic 1 — pass-through
		it.each(['product', 'sum', 'fraction', 'power'] as const)(
			'passes %s requiredForm through to structure',
			(form) => {
				const instance = buildInstance({ requiredForm: form });
				const target = extractPedagogicalTarget(instance);
				expect(target.structure).toBe(form);
			}
		);

		it('drops { pattern } requiredForm (not a TargetForm member)', () => {
			const instance = buildInstance({
				requiredForm: { pattern: 'a:integer * b:integer' }
			});
			const target = extractPedagogicalTarget(instance);
			expect(target.structure).toBeUndefined();
		});

		// Heuristic 2 — scientific override
		it('answerFormat 10^? → structure scientific', () => {
			const instance = buildInstance({
				expressions: [{ name: 'e', latex: '5', answerFormat: '10^?' }]
			});
			const target = extractPedagogicalTarget(instance, undefined, 'e');
			expect(target.structure).toBe('scientific');
		});

		it('answerFormat scientific overrides requiredForm fraction', () => {
			const instance = buildInstance({
				requiredForm: 'fraction',
				expressions: [{ name: 'e', latex: '5', answerFormat: '? \\times 10^?' }]
			});
			const target = extractPedagogicalTarget(instance, undefined, 'e');
			expect(target.structure).toBe('scientific');
		});

		// Heuristic 3 — reduced-fraction
		it('reducedFractions strict + requiredForm fraction → reduced-fraction', () => {
			const instance = buildInstance({
				requiredForm: 'fraction',
				options: { constraints: { reducedFractions: 'strict' } }
			});
			const target = extractPedagogicalTarget(instance);
			expect(target.structure).toBe('reduced-fraction');
		});

		it('reducedFractions strict + answerFormat ?/? → reduced-fraction', () => {
			const instance = buildInstance({
				options: { constraints: { reducedFractions: 'strict' } },
				expressions: [{ name: 'e', latex: '1/2', answerFormat: '?/?' }]
			});
			const target = extractPedagogicalTarget(instance, undefined, 'e');
			expect(target.structure).toBe('reduced-fraction');
		});

		it('reducedFractions strict WITHOUT fraction context → leaves requiredForm passthrough', () => {
			const instance = buildInstance({
				requiredForm: 'sum',
				options: { constraints: { reducedFractions: 'strict' } }
			});
			const target = extractPedagogicalTarget(instance);
			// strict but no fraction context → falls back to requiredForm passthrough
			expect(target.structure).toBe('sum');
		});

		// Heuristic 4 — decimal precision
		it('precision decimal + no fraction context → decimal', () => {
			const blank = buildBlank({ precision: { type: 'decimal', digits: 3 } });
			const target = extractPedagogicalTarget(buildInstance(), blank);
			expect(target.structure).toBe('decimal');
		});

		it('precision decimal + requiredForm fraction → fraction (heuristic 1 wins)', () => {
			const instance = buildInstance({ requiredForm: 'fraction' });
			const blank = buildBlank({ precision: { type: 'decimal', digits: 3 } });
			const target = extractPedagogicalTarget(instance, blank);
			expect(target.structure).toBe('fraction');
		});

		// Heuristic 5 — fallback
		it('no signals at all → structure undefined', () => {
			const target = extractPedagogicalTarget(buildInstance());
			expect(target.structure).toBeUndefined();
		});

		// Heuristic 1 vs 4 priority
		it('requiredForm product + precision decimal → product (passthrough beats decimal)', () => {
			const instance = buildInstance({ requiredForm: 'product' });
			const blank = buildBlank({ precision: { type: 'decimal', digits: 2 } });
			const target = extractPedagogicalTarget(instance, blank);
			expect(target.structure).toBe('product');
		});

		// Instance-only path: no blank, instance-level requiredForm + scientific format
		it('no blank + instance.requiredForm + scientific answerFormat → scientific (instance-only path)', () => {
			const instance = buildInstance({
				requiredForm: 'fraction',
				expressions: [{ name: 'expression1', latex: '5', answerFormat: '10^?' }]
			});
			const target = extractPedagogicalTarget(instance, undefined, 'expression1');
			expect(target.structure).toBe('scientific');
		});
	});

	describe('defensive defaults', () => {
		it('returns validationRules undefined when neither blank nor instance set them', () => {
			const target = extractPedagogicalTarget(buildInstance(), buildBlank());
			expect(target.validationRules).toBeUndefined();
		});
	});

	describe('combined complex case', () => {
		it('extracts all fields for a fully-specified question', () => {
			const constraints: ConstraintOptions = {
				reducedFractions: 'strict',
				signs: 'warn',
				zeros: 'strict'
			};
			const instance = buildInstance({
				requiredForm: 'fraction',
				options: { constraints },
				expressions: [{ name: 'expression1', latex: '\\dfrac{1}{2}', answerFormat: '?/?' }]
			});
			const blank = buildBlank({
				precision: { type: 'none' },
				unit: { expected: false }
			});
			const target = extractPedagogicalTarget(instance, blank, 'expression1');

			expect(target.structure).toBe('reduced-fraction');
			expect(target.answerFormat).toBe('?/?');
			expect(target.precision).toEqual({ type: 'none' });
			expect(target.unit).toEqual({ expected: false });
			expect(target.strictCosmetics).toEqual({
				reducedFractions: 'strict',
				zeros: 'strict'
			});
		});
	});
});
