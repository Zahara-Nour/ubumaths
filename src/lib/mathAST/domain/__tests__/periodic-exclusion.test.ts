/**
 * Tests for PeriodicExclusion domain type
 */

import { describe, it, expect } from 'vitest';
import {
	periodicExclusion,
	tanDomain,
	cotDomain,
	secDomain,
	cscDomain,
	positiveReals
} from '../factory';
import {
	isEmpty,
	isUniversal,
	containsValue,
	intersect,
	union,
	complement,
	difference,
	excludePoints
} from '../algebra';
import { formatDomainInterval, formatDomainCondition } from '../format';
import { fromNumber } from '../factory';

describe('PeriodicExclusion type', () => {
	describe('factory functions', () => {
		it('creates a periodic exclusion with periodicExclusion()', () => {
			const pe = periodicExclusion({ type: 'number', value: '0' }, { type: 'greek', letter: 'pi' });
			expect(pe.kind).toBe('periodic_exclusion');
			expect(pe.basePoint).toEqual({ type: 'number', value: '0' });
			expect(pe.period).toEqual({ type: 'greek', letter: 'pi' });
		});

		it('tanDomain() creates ℝ \\ {π/2 + kπ}', () => {
			const d = tanDomain();
			expect(d.kind).toBe('periodic_exclusion');
			expect(d.basePoint.type).toBe('division');
			expect(d.period).toEqual({ type: 'greek', letter: 'pi' });
		});

		it('cotDomain() creates ℝ \\ {kπ}', () => {
			const d = cotDomain();
			expect(d.kind).toBe('periodic_exclusion');
			expect(d.basePoint).toEqual({ type: 'number', value: '0' });
			expect(d.period).toEqual({ type: 'greek', letter: 'pi' });
		});

		it('secDomain() is the same as tanDomain()', () => {
			const sec = secDomain();
			const tan = tanDomain();
			expect(sec).toEqual(tan);
		});

		it('cscDomain() is the same as cotDomain()', () => {
			const csc = cscDomain();
			const cot = cotDomain();
			expect(csc).toEqual(cot);
		});
	});

	describe('isEmpty()', () => {
		it('returns false for periodic exclusion', () => {
			expect(isEmpty(tanDomain())).toBe(false);
			expect(isEmpty(cotDomain())).toBe(false);
		});
	});

	describe('isUniversal()', () => {
		it('returns false for periodic exclusion (has exclusions)', () => {
			expect(isUniversal(tanDomain())).toBe(false);
			expect(isUniversal(cotDomain())).toBe(false);
		});
	});

	describe('containsValue()', () => {
		it('excludes π/2 from tan domain', () => {
			const d = tanDomain();
			expect(containsValue(d, Math.PI / 2)).toBe(false);
		});

		it('excludes 3π/2 from tan domain', () => {
			const d = tanDomain();
			expect(containsValue(d, (3 * Math.PI) / 2)).toBe(false);
		});

		it('excludes -π/2 from tan domain', () => {
			const d = tanDomain();
			expect(containsValue(d, -Math.PI / 2)).toBe(false);
		});

		it('contains 0 in tan domain', () => {
			const d = tanDomain();
			expect(containsValue(d, 0)).toBe(true);
		});

		it('contains π in tan domain', () => {
			const d = tanDomain();
			expect(containsValue(d, Math.PI)).toBe(true);
		});

		it('contains 1 in tan domain', () => {
			const d = tanDomain();
			expect(containsValue(d, 1)).toBe(true);
		});

		it('excludes 0 from cot domain', () => {
			const d = cotDomain();
			expect(containsValue(d, 0)).toBe(false);
		});

		it('excludes π from cot domain', () => {
			const d = cotDomain();
			expect(containsValue(d, Math.PI)).toBe(false);
		});

		it('excludes -π from cot domain', () => {
			const d = cotDomain();
			expect(containsValue(d, -Math.PI)).toBe(false);
		});

		it('excludes 2π from cot domain', () => {
			const d = cotDomain();
			expect(containsValue(d, 2 * Math.PI)).toBe(false);
		});

		it('contains π/2 in cot domain', () => {
			const d = cotDomain();
			expect(containsValue(d, Math.PI / 2)).toBe(true);
		});

		it('contains 1 in cot domain', () => {
			const d = cotDomain();
			expect(containsValue(d, 1)).toBe(true);
		});
	});

	describe('algebra operations', () => {
		it('intersect with interval returns the interval (conservative)', () => {
			const pe = tanDomain();
			const pos = positiveReals();
			const result = intersect(pe, pos);
			expect(result.kind).toBe('interval_set');
		});

		it('intersect two periodic exclusions returns first', () => {
			const result = intersect(tanDomain(), cotDomain());
			expect(result.kind).toBe('periodic_exclusion');
		});

		it('union with periodic returns periodic', () => {
			const pe = tanDomain();
			const pos = positiveReals();
			const result = union(pe, pos);
			expect(result.kind).toBe('periodic_exclusion');
		});

		it('complement returns empty (conservative)', () => {
			const result = complement(tanDomain());
			expect(result.kind).toBe('empty');
		});

		it('difference with periodic returns periodic if first is periodic', () => {
			const pe = tanDomain();
			const pos = positiveReals();
			const result = difference(pe, pos);
			expect(result.kind).toBe('periodic_exclusion');
		});

		it('excludePoints returns unchanged periodic', () => {
			const pe = tanDomain();
			const result = excludePoints(pe, [fromNumber(5)]);
			expect(result.kind).toBe('periodic_exclusion');
		});
	});

	describe('formatting', () => {
		it('formats tan domain as interval notation', () => {
			const s = formatDomainInterval(tanDomain());
			expect(s).toContain('ℝ');
			expect(s).toMatch(/[πp]/i); // π or pi
			expect(s).toContain('k');
			expect(s).toContain('∈');
			expect(s).toContain('ℤ');
		});

		it('formats cot domain with zero base', () => {
			const s = formatDomainInterval(cotDomain());
			expect(s).toContain('ℝ');
			expect(s).toMatch(/k·.*[πp]/i); // k·π or k·pi
		});

		it('formats tan domain as condition', () => {
			const s = formatDomainCondition(tanDomain(), 'x');
			expect(s).toContain('x');
			expect(s).toContain('≠');
			expect(s).toMatch(/[πp]/i); // π or pi
		});

		it('formats cot domain as condition with variable', () => {
			const s = formatDomainCondition(cotDomain(), 't');
			expect(s).toContain('t');
			expect(s).toContain('≠');
		});
	});
});
