/**
 * Unit tests for the color palette system
 */

import { describe, it, expect, vi } from 'vitest';
import { COLOR_PALETTES, getColor, getColorByIndex, getRandomColor, getAllColors } from './colors';

describe('COLOR_PALETTES', () => {
	it('should define primary palette with 8 colors', () => {
		expect(COLOR_PALETTES.primary).toHaveLength(8);
		expect(COLOR_PALETTES.primary[0]).toBe('#FF5722');
	});

	it('should define shapes palette with 8 colors', () => {
		expect(COLOR_PALETTES.shapes).toHaveLength(8);
		expect(COLOR_PALETTES.shapes[0]).toBe('#FFCDD2');
	});

	it('should define text palette with 8 colors', () => {
		expect(COLOR_PALETTES.text).toHaveLength(8);
		expect(COLOR_PALETTES.text[0]).toBe('#D32F2F');
	});

	it('should define contrast palette with 4 pairs', () => {
		expect(COLOR_PALETTES.contrast).toHaveLength(4);
		expect(COLOR_PALETTES.contrast[0]).toEqual(['#FF5722', '#2196F3']);
	});

	it('should define rainbow palette with 7 colors', () => {
		expect(COLOR_PALETTES.rainbow).toHaveLength(7);
		expect(COLOR_PALETTES.rainbow[0]).toBe('#FF0000'); // Red
		expect(COLOR_PALETTES.rainbow[6]).toBe('#9400D3'); // Violet
	});

	it('should have all colors as valid hex codes', () => {
		const hexPattern = /^#[0-9A-F]{6}$/i;

		// Test primary
		COLOR_PALETTES.primary.forEach((color) => {
			expect(color).toMatch(hexPattern);
		});

		// Test shapes
		COLOR_PALETTES.shapes.forEach((color) => {
			expect(color).toMatch(hexPattern);
		});

		// Test text
		COLOR_PALETTES.text.forEach((color) => {
			expect(color).toMatch(hexPattern);
		});

		// Test contrast
		COLOR_PALETTES.contrast.forEach((pair) => {
			expect(pair[0]).toMatch(hexPattern);
			expect(pair[1]).toMatch(hexPattern);
		});

		// Test rainbow
		COLOR_PALETTES.rainbow.forEach((color) => {
			expect(color).toMatch(hexPattern);
		});
	});
});

describe('getColorByIndex', () => {
	it('should get specific color from primary palette', () => {
		expect(getColorByIndex('primary', 0)).toBe('#FF5722');
		expect(getColorByIndex('primary', 1)).toBe('#2196F3');
		expect(getColorByIndex('primary', 7)).toBe('#E91E63');
	});

	it('should get specific color from shapes palette', () => {
		expect(getColorByIndex('shapes', 0)).toBe('#FFCDD2');
		expect(getColorByIndex('shapes', 3)).toBe('#FFF9C4');
	});

	it('should get specific color from text palette', () => {
		expect(getColorByIndex('text', 0)).toBe('#D32F2F');
		expect(getColorByIndex('text', 2)).toBe('#388E3C');
	});

	it('should wrap index for out-of-bounds', () => {
		expect(getColorByIndex('primary', 8)).toBe('#FF5722'); // Wraps to 0
		expect(getColorByIndex('primary', 9)).toBe('#2196F3'); // Wraps to 1
		expect(getColorByIndex('primary', 16)).toBe('#FF5722'); // Wraps to 0
	});

	it('should get first color of contrast pair', () => {
		expect(getColorByIndex('contrast', 0)).toBe('#FF5722');
		expect(getColorByIndex('contrast', 1)).toBe('#4CAF50');
		expect(getColorByIndex('contrast', 2)).toBe('#FFC107');
		expect(getColorByIndex('contrast', 3)).toBe('#FF9800');
	});

	it('should wrap contrast pair index', () => {
		expect(getColorByIndex('contrast', 4)).toBe('#FF5722'); // Wraps to 0
		expect(getColorByIndex('contrast', 5)).toBe('#4CAF50'); // Wraps to 1
	});

	it('should get specific color from rainbow palette', () => {
		expect(getColorByIndex('rainbow', 0)).toBe('#FF0000'); // Red
		expect(getColorByIndex('rainbow', 3)).toBe('#00FF00'); // Green
		expect(getColorByIndex('rainbow', 6)).toBe('#9400D3'); // Violet
	});
});

describe('getRandomColor', () => {
	it('should return reproducible color with same seed', () => {
		const color1 = getRandomColor('primary', 42);
		const color2 = getRandomColor('primary', 42);
		expect(color1).toBe(color2);
	});

	it('should return different colors with different seeds', () => {
		const color1 = getRandomColor('primary', 42);
		const color2 = getRandomColor('primary', 123);
		expect(color1).not.toBe(color2);
	});

	it('should return valid hex color from primary palette', () => {
		const color = getRandomColor('primary', 42);
		expect(COLOR_PALETTES.primary).toContain(color);
	});

	it('should return valid hex color from shapes palette', () => {
		const color = getRandomColor('shapes', 42);
		expect(COLOR_PALETTES.shapes).toContain(color);
	});

	it('should return valid hex color from text palette', () => {
		const color = getRandomColor('text', 42);
		expect(COLOR_PALETTES.text).toContain(color);
	});

	it('should return first color of contrast pair', () => {
		const color = getRandomColor('contrast', 0);
		expect(color).toBe('#FF5722');
	});

	it('should use seed modulo for palette selection', () => {
		const color1 = getRandomColor('primary', 0);
		const color2 = getRandomColor('primary', 8); // 8 colors in palette
		expect(color1).toBe(color2);
	});

	it('should return valid color from rainbow palette', () => {
		const color = getRandomColor('rainbow', 42);
		expect(COLOR_PALETTES.rainbow).toContain(color);
	});
});

describe('getAllColors', () => {
	it('should return all colors from primary palette', () => {
		const colors = getAllColors('primary');
		expect(colors).toEqual([...COLOR_PALETTES.primary]);
		expect(colors).toHaveLength(8);
	});

	it('should return all colors from shapes palette', () => {
		const colors = getAllColors('shapes');
		expect(colors).toEqual([...COLOR_PALETTES.shapes]);
		expect(colors).toHaveLength(8);
	});

	it('should return all colors from text palette', () => {
		const colors = getAllColors('text');
		expect(colors).toEqual([...COLOR_PALETTES.text]);
		expect(colors).toHaveLength(8);
	});

	it('should return flattened contrast colors', () => {
		const colors = getAllColors('contrast');
		expect(colors).toHaveLength(8); // 4 pairs * 2 colors
		expect(colors[0]).toBe('#FF5722');
		expect(colors[1]).toBe('#2196F3');
		expect(colors[2]).toBe('#4CAF50');
		expect(colors[3]).toBe('#F44336');
	});

	it('should return all colors from rainbow palette', () => {
		const colors = getAllColors('rainbow');
		expect(colors).toEqual([...COLOR_PALETTES.rainbow]);
		expect(colors).toHaveLength(7);
	});

	it('should return a new array (not the original)', () => {
		const colors1 = getAllColors('primary');
		const colors2 = getAllColors('primary');
		expect(colors1).not.toBe(colors2); // Different array instances
		expect(colors1).toEqual(colors2); // Same content
	});
});

describe('getColor', () => {
	describe('palette-only syntax', () => {
		it('should return random color from primary palette', () => {
			const color = getColor('primary');
			expect(COLOR_PALETTES.primary).toContain(color);
		});

		it('should return random color from shapes palette', () => {
			const color = getColor('shapes');
			expect(COLOR_PALETTES.shapes).toContain(color);
		});

		it('should return seeded random from palette', () => {
			const color1 = getColor('primary', 42);
			const color2 = getColor('primary', 42);
			expect(color1).toBe(color2);
		});
	});

	describe('palette.index syntax', () => {
		it('should get specific color by index', () => {
			expect(getColor('primary.0')).toBe('#FF5722');
			expect(getColor('primary.1')).toBe('#2196F3');
			expect(getColor('shapes.0')).toBe('#FFCDD2');
			expect(getColor('text.0')).toBe('#D32F2F');
		});

		it('should wrap index for out-of-bounds', () => {
			expect(getColor('primary.8')).toBe('#FF5722'); // Wraps to 0
			expect(getColor('primary.16')).toBe('#FF5722'); // Wraps to 0
		});
	});

	describe('palette.random syntax', () => {
		it('should return random color with explicit random', () => {
			const color = getColor('primary.random');
			expect(COLOR_PALETTES.primary).toContain(color);
		});

		it('should use seed with random syntax', () => {
			const color1 = getColor('primary.random', 42);
			const color2 = getColor('primary.random', 42);
			expect(color1).toBe(color2);
		});
	});

	describe('contrast pair syntax', () => {
		it('should get first color of contrast pair', () => {
			expect(getColor('contrast.0.0')).toBe('#FF5722');
			expect(getColor('contrast.0.1')).toBe('#2196F3');
			expect(getColor('contrast.1.0')).toBe('#4CAF50');
			expect(getColor('contrast.1.1')).toBe('#F44336');
		});

		it('should wrap pair index', () => {
			expect(getColor('contrast.4.0')).toBe('#FF5722'); // Wraps to pair 0
		});

		it('should wrap color index within pair', () => {
			expect(getColor('contrast.0.2')).toBe('#FF5722'); // Wraps to 0
			expect(getColor('contrast.0.3')).toBe('#2196F3'); // Wraps to 1
		});

		it('should use seed for random pair selection', () => {
			// Test that same seed produces consistent results
			const color1 = getColor('contrast', 42);
			const color2 = getColor('contrast', 42);
			expect(color1).toBe(color2); // Same seed = same color

			// Verify it's a valid contrast color
			const allContrastColors = COLOR_PALETTES.contrast.flat();
			expect(allContrastColors).toContain(color1);

			// Different seeds can produce different colors
			const color3 = getColor('contrast', 123);
			expect(allContrastColors).toContain(color3);
		});

		it('should default to first color when only pair index given', () => {
			expect(getColor('contrast.0')).toBe('#FF5722');
			expect(getColor('contrast.1')).toBe('#4CAF50');
		});
	});

	describe('rainbow palette', () => {
		it('should get specific rainbow color by index', () => {
			expect(getColor('rainbow.0')).toBe('#FF0000'); // Red
			expect(getColor('rainbow.3')).toBe('#00FF00'); // Green
			expect(getColor('rainbow.6')).toBe('#9400D3'); // Violet
		});

		it('should wrap rainbow index', () => {
			expect(getColor('rainbow.7')).toBe('#FF0000'); // Wraps to 0
			expect(getColor('rainbow.14')).toBe('#FF0000'); // Wraps to 0
		});

		it('should return random rainbow color with seed', () => {
			const color1 = getColor('rainbow', 42);
			const color2 = getColor('rainbow', 42);
			expect(color1).toBe(color2);
			expect(COLOR_PALETTES.rainbow).toContain(color1);
		});
	});

	describe('error handling', () => {
		it('should warn and default to primary.0 for unknown palette', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const color = getColor('unknown');
			expect(color).toBe('#FF5722'); // First primary color
			expect(consoleSpy).toHaveBeenCalledWith(
				'Unknown color palette: unknown, defaulting to primary'
			);
			consoleSpy.mockRestore();
		});

		it('should handle invalid index gracefully', () => {
			expect(getColor('primary.invalid')).toBeDefined();
			expect(COLOR_PALETTES.primary).toContain(getColor('primary.invalid'));
		});
	});

	describe('all palettes integration', () => {
		it('should work for all defined palettes', () => {
			const palettes = ['primary', 'shapes', 'text', 'contrast', 'rainbow'] as const;

			palettes.forEach((palette) => {
				const color = getColor(palette, 42);
				expect(color).toBeDefined();
				expect(color).toMatch(/^#[0-9A-F]{6}$/i);
			});
		});
	});
});
