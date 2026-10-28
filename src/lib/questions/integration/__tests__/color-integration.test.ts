import { describe, it, expect } from 'vitest';
import { resolveExpression } from '../../generator/content-resolver';
import { COLOR_PALETTES } from '../../colors';
import { createRandomSource } from '$lib/utils/random';

describe('Color Template System - End to End', () => {
	it('should resolve color references to actual colors', () => {
		const template = 'Draw a {{color:primary.0}} circle and a {{color:primary.1}} square';
		const resolved = resolveExpression(template, [], createRandomSource(42));

		// Should contain actual hex colors
		expect(resolved).toMatch(/#[A-F0-9]{6}/i);
		expect(resolved).toContain(COLOR_PALETTES.primary[0]);
		expect(resolved).toContain(COLOR_PALETTES.primary[1]);
	});

	it('should support all color palettes in the workflow', () => {
		// Template with different palette references
		const template = `
			Primary: {#color:primary.0}
			Shape: {#color:shapes.2}
			Text: {#color:text.1}
			Contrast A: {#color:contrast.0.0}
			Contrast B: {#color:contrast.0.1}
			Rainbow: {#color:rainbow.3}
		`;

		// Resolve during instance generation
		const resolved = resolveExpression(template, [], createRandomSource(42));

		// Verify each color is resolved
		expect(resolved).toContain(COLOR_PALETTES.primary[0]);
		expect(resolved).toContain(COLOR_PALETTES.shapes[2]);
		expect(resolved).toContain(COLOR_PALETTES.text[1]);
		expect(resolved).toContain(COLOR_PALETTES.contrast[0][0]);
		expect(resolved).toContain(COLOR_PALETTES.contrast[0][1]);
		expect(resolved).toContain(COLOR_PALETTES.rainbow[3]);
	});

	it('should handle random color selection with seed', () => {
		const template = 'Random color: {#color:primary}';

		// Same seed should produce same color
		const resolved1 = resolveExpression(template, [], createRandomSource(42));
		const resolved2 = resolveExpression(template, [], createRandomSource(42));
		expect(resolved1).toBe(resolved2);

		// Different seed should (likely) produce different color
		const resolved3 = resolveExpression(template, [], createRandomSource(123));
		// Both should be valid colors from the palette
		expect(resolved1).toMatch(/#[A-F0-9]{6}/i);
		expect(resolved3).toMatch(/#[A-F0-9]{6}/i);
	});

	it('should integrate with variables and evaluations', () => {
		const template = 'Color {{color:primary.0}}, value {{a}}, result {{eval:a+5}}';
		const resolvedVariables = [{ name: 'a', value: '7' }];
		const resolved = resolveExpression(template, resolvedVariables, createRandomSource(42));

		// Should contain the resolved color
		expect(resolved).toContain(COLOR_PALETTES.primary[0]);
		// Variable should be resolved
		expect(resolved).toContain('7');
		// Eval expression should be resolved
		expect(resolved).toContain('12'); // 7 + 5 = 12
	});

	it('should create varied colors for shapes and diagrams', () => {
		// Template for geometry question
		const template = `
			Draw a {#color:shapes.0} triangle,
			a {#color:shapes.1} circle,
			and a {#color:shapes.2} rectangle
		`;

		const resolved = resolveExpression(template, [], createRandomSource(42));

		// Should use pastel colors from shapes palette
		expect(resolved).toContain(COLOR_PALETTES.shapes[0]);
		expect(resolved).toContain(COLOR_PALETTES.shapes[1]);
		expect(resolved).toContain(COLOR_PALETTES.shapes[2]);

		// Verify they are different colors
		const colors = resolved.match(/#[A-F0-9]{6}/gi);
		expect(colors).toHaveLength(3);
		expect(new Set(colors).size).toBe(3); // All different
	});

	it('should provide high contrast pairs for comparisons', () => {
		const template = `
			Compare the {#color:contrast.0.0} group
			with the {#color:contrast.0.1} group
		`;

		const resolved = resolveExpression(template, [], createRandomSource(42));

		// Should use contrasting colors
		const [color1, color2] = COLOR_PALETTES.contrast[0];
		expect(resolved).toContain(color1);
		expect(resolved).toContain(color2);

		// Verify they are different
		expect(color1).not.toBe(color2);
	});
});
