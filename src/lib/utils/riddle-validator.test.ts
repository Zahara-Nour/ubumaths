/**
 * Riddle Validator Tests
 * Tests all 5 validation types: exact match, numerical, text, QCM, manual
 */

import { describe, it, expect } from 'vitest';
import {
	validateRiddleAnswer,
	formatValidationMessage,
	isAnswerComplete,
	getAnswerPlaceholder,
	sanitizeAnswer
} from './riddle-validator';
import type { AnswerConfig } from '$lib/types/riddle';

describe('validateRiddleAnswer', () => {
	describe('Numerical Validation', () => {
		it('should validate correct numerical answer exactly', () => {
			const config: AnswerConfig = {
				type: 'numerical',
				value: 42
			};

			const result = validateRiddleAnswer(42, config);

			expect(result.isCorrect).toBe(true);
			expect(result.message).toBe('Correct !');
			expect(result.details).toMatchObject({
				submitted: 42,
				expected: 42,
				difference: 0
			});
		});

		it('should validate numerical answer within tolerance', () => {
			const config: AnswerConfig = {
				type: 'numerical',
				value: 10,
				options: { tolerance: 0.1 }
			};

			// Test within tolerance
			expect(validateRiddleAnswer(10.05, config).isCorrect).toBe(true);
			expect(validateRiddleAnswer(9.95, config).isCorrect).toBe(true);

			// Test at exact boundaries
			expect(validateRiddleAnswer(10.1, config).isCorrect).toBe(true);
			expect(validateRiddleAnswer(9.9, config).isCorrect).toBe(true);

			// Test outside tolerance
			expect(validateRiddleAnswer(10.11, config).isCorrect).toBe(false);
			expect(validateRiddleAnswer(9.89, config).isCorrect).toBe(false);
		});

		it('should use default tolerance of 0.01 when not specified', () => {
			const config: AnswerConfig = {
				type: 'numerical',
				value: 5
			};

			expect(validateRiddleAnswer(5.005, config).isCorrect).toBe(true);
			expect(validateRiddleAnswer(5.02, config).isCorrect).toBe(false);
		});

		it('should handle string inputs by parsing to number', () => {
			const config: AnswerConfig = {
				type: 'numerical',
				value: 100
			};

			expect(validateRiddleAnswer('100', config).isCorrect).toBe(true);
			expect(validateRiddleAnswer('100.0', config).isCorrect).toBe(true);
		});

		it('should reject invalid numerical inputs', () => {
			const config: AnswerConfig = {
				type: 'numerical',
				value: 42
			};

			const result = validateRiddleAnswer('not a number', config);

			expect(result.isCorrect).toBe(false);
			expect(result.message).toBe('Réponse invalide (nombre attendu)');
		});

		it('should handle negative numbers', () => {
			const config: AnswerConfig = {
				type: 'numerical',
				value: -15,
				options: { tolerance: 0.5 }
			};

			expect(validateRiddleAnswer(-15, config).isCorrect).toBe(true);
			expect(validateRiddleAnswer(-15.3, config).isCorrect).toBe(true);
			expect(validateRiddleAnswer(-14.6, config).isCorrect).toBe(true);
			expect(validateRiddleAnswer(-16, config).isCorrect).toBe(false);
		});

		it('should handle decimal numbers', () => {
			const config: AnswerConfig = {
				type: 'numerical',
				value: 3.14159,
				options: { tolerance: 0.001 }
			};

			expect(validateRiddleAnswer(3.141, config).isCorrect).toBe(true);
			expect(validateRiddleAnswer(3.142, config).isCorrect).toBe(true);
			expect(validateRiddleAnswer(3.14, config).isCorrect).toBe(false);
		});

		it('should handle very large numbers', () => {
			const config: AnswerConfig = {
				type: 'numerical',
				value: 1000000,
				options: { tolerance: 100 }
			};

			expect(validateRiddleAnswer(1000050, config).isCorrect).toBe(true);
			expect(validateRiddleAnswer(999950, config).isCorrect).toBe(true);
		});

		it('should handle zero', () => {
			const config: AnswerConfig = {
				type: 'numerical',
				value: 0,
				options: { tolerance: 0.01 }
			};

			expect(validateRiddleAnswer(0, config).isCorrect).toBe(true);
			expect(validateRiddleAnswer(0.005, config).isCorrect).toBe(true);
			expect(validateRiddleAnswer(-0.005, config).isCorrect).toBe(true);
		});
	});

	describe('Text Validation', () => {
		it('should validate exact text match (case insensitive by default)', () => {
			const config: AnswerConfig = {
				type: 'text',
				value: 'Paris'
			};

			expect(validateRiddleAnswer('Paris', config).isCorrect).toBe(true);
			expect(validateRiddleAnswer('paris', config).isCorrect).toBe(true);
			expect(validateRiddleAnswer('PARIS', config).isCorrect).toBe(true);
			expect(validateRiddleAnswer('PaRiS', config).isCorrect).toBe(true);
		});

		it('should validate case-sensitive text when configured', () => {
			const config: AnswerConfig = {
				type: 'text',
				value: 'Paris',
				options: { caseSensitive: true }
			};

			expect(validateRiddleAnswer('Paris', config).isCorrect).toBe(true);
			expect(validateRiddleAnswer('paris', config).isCorrect).toBe(false);
			expect(validateRiddleAnswer('PARIS', config).isCorrect).toBe(false);
		});

		it('should trim whitespace from text answers', () => {
			const config: AnswerConfig = {
				type: 'text',
				value: 'London'
			};

			expect(validateRiddleAnswer('  London  ', config).isCorrect).toBe(true);
			expect(validateRiddleAnswer('London\n', config).isCorrect).toBe(true);
			expect(validateRiddleAnswer('\tLondon', config).isCorrect).toBe(true);
		});

		it('should handle multi-word answers', () => {
			const config: AnswerConfig = {
				type: 'text',
				value: 'New York'
			};

			expect(validateRiddleAnswer('New York', config).isCorrect).toBe(true);
			expect(validateRiddleAnswer('new york', config).isCorrect).toBe(true);
		});

		it('should reject incorrect text', () => {
			const config: AnswerConfig = {
				type: 'text',
				value: 'Berlin'
			};

			expect(validateRiddleAnswer('Paris', config).isCorrect).toBe(false);
			expect(validateRiddleAnswer('Berlyn', config).isCorrect).toBe(false);
		});

		it('should handle accented characters', () => {
			const config: AnswerConfig = {
				type: 'text',
				value: 'café'
			};

			expect(validateRiddleAnswer('café', config).isCorrect).toBe(true);
			expect(validateRiddleAnswer('CAFÉ', config).isCorrect).toBe(true);
			expect(validateRiddleAnswer('cafe', config).isCorrect).toBe(false);
		});

		it('should handle empty strings', () => {
			const config: AnswerConfig = {
				type: 'text',
				value: 'answer'
			};

			expect(validateRiddleAnswer('', config).isCorrect).toBe(false);
			expect(validateRiddleAnswer('   ', config).isCorrect).toBe(false);
		});
	});

	describe('QCM Validation', () => {
		it('should validate single correct answer', () => {
			const config: AnswerConfig = {
				type: 'qcm',
				value: [1] as unknown as string,
				options: {
					choices: ['Option A', 'Option B', 'Option C'],
					multipleAnswers: false
				}
			};

			expect(validateRiddleAnswer([1], config).isCorrect).toBe(true);
			expect(validateRiddleAnswer(1, config).isCorrect).toBe(true); // Also accept non-array
		});

		it('should validate multiple correct answers', () => {
			const config: AnswerConfig = {
				type: 'qcm',
				value: [0, 2] as unknown as string,
				options: {
					choices: ['Option A', 'Option B', 'Option C'],
					multipleAnswers: true
				}
			};

			expect(validateRiddleAnswer([0, 2], config).isCorrect).toBe(true);
			expect(validateRiddleAnswer([2, 0], config).isCorrect).toBe(true); // Order doesn't matter
		});

		it('should reject incorrect QCM answers', () => {
			const config: AnswerConfig = {
				type: 'qcm',
				value: [1] as unknown as string,
				options: {
					choices: ['Option A', 'Option B', 'Option C']
				}
			};

			expect(validateRiddleAnswer([0], config).isCorrect).toBe(false);
			expect(validateRiddleAnswer([2], config).isCorrect).toBe(false);
			expect(validateRiddleAnswer([0, 1], config).isCorrect).toBe(false); // Too many
		});

		it('should reject partial matches for multiple answers', () => {
			const config: AnswerConfig = {
				type: 'qcm',
				value: [0, 1, 2] as unknown as string,
				options: {
					choices: ['A', 'B', 'C', 'D'],
					multipleAnswers: true
				}
			};

			expect(validateRiddleAnswer([0, 1], config).isCorrect).toBe(false); // Missing one
			expect(validateRiddleAnswer([0, 1, 2, 3], config).isCorrect).toBe(false); // One extra
		});

		it('should reject invalid choice indices', () => {
			const config: AnswerConfig = {
				type: 'qcm',
				value: [1] as unknown as string,
				options: {
					choices: ['A', 'B', 'C']
				}
			};

			expect(validateRiddleAnswer([5], config).isCorrect).toBe(false);
			expect(validateRiddleAnswer([-1], config).isCorrect).toBe(false);
		});

		it('should handle string indices by converting to numbers', () => {
			const config: AnswerConfig = {
				type: 'qcm',
				value: [1] as unknown as string,
				options: {
					choices: ['A', 'B', 'C']
				}
			};

			expect(validateRiddleAnswer(['1'], config).isCorrect).toBe(true);
		});

		it('should return error for missing choices configuration', () => {
			const config: AnswerConfig = {
				type: 'qcm',
				value: [1] as unknown as string,
				options: {}
			};

			const result = validateRiddleAnswer([1], config);

			expect(result.isCorrect).toBe(false);
			expect(result.message).toBe('Configuration invalide (choix manquants)');
		});

		it('should handle single value answer config', () => {
			const config: AnswerConfig = {
				type: 'qcm',
				value: 2, // Not an array
				options: {
					choices: ['A', 'B', 'C']
				}
			};

			expect(validateRiddleAnswer([2], config).isCorrect).toBe(true);
			expect(validateRiddleAnswer(2, config).isCorrect).toBe(true);
		});
	});

	describe('Math Expression Validation', () => {
		it('should validate exact mathematical expression match', () => {
			const config: AnswerConfig = {
				type: 'math',
				value: '2x + 3',
				options: { exactMatch: true }
			};

			expect(validateRiddleAnswer('2x + 3', config).isCorrect).toBe(true);
			expect(validateRiddleAnswer('2x+3', config).isCorrect).toBe(true); // Whitespace normalized
		});

		it('should normalize whitespace in expressions', () => {
			const config: AnswerConfig = {
				type: 'math',
				value: 'x^2 + 2x + 1'
			};

			expect(validateRiddleAnswer('x^2+2x+1', config).isCorrect).toBe(true);
			expect(validateRiddleAnswer('x^2  +  2x  +  1', config).isCorrect).toBe(true);
		});

		it('should reject incorrect math expressions', () => {
			const config: AnswerConfig = {
				type: 'math',
				value: '2x + 3'
			};

			expect(validateRiddleAnswer('3x + 2', config).isCorrect).toBe(false);
			expect(validateRiddleAnswer('2x - 3', config).isCorrect).toBe(false);
		});

		it('should handle complex expressions', () => {
			const config: AnswerConfig = {
				type: 'math',
				value: '(x+1)^2'
			};

			expect(validateRiddleAnswer('(x+1)^2', config).isCorrect).toBe(true);
			expect(validateRiddleAnswer('(x + 1)^2', config).isCorrect).toBe(true);
		});

		it('should trim leading and trailing whitespace', () => {
			const config: AnswerConfig = {
				type: 'math',
				value: 'x^2'
			};

			expect(validateRiddleAnswer('  x^2  ', config).isCorrect).toBe(true);
		});
	});

	describe('Manual Validation', () => {
		it('should return not correct when no answer config provided', () => {
			const result = validateRiddleAnswer('any answer', null);

			expect(result.isCorrect).toBe(false);
			expect(result.message).toBe('Validation manuelle requise');
		});
	});

	describe('Unknown Validation Type', () => {
		it('should handle unknown validation type', () => {
			const config = {
				type: 'unknown_type',
				value: 'test'
			} as unknown as AnswerConfig;

			const result = validateRiddleAnswer('test', config);

			expect(result.isCorrect).toBe(false);
			expect(result.message).toBe('Type de validation inconnu');
		});
	});
});

describe('formatValidationMessage', () => {
	it('should format correct answer message', () => {
		const result = {
			isCorrect: true,
			message: 'Correct !'
		};

		expect(formatValidationMessage(result)).toBe('✓ Réponse correcte !');
	});

	it('should format incorrect answer message', () => {
		const result = {
			isCorrect: false,
			message: 'Incorrect'
		};

		expect(formatValidationMessage(result)).toBe('Incorrect');
	});

	it('should use default message when not provided', () => {
		const result = {
			isCorrect: false
		};

		expect(formatValidationMessage(result)).toBe('✗ Réponse incorrecte');
	});

	it('should use custom message when provided', () => {
		const result = {
			isCorrect: false,
			message: 'Réponse invalide (nombre attendu)'
		};

		expect(formatValidationMessage(result)).toBe('Réponse invalide (nombre attendu)');
	});
});

describe('isAnswerComplete', () => {
	describe('Numerical answers', () => {
		it('should accept valid numbers', () => {
			expect(isAnswerComplete(42, 'numerical')).toBe(true);
			expect(isAnswerComplete('42', 'numerical')).toBe(true);
			expect(isAnswerComplete('3.14', 'numerical')).toBe(true);
			expect(isAnswerComplete(-5, 'numerical')).toBe(true);
		});

		it('should reject invalid numerical inputs', () => {
			expect(isAnswerComplete('', 'numerical')).toBe(false);
			expect(isAnswerComplete('  ', 'numerical')).toBe(false);
			expect(isAnswerComplete('abc', 'numerical')).toBe(false);
			expect(isAnswerComplete(null, 'numerical')).toBe(false);
			expect(isAnswerComplete(undefined, 'numerical')).toBe(false);
		});
	});

	describe('Text answers', () => {
		it('should accept non-empty text', () => {
			expect(isAnswerComplete('Paris', 'text')).toBe(true);
			expect(isAnswerComplete('  New York  ', 'text')).toBe(true);
			expect(isAnswerComplete('a', 'text')).toBe(true);
		});

		it('should reject empty text', () => {
			expect(isAnswerComplete('', 'text')).toBe(false);
			expect(isAnswerComplete('   ', 'text')).toBe(false);
			expect(isAnswerComplete(null, 'text')).toBe(false);
			expect(isAnswerComplete(undefined, 'text')).toBe(false);
		});
	});

	describe('QCM answers', () => {
		it('should accept non-empty arrays', () => {
			expect(isAnswerComplete([0], 'qcm')).toBe(true);
			expect(isAnswerComplete([0, 1, 2], 'qcm')).toBe(true);
		});

		it('should accept single values', () => {
			expect(isAnswerComplete(0, 'qcm')).toBe(true);
			expect(isAnswerComplete(2, 'qcm')).toBe(true);
		});

		it('should reject empty or null values', () => {
			expect(isAnswerComplete([], 'qcm')).toBe(false);
			expect(isAnswerComplete(null, 'qcm')).toBe(false);
			expect(isAnswerComplete(undefined, 'qcm')).toBe(false);
		});
	});

	describe('Math answers', () => {
		it('should accept non-empty expressions', () => {
			expect(isAnswerComplete('2x + 3', 'math')).toBe(true);
			expect(isAnswerComplete('  x^2  ', 'math')).toBe(true);
		});

		it('should reject empty expressions', () => {
			expect(isAnswerComplete('', 'math')).toBe(false);
			expect(isAnswerComplete('   ', 'math')).toBe(false);
			expect(isAnswerComplete(null, 'math')).toBe(false);
		});
	});

	it('should return false for unknown types', () => {
		expect(isAnswerComplete('value', 'unknown')).toBe(false);
	});
});

describe('getAnswerPlaceholder', () => {
	it('should return appropriate placeholders for each type', () => {
		expect(getAnswerPlaceholder('numerical')).toBe('Entrez un nombre...');
		expect(getAnswerPlaceholder('text')).toBe('Entrez votre réponse...');
		expect(getAnswerPlaceholder('qcm')).toBe('Sélectionnez une ou plusieurs réponses');
		expect(getAnswerPlaceholder('math')).toBe('Entrez une expression mathématique...');
		expect(getAnswerPlaceholder('unknown')).toBe('Votre réponse...');
	});
});

describe('sanitizeAnswer', () => {
	it('should sanitize numerical answers', () => {
		expect(sanitizeAnswer('42', 'numerical')).toBe(42);
		expect(sanitizeAnswer('3.14', 'numerical')).toBe(3.14);
		expect(sanitizeAnswer(100, 'numerical')).toBe(100);
	});

	it('should sanitize text answers', () => {
		expect(sanitizeAnswer('  Paris  ', 'text')).toBe('Paris');
		expect(sanitizeAnswer('London\n', 'text')).toBe('London');
	});

	it('should sanitize QCM answers', () => {
		expect(sanitizeAnswer([0, 1], 'qcm')).toEqual([0, 1]);
		expect(sanitizeAnswer(2, 'qcm')).toEqual([2]); // Converts single value to array
	});

	it('should sanitize math answers', () => {
		expect(sanitizeAnswer('  2x + 3  ', 'math')).toBe('2x + 3');
	});

	it('should return unchanged for unknown types', () => {
		expect(sanitizeAnswer('value', 'unknown')).toBe('value');
	});
});

describe('Edge Cases and Error Handling', () => {
	it('should handle null and undefined inputs gracefully', () => {
		const config: AnswerConfig = {
			type: 'text',
			value: 'answer'
		};

		expect(validateRiddleAnswer(null, config).isCorrect).toBe(false);
		expect(validateRiddleAnswer(undefined, config).isCorrect).toBe(false);
	});

	it('should handle very long text inputs', () => {
		const longText = 'a'.repeat(10000);
		const config: AnswerConfig = {
			type: 'text',
			value: longText
		};

		expect(validateRiddleAnswer(longText, config).isCorrect).toBe(true);
	});

	it('should handle special characters in text', () => {
		const config: AnswerConfig = {
			type: 'text',
			value: 'Test@#$%^&*()'
		};

		expect(validateRiddleAnswer('Test@#$%^&*()', config).isCorrect).toBe(true);
	});

	it('should handle scientific notation in numerical answers', () => {
		const config: AnswerConfig = {
			type: 'numerical',
			value: 1e6,
			options: { tolerance: 1000 }
		};

		expect(validateRiddleAnswer(1e6, config).isCorrect).toBe(true);
		expect(validateRiddleAnswer('1000000', config).isCorrect).toBe(true);
	});
});
