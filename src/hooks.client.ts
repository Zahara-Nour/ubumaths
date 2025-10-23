/**
 * Client-Side Hooks
 *
 * This file runs in the browser and sets up client-side initialization,
 * including error monitoring.
 */

import { browser } from '$app/environment';
import { initErrorMonitoring } from '$lib/utils/errorMonitoring';

// Initialize error monitoring when browser is ready
if (browser) {
	initErrorMonitoring();
	console.log('[Hooks Client] Error monitoring initialized');
}
