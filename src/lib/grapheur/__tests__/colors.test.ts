/**
 * Unit tests for Grapheur colors module — validation helpers.
 *
 * La palette et l'attribution des places : curve-palette.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { isValidColor, normalizeColor } from '../colors';

describe('isValidColor', () => {
	describe('hex colors', () => {
		it('accepts 6-digit hex colors', () => {
			expect(isValidColor('#2563eb')).toBe(true);
			expect(isValidColor('#FFFFFF')).toBe(true);
			expect(isValidColor('#000000')).toBe(true);
		});

		it('accepts 3-digit hex colors', () => {
			expect(isValidColor('#FFF')).toBe(true);
			expect(isValidColor('#000')).toBe(true);
			expect(isValidColor('#abc')).toBe(true);
		});

		it('accepts 8-digit hex colors (with alpha)', () => {
			expect(isValidColor('#2563ebFF')).toBe(true);
			expect(isValidColor('#00000080')).toBe(true);
		});

		it('accepts 4-digit hex colors (with alpha)', () => {
			expect(isValidColor('#FFFF')).toBe(true);
			expect(isValidColor('#0008')).toBe(true);
		});

		it('rejects invalid hex colors', () => {
			expect(isValidColor('#GGG')).toBe(false);
			expect(isValidColor('#12')).toBe(false);
			expect(isValidColor('#12345')).toBe(false);
			expect(isValidColor('#1234567')).toBe(false);
			expect(isValidColor('123456')).toBe(false); // Missing #
		});
	});

	describe('RGB/RGBA colors', () => {
		it('accepts valid rgb colors', () => {
			expect(isValidColor('rgb(255, 0, 0)')).toBe(true);
			expect(isValidColor('rgb(0,0,0)')).toBe(true);
			expect(isValidColor('rgb(123, 45, 67)')).toBe(true);
		});

		it('accepts valid rgba colors', () => {
			expect(isValidColor('rgba(255, 0, 0, 1)')).toBe(true);
			expect(isValidColor('rgba(0,0,0,0.5)')).toBe(true);
			expect(isValidColor('rgba(123, 45, 67, 0.75)')).toBe(true);
		});

		it('accepts rgb with extra whitespace', () => {
			expect(isValidColor('rgb( 255 , 0 , 0 )')).toBe(true);
		});

		it('rejects invalid rgb colors', () => {
			// Note: The regex accepts 3-digit numbers (including > 255)
			// and allows optional alpha (so rgb() with 4th param is valid)
			// This is a limitation of simple regex validation
			// For strict validation, would need more complex parsing
			expect(isValidColor('rgb(1, 2)')).toBe(false); // Missing value
			expect(isValidColor('rgb(1, 2, 3, 4, 5)')).toBe(false); // Too many values
			expect(isValidColor('rgb(1234, 0, 0)')).toBe(false); // 4 digits
			expect(isValidColor('rgb(1)')).toBe(false); // Only one value
		});
	});

	describe('HSL/HSLA colors', () => {
		it('accepts valid hsl colors', () => {
			expect(isValidColor('hsl(360, 100%, 50%)')).toBe(true);
			expect(isValidColor('hsl(0,0%,0%)')).toBe(true);
			expect(isValidColor('hsl(180, 50%, 75%)')).toBe(true);
		});

		it('accepts valid hsla colors', () => {
			expect(isValidColor('hsla(360, 100%, 50%, 1)')).toBe(true);
			expect(isValidColor('hsla(0,0%,0%,0.5)')).toBe(true);
			expect(isValidColor('hsla(180, 50%, 75%, 0.75)')).toBe(true);
		});

		it('accepts hsl with extra whitespace', () => {
			expect(isValidColor('hsl( 360 , 100% , 50% )')).toBe(true);
		});

		it('rejects invalid hsl colors', () => {
			expect(isValidColor('hsl(360, 100, 50)')).toBe(false); // Missing %
			expect(isValidColor('hsl(360, 100%, 50)')).toBe(false); // Missing %
			expect(isValidColor('hsl(1000, 100%, 50%)')).toBe(false); // > 360
		});
	});

	describe('named colors', () => {
		it('accepts common CSS named colors', () => {
			expect(isValidColor('red')).toBe(true);
			expect(isValidColor('blue')).toBe(true);
			expect(isValidColor('green')).toBe(true);
			expect(isValidColor('white')).toBe(true);
			expect(isValidColor('black')).toBe(true);
			expect(isValidColor('transparent')).toBe(true);
		});

		it('accepts named colors case-insensitively', () => {
			expect(isValidColor('RED')).toBe(true);
			expect(isValidColor('Blue')).toBe(true);
			expect(isValidColor('GREEN')).toBe(true);
		});

		it('accepts compound named colors', () => {
			expect(isValidColor('lightblue')).toBe(true);
			expect(isValidColor('darkgreen')).toBe(true);
			expect(isValidColor('cornflowerblue')).toBe(true);
		});

		it('rejects invalid named colors', () => {
			expect(isValidColor('notacolor')).toBe(false);
			expect(isValidColor('redd')).toBe(false);
			expect(isValidColor('light-blue')).toBe(false); // Has hyphen
		});
	});

	describe('edge cases', () => {
		it('rejects empty string', () => {
			expect(isValidColor('')).toBe(false);
		});

		it('rejects whitespace-only string', () => {
			expect(isValidColor('   ')).toBe(false);
		});

		it('rejects null/undefined', () => {
			// @ts-expect-error - Testing runtime behavior
			expect(isValidColor(null)).toBe(false);
			// @ts-expect-error - Testing runtime behavior
			expect(isValidColor(undefined)).toBe(false);
		});

		it('rejects non-string values', () => {
			// @ts-expect-error - Testing runtime behavior
			expect(isValidColor(123)).toBe(false);
			// @ts-expect-error - Testing runtime behavior
			expect(isValidColor({})).toBe(false);
		});

		it('trims whitespace', () => {
			expect(isValidColor('  #2563eb  ')).toBe(true);
			expect(isValidColor('  red  ')).toBe(true);
		});
	});
});

describe('normalizeColor', () => {
	it('converts to lowercase', () => {
		expect(normalizeColor('#2563EB')).toBe('#2563eb');
		expect(normalizeColor('#DC2626')).toBe('#dc2626');
	});

	it('trims whitespace', () => {
		expect(normalizeColor('  #2563eb  ')).toBe('#2563eb');
		expect(normalizeColor('  red  ')).toBe('red');
	});

	it('handles already normalized colors', () => {
		expect(normalizeColor('#2563eb')).toBe('#2563eb');
		expect(normalizeColor('red')).toBe('red');
	});

	it('handles empty string', () => {
		expect(normalizeColor('')).toBe('');
	});

	it('handles whitespace-only string', () => {
		expect(normalizeColor('   ')).toBe('');
	});

	it('normalizes RGB colors', () => {
		expect(normalizeColor('RGB(255, 0, 0)')).toBe('rgb(255, 0, 0)');
	});

	it('normalizes HSL colors', () => {
		expect(normalizeColor('HSL(360, 100%, 50%)')).toBe('hsl(360, 100%, 50%)');
	});
});
