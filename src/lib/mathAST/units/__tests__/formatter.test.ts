/**
 * Unit AST Formatter - Tests
 *
 * Tests for unit formatting in dot, fraction, and original styles.
 * Includes edge cases like dimensionless units, single components, and complex composite units.
 */

import { describe, it, expect } from 'vitest';
import { format, formatCoefficient, UnitFormatter } from '../formatter';
import { parse } from '../parser';
import { multiply, divide, invert } from '../operations';
import { unit, unitWithPower, dimensionless, fromComponents } from '../factory';

describe('Unit Formatter', () => {
	// =============================================================================
	// Format Coefficient Tests
	// =============================================================================

	describe('formatCoefficient', () => {
		it('should format integer coefficients', () => {
			expect(formatCoefficient(1)).toBe('1');
			expect(formatCoefficient(1000)).toBe('1000');
			expect(formatCoefficient(1000000)).toBe('1000000');
		});

		it('should format decimal coefficients', () => {
			expect(formatCoefficient(0.001)).toBe('0.001');
			expect(formatCoefficient(0.5)).toBe('0.5');
			expect(formatCoefficient(1.5)).toBe('1.5');
		});

		it('should handle scientific notation conversion', () => {
			// 1e-3 should be formatted as 0.001 or similar
			const result = formatCoefficient(1e-3);
			expect(parseFloat(result)).toBeCloseTo(0.001, 10);
		});

		it('should handle small fractional coefficients', () => {
			const result = formatCoefficient(1 / 3600); // hour to second
			expect(parseFloat(result)).toBeCloseTo(1 / 3600, 10);
		});
	});

	// =============================================================================
	// Dot Style Tests
	// =============================================================================

	describe("'dot' style", () => {
		it('should format simple units', () => {
			expect(format(unit('m')!, 'dot')).toBe('m');
			expect(format(unit('s')!, 'dot')).toBe('s');
			expect(format(unit('kg')!, 'dot')).toBe('g'); // Note: kg resolves to base unit 'g'
		});

		it('should format units with exponents', () => {
			expect(format(parse('m^2')!, 'dot')).toBe('m^2');
			expect(format(parse('s^-1')!, 'dot')).toBe('s^-1');
			expect(format(parse('m^3')!, 'dot')).toBe('m^3');
		});

		it('should omit exponent 1', () => {
			// Single exponent should not show ^1
			expect(format(unit('m')!, 'dot')).toBe('m');
			expect(format(unit('s')!, 'dot')).toBe('s');
		});

		it('should format composite units with alphabetical order', () => {
			const ms = multiply(unit('m')!, unit('s')!);
			expect(format(ms, 'dot')).toBe('m.s');

			// Reverse order should still be alphabetical
			const sm = multiply(unit('s')!, unit('m')!);
			expect(format(sm, 'dot')).toBe('m.s');
		});

		it('should format composite units with mixed exponents', () => {
			const result = parse('m.s^-1');
			expect(result).not.toBeNull();
			expect(format(result!, 'dot')).toBe('m.s^-1');
		});

		it('should format velocity units', () => {
			const ms_inv = divide(unit('m')!, unit('s')!);
			expect(format(ms_inv, 'dot')).toBe('m.s^-1');
		});

		it('should format acceleration units', () => {
			const result = parse('m/s^2');
			expect(result).not.toBeNull();
			expect(format(result!, 'dot')).toBe('m.s^-2');
		});

		it('should format energy/joule units', () => {
			const result = parse('kg.m^2/s^2');
			expect(result).not.toBeNull();
			// kg resolves to 'g' as base unit
			expect(format(result!, 'dot')).toBe('g.m^2.s^-2');
		});

		it('should format dimensionless units as "1"', () => {
			expect(format(dimensionless(), 'dot')).toBe('1');

			// Cancelling units should also be dimensionless
			const result = divide(unit('m')!, unit('m')!);
			expect(format(result, 'dot')).toBe('1');
		});

		it('should format only negative exponents', () => {
			const s_inv = invert(unit('s')!);
			expect(format(s_inv, 'dot')).toBe('s^-1');
		});

		it('should handle parsed units with multiple components', () => {
			const result = parse('m.kg.s');
			expect(result).not.toBeNull();
			// Should be alphabetical: g, m, s (kg resolves to 'g')
			expect(format(result!, 'dot')).toBe('g.m.s');
		});
	});

	// =============================================================================
	// Fraction Style Tests
	// =============================================================================

	describe("'fraction' style", () => {
		it('should format simple positive units without denominator', () => {
			expect(format(unit('m')!, 'fraction')).toBe('m');
			expect(format(unit('s')!, 'fraction')).toBe('s');
		});

		it('should format units with only positive exponents', () => {
			expect(format(parse('m^2')!, 'fraction')).toBe('m^2');
			expect(format(parse('m.s')!, 'fraction')).toBe('m.s');
		});

		it('should format velocity as m/s', () => {
			const result = parse('m/s');
			expect(result).not.toBeNull();
			expect(format(result!, 'fraction')).toBe('m/s');
		});

		it('should format only negative exponents as 1/denominator', () => {
			const s_inv = invert(unit('s')!);
			expect(format(s_inv, 'fraction')).toBe('1/s');

			const result = parse('s^-1');
			expect(result).not.toBeNull();
			expect(format(result!, 'fraction')).toBe('1/s');
		});

		it('should format multiple negative exponents in denominator', () => {
			const result = parse('m/s^2');
			expect(result).not.toBeNull();
			// m / (s^2)
			expect(format(result!, 'fraction')).toBe('m/s^2');
		});

		it('should format complex fraction with multiple numerator and denominator', () => {
			const result = parse('kg.m^2/s^2');
			expect(result).not.toBeNull();
			// kg=g in base units
			// g.m^2 / s^2
			expect(format(result!, 'fraction')).toBe('g.m^2/s^2');
		});

		it('should format acceleration as m/s^2', () => {
			const result = parse('m/s^2');
			expect(result).not.toBeNull();
			expect(format(result!, 'fraction')).toBe('m/s^2');
		});

		it('should format dimensionless as "1"', () => {
			expect(format(dimensionless(), 'fraction')).toBe('1');
		});

		it('should order components alphabetically in fraction', () => {
			// s.m / kg should become m.s / g (alphabetically)
			const result = parse('s.m/kg');
			expect(result).not.toBeNull();
			expect(format(result!, 'fraction')).toBe('m.s/g');
		});

		it('should handle result of operations without original', () => {
			// multiply two units (no original preserved)
			const result = multiply(unit('m')!, divide(unit('s')!, unit('s')!));
			// Should use fraction style correctly
			expect(format(result, 'fraction')).toBe('m');
		});
	});

	// =============================================================================
	// Original Style Tests
	// =============================================================================

	describe("'original' style", () => {
		it('should use original string when available', () => {
			const result = parse('km/h');
			expect(result).not.toBeNull();
			expect(format(result!, 'original')).toBe('km/h');
		});

		it('should use original string for parsed units', () => {
			const result = parse('m^2');
			expect(result).not.toBeNull();
			expect(format(result!, 'original')).toBe('m^2');
		});

		it('should fallback to dot style when original is not available', () => {
			const result = multiply(unit('m')!, unitWithPower('s', -1)!);
			// No original, should use dot style
			expect(format(result, 'original')).toBe('m.s^-1');
		});

		it('should preserve non-normalized originals', () => {
			// Parse with non-normalized notation
			const result = parse('s.m');
			expect(result).not.toBeNull();
			expect(format(result!, 'original')).toBe('s.m');
		});

		it('should preserve original for complex units', () => {
			const result = parse('kg.m^2/s^2');
			expect(result).not.toBeNull();
			expect(format(result!, 'original')).toBe('kg.m^2/s^2');
		});

		it('should fallback to dot for operation results', () => {
			// divide operation doesn't preserve original
			const a = parse('m');
			const b = parse('s');
			expect(a).not.toBeNull();
			expect(b).not.toBeNull();

			const result = divide(a!, b!);
			expect(format(result, 'original')).toBe('m.s^-1');
		});
	});

	// =============================================================================
	// Default Style Tests
	// =============================================================================

	describe('default style (dot)', () => {
		it('should use dot style by default', () => {
			const result = parse('m.s^-1');
			expect(result).not.toBeNull();
			expect(format(result!)).toBe('m.s^-1');
		});

		it('should be same as explicitly passing "dot"', () => {
			const result = parse('m/s');
			expect(result).not.toBeNull();
			expect(format(result!)).toBe(format(result!, 'dot'));
		});
	});

	// =============================================================================
	// Roundtrip Tests
	// =============================================================================

	describe('roundtrip (parse -> format -> parse)', () => {
		it('should roundtrip simple units with original style', () => {
			const input = 'm';
			const parsed1 = parse(input);
			expect(parsed1).not.toBeNull();

			const formatted = format(parsed1!, 'original');
			const parsed2 = parse(formatted);
			expect(parsed2).not.toBeNull();

			// Both should have same components and coefficient
			expect(parsed1!.components).toEqual(parsed2!.components);
			expect(parsed1!.coefficient).toBeCloseTo(parsed2!.coefficient, 10);
		});

		it('should roundtrip composite units with original style', () => {
			const input = 'km/h';
			const parsed1 = parse(input);
			expect(parsed1).not.toBeNull();

			const formatted = format(parsed1!, 'original');
			const parsed2 = parse(formatted);
			expect(parsed2).not.toBeNull();

			// Both should be dimensionally equivalent and have same coefficient
			expect(parsed1!.components).toEqual(parsed2!.components);
			expect(parsed1!.coefficient).toBeCloseTo(parsed2!.coefficient, 10);
		});

		it('should roundtrip energy units with original style', () => {
			const input = 'kg.m^2/s^2';
			const parsed1 = parse(input);
			expect(parsed1).not.toBeNull();

			const formatted = format(parsed1!, 'original');
			const parsed2 = parse(formatted);
			expect(parsed2).not.toBeNull();

			// Both should have same components and coefficient
			expect(parsed1!.components).toEqual(parsed2!.components);
			expect(parsed1!.coefficient).toBeCloseTo(parsed2!.coefficient, 10);
		});

		it('should preserve components when using dot/fraction styles', () => {
			// Note: Formatting with 'dot' or 'fraction' loses coefficient information
			// (e.g., 'km/h' becomes 'm.s^-1' with coefficient 1, not 1000/3600)
			// This is expected behavior - use 'original' style for lossless roundtrip
			const input = 'm.s^-1';
			const parsed1 = parse(input);
			expect(parsed1).not.toBeNull();

			const formatted = format(parsed1!, 'dot');
			const parsed2 = parse(formatted);
			expect(parsed2).not.toBeNull();

			// Components should match
			expect(parsed1!.components).toEqual(parsed2!.components);
		});

		it('should preserve components with fraction notation', () => {
			const input = 'm/s';
			const parsed1 = parse(input);
			expect(parsed1).not.toBeNull();

			const formatted = format(parsed1!, 'fraction');
			const parsed2 = parse(formatted);
			expect(parsed2).not.toBeNull();

			// Components should match
			expect(parsed1!.components).toEqual(parsed2!.components);
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('edge cases', () => {
		it('should handle dimensionless from operations', () => {
			const result = divide(unit('m')!, unit('m')!);
			expect(format(result, 'dot')).toBe('1');
			expect(format(result, 'fraction')).toBe('1');
			expect(format(result, 'original')).toBe('1');
		});

		it('should handle single negative exponent', () => {
			const result = unitWithPower('s', -1);
			expect(result).not.toBeNull();

			expect(format(result!, 'dot')).toBe('s^-1');
			expect(format(result!, 'fraction')).toBe('1/s');
		});

		it('should handle high exponents', () => {
			const result = parse('m^10');
			expect(result).not.toBeNull();
			expect(format(result!, 'dot')).toBe('m^10');
			expect(format(result!, 'fraction')).toBe('m^10');
		});

		it('should handle negative high exponents', () => {
			const result = parse('s^-3');
			expect(result).not.toBeNull();
			expect(format(result!, 'dot')).toBe('s^-3');
			expect(format(result!, 'fraction')).toBe('1/s^3');
		});

		it('should handle many components', () => {
			const result = parse('kg.m.s.A.K');
			expect(result).not.toBeNull();
			// Should be alphabetically sorted
			const formatted = format(result!, 'dot');
			// Components: A (ampere), g (from kg), K (kelvin), m, s
			expect(formatted).toContain('.');
			expect(formatted).not.toContain('^');
		});

		it('should handle fromComponents with various exponents', () => {
			const unit_custom = fromComponents(
				new Map([
					['m', 2],
					['s', -2],
					['g', 1]
				]),
				1,
				'custom_unit'
			);

			expect(format(unit_custom, 'dot')).toBe('g.m^2.s^-2');
			expect(format(unit_custom, 'fraction')).toBe('g.m^2/s^2');
			expect(format(unit_custom, 'original')).toBe('custom_unit');
		});
	});

	// =============================================================================
	// Namespace Tests
	// =============================================================================

	describe('UnitFormatter namespace', () => {
		it('should export format function', () => {
			expect(typeof UnitFormatter.format).toBe('function');
		});

		it('should export formatCoefficient function', () => {
			expect(typeof UnitFormatter.formatCoefficient).toBe('function');
		});

		it('should work with namespace syntax', () => {
			const result = parse('m/s');
			expect(result).not.toBeNull();
			expect(UnitFormatter.format(result!, 'dot')).toBe('m.s^-1');
		});
	});

	// =============================================================================
	// Special Units Tests
	// =============================================================================

	describe('special units', () => {
		it('should format degree symbol', () => {
			const result = parse('°');
			expect(result).not.toBeNull();
			expect(format(result!, 'original')).toBe('°');
			expect(format(result!, 'dot')).toBe('rad');
		});

		it('should format euro symbol', () => {
			const result = parse('€');
			expect(result).not.toBeNull();
			expect(format(result!, 'original')).toBe('€');
			expect(format(result!, 'dot')).toBe('€');
		});

		it('should format liter', () => {
			const result = parse('L');
			expect(result).not.toBeNull();
			expect(format(result!, 'original')).toBe('L');
			expect(format(result!, 'dot')).toBe('L');
		});
	});

	// =============================================================================
	// Real-World Examples
	// =============================================================================

	describe('real-world examples', () => {
		it('should format speed in km/h', () => {
			const result = parse('km/h');
			expect(result).not.toBeNull();

			expect(format(result!, 'original')).toBe('km/h');
			expect(format(result!, 'dot')).toBe('m.s^-1');
			expect(format(result!, 'fraction')).toBe('m/s');
		});

		it('should format density in kg/L', () => {
			const result = parse('kg/L');
			expect(result).not.toBeNull();

			expect(format(result!, 'original')).toBe('kg/L');
			expect(format(result!, 'dot')).toContain('.');
		});

		it('should format pressure', () => {
			// Force pressure: kg / (m.s^2)
			const result = parse('kg/(m.s^2)');
			if (!result) {
				// Fallback: manually create if parser doesn't support parentheses
				// kg / m / s^2 = kg.m^-1.s^-2
				const kgUnit = unit('kg')!;
				const mUnit = unit('m')!;
				const s2Unit = unitWithPower('s', 2)!;
				const result2 = divide(divide(kgUnit, mUnit), s2Unit);
				expect(format(result2, 'dot')).toContain('s^-2');
			} else {
				expect(format(result, 'dot')).toContain('s^-2');
			}
		});

		it('should format power in W (kg.m^2/s^3)', () => {
			const result = parse('kg.m^2/s^3');
			expect(result).not.toBeNull();

			expect(format(result!, 'dot')).toBe('g.m^2.s^-3');
			expect(format(result!, 'fraction')).toBe('g.m^2/s^3');
		});
	});
});
