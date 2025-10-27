/**
 * Password Policy Tests
 *
 * Comprehensive test suite for password validation logic
 */

import { describe, it, expect } from 'vitest';
import {
	validatePasswordPolicy,
	getPasswordRequirements,
	calculatePasswordScore
} from './passwordPolicy';

describe('validatePasswordPolicy', () => {
	describe('Length Requirements', () => {
		it('should reject passwords shorter than 8 characters', () => {
			const result = validatePasswordPolicy('Short1!');
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Le mot de passe doit contenir au moins 8 caractères');
			expect(result.requirements.minLength).toBe(false);
		});

		it('should accept passwords with 8 characters', () => {
			const result = validatePasswordPolicy('Valid1!@');
			expect(result.requirements.minLength).toBe(true);
		});

		it('should reject passwords longer than 128 characters', () => {
			const longPassword = 'A'.repeat(129) + '1!';
			const result = validatePasswordPolicy(longPassword);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Le mot de passe ne peut pas dépasser 128 caractères');
			expect(result.requirements.maxLength).toBe(false);
		});

		it('should accept passwords with exactly 128 characters', () => {
			// 128 chars: 125 A's + 1 number + 1 special + 1 lowercase
			const password = 'A'.repeat(125) + '1!a';
			const result = validatePasswordPolicy(password);
			expect(result.requirements.maxLength).toBe(true);
		});
	});

	describe('Complexity Requirements', () => {
		it('should accept password with 3 character types (upper, lower, number)', () => {
			const result = validatePasswordPolicy('Password123');
			expect(result.requirements.hasUpperCase).toBe(true);
			expect(result.requirements.hasLowerCase).toBe(true);
			expect(result.requirements.hasNumber).toBe(true);
			expect(result.requirements.complexityMet).toBe(true);
		});

		it('should accept password with 3 character types (upper, lower, special)', () => {
			const result = validatePasswordPolicy('Password!!!');
			expect(result.requirements.hasUpperCase).toBe(true);
			expect(result.requirements.hasLowerCase).toBe(true);
			expect(result.requirements.hasSpecialChar).toBe(true);
			expect(result.requirements.complexityMet).toBe(true);
		});

		it('should accept password with 3 character types (lower, number, special)', () => {
			const result = validatePasswordPolicy('password123!');
			expect(result.requirements.hasLowerCase).toBe(true);
			expect(result.requirements.hasNumber).toBe(true);
			expect(result.requirements.hasSpecialChar).toBe(true);
			expect(result.requirements.complexityMet).toBe(true);
		});

		it('should accept password with all 4 character types', () => {
			const result = validatePasswordPolicy('Password123!');
			expect(result.requirements.hasUpperCase).toBe(true);
			expect(result.requirements.hasLowerCase).toBe(true);
			expect(result.requirements.hasNumber).toBe(true);
			expect(result.requirements.hasSpecialChar).toBe(true);
			expect(result.requirements.complexityMet).toBe(true);
		});

		it('should reject password with only 2 character types', () => {
			const result = validatePasswordPolicy('password123');
			expect(result.valid).toBe(false);
			expect(result.requirements.complexityMet).toBe(false);
			expect(result.errors.some((e) => e.includes('au moins 3 types de caractères'))).toBe(true);
		});

		it('should reject password with only 1 character type', () => {
			const result = validatePasswordPolicy('passwordonly');
			expect(result.valid).toBe(false);
			expect(result.requirements.complexityMet).toBe(false);
		});

		it('should accept various special characters', () => {
			const specialChars = '!@#$%^&*()_+-=[]{};\':"|,.<>/?~`';
			for (const char of specialChars) {
				const password = `Password1${char}`;
				const result = validatePasswordPolicy(password);
				expect(result.requirements.hasSpecialChar).toBe(true);
			}
		});
	});

	describe('Common Password Detection', () => {
		it('should reject common numeric passwords', () => {
			const commonPasswords = ['123456', '12345678', '123456789', '1234567890', '111111', '000000'];

			for (const password of commonPasswords) {
				const result = validatePasswordPolicy(password);
				expect(result.valid).toBe(false);
				expect(result.requirements.notCommon).toBe(false);
				expect(result.errors.some((e) => e.includes('trop commun'))).toBe(true);
			}
		});

		it('should reject common word passwords', () => {
			const commonPasswords = [
				'password',
				'password1',
				'password123',
				'qwerty',
				'azerty',
				'welcome'
			];

			for (const password of commonPasswords) {
				const result = validatePasswordPolicy(password);
				expect(result.valid).toBe(false);
				expect(result.requirements.notCommon).toBe(false);
			}
		});

		it('should reject French common passwords', () => {
			const frenchPasswords = ['motdepasse', 'bienvenue', 'bonjour', 'azerty123'];

			for (const password of frenchPasswords) {
				const result = validatePasswordPolicy(password);
				expect(result.valid).toBe(false);
				expect(result.requirements.notCommon).toBe(false);
			}
		});

		it('should reject education-related common passwords', () => {
			const eduPasswords = [
				'student',
				'student123',
				'teacher',
				'school',
				'voltaire',
				'voltaire123'
			];

			for (const password of eduPasswords) {
				const result = validatePasswordPolicy(password);
				expect(result.valid).toBe(false);
				expect(result.requirements.notCommon).toBe(false);
			}
		});

		it('should perform case-insensitive common password check', () => {
			const variations = ['PASSWORD', 'Password', 'PaSsWoRd', 'AZERTY', 'AzErTy'];

			for (const password of variations) {
				const result = validatePasswordPolicy(password);
				expect(result.requirements.notCommon).toBe(false);
			}
		});
	});

	describe('Valid Passwords', () => {
		it('should accept strong password with all requirements met', () => {
			const result = validatePasswordPolicy('MyStr0ng!Pass');
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.requirements.minLength).toBe(true);
			expect(result.requirements.maxLength).toBe(true);
			expect(result.requirements.complexityMet).toBe(true);
			expect(result.requirements.notCommon).toBe(true);
		});

		it('should accept passphrase-style passwords', () => {
			const result = validatePasswordPolicy('Correct-Horse-Battery-Staple-123');
			expect(result.valid).toBe(true);
		});

		it('should accept password with minimum requirements (8 chars, 3 types)', () => {
			const result = validatePasswordPolicy('Abcd123!');
			expect(result.valid).toBe(true);
		});

		it('should accept long complex passwords', () => {
			const result = validatePasswordPolicy(
				'ThisIsAVeryLongAndComplexPassword123!WithManyCharacters'
			);
			expect(result.valid).toBe(true);
		});
	});

	describe('Error Messages', () => {
		it('should provide French error messages', () => {
			const result = validatePasswordPolicy('abc');
			expect(result.errors.every((e) => typeof e === 'string')).toBe(true);
			// Check for French content
			expect(result.errors.some((e) => e.includes('caractères'))).toBe(true);
		});

		it('should list all violations when multiple requirements fail', () => {
			const result = validatePasswordPolicy('abc');
			expect(result.errors.length).toBeGreaterThan(1);
		});

		it('should specify missing character types', () => {
			const result = validatePasswordPolicy('abcdefgh');
			expect(result.errors.some((e) => e.includes('Manquant'))).toBe(true);
		});
	});
});

describe('getPasswordRequirements', () => {
	it('should return array of requirements in French', () => {
		const requirements = getPasswordRequirements();
		expect(Array.isArray(requirements)).toBe(true);
		expect(requirements.length).toBe(4);
		expect(requirements.every((r) => typeof r === 'string')).toBe(true);
	});

	it('should include all key requirements', () => {
		const requirements = getPasswordRequirements();
		const text = requirements.join(' ');
		expect(text).toContain('8 caractères');
		expect(text).toContain('128 caractères');
		expect(text).toContain('3 types');
		expect(text).toContain('courant');
	});
});

describe('calculatePasswordScore', () => {
	it('should score weak passwords low', () => {
		expect(calculatePasswordScore('abc')).toBe(0);
		expect(calculatePasswordScore('abcdefgh')).toBeLessThanOrEqual(1);
	});

	it('should score medium passwords moderately', () => {
		// Use a password that's not in the common list but has decent complexity
		const score = calculatePasswordScore('Sunshine99'); // 10 chars, 3 types (upper, lower, number)
		expect(score).toBeGreaterThanOrEqual(2);
		expect(score).toBeLessThanOrEqual(3);
	});

	it('should score strong passwords high', () => {
		const score = calculatePasswordScore('MyStr0ng!Password');
		expect(score).toBeGreaterThanOrEqual(3);
	});

	it('should penalize common passwords', () => {
		const commonScore = calculatePasswordScore('password123');
		const uniqueScore = calculatePasswordScore('MyUnique123!');
		expect(commonScore).toBeLessThan(uniqueScore);
	});

	it('should reward length', () => {
		const short = calculatePasswordScore('Abcd123!');
		const long = calculatePasswordScore('Abcd123!VeryLongPassword');
		expect(long).toBeGreaterThanOrEqual(short);
	});

	it('should cap score at 4', () => {
		const score = calculatePasswordScore('ThisIsAnExtremelyLong!AndComplex123Password@');
		expect(score).toBeLessThanOrEqual(4);
	});
});
