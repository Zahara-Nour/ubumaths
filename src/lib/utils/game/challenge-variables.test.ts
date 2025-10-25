// Unit tests for challenge variable system
// Author: Claude Code
// Date: 2025-10-17

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'; // vi for future mock tests
import {
	generateChallengeInstance, // For future tests
	interpolateQuestion,
	validateAnswer,
	formatAnswer
} from './challenge-variables';
import { seedRandom, resetRandom, createTestChallenge } from '$lib/test-utils/game-fixtures';

import type { GameChallenge } from '$lib/types/game'; // For future tests

describe('Challenge Variable System', () => {
	describe('generateChallengeInstance', () => {
		beforeEach(() => {
			seedRandom(12345); // Deterministic RNG
		});

		afterEach(() => {
			resetRandom();
		});

		it('should generate instance with evaluated variables', () => {
			const challenge = createTestChallenge('addition', 1);
			const instance = generateChallengeInstance(challenge);

			expect(instance.variables).toHaveProperty('a');
			expect(instance.variables).toHaveProperty('b');
			expect(instance.variables.a).toBeGreaterThanOrEqual(1);
			expect(instance.variables.a).toBeLessThan(10);
		});

		it('should evaluate numeric values correctly', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					a: { value: '5' },
					b: { value: '10' }
				}
			};

			const instance = generateChallengeInstance(challenge);

			expect(instance.variables.a).toBe(5);
			expect(instance.variables.b).toBe(10);
		});

		it('should handle variable dependencies', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					a: { value: '5' },
					b: { value: '{a} * 2' }
				}
			};

			const instance = generateChallengeInstance(challenge);

			expect(instance.variables.a).toBe(5);
			expect(instance.variables.b).toBe(10);
		});

		it('should handle complex dependencies with topological sorting', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					c: { value: '{a} + {b}' },
					a: { value: '3' },
					b: { value: '{a} * 2' }
				}
			};

			const instance = generateChallengeInstance(challenge);

			expect(instance.variables.a).toBe(3);
			expect(instance.variables.b).toBe(6); // 3 * 2
			expect(instance.variables.c).toBe(9); // 3 + 6
		});

		it('should handle array values without evaluation', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					options: { value: ['A', 'B', 'C'] }
				}
			};

			const instance = generateChallengeInstance(challenge);

			expect(instance.variables.options).toEqual(['A', 'B', 'C']);
		});

		it('should evaluate randomInt function', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					a: { value: 'randomInt(1, 10)' }
				}
			};

			const instance = generateChallengeInstance(challenge);

			expect(instance.variables.a).toBeGreaterThanOrEqual(1);
			expect(instance.variables.a).toBeLessThan(10);
			expect(Number.isInteger(instance.variables.a)).toBe(true);
		});

		it('should evaluate pickRandom function', () => {
			seedRandom(12345);

			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					choice: { value: 'pickRandom([1, 2, 3, 4, 5])' }
				},
				answer: { value: 'choice' }
			};

			const instance = generateChallengeInstance(challenge);

			expect([1, 2, 3, 4, 5]).toContain(instance.variables.choice);
		});

		it('should handle expression templates', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					a: { value: '5' },
					result: { expression: '{a} + 3' }
				}
			};

			const instance = generateChallengeInstance(challenge);

			expect(instance.variables.a).toBe(5);
			expect(instance.expressions.result).toBe('5 + 3');
		});

		it('should evaluate correct answer from variable', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					a: { value: '7' },
					b: { value: '3' }
				},
				answer: { value: 'a + b' }
			};

			const instance = generateChallengeInstance(challenge);

			expect(instance.correct_answer).toBe(10);
		});

		it('should evaluate correct answer from array format', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					result: { value: '42' }
				},
				answer: ['result'] // Array format from original Navadra
			};

			const instance = generateChallengeInstance(challenge);

			expect(instance.correct_answer).toBe(42);
		});

		it('should handle conditional answers', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					a: { value: '10' }
				},
				answer: [
					{ if: 'a > 5', choice: '15' },
					{ if: 'a <= 5', choice: '5' }
				]
			};

			const instance = generateChallengeInstance(challenge);

			expect(instance.correct_answer).toBe(15);
		});

		it('should handle determined choice answers', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					a: { value: '10' },
					b: { value: '5' }
				},
				answer: [{ determined: true, choice: '{a} - {b}' }]
			};

			const instance = generateChallengeInstance(challenge);

			expect(instance.correct_answer).toBe(5);
		});

		it('should handle pgcd (GCD) function', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					result: { value: 'pgcd(12, 8)' }
				}
			};

			const instance = generateChallengeInstance(challenge);

			expect(instance.variables.result).toBe(4); // GCD of 12 and 8
		});

		it('should handle ppcm (LCM) function', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					result: { value: 'ppcm(4, 6)' }
				}
			};

			const instance = generateChallengeInstance(challenge);

			expect(instance.variables.result).toBe(12); // LCM of 4 and 6
		});
	});

	describe('interpolateQuestion', () => {
		it('should interpolate variables into question', () => {
			const question = 'Calculer {a} + {b}';
			const variables = { a: 5, b: 3 };

			const result = interpolateQuestion(question, variables);

			expect(result).toBe('Calculer 5 + 3');
		});

		it('should handle multiple occurrences of same variable', () => {
			const question = '{a} + {a} = ?';
			const variables = { a: 5 };

			const result = interpolateQuestion(question, variables);

			expect(result).toBe('5 + 5 = ?');
		});

		it('should format arrays as comma-separated values', () => {
			const question = 'Choisir parmi {options}';
			const variables = { options: [1, 2, 3] };

			const result = interpolateQuestion(question, variables);

			expect(result).toBe('Choisir parmi 1, 2, 3');
		});

		it('should preserve variables without values', () => {
			const question = 'Calculer {a} + {b}';
			const variables = { a: 5 };

			const result = interpolateQuestion(question, variables);

			expect(result).toBe('Calculer 5 + {b}');
		});

		it('should handle decimal numbers', () => {
			const question = 'Résultat: {value}';
			const variables = { value: 3.14 };

			const result = interpolateQuestion(question, variables);

			expect(result).toBe('Résultat: 3.14');
		});
	});

	describe('validateAnswer', () => {
		it('should validate correct numeric answer', () => {
			expect(validateAnswer(42, 42)).toBe(true);
			expect(validateAnswer(42, 41)).toBe(false);
		});

		it('should handle numeric tolerance', () => {
			expect(validateAnswer(42.01, 42, 0.05)).toBe(true);
			expect(validateAnswer(42.1, 42, 0.05)).toBe(false);
		});

		it('should validate string answers (case-insensitive)', () => {
			expect(validateAnswer('Paris', 'paris')).toBe(true);
			expect(validateAnswer('PARIS', 'paris')).toBe(true);
			expect(validateAnswer('Paris', 'Lyon')).toBe(false);
		});

		it('should trim whitespace in string comparison', () => {
			expect(validateAnswer('  Paris  ', 'paris')).toBe(true);
			expect(validateAnswer('Paris', '  paris  ')).toBe(true);
		});

		it('should validate array answers', () => {
			expect(validateAnswer([1, 2, 3], [1, 2, 3])).toBe(true);
			expect(validateAnswer([1, 2, 3], [1, 2, 4])).toBe(false);
			expect(validateAnswer([1, 2], [1, 2, 3])).toBe(false); // Different length
		});

		it('should handle nested array validation', () => {
			expect(
				validateAnswer(
					[
						[1, 2],
						[3, 4]
					],
					[
						[1, 2],
						[3, 4]
					]
				)
			).toBe(true);
			expect(
				validateAnswer(
					[
						[1, 2],
						[3, 4]
					],
					[
						[1, 2],
						[3, 5]
					]
				)
			).toBe(false);
		});

		it('should parse numeric strings', () => {
			expect(validateAnswer('42', 42)).toBe(true);
			expect(validateAnswer('3.14', 3.14, 0.01)).toBe(true);
		});

		it('should reject null/undefined answers', () => {
			expect(validateAnswer(null, 42)).toBe(false);
			expect(validateAnswer(undefined, 42)).toBe(false);
			expect(validateAnswer(42, null)).toBe(false);
			expect(validateAnswer(42, undefined)).toBe(false);
		});

		it('should handle object comparison', () => {
			expect(validateAnswer({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
			expect(validateAnswer({ x: 1, y: 2 }, { x: 1, y: 3 })).toBe(false);
		});

		it('should apply default tolerance of 0.01', () => {
			expect(validateAnswer(42.005, 42)).toBe(true); // Within 0.01
			expect(validateAnswer(42.02, 42)).toBe(false); // Outside 0.01
		});

		it('should handle negative numbers', () => {
			expect(validateAnswer(-42, -42)).toBe(true);
			expect(validateAnswer('-42', -42)).toBe(true);
			expect(validateAnswer(-42, 42)).toBe(false);
		});

		it('should validate zero', () => {
			expect(validateAnswer(0, 0)).toBe(true);
			expect(validateAnswer('0', 0)).toBe(true);
		});
	});

	describe('formatAnswer', () => {
		it('should format integer numbers', () => {
			expect(formatAnswer(42)).toBe('42');
			expect(formatAnswer(0)).toBe('0');
			expect(formatAnswer(-10)).toBe('-10');
		});

		it('should format decimal numbers with 2 decimal places', () => {
			expect(formatAnswer(3.14159)).toBe('3.14');
			expect(formatAnswer(2.5)).toBe('2.50');
		});

		it('should format arrays as comma-separated values', () => {
			expect(formatAnswer([1, 2, 3])).toBe('1, 2, 3');
			expect(formatAnswer(['a', 'b', 'c'])).toBe('a, b, c');
		});

		it('should format strings as-is', () => {
			expect(formatAnswer('Paris')).toBe('Paris');
		});

		it('should handle empty arrays', () => {
			expect(formatAnswer([])).toBe('');
		});

		it('should convert other types to string', () => {
			expect(formatAnswer(true)).toBe('true');
			expect(formatAnswer(null)).toBe('null');
		});
	});

	describe('Edge Cases & Error Handling', () => {
		it('should handle circular dependencies gracefully', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					a: { value: '{b}' },
					b: { value: '{a}' }
				}
			};

			// This should not crash, but may return null for unresolvable variables
			const instance = generateChallengeInstance(challenge);

			expect(instance.variables).toBeDefined();
		});

		it('should handle invalid Math.js expressions', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					a: { value: 'invalid expression !!!' }
				}
			};

			const instance = generateChallengeInstance(challenge);

			// Should return null or handle gracefully
			expect(instance.variables.a).toBeDefined(); // Should not crash
		});

		it('should handle division by zero', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					a: { value: '10' },
					b: { value: '0' },
					result: { value: '{a} / {b}' }
				}
			};

			const instance = generateChallengeInstance(challenge);

			// Math.js should handle division by zero (returns Infinity)
			expect(instance.variables.result).toBe(Infinity);
		});

		it('should handle missing variable references', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					a: { value: '{nonexistent}' }
				}
			};

			const instance = generateChallengeInstance(challenge);

			// Should handle missing reference gracefully
			expect(instance.variables).toBeDefined();
		});

		it('should handle "x" as multiplication operator', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					result: { value: '5 x 3' }
				}
			};

			const instance = generateChallengeInstance(challenge);

			expect(instance.variables.result).toBe(15);
		});

		it('should handle "x" without spaces', () => {
			const challenge: GameChallenge = {
				...createTestChallenge(),
				variables: {
					result: { value: '5x3' }
				}
			};

			const instance = generateChallengeInstance(challenge);

			expect(instance.variables.result).toBe(15);
		});
	});

	describe('Simple Challenge Types (Priority)', () => {
		beforeEach(() => {
			seedRandom(12345);
		});

		afterEach(() => {
			resetRandom();
		});

		describe('Addition Challenges', () => {
			it('should generate valid addition challenge', () => {
				const challenge = createTestChallenge('addition', 1);
				const instance = generateChallengeInstance(challenge);

				expect(instance.variables.a).toBeDefined();
				expect(instance.variables.b).toBeDefined();
				expect(instance.correct_answer).toBe(instance.variables.a + instance.variables.b);
			});

			it('should interpolate addition question correctly', () => {
				const challenge = createTestChallenge('addition', 1);
				const instance = generateChallengeInstance(challenge);

				const question = interpolateQuestion(challenge.question, instance.variables);

				expect(question).toContain(String(instance.variables.a));
				expect(question).toContain(String(instance.variables.b));
			});
		});

		describe('Subtraction Challenges', () => {
			it('should generate valid subtraction challenge', () => {
				const challenge = createTestChallenge('subtraction', 1);
				const instance = generateChallengeInstance(challenge);

				expect(instance.variables.a).toBeDefined();
				expect(instance.variables.b).toBeDefined();
				expect(instance.correct_answer).toBe(instance.variables.a - instance.variables.b);
			});

			it('should ensure a > b for positive results', () => {
				const challenge = createTestChallenge('subtraction', 1);
				const instance = generateChallengeInstance(challenge);

				// Template has a: randomInt(10, 20), b: randomInt(1, 10)
				expect(instance.variables.a).toBeGreaterThan(instance.variables.b);
			});
		});

		describe('Multiplication Challenges', () => {
			it('should generate valid multiplication challenge', () => {
				const challenge = createTestChallenge('multiplication', 1);
				const instance = generateChallengeInstance(challenge);

				expect(instance.variables.a).toBeDefined();
				expect(instance.variables.b).toBeDefined();
				expect(instance.correct_answer).toBe(instance.variables.a * instance.variables.b);
			});
		});
	});
});
