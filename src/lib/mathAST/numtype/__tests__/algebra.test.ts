/**
 * Tests for Type Algebra
 */

import { describe, it, expect } from 'vitest';
import {
	isSubtype,
	areCompatible,
	join,
	joinAll,
	meet,
	getParents,
	getAncestors,
	isLeafType,
	isAlgebraicBranch,
	isTranscendentalBranch
} from '../algebra';
import type { NumericType } from '../types';

describe('isSubtype', () => {
	it('should return true for same types', () => {
		const types: NumericType[] = [
			'integer',
			'rational',
			'irrational_algebraic',
			'algebraic',
			'transcendental',
			'real',
			'complex'
		];
		for (const t of types) {
			expect(isSubtype(t, t)).toBe(true);
		}
	});

	it('should handle integer subtypes correctly', () => {
		expect(isSubtype('integer', 'rational')).toBe(true);
		expect(isSubtype('integer', 'algebraic')).toBe(true);
		expect(isSubtype('integer', 'real')).toBe(true);
		expect(isSubtype('integer', 'complex')).toBe(true);
	});

	it('should handle rational subtypes correctly', () => {
		expect(isSubtype('rational', 'integer')).toBe(false);
		expect(isSubtype('rational', 'algebraic')).toBe(true);
		expect(isSubtype('rational', 'real')).toBe(true);
		expect(isSubtype('rational', 'complex')).toBe(true);
	});

	it('should handle irrational_algebraic subtypes correctly', () => {
		expect(isSubtype('irrational_algebraic', 'integer')).toBe(false);
		expect(isSubtype('irrational_algebraic', 'rational')).toBe(false);
		expect(isSubtype('irrational_algebraic', 'algebraic')).toBe(true);
		expect(isSubtype('irrational_algebraic', 'real')).toBe(true);
		expect(isSubtype('irrational_algebraic', 'complex')).toBe(true);
	});

	it('should handle algebraic subtypes correctly', () => {
		expect(isSubtype('algebraic', 'transcendental')).toBe(false);
		expect(isSubtype('algebraic', 'real')).toBe(true);
		expect(isSubtype('algebraic', 'complex')).toBe(true);
	});

	it('should handle transcendental subtypes correctly', () => {
		expect(isSubtype('transcendental', 'algebraic')).toBe(false);
		expect(isSubtype('transcendental', 'rational')).toBe(false);
		expect(isSubtype('transcendental', 'real')).toBe(true);
		expect(isSubtype('transcendental', 'complex')).toBe(true);
	});

	it('should handle unknown type', () => {
		expect(isSubtype('unknown', 'integer')).toBe(false);
		expect(isSubtype('unknown', 'real')).toBe(false);
		expect(isSubtype('integer', 'unknown')).toBe(false);
		expect(isSubtype('unknown', 'unknown')).toBe(true);
	});
});

describe('join (least upper bound)', () => {
	it('should return same type for identical inputs', () => {
		expect(join('integer', 'integer')).toBe('integer');
		expect(join('rational', 'rational')).toBe('rational');
		expect(join('real', 'real')).toBe('real');
	});

	it('should return supertype for subtype/supertype pairs', () => {
		expect(join('integer', 'rational')).toBe('rational');
		expect(join('rational', 'integer')).toBe('rational');
		expect(join('integer', 'real')).toBe('real');
		expect(join('rational', 'real')).toBe('real');
	});

	it('should return algebraic for rational and irrational_algebraic', () => {
		expect(join('rational', 'irrational_algebraic')).toBe('algebraic');
		expect(join('irrational_algebraic', 'rational')).toBe('algebraic');
	});

	it('should return real for algebraic and transcendental', () => {
		expect(join('algebraic', 'transcendental')).toBe('real');
		expect(join('transcendental', 'algebraic')).toBe('real');
	});

	it('should return complex when one operand is complex', () => {
		expect(join('integer', 'complex')).toBe('complex');
		expect(join('real', 'complex')).toBe('complex');
	});

	it('should propagate unknown', () => {
		expect(join('integer', 'unknown')).toBe('unknown');
		expect(join('unknown', 'real')).toBe('unknown');
	});
});

describe('joinAll', () => {
	it('should return unknown for empty array', () => {
		expect(joinAll([])).toBe('unknown');
	});

	it('should return single type for single-element array', () => {
		expect(joinAll(['integer'])).toBe('integer');
	});

	it('should join multiple types', () => {
		expect(joinAll(['integer', 'rational', 'irrational_algebraic'])).toBe('algebraic');
		expect(joinAll(['integer', 'transcendental'])).toBe('real');
	});
});

describe('meet (greatest lower bound)', () => {
	it('should return same type for identical inputs', () => {
		expect(meet('integer', 'integer')).toBe('integer');
		expect(meet('real', 'real')).toBe('real');
	});

	it('should return subtype for subtype/supertype pairs', () => {
		expect(meet('integer', 'rational')).toBe('integer');
		expect(meet('rational', 'integer')).toBe('integer');
		expect(meet('algebraic', 'real')).toBe('algebraic');
	});

	it('should return unknown for incompatible types', () => {
		expect(meet('algebraic', 'transcendental')).toBe('unknown');
		expect(meet('rational', 'irrational_algebraic')).toBe('unknown');
	});
});

describe('utility functions', () => {
	it('getParents should return direct parents', () => {
		expect(getParents('integer')).toEqual(['rational']);
		expect(getParents('rational')).toEqual(['algebraic']);
		expect(getParents('algebraic')).toEqual(['real']);
		expect(getParents('transcendental')).toEqual(['real']);
		expect(getParents('real')).toEqual(['complex']);
		expect(getParents('complex')).toEqual([]);
	});

	it('getAncestors should return all ancestors', () => {
		expect(getAncestors('integer')).toContain('rational');
		expect(getAncestors('integer')).toContain('algebraic');
		expect(getAncestors('integer')).toContain('real');
		expect(getAncestors('integer')).toContain('complex');
		expect(getAncestors('integer').size).toBe(4);
	});

	it('isLeafType should identify leaf types', () => {
		expect(isLeafType('integer')).toBe(true);
		expect(isLeafType('irrational_algebraic')).toBe(true);
		expect(isLeafType('transcendental')).toBe(true);
		expect(isLeafType('rational')).toBe(false);
		expect(isLeafType('algebraic')).toBe(false);
		expect(isLeafType('real')).toBe(false);
	});

	it('isAlgebraicBranch should identify algebraic types', () => {
		expect(isAlgebraicBranch('integer')).toBe(true);
		expect(isAlgebraicBranch('rational')).toBe(true);
		expect(isAlgebraicBranch('irrational_algebraic')).toBe(true);
		expect(isAlgebraicBranch('algebraic')).toBe(true);
		expect(isAlgebraicBranch('transcendental')).toBe(false);
		expect(isAlgebraicBranch('real')).toBe(false);
	});

	it('isTranscendentalBranch should identify transcendental types', () => {
		expect(isTranscendentalBranch('transcendental')).toBe(true);
		expect(isTranscendentalBranch('integer')).toBe(false);
		expect(isTranscendentalBranch('real')).toBe(false);
	});
});

describe('areCompatible', () => {
	it('should return true for types in same branch', () => {
		expect(areCompatible('integer', 'rational')).toBe(true);
		expect(areCompatible('rational', 'algebraic')).toBe(true);
		expect(areCompatible('algebraic', 'real')).toBe(true);
	});

	it('should return false for incompatible types', () => {
		expect(areCompatible('algebraic', 'transcendental')).toBe(false);
		expect(areCompatible('rational', 'irrational_algebraic')).toBe(false);
	});
});
