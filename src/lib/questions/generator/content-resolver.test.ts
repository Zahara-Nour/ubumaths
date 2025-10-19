/**
 * Content Resolver Tests
 * =======================
 *
 * Tests for resolving ContentField arrays (text/image) with variables.
 */

import { describe, it, expect } from 'vitest';
import { resolveContent } from './content-resolver';
import type { ContentField } from '../types';

describe('resolveContent - Text Fields', () => {
	it('should resolve simple text without variables', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Calculate 2 + 3' }];

		const result = resolveContent(fields, {});

		expect(result).toHaveLength(1);
		expect(result[0].type).toBe('text');
		expect(result[0].content).toBe('Calculate 2 + 3');
	});

	it('should resolve text with single variable', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Calculate {@:a} + {@:b}' }];

		const context = { a: 5, b: 3 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('Calculate 5 + 3');
	});

	it('should resolve text with multiple variables', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: '{@:x} + {@:y} = {@:z}' }
		];

		const context = { x: 10, y: 20, z: 30 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('10 + 20 = 30');
	});

	it('should resolve multiple text fields', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'First: {@:a}' },
			{ type: 'text', content: 'Second: {@:b}' }
		];

		const context = { a: 5, b: 10 };
		const result = resolveContent(fields, context);

		expect(result).toHaveLength(2);
		expect(result[0].content).toBe('First: 5');
		expect(result[1].content).toBe('Second: 10');
	});

	it('should resolve text with decimal variables', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Value: {@:x}' }];

		const context = { x: 3.14159 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('Value: 3.14159');
	});

	it('should resolve text with negative variables', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Temperature: {@:temp}°C' }];

		const context = { temp: -15 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('Temperature: -15°C');
	});
});

describe('resolveContent - LaTeX in Text Fields', () => {
	it('should resolve LaTeX with variables', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: '$\\frac{{@:num}}{{@:den}}$' }
		];

		const context = { num: 3, den: 4 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('$\\frac{3}{4}$');
	});

	it('should resolve complex LaTeX expression', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: '$$\\sqrt{{@:a}^2 + {@:b}^2} = {@:c}$$' }
		];

		const context = { a: 3, b: 4, c: 5 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('$$\\sqrt{3^2 + 4^2} = 5$$');
	});

	it('should resolve multiple LaTeX expressions in one field', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'Solve: ${@:a}x + {@:b} = {@:c}$' }
		];

		const context = { a: 2, b: 5, c: 15 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('Solve: $2x + 5 = 15$');
	});

	it('should resolve fraction with variables', () => {
		const fields: ContentField[] = [
			{
				type: 'text',
				content: 'Calculate: $$\\frac{{@:num1}}{{@:den}} + \\frac{{@:num2}}{{@:den}}$$'
			}
		];

		const context = { num1: 2, num2: 3, den: 5 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('Calculate: $$\\frac{2}{5} + \\frac{3}{5}$$');
	});

	it('should resolve quadratic formula with variables', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: '${@:a}x^2 + {@:b}x + {@:c} = 0$' }
		];

		const context = { a: 1, b: -5, c: 6 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('$1x^2 + -5x + 6 = 0$');
	});
});

describe('resolveContent - Image Fields', () => {
	it('should resolve image field without variables', () => {
		const fields: ContentField[] = [
			{ type: 'image', content: 'https://example.com/image.png' }
		];

		const result = resolveContent(fields, {});

		expect(result).toHaveLength(1);
		expect(result[0].type).toBe('image');
		expect(result[0].content).toBe('https://example.com/image.png');
	});

	it('should resolve image URL with variable', () => {
		const fields: ContentField[] = [
			{ type: 'image', content: 'https://example.com/{@:imageId}.png' }
		];

		const context = { imageId: 'diagram_5' };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('https://example.com/diagram_5.png');
	});

	it('should resolve image with multiple variables in path', () => {
		const fields: ContentField[] = [
			{ type: 'image', content: 'https://example.com/{@:folder}/{@:filename}.jpg' }
		];

		const context = { folder: 'geometry', filename: 'triangle_123' };
		const result = resolveContent(fields, context);

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

		const context = { num: 5 };
		const result = resolveContent(fields, context);

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

		const context = { a: 3, b: 4 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('Given triangle with sides 3 and 4');
		expect(result[1].content).toBe('Find the hypotenuse: $$c = \\sqrt{3^2 + 4^2}$$');
	});
});

describe('resolveContent - String Variables', () => {
	it('should resolve with string variable values', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Name: {@:name}' }];

		const context = { name: 'Alice' };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('Name: Alice');
	});

	it('should resolve with number-as-string variables', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Value: {@:val}' }];

		const context = { val: '42' };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('Value: 42');
	});

	it('should resolve mixed numeric and string variables', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: '{@:label}: {@:value}' }
		];

		const context = { label: 'Answer', value: 42 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('Answer: 42');
	});
});

describe('resolveContent - Special Characters', () => {
	it('should handle special mathematical symbols', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: '{@:a} × {@:b} ÷ {@:c}' }
		];

		const context = { a: 10, b: 5, c: 2 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('10 × 5 ÷ 2');
	});

	it('should handle French accents in surrounding text', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'Calculer la valeur de {@:x} égale à {@:y}' }
		];

		const context = { x: 'x', y: 10 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('Calculer la valeur de x égale à 10');
	});

	it('should handle quotes in text', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'The value "{@:val}" is correct' }
		];

		const context = { val: 42 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('The value "42" is correct');
	});

	it('should handle newlines in text', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'Line 1: {@:a}\nLine 2: {@:b}' }
		];

		const context = { a: 10, b: 20 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('Line 1: 10\nLine 2: 20');
	});
});

describe('resolveContent - Edge Cases', () => {
	it('should handle empty content array', () => {
		const fields: ContentField[] = [];

		const result = resolveContent(fields, {});

		expect(result).toEqual([]);
	});

	it('should handle empty string in text field', () => {
		const fields: ContentField[] = [{ type: 'text', content: '' }];

		const result = resolveContent(fields, {});

		expect(result).toHaveLength(1);
		expect(result[0].content).toBe('');
	});

	it('should handle text with no variables', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'No variables here' }];

		const result = resolveContent(fields, { a: 5, b: 10 });

		expect(result[0].content).toBe('No variables here');
	});

	it('should handle variable at start of string', () => {
		const fields: ContentField[] = [{ type: 'text', content: '{@:a} is the answer' }];

		const context = { a: 42 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('42 is the answer');
	});

	it('should handle variable at end of string', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'The answer is {@:a}' }];

		const context = { a: 42 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('The answer is 42');
	});

	it('should handle consecutive variables', () => {
		const fields: ContentField[] = [{ type: 'text', content: '{@:a}{@:b}{@:c}' }];

		const context = { a: 1, b: 2, c: 3 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('123');
	});

	it('should handle same variable multiple times', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: '{@:x} + {@:x} = {@:result}' }
		];

		const context = { x: 5, result: 10 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('5 + 5 = 10');
	});

	it('should handle very long text', () => {
		const longText = 'a'.repeat(1000) + '{@:var}' + 'b'.repeat(1000);
		const fields: ContentField[] = [{ type: 'text', content: longText }];

		const context = { var: 'X' };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('a'.repeat(1000) + 'X' + 'b'.repeat(1000));
	});

	it('should handle zero as variable value', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Value: {@:x}' }];

		const context = { x: 0 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('Value: 0');
	});

	it('should handle large numbers', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Big number: {@:big}' }];

		const context = { big: 123456789 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('Big number: 123456789');
	});

	it('should handle scientific notation', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Small: {@:small}' }];

		const context = { small: 0.0001 };
		const result = resolveContent(fields, context);

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

		const context = { num1: 2, num2: 3, den: 5 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe('Calculer: $$\\frac{2}{5} + \\frac{3}{5}$$');
	});

	it('should resolve quadratic equation with diagram', () => {
		const fields: ContentField[] = [
			{ type: 'text', content: 'Résoudre: ${@:a}x^2 + {@:b}x + {@:c} = 0$' },
			{ type: 'image', content: 'https://example.com/parabola_{@:a}_{@:b}_{@:c}.png' },
			{ type: 'text', content: 'Discriminant: $\\Delta = {@:discriminant}$' }
		];

		const context = { a: 1, b: -5, c: 6, discriminant: 1 };
		const result = resolveContent(fields, context);

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

		const context = { length: 8, width: 5 };
		const result = resolveContent(fields, context);

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

		const context = { price: 50, discount: 20 };
		const result = resolveContent(fields, context);

		expect(result[0].content).toBe(
			'Un article coûte 50€. Il y a 20% de réduction. Quel est le prix final?'
		);
	});
});

describe('resolveContent - Error Handling', () => {
	it('should handle missing variable in context', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Value: {@:missing}' }];

		const context = { existing: 42 };

		// Should either throw or leave unreplaced (implementation dependent)
		expect(() => resolveContent(fields, context)).toThrow();
	});

	it('should handle malformed variable syntax gracefully', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Bad syntax: {@:} and {@:a' }];

		const context = { a: 5 };

		// Should handle gracefully (either throw or partial replacement)
		const result = resolveContent(fields, context);
		// At minimum, should not crash
		expect(result).toBeDefined();
	});

	it('should handle null/undefined in context', () => {
		const fields: ContentField[] = [{ type: 'text', content: 'Value: {@:a}' }];

		const context = { a: null };

		// Should handle null values appropriately
		expect(() => resolveContent(fields, context as any)).toThrow();
	});
});
