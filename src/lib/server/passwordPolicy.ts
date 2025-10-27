/**
 * Password Policy Module
 *
 * Implements modern password security requirements per NIST 800-63B guidelines:
 * - Minimum 8 characters
 * - Maximum 128 characters (DoS prevention)
 * - Complexity requirements (3 of 4 character types)
 * - Common password blocking
 *
 * SECURITY CONTEXT:
 * This is an educational platform handling student PII and grades.
 * Strong password requirements are critical for protecting sensitive data.
 */

/**
 * Password validation result
 */
export interface PasswordValidationResult {
	valid: boolean;
	errors: string[]; // French error messages for user display
	requirements: {
		minLength: boolean;
		maxLength: boolean;
		hasUpperCase: boolean;
		hasLowerCase: boolean;
		hasNumber: boolean;
		hasSpecialChar: boolean;
		notCommon: boolean;
		complexityMet: boolean;
	};
}

/**
 * Top 100 most common passwords from multiple security breach databases
 * (Have I Been Pwned, RockYou, etc.)
 *
 * These passwords are EXTREMELY vulnerable to dictionary attacks
 */
const COMMON_PASSWORDS = new Set([
	// Numeric patterns
	'123456',
	'12345678',
	'123456789',
	'1234567890',
	'12345',
	'1234',
	'111111',
	'000000',
	'123123',
	'654321',
	// Common words
	'password',
	'password1',
	'password123',
	'pass1234',
	'motdepasse',
	'azerty',
	'azerty123',
	'qwerty',
	'qwerty123',
	'qwertyuiop',
	'welcome',
	'welcome1',
	'admin',
	'admin123',
	'administrator',
	'root',
	'guest',
	'user',
	'login',
	// French common passwords
	'bienvenue',
	'bonjour',
	'soleil',
	'marseille',
	'chocolat',
	'jetaime',
	'ordinateur',
	'france',
	'paris',
	// Keyboard patterns
	'abc123',
	'abc123456',
	'abcdef',
	'abcd1234',
	'1q2w3e4r',
	'1qaz2wsx',
	'zxcvbnm',
	'asdfgh',
	'asdfghjkl',
	// Names and dates
	'monkey',
	'dragon',
	'master',
	'superman',
	'batman',
	'trustno1',
	'jordan',
	'michael',
	'jennifer',
	'football',
	'baseball',
	'letmein',
	'iloveyou',
	'princess',
	'starwars',
	// Education-related (relevant to this platform)
	'student',
	'student1',
	'student123',
	'teacher',
	'teacher1',
	'school',
	'school123',
	'education',
	'voltaire',
	'voltaire123',
	'doha',
	'doha123',
	'math',
	'mathematics',
	'ubumaths',
	// Simple variations
	'passw0rd',
	'p@ssword',
	'p@ssw0rd',
	'password!',
	'qwerty1',
	'qwerty!',
	'azerty1',
	'azerty!',
	// Year patterns
	'2024',
	'2023',
	'2022',
	'2021',
	'2020',
	// Repeated characters
	'aaaaaa',
	'aaaa',
	'aaaaaaaa'
]);

/**
 * Validate password against comprehensive security policy
 *
 * REQUIREMENTS:
 * 1. 8-128 characters (NIST 800-63B recommendation)
 * 2. At least 3 of 4 character types:
 *    - Lowercase letters
 *    - Uppercase letters
 *    - Numbers
 *    - Special characters
 * 3. Not in common passwords list
 *
 * @param password - Password to validate
 * @returns Detailed validation result with French error messages
 */
export function validatePasswordPolicy(password: string): PasswordValidationResult {
	const errors: string[] = [];

	// Check requirements
	const requirements = {
		minLength: password.length >= 8,
		maxLength: password.length <= 128,
		hasUpperCase: /[A-Z]/.test(password),
		hasLowerCase: /[a-z]/.test(password),
		hasNumber: /[0-9]/.test(password),
		hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password),
		notCommon: !COMMON_PASSWORDS.has(password.toLowerCase()),
		complexityMet: false // Will be calculated below
	};

	// Validate length
	if (!requirements.minLength) {
		errors.push('Le mot de passe doit contenir au moins 8 caractères');
	}
	if (!requirements.maxLength) {
		errors.push('Le mot de passe ne peut pas dépasser 128 caractères');
	}

	// Calculate complexity (need at least 3 of 4 character types)
	const characterTypesPresent = [
		requirements.hasUpperCase,
		requirements.hasLowerCase,
		requirements.hasNumber,
		requirements.hasSpecialChar
	].filter(Boolean).length;

	requirements.complexityMet = characterTypesPresent >= 3;

	if (!requirements.complexityMet) {
		const missing: string[] = [];
		if (!requirements.hasUpperCase) missing.push('majuscules');
		if (!requirements.hasLowerCase) missing.push('minuscules');
		if (!requirements.hasNumber) missing.push('chiffres');
		if (!requirements.hasSpecialChar) missing.push('caractères spéciaux (!@#$%^&*...)');

		errors.push(
			`Le mot de passe doit contenir au moins 3 types de caractères parmi : lettres majuscules, minuscules, chiffres et caractères spéciaux. Manquant : ${missing.join(', ')}`
		);
	}

	// Check against common passwords
	if (!requirements.notCommon) {
		errors.push(
			'Ce mot de passe est trop commun et facile à deviner. Veuillez en choisir un plus unique'
		);
	}

	return {
		valid: errors.length === 0,
		errors,
		requirements
	};
}

/**
 * Get user-friendly password requirements for display
 *
 * @returns Array of requirement descriptions in French
 */
export function getPasswordRequirements(): string[] {
	return [
		'Au moins 8 caractères',
		'Maximum 128 caractères',
		'Au moins 3 types de caractères parmi : lettres majuscules, minuscules, chiffres et caractères spéciaux',
		'Ne doit pas être un mot de passe courant'
	];
}

/**
 * Calculate password strength score (0-4)
 * Used for client-side feedback
 *
 * @param password - Password to score
 * @returns Score from 0 (very weak) to 4 (very strong)
 */
export function calculatePasswordScore(password: string): number {
	let score = 0;

	// Length scoring
	if (password.length >= 8) score++;
	if (password.length >= 12) score++;

	// Character variety scoring
	if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
	if (/[0-9]/.test(password)) score++;
	if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) score++;

	// Penalty for common passwords
	if (COMMON_PASSWORDS.has(password.toLowerCase())) {
		score = Math.max(0, score - 2);
	}

	return Math.min(score, 4);
}
