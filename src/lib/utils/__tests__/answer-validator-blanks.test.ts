/**
 * Answer Validator — Per-Blank Validation Tests (Phase 4)
 * ========================================================
 *
 * Tests for the per-blank validation pipeline:
 * A. Inferred validation mode (equivalence, numerical, unit, fuzzy text)
 * B. Fuzzy text matching (case, accents, Levenshtein)
 * C. Per-blank pipeline (validationRules → inferred mode → requiredForm → constraints)
 * D. Multi-blank aggregation
 * E. validateAnswer signature changes
 * F. validateQuantityAnswer new signature
 * G. Generator fix (validationRules fallback)
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '../answer-validator';
import { validateQuantityAnswer } from '$lib/questions/units/validator';
import type {
	QuestionInstance,
	InstanceBlank,
	PrecisionType,
	RequiredForm
} from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

// ============================================================================
// HELPERS
// ============================================================================

/** Create a minimal fill_in_blanks instance with given blanks */
function createInstance(
	blanks: InstanceBlank[],
	options?: QuestionInstance['options']
): QuestionInstance {
	return {
		templateId: 'test-phase4',
		statement: 'Test statement' as ResolvedMarkdown,
		blanks,
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString(),
		options
	};
}

/** Shorthand for a math blank */
function mathBlank(
	expectedAnswer: string,
	overrides?: Partial<Omit<InstanceBlank, 'type' | 'expectedAnswer'>>
): InstanceBlank {
	return { expectedAnswer, type: 'math', ...overrides };
}

/** Shorthand for a text blank */
function textBlank(
	expectedAnswer: string,
	overrides?: Partial<Omit<InstanceBlank, 'type' | 'expectedAnswer'>>
): InstanceBlank {
	return { expectedAnswer, type: 'text', ...overrides };
}

// ============================================================================
// A. INFERRED VALIDATION MODE (math blanks)
// ============================================================================

describe('Per-blank validation — Inferred mode', () => {
	describe('A1. Equivalence mode (no precision, no unit)', () => {
		it('should validate exact numeric match via areEquivalent', () => {
			const instance = createInstance([mathBlank('42')]);
			const result = validateAnswer(['42'], instance);
			expect(result.isCorrect).toBe(true);
		});

		it('should reject unsimplified form for a bare math blank (2+3 vs 5 = bad_form)', () => {
			// A bare math blank (no requiredForm/precision/unit) requires the
			// computed/canonical form: an unsimplified equivalent like 2+3 for an
			// expected 5 is mathematically equivalent but in the wrong form.
			const instance = createInstance([mathBlank('5')]);
			const result = validateAnswer(['2+3'], instance);
			expect(result.isCorrect).toBe(false);
			expect(result.status).toBe('bad_form');
		});

		it('should reject non-equivalent answer', () => {
			const instance = createInstance([mathBlank('42')]);
			const result = validateAnswer(['43'], instance);
			expect(result.isCorrect).toBe(false);
		});
	});

	describe('A2. Numerical mode (precision, no unit)', () => {
		it('should validate with decimal precision', () => {
			const precision: PrecisionType = { type: 'decimal', digits: 1 };
			const instance = createInstance([mathBlank('3.14', { precision })]);
			// 3.1 rounds to 3.1, 3.14 rounds to 3.1 → match
			const result = validateAnswer(['3.1'], instance);
			expect(result.isCorrect).toBe(true);
		});

		it('should reject outside decimal precision', () => {
			const precision: PrecisionType = { type: 'decimal', digits: 1 };
			const instance = createInstance([mathBlank('3.14', { precision })]);
			// 3.2 rounds to 3.2, 3.14 rounds to 3.1 → no match
			const result = validateAnswer(['3.2'], instance);
			expect(result.isCorrect).toBe(false);
		});

		it('should validate with tolerance (absolute)', () => {
			const precision: PrecisionType = { type: 'tolerance', tolerance: 0.5, mode: 'absolute' };
			const instance = createInstance([mathBlank('10', { precision })]);
			const result = validateAnswer(['10.3'], instance);
			expect(result.isCorrect).toBe(true);
		});

		it('should reject outside tolerance', () => {
			const precision: PrecisionType = { type: 'tolerance', tolerance: 0.5, mode: 'absolute' };
			const instance = createInstance([mathBlank('10', { precision })]);
			const result = validateAnswer(['11'], instance);
			expect(result.isCorrect).toBe(false);
		});
	});

	describe('A3. Unit mode (unit.expected, no precision)', () => {
		it('should validate correct quantity with unit', () => {
			const instance = createInstance([mathBlank('5\\unit{km}', { unit: { expected: true } })]);
			const result = validateAnswer(['5\\unit{km}'], instance);
			expect(result.isCorrect).toBe(true);
		});

		it('should accept compatible unit conversion (5000 m = 5 km)', () => {
			const instance = createInstance([mathBlank('5\\unit{km}', { unit: { expected: true } })]);
			const result = validateAnswer(['5000\\unit{m}'], instance);
			expect(result.isCorrect).toBe(true);
		});

		it('should reject wrong value with correct unit', () => {
			const instance = createInstance([mathBlank('5\\unit{km}', { unit: { expected: true } })]);
			const result = validateAnswer(['6\\unit{km}'], instance);
			expect(result.isCorrect).toBe(false);
		});
	});

	describe('A4. Unit + precision mode', () => {
		it('should validate quantity with precision tolerance', () => {
			const precision: PrecisionType = { type: 'tolerance', tolerance: 0.1, mode: 'absolute' };
			const instance = createInstance([
				mathBlank('5\\unit{km}', { unit: { expected: true }, precision })
			]);
			const result = validateAnswer(['5.05\\unit{km}'], instance);
			expect(result.isCorrect).toBe(true);
		});
	});

	describe('A5. Unit with required unit', () => {
		it('should reject compatible but different unit when required is set', () => {
			const instance = createInstance([
				mathBlank('5000\\unit{m}', { unit: { expected: true, required: 'm' } })
			]);
			// 5 km is correct value but wrong unit (required: m)
			const result = validateAnswer(['5\\unit{km}'], instance);
			expect(result.isCorrect).toBe(false);
		});

		it('should accept answer with exact required unit', () => {
			const instance = createInstance([
				mathBlank('5000\\unit{m}', { unit: { expected: true, required: 'm' } })
			]);
			const result = validateAnswer(['5000\\unit{m}'], instance);
			expect(result.isCorrect).toBe(true);
		});
	});
});

// ============================================================================
// B. FUZZY TEXT MATCHING
// ============================================================================

describe('Per-blank validation — Fuzzy text', () => {
	it('B6. should match exact (case insensitive)', () => {
		const instance = createInstance([textBlank('entier')]);
		const result = validateAnswer(['Entier'], instance);
		expect(result.isCorrect).toBe(true);
	});

	it('B7. should match with accents ignored', () => {
		const instance = createInstance([textBlank('entier')]);
		const result = validateAnswer(['éntier'], instance);
		expect(result.isCorrect).toBe(true);
	});

	it('B8. should match with Levenshtein distance <= 1', () => {
		const instance = createInstance([textBlank('pair')]);
		// "paire" has Levenshtein distance 1 from "pair"
		const result = validateAnswer(['paire'], instance);
		expect(result.isCorrect).toBe(true);
	});

	it('B9. should reject Levenshtein distance > 1', () => {
		const instance = createInstance([textBlank('triangle')]);
		const result = validateAnswer(['carre'], instance);
		expect(result.isCorrect).toBe(false);
	});

	it('B10. pool should NOT affect validation', () => {
		const instance = createInstance([textBlank('pair', { pool: ['pair', 'impair', 'premier'] })]);
		// Answer not in pool but matches expectedAnswer
		const result = validateAnswer(['pair'], instance);
		expect(result.isCorrect).toBe(true);
	});

	it('B10b. pool items should not be accepted as correct', () => {
		const instance = createInstance([textBlank('pair', { pool: ['pair', 'impair', 'premier'] })]);
		// "impair" is in pool but not the expected answer
		const result = validateAnswer(['impair'], instance);
		expect(result.isCorrect).toBe(false);
	});
});

// ============================================================================
// C. PIPELINE PER-BLANK (math)
// ============================================================================

describe('Per-blank validation — Pipeline', () => {
	describe('C11. validationRules fail → short-circuit incorrect', () => {
		it('should return incorrect when validation rule fails', () => {
			const instance = createInstance([
				mathBlank('6', {
					validationRules: [{ type: 'divisor', dividend: '12' }]
				})
			]);
			// Provide resolved variables for rule evaluation
			instance.resolvedVariables = [{ name: 'n', value: '12' }];

			// 5 is not a divisor of 12
			const result = validateAnswer(['5'], instance);
			expect(result.isCorrect).toBe(false);
		});
	});

	describe('C12. validationRules pass → continue pipeline', () => {
		it('should continue to inferred mode after rules pass', () => {
			const instance = createInstance([
				mathBlank('4', {
					validationRules: [{ type: 'divisor', dividend: '12' }]
				})
			]);
			instance.resolvedVariables = [{ name: 'n', value: '12' }];

			// 4 is a divisor of 12 AND equivalent to expected answer 4
			const result = validateAnswer(['4'], instance);
			expect(result.isCorrect).toBe(true);
		});

		it('should apply requiredForm after rules pass', () => {
			const instance = createInstance([
				mathBlank('6', {
					validationRules: [{ type: 'divisor', dividend: '12' }],
					requiredForm: 'product' as RequiredForm
				})
			]);
			instance.resolvedVariables = [{ name: 'n', value: '12' }];

			// 6 is a divisor of 12, equivalent to 6, but NOT in product form
			const result = validateAnswer(['6'], instance, ['6']);
			expect(result.isCorrect).toBe(false);
			expect(result.status).toBe('bad_form');
		});

		it('should apply constraints after rules pass', () => {
			const instance = createInstance(
				[
					mathBlank('12345', {
						validationRules: [{ type: 'range', min: '10000', max: '20000' }]
					})
				],
				{
					constraints: {
						spaces: 'strict',
						products: 'off',
						brackets: 'off',
						zeros: 'off',
						form: 'off'
					}
				}
			);

			// 12345 passes range rule, equivalent to 12345, but spacing violation
			const result = validateAnswer(['12345'], instance, ['12345']);
			expect(result.isCorrect).toBe(false);
			expect(result.status).toBe('bad_form');
		});
	});

	describe('C13. No validationRules → inferred mode then requiredForm per-blank', () => {
		it('should apply blank.requiredForm (not instance.requiredForm)', () => {
			const instance = createInstance([
				mathBlank('6', { requiredForm: 'product' }),
				mathBlank('5', { requiredForm: 'sum' })
			]);

			// First blank: 6 as product ✓, second blank: 5 as sum ✓
			const result = validateAnswer(['6', '5'], instance, ['2 \\times 3', '2 + 3']);
			expect(result.isCorrect).toBe(true);
		});

		it('should reject when requiredForm violated on one blank', () => {
			const instance = createInstance([
				mathBlank('6', { requiredForm: 'product' }),
				mathBlank('5')
			]);

			// First blank: 6 not in product form → bad_form
			const result = validateAnswer(['6', '5'], instance, ['6', '5']);
			expect(result.isCorrect).toBe(false);
			expect(result.status).toBe('bad_form');
		});
	});

	describe('C14. No validationRules → inferred mode then constraints per-blank', () => {
		it('should apply constraints per-blank when correct + LaTeX available', () => {
			const instance = createInstance([mathBlank('5'), mathBlank('10')], {
				constraints: {
					brackets: 'strict',
					spaces: 'off',
					products: 'off',
					zeros: 'off',
					form: 'off'
				}
			});

			// First blank has unnecessary brackets
			const result = validateAnswer(['5', '10'], instance, ['(5)', '10']);
			expect(result.isCorrect).toBe(false);
			expect(result.status).toBe('bad_form');
		});

		it('should skip constraints when no LaTeX for a blank', () => {
			const instance = createInstance([mathBlank('5')], {
				constraints: {
					brackets: 'strict',
					spaces: 'off',
					products: 'off',
					zeros: 'off',
					form: 'off'
				}
			});

			// No LaTeX → skip constraint checks → correct
			const result = validateAnswer(['5'], instance);
			expect(result.isCorrect).toBe(true);
		});
	});
});

// ============================================================================
// D. MULTI-BLANK AGGREGATION
// ============================================================================

describe('Per-blank validation — Multi-blank aggregation', () => {
	it('D15. all blanks correct → isCorrect: true', () => {
		const instance = createInstance([mathBlank('3'), mathBlank('7'), textBlank('pair')]);

		const result = validateAnswer(['3', '7', 'pair'], instance);
		expect(result.isCorrect).toBe(true);
	});

	it('D16. at least one blank incorrect → isCorrect: false with feedback', () => {
		const instance = createInstance([mathBlank('3'), mathBlank('7'), textBlank('pair')]);

		const result = validateAnswer(['3', '99', 'pair'], instance);
		expect(result.isCorrect).toBe(false);
	});

	it('D17. orderIndependent with per-blank validation modes', () => {
		const instance = createInstance([mathBlank('3'), mathBlank('-3')], { orderIndependent: true });

		// Reversed order should be accepted
		const result = validateAnswer(['-3', '3'], instance);
		expect(result.isCorrect).toBe(true);
	});

	it('should handle mixed math and text blanks', () => {
		const instance = createInstance([mathBlank('42'), textBlank('pair')]);

		const result = validateAnswer(['42', 'pair'], instance);
		expect(result.isCorrect).toBe(true);
	});

	it('should handle mixed math and text with one incorrect', () => {
		const instance = createInstance([mathBlank('42'), textBlank('pair')]);

		const result = validateAnswer(['42', 'impair'], instance);
		expect(result.isCorrect).toBe(false);
	});
});

// ============================================================================
// E. VALIDATE ANSWER SIGNATURE CHANGES
// ============================================================================

describe('Per-blank validation — validateAnswer signature', () => {
	it('E18. polymorphic signature still works with single string', () => {
		const instance = createInstance([mathBlank('5')]);
		const result = validateAnswer('5', instance);
		expect(result.isCorrect).toBe(true);
	});

	it('E18b. polymorphic signature still works with number', () => {
		const instance = createInstance([mathBlank('5')]);
		const result = validateAnswer(5, instance);
		expect(result.isCorrect).toBe(true);
	});

	it('E19. branches via choices (multiple_choice still works)', () => {
		const instance: QuestionInstance = {
			templateId: 'test-mc',
			statement: 'Choose' as ResolvedMarkdown,
			choices: [{ content: 'A' as ResolvedMarkdown }, { content: 'B' as ResolvedMarkdown }],
			// NOTE (tests stale 2026-06-12): `solution` was renamed to
			// `correctChoiceIndex` (commits 89726bf2e / 6114e256e removed the legacy
			// `solution` fallback). Updated field name only — behaviour unchanged.
			correctChoiceIndex: '0',
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			generatedAt: new Date().toISOString()
		};

		const result = validateAnswer(0, instance);
		expect(result.isCorrect).toBe(true);
	});

	it('E20. requiredForm is per-blank, not global', () => {
		// Instance with global requiredForm but different per-blank
		const instance = createInstance([mathBlank('6', { requiredForm: 'sum' })]);
		// Also set instance-level requiredForm (should be ignored for fill_in_blanks)
		instance.requiredForm = 'product';

		// Answer is a sum (matches blank.requiredForm), not a product (instance.requiredForm)
		const result = validateAnswer(['6'], instance, ['4 + 2']);
		expect(result.isCorrect).toBe(true);
	});

	it('E21. instance.validationRules (global) is NOT used', () => {
		const instance = createInstance([mathBlank('42')]);
		// Set global validationRules that would reject '42'
		instance.validationRules = [{ type: 'range', min: '100', max: '200' }];

		// Global validationRules should be ignored, only per-blank matters
		const result = validateAnswer(['42'], instance);
		expect(result.isCorrect).toBe(true);
	});
});

// ============================================================================
// F. VALIDATE QUANTITY ANSWER NEW SIGNATURE
// ============================================================================

describe('validateQuantityAnswer — New signature', () => {
	it('F22. basic quantity validation with new signature', () => {
		const result = validateQuantityAnswer('5\\unit{km}', '5\\unit{km}');
		expect(result.isCorrect).toBe(true);
	});

	it('F22b. compatible unit conversion', () => {
		const result = validateQuantityAnswer('5000\\unit{m}', '5\\unit{km}');
		expect(result.isCorrect).toBe(true);
	});

	it('F23. requiredUnit rejects different symbol', () => {
		// 5 km = 5000 m but required unit is "m"
		const result = validateQuantityAnswer('5\\unit{km}', '5000\\unit{m}', undefined, 'm');
		expect(result.isCorrect).toBe(false);
	});

	it('F23b. requiredUnit accepts matching symbol', () => {
		const result = validateQuantityAnswer('5000\\unit{m}', '5000\\unit{m}', undefined, 'm');
		expect(result.isCorrect).toBe(true);
	});

	it('F24. precision tolerance with unit validation', () => {
		const precision: PrecisionType = { type: 'tolerance', tolerance: 0.5, mode: 'absolute' };
		// 10.3 is within ±0.5 of 10
		const result = validateQuantityAnswer('10.3\\unit{m}', '10\\unit{m}', precision);
		expect(result.isCorrect).toBe(true);
	});

	it('F24b. precision tolerance rejects outside range', () => {
		const precision: PrecisionType = { type: 'tolerance', tolerance: 0.1, mode: 'absolute' };
		// 10.5 is outside ±0.1 of 10
		const result = validateQuantityAnswer('10.5\\unit{m}', '10\\unit{m}', precision);
		expect(result.isCorrect).toBe(false);
	});

	it('F25. no precision, no requiredUnit → exact match', () => {
		const result = validateQuantityAnswer('5\\unit{km}', '5\\unit{km}');
		expect(result.isCorrect).toBe(true);
	});

	it('F25b. wrong value without precision → rejected', () => {
		const result = validateQuantityAnswer('6\\unit{km}', '5\\unit{km}');
		expect(result.isCorrect).toBe(false);
	});
});

// ============================================================================
// G. GENERATOR FIX (validationRules fallback)
// ============================================================================

// Generator tests are in instance-generator.test.ts.
// This section documents the expected behavior:
// - blank.validationRules ?? resolvedVariation.validationRules
// - Global validationRules should fall back to blanks that don't have their own

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Per-blank validation — Edge cases', () => {
	it('should handle empty blanks array gracefully', () => {
		const instance = createInstance([]);
		const result = validateAnswer([], instance);
		// No blanks = nothing to validate
		expect(result.isCorrect).toBe(true);
	});

	it('should handle mismatch between answers and blanks count', () => {
		const instance = createInstance([mathBlank('5'), mathBlank('10')]);
		const result = validateAnswer(['5'], instance);
		expect(result.isCorrect).toBe(false);
	});

	it('should validate prefilled blanks normally', () => {
		const instance = createInstance([mathBlank('42', { prefilled: '40' })]);
		// Prefilled value was 40, student changed to 42
		const result = validateAnswer(['42'], instance);
		expect(result.isCorrect).toBe(true);
	});

	it('should reject wrong answer on prefilled blank', () => {
		const instance = createInstance([mathBlank('42', { prefilled: '40' })]);
		// Student didn't change the prefilled value
		const result = validateAnswer(['40'], instance);
		expect(result.isCorrect).toBe(false);
	});
});
