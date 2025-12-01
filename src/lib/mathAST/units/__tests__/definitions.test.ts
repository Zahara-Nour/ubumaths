/**
 * Unit AST Definitions - Tests
 *
 * Tests for unit resolution, SI prefixes, and special units
 */

import { describe, it, expect } from 'vitest';
import { resolveUnit, SI_PREFIXES, BASE_UNITS, SPECIAL_UNITS, UNIT_ALIASES } from '../definitions';

describe('resolveUnit', () => {
	describe('Base Units', () => {
		it('should resolve meter (m)', () => {
			const result = resolveUnit('m');
			expect(result).toEqual({
				symbol: 'm',
				baseSymbol: 'm',
				coefficient: 1,
				dimension: 'length',
				name: 'mètre'
			});
		});

		it('should resolve gram (g)', () => {
			const result = resolveUnit('g');
			expect(result).toEqual({
				symbol: 'g',
				baseSymbol: 'g',
				coefficient: 1,
				dimension: 'mass',
				name: 'gramme'
			});
		});

		it('should resolve second (s)', () => {
			const result = resolveUnit('s');
			expect(result).toEqual({
				symbol: 's',
				baseSymbol: 's',
				coefficient: 1,
				dimension: 'time',
				name: 'seconde'
			});
		});

		it('should resolve liter (L)', () => {
			const result = resolveUnit('L');
			expect(result?.dimension).toBe('volume');
		});
	});

	describe('SI Prefixed Units', () => {
		it('should resolve kilometer (km)', () => {
			const result = resolveUnit('km');
			expect(result).toEqual({
				symbol: 'km',
				baseSymbol: 'm',
				coefficient: 1000,
				dimension: 'length',
				name: 'kmètre'
			});
		});

		it('should resolve milligram (mg)', () => {
			const result = resolveUnit('mg');
			expect(result?.coefficient).toBe(0.001);
			expect(result?.baseSymbol).toBe('g');
		});

		it('should resolve centimeter (cm)', () => {
			const result = resolveUnit('cm');
			expect(result?.coefficient).toBe(0.01);
			expect(result?.baseSymbol).toBe('m');
		});

		it('should resolve micrometer (μm)', () => {
			const result = resolveUnit('μm');
			expect(result?.coefficient).toBe(1e-6);
			expect(result?.baseSymbol).toBe('m');
		});

		it('should resolve nanosecond (ns)', () => {
			const result = resolveUnit('ns');
			expect(result?.coefficient).toBe(1e-9);
			expect(result?.baseSymbol).toBe('s');
		});

		it('should resolve megahertz (MHz)', () => {
			// Note: Hz (hertz) is not defined as a base unit, so this should fail
			const result = resolveUnit('MHz');
			expect(result).toBeNull();
		});
	});

	describe('Special Units', () => {
		it('should resolve hour (h)', () => {
			const result = resolveUnit('h');
			expect(result).toEqual({
				symbol: 'h',
				baseSymbol: 's',
				coefficient: 3600,
				dimension: 'time',
				name: 'heure'
			});
		});

		it('should resolve minute (min)', () => {
			const result = resolveUnit('min');
			expect(result?.coefficient).toBe(60);
			expect(result?.baseSymbol).toBe('s');
		});

		it('should resolve millisecond (ms)', () => {
			const result = resolveUnit('ms');
			expect(result?.coefficient).toBe(0.001);
			expect(result?.baseSymbol).toBe('s');
			expect(result?.dimension).toBe('time');
		});

		it('should resolve degree (°)', () => {
			const result = resolveUnit('°');
			expect(result?.baseSymbol).toBe('rad');
			expect(result?.coefficient).toBeCloseTo(Math.PI / 180);
			expect(result?.dimension).toBe('angle');
		});

		it('should resolve tonne (t)', () => {
			const result = resolveUnit('t');
			expect(result?.coefficient).toBe(1e6);
			expect(result?.baseSymbol).toBe('g');
			expect(result?.dimension).toBe('mass');
		});

		it('should resolve euro (€)', () => {
			const result = resolveUnit('€');
			expect(result?.dimension).toBe('currency');
			expect(result?.coefficient).toBe(1);
		});

		it('should resolve dollar ($)', () => {
			const result = resolveUnit('$');
			expect(result?.dimension).toBe('currency');
		});
	});

	describe('Unit Aliases', () => {
		it('should resolve lowercase liter (l) to uppercase (L)', () => {
			const result = resolveUnit('l');
			expect(result?.symbol).toBe('L');
		});

		it('should resolve "euro" alias to €', () => {
			const result = resolveUnit('euro');
			expect(result?.symbol).toBe('€');
		});

		it('should resolve "minute" alias to "min"', () => {
			const result = resolveUnit('minute');
			expect(result?.symbol).toBe('min');
			expect(result?.coefficient).toBe(60);
		});

		it('should resolve "heure" alias to "h"', () => {
			const result = resolveUnit('heure');
			expect(result?.symbol).toBe('h');
			expect(result?.coefficient).toBe(3600);
		});

		it('should resolve "metre" alias to "m"', () => {
			const result = resolveUnit('metre');
			expect(result?.symbol).toBe('m');
		});
	});

	describe('Error Cases', () => {
		it('should return null for unknown unit', () => {
			const result = resolveUnit('xyz');
			expect(result).toBeNull();
		});

		it('should return null for invalid symbol', () => {
			const result = resolveUnit('foo');
			expect(result).toBeNull();
		});

		it('should return null for empty string', () => {
			const result = resolveUnit('');
			expect(result).toBeNull();
		});
	});

	describe('Edge Cases', () => {
		it('should handle case sensitivity correctly', () => {
			// Meter (m) should work
			expect(resolveUnit('m')).not.toBeNull();
			// But 'M' (mega prefix, standalone) should fail
			const resultM = resolveUnit('M');
			expect(resultM).toBeNull();
		});

		it('should handle prefix ambiguity by longest match', () => {
			// 'da' (deca) is longer than 'd' (deci)
			// So 'dam' should be deca-meter, not deci-something
			const result = resolveUnit('dam');
			expect(result?.coefficient).toBe(10);
			expect(result?.baseSymbol).toBe('m');
		});

		it('should distinguish between prefix m (milli) and base unit m (meter)', () => {
			// mm = milli-meter (not meter-meter)
			const result = resolveUnit('mm');
			expect(result?.coefficient).toBe(0.001);
			expect(result?.baseSymbol).toBe('m');
		});
	});

	describe('SI_PREFIXES Map', () => {
		it('should have correct prefix factors', () => {
			expect(SI_PREFIXES.get('k')).toBe(1e3);
			expect(SI_PREFIXES.get('m')).toBe(1e-3);
			expect(SI_PREFIXES.get('μ')).toBe(1e-6);
			expect(SI_PREFIXES.get('G')).toBe(1e9);
		});

		it('should have no-prefix entry', () => {
			expect(SI_PREFIXES.get('')).toBe(1);
		});
	});

	describe('BASE_UNITS Map', () => {
		it('should contain standard SI base units', () => {
			const baseUnitSymbols = ['m', 'g', 's', 'A', 'K', 'mol', 'cd'];
			baseUnitSymbols.forEach((symbol) => {
				expect(BASE_UNITS.has(symbol)).toBe(true);
			});
		});

		it('should have dimension and name for each base unit', () => {
			const m = BASE_UNITS.get('m');
			expect(m?.dimension).toBe('length');
			expect(m?.name).toBe('mètre');
		});
	});

	describe('SPECIAL_UNITS Map', () => {
		it('should contain time units', () => {
			expect(SPECIAL_UNITS.has('h')).toBe(true);
			expect(SPECIAL_UNITS.has('min')).toBe(true);
			expect(SPECIAL_UNITS.has('ms')).toBe(true);
		});

		it('should contain mass units', () => {
			expect(SPECIAL_UNITS.has('t')).toBe(true);
			expect(SPECIAL_UNITS.has('q')).toBe(true);
		});

		it('should contain angle units', () => {
			expect(SPECIAL_UNITS.has('°')).toBe(true);
			expect(SPECIAL_UNITS.has('deg')).toBe(true);
		});

		it('should contain currency units', () => {
			expect(SPECIAL_UNITS.has('€')).toBe(true);
			expect(SPECIAL_UNITS.has('$')).toBe(true);
		});
	});

	describe('UNIT_ALIASES Map', () => {
		it('should have aliases for common units', () => {
			expect(UNIT_ALIASES.get('l')).toBe('L');
			expect(UNIT_ALIASES.get('euro')).toBe('€');
			expect(UNIT_ALIASES.get('metre')).toBe('m');
		});
	});
});
