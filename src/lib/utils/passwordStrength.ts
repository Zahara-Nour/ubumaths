/**
 * Password Strength Utility
 *
 * Provides functions to evaluate password strength and provide user feedback.
 * This is CLIENT-SIDE validation for UX purposes only.
 * Server-side validation in passwordPolicy.ts is the authoritative source.
 */

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordStrengthResult {
	strength: PasswordStrength;
	score: number; // 0-4
	feedback: string;
	color: string; // Tailwind color class
	requirements: {
		minLength: boolean;
		hasUpperCase: boolean;
		hasLowerCase: boolean;
		hasNumber: boolean;
		hasSpecialChar: boolean;
		notCommon: boolean;
		complexityMet: boolean;
	};
}

/**
 * Subset of most common passwords for client-side checking
 * Full list is in server/passwordPolicy.ts
 */
const COMMON_PASSWORDS_CLIENT = new Set([
	'123456',
	'12345678',
	'123456789',
	'password',
	'password1',
	'password123',
	'motdepasse',
	'azerty',
	'azerty123',
	'qwerty',
	'qwerty123',
	'welcome',
	'admin',
	'admin123',
	'bienvenue',
	'bonjour',
	'abc123',
	'letmein',
	'iloveyou',
	'student',
	'teacher',
	'school',
	'voltaire',
	'doha'
]);

/**
 * Calculate password strength based on various criteria
 *
 * @param password - The password to evaluate
 * @returns Detailed password strength analysis
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
	// Initialize requirements check
	const requirements = {
		minLength: password.length >= 8,
		hasUpperCase: /[A-Z]/.test(password),
		hasLowerCase: /[a-z]/.test(password),
		hasNumber: /[0-9]/.test(password),
		hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password),
		notCommon: !COMMON_PASSWORDS_CLIENT.has(password.toLowerCase()),
		complexityMet: false // Will be calculated below
	};

	// Calculate complexity (need at least 3 of 4 character types)
	const characterTypesPresent = [
		requirements.hasUpperCase,
		requirements.hasLowerCase,
		requirements.hasNumber,
		requirements.hasSpecialChar
	].filter(Boolean).length;

	requirements.complexityMet = characterTypesPresent >= 3;

	// Calculate score (0-4)
	let score = 0;

	// Length scoring
	if (password.length >= 8) score++;
	if (password.length >= 12) score++;

	// Character variety scoring
	if (requirements.hasUpperCase && requirements.hasLowerCase) score++;
	if (requirements.hasNumber) score++;
	if (requirements.hasSpecialChar) score++;

	// Penalty for common passwords
	if (!requirements.notCommon) {
		score = Math.max(0, score - 2);
	}

	// Cap at 4
	score = Math.min(score, 4);

	// Determine strength category
	let strength: PasswordStrength;
	let feedback: string;
	let color: string;

	if (!requirements.notCommon) {
		strength = 'weak';
		feedback = 'Mot de passe trop commun - choisissez-en un plus unique';
		color = 'text-red-600 dark:text-red-400';
	} else if (score === 0) {
		strength = 'weak';
		feedback = 'Trop court - utilisez au moins 8 caractères';
		color = 'text-red-600 dark:text-red-400';
	} else if (score === 1) {
		strength = 'weak';
		feedback = 'Faible - ajoutez majuscules, chiffres ou caractères spéciaux';
		color = 'text-red-600 dark:text-red-400';
	} else if (score === 2) {
		strength = 'fair';
		feedback = 'Moyen - ajoutez plus de variété de caractères';
		color = 'text-orange-600 dark:text-orange-400';
	} else if (score === 3) {
		strength = 'good';
		feedback = 'Bon - ajoutez des caractères spéciaux pour plus de sécurité';
		color = 'text-yellow-600 dark:text-yellow-400';
	} else {
		strength = 'strong';
		feedback = 'Mot de passe fort !';
		color = 'text-green-600 dark:text-green-400';
	}

	return {
		strength,
		score,
		feedback,
		color,
		requirements
	};
}

/**
 * Get progress bar width percentage based on score
 *
 * @param score - Password strength score (0-4)
 * @returns Width percentage for progress bar
 */
export function getStrengthBarWidth(score: number): string {
	return `${(score / 4) * 100}%`;
}

/**
 * Get color class for strength bar
 *
 * @param strength - Password strength category
 * @returns Tailwind background color class
 */
export function getStrengthBarColor(strength: PasswordStrength): string {
	switch (strength) {
		case 'weak':
			return 'bg-red-500';
		case 'fair':
			return 'bg-orange-500';
		case 'good':
			return 'bg-yellow-500';
		case 'strong':
			return 'bg-green-500';
	}
}
