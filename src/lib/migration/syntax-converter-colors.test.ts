import { describe, it, expect } from 'vitest';
import { convertTinyCASToNew } from './syntax-converter';

describe('TinyCAS Color Conversion', () => {
	it('should convert ${get(color1)} to {{color:primary.0}}', () => {
		const input = 'The color is ${get(color1)}';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe('The color is {{color:primary.0}}');
		expect(result.stats?.colorReferences).toBe(1);
	});

	it('should convert multiple color references', () => {
		const input = 'Color 1: ${get(color1)}, Color 2: ${get(color2)}';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe('Color 1: {{color:primary.0}}, Color 2: {{color:primary.1}}');
		expect(result.stats?.colorReferences).toBe(2);
	});

	it('should convert color without number to primary palette', () => {
		const input = 'The color is ${get(color)}';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe('The color is {{color:primary}}');
		expect(result.stats?.colorReferences).toBe(1);
	});

	it('should handle French color names', () => {
		const input = 'La couleur est ${get(couleur1)}';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe('La couleur est {{color:primary.0}}');
		expect(result.stats?.colorReferences).toBe(1);
	});

	it('should handle abbreviated color names', () => {
		const input = '${get(col3)}';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe('{{color:primary.2}}');
		expect(result.stats?.colorReferences).toBe(1);
	});

	it('should warn about non-color store references', () => {
		const input = 'Value: ${get(someOtherVar)}';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe('Value: ${get(someOtherVar)}'); // Left unchanged
		expect(result.warnings).toContain(
			'Store reference ${get(someOtherVar)} detected - may need manual review'
		);
		expect(result.stats?.colorReferences).toBe(0);
	});

	it('should convert colors before evaluations to avoid conflicts', () => {
		const input = '${get(color1)} and [_&a+5_]';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe('{{color:primary.0}} and {{eval:a+5}}');
		expect(result.stats?.colorReferences).toBe(1);
		expect(result.stats?.evaluations).toBe(1);
	});

	it('should handle mixed conversions', () => {
		const input = 'Color: ${get(color1)}, Random: $e[1;10], Var: &x';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe('Color: {{color:primary.0}}, Random: {{1..10}}, Var: {{x}}');
		expect(result.stats?.colorReferences).toBe(1);
		expect(result.stats?.randomIntegers).toBe(1);
		expect(result.stats?.variableRefs).toBe(1);
		expect(result.stats?.total).toBe(3);
	});

	it('should handle color10 and higher indices correctly', () => {
		const input = '${get(color10)} ${get(color25)}';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe('{{color:primary.9}} {{color:primary.24}}');
		expect(result.stats?.colorReferences).toBe(2);
	});

	it('should not convert variables that contain "color" in the middle', () => {
		const input = '${get(backgroundColor)}';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe('${get(backgroundColor)}'); // Left unchanged
		expect(result.warnings?.length).toBeGreaterThan(0);
		expect(result.stats?.colorReferences).toBe(0);
	});
});
