/**
 * Tests for builtin function domains registry
 */

import { describe, it, expect } from 'vitest';
import {
	BUILTIN_DOMAINS,
	getBuiltinDomain,
	hasRestrictedDomain,
	getBuiltinConstraintDescription
} from '../builtins';
import { containsValue } from '../algebra';

describe('BUILTIN_DOMAINS registry', () => {
	it('has domain for sqrt', () => {
		expect(BUILTIN_DOMAINS.has('sqrt')).toBe(true);
	});

	it('has domain for ln', () => {
		expect(BUILTIN_DOMAINS.has('ln')).toBe(true);
	});

	it('has domain for log', () => {
		expect(BUILTIN_DOMAINS.has('log')).toBe(true);
	});

	it('has domain for asin', () => {
		expect(BUILTIN_DOMAINS.has('asin')).toBe(true);
	});

	it('has domain for acos', () => {
		expect(BUILTIN_DOMAINS.has('acos')).toBe(true);
	});

	it('has domain for acosh', () => {
		expect(BUILTIN_DOMAINS.has('acosh')).toBe(true);
	});

	it('does not have domain for sin (unrestricted)', () => {
		// sin has universal domain, so it's not in restricted domains
		const domain = getBuiltinDomain('sin');
		expect(domain?.kind).toBe('universal');
	});
});

describe('getBuiltinDomain()', () => {
	describe('sqrt domain: [0, +infinity[', () => {
		it('returns non-negative reals domain', () => {
			const domain = getBuiltinDomain('sqrt');
			expect(domain).toBeDefined();
			expect(domain?.kind).toBe('interval_domain');
		});

		it('contains 0', () => {
			const domain = getBuiltinDomain('sqrt')!;
			expect(containsValue(domain, 0)).toBe(true);
		});

		it('contains positive values', () => {
			const domain = getBuiltinDomain('sqrt')!;
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, 100)).toBe(true);
		});

		it('does not contain negative values', () => {
			const domain = getBuiltinDomain('sqrt')!;
			expect(containsValue(domain, -1)).toBe(false);
			expect(containsValue(domain, -0.001)).toBe(false);
		});
	});

	describe('ln domain: ]0, +infinity[', () => {
		it('returns positive reals domain', () => {
			const domain = getBuiltinDomain('ln');
			expect(domain).toBeDefined();
		});

		it('does not contain 0', () => {
			const domain = getBuiltinDomain('ln')!;
			expect(containsValue(domain, 0)).toBe(false);
		});

		it('contains positive values', () => {
			const domain = getBuiltinDomain('ln')!;
			expect(containsValue(domain, 0.001)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);
		});

		it('does not contain negative values', () => {
			const domain = getBuiltinDomain('ln')!;
			expect(containsValue(domain, -1)).toBe(false);
		});
	});

	describe('log domain: ]0, +infinity[', () => {
		it('has same domain as ln', () => {
			const lnDomain = getBuiltinDomain('ln')!;
			const logDomain = getBuiltinDomain('log')!;
			expect(containsValue(logDomain, 0)).toBe(containsValue(lnDomain, 0));
			expect(containsValue(logDomain, 1)).toBe(containsValue(lnDomain, 1));
		});
	});

	describe('asin/arcsin domain: [-1, 1]', () => {
		it('returns unit interval for asin', () => {
			const domain = getBuiltinDomain('asin');
			expect(domain).toBeDefined();
		});

		it('contains -1, 0, 1', () => {
			const domain = getBuiltinDomain('asin')!;
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 0)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);
		});

		it('does not contain values outside [-1, 1]', () => {
			const domain = getBuiltinDomain('asin')!;
			expect(containsValue(domain, -1.01)).toBe(false);
			expect(containsValue(domain, 1.01)).toBe(false);
			expect(containsValue(domain, 2)).toBe(false);
		});

		it('arcsin is alias for asin', () => {
			const asinDomain = getBuiltinDomain('asin');
			const arcsinDomain = getBuiltinDomain('arcsin');
			expect(asinDomain).toEqual(arcsinDomain);
		});
	});

	describe('acos/arccos domain: [-1, 1]', () => {
		it('returns unit interval', () => {
			const domain = getBuiltinDomain('acos');
			expect(domain).toBeDefined();
			expect(containsValue(domain!, 0)).toBe(true);
			expect(containsValue(domain!, 2)).toBe(false);
		});

		it('arccos is alias for acos', () => {
			const acosDomain = getBuiltinDomain('acos');
			const arccosDomain = getBuiltinDomain('arccos');
			expect(acosDomain).toEqual(arccosDomain);
		});
	});

	describe('acosh domain: [1, +infinity[', () => {
		it('contains 1 and above', () => {
			const domain = getBuiltinDomain('acosh')!;
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, 10)).toBe(true);
		});

		it('does not contain values below 1', () => {
			const domain = getBuiltinDomain('acosh')!;
			expect(containsValue(domain, 0)).toBe(false);
			expect(containsValue(domain, 0.999)).toBe(false);
			expect(containsValue(domain, -1)).toBe(false);
		});
	});

	describe('universal domain functions', () => {
		it('exp has universal domain', () => {
			const domain = getBuiltinDomain('exp');
			expect(domain?.kind).toBe('universal');
		});

		it('sin has universal domain', () => {
			const domain = getBuiltinDomain('sin');
			expect(domain?.kind).toBe('universal');
		});

		it('cos has universal domain', () => {
			const domain = getBuiltinDomain('cos');
			expect(domain?.kind).toBe('universal');
		});

		it('atan has universal domain', () => {
			const domain = getBuiltinDomain('atan');
			expect(domain?.kind).toBe('universal');
		});

		it('sinh has universal domain', () => {
			const domain = getBuiltinDomain('sinh');
			expect(domain?.kind).toBe('universal');
		});

		it('cosh has universal domain', () => {
			const domain = getBuiltinDomain('cosh');
			expect(domain?.kind).toBe('universal');
		});

		it('tanh has universal domain', () => {
			const domain = getBuiltinDomain('tanh');
			expect(domain?.kind).toBe('universal');
		});
	});

	describe('case insensitivity', () => {
		it('SQRT returns same as sqrt', () => {
			expect(getBuiltinDomain('SQRT')).toEqual(getBuiltinDomain('sqrt'));
		});

		it('Ln returns same as ln', () => {
			expect(getBuiltinDomain('Ln')).toEqual(getBuiltinDomain('ln'));
		});

		it('ASIN returns same as asin', () => {
			expect(getBuiltinDomain('ASIN')).toEqual(getBuiltinDomain('asin'));
		});
	});

	describe('unknown functions', () => {
		it('returns undefined for unknown function', () => {
			expect(getBuiltinDomain('unknown_func')).toBeUndefined();
		});

		it('returns undefined for empty string', () => {
			expect(getBuiltinDomain('')).toBeUndefined();
		});
	});
});

describe('hasRestrictedDomain()', () => {
	it('returns true for sqrt', () => {
		expect(hasRestrictedDomain('sqrt')).toBe(true);
	});

	it('returns true for ln', () => {
		expect(hasRestrictedDomain('ln')).toBe(true);
	});

	it('returns true for asin', () => {
		expect(hasRestrictedDomain('asin')).toBe(true);
	});

	it('returns true for acosh', () => {
		expect(hasRestrictedDomain('acosh')).toBe(true);
	});

	it('returns false for sin (universal domain)', () => {
		expect(hasRestrictedDomain('sin')).toBe(false);
	});

	it('returns false for cos (universal domain)', () => {
		expect(hasRestrictedDomain('cos')).toBe(false);
	});

	it('returns false for exp (universal domain)', () => {
		expect(hasRestrictedDomain('exp')).toBe(false);
	});

	it('returns false for unknown function', () => {
		expect(hasRestrictedDomain('unknown_func')).toBe(false);
	});

	it('is case insensitive', () => {
		expect(hasRestrictedDomain('SQRT')).toBe(true);
		expect(hasRestrictedDomain('SIN')).toBe(false);
	});
});

describe('getBuiltinConstraintDescription()', () => {
	it('returns French description for sqrt', () => {
		const desc = getBuiltinConstraintDescription('sqrt');
		expect(desc).toBe('x >= 0');
	});

	it('returns French description for ln', () => {
		const desc = getBuiltinConstraintDescription('ln');
		expect(desc).toBe('x > 0');
	});

	it('returns French description for asin', () => {
		const desc = getBuiltinConstraintDescription('asin');
		expect(desc).toBe('-1 <= x <= 1');
	});

	it('returns French description for acosh', () => {
		const desc = getBuiltinConstraintDescription('acosh');
		expect(desc).toBe('x >= 1');
	});

	it('returns undefined for universal domain functions', () => {
		expect(getBuiltinConstraintDescription('sin')).toBeUndefined();
		expect(getBuiltinConstraintDescription('cos')).toBeUndefined();
	});

	it('returns undefined for unknown functions', () => {
		expect(getBuiltinConstraintDescription('unknown')).toBeUndefined();
	});
});
