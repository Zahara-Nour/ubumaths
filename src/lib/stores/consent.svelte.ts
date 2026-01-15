/**
 * Consent Store
 *
 * Client-side store for consent status, used to disable UI elements
 * for students without valid consent.
 *
 * This is a client-side check for better UX - the actual enforcement
 * happens server-side via requireConsent() middleware.
 */

import type { ConsentStatus } from '$lib/utils/consent';

/**
 * Default consent status for users who don't need consent
 */
const DEFAULT_CONSENT: ConsentStatus = {
	required: false,
	granted: false,
	inGracePeriod: false,
	gracePeriodEnds: null,
	hasFullAccess: true
};

/**
 * Current consent status (set from layout data)
 */
let consentStatus = $state<ConsentStatus>(DEFAULT_CONSENT);

/**
 * Whether the current user has full access (can perform all actions)
 */
const hasFullAccess = $derived(consentStatus.hasFullAccess);

/**
 * Whether the user is in grace period (full access but warning shown)
 */
const isInGracePeriod = $derived(consentStatus.inGracePeriod);

/**
 * Whether the user requires consent but doesn't have it (read-only mode)
 */
const isReadOnly = $derived(consentStatus.required && !consentStatus.hasFullAccess);

/**
 * Set the consent status from server data
 */
function setConsentStatus(status: ConsentStatus): void {
	consentStatus = status;
}

/**
 * Reset to default (for logout or non-student users)
 */
function resetConsentStatus(): void {
	consentStatus = DEFAULT_CONSENT;
}

/**
 * Get tooltip text for disabled buttons
 */
function getDisabledTooltip(): string {
	if (isReadOnly) {
		return 'Consentement parental requis pour cette action';
	}
	return '';
}

export const consent = {
	get status() {
		return consentStatus;
	},
	get hasFullAccess() {
		return hasFullAccess;
	},
	get isInGracePeriod() {
		return isInGracePeriod;
	},
	get isReadOnly() {
		return isReadOnly;
	},
	set: setConsentStatus,
	reset: resetConsentStatus,
	getDisabledTooltip
};
