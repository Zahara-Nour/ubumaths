/**
 * Unit AST - Imperial Units Tests
 *
 * Tests for imperial unit catalog: distance (in, ft, yd, mi),
 * mass (oz, lb), volume (gal, qt, pt, floz), French aliases,
 * and rejection of SI prefixes on imperial units.
 *
 * @see docs/wip/units-imperial-affine-progress.md
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { resolveUnit } from '../definitions';
import { unit } from '../factory';
import { getConversionFactor, unitsAreCompatible } from '../conversion';

describe('Imperial units - resolveUnit (catalog presence)', () => {
	describe('distance', () => {
		it('resolves "in" (inch) to length unit, coefficient 0.0254 m', () => {
			const def = resolveUnit('in');
			expect(def).not.toBeNull();
			expect(def?.baseSymbol).toBe('m');
			expect(def?.dimension).toBe('length');
			expect(def?.coefficient).toBeCloseTo(0.0254, 12);
		});

		it('resolves "ft" (foot) to length unit, coefficient 0.3048 m', () => {
			const def = resolveUnit('ft');
			expect(def).not.toBeNull();
			expect(def?.baseSymbol).toBe('m');
			expect(def?.coefficient).toBeCloseTo(0.3048, 12);
		});

		it('resolves "yd" (yard) to length unit, coefficient 0.9144 m', () => {
			const def = resolveUnit('yd');
			expect(def).not.toBeNull();
			expect(def?.baseSymbol).toBe('m');
			expect(def?.coefficient).toBeCloseTo(0.9144, 12);
		});

		it('resolves "mi" (mile) to length unit, coefficient 1609.344 m', () => {
			const def = resolveUnit('mi');
			expect(def).not.toBeNull();
			expect(def?.baseSymbol).toBe('m');
			expect(def?.coefficient).toBeCloseTo(1609.344, 9);
		});
	});

	describe('mass', () => {
		it('resolves "oz" (ounce avoirdupois) to mass unit, coefficient 28.349523125 g', () => {
			const def = resolveUnit('oz');
			expect(def).not.toBeNull();
			expect(def?.baseSymbol).toBe('g');
			expect(def?.dimension).toBe('mass');
			expect(def?.coefficient).toBeCloseTo(28.349523125, 12);
		});

		it('resolves "lb" (pound avoirdupois) to mass unit, coefficient 453.59237 g', () => {
			const def = resolveUnit('lb');
			expect(def).not.toBeNull();
			expect(def?.baseSymbol).toBe('g');
			expect(def?.coefficient).toBeCloseTo(453.59237, 9);
		});
	});

	describe('volume (US)', () => {
		it('resolves "gal" (US gallon) to volume unit, coefficient 3.785411784 L', () => {
			const def = resolveUnit('gal');
			expect(def).not.toBeNull();
			expect(def?.baseSymbol).toBe('L');
			expect(def?.dimension).toBe('volume');
			expect(def?.coefficient).toBeCloseTo(3.785411784, 12);
		});

		it('resolves "qt" (US quart) to volume unit, coefficient 0.946352946 L', () => {
			const def = resolveUnit('qt');
			expect(def).not.toBeNull();
			expect(def?.baseSymbol).toBe('L');
			expect(def?.coefficient).toBeCloseTo(0.946352946, 12);
		});

		it('resolves "pt" (US pint) to volume unit, coefficient 0.473176473 L', () => {
			const def = resolveUnit('pt');
			expect(def).not.toBeNull();
			expect(def?.baseSymbol).toBe('L');
			expect(def?.coefficient).toBeCloseTo(0.473176473, 12);
		});

		it('resolves "floz" (US fluid ounce) to volume unit, coefficient 0.0295735295625 L', () => {
			const def = resolveUnit('floz');
			expect(def).not.toBeNull();
			expect(def?.baseSymbol).toBe('L');
			expect(def?.coefficient).toBeCloseTo(0.0295735295625, 14);
		});
	});
});

describe('Imperial units - parseUnit', () => {
	it('parses "ft" as Unit with components Map([["m", 1]])', () => {
		const u = parse('ft');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(new Map([['m', 1]]));
		expect(u?.coefficient).toBeCloseTo(0.3048, 12);
	});

	it('parses "lb" as Unit with components Map([["g", 1]])', () => {
		const u = parse('lb');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(new Map([['g', 1]]));
		expect(u?.coefficient).toBeCloseTo(453.59237, 9);
	});

	it('parses "gal" as Unit with components Map([["L", 1]])', () => {
		const u = parse('gal');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(new Map([['L', 1]]));
		expect(u?.coefficient).toBeCloseTo(3.785411784, 12);
	});

	it('parses composite "ft^2" (square foot)', () => {
		const u = parse('ft^2');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(new Map([['m', 2]]));
		// (0.3048)^2 ≈ 0.09290304
		expect(u?.coefficient).toBeCloseTo(0.09290304, 10);
	});

	it('parses composite "mi/h" (miles per hour)', () => {
		const u = parse('mi/h');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(
			new Map([
				['m', 1],
				['s', -1]
			])
		);
		// 1609.344 / 3600 ≈ 0.44704 m/s
		expect(u?.coefficient).toBeCloseTo(1609.344 / 3600, 10);
	});
});

describe('Imperial units - SI prefix rejection', () => {
	it('rejects "kft" (kilo-foot) - returns null', () => {
		expect(resolveUnit('kft')).toBeNull();
		expect(parse('kft')).toBeNull();
	});

	it('rejects "Mlb" (mega-pound) - returns null', () => {
		expect(resolveUnit('Mlb')).toBeNull();
		expect(parse('Mlb')).toBeNull();
	});

	it('rejects "mmi" (milli-mile) - returns null', () => {
		expect(resolveUnit('mmi')).toBeNull();
		expect(parse('mmi')).toBeNull();
	});

	it('rejects "kgal" (kilo-gallon) - returns null', () => {
		expect(resolveUnit('kgal')).toBeNull();
		expect(parse('kgal')).toBeNull();
	});

	it('rejects "pin" (pico-inch) - returns null', () => {
		expect(resolveUnit('pin')).toBeNull();
		expect(parse('pin')).toBeNull();
	});
});

describe('Imperial units - French aliases', () => {
	it('resolves "pouce" → "in"', () => {
		const def = resolveUnit('pouce');
		expect(def).not.toBeNull();
		expect(def?.baseSymbol).toBe('m');
		expect(def?.coefficient).toBeCloseTo(0.0254, 12);
	});

	it('resolves "pied" → "ft"', () => {
		const def = resolveUnit('pied');
		expect(def).not.toBeNull();
		expect(def?.baseSymbol).toBe('m');
		expect(def?.coefficient).toBeCloseTo(0.3048, 12);
	});

	it('resolves "livre" → "lb"', () => {
		const def = resolveUnit('livre');
		expect(def).not.toBeNull();
		expect(def?.baseSymbol).toBe('g');
		expect(def?.coefficient).toBeCloseTo(453.59237, 9);
	});
});

describe('Imperial units - conversion factor', () => {
	it('converts 1 mi to 1609.344 m exactly', () => {
		const mi = unit('mi')!;
		const m = unit('m')!;
		const factor = getConversionFactor(mi, m);
		expect(factor).toBeCloseTo(1609.344, 9);
	});

	it('converts 1 mi to 1.609344 km', () => {
		const mi = unit('mi')!;
		const km = unit('km')!;
		const factor = getConversionFactor(mi, km);
		expect(factor).toBeCloseTo(1.609344, 9);
	});

	it('converts 1 lb to 453.59237 g', () => {
		const lb = unit('lb')!;
		const g = unit('g')!;
		const factor = getConversionFactor(lb, g);
		expect(factor).toBeCloseTo(453.59237, 9);
	});

	it('converts 1 lb to 0.45359237 kg', () => {
		const lb = unit('lb')!;
		const kg = unit('kg')!;
		const factor = getConversionFactor(lb, kg);
		expect(factor).toBeCloseTo(0.45359237, 12);
	});

	it('converts 1 gal to 3.785411784 L', () => {
		const gal = unit('gal')!;
		const L = unit('L')!;
		const factor = getConversionFactor(gal, L);
		expect(factor).toBeCloseTo(3.785411784, 12);
	});

	it('converts 1 ft to 12 in', () => {
		const ft = unit('ft')!;
		const inch = unit('in')!;
		const factor = getConversionFactor(ft, inch);
		expect(factor).toBeCloseTo(12, 9);
	});

	it('converts 1 yd to 3 ft', () => {
		const yd = unit('yd')!;
		const ft = unit('ft')!;
		const factor = getConversionFactor(yd, ft);
		expect(factor).toBeCloseTo(3, 9);
	});
});

describe('Imperial units - dimensional compatibility', () => {
	it('ft and m are compatible (both length)', () => {
		expect(unitsAreCompatible(unit('ft')!, unit('m')!)).toBe(true);
	});

	it('lb and kg are compatible (both mass)', () => {
		expect(unitsAreCompatible(unit('lb')!, unit('kg')!)).toBe(true);
	});

	it('gal and L are compatible (both volume)', () => {
		expect(unitsAreCompatible(unit('gal')!, unit('L')!)).toBe(true);
	});

	it('ft and lb are incompatible (length vs mass)', () => {
		expect(unitsAreCompatible(unit('ft')!, unit('lb')!)).toBe(false);
	});

	it('ft and s are incompatible (length vs time)', () => {
		expect(unitsAreCompatible(unit('ft')!, unit('s')!)).toBe(false);
	});
});
