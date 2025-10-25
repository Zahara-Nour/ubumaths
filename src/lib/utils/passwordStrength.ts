/**
 * Password Strength Utility
 *
 * Provides functions to evaluate password strength and provide user feedback.
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
	};
}

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
		hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
	};

	// Calculate score (0-4)
	let score = 0;

	// Length scoring
	if (password.length >= 8) score++;
	if (password.length >= 12) score++;

	// Character variety scoring
	if (requirements.hasUpperCase && requirements.hasLowerCase) score++;
	if (requirements.hasNumber) score++;
	if (requirements.hasSpecialChar) score++;

	// Cap at 4
	score = Math.min(score, 4);

	// Determine strength category
	let strength: PasswordStrength;
	let feedback: string;
	let color: string;

	if (score === 0) {
		strength = 'weak';
		feedback = 'Too short - use at least 8 characters';
		color = 'text-red-600 dark:text-red-400';
	} else if (score === 1) {
		strength = 'weak';
		feedback = 'Weak - add uppercase, numbers, or special characters';
		color = 'text-red-600 dark:text-red-400';
	} else if (score === 2) {
		strength = 'fair';
		feedback = 'Fair - add more character variety for better security';
		color = 'text-orange-600 dark:text-orange-400';
	} else if (score === 3) {
		strength = 'good';
		feedback = 'Good - consider adding special characters';
		color = 'text-yellow-600 dark:text-yellow-400';
	} else {
		strength = 'strong';
		feedback = 'Strong password!';
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
