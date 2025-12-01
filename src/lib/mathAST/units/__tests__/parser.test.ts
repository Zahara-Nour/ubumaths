/**
 * Unit AST Parser - Tests
 *
 * Tests for unit string parsing including simple units, composite units,
 * different operator styles, and error cases.
 */

import { describe, it, expect } from 'vitest';
import { parse, parseOrThrow, UnitParser } from '../parser';

describe('Unit Parser', () => {
	// =============================================================================
	// Simple Units
	// =============================================================================

	describe('Simple units', () => {
		it('should parse meter (m)', () => {
			const result = parse('m');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(new Map([['m', 1]]));
			expect(result?.coefficient).toBe(1);
			expect(result?.original).toBe('m');
		});

		it('should parse kilometer (km)', () => {
			const result = parse('km');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(new Map([['m', 1]]));
			expect(result?.coefficient).toBe(1000);
			expect(result?.original).toBe('km');
		});

		it('should parse second (s)', () => {
			const result = parse('s');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(new Map([['s', 1]]));
			expect(result?.coefficient).toBe(1);
			expect(result?.original).toBe('s');
		});

		it('should parse hour (h)', () => {
			const result = parse('h');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(new Map([['s', 1]]));
			expect(result?.coefficient).toBe(3600);
			expect(result?.original).toBe('h');
		});

		it('should parse kilogram (kg)', () => {
			const result = parse('kg');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(new Map([['g', 1]]));
			expect(result?.coefficient).toBe(1000);
			expect(result?.original).toBe('kg');
		});

		it('should parse liter (L)', () => {
			const result = parse('L');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(new Map([['L', 1]]));
			expect(result?.coefficient).toBe(1);
			expect(result?.original).toBe('L');
		});

		it('should parse degree (°)', () => {
			const result = parse('°');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(new Map([['rad', 1]]));
			expect(result?.coefficient).toBeCloseTo(Math.PI / 180, 10);
			expect(result?.original).toBe('°');
		});

		it('should parse euro (€)', () => {
			const result = parse('€');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(new Map([['€', 1]]));
			expect(result?.coefficient).toBe(1);
			expect(result?.original).toBe('€');
		});
	});

	// =============================================================================
	// Units with Exponents
	// =============================================================================

	describe('Units with exponents', () => {
		it('should parse m^2 (square meters)', () => {
			const result = parse('m^2');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(new Map([['m', 2]]));
			expect(result?.coefficient).toBe(1);
			expect(result?.original).toBe('m^2');
		});

		it('should parse s^-1 (per second)', () => {
			const result = parse('s^-1');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(new Map([['s', -1]]));
			expect(result?.coefficient).toBe(1);
			expect(result?.original).toBe('s^-1');
		});

		it('should parse kg^3 (cubic kilogram)', () => {
			const result = parse('kg^3');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(new Map([['g', 3]]));
			expect(result?.coefficient).toBe(1e9); // 1000^3
			expect(result?.original).toBe('kg^3');
		});

		it('should parse m^-2 (per square meter)', () => {
			const result = parse('m^-2');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(new Map([['m', -2]]));
			expect(result?.coefficient).toBe(1);
			expect(result?.original).toBe('m^-2');
		});

		it('should parse km^2 (square kilometer)', () => {
			const result = parse('km^2');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(new Map([['m', 2]]));
			expect(result?.coefficient).toBe(1e6); // 1000^2
			expect(result?.original).toBe('km^2');
		});
	});

	// =============================================================================
	// Composite Units with Dot (.)
	// =============================================================================

	describe('Composite units with dot (.)', () => {
		it('should parse m.s (meter-second)', () => {
			const result = parse('m.s');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['m', 1],
					['s', 1]
				])
			);
			expect(result?.coefficient).toBe(1);
			expect(result?.original).toBe('m.s');
		});

		it('should parse m.s^-1 (meters per second)', () => {
			const result = parse('m.s^-1');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['m', 1],
					['s', -1]
				])
			);
			expect(result?.coefficient).toBe(1);
			expect(result?.original).toBe('m.s^-1');
		});

		it('should parse kg.m.s^-2 (newton)', () => {
			const result = parse('kg.m.s^-2');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['g', 1],
					['m', 1],
					['s', -2]
				])
			);
			expect(result?.coefficient).toBe(1000); // kg -> g coefficient
			expect(result?.original).toBe('kg.m.s^-2');
		});

		it('should parse km.h^-1 (kilometers per hour)', () => {
			const result = parse('km.h^-1');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['m', 1],
					['s', -1]
				])
			);
			expect(result?.coefficient).toBeCloseTo(1000 / 3600, 10);
			expect(result?.original).toBe('km.h^-1');
		});

		it('should parse kg.m^2.s^-2 (joule)', () => {
			const result = parse('kg.m^2.s^-2');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['g', 1],
					['m', 2],
					['s', -2]
				])
			);
			expect(result?.coefficient).toBe(1000);
			expect(result?.original).toBe('kg.m^2.s^-2');
		});
	});

	// =============================================================================
	// Composite Units with Slash (/)
	// =============================================================================

	describe('Composite units with slash (/)', () => {
		it('should parse m/s (meters per second)', () => {
			const result = parse('m/s');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['m', 1],
					['s', -1]
				])
			);
			expect(result?.coefficient).toBe(1);
			expect(result?.original).toBe('m/s');
		});

		it('should parse km/h (kilometers per hour)', () => {
			const result = parse('km/h');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['m', 1],
					['s', -1]
				])
			);
			expect(result?.coefficient).toBeCloseTo(1000 / 3600, 10);
			expect(result?.original).toBe('km/h');
		});

		it('should parse kg/m^3 (density)', () => {
			const result = parse('kg/m^3');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['g', 1],
					['m', -3]
				])
			);
			expect(result?.coefficient).toBe(1000);
			expect(result?.original).toBe('kg/m^3');
		});

		it('should parse m^2/s (diffusivity)', () => {
			const result = parse('m^2/s');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['m', 2],
					['s', -1]
				])
			);
			expect(result?.coefficient).toBe(1);
			expect(result?.original).toBe('m^2/s');
		});

		it('should parse €/kg (price per mass)', () => {
			const result = parse('€/kg');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['€', 1],
					['g', -1]
				])
			);
			expect(result?.coefficient).toBe(1 / 1000);
			expect(result?.original).toBe('€/kg');
		});

		it('should parse L/s (flow rate)', () => {
			const result = parse('L/s');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['L', 1],
					['s', -1]
				])
			);
			expect(result?.coefficient).toBe(1);
			expect(result?.original).toBe('L/s');
		});
	});

	// =============================================================================
	// Alternative Multiplication Symbols
	// =============================================================================

	describe('Alternative multiplication symbols', () => {
		it('should parse m*s (asterisk)', () => {
			const result = parse('m*s');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['m', 1],
					['s', 1]
				])
			);
			expect(result?.coefficient).toBe(1);
			expect(result?.original).toBe('m*s');
		});

		it('should parse m·s (middle dot)', () => {
			const result = parse('m·s');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['m', 1],
					['s', 1]
				])
			);
			expect(result?.coefficient).toBe(1);
			expect(result?.original).toBe('m·s');
		});

		it('should parse kg*m*s^-2 (asterisk)', () => {
			const result = parse('kg*m*s^-2');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['g', 1],
					['m', 1],
					['s', -2]
				])
			);
			expect(result?.coefficient).toBe(1000);
			expect(result?.original).toBe('kg*m*s^-2');
		});

		it('should parse kg·m·s^-2 (middle dot)', () => {
			const result = parse('kg·m·s^-2');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['g', 1],
					['m', 1],
					['s', -2]
				])
			);
			expect(result?.coefficient).toBe(1000);
			expect(result?.original).toBe('kg·m·s^-2');
		});
	});

	// =============================================================================
	// Mixed Operators
	// =============================================================================

	describe('Mixed operators', () => {
		it('should parse kg.m/s^2 (newton)', () => {
			const result = parse('kg.m/s^2');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['g', 1],
					['m', 1],
					['s', -2]
				])
			);
			expect(result?.coefficient).toBe(1000);
			expect(result?.original).toBe('kg.m/s^2');
		});

		it('should parse kg*m/s^2 (newton with asterisk)', () => {
			const result = parse('kg*m/s^2');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['g', 1],
					['m', 1],
					['s', -2]
				])
			);
			expect(result?.coefficient).toBe(1000);
			expect(result?.original).toBe('kg*m/s^2');
		});

		it('should parse m/s/s (acceleration)', () => {
			const result = parse('m/s/s');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['m', 1],
					['s', -2]
				])
			);
			expect(result?.coefficient).toBe(1);
			expect(result?.original).toBe('m/s/s');
		});
	});

	// =============================================================================
	// Whitespace Handling
	// =============================================================================

	describe('Whitespace handling', () => {
		it('should trim leading whitespace', () => {
			const result = parse('  m');
			expect(result).not.toBeNull();
			expect(result?.original).toBe('m');
		});

		it('should trim trailing whitespace', () => {
			const result = parse('m  ');
			expect(result).not.toBeNull();
			expect(result?.original).toBe('m');
		});

		it('should trim both leading and trailing whitespace', () => {
			const result = parse('  m/s  ');
			expect(result).not.toBeNull();
			expect(result?.original).toBe('m/s');
		});

		it('should handle internal whitespace in simple units', () => {
			const result = parse('m / s');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['m', 1],
					['s', -1]
				])
			);
		});
	});

	// =============================================================================
	// Error Cases
	// =============================================================================

	describe('Error cases', () => {
		it('should return null for empty string', () => {
			const result = parse('');
			expect(result).toBeNull();
		});

		it('should return null for whitespace-only string', () => {
			const result = parse('   ');
			expect(result).toBeNull();
		});

		it('should return null for unknown symbol', () => {
			const result = parse('invalid');
			expect(result).toBeNull();
		});

		it('should return null for unknown symbol (xyz)', () => {
			const result = parse('xyz');
			expect(result).toBeNull();
		});

		it('should return null for exponent without symbol (^2)', () => {
			const result = parse('^2');
			expect(result).toBeNull();
		});

		it('should return null for incomplete exponent (m^)', () => {
			const result = parse('m^');
			expect(result).toBeNull();
		});

		it('should return null for double dots (m..s)', () => {
			const result = parse('m..s');
			expect(result).toBeNull();
		});

		it('should return null for leading operator (/m)', () => {
			const result = parse('/m');
			expect(result).toBeNull();
		});

		it('should return null for trailing operator (m/)', () => {
			const result = parse('m/');
			expect(result).toBeNull();
		});

		it('should return null for invalid characters (m@s)', () => {
			const result = parse('m@s');
			expect(result).toBeNull();
		});

		it('should return null for exponent with invalid format (m^2.5)', () => {
			const result = parse('m^2.5');
			expect(result).toBeNull();
		});

		it('should return null for unknown unit in composite (m.foo)', () => {
			const result = parse('m.foo');
			expect(result).toBeNull();
		});
	});

	// =============================================================================
	// Original Field Preservation
	// =============================================================================

	describe('Original field preservation', () => {
		it('should preserve simple unit', () => {
			const result = parse('m');
			expect(result?.original).toBe('m');
		});

		it('should preserve prefixed unit', () => {
			const result = parse('km');
			expect(result?.original).toBe('km');
		});

		it('should preserve composite unit with dot', () => {
			const result = parse('m.s^-1');
			expect(result?.original).toBe('m.s^-1');
		});

		it('should preserve composite unit with slash', () => {
			const result = parse('km/h');
			expect(result?.original).toBe('km/h');
		});

		it('should preserve unit with asterisk', () => {
			const result = parse('kg*m*s^-2');
			expect(result?.original).toBe('kg*m*s^-2');
		});

		it('should preserve unit with middle dot', () => {
			const result = parse('kg·m·s^-2');
			expect(result?.original).toBe('kg·m·s^-2');
		});

		it('should preserve trimmed version (remove whitespace)', () => {
			const result = parse('  m/s  ');
			expect(result?.original).toBe('m/s');
		});
	});

	// =============================================================================
	// parseOrThrow() Tests
	// =============================================================================

	describe('parseOrThrow()', () => {
		it('should parse valid unit', () => {
			const result = parseOrThrow('m');
			expect(result.components).toEqual(new Map([['m', 1]]));
			expect(result.coefficient).toBe(1);
		});

		it('should throw for invalid unit', () => {
			expect(() => parseOrThrow('invalid')).toThrow('Invalid unit string: invalid');
		});

		it('should throw for empty string', () => {
			expect(() => parseOrThrow('')).toThrow('Invalid unit string: ');
		});

		it('should throw for malformed unit', () => {
			expect(() => parseOrThrow('m^')).toThrow('Invalid unit string: m^');
		});
	});

	// =============================================================================
	// UnitParser Namespace Tests
	// =============================================================================

	describe('UnitParser namespace', () => {
		it('should have parse method', () => {
			const result = UnitParser.parse('m');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(new Map([['m', 1]]));
		});

		it('should have parseOrThrow method', () => {
			const result = UnitParser.parseOrThrow('m/s');
			expect(result.components).toEqual(
				new Map([
					['m', 1],
					['s', -1]
				])
			);
		});

		it('should throw in parseOrThrow for invalid input', () => {
			expect(() => UnitParser.parseOrThrow('invalid')).toThrow('Invalid unit string: invalid');
		});
	});

	// =============================================================================
	// Complex Real-World Examples
	// =============================================================================

	describe('Complex real-world examples', () => {
		it('should parse velocity (km/h)', () => {
			const result = parse('km/h');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['m', 1],
					['s', -1]
				])
			);
			expect(result?.coefficient).toBeCloseTo(1000 / 3600, 10);
		});

		it('should parse acceleration (m/s^2)', () => {
			const result = parse('m/s^2');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['m', 1],
					['s', -2]
				])
			);
			expect(result?.coefficient).toBe(1);
		});

		it('should parse force (kg.m.s^-2)', () => {
			const result = parse('kg.m.s^-2');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['g', 1],
					['m', 1],
					['s', -2]
				])
			);
			expect(result?.coefficient).toBe(1000);
		});

		it('should parse energy (kg.m^2.s^-2)', () => {
			const result = parse('kg.m^2.s^-2');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['g', 1],
					['m', 2],
					['s', -2]
				])
			);
			expect(result?.coefficient).toBe(1000);
		});

		it('should parse pressure (kg.m^-1.s^-2)', () => {
			const result = parse('kg.m^-1.s^-2');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['g', 1],
					['m', -1],
					['s', -2]
				])
			);
			expect(result?.coefficient).toBe(1000);
		});

		it('should parse density (kg/m^3)', () => {
			const result = parse('kg/m^3');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['g', 1],
					['m', -3]
				])
			);
			expect(result?.coefficient).toBe(1000);
		});

		it('should parse flow rate (L/min)', () => {
			const result = parse('L/min');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(
				new Map([
					['L', 1],
					['s', -1]
				])
			);
			expect(result?.coefficient).toBe(1 / 60);
		});
	});
});
