/**
 * Tests for builtin function domains registry
 */

import { describe, it, expect } from 'vitest';
import {
	BUILTIN_DOMAINS,
	getBuiltinDomain,
	hasRestrictedDomain,
	getBuiltinConstraintDescription,
	BUILTIN_RANGES,
	getBuiltinRange,
	hasRestrictedRange
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
			expect(domain?.kind).toBe('interval_set');
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

describe('atanh domain: ]-1, 1[', () => {
	it('returns open interval domain', () => {
		const domain = getBuiltinDomain('atanh');
		expect(domain).toBeDefined();
		expect(domain?.kind).toBe('interval_set');
	});

	it('contains values strictly between -1 and 1', () => {
		const domain = getBuiltinDomain('atanh')!;
		expect(containsValue(domain, 0)).toBe(true);
		expect(containsValue(domain, 0.5)).toBe(true);
		expect(containsValue(domain, -0.5)).toBe(true);
		expect(containsValue(domain, 0.999)).toBe(true);
	});

	it('does not contain -1 or 1 (open endpoints)', () => {
		const domain = getBuiltinDomain('atanh')!;
		expect(containsValue(domain, -1)).toBe(false);
		expect(containsValue(domain, 1)).toBe(false);
	});

	it('does not contain values outside ]-1, 1[', () => {
		const domain = getBuiltinDomain('atanh')!;
		expect(containsValue(domain, -2)).toBe(false);
		expect(containsValue(domain, 2)).toBe(false);
		expect(containsValue(domain, -1.01)).toBe(false);
		expect(containsValue(domain, 1.01)).toBe(false);
	});

	it('has constraint description', () => {
		const constraint = getBuiltinConstraintDescription('atanh');
		expect(constraint).toBe('-1 < x < 1');
	});

	it('arctanh is alias for atanh', () => {
		const atanhDomain = getBuiltinDomain('atanh');
		const arctanhDomain = getBuiltinDomain('arctanh');
		expect(atanhDomain).toEqual(arctanhDomain);
	});
});

describe('sec, csc, cot domains', () => {
	it('sec has universal domain (periodic exclusions deferred)', () => {
		const domain = getBuiltinDomain('sec');
		expect(domain?.kind).toBe('universal');
	});

	it('csc has universal domain (periodic exclusions deferred)', () => {
		const domain = getBuiltinDomain('csc');
		expect(domain?.kind).toBe('universal');
	});

	it('cot has universal domain (periodic exclusions deferred)', () => {
		const domain = getBuiltinDomain('cot');
		expect(domain?.kind).toBe('universal');
	});
});

describe('asec/acsc domain: |x| >= 1', () => {
	it('asec returns multi-interval domain', () => {
		const domain = getBuiltinDomain('asec');
		expect(domain).toBeDefined();
		expect(domain?.kind).toBe('interval_set');
	});

	it('contains values where |x| >= 1', () => {
		const domain = getBuiltinDomain('asec')!;
		expect(containsValue(domain, 1)).toBe(true);
		expect(containsValue(domain, -1)).toBe(true);
		expect(containsValue(domain, 2)).toBe(true);
		expect(containsValue(domain, -2)).toBe(true);
		expect(containsValue(domain, 10)).toBe(true);
		expect(containsValue(domain, -10)).toBe(true);
	});

	it('does not contain values where |x| < 1', () => {
		const domain = getBuiltinDomain('asec')!;
		expect(containsValue(domain, 0)).toBe(false);
		expect(containsValue(domain, 0.5)).toBe(false);
		expect(containsValue(domain, -0.5)).toBe(false);
		expect(containsValue(domain, 0.999)).toBe(false);
		expect(containsValue(domain, -0.999)).toBe(false);
	});

	it('arcsec is alias for asec', () => {
		expect(getBuiltinDomain('arcsec')).toEqual(getBuiltinDomain('asec'));
	});

	it('acsc has same domain as asec', () => {
		const asecDomain = getBuiltinDomain('asec')!;
		const acscDomain = getBuiltinDomain('acsc')!;
		expect(containsValue(acscDomain, 0)).toBe(containsValue(asecDomain, 0));
		expect(containsValue(acscDomain, 1)).toBe(containsValue(asecDomain, 1));
		expect(containsValue(acscDomain, 2)).toBe(containsValue(asecDomain, 2));
	});

	it('arccsc is alias for acsc', () => {
		expect(getBuiltinDomain('arccsc')).toEqual(getBuiltinDomain('acsc'));
	});

	it('has constraint description', () => {
		expect(getBuiltinConstraintDescription('asec')).toBe('|x| >= 1');
		expect(getBuiltinConstraintDescription('acsc')).toBe('|x| >= 1');
	});
});

describe('acot domain', () => {
	it('acot has universal domain', () => {
		const domain = getBuiltinDomain('acot');
		expect(domain?.kind).toBe('universal');
	});

	it('arccot is alias for acot', () => {
		expect(getBuiltinDomain('arccot')).toEqual(getBuiltinDomain('acot'));
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

// =============================================================================
// Range (Output) Tests
// =============================================================================

describe('BUILTIN_RANGES registry', () => {
	it('has range for sqrt', () => {
		expect(BUILTIN_RANGES.has('sqrt')).toBe(true);
	});

	it('has range for sin', () => {
		expect(BUILTIN_RANGES.has('sin')).toBe(true);
	});

	it('has range for cos', () => {
		expect(BUILTIN_RANGES.has('cos')).toBe(true);
	});

	it('has range for exp', () => {
		expect(BUILTIN_RANGES.has('exp')).toBe(true);
	});

	it('has range for ln', () => {
		expect(BUILTIN_RANGES.has('ln')).toBe(true);
	});
});

describe('getBuiltinRange()', () => {
	describe('sqrt range: [0, +infinity[', () => {
		it('returns non-negative reals range', () => {
			const range = getBuiltinRange('sqrt');
			expect(range).toBeDefined();
			expect(range?.kind).toBe('interval_set');
		});

		it('contains 0 (closed lower bound)', () => {
			const range = getBuiltinRange('sqrt')!;
			expect(containsValue(range, 0)).toBe(true);
		});

		it('contains positive values', () => {
			const range = getBuiltinRange('sqrt')!;
			expect(containsValue(range, 1)).toBe(true);
			expect(containsValue(range, 100)).toBe(true);
		});

		it('does not contain negative values', () => {
			const range = getBuiltinRange('sqrt')!;
			expect(containsValue(range, -1)).toBe(false);
			expect(containsValue(range, -0.001)).toBe(false);
		});
	});

	describe('exp range: ]0, +infinity[', () => {
		it('returns positive reals range (open at 0)', () => {
			const range = getBuiltinRange('exp');
			expect(range).toBeDefined();
			expect(range?.kind).toBe('interval_set');
		});

		it('does not contain 0 (open lower bound)', () => {
			const range = getBuiltinRange('exp')!;
			expect(containsValue(range, 0)).toBe(false);
		});

		it('contains positive values', () => {
			const range = getBuiltinRange('exp')!;
			expect(containsValue(range, 0.001)).toBe(true);
			expect(containsValue(range, 1)).toBe(true);
			expect(containsValue(range, 100)).toBe(true);
		});

		it('does not contain negative values', () => {
			const range = getBuiltinRange('exp')!;
			expect(containsValue(range, -1)).toBe(false);
		});
	});

	describe('sin range: [-1, 1]', () => {
		it('returns closed unit interval', () => {
			const range = getBuiltinRange('sin');
			expect(range).toBeDefined();
			expect(range?.kind).toBe('interval_set');
		});

		it('contains -1, 0, 1 (closed bounds)', () => {
			const range = getBuiltinRange('sin')!;
			expect(containsValue(range, -1)).toBe(true);
			expect(containsValue(range, 0)).toBe(true);
			expect(containsValue(range, 1)).toBe(true);
		});

		it('contains values in between', () => {
			const range = getBuiltinRange('sin')!;
			expect(containsValue(range, 0.5)).toBe(true);
			expect(containsValue(range, -0.5)).toBe(true);
		});

		it('does not contain values outside [-1, 1]', () => {
			const range = getBuiltinRange('sin')!;
			expect(containsValue(range, -1.01)).toBe(false);
			expect(containsValue(range, 1.01)).toBe(false);
			expect(containsValue(range, 2)).toBe(false);
		});
	});

	describe('cos range: [-1, 1]', () => {
		it('has same range as sin', () => {
			const sinRange = getBuiltinRange('sin')!;
			const cosRange = getBuiltinRange('cos')!;
			expect(containsValue(cosRange, 0)).toBe(containsValue(sinRange, 0));
			expect(containsValue(cosRange, 1)).toBe(containsValue(sinRange, 1));
			expect(containsValue(cosRange, 2)).toBe(containsValue(sinRange, 2));
		});
	});

	describe('ln range: ]-infinity, +infinity[', () => {
		it('returns universal range', () => {
			const range = getBuiltinRange('ln');
			expect(range).toBeDefined();
			expect(range?.kind).toBe('universal');
		});
	});

	describe('tanh range: ]-1, 1[', () => {
		it('returns open interval (-1, 1)', () => {
			const range = getBuiltinRange('tanh');
			expect(range).toBeDefined();
			expect(range?.kind).toBe('interval_set');
		});

		it('does not contain -1 or 1 (open bounds)', () => {
			const range = getBuiltinRange('tanh')!;
			expect(containsValue(range, -1)).toBe(false);
			expect(containsValue(range, 1)).toBe(false);
		});

		it('contains values strictly between -1 and 1', () => {
			const range = getBuiltinRange('tanh')!;
			expect(containsValue(range, 0)).toBe(true);
			expect(containsValue(range, 0.5)).toBe(true);
			expect(containsValue(range, -0.5)).toBe(true);
			expect(containsValue(range, 0.999)).toBe(true);
		});
	});

	describe('cosh range: [1, +infinity[', () => {
		it('returns [1, +infinity[', () => {
			const range = getBuiltinRange('cosh');
			expect(range).toBeDefined();
			expect(range?.kind).toBe('interval_set');
		});

		it('contains 1 (minimum value)', () => {
			const range = getBuiltinRange('cosh')!;
			expect(containsValue(range, 1)).toBe(true);
		});

		it('contains values > 1', () => {
			const range = getBuiltinRange('cosh')!;
			expect(containsValue(range, 2)).toBe(true);
			expect(containsValue(range, 100)).toBe(true);
		});

		it('does not contain values < 1', () => {
			const range = getBuiltinRange('cosh')!;
			expect(containsValue(range, 0)).toBe(false);
			expect(containsValue(range, 0.999)).toBe(false);
			expect(containsValue(range, -1)).toBe(false);
		});
	});

	describe('asin range: [-pi/2, pi/2]', () => {
		it('contains 0', () => {
			const range = getBuiltinRange('asin')!;
			expect(containsValue(range, 0)).toBe(true);
		});

		it('contains ±pi/2', () => {
			const range = getBuiltinRange('asin')!;
			expect(containsValue(range, Math.PI / 2)).toBe(true);
			expect(containsValue(range, -Math.PI / 2)).toBe(true);
		});

		it('does not contain values outside [-pi/2, pi/2]', () => {
			const range = getBuiltinRange('asin')!;
			expect(containsValue(range, 2)).toBe(false);
			expect(containsValue(range, -2)).toBe(false);
		});
	});

	describe('acos range: [0, pi]', () => {
		it('contains 0 and pi', () => {
			const range = getBuiltinRange('acos')!;
			expect(containsValue(range, 0)).toBe(true);
			expect(containsValue(range, Math.PI)).toBe(true);
		});

		it('does not contain negative values', () => {
			const range = getBuiltinRange('acos')!;
			expect(containsValue(range, -0.1)).toBe(false);
		});

		it('does not contain values > pi', () => {
			const range = getBuiltinRange('acos')!;
			expect(containsValue(range, Math.PI + 0.1)).toBe(false);
		});
	});

	describe('atan range: ]-pi/2, pi/2[', () => {
		it('contains 0', () => {
			const range = getBuiltinRange('atan')!;
			expect(containsValue(range, 0)).toBe(true);
		});

		it('does not contain ±pi/2 (open bounds)', () => {
			const range = getBuiltinRange('atan')!;
			expect(containsValue(range, Math.PI / 2)).toBe(false);
			expect(containsValue(range, -Math.PI / 2)).toBe(false);
		});

		it('contains values just inside bounds', () => {
			const range = getBuiltinRange('atan')!;
			expect(containsValue(range, Math.PI / 2 - 0.01)).toBe(true);
			expect(containsValue(range, -Math.PI / 2 + 0.01)).toBe(true);
		});
	});

	describe('case insensitivity', () => {
		it('SQRT returns same as sqrt', () => {
			expect(getBuiltinRange('SQRT')).toEqual(getBuiltinRange('sqrt'));
		});

		it('SIN returns same as sin', () => {
			expect(getBuiltinRange('SIN')).toEqual(getBuiltinRange('sin'));
		});
	});

	describe('unknown functions', () => {
		it('returns undefined for unknown function', () => {
			expect(getBuiltinRange('unknown_func')).toBeUndefined();
		});
	});
});

describe('hasRestrictedRange()', () => {
	it('returns true for sqrt (bounded below)', () => {
		expect(hasRestrictedRange('sqrt')).toBe(true);
	});

	it('returns true for sin (bounded both sides)', () => {
		expect(hasRestrictedRange('sin')).toBe(true);
	});

	it('returns true for cos (bounded both sides)', () => {
		expect(hasRestrictedRange('cos')).toBe(true);
	});

	it('returns true for exp (bounded below)', () => {
		expect(hasRestrictedRange('exp')).toBe(true);
	});

	it('returns true for tanh (bounded both sides)', () => {
		expect(hasRestrictedRange('tanh')).toBe(true);
	});

	it('returns true for cosh (bounded below)', () => {
		expect(hasRestrictedRange('cosh')).toBe(true);
	});

	it('returns false for ln (unbounded)', () => {
		expect(hasRestrictedRange('ln')).toBe(false);
	});

	it('returns false for sinh (unbounded)', () => {
		expect(hasRestrictedRange('sinh')).toBe(false);
	});

	it('returns false for unknown function', () => {
		expect(hasRestrictedRange('unknown_func')).toBe(false);
	});

	it('is case insensitive', () => {
		expect(hasRestrictedRange('SQRT')).toBe(true);
		expect(hasRestrictedRange('LN')).toBe(false);
	});
});
