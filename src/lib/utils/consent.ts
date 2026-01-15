/**
 * Parental Consent Utilities
 *
 * RGPD Article 8: Minors under 15 require parental consent in France.
 * Grades 6, 5, 4, 3, 2 correspond to ages 11-15.
 */

import type { GradeCode } from '$lib/types/grades';

/**
 * Grades requiring parental consent (under 15 years in France)
 * - Collège: 6ème (11), 5ème (12), 4ème (13), 3ème (14)
 * - Lycée: 2nde (15) - included as safety margin for edge cases
 */
export const GRADES_REQUIRING_CONSENT = ['6', '5', '4', '3', '2'] as const;

export type GradeRequiringConsent = (typeof GRADES_REQUIRING_CONSENT)[number];

/**
 * Check if a grade requires parental consent.
 * Unknown/null grades require consent (safe default per RGPD).
 *
 * @param grade - The grade code to check
 * @returns true if parental consent is required
 *
 * @example
 * requiresParentalConsent('6')     // true (6ème = 11 years old)
 * requiresParentalConsent('2')     // true (2nde = 15 years old)
 * requiresParentalConsent('1_GEN') // false (1ère = 16 years old)
 * requiresParentalConsent(null)    // true (safe default)
 */
export function requiresParentalConsent(grade: GradeCode | string | null | undefined): boolean {
	// Safe default: unknown grades require consent
	if (!grade) return true;

	return (GRADES_REQUIRING_CONSENT as readonly string[]).includes(grade);
}

/**
 * Profile consent status (minimal fields needed for checking)
 */
export interface ConsentProfile {
	role: 'student' | 'teacher' | 'admin';
	consent_required: boolean;
	consent_granted_at: string | null;
	consent_grace_period_ends: string | null;
}

/**
 * Check if a student has valid consent.
 *
 * Returns true if:
 * - User is not a student (teachers/admins never need consent)
 * - Consent is not required for this student
 * - Consent has been granted (consent_granted_at is set)
 * - Student is within grace period
 *
 * @param profile - The user profile with consent fields
 * @returns true if user has valid consent or doesn't need it
 *
 * @example
 * hasValidConsent({ role: 'teacher', ... })                          // true (teachers exempt)
 * hasValidConsent({ role: 'student', consent_required: false, ... }) // true (not required)
 * hasValidConsent({ role: 'student', consent_granted_at: '...', ...}) // true (granted)
 * hasValidConsent({ role: 'student', consent_grace_period_ends: future, ...}) // true (grace period)
 * hasValidConsent({ role: 'student', consent_required: true, consent_granted_at: null, ...}) // false
 */
export function hasValidConsent(profile: ConsentProfile): boolean {
	// Non-students never need consent
	if (profile.role !== 'student') return true;

	// Consent not required for this student
	if (!profile.consent_required) return true;

	// Consent was granted
	if (profile.consent_granted_at) return true;

	// Within grace period
	if (profile.consent_grace_period_ends) {
		const graceEnd = new Date(profile.consent_grace_period_ends);
		if (graceEnd > new Date()) return true;
	}

	// No valid consent
	return false;
}

/**
 * Check if a student is in grace period (full access but consent pending)
 *
 * @param profile - The user profile with consent fields
 * @returns true if student is in grace period
 */
export function isInGracePeriod(profile: ConsentProfile): boolean {
	if (profile.role !== 'student') return false;
	if (!profile.consent_required) return false;
	if (profile.consent_granted_at) return false;

	if (profile.consent_grace_period_ends) {
		const graceEnd = new Date(profile.consent_grace_period_ends);
		return graceEnd > new Date();
	}

	return false;
}

/**
 * Consent status object for UI display
 */
export interface ConsentStatus {
	/** Whether this student requires parental consent */
	required: boolean;
	/** Whether consent has been granted */
	granted: boolean;
	/** Whether student is in grace period (full access, consent pending) */
	inGracePeriod: boolean;
	/** When grace period ends (null if not in grace period) */
	gracePeriodEnds: Date | null;
	/** Whether student has full access (granted OR in grace period) */
	hasFullAccess: boolean;
}

/**
 * Get consent status object for a profile (useful for UI)
 *
 * @param profile - The user profile with consent fields
 * @returns ConsentStatus object
 */
export function getConsentStatus(profile: ConsentProfile): ConsentStatus {
	const inGracePeriod = isInGracePeriod(profile);

	return {
		required: profile.role === 'student' && profile.consent_required,
		granted: !!profile.consent_granted_at,
		inGracePeriod,
		gracePeriodEnds: profile.consent_grace_period_ends
			? new Date(profile.consent_grace_period_ends)
			: null,
		hasFullAccess: hasValidConsent(profile)
	};
}
