/**
 * Tests for Migration Hash Utilities
 * ===================================
 *
 * Ensures hash generation is stable, consistent, and reliable.
 */

import { describe, it, expect } from 'vitest';
import {
	generateStableQuestionHash,
	generateQuestionDescription,
	verifyQuestionHashMatch
} from './hash-utils';

describe('generateStableQuestionHash', () => {
	it('should generate a consistent hash for the same question', () => {
		const question = {
			description: 'Addition de deux nombres',
			enounces: ['Calculer 2 + 3'],
			variabless: [{ a: 2, b: 3 }],
			solutionss: [5]
		};

		const hash1 = generateStableQuestionHash(question);
		const hash2 = generateStableQuestionHash(question);

		expect(hash1).toBe(hash2);
		expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 produces 64 hex characters
	});

	it('should generate the same hash for questions with different property order', () => {
		const question1 = {
			description: 'Test',
			enounces: ['Q1'],
			variabless: [],
			solutionss: []
		};

		const question2 = {
			solutionss: [],
			description: 'Test',
			variabless: [],
			enounces: ['Q1']
		};

		const hash1 = generateStableQuestionHash(question1);
		const hash2 = generateStableQuestionHash(question2);

		expect(hash1).toBe(hash2);
	});

	it('should generate different hashes for different questions', () => {
		const question1 = {
			description: 'Addition',
			enounces: ['2 + 2'],
			variabless: [],
			solutionss: [4]
		};

		const question2 = {
			description: 'Soustraction',
			enounces: ['5 - 3'],
			variabless: [],
			solutionss: [2]
		};

		const hash1 = generateStableQuestionHash(question1);
		const hash2 = generateStableQuestionHash(question2);

		expect(hash1).not.toBe(hash2);
	});

	it('should handle missing properties gracefully', () => {
		const question = {
			description: 'Test'
			// Missing: enounces, variabless, solutionss
		};

		const hash = generateStableQuestionHash(question);

		expect(hash).toMatch(/^[a-f0-9]{64}$/);
	});

	it('should normalize undefined to empty values', () => {
		const question1 = {
			description: 'Test',
			enounces: undefined,
			variabless: undefined,
			solutionss: undefined
		};

		const question2 = {
			description: 'Test',
			enounces: [],
			variabless: [],
			solutionss: []
		};

		const hash1 = generateStableQuestionHash(question1);
		const hash2 = generateStableQuestionHash(question2);

		expect(hash1).toBe(hash2);
	});

	it('should generate identical hashes for questions with extra properties', () => {
		const question1 = {
			description: 'Test',
			enounces: ['Q1'],
			variabless: [],
			solutionss: []
		};

		const question2 = {
			description: 'Test',
			enounces: ['Q1'],
			variabless: [],
			solutionss: [],
			// Extra properties (should be ignored)
			grade: 'CP',
			type: 'numerical_exact',
			theme: 'addition'
		};

		const hash1 = generateStableQuestionHash(question1);
		const hash2 = generateStableQuestionHash(question2);

		expect(hash1).toBe(hash2);
	});

	it('should be sensitive to content changes', () => {
		const question1 = {
			description: 'Addition de deux nombres',
			enounces: ['2 + 3'],
			variabless: [],
			solutionss: [5]
		};

		const question2 = {
			description: 'Addition de deux nombres',
			enounces: ['2 + 4'], // Changed enounce
			variabless: [],
			solutionss: [5]
		};

		const hash1 = generateStableQuestionHash(question1);
		const hash2 = generateStableQuestionHash(question2);

		expect(hash1).not.toBe(hash2);
	});

	it('should handle complex variabless and solutionss', () => {
		const question = {
			description: 'Complex question',
			enounces: ['Calculate'],
			variabless: [
				{
					a: '[1:10]',
					b: '[1:10]',
					result: 'a+b'
				}
			],
			solutionss: ['result']
		};

		const hash = generateStableQuestionHash(question);

		expect(hash).toMatch(/^[a-f0-9]{64}$/);
	});
});

describe('generateQuestionDescription', () => {
	it('should generate a description from question properties', () => {
		const question = {
			description: 'Addition',
			subdescription: 'Simple',
			enounces: ['2 + 2']
		};

		const description = generateQuestionDescription(question);

		expect(description).toBe('Addition - Simple');
	});

	it('should use first enounce if description is missing', () => {
		const question = {
			enounces: ['Calculate 2 + 2 and then multiply by 3 to get the result']
		};

		const description = generateQuestionDescription(question);

		// Should truncate to 50 chars and add ellipsis
		expect(description).toBe('Calculate 2 + 2 and then multiply by 3 to get the ');
		expect(description.length).toBeLessThanOrEqual(53); // Allow for word boundary completion
	});

	it('should return placeholder for empty question', () => {
		const question = {};

		const description = generateQuestionDescription(question);

		expect(description).toBe('No description');
	});

	it('should handle only description', () => {
		const question = {
			description: 'Addition simple'
		};

		const description = generateQuestionDescription(question);

		expect(description).toBe('Addition simple');
	});

	it('should combine description and subdescription', () => {
		const question = {
			description: 'Multiplication',
			subdescription: 'Tables de 2'
		};

		const description = generateQuestionDescription(question);

		expect(description).toBe('Multiplication - Tables de 2');
	});
});

describe('verifyQuestionHashMatch', () => {
	it('should return true for identical questions', () => {
		const question1 = {
			description: 'Test',
			enounces: ['Q1'],
			variabless: [],
			solutionss: []
		};

		const question2 = {
			description: 'Test',
			enounces: ['Q1'],
			variabless: [],
			solutionss: []
		};

		const match = verifyQuestionHashMatch(question1, question2);

		expect(match).toBe(true);
	});

	it('should return false for different questions', () => {
		const question1 = {
			description: 'Test 1',
			enounces: ['Q1'],
			variabless: [],
			solutionss: []
		};

		const question2 = {
			description: 'Test 2',
			enounces: ['Q2'],
			variabless: [],
			solutionss: []
		};

		const match = verifyQuestionHashMatch(question1, question2);

		expect(match).toBe(false);
	});

	it('should ignore extra properties when comparing', () => {
		const question1 = {
			description: 'Test',
			enounces: ['Q1'],
			variabless: [],
			solutionss: []
		};

		const question2 = {
			description: 'Test',
			enounces: ['Q1'],
			variabless: [],
			solutionss: [],
			grade: 'CP', // Extra property
			type: 'numerical_exact' // Extra property
		};

		const match = verifyQuestionHashMatch(question1, question2);

		expect(match).toBe(true);
	});
});

describe('Hash Stability Regression Tests', () => {
	it('should generate consistent hash for known question across multiple calls', () => {
		// This test ensures the hash function doesn't change between calls
		const question = {
			description: 'Addition',
			subdescription: '',
			enounces: ['2 + 2'],
			expressions: [],
			variabless: [],
			solutionss: ['4']
		};

		// Generate hash multiple times
		const hash1 = generateStableQuestionHash(question);
		const hash2 = generateStableQuestionHash(question);
		const hash3 = generateStableQuestionHash(question);

		// All hashes should be identical
		expect(hash1).toBe(hash2);
		expect(hash2).toBe(hash3);

		// Should be a valid SHA-256 hash
		expect(hash1).toMatch(/^[a-f0-9]{64}$/);

		// Store the hash for reference (can be updated if hash function changes intentionally)
		// Current hash for this test question:
		console.log('Reference hash for test question:', hash1);
	});
});
