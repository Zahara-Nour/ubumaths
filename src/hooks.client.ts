/**
 * Client-Side Hooks
 *
 * This file runs in the browser and sets up client-side initialization,
 * including error monitoring and Web Vitals collection.
 */

import { browser } from '$app/environment';
import { initErrorMonitoring, initWebVitals } from '$lib/utils/errorMonitoring';

// Initialize error monitoring and Web Vitals when browser is ready
if (browser) {
	initErrorMonitoring();
	initWebVitals();
	console.log('[Hooks Client] Error monitoring and Web Vitals initialized');
}
