/**
 * Tests for `loadPedagogicalRules()`.
 *
 * Verifies :
 * - Filtering by `applicableLevels`
 * - Inclusion of fraction rules in the appropriate levels
 * - Terminal addition for `targetForm: 'reduced-fraction'` and strict mode
 */

import { describe, expect, it } from 'vitest';
import { loadPedagogicalRules } from '../pedagogical-rules';

describe('loadPedagogicalRules', () => {
	it('primaire excludes grouping + most fractions, keeps atomic + addSameDenom + reduce', () => {
		const rules = loadPedagogicalRules({ schoolLevel: 'primaire' });
		const names = rules.map((r) => r.name);
		// Atomic basic operations are present
		expect(names).toContain('evaluate-binary-add');
		expect(names).toContain('evaluate-binary-mul');
		// Trivial simplifications are present
		expect(names).toContain('simplify-add-zero');
		expect(names).toContain('simplify-mul-zero');
		// Grouping rule is excluded in primaire
		expect(names).not.toContain('group-multiplications-in-addition');
		// Common denominator NOT in primaire (different denominators)
		expect(names).not.toContain('to-common-denominator');
		// addSameDenominator IS in primaire
		expect(names).toContain('add-same-denominator');
		// reduceFraction NOT in primaire (curriculum) — but can be re-added by target
		expect(names).not.toContain('reduce-fraction');
	});

	it('college includes grouping + all fraction rules', () => {
		const rules = loadPedagogicalRules({ schoolLevel: 'college' });
		const names = rules.map((r) => r.name);
		expect(names).toContain('group-multiplications-in-addition');
		expect(names).toContain('to-common-denominator');
		expect(names).toContain('multiply-fractions');
		expect(names).toContain('divide-fractions');
		expect(names).toContain('reduce-fraction');
	});

	it('lycee + superieur include the same set as college (at least for now)', () => {
		const collegeNames = new Set(
			loadPedagogicalRules({ schoolLevel: 'college' }).map((r) => r.name)
		);
		const lyceeNames = new Set(loadPedagogicalRules({ schoolLevel: 'lycee' }).map((r) => r.name));
		const superNames = new Set(
			loadPedagogicalRules({ schoolLevel: 'superieur' }).map((r) => r.name)
		);
		expect(lyceeNames).toEqual(collegeNames);
		expect(superNames).toEqual(collegeNames);
	});

	it('targetForm = "reduced-fraction" adds reduceFraction terminal even in primaire', () => {
		const rules = loadPedagogicalRules({
			schoolLevel: 'primaire',
			targetForm: 'reduced-fraction'
		});
		const names = rules.map((r) => r.name);
		expect(names).toContain('reduce-fraction');
	});

	it('needsReducedFractions: true adds reduceFraction terminal even in primaire', () => {
		const rules = loadPedagogicalRules({
			schoolLevel: 'primaire',
			needsReducedFractions: true
		});
		const names = rules.map((r) => r.name);
		expect(names).toContain('reduce-fraction');
	});

	it('does NOT add reduceFraction twice when already in college', () => {
		const rules = loadPedagogicalRules({
			schoolLevel: 'college',
			targetForm: 'reduced-fraction'
		});
		const reduceCount = rules.filter((r) => r.name === 'reduce-fraction').length;
		expect(reduceCount).toBe(1);
	});
});
