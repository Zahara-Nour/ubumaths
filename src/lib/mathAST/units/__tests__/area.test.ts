/**
 * Unit AST - Area Units Tests (are, hectare, acre)
 *
 * Tests for area unit support:
 * - Catalog presence (a, ha, acre) with components Map([['m', 2]])
 * - parseUnit with full SI base components
 * - Conversion factors (ha ↔ m², acre ↔ ha, etc.)
 * - French aliases (are/ares → a, hectare/hectares → ha, acres → acre)
 * - SI prefix rejection (kha, mha, kacre, da, ca all return null)
 * - Composite operations (a^2 = m^4, ha/a = dimensionless)
 * - Dimensional compatibility with parse('m^2')
 *
 * @see docs/wip/units-area-progress.md
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { resolveUnit } from '../definitions';
import { unit } from '../factory';
import { getConversionFactor, unitsAreCompatible } from '../conversion';

// =============================================================================
// A. Catalog presence
// =============================================================================

describe('Area units - resolveUnit catalog', () => {
	it('resolves "a" (are) → 100 m², dimension area', () => {
		const def = resolveUnit('a');
		expect(def).not.toBeNull();
		expect(def?.dimension).toBe('area');
		expect(def?.coefficient).toBeCloseTo(100, 6);
		expect(def?.components).toEqual(new Map([['m', 2]]));
	});

	it('resolves "ha" (hectare) → 10 000 m², dimension area', () => {
		const def = resolveUnit('ha');
		expect(def).not.toBeNull();
		expect(def?.dimension).toBe('area');
		expect(def?.coefficient).toBeCloseTo(10000, 6);
		expect(def?.components).toEqual(new Map([['m', 2]]));
	});

	it('resolves "acre" → 4046.8564224 m² (exact), dimension area', () => {
		const def = resolveUnit('acre');
		expect(def).not.toBeNull();
		expect(def?.dimension).toBe('area');
		expect(def?.coefficient).toBeCloseTo(4046.8564224, 9);
		expect(def?.components).toEqual(new Map([['m', 2]]));
	});
});

// =============================================================================
// B. parseUnit
// =============================================================================

describe('Area units - parseUnit', () => {
	it('parses "a" with components Map([["m", 2]])', () => {
		const u = parse('a');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(new Map([['m', 2]]));
		expect(u?.coefficient).toBeCloseTo(100, 6);
	});

	it('parses "ha" with components Map([["m", 2]])', () => {
		const u = parse('ha');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(new Map([['m', 2]]));
		expect(u?.coefficient).toBeCloseTo(10000, 6);
	});

	it('parses "acre" with components Map([["m", 2]])', () => {
		const u = parse('acre');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(new Map([['m', 2]]));
		expect(u?.coefficient).toBeCloseTo(4046.8564224, 9);
	});

	it('parses "a^2" as m^4 (are squared = 10 000 m⁴)', () => {
		const u = parse('a^2');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(new Map([['m', 4]]));
		expect(u?.coefficient).toBeCloseTo(10000, 6);
	});

	it('parses "ha/a" as dimensionless with coefficient 100', () => {
		// 1 ha / 1 a = 10000 m² / 100 m² = 100 (dimensionless)
		const u = parse('ha/a');
		expect(u).not.toBeNull();
		expect(u?.components.size).toBe(0);
		expect(u?.coefficient).toBeCloseTo(100, 6);
	});

	it('parses "a*m" as m³ with coefficient 100', () => {
		// 1 a × 1 m = 100 m² × m = 100 m³
		const u = parse('a*m');
		expect(u).not.toBeNull();
		expect(u?.components).toEqual(new Map([['m', 3]]));
		expect(u?.coefficient).toBeCloseTo(100, 6);
	});
});

// =============================================================================
// C. Conversion factors
// =============================================================================

describe('Area units - conversions', () => {
	it('1 ha = 10 000 m²', () => {
		const ha = unit('ha')!;
		const m2 = parse('m^2')!;
		const factor = getConversionFactor(ha, m2);
		expect(factor).toBeCloseTo(10000, 6);
	});

	it('1 ha = 100 a', () => {
		const ha = unit('ha')!;
		const a = unit('a')!;
		const factor = getConversionFactor(ha, a);
		expect(factor).toBeCloseTo(100, 6);
	});

	it('1 acre ≈ 0.40468564 ha', () => {
		const acre = unit('acre')!;
		const ha = unit('ha')!;
		const factor = getConversionFactor(acre, ha);
		expect(factor).toBeCloseTo(0.40468564224, 10);
	});

	it('1 acre = 4046.8564224 m² exactly', () => {
		const acre = unit('acre')!;
		const m2 = parse('m^2')!;
		const factor = getConversionFactor(acre, m2);
		expect(factor).toBeCloseTo(4046.8564224, 9);
	});

	it('1 m² = 0.01 a (= 1 centiare)', () => {
		const m2 = parse('m^2')!;
		const a = unit('a')!;
		const factor = getConversionFactor(m2, a);
		expect(factor).toBeCloseTo(0.01, 12);
	});
});

// =============================================================================
// D. French aliases
// =============================================================================

describe('Area units - French aliases', () => {
	it('resolves "are" → a (singular alias)', () => {
		const def = resolveUnit('are');
		expect(def).not.toBeNull();
		expect(def?.coefficient).toBeCloseTo(100, 6);
		expect(def?.components).toEqual(new Map([['m', 2]]));
	});

	it('resolves "ares" → a (plural alias)', () => {
		const def = resolveUnit('ares');
		expect(def).not.toBeNull();
		expect(def?.coefficient).toBeCloseTo(100, 6);
	});

	it('resolves "hectare" → ha (singular alias)', () => {
		const def = resolveUnit('hectare');
		expect(def).not.toBeNull();
		expect(def?.coefficient).toBeCloseTo(10000, 6);
	});

	it('resolves "hectares" → ha (plural alias)', () => {
		const def = resolveUnit('hectares');
		expect(def).not.toBeNull();
		expect(def?.coefficient).toBeCloseTo(10000, 6);
	});

	it('resolves "acres" → acre (plural alias)', () => {
		const def = resolveUnit('acres');
		expect(def).not.toBeNull();
		expect(def?.coefficient).toBeCloseTo(4046.8564224, 9);
	});
});

// =============================================================================
// E. SI prefix rejection
// =============================================================================

describe('Area units - SI prefix rejection', () => {
	it('rejects "kha" (kilo-hectare) - returns null', () => {
		expect(resolveUnit('kha')).toBeNull();
		expect(parse('kha')).toBeNull();
	});

	it('rejects "mha" (milli-hectare) - returns null', () => {
		expect(resolveUnit('mha')).toBeNull();
		expect(parse('mha')).toBeNull();
	});

	it('rejects "kacre" (kilo-acre) - returns null', () => {
		expect(resolveUnit('kacre')).toBeNull();
		expect(parse('kacre')).toBeNull();
	});

	it('rejects "da" (deca-are, ambiguous) - returns null', () => {
		// This rejection depends on `a` being in SPECIAL_UNITS, not BASE_UNITS:
		// the prefix loop tries `d + a` and `da + ''` against BASE_UNITS only,
		// neither match. If `a` is ever moved to BASE_UNITS, this test breaks
		// and `da` would silently resolve to deci-are (= 10 m²).
		expect(resolveUnit('da')).toBeNull();
		expect(parse('da')).toBeNull();
	});

	it('rejects "ca" (centiare via prefix) - returns null', () => {
		// `c` is centi prefix, `a` would be base — but `a` is in SPECIAL_UNITS,
		// not BASE_UNITS, so the prefix loop fails. Use 0.01 a explicitly instead.
		expect(resolveUnit('ca')).toBeNull();
		expect(parse('ca')).toBeNull();
	});
});

// =============================================================================
// F. Dimensional compatibility
// =============================================================================

describe('Area units - dimensional compatibility', () => {
	it('a, ha, acre, and m² are all compatible (same dimension area)', () => {
		const a = unit('a')!;
		const ha = unit('ha')!;
		const acre = unit('acre')!;
		const m2 = parse('m^2')!;

		expect(unitsAreCompatible(a, ha)).toBe(true);
		expect(unitsAreCompatible(a, acre)).toBe(true);
		expect(unitsAreCompatible(a, m2)).toBe(true);
		expect(unitsAreCompatible(ha, acre)).toBe(true);
		expect(unitsAreCompatible(ha, m2)).toBe(true);
		expect(unitsAreCompatible(acre, m2)).toBe(true);
	});

	it('ha and m are NOT compatible (m² vs m, different exponents)', () => {
		const ha = unit('ha')!;
		const m = unit('m')!;
		expect(unitsAreCompatible(ha, m)).toBe(false);
	});

	it('ha and km² are compatible', () => {
		const ha = unit('ha')!;
		const km2 = parse('km^2')!;
		expect(unitsAreCompatible(ha, km2)).toBe(true);
	});

	it('1 km² = 100 ha', () => {
		const km2 = parse('km^2')!;
		const ha = unit('ha')!;
		const factor = getConversionFactor(km2, ha);
		expect(factor).toBeCloseTo(100, 6);
	});
});
