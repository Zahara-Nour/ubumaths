/**
 * Choice Shuffler Tests
 * ======================
 *
 * Tests for Fisher-Yates shuffling algorithm with seed support.
 */

import { describe, it, expect } from 'vitest';
import { shuffleChoices } from './choice-shuffler';

describe('shuffleChoices - Basic Functionality', () => {
	it('should shuffle array', () => {
		const choices = ['A', 'B', 'C', 'D'];
		const correctIndex = 0;

		const result = shuffleChoices(choices, correctIndex);

		expect(result.shuffledChoices).toHaveLength(4);
		expect(result.shuffledChoices).toContain('A');
		expect(result.shuffledChoices).toContain('B');
		expect(result.shuffledChoices).toContain('C');
		expect(result.shuffledChoices).toContain('D');
	});

	it('should return correct answer index after shuffle', () => {
		const choices = ['Wrong1', 'Correct', 'Wrong2', 'Wrong3'];
		const correctIndex = 1;

		const result = shuffleChoices(choices, correctIndex);

		expect(result.shuffledChoices[result.correctIndex]).toBe('Correct');
	});

	it('should track correct index when original is 0', () => {
		const choices = ['Correct', 'Wrong1', 'Wrong2'];
		const correctIndex = 0;

		const result = shuffleChoices(choices, correctIndex);

		expect(result.shuffledChoices[result.correctIndex]).toBe('Correct');
	});

	it('should track correct index when original is last', () => {
		const choices = ['Wrong1', 'Wrong2', 'Wrong3', 'Correct'];
		const correctIndex = 3;

		const result = shuffleChoices(choices, correctIndex);

		expect(result.shuffledChoices[result.correctIndex]).toBe('Correct');
	});

	it('should preserve all original elements', () => {
		const choices = ['A', 'B', 'C', 'D', 'E'];
		const correctIndex = 2;

		const result = shuffleChoices(choices, correctIndex);

		expect(result.shuffledChoices.sort()).toEqual(['A', 'B', 'C', 'D', 'E']);
	});
});

describe('shuffleChoices - Seeded Random', () => {
	it('should produce same shuffle with same seed', () => {
		const choices = ['A', 'B', 'C', 'D', 'E'];
		const correctIndex = 0;
		const seed = 12345;

		const result1 = shuffleChoices(choices, correctIndex, seed);
		const result2 = shuffleChoices(choices, correctIndex, seed);

		expect(result1.shuffledChoices).toEqual(result2.shuffledChoices);
		expect(result1.correctIndex).toBe(result2.correctIndex);
	});

	it('should produce different shuffles with different seeds', () => {
		const choices = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
		const correctIndex = 0;

		const result1 = shuffleChoices(choices, correctIndex, 11111);
		const result2 = shuffleChoices(choices, correctIndex, 22222);

		// With 8 items, very unlikely to be same order
		expect(result1.shuffledChoices).not.toEqual(result2.shuffledChoices);
	});

	it('should be reproducible across multiple calls', () => {
		const choices = ['A', 'B', 'C', 'D'];
		const correctIndex = 1;
		const seed = 99999;

		const results = [];
		for (let i = 0; i < 10; i++) {
			results.push(shuffleChoices(choices, correctIndex, seed));
		}

		// All should be identical
		for (let i = 1; i < results.length; i++) {
			expect(results[i].shuffledChoices).toEqual(results[0].shuffledChoices);
			expect(results[i].correctIndex).toBe(results[0].correctIndex);
		}
	});
});

describe('shuffleChoices - Multiple Correct Answers', () => {
	it('should handle single correct answer (string)', () => {
		const choices = ['A', 'B', 'C', 'D'];
		const correctIndex = '1';

		const result = shuffleChoices(choices, correctIndex);

		expect(result.shuffledChoices[result.correctIndex]).toBe('B');
	});

	it('should handle multiple correct answers (array)', () => {
		const choices = ['A', 'B', 'C', 'D'];
		const correctIndices = ['0', '2'];

		const result = shuffleChoices(choices, correctIndices);

		expect(Array.isArray(result.correctIndex)).toBe(true);
		const correctArray = result.correctIndex as string[];
		expect(correctArray).toHaveLength(2);

		// Both original correct answers should be in result
		expect(result.shuffledChoices[parseInt(correctArray[0])]).toBe('A');
		expect(result.shuffledChoices[parseInt(correctArray[1])]).toBe('C');
	});

	it('should track multiple correct indices after shuffle', () => {
		const choices = ['Wrong1', 'Correct1', 'Wrong2', 'Correct2', 'Wrong3'];
		const correctIndices = ['1', '3'];

		const result = shuffleChoices(choices, correctIndices, 54321);

		const correctArray = result.correctIndex as string[];
		const correctChoices = correctArray.map((i) => result.shuffledChoices[parseInt(i)]);

		expect(correctChoices).toContain('Correct1');
		expect(correctChoices).toContain('Correct2');
		expect(correctChoices).toHaveLength(2);
	});

	it('should handle all choices being correct', () => {
		const choices = ['A', 'B', 'C'];
		const correctIndices = ['0', '1', '2'];

		const result = shuffleChoices(choices, correctIndices);

		const correctArray = result.correctIndex as string[];
		expect(correctArray).toHaveLength(3);
	});
});

describe('shuffleChoices - Edge Cases', () => {
	it('should handle 2-element array', () => {
		const choices = ['A', 'B'];
		const correctIndex = 0;

		const result = shuffleChoices(choices, correctIndex);

		expect(result.shuffledChoices).toHaveLength(2);
		expect(result.shuffledChoices).toContain('A');
		expect(result.shuffledChoices).toContain('B');
		expect(result.shuffledChoices[result.correctIndex]).toBe('A');
	});

	it('should handle single-element array', () => {
		const choices = ['Only'];
		const correctIndex = 0;

		const result = shuffleChoices(choices, correctIndex);

		expect(result.shuffledChoices).toEqual(['Only']);
		expect(result.correctIndex).toBe(0);
	});

	it('should handle large arrays', () => {
		const choices = Array.from({ length: 100 }, (_, i) => `Choice ${i}`);
		const correctIndex = 42;

		const result = shuffleChoices(choices, correctIndex);

		expect(result.shuffledChoices).toHaveLength(100);
		expect(result.shuffledChoices[result.correctIndex]).toBe('Choice 42');
	});

	it('should handle numeric choices', () => {
		const choices = [1, 2, 3, 4, 5];
		const correctIndex = 2;

		const result = shuffleChoices(choices, correctIndex);

		expect(result.shuffledChoices).toHaveLength(5);
		expect(result.shuffledChoices[result.correctIndex]).toBe(3);
	});

	it('should handle choices with special characters', () => {
		const choices = ['$x^2$', '$$\\frac{1}{2}$$', '10%', 'x ≤ 5'];
		const correctIndex = 1;

		const result = shuffleChoices(choices, correctIndex);

		expect(result.shuffledChoices[result.correctIndex]).toBe('$$\\frac{1}{2}$$');
	});

	it('should handle empty strings in choices', () => {
		const choices = ['', 'A', 'B', ''];
		const correctIndex = 1;

		const result = shuffleChoices(choices, correctIndex);

		expect(result.shuffledChoices).toContain('');
		expect(result.shuffledChoices[result.correctIndex]).toBe('A');
	});

	it('should handle duplicate choice values', () => {
		const choices = ['A', 'B', 'A', 'C'];
		const correctIndex = 0;

		const result = shuffleChoices(choices, correctIndex);

		// Should preserve duplicates
		const countA = result.shuffledChoices.filter((c) => c === 'A').length;
		expect(countA).toBe(2);
		expect(result.shuffledChoices[result.correctIndex]).toBe('A');
	});

	it('should handle very long choice strings', () => {
		const choices = [
			'Short',
			'A'.repeat(1000),
			'Medium length choice',
			'B'.repeat(500)
		];
		const correctIndex = 1;

		const result = shuffleChoices(choices, correctIndex);

		expect(result.shuffledChoices[result.correctIndex]).toBe('A'.repeat(1000));
	});

	it('should handle choices with newlines', () => {
		const choices = ['Line1\nLine2', 'Single line', 'Multi\nLine\nChoice'];
		const correctIndex = 0;

		const result = shuffleChoices(choices, correctIndex);

		expect(result.shuffledChoices[result.correctIndex]).toBe('Line1\nLine2');
	});

	it('should handle zero as correct index', () => {
		const choices = ['First', 'Second', 'Third'];
		const correctIndex = 0;

		const result = shuffleChoices(choices, correctIndex, 12345);

		expect(result.shuffledChoices[result.correctIndex]).toBe('First');
	});
});

describe('shuffleChoices - Fisher-Yates Algorithm Verification', () => {
	it('should produce all possible permutations over many shuffles', () => {
		const choices = ['A', 'B', 'C'];
		const correctIndex = 0;
		const permutations = new Set<string>();

		// Generate many shuffles with different seeds
		for (let seed = 0; seed < 1000; seed++) {
			const result = shuffleChoices(choices, correctIndex, seed);
			permutations.add(result.shuffledChoices.join(''));
		}

		// Should have multiple different permutations (ideally all 6)
		expect(permutations.size).toBeGreaterThan(3);
	});

	it('should distribute shuffles evenly (statistical test)', () => {
		const choices = ['A', 'B', 'C', 'D'];
		const correctIndex = 0;
		const positionCounts = [0, 0, 0, 0];

		// Track where 'A' ends up after many shuffles
		for (let seed = 0; seed < 1000; seed++) {
			const result = shuffleChoices(choices, correctIndex, seed);
			const positionOfA = result.shuffledChoices.indexOf('A');
			positionCounts[positionOfA]++;
		}

		// Each position should appear roughly 250 times (±100 for randomness)
		for (const count of positionCounts) {
			expect(count).toBeGreaterThan(150);
			expect(count).toBeLessThan(350);
		}
	});

	it('should not modify original array', () => {
		const choices = ['A', 'B', 'C', 'D'];
		const originalCopy = [...choices];
		const correctIndex = 0;

		shuffleChoices(choices, correctIndex);

		expect(choices).toEqual(originalCopy);
	});
});

describe('shuffleChoices - Real-World Scenarios', () => {
	it('should shuffle mathematical expressions', () => {
		const choices = [
			'$$x = \\frac{-b + \\sqrt{b^2 - 4ac}}{2a}$$',
			'$$x = \\frac{-b - \\sqrt{b^2 - 4ac}}{2a}$$',
			'$$x = \\frac{b \\pm \\sqrt{b^2 - 4ac}}{2a}$$',
			'$$x = \\frac{-b}{2a}$$'
		];
		const correctIndex = 2;

		const result = shuffleChoices(choices, correctIndex, 99999);

		expect(result.shuffledChoices[result.correctIndex]).toBe(
			'$$x = \\frac{b \\pm \\sqrt{b^2 - 4ac}}{2a}$$'
		);
	});

	it('should shuffle French text choices', () => {
		const choices = [
			'Le périmètre est 24 cm',
			"L'aire est 36 cm²",
			'La diagonale est 12 cm',
			'Le volume est 48 cm³'
		];
		const correctIndex = 1;

		const result = shuffleChoices(choices, correctIndex, 11111);

		expect(result.shuffledChoices[result.correctIndex]).toBe("L'aire est 36 cm²");
	});

	it('should shuffle numeric answer choices', () => {
		const choices = ['0.25', '0.5', '0.75', '1.0'];
		const correctIndex = 2;

		const result = shuffleChoices(choices, correctIndex, 77777);

		expect(result.shuffledChoices[result.correctIndex]).toBe('0.75');
	});

	it('should shuffle with multiple correct answers for checkbox mode', () => {
		const choices = [
			'2 est un nombre premier',
			'4 est un nombre premier',
			'6 est un nombre premier',
			'7 est un nombre premier'
		];
		const correctIndices = ['0', '3'];

		const result = shuffleChoices(choices, correctIndices, 33333);

		const correctArray = result.correctIndex as string[];
		const correctChoices = correctArray.map((i) => result.shuffledChoices[parseInt(i)]);

		expect(correctChoices).toContain('2 est un nombre premier');
		expect(correctChoices).toContain('7 est un nombre premier');
	});
});

describe('shuffleChoices - Error Handling', () => {
	it('should handle empty array gracefully', () => {
		const choices: string[] = [];
		const correctIndex = 0;

		const result = shuffleChoices(choices, correctIndex);

		expect(result.shuffledChoices).toEqual([]);
	});

	it('should handle out of bounds correct index', () => {
		const choices = ['A', 'B', 'C'];
		const correctIndex = 10;

		// Should either throw or handle gracefully
		expect(() => shuffleChoices(choices, correctIndex)).toThrow();
	});

	it('should handle negative correct index', () => {
		const choices = ['A', 'B', 'C'];
		const correctIndex = -1;

		expect(() => shuffleChoices(choices, correctIndex)).toThrow();
	});

	it('should handle invalid correct indices in array', () => {
		const choices = ['A', 'B', 'C'];
		const correctIndices = ['0', '5']; // 5 is out of bounds

		expect(() => shuffleChoices(choices, correctIndices)).toThrow();
	});

	it('should handle null/undefined choices', () => {
		const choices = null as any;
		const correctIndex = 0;

		expect(() => shuffleChoices(choices, correctIndex)).toThrow();
	});
});

describe('shuffleChoices - Performance', () => {
	it('should handle shuffling 1000 times efficiently', () => {
		const choices = Array.from({ length: 20 }, (_, i) => `Choice ${i}`);
		const correctIndex = 10;

		const startTime = Date.now();

		for (let i = 0; i < 1000; i++) {
			shuffleChoices(choices, correctIndex, i);
		}

		const elapsed = Date.now() - startTime;

		// Should complete in reasonable time (< 1 second)
		expect(elapsed).toBeLessThan(1000);
	});

	it('should handle very large choice arrays', () => {
		const choices = Array.from({ length: 1000 }, (_, i) => `Choice ${i}`);
		const correctIndex = 500;

		const result = shuffleChoices(choices, correctIndex);

		expect(result.shuffledChoices).toHaveLength(1000);
		expect(result.shuffledChoices[result.correctIndex]).toBe('Choice 500');
	});
});
