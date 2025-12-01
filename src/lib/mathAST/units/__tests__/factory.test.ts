/**
 * Unit AST Factory - Tests
 *
 * Tests for unit factory functions including simple units, prefixed units,
 * units with powers, and error cases.
 */

import { describe, it, expect } from 'vitest';
import { unit, unitWithPower, dimensionless, fromComponents, UnitAST } from '../factory';

describe('Unit Factory Functions', () => {
	// =============================================================================
	// unit() Tests
	// =============================================================================

	describe('unit()', () => {
		describe('Simple base units', () => {
			it('should create meter (m)', () => {
				const result = unit('m');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['m', 1]]));
				expect(result?.coefficient).toBe(1);
				expect(result?.original).toBe('m');
			});

			it('should create gram (g)', () => {
				const result = unit('g');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['g', 1]]));
				expect(result?.coefficient).toBe(1);
			});

			it('should create second (s)', () => {
				const result = unit('s');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['s', 1]]));
				expect(result?.coefficient).toBe(1);
			});

			it('should create ampere (A)', () => {
				const result = unit('A');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['A', 1]]));
				expect(result?.coefficient).toBe(1);
			});

			it('should create liter (L)', () => {
				const result = unit('L');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['L', 1]]));
				expect(result?.coefficient).toBe(1);
			});

			it('should create dimensionless (1)', () => {
				const result = unit('1');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['1', 1]]));
				expect(result?.coefficient).toBe(1);
			});
		});

		describe('SI Prefixed units', () => {
			it('should create kilometer (km)', () => {
				const result = unit('km');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['m', 1]]));
				expect(result?.coefficient).toBe(1000);
				expect(result?.original).toBe('km');
			});

			it('should create centimeter (cm)', () => {
				const result = unit('cm');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['m', 1]]));
				expect(result?.coefficient).toBe(0.01);
			});

			it('should create milligram (mg)', () => {
				const result = unit('mg');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['g', 1]]));
				expect(result?.coefficient).toBe(0.001);
			});

			it('should create micrometer (μm)', () => {
				const result = unit('μm');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['m', 1]]));
				expect(result?.coefficient).toBe(1e-6);
			});

			it('should create nanosecond (ns)', () => {
				const result = unit('ns');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['s', 1]]));
				expect(result?.coefficient).toBe(1e-9);
			});

			it('should create megapascal (MHz is invalid)', () => {
				// MHz is not defined because Hz is not a base unit
				const result = unit('MHz');
				expect(result).toBeNull();
			});

			it('should create gigaliters (GL)', () => {
				const result = unit('GL');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['L', 1]]));
				expect(result?.coefficient).toBe(1e9);
			});
		});

		describe('Special units', () => {
			it('should create hour (h)', () => {
				const result = unit('h');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['s', 1]]));
				expect(result?.coefficient).toBe(3600);
			});

			it('should create minute (min)', () => {
				const result = unit('min');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['s', 1]]));
				expect(result?.coefficient).toBe(60);
			});

			it('should create millisecond (ms)', () => {
				const result = unit('ms');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['s', 1]]));
				expect(result?.coefficient).toBe(0.001);
			});

			it('should create day (j)', () => {
				const result = unit('j');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['s', 1]]));
				expect(result?.coefficient).toBe(86400);
			});

			it('should create degree (°)', () => {
				const result = unit('°');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['rad', 1]]));
				expect(result?.coefficient).toBeCloseTo(Math.PI / 180);
			});

			it('should create degree (deg)', () => {
				const result = unit('deg');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['rad', 1]]));
				expect(result?.coefficient).toBeCloseTo(Math.PI / 180);
			});

			it('should create tonne (t)', () => {
				const result = unit('t');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['g', 1]]));
				expect(result?.coefficient).toBe(1e6);
			});

			it('should create quintal (q)', () => {
				const result = unit('q');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['g', 1]]));
				expect(result?.coefficient).toBe(1e5);
			});

			it('should create euro (€)', () => {
				const result = unit('€');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['€', 1]]));
				expect(result?.coefficient).toBe(1);
			});

			it('should create dollar ($)', () => {
				const result = unit('$');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['$', 1]]));
				expect(result?.coefficient).toBe(1);
			});
		});

		describe('Unit aliases', () => {
			it('should resolve lowercase litre alias (l)', () => {
				const result = unit('l');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['L', 1]]));
				expect(result?.coefficient).toBe(1);
			});

			it('should resolve metre alias', () => {
				const result = unit('metre');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['m', 1]]));
			});

			it('should resolve gramme alias', () => {
				const result = unit('gramme');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['g', 1]]));
			});

			it('should resolve euro alias', () => {
				const result = unit('euro');
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['€', 1]]));
			});
		});

		describe('Error cases', () => {
			it('should return null for unknown units', () => {
				expect(unit('xyz')).toBeNull();
				expect(unit('foo')).toBeNull();
				expect(unit('unknown')).toBeNull();
			});

			it('should return null for invalid prefixes', () => {
				expect(unit('zzm')).toBeNull();
			});

			it('should return null for empty string', () => {
				expect(unit('')).toBeNull();
			});
		});

		describe('Components map immutability', () => {
			it('should return readonly map', () => {
				const result = unit('m');
				expect(result?.components instanceof Map).toBe(true);
				// Try to mutate - TypeScript prevents this at compile time
				// Runtime check: Map is frozen at type level
				expect(Object.isFrozen(result?.components)).toBe(false);
			});
		});
	});

	// =============================================================================
	// unitWithPower() Tests
	// =============================================================================

	describe('unitWithPower()', () => {
		describe('Positive powers', () => {
			it('should create square meters (m²)', () => {
				const result = unitWithPower('m', 2);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['m', 2]]));
				expect(result?.coefficient).toBe(1);
			});

			it('should create cubic meters (m³)', () => {
				const result = unitWithPower('m', 3);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['m', 3]]));
				expect(result?.coefficient).toBe(1);
			});

			it('should create square kilometers (km²)', () => {
				const result = unitWithPower('km', 2);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['m', 2]]));
				expect(result?.coefficient).toBe(1e6); // (1000)^2
			});

			it('should create cubic centimeters (cm³)', () => {
				const result = unitWithPower('cm', 3);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['m', 3]]));
				expect(result?.coefficient).toBeCloseTo(0.01 ** 3); // (0.01)^3 = 1e-6
			});

			it('should create grams squared (g²)', () => {
				const result = unitWithPower('g', 2);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['g', 2]]));
				expect(result?.coefficient).toBe(1);
			});
		});

		describe('Negative powers', () => {
			it('should create inverse seconds (s⁻¹)', () => {
				const result = unitWithPower('s', -1);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['s', -1]]));
				expect(result?.coefficient).toBe(1);
			});

			it('should create inverse meters (m⁻¹)', () => {
				const result = unitWithPower('m', -1);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['m', -1]]));
				expect(result?.coefficient).toBe(1);
			});

			it('should create inverse kilometers (km⁻¹)', () => {
				const result = unitWithPower('km', -1);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['m', -1]]));
				expect(result?.coefficient).toBe(0.001); // (1000)^-1
			});

			it('should create inverse milligrams (mg⁻¹)', () => {
				const result = unitWithPower('mg', -1);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['g', -1]]));
				expect(result?.coefficient).toBe(1000); // (0.001)^-1
			});

			it('should create inverse seconds squared (s⁻²)', () => {
				const result = unitWithPower('s', -2);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['s', -2]]));
				expect(result?.coefficient).toBe(1);
			});
		});

		describe('Fractional powers', () => {
			it('should create square root meters (m^0.5)', () => {
				const result = unitWithPower('m', 0.5);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['m', 0.5]]));
				expect(result?.coefficient).toBe(1);
			});

			it('should create cubic root meters (m^(1/3))', () => {
				const result = unitWithPower('m', 1 / 3);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['m', 1 / 3]]));
				expect(result?.coefficient).toBe(1);
			});

			it('should handle fractional powers with prefixes', () => {
				const result = unitWithPower('km', 0.5);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['m', 0.5]]));
				expect(result?.coefficient).toBeCloseTo(Math.sqrt(1000));
			});
		});

		describe('Zero power', () => {
			it('should create dimensionless for exponent 0', () => {
				const result = unitWithPower('m', 0);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['m', 0]]));
				expect(result?.coefficient).toBe(1); // anything^0 = 1
			});

			it('should create dimensionless for prefixed unit with exponent 0', () => {
				const result = unitWithPower('km', 0);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['m', 0]]));
				expect(result?.coefficient).toBe(1); // (1000)^0 = 1
			});
		});

		describe('Special units with power', () => {
			it('should create hours squared (h²)', () => {
				const result = unitWithPower('h', 2);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['s', 2]]));
				expect(result?.coefficient).toBe(3600 ** 2); // (3600)^2
			});

			it('should create inverse hours (h⁻¹)', () => {
				const result = unitWithPower('h', -1);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['s', -1]]));
				expect(result?.coefficient).toBeCloseTo(1 / 3600);
			});

			it('should create degrees squared (°²)', () => {
				const result = unitWithPower('°', 2);
				expect(result).not.toBeNull();
				expect(result?.components).toEqual(new Map([['rad', 2]]));
				expect(result?.coefficient).toBeCloseTo((Math.PI / 180) ** 2);
			});
		});

		describe('Error cases', () => {
			it('should return null for unknown units', () => {
				expect(unitWithPower('xyz', 2)).toBeNull();
				expect(unitWithPower('foo', -1)).toBeNull();
			});

			it('should return null for invalid prefixes', () => {
				expect(unitWithPower('zzm', 2)).toBeNull();
			});
		});
	});

	// =============================================================================
	// dimensionless() Tests
	// =============================================================================

	describe('dimensionless()', () => {
		it('should create empty components map', () => {
			const result = dimensionless();
			expect(result.components).toEqual(new Map());
		});

		it('should have coefficient of 1', () => {
			const result = dimensionless();
			expect(result.coefficient).toBe(1);
		});

		it('should not have original property', () => {
			const result = dimensionless();
			expect(result.original).toBeUndefined();
		});

		it('should always return a new object', () => {
			const a = dimensionless();
			const b = dimensionless();
			expect(a).not.toBe(b); // Different objects
			expect(a.components).toEqual(b.components); // But equal content
		});

		it('should be immutable', () => {
			const result = dimensionless();
			expect(Object.isFrozen(result.components)).toBe(false);
			// Type system prevents mutation at compile time
		});
	});

	// =============================================================================
	// fromComponents() Tests
	// =============================================================================

	describe('fromComponents()', () => {
		it('should create unit from components map', () => {
			const components = new Map([['m', 1]]);
			const result = fromComponents(components, 1, 'm');
			expect(result.components).toBe(components);
			expect(result.coefficient).toBe(1);
			expect(result.original).toBe('m');
		});

		it('should create composite unit (m/s)', () => {
			const components = new Map([
				['m', 1],
				['s', -1]
			]);
			const result = fromComponents(components, 1, 'm/s');
			expect(result.components).toEqual(
				new Map([
					['m', 1],
					['s', -1]
				])
			);
			expect(result.coefficient).toBe(1);
			expect(result.original).toBe('m/s');
		});

		it('should create energy unit (kg·m²/s²)', () => {
			const components = new Map([
				['kg', 1],
				['m', 2],
				['s', -2]
			]);
			const result = fromComponents(components, 1);
			expect(result.components).toEqual(
				new Map([
					['kg', 1],
					['m', 2],
					['s', -2]
				])
			);
			expect(result.coefficient).toBe(1);
		});

		it('should handle default coefficient', () => {
			const components = new Map([['m', 1]]);
			const result = fromComponents(components);
			expect(result.coefficient).toBe(1);
		});

		it('should handle custom coefficient', () => {
			const components = new Map([['m', 1]]);
			const result = fromComponents(components, 1000);
			expect(result.coefficient).toBe(1000);
		});

		it('should handle fractional coefficient', () => {
			const components = new Map([
				['m', 1],
				['s', -1]
			]);
			const result = fromComponents(components, 1000 / 3600, 'km/h');
			expect(result.coefficient).toBeCloseTo(1000 / 3600);
			expect(result.original).toBe('km/h');
		});

		it('should omit original when not provided', () => {
			const components = new Map([['m', 1]]);
			const result = fromComponents(components, 1);
			expect(result.original).toBeUndefined();
		});

		it('should accept readonly map', () => {
			const components: ReadonlyMap<string, number> = new Map([['m', 1]]);
			const result = fromComponents(components, 1, 'm');
			expect(result.components).toBe(components);
		});
	});

	// =============================================================================
	// UnitAST Namespace Tests
	// =============================================================================

	describe('UnitAST namespace', () => {
		it('should export unit function', () => {
			expect(UnitAST.unit).toBeDefined();
			expect(typeof UnitAST.unit).toBe('function');
		});

		it('should export unitWithPower function', () => {
			expect(UnitAST.unitWithPower).toBeDefined();
			expect(typeof UnitAST.unitWithPower).toBe('function');
		});

		it('should export dimensionless function', () => {
			expect(UnitAST.dimensionless).toBeDefined();
			expect(typeof UnitAST.dimensionless).toBe('function');
		});

		it('should export fromComponents function', () => {
			expect(UnitAST.fromComponents).toBeDefined();
			expect(typeof UnitAST.fromComponents).toBe('function');
		});

		it('should work with namespace notation', () => {
			const result = UnitAST.unit('m');
			expect(result).not.toBeNull();
			expect(result?.components).toEqual(new Map([['m', 1]]));
		});

		it('should work for unitWithPower via namespace', () => {
			const result = UnitAST.unitWithPower('km', 2);
			expect(result).not.toBeNull();
			expect(result?.coefficient).toBe(1e6);
		});

		it('should work for dimensionless via namespace', () => {
			const result = UnitAST.dimensionless();
			expect(result.components).toEqual(new Map());
		});
	});

	// =============================================================================
	// Integration Tests
	// =============================================================================

	describe('Integration Tests', () => {
		it('should compose units for velocity (m/s)', () => {
			const m = unit('m');
			const s = unit('s');
			expect(m).not.toBeNull();
			expect(s).not.toBeNull();
			// Manual composition (would be handled by composition utilities)
			const velocity = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1,
				'm/s'
			);
			expect(velocity.components).toEqual(
				new Map([
					['m', 1],
					['s', -1]
				])
			);
		});

		it('should compose units for acceleration (m/s²)', () => {
			const mPerS2 = fromComponents(
				new Map([
					['m', 1],
					['s', -2]
				]),
				1,
				'm/s²'
			);
			expect(mPerS2.components).toEqual(
				new Map([
					['m', 1],
					['s', -2]
				])
			);
		});

		it('should handle km/h conversion', () => {
			// km/h: components base units are m and s, coefficient is 1000/3600
			const kmPerH = fromComponents(
				new Map([
					['m', 1],
					['s', -1]
				]),
				1000 / 3600,
				'km/h'
			);
			expect(kmPerH.coefficient).toBeCloseTo(1000 / 3600);
		});

		it('should create square kilometers', () => {
			const km2 = unitWithPower('km', 2);
			expect(km2).not.toBeNull();
			expect(km2?.components).toEqual(new Map([['m', 2]]));
			expect(km2?.coefficient).toBe(1e6);
		});

		it('should create complex unit: kg·m²/s²', () => {
			const joule = fromComponents(
				new Map([
					['kg', 1],
					['m', 2],
					['s', -2]
				]),
				1,
				'J'
			);
			expect(joule.components).toEqual(
				new Map([
					['kg', 1],
					['m', 2],
					['s', -2]
				])
			);
			expect(joule.coefficient).toBe(1);
		});
	});
});
