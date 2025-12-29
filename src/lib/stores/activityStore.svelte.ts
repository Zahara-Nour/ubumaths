/**
 * Activity Store
 *
 * Svelte 5 reactive store that exposes freeze detection state.
 * This is a thin wrapper around freezeDetection.ts for use in Svelte components.
 */

import { browser } from '$app/environment';
import {
	getRecentFreezeEvents,
	getRecentActions,
	getWebVitals,
	isUnresponsive,
	getFreezeDetectionContext,
	type FreezeEvent,
	type UserAction,
	type WebVitalsData
} from '$lib/utils/freezeDetection';

// =============================================================================
// Reactive State
// =============================================================================

// We use a simple polling approach to keep the store in sync
// since freezeDetection.ts manages its own state

let _freezeEvents = $state<FreezeEvent[]>([]);
let _recentActions = $state<UserAction[]>([]);
let _webVitals = $state<WebVitalsData>({});
let _isUnresponsive = $state(false);

// Update interval (refresh reactive state every 2 seconds)
let updateInterval: ReturnType<typeof setInterval> | null = null;

function updateState(): void {
	_freezeEvents = getRecentFreezeEvents();
	_recentActions = getRecentActions();
	_webVitals = getWebVitals();
	_isUnresponsive = isUnresponsive();
}

/**
 * Start syncing store with freeze detection state
 */
export function startActivitySync(): void {
	if (!browser || updateInterval) return;

	// Initial update
	updateState();

	// Periodic updates
	updateInterval = setInterval(updateState, 2000);
}

/**
 * Stop syncing store
 */
export function stopActivitySync(): void {
	if (updateInterval) {
		clearInterval(updateInterval);
		updateInterval = null;
	}
}

// =============================================================================
// Exported Getters
// =============================================================================

/**
 * Get recent freeze events (reactive)
 */
export function getFreezeEvents(): FreezeEvent[] {
	return _freezeEvents;
}

/**
 * Get recent user actions (reactive)
 */
export function getActions(): UserAction[] {
	return _recentActions;
}

/**
 * Get current web vitals (reactive)
 */
export function getCurrentWebVitals(): WebVitalsData {
	return _webVitals;
}

/**
 * Check if app is currently unresponsive (reactive)
 */
export function getIsUnresponsive(): boolean {
	return _isUnresponsive;
}

/**
 * Get full context for bug report (non-reactive, direct call)
 */
export function getContextForBugReport(): {
	freezeEvents: FreezeEvent[];
	recentActions: UserAction[];
	webVitals: WebVitalsData;
} {
	return getFreezeDetectionContext();
}

// =============================================================================
// Activity Store Object (for convenient import)
// =============================================================================

export const activityStore = {
	get freezeEvents() {
		return _freezeEvents;
	},
	get recentActions() {
		return _recentActions;
	},
	get webVitals() {
		return _webVitals;
	},
	get isUnresponsive() {
		return _isUnresponsive;
	},
	getContext: getContextForBugReport,
	startSync: startActivitySync,
	stopSync: stopActivitySync
};
