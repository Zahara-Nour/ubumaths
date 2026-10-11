/**
 * Parental Consent Utilities
 *
 * RGPD Article 8: Minors under 15 require parental consent in France.
 */

import type { GradeCode } from '$lib/types/grades';

/**
 * Niveaux DISPENSÉS du consentement parental : 1re et terminale.
 *
 * La base fait foi (décision de David, 2026-10-10, constat A3) : tout niveau est soumis
 * SAUF ceux-ci — primaire, collège, 2nde et niveau inconnu compris (la 2nde a en plus la
 * question d'âge). Copie EXACTE de `v_lycee` dans `apply_consent_rule_by_grade` ;
 * `tests/integration/regle-consentement-code-base.test.ts` échoue si elles divergent.
 */
export const GRADES_EXEMPT_FROM_CONSENT = [
	'1_GEN',
	'1_SPE',
	'1_TECHNO',
	'T_GEN',
	'T_SPE',
	'T_EXP',
	'T_COMP',
	'T_TECHNO'
] as const;

/**
 * Check if a grade requires parental consent (same rule as the database).
 * Unknown/null grades require consent (safe default per RGPD).
 *
 * @example
 * requiresParentalConsent('CM2')   // true
 * requiresParentalConsent('6')     // true
 * requiresParentalConsent('2')     // true (plus la question d'âge)
 * requiresParentalConsent('1_GEN') // false
 * requiresParentalConsent(null)    // true (safe default)
 */
export function requiresParentalConsent(grade: GradeCode | string | null | undefined): boolean {
	if (!grade) return true;
	return !(GRADES_EXEMPT_FROM_CONSENT as readonly string[]).includes(grade);
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
 *
 * NOTE: gracePeriodEnds is an ISO string (not Date) because SvelteKit
 * serializes dates when passing from server to client.
 */
export interface ConsentStatus {
	/** Whether this student requires parental consent */
	required: boolean;
	/** Whether consent has been granted */
	granted: boolean;
	/** Whether student is in grace period (full access, consent pending) */
	inGracePeriod: boolean;
	/** When grace period ends as ISO string (null if not in grace period) */
	gracePeriodEnds: string | null;
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
		// Keep as ISO string for SvelteKit serialization
		gracePeriodEnds: profile.consent_grace_period_ends ?? null,
		hasFullAccess: hasValidConsent(profile)
	};
}
