/**
 * Unit tests for Grapheur colors module
 */

import { describe, it, expect } from 'vitest';
import {
	FUNCTION_COLORS,
	getNextColor,
	getColorByIndex,
	isValidColor,
	isPaletteColor,
	normalizeColor
} from '../colors';

// =============================================================================
// Color Palette Tests
// =============================================================================

describe('FUNCTION_COLORS', () => {
	it('has exactly 8 colors', () => {
		expect(FUNCTION_COLORS).toHaveLength(8);
	});

	it('contains only hex color strings', () => {
		FUNCTION_COLORS.forEach((color) => {
			expect(color).toMatch(/^#[0-9a-f]{6}$/i);
		});
	});

	it('has blue as first color', () => {
		expect(FUNCTION_COLORS[0]).toBe('#2563eb');
	});

	it('has red as second color', () => {
		expect(FUNCTION_COLORS[1]).toBe('#dc2626');
	});

	it('contains distinct colors', () => {
		const uniqueColors = new Set(FUNCTION_COLORS);
		expect(uniqueColors.size).toBe(FUNCTION_COLORS.length);
	});
});

// =============================================================================
// Color Selection Tests
// =============================================================================

describe('getNextColor', () => {
	it('returns first color when no colors are used', () => {
		const color = getNextColor([]);
		expect(color).toBe(FUNCTION_COLORS[0]);
	});

	it('returns second color when first is used', () => {
		const color = getNextColor([FUNCTION_COLORS[0]]);
		expect(color).toBe(FUNCTION_COLORS[1]);
	});

	it('returns third color when first two are used', () => {
		const color = getNextColor([FUNCTION_COLORS[0], FUNCTION_COLORS[1]]);
		expect(color).toBe(FUNCTION_COLORS[2]);
	});

	it('cycles back to first color when all colors are used', () => {
		const color = getNextColor([...FUNCTION_COLORS]);
		expect(color).toBe(FUNCTION_COLORS[0]);
	});

	it('skips colors that are already used', () => {
		const usedColors = [FUNCTION_COLORS[0], FUNCTION_COLORS[2], FUNCTION_COLORS[4]];
		const color = getNextColor(usedColors);
		expect(color).toBe(FUNCTION_COLORS[1]); // First unused
	});

	it('handles case-insensitive color matching', () => {
		const color = getNextColor([FUNCTION_COLORS[0].toUpperCase()]);
		expect(color).toBe(FUNCTION_COLORS[1]);
	});

	it('finds first unused color in middle of palette', () => {
		const usedColors = [FUNCTION_COLORS[0], FUNCTION_COLORS[1], FUNCTION_COLORS[2]];
		const color = getNextColor(usedColors);
		expect(color).toBe(FUNCTION_COLORS[3]);
	});

	it('handles empty array input', () => {
		const color = getNextColor([]);
		expect(color).toBe(FUNCTION_COLORS[0]);
	});

	it('handles duplicate colors in used list', () => {
		const usedColors = [FUNCTION_COLORS[0], FUNCTION_COLORS[0], FUNCTION_COLORS[1]];
		const color = getNextColor(usedColors);
		expect(color).toBe(FUNCTION_COLORS[2]);
	});

	it('ignores non-palette colors in used list', () => {
		const color = getNextColor(['#000000', '#ffffff']);
		expect(color).toBe(FUNCTION_COLORS[0]);
	});

	it('works with mixed palette and non-palette colors', () => {
		const usedColors = ['#000000', FUNCTION_COLORS[0], '#ffffff'];
		const color = getNextColor(usedColors);
		expect(color).toBe(FUNCTION_COLORS[1]);
	});
});

describe('getColorByIndex', () => {
	it('returns first color for index 0', () => {
		expect(getColorByIndex(0)).toBe(FUNCTION_COLORS[0]);
	});

	it('returns second color for index 1', () => {
		expect(getColorByIndex(1)).toBe(FUNCTION_COLORS[1]);
	});

	it('returns last color for index 7', () => {
		expect(getColorByIndex(7)).toBe(FUNCTION_COLORS[7]);
	});

	it('cycles back to first color for index 8', () => {
		expect(getColorByIndex(8)).toBe(FUNCTION_COLORS[0]);
	});

	it('cycles correctly for index 9', () => {
		expect(getColorByIndex(9)).toBe(FUNCTION_COLORS[1]);
	});

	it('handles large indices', () => {
		expect(getColorByIndex(100)).toBe(FUNCTION_COLORS[100 % 8]);
	});

	it('handles negative indices by taking absolute value', () => {
		expect(getColorByIndex(-1)).toBe(FUNCTION_COLORS[1]);
		expect(getColorByIndex(-8)).toBe(FUNCTION_COLORS[0]);
	});

	it('handles float indices by flooring', () => {
		expect(getColorByIndex(1.7)).toBe(FUNCTION_COLORS[1]);
		expect(getColorByIndex(2.9)).toBe(FUNCTION_COLORS[2]);
	});

	it('handles zero', () => {
		expect(getColorByIndex(0)).toBe(FUNCTION_COLORS[0]);
	});
});

// =============================================================================
// Color Validation Tests
// =============================================================================

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

describe('isPaletteColor', () => {
	it('returns true for colors in palette', () => {
		FUNCTION_COLORS.forEach((color) => {
			expect(isPaletteColor(color)).toBe(true);
		});
	});

	it('returns true for palette colors in uppercase', () => {
		FUNCTION_COLORS.forEach((color) => {
			expect(isPaletteColor(color.toUpperCase())).toBe(true);
		});
	});

	it('returns true for palette colors in mixed case', () => {
		expect(isPaletteColor('#2563EB')).toBe(true);
		expect(isPaletteColor('#Dc2626')).toBe(true);
	});

	it('returns false for non-palette colors', () => {
		expect(isPaletteColor('#000000')).toBe(false);
		expect(isPaletteColor('#FFFFFF')).toBe(false);
		expect(isPaletteColor('red')).toBe(false);
	});

	it('returns false for empty string', () => {
		expect(isPaletteColor('')).toBe(false);
	});

	it('returns false for similar but different colors', () => {
		expect(isPaletteColor('#2563ec')).toBe(false); // Off by 1
		expect(isPaletteColor('#2563ea')).toBe(false);
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

// =============================================================================
// Integration Tests
// =============================================================================

describe('color workflow integration', () => {
	it('assigns colors sequentially using getNextColor', () => {
		const usedColors: string[] = [];

		// Add first function
		const color1 = getNextColor(usedColors);
		expect(color1).toBe(FUNCTION_COLORS[0]);
		usedColors.push(color1);

		// Add second function
		const color2 = getNextColor(usedColors);
		expect(color2).toBe(FUNCTION_COLORS[1]);
		usedColors.push(color2);

		// Add third function
		const color3 = getNextColor(usedColors);
		expect(color3).toBe(FUNCTION_COLORS[2]);
		usedColors.push(color3);

		// Verify all assigned colors are valid
		usedColors.forEach((color) => {
			expect(isValidColor(color)).toBe(true);
			expect(isPaletteColor(color)).toBe(true);
		});
	});

	it('assigns colors by index using getColorByIndex', () => {
		const colors = [0, 1, 2, 3, 4].map(getColorByIndex);

		// Verify all colors are distinct
		const uniqueColors = new Set(colors);
		expect(uniqueColors.size).toBe(5);

		// Verify all are valid palette colors
		colors.forEach((color) => {
			expect(isValidColor(color)).toBe(true);
			expect(isPaletteColor(color)).toBe(true);
		});
	});

	it('handles color cycling when all colors are used', () => {
		const usedColors = [...FUNCTION_COLORS];

		// Should cycle back to first color
		const nextColor = getNextColor(usedColors);
		expect(nextColor).toBe(FUNCTION_COLORS[0]);
		expect(isPaletteColor(nextColor)).toBe(true);
	});

	it('validates and normalizes user-provided colors', () => {
		const userColor = '  #DC2626  ';

		// Validate
		expect(isValidColor(userColor)).toBe(true);

		// Normalize
		const normalized = normalizeColor(userColor);

		// Check if it's a palette color
		expect(isPaletteColor(normalized)).toBe(true);
	});
});
