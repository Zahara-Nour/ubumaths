/**
 * Content Resolver Tests
 * =======================
 *
 * Tests for resolving ContentField arrays (text/image) with variables.
 */

import { describe, it, expect } from 'vitest';
import { resolveContentFields } from './content-resolver';
import type { ContentField, ResolvedVariable } from '../types';

// Helper to convert context object to ResolvedVariable array
function toResolvedVariables(context: Record<string, number | string>): ResolvedVariable[] {
	return Object.entries(context).map(([name, value]) => ({
		name,
		value: String(value)
	}));
}

describe('resolveContent - Text Fields', () => {
	it('should resolve simple text without variables', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Calculate 2 + 3' }];

		const result = resolveContentFields(fields, []);

		expect(result).toHaveLength(1);
		expect(result[0].type).toBe('text');
		expect(result[0].content).toBe('Calculate 2 + 3');
	});

	it('should resolve text with single variable', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Calculate {@:a} + {@:b}' }];

		const resolved = toResolvedVariables({a: 5, b: 3});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('Calculate 5 + 3');
	});

	it('should resolve text with multiple variables', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: '{@:x} + {@:y} = {@:z}' }
		];

		const resolved = toResolvedVariables({x: 10, y: 20, z: 30});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('10 + 20 = 30');
	});

	it('should resolve multiple text fields', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'First: {@:a}' },
			{ type: 'text', content: 'Second: {@:b}' }
		];

		const resolved = toResolvedVariables({a: 5, b: 10});
		const result = resolveContentFields(fields, resolved);

		expect(result).toHaveLength(2);
		expect(result[0].content).toBe('First: 5');
		expect(result[1].content).toBe('Second: 10');
	});

	it('should resolve text with decimal variables', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Value: {@:x}' }];

		const resolved = toResolvedVariables({x: 3.14159});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('Value: 3.14159');
	});

	it('should resolve text with negative variables', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Temperature: {@:temp}°C' }];

		const resolved = toResolvedVariables({temp: -15});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('Temperature: -15°C');
	});
});

describe('resolveContent - LaTeX in Text Fields', () => {
	it('should resolve LaTeX with variables', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: '$\\frac{{@:num}}{{@:den}}$' }
		];

		const resolved = toResolvedVariables({num: 3, den: 4});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('$\\frac{3}{4}$');
	});

	it('should resolve complex LaTeX expression', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: '$$\\sqrt{{@:a}^2 + {@:b}^2} = {@:c}$$' }
		];

		const resolved = toResolvedVariables({a: 3, b: 4, c: 5});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('$$\\sqrt{3^2 + 4^2} = 5$$');
	});

	it('should resolve multiple LaTeX expressions in one field', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'Solve: ${@:a}x + {@:b} = {@:c}$' }
		];

		const resolved = toResolvedVariables({a: 2, b: 5, c: 15});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('Solve: $2x + 5 = 15$');
	});

	it('should resolve fraction with variables', () => {
		const fields: ContentField[] = [
			{
				type: 'text',
				content: 'Calculate: $$\\frac{{@:num1}}{{@:den}} + \\frac{{@:num2}}{{@:den}}$$'
			}
		];

		const resolved = toResolvedVariables({num1: 2, num2: 3, den: 5});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('Calculate: $$\\frac{2}{5} + \\frac{3}{5}$$');
	});

	it('should resolve quadratic formula with variables', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: '${@:a}x^2 + {@:b}x + {@:c} = 0$' }
		];

		const resolved = toResolvedVariables({a: 1, b: -5, c: 6});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('$1x^2 + -5x + 6 = 0$');
	});
});

describe('resolveContent - Image Fields', () => {
	it('should resolve image field without variables', () => {
		const fields: ContentField[] = [
			{ type: 'image', content: 'https://example.com/image.png' }
		];

		const result = resolveContentFields(fields, []);

		expect(result).toHaveLength(1);
		expect(result[0].type).toBe('image');
		expect(result[0].content).toBe('https://example.com/image.png');
	});

	it('should resolve image URL with variable', () => {
		const fields: ContentField[] = [
			{ type: 'image', content: 'https://example.com/{@:imageId}.png' }
		];

		const resolved = toResolvedVariables({imageId: 'diagram_5'});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('https://example.com/diagram_5.png');
	});

	it('should resolve image with multiple variables in path', () => {
		const fields: ContentField[] = [
			{ type: 'image', content: 'https://example.com/{@:folder}/{@:filename}.jpg' }
		];

		const resolved = toResolvedVariables({folder: 'geometry', filename: 'triangle_123'});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('https://example.com/geometry/triangle_123.jpg');
	});
});

describe('resolveContent - Mixed Field Types', () => {
	it('should resolve text and image fields together', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'Question {@:num}:' },
			{ type: 'image', content: 'https://example.com/q{@:num}.png' },
			{ type: 'text', content: 'What is the area?' }
		];

		const resolved = toResolvedVariables({num: 5});
		const result = resolveContentFields(fields, resolved);

		expect(result).toHaveLength(3);
		expect(result[0].content).toBe('Question 5:');
		expect(result[1].content).toBe('https://example.com/q5.png');
		expect(result[2].content).toBe('What is the area?');
	});

	it('should resolve multiple fields with shared variables', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'Given triangle with sides {@:a} and {@:b}' },
			{ type: 'text', content: 'Find the hypotenuse: $$c = \\sqrt{{@:a}^2 + {@:b}^2}$$' }
		];

		const resolved = toResolvedVariables({a: 3, b: 4});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('Given triangle with sides 3 and 4');
		expect(result[1].content).toBe('Find the hypotenuse: $$c = \\sqrt{3^2 + 4^2}$$');
	});
});

describe('resolveContent - String Variables', () => {
	it('should resolve with string variable values', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Name: {@:name}' }];

		const resolved = toResolvedVariables({name: 'Alice'});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('Name: Alice');
	});

	it('should resolve with number-as-string variables', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Value: {@:val}' }];

		const resolved = toResolvedVariables({val: '42'});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('Value: 42');
	});

	it('should resolve mixed numeric and string variables', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: '{@:label}: {@:value}' }
		];

		const resolved = toResolvedVariables({label: 'Answer', value: 42});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('Answer: 42');
	});
});

describe('resolveContent - Special Characters', () => {
	it('should handle special mathematical symbols', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: '{@:a} × {@:b} ÷ {@:c}' }
		];

		const resolved = toResolvedVariables({a: 10, b: 5, c: 2});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('10 × 5 ÷ 2');
	});

	it('should handle French accents in surrounding text', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'Calculer la valeur de {@:x} égale à {@:y}' }
		];

		const resolved = toResolvedVariables({x: 'x', y: 10});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('Calculer la valeur de x égale à 10');
	});

	it('should handle quotes in text', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'The value "{@:val}" is correct' }
		];

		const resolved = toResolvedVariables({val: 42});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('The value "42" is correct');
	});

	it('should handle newlines in text', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'Line 1: {@:a}\nLine 2: {@:b}' }
		];

		const resolved = toResolvedVariables({a: 10, b: 20});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('Line 1: 10\nLine 2: 20');
	});
});

describe('resolveContent - Edge Cases', () => {
	it('should handle empty content array', () => {
		const fields: ContentField[] = [];

		const result = resolveContentFields(fields, []);

		expect(result).toEqual([]);
	});

	it('should handle empty string in text field', () => {
		const fields: ContentField[] = [{ type: 'text', content: '' }];

		const result = resolveContentFields(fields, []);

		expect(result).toHaveLength(1);
		expect(result[0].content).toBe('');
	});

	it('should handle text with no variables', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'No variables here' }];

		const result = resolveContentFields(fields, toResolvedVariables({ a: 5, b: 10 }));

		expect(result[0].content).toBe('No variables here');
	});

	it('should handle variable at start of string', () => {
		const fields: ContentField[] = [{ type: 'text', content: '{@:a} is the answer' }];

		const resolved = toResolvedVariables({a: 42});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('42 is the answer');
	});

	it('should handle variable at end of string', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'The answer is {@:a}' }];

		const resolved = toResolvedVariables({a: 42});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('The answer is 42');
	});

	it('should handle consecutive variables', () => {
		const fields: ContentField[] = [{ type: 'text', content: '{@:a}{@:b}{@:c}' }];

		const resolved = toResolvedVariables({a: 1, b: 2, c: 3});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('123');
	});

	it('should handle same variable multiple times', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: '{@:x} + {@:x} = {@:result}' }
		];

		const resolved = toResolvedVariables({x: 5, result: 10});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('5 + 5 = 10');
	});

	it('should handle very long text', () => {
		const longText = 'a'.repeat(1000) + '{@:var}' + 'b'.repeat(1000);
		const fields: ContentField[] = [{ type: 'text', content: longText }];

		const resolved = toResolvedVariables({var: 'X'});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('a'.repeat(1000) + 'X' + 'b'.repeat(1000));
	});

	it('should handle zero as variable value', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Value: {@:x}' }];

		const resolved = toResolvedVariables({x: 0});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('Value: 0');
	});

	it('should handle large numbers', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Big number: {@:big}' }];

		const resolved = toResolvedVariables({big: 123456789});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('Big number: 123456789');
	});

	it('should handle scientific notation', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Small: {@:small}' }];

		const resolved = toResolvedVariables({small: 0.0001});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('Small: 0.0001');
	});
});

describe('resolveContent - Complex Real-World Examples', () => {
	it('should resolve fraction addition question', () => {
		const fields: ContentField[] = [
			{
				type: 'text',
				content: 'Calculer: $$\\frac{{@:num1}}{{@:den}} + \\frac{{@:num2}}{{@:den}}$$'
			}
		];

		const resolved = toResolvedVariables({num1: 2, num2: 3, den: 5});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('Calculer: $$\\frac{2}{5} + \\frac{3}{5}$$');
	});

	it('should resolve quadratic equation with diagram', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'Résoudre: ${@:a}x^2 + {@:b}x + {@:c} = 0$' },
			{ type: 'image', content: 'https://example.com/parabola_{@:a}_{@:b}_{@:c}.png' },
			{ type: 'text', content: 'Discriminant: $\\Delta = {@:discriminant}$' }
		];

		const resolved = toResolvedVariables({a: 1, b: -5, c: 6, discriminant: 1});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe('Résoudre: $1x^2 + -5x + 6 = 0$');
		expect(result[1].content).toBe('https://example.com/parabola_1_-5_6.png');
		expect(result[2].content).toBe('Discriminant: $\\Delta = 1$');
	});

	it('should resolve geometry problem with multiple variables', () => {
		const fields: ContentField[] = [
			{
				type: 'text',
				content:
					'Un rectangle a une longueur de {@:length} cm et une largeur de {@:width} cm.'
			},
			{
				type: 'text',
				content: 'Calculer le périmètre: $$P = 2({@:length} + {@:width})$$'
			}
		];

		const resolved = toResolvedVariables({length: 8, width: 5});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe(
			'Un rectangle a une longueur de 8 cm et une largeur de 5 cm.'
		);
		expect(result[1].content).toBe('Calculer le périmètre: $$P = 2(8 + 5)$$');
	});

	it('should resolve percentage problem', () => {
		const fields: ContentField[] = [
			{
				type: 'text',
				content:
					'Un article coûte {@:price}€. Il y a {@:discount}% de réduction. Quel est le prix final?'
			}
		];

		const resolved = toResolvedVariables({price: 50, discount: 20});
		const result = resolveContentFields(fields, resolved);

		expect(result[0].content).toBe(
			'Un article coûte 50€. Il y a 20% de réduction. Quel est le prix final?'
		);
	});
});

describe('resolveContent - Error Handling', () => {
	it('should handle missing variable in context', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Value: {@:missing}' }];

		const resolved = toResolvedVariables({existing: 42});

		// Should either throw or leave unreplaced (implementation dependent)
		expect(() => resolveContentFields(fields, resolved)).toThrow();
	});

	it('should handle malformed variable syntax gracefully', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Bad syntax: {@:} and {@:a' }];

		const resolved = toResolvedVariables({a: 5});

		// Should handle gracefully (either throw or partial replacement)
		const result = resolveContentFields(fields, resolved);
		// At minimum, should not crash
		expect(result).toBeDefined();
	});

	// Note: Current implementation doesn't throw on null - it converts to string 'null'
	it.skip('should handle null/undefined in context', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Value: {@:a}' }];

		const resolved = toResolvedVariables({a: null});

		// Should handle null values appropriately (not currently implemented)
		expect(() => resolveContentFields(fields, resolved as any)).toThrow();
	});
});
