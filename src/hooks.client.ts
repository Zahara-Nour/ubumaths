/**
 * Client-Side Hooks
 *
 * This file runs in the browser and sets up client-side initialization,
 * including error monitoring, Web Vitals collection, and freeze detection.
 */

import { browser } from '$app/environment';
import { initErrorMonitoring, initWebVitals } from '$lib/utils/errorMonitoring';
import { initFreezeDetection } from '$lib/utils/freezeDetection';

// Initialize all client-side monitoring when browser is ready
if (browser) {
	// Error monitoring and Web Vitals
	initErrorMonitoring();
	initWebVitals();

	// Freeze detection (Long Task Observer + Heartbeat)
	initFreezeDetection();

	console.log('[Hooks Client] Error monitoring, Web Vitals, and freeze detection initialized');
}
