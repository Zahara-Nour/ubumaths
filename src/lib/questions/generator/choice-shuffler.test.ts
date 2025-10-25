/**
 * Choice Shuffler Tests
 * ======================
 *
 * Tests for Fisher-Yates shuffling algorithm with seed support.
 * Updated to match current API: shuffleChoices(choices[], seed?) => ShuffledChoice[]
 */

import { describe, it, expect } from 'vitest';
import { shuffleChoices, type ShuffledChoice } from './choice-shuffler';
import type { ContentField } from '../types';

// Helper to create a text content field
function textField(content: string): ContentField {
	return { type: 'text', content };
}

describe('shuffleChoices - Basic Functionality', () => {
	it('should shuffle array', () => {
		const choices = [
			{ content: textField('A'), isCorrect: true },
			{ content: textField('B'), isCorrect: false },
			{ content: textField('C'), isCorrect: false },
			{ content: textField('D'), isCorrect: false }
		];

		const result = shuffleChoices(choices);

		expect(result).toHaveLength(4);
		expect(result.every((item) => item.content && typeof item.originalIndex === 'number')).toBe(
			true
		);
	});

	it('should preserve all original elements', () => {
		const choices = [
			{ content: textField('A'), isCorrect: false },
			{ content: textField('B'), isCorrect: false },
			{ content: textField('C'), isCorrect: true },
			{ content: textField('D'), isCorrect: false },
			{ content: textField('E'), isCorrect: false }
		];

		const result = shuffleChoices(choices);

		const contents = result.map((r) => r.content.content).sort();
		expect(contents).toEqual(['A', 'B', 'C', 'D', 'E']);
	});

	it('should return original indices for each choice', () => {
		const choices = [
			{ content: textField('First'), isCorrect: false },
			{ content: textField('Second'), isCorrect: true },
			{ content: textField('Third'), isCorrect: false }
		];

		const result = shuffleChoices(choices);

		// Each choice should have an originalIndex
		result.forEach((item) => {
			expect(item.originalIndex).toBeGreaterThanOrEqual(0);
			expect(item.originalIndex).toBeLessThan(3);
		});

		// Original indices should be unique
		const indices = result.map((r) => r.originalIndex);
		const uniqueIndices = new Set(indices);
		expect(uniqueIndices.size).toBe(3);
	});

	it('should maintain content integrity', () => {
		const choices = [
			{ content: textField('Correct answer'), isCorrect: true },
			{ content: textField('Wrong answer 1'), isCorrect: false },
			{ content: textField('Wrong answer 2'), isCorrect: false }
		];

		const result = shuffleChoices(choices);

		// Find the correct answer in shuffled results
		const correctChoice = result.find((r) => r.originalIndex === 0);
		expect(correctChoice).toBeDefined();
		expect(correctChoice!.content.content).toBe('Correct answer');
	});
});

describe('shuffleChoices - Seeded Random', () => {
	it('should produce same shuffle with same seed', () => {
		const choices = [
			{ content: textField('A'), isCorrect: false },
			{ content: textField('B'), isCorrect: false },
			{ content: textField('C'), isCorrect: true },
			{ content: textField('D'), isCorrect: false },
			{ content: textField('E'), isCorrect: false }
		];

		const seed = 12345;

		const result1 = shuffleChoices(choices, seed);
		const result2 = shuffleChoices(choices, seed);

		expect(result1.map((r) => r.originalIndex)).toEqual(result2.map((r) => r.originalIndex));
		expect(result1.map((r) => r.content.content)).toEqual(result2.map((r) => r.content.content));
	});

	it('should be reproducible across multiple calls', () => {
		const choices = [
			{ content: textField('A'), isCorrect: false },
			{ content: textField('B'), isCorrect: true },
			{ content: textField('C'), isCorrect: false },
			{ content: textField('D'), isCorrect: false }
		];

		const seed = 99999;

		const results: ShuffledChoice[][] = [];
		for (let i = 0; i < 10; i++) {
			results.push(shuffleChoices(choices, seed));
		}

		// All should be identical
		for (let i = 1; i < results.length; i++) {
			expect(results[i].map((r) => r.originalIndex)).toEqual(
				results[0].map((r) => r.originalIndex)
			);
		}
	});

	it('should handle no seed (random)', () => {
		const choices = [
			{ content: textField('A'), isCorrect: false },
			{ content: textField('B'), isCorrect: false },
			{ content: textField('C'), isCorrect: false },
			{ content: textField('D'), isCorrect: false }
		];

		const result1 = shuffleChoices(choices);
		const result2 = shuffleChoices(choices);

		// Without seed, results should be valid but potentially different
		expect(result1).toHaveLength(4);
		expect(result2).toHaveLength(4);
	});
});

describe('shuffleChoices - Edge Cases', () => {
	it('should handle 2-element array', () => {
		const choices = [
			{ content: textField('A'), isCorrect: true },
			{ content: textField('B'), isCorrect: false }
		];

		const result = shuffleChoices(choices, 12345);

		expect(result).toHaveLength(2);
		const contents = result.map((r) => r.content.content).sort();
		expect(contents).toEqual(['A', 'B']);
	});

	it('should handle single-element array', () => {
		const choices = [{ content: textField('Only'), isCorrect: true }];

		const result = shuffleChoices(choices);

		expect(result).toHaveLength(1);
		expect(result[0].content.content).toBe('Only');
		expect(result[0].originalIndex).toBe(0);
	});

	it('should handle large arrays', () => {
		const choices = Array.from({ length: 100 }, (_, i) => ({
			content: textField(`Choice ${i}`),
			isCorrect: i === 42
		}));

		const result = shuffleChoices(choices, 55555);

		expect(result).toHaveLength(100);
		// All original indices should be present
		const indices = result.map((r) => r.originalIndex).sort((a, b) => a - b);
		expect(indices).toEqual(Array.from({ length: 100 }, (_, i) => i));
	});

	it('should handle choices with image content', () => {
		const choices = [
			{ content: { type: 'image', url: 'http://example.com/a.png', alt: 'A' }, isCorrect: false },
			{ content: { type: 'image', url: 'http://example.com/b.png', alt: 'B' }, isCorrect: true }
		];

		const result = shuffleChoices(choices as never, 77777);

		expect(result).toHaveLength(2);
		expect(result.every((r) => r.content.type === 'image')).toBe(true);
	});

	it('should handle choices with special characters', () => {
		const choices = [
			{ content: textField('$$x^2 + 5x + 6$$'), isCorrect: false },
			{ content: textField('é à è ù ô'), isCorrect: true },
			{ content: textField('<script>alert("xss")</script>'), isCorrect: false }
		];

		const result = shuffleChoices(choices);

		expect(result).toHaveLength(3);
		const contents = result.map((r) => r.content.content);
		expect(contents).toContain('$$x^2 + 5x + 6$$');
		expect(contents).toContain('é à è ù ô');
		expect(contents).toContain('<script>alert("xss")</script>');
	});

	it('should handle empty strings in content', () => {
		const choices = [
			{ content: textField(''), isCorrect: false },
			{ content: textField('Valid'), isCorrect: true }
		];

		const result = shuffleChoices(choices);

		expect(result).toHaveLength(2);
		expect(result.some((r) => r.content.content === '')).toBe(true);
	});

	it('should handle duplicate choice values', () => {
		const choices = [
			{ content: textField('Same'), isCorrect: false },
			{ content: textField('Same'), isCorrect: false },
			{ content: textField('Different'), isCorrect: true }
		];

		const result = shuffleChoices(choices);

		const sameCount = result.filter((r) => r.content.content === 'Same').length;
		expect(sameCount).toBe(2);
	});
});

describe('shuffleChoices - Fisher-Yates Algorithm Verification', () => {
	it('should not modify original array', () => {
		const choices = [
			{ content: textField('A'), isCorrect: false },
			{ content: textField('B'), isCorrect: true },
			{ content: textField('C'), isCorrect: false }
		];

		const originalJson = JSON.stringify(choices);
		shuffleChoices(choices, 12345);
		const afterJson = JSON.stringify(choices);

		expect(afterJson).toBe(originalJson);
	});

	it('should produce valid permutations', () => {
		const choices = [
			{ content: textField('A'), isCorrect: false },
			{ content: textField('B'), isCorrect: false },
			{ content: textField('C'), isCorrect: false }
		];

		// Generate multiple shuffles with different seeds
		const permutations = new Set<string>();
		for (let seed = 0; seed < 100; seed++) {
			const result = shuffleChoices(choices, seed);
			const perm = result.map((r) => r.content.content).join('');
			permutations.add(perm);
		}

		// Should have produced multiple different permutations
		expect(permutations.size).toBeGreaterThan(1);
	});
});

describe('shuffleChoices - Real-World Scenarios', () => {
	it('should shuffle mathematical expressions', () => {
		const choices = [
			{ content: textField('$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$'), isCorrect: true },
			{ content: textField('$$x = \\frac{b \\pm \\sqrt{b^2-4ac}}{2a}$$'), isCorrect: false },
			{ content: textField('$$x = \\frac{-b \\pm \\sqrt{b^2+4ac}}{2a}$$'), isCorrect: false }
		];

		const result = shuffleChoices(choices, 11111);

		expect(result).toHaveLength(3);
		const correctChoice = result.find((r) => r.originalIndex === 0);
		expect(correctChoice!.content.content).toContain('-b \\pm \\sqrt{b^2-4ac}');
	});

	it('should shuffle French text choices', () => {
		const choices = [
			{ content: textField('La réponse correcte'), isCorrect: true },
			{ content: textField('Première erreur'), isCorrect: false },
			{ content: textField('Deuxième erreur'), isCorrect: false },
			{ content: textField('Troisième erreur'), isCorrect: false }
		];

		const result = shuffleChoices(choices, 22222);

		expect(result).toHaveLength(4);
		const correctChoice = result.find((r) => r.originalIndex === 0);
		expect(correctChoice!.content.content).toBe('La réponse correcte');
	});

	it('should track all correct answers for multiple choice', () => {
		const choices = [
			{ content: textField('Correct 1'), isCorrect: true },
			{ content: textField('Wrong 1'), isCorrect: false },
			{ content: textField('Correct 2'), isCorrect: true },
			{ content: textField('Wrong 2'), isCorrect: false }
		];

		const result = shuffleChoices(choices, 33333);

		const correctIndices = result
			.filter((r) => [0, 2].includes(r.originalIndex))
			.map((r) => result.indexOf(r));

		expect(correctIndices).toHaveLength(2);
	});
});

describe('shuffleChoices - Integration with Instance Generator', () => {
	it('should work with instance generator pattern', () => {
		// Simulate how instance-generator.ts uses shuffleChoices
		const _templateChoices = [
			{ content: textField('{@:correct}'), isCorrect: true },
			{ content: textField('{@:wrong1}'), isCorrect: false },
			{ content: textField('{@:wrong2}'), isCorrect: false },
			{ content: textField('{eval:{@:a}*{@:b}}'), isCorrect: false }
		];

		// After variable resolution (simulated)
		const resolvedChoices = [
			{ content: textField('42'), isCorrect: true },
			{ content: textField('41'), isCorrect: false },
			{ content: textField('43'), isCorrect: false },
			{ content: textField('12'), isCorrect: false }
		];

		const shuffled = shuffleChoices(resolvedChoices, 12345);

		// Find where the correct answer ended up
		const correctOriginalIndex = 0;
		const correctNewIndex = shuffled.findIndex((s) => s.originalIndex === correctOriginalIndex);

		expect(correctNewIndex).toBeGreaterThanOrEqual(0);
		expect(correctNewIndex).toBeLessThan(4);
		expect(shuffled[correctNewIndex].content.content).toBe('42');
	});

	it('should handle multiple correct answers for checkbox mode', () => {
		const choices = [
			{ content: textField('2'), isCorrect: true },
			{ content: textField('4'), isCorrect: false },
			{ content: textField('7'), isCorrect: true },
			{ content: textField('9'), isCorrect: false }
		];

		const shuffled = shuffleChoices(choices, 54321);

		// Find indices of correct answers in shuffled array
		const correctIndices = shuffled
			.filter((s) => [0, 2].includes(s.originalIndex))
			.map((s) => shuffled.indexOf(s));

		expect(correctIndices).toHaveLength(2);
		expect(shuffled[correctIndices[0]].content.content).toMatch(/^(2|7)$/);
		expect(shuffled[correctIndices[1]].content.content).toMatch(/^(2|7)$/);
	});
});

describe('shuffleChoices - Performance', () => {
	it('should handle shuffling 1000 times efficiently', () => {
		const choices = Array.from({ length: 10 }, (_, i) => ({
			content: textField(`Choice ${i}`),
			isCorrect: i === 5
		}));

		const startTime = Date.now();
		for (let i = 0; i < 1000; i++) {
			shuffleChoices(choices, i);
		}
		const duration = Date.now() - startTime;

		// Should complete in under 1 second
		expect(duration).toBeLessThan(1000);
	});

	it('should handle very large choice arrays', () => {
		const choices = Array.from({ length: 1000 }, (_, i) => ({
			content: textField(`Choice ${i}`),
			isCorrect: i === 500
		}));

		const result = shuffleChoices(choices, 99999);

		expect(result).toHaveLength(1000);
		const indices = new Set(result.map((r) => r.originalIndex));
		expect(indices.size).toBe(1000);
	});
});
