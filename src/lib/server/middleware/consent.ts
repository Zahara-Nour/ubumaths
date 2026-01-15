/**
 * Consent Middleware
 *
 * Server-side enforcement of parental consent requirements.
 * Students without valid consent cannot perform restricted actions.
 *
 * RGPD Article 8: Minors under 15 require parental consent in France.
 */

import { error } from '@sveltejs/kit';
import { hasValidConsent, type ConsentProfile } from '$lib/utils/consent';

/**
 * Actions restricted for students without consent.
 * These actions require full access (consent granted or in grace period).
 */
export type RestrictedAction =
	| 'submit_exercise'
	| 'send_message'
	| 'receive_message'
	| 'earn_rewards'
	| 'play_games'
	| 'purchase_items';

/**
 * French error messages for restricted actions
 */
const ACTION_MESSAGES: Record<RestrictedAction, string> = {
	submit_exercise: 'soumettre des réponses',
	send_message: 'envoyer des messages',
	receive_message: 'recevoir des messages',
	earn_rewards: 'gagner des récompenses',
	play_games: 'jouer aux jeux',
	purchase_items: 'acheter dans la boutique'
};

/**
 * Check if student can perform a restricted action.
 *
 * Returns true if:
 * - User is not a student (teachers/admins can do anything)
 * - Student has valid consent (granted or in grace period)
 *
 * @param profile - The user profile with consent fields
 * @param _action - The action being attempted (for logging/future use)
 * @returns true if user can perform the action
 *
 * @example
 * canPerformAction(teacherProfile, 'submit_exercise')  // true
 * canPerformAction(studentWithConsent, 'send_message') // true
 * canPerformAction(studentNoConsent, 'play_games')     // false
 */
export function canPerformAction(profile: ConsentProfile, _action: RestrictedAction): boolean {
	return hasValidConsent(profile);
}

/**
 * Require consent for a restricted action.
 * Throws 403 error if student lacks valid consent.
 *
 * Use this in API endpoints that require parental consent.
 *
 * @param profile - The user profile with consent fields
 * @param action - The action being attempted
 * @throws 403 Forbidden if student lacks consent
 *
 * @example
 * export const POST: RequestHandler = async ({ locals }) => {
 *   const { profile } = await requireAuth(locals);
 *   requireConsent(profile, 'submit_exercise');
 *   // ... rest of handler
 * };
 */
export function requireConsent(profile: ConsentProfile, action: RestrictedAction): void {
	if (!canPerformAction(profile, action)) {
		const actionMessage = ACTION_MESSAGES[action];
		throw error(403, {
			message: `Consentement parental requis pour ${actionMessage}. Contactez votre enseignant.`
		});
	}
}

/**
 * Type guard to check if a profile has all consent fields.
 * Use to narrow unknown profiles to ConsentProfile type safely.
 */
export function hasConsentFields(profile: unknown): profile is ConsentProfile {
	return (
		typeof profile === 'object' &&
		profile !== null &&
		'role' in profile &&
		'consent_required' in profile &&
		'consent_granted_at' in profile &&
		'consent_grace_period_ends' in profile &&
		typeof (profile as ConsentProfile).role === 'string' &&
		typeof (profile as ConsentProfile).consent_required === 'boolean'
	);
}
