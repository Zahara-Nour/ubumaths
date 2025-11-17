import { describe, it, expect } from 'vitest';
import { parseColorExpression, resolveColorReferences } from './color-parser';
import { COLOR_PALETTES } from '../colors';

describe('parseColorExpression', () => {
	it('should parse palette name only (random selection)', () => {
		const result = parseColorExpression('primary');
		expect(result.success).toBe(true);
		expect(result.color).toBeDefined();
		expect(COLOR_PALETTES.primary).toContain(result.color);
	});

	it('should parse palette with specific index', () => {
		const result = parseColorExpression('primary.0');
		expect(result.success).toBe(true);
		expect(result.color).toBe(COLOR_PALETTES.primary[0]);
	});

	it('should parse palette with index 2', () => {
		const result = parseColorExpression('shapes.2');
		expect(result.success).toBe(true);
		expect(result.color).toBe(COLOR_PALETTES.shapes[2]);
	});

	it('should handle out-of-bounds index with modulo', () => {
		const result = parseColorExpression('primary.100');
		expect(result.success).toBe(true);
		const expectedIndex = 100 % COLOR_PALETTES.primary.length;
		expect(result.color).toBe(COLOR_PALETTES.primary[expectedIndex]);
	});

	it('should parse contrast pairs', () => {
		const result = parseColorExpression('contrast.0.0');
		expect(result.success).toBe(true);
		expect(result.color).toBe(COLOR_PALETTES.contrast[0][0]);
	});

	it('should parse second color of contrast pair', () => {
		const result = parseColorExpression('contrast.0.1');
		expect(result.success).toBe(true);
		expect(result.color).toBe(COLOR_PALETTES.contrast[0][1]);
	});

	it('should handle explicit random keyword', () => {
		const result = parseColorExpression('primary.random');
		expect(result.success).toBe(true);
		expect(COLOR_PALETTES.primary).toContain(result.color);
	});

	it('should use seed for reproducible colors', () => {
		const result1 = parseColorExpression('primary', 42);
		const result2 = parseColorExpression('primary', 42);
		expect(result1.color).toBe(result2.color);

		const result3 = parseColorExpression('primary', 43);
		// Different seed might produce different color (not guaranteed but likely)
		expect(result3.success).toBe(true);
	});

	it('should handle empty expression', () => {
		const result = parseColorExpression('');
		expect(result.success).toBe(false);
		expect(result.error).toContain('Empty color expression');
	});

	it('should handle unknown palette', () => {
		const result = parseColorExpression('nonexistent');
		expect(result.success).toBe(false);
		expect(result.error).toContain('Unknown color palette');
	});

	it('should handle all predefined palettes', () => {
		const palettes = ['primary', 'shapes', 'text', 'contrast', 'rainbow'];
		for (const palette of palettes) {
			const result = parseColorExpression(palette);
			expect(result.success).toBe(true);
			expect(result.color).toBeDefined();
		}
	});
});

describe('resolveColorReferences', () => {
	it('should resolve single color reference', () => {
		const text = 'The color is {#color:primary.0}';
		const result = resolveColorReferences(text);
		expect(result).toBe(`The color is ${COLOR_PALETTES.primary[0]}`);
	});

	it('should resolve multiple color references', () => {
		const text = 'Color 1: {#color:primary.0}, Color 2: {#color:shapes.1}';
		const result = resolveColorReferences(text);
		expect(result).toBe(
			`Color 1: ${COLOR_PALETTES.primary[0]}, Color 2: ${COLOR_PALETTES.shapes[1]}`
		);
	});

	it('should handle text with no color references', () => {
		const text = 'This text has no colors';
		const result = resolveColorReferences(text);
		expect(result).toBe(text);
	});

	it('should preserve invalid color references', () => {
		const text = 'Valid: {#color:primary.0}, Invalid: {#color:invalid}';
		const result = resolveColorReferences(text);
		expect(result).toContain(COLOR_PALETTES.primary[0]);
		expect(result).toContain('{#color:invalid}'); // Invalid reference preserved
	});

	it('should use seed for reproducible colors', () => {
		const text = 'Color: {#color:primary}';
		const result1 = resolveColorReferences(text, 42);
		const result2 = resolveColorReferences(text, 42);
		expect(result1).toBe(result2);
	});

	it('should vary colors when multiple random colors are requested', () => {
		const text = 'Color 1: {#color:primary}, Color 2: {#color:primary}';
		const result = resolveColorReferences(text, 42);

		// Extract the colors from result
		const colorMatches = result.match(/#[A-F0-9]{6}/gi);
		expect(colorMatches).toHaveLength(2);

		// With seed, each occurrence gets a different effective seed
		// so colors might be different (though not guaranteed)
		// At least verify both are valid colors from the palette
		if (colorMatches) {
			expect(COLOR_PALETTES.primary).toContain(colorMatches[0]);
			expect(COLOR_PALETTES.primary).toContain(colorMatches[1]);
		}
	});

	it('should handle contrast pairs in text', () => {
		const text = 'Compare {#color:contrast.0.0} with {#color:contrast.0.1}';
		const result = resolveColorReferences(text);
		expect(result).toBe(
			`Compare ${COLOR_PALETTES.contrast[0][0]} with ${COLOR_PALETTES.contrast[0][1]}`
		);
	});

	it('should handle all palette types', () => {
		const text =
			'{#color:primary.0} {#color:shapes.0} {#color:text.0} {#color:contrast.0.0} {#color:rainbow.0}';
		const result = resolveColorReferences(text);
		expect(result).toBe(
			`${COLOR_PALETTES.primary[0]} ${COLOR_PALETTES.shapes[0]} ${COLOR_PALETTES.text[0]} ${COLOR_PALETTES.contrast[0][0]} ${COLOR_PALETTES.rainbow[0]}`
		);
	});
});
