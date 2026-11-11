/**
 * Client-Side Error Monitoring Utility
 *
 * Captures and reports JavaScript errors, unhandled promise rejections,
 * and performance issues from the browser.
 *
 * Features:
 * - Global error handlers
 * - Rate limiting (max 10 errors/minute)
 * - Error deduplication
 * - Batch sending (every 10 seconds or 5 errors, whichever first)
 * - Browser context collection
 * - Privacy-aware (no sensitive data)
 */

import { browser } from '$app/environment';
import {
	firstHiddenTime,
	isPaintAfterHidden,
	type VisibilityEntry
} from '$lib/utils/web-vitals-visibilite';
import { createInpTracker, type InteractionEntry } from '$lib/utils/inp-tracker';

// =====================================================
// TYPES
// =====================================================

export type ErrorType = 'client_js' | 'server_api' | 'validation' | 'performance';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ClientErrorData {
	error_type: ErrorType;
	severity: ErrorSeverity;
	message: string;
	url: string;
	stack_trace?: string;
	error_name?: string;
	file_path?: string;
	line_number?: number;
	column_number?: number;
	user_agent?: string;
	browser_name?: string;
	browser_version?: string;
	os_name?: string;
	device_type?: 'mobile' | 'tablet' | 'desktop';
	viewport_width?: number;
	viewport_height?: number;
	context?: Record<string, unknown>;
	tags?: string[];
}

interface ErrorQueueItem {
	data: ClientErrorData;
	timestamp: number;
	hash: string;
}

// =====================================================
// CONFIGURATION
// =====================================================

const CONFIG = {
	MAX_ERRORS_PER_MINUTE: 10,
	BATCH_SIZE: 5,
	BATCH_TIMEOUT: 10000, // 10 seconds
	API_ENDPOINT: '/api/errors/log',
	ENABLED: browser // Only enable in browser
};

// =====================================================
// STATE
// =====================================================

let errorQueue: ErrorQueueItem[] = [];
const errorCounts: Map<number, number> = new Map(); // timestamp => count
const sentHashes: Set<string> = new Set(); // Recently sent error hashes
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let isInitialized = false;

// =====================================================
// BROWSER DETECTION
// =====================================================

/**
 * Parse user agent to extract browser/OS info
 */
function parseBrowserInfo(userAgent: string): {
	browser_name: string;
	browser_version: string;
	os_name: string;
	device_type: 'mobile' | 'tablet' | 'desktop';
} {
	const ua = userAgent.toLowerCase();

	// Browser detection
	let browser_name = 'Unknown';
	let browser_version = 'Unknown';

	if (ua.includes('firefox/')) {
		browser_name = 'Firefox';
		const match = ua.match(/firefox\/(\d+\.\d+)/);
		browser_version = match ? match[1] : 'Unknown';
	} else if (ua.includes('edg/')) {
		browser_name = 'Edge';
		const match = ua.match(/edg\/(\d+\.\d+)/);
		browser_version = match ? match[1] : 'Unknown';
	} else if (ua.includes('chrome/')) {
		browser_name = 'Chrome';
		const match = ua.match(/chrome\/(\d+\.\d+)/);
		browser_version = match ? match[1] : 'Unknown';
	} else if (ua.includes('safari/')) {
		browser_name = 'Safari';
		const match = ua.match(/version\/(\d+\.\d+)/);
		browser_version = match ? match[1] : 'Unknown';
	}

	// OS detection
	let os_name = 'Unknown';
	if (ua.includes('win')) {
		os_name = 'Windows';
	} else if (ua.includes('mac')) {
		os_name = 'macOS';
	} else if (ua.includes('linux')) {
		os_name = 'Linux';
	} else if (ua.includes('android')) {
		os_name = 'Android';
	} else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
		os_name = 'iOS';
	}

	// Device type detection
	let device_type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
	if (ua.includes('mobile')) {
		device_type = 'mobile';
	} else if (ua.includes('tablet') || ua.includes('ipad')) {
		device_type = 'tablet';
	}

	return { browser_name, browser_version, os_name, device_type };
}

/**
 * Get browser context
 */
function getBrowserContext(): Partial<ClientErrorData> {
	if (!browser) return {};

	const userAgent = navigator.userAgent;
	const browserInfo = parseBrowserInfo(userAgent);

	return {
		user_agent: userAgent,
		...browserInfo,
		viewport_width: window.innerWidth,
		viewport_height: window.innerHeight
	};
}

// =====================================================
// RATE LIMITING
// =====================================================

/**
 * Check if we're within rate limit
 */
function isWithinRateLimit(): boolean {
	const now = Date.now();
	const oneMinuteAgo = now - 60000;

	// Clean up old entries
	for (const [timestamp] of errorCounts) {
		if (timestamp < oneMinuteAgo) {
			errorCounts.delete(timestamp);
		}
	}

	// Count errors in last minute
	let totalErrors = 0;
	for (const count of errorCounts.values()) {
		totalErrors += count;
	}

	return totalErrors < CONFIG.MAX_ERRORS_PER_MINUTE;
}

/**
 * Increment error count for current minute
 */
function incrementErrorCount(): void {
	const now = Date.now();
	const minuteTimestamp = Math.floor(now / 60000) * 60000; // Round to minute

	const currentCount = errorCounts.get(minuteTimestamp) || 0;
	errorCounts.set(minuteTimestamp, currentCount + 1);
}

// =====================================================
// DEDUPLICATION
// =====================================================

/**
 * Identité d'une erreur pour écarter les doublons (5 minutes) : la clé
 * COMPLÈTE, telle quelle.
 *
 * Avant : `btoa(clé).substring(0, 32)`. `btoa` lève une exception sur tout
 * caractère hors Latin-1 (`’`, `—`, `…`, `œ`, fréquents dans nos messages) :
 * l'erreur n'était jamais envoyée. Et 32 caractères de base64 ne gardent que
 * les 24 premiers de la clé : une erreur commençant comme une erreur déjà
 * envoyée passait pour un doublon.
 */
function generateErrorHash(error: ClientErrorData): string {
	return `${error.error_type}:${error.message}:${error.file_path || ''}:${error.line_number || ''}`;
}

/**
 * Check if error was recently sent
 */
function isDuplicate(hash: string): boolean {
	return sentHashes.has(hash);
}

/**
 * Mark error as sent
 */
function markAsSent(hash: string): void {
	sentHashes.add(hash);

	// Clean up old hashes after 5 minutes
	setTimeout(() => {
		sentHashes.delete(hash);
	}, 300000);
}

// =====================================================
// BATCH SENDING
// =====================================================

/**
 * Send error batch to server
 */
async function sendErrorBatch(): Promise<void> {
	if (errorQueue.length === 0) return;

	// Get errors to send
	const errorsToSend = [...errorQueue];
	errorQueue = [];

	// Clear batch timer
	if (batchTimer) {
		clearTimeout(batchTimer);
		batchTimer = null;
	}

	try {
		// Send each error to API
		await Promise.allSettled(
			errorsToSend.map(async (item) => {
				try {
					const response = await fetch(CONFIG.API_ENDPOINT, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(item.data)
					});

					if (response.ok) {
						markAsSent(item.hash);
					}
				} catch (error) {
					console.error('Failed to send error to monitoring API:', error);
					// Re-queue on network failure
					if (!isDuplicate(item.hash)) {
						errorQueue.push(item);
					}
				}
			})
		);
	} catch (error) {
		console.error('Error in sendErrorBatch:', error);
	}
}

/**
 * Queue error for sending
 *
 * Rend `true` si l'erreur est en file ou déjà envoyée (doublon), `false` si elle
 * est abandonnée (suivi désactivé, limite par minute atteinte).
 */
function queueError(error: ClientErrorData): boolean {
	if (!CONFIG.ENABLED) return false;

	// Check rate limit
	if (!isWithinRateLimit()) {
		console.warn('[Error Monitoring] Rate limit exceeded, skipping error');
		return false;
	}

	const hash = generateErrorHash(error);

	// Check for duplicates
	if (isDuplicate(hash)) {
		console.debug('[Error Monitoring] Duplicate error, skipping');
		return true;
	}

	// Add to queue
	errorQueue.push({
		data: error,
		timestamp: Date.now(),
		hash
	});

	incrementErrorCount();

	// Send immediately if batch size reached
	if (errorQueue.length >= CONFIG.BATCH_SIZE) {
		sendErrorBatch();
	} else {
		// Otherwise schedule batch send
		if (!batchTimer) {
			batchTimer = setTimeout(sendErrorBatch, CONFIG.BATCH_TIMEOUT);
		}
	}
	return true;
}

// =====================================================
// ERROR HANDLERS
// =====================================================

/**
 * Handle window.onerror events
 */
function handleWindowError(
	message: Event | string,
	source?: string,
	lineno?: number,
	colno?: number,
	error?: Error
): boolean {
	try {
		const errorMessage = typeof message === 'string' ? message : error?.message || 'Unknown error';

		const errorData: ClientErrorData = {
			error_type: 'client_js',
			severity: 'error',
			message: errorMessage,
			url: window.location.href,
			stack_trace: error?.stack,
			error_name: error?.name,
			file_path: source,
			line_number: lineno,
			column_number: colno,
			...getBrowserContext()
		};

		queueError(errorData);
	} catch (err) {
		console.error('[Error Monitoring] Failed to handle window error:', err);
	}

	// Return false to allow default error handling
	return false;
}

/**
 * Handle unhandled promise rejections
 */
function handleUnhandledRejection(event: PromiseRejectionEvent): void {
	try {
		const error = event.reason;
		const message = error instanceof Error ? error.message : String(error);

		const errorData: ClientErrorData = {
			error_type: 'client_js',
			severity: 'error',
			message: `Unhandled Promise Rejection: ${message}`,
			url: window.location.href,
			stack_trace: error instanceof Error ? error.stack : undefined,
			error_name: error instanceof Error ? error.name : 'UnhandledRejection',
			...getBrowserContext(),
			tags: ['unhandled_rejection']
		};

		queueError(errorData);
	} catch (err) {
		console.error('[Error Monitoring] Failed to handle unhandled rejection:', err);
	}
}

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Initialize error monitoring
 * Call this once in hooks.client.ts
 */
export function initErrorMonitoring(): void {
	if (!CONFIG.ENABLED || isInitialized) return;

	console.log('[Error Monitoring] Initializing client-side error capture');

	// Set up global error handlers
	window.addEventListener('error', (event) => {
		handleWindowError(event.message, event.filename, event.lineno, event.colno, event.error);
	});

	window.addEventListener('unhandledrejection', handleUnhandledRejection);

	// Send any queued errors on page unload
	window.addEventListener('beforeunload', () => {
		if (errorQueue.length > 0) {
			sendErrorBatch();
		}
	});

	isInitialized = true;
}

/**
 * Manually capture an error
 * Use this for try-catch blocks or custom error tracking
 */
export function captureError(
	error: Error | string,
	options?: {
		severity?: ErrorSeverity;
		context?: Record<string, unknown>;
		tags?: string[];
	}
): void {
	if (!CONFIG.ENABLED) return;

	try {
		const message = error instanceof Error ? error.message : String(error);
		const stack = error instanceof Error ? error.stack : undefined;
		const name = error instanceof Error ? error.name : undefined;

		const errorData: ClientErrorData = {
			error_type: 'client_js',
			severity: options?.severity || 'error',
			message,
			url: window.location.href,
			stack_trace: stack,
			error_name: name,
			...getBrowserContext(),
			context: options?.context,
			tags: options?.tags
		};

		queueError(errorData);
	} catch (err) {
		console.error('[Error Monitoring] Failed to capture error:', err);
	}
}

/**
 * Capture validation errors
 */
export function captureValidationError(
	fieldName: string,
	errorMessage: string,
	formData?: Record<string, unknown>
): void {
	if (!CONFIG.ENABLED) return;

	try {
		const errorData: ClientErrorData = {
			error_type: 'validation',
			severity: 'info',
			message: `Validation error on field "${fieldName}": ${errorMessage}`,
			url: window.location.href,
			...getBrowserContext(),
			context: {
				field: fieldName,
				form_data: formData // Will be sanitized server-side
			},
			tags: ['validation', fieldName]
		};

		queueError(errorData);
	} catch (err) {
		console.error('[Error Monitoring] Failed to capture validation error:', err);
	}
}

/**
 * Capture performance issues
 */
export function capturePerformance(
	metric: string,
	value: number,
	threshold: number,
	context?: Record<string, unknown>
): void {
	if (!CONFIG.ENABLED) return;

	// Only report if value exceeds threshold
	if (value <= threshold) return;

	try {
		const errorData: ClientErrorData = {
			error_type: 'performance',
			severity: value > threshold * 2 ? 'error' : 'warning',
			message: `Performance issue: ${metric} = ${value}ms (threshold: ${threshold}ms)`,
			url: window.location.href,
			...getBrowserContext(),
			context: {
				metric,
				value,
				threshold,
				...context
			},
			tags: ['performance', metric]
		};

		queueError(errorData);
	} catch (err) {
		console.error('[Error Monitoring] Failed to capture performance metric:', err);
	}
}

/**
 * Flush all queued errors immediately
 * Useful before page navigation
 */
export function flushErrors(): Promise<void> {
	if (!CONFIG.ENABLED) return Promise.resolve();
	return sendErrorBatch();
}

// =====================================================
// WEB VITALS COLLECTION
// =====================================================

/**
 * Web Vitals thresholds (based on Google's recommendations)
 * @see https://web.dev/vitals/
 */
const WEB_VITALS_THRESHOLDS = {
	LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint (ms)
	FID: { good: 100, needsImprovement: 300 }, // First Input Delay (ms)
	CLS: { good: 0.1, needsImprovement: 0.25 }, // Cumulative Layout Shift (score)
	FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint (ms)
	TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte (ms)
	INP: { good: 200, needsImprovement: 500 } // Interaction to Next Paint (ms)
};

type WebVitalMetric = keyof typeof WEB_VITALS_THRESHOLDS;

// Module-level state for Web Vitals
let webVitalsInitialized = false;
const webVitalsObservers: PerformanceObserver[] = [];

/**
 * Sanitize URL by removing sensitive query parameters
 */
function sanitizeUrl(url: string): string {
	try {
		const urlObj = new URL(url);
		const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth', 'session', 'code'];

		sensitiveParams.forEach((param) => {
			if (urlObj.searchParams.has(param)) {
				urlObj.searchParams.set(param, '[REDACTED]');
			}
		});

		return urlObj.toString();
	} catch {
		// If URL parsing fails, return pathname only
		return window.location.pathname;
	}
}

/**
 * Get severity based on Web Vital value
 */
function getWebVitalSeverity(metric: WebVitalMetric, value: number): 'info' | 'warning' | 'error' {
	const threshold = WEB_VITALS_THRESHOLDS[metric];
	if (value <= threshold.good) return 'info';
	if (value <= threshold.needsImprovement) return 'warning';
	return 'error';
}

/**
 * Report a Web Vital metric
 *
 * Rend `true` si la mesure est partie (en file), `false` sinon (sous le seuil,
 * ou abandonnée par `queueError`).
 */
function reportWebVital(
	metric: WebVitalMetric,
	value: number,
	context?: Record<string, unknown>,
	url: string = window.location.href
): boolean {
	const severity = getWebVitalSeverity(metric, value);
	const threshold = WEB_VITALS_THRESHOLDS[metric];

	// Only report metrics that need improvement or are poor
	// Good metrics are not worth logging to reduce noise
	if (severity === 'info') return false;

	const errorData: ClientErrorData = {
		error_type: 'performance',
		severity,
		message: `Web Vital ${metric}: ${metric === 'CLS' ? value.toFixed(3) : Math.round(value)}${metric === 'CLS' ? '' : 'ms'} (threshold: ${threshold.good}${metric === 'CLS' ? '' : 'ms'})`,
		url: sanitizeUrl(url),
		...getBrowserContext(),
		context: {
			metric,
			value: metric === 'CLS' ? parseFloat(value.toFixed(3)) : Math.round(value),
			threshold_good: threshold.good,
			threshold_needs_improvement: threshold.needsImprovement,
			...context
		},
		tags: ['web_vitals', metric.toLowerCase()]
	};

	return queueError(errorData);
}

/** Nombre d'interactions de la visite, quand le navigateur le donne (Chrome) */
function readInteractionCount(): number | undefined {
	const count = (performance as Performance & { interactionCount?: number }).interactionCount;
	return typeof count === 'number' ? count : undefined;
}

/** Premier passage en arrière-plan, lu dans l'historique de visibilité s'il existe */
function readFirstHiddenTime(): number {
	let entries: VisibilityEntry[] | undefined;
	try {
		entries = performance.getEntriesByType('visibility-state');
	} catch {
		entries = undefined; // historique non pris en charge
	}
	return firstHiddenTime(entries, document.visibilityState);
}

/**
 * Initialize Web Vitals collection using PerformanceObserver
 * Captures LCP, FID, CLS, FCP, TTFB, INP metrics
 *
 * @see https://web.dev/vitals/
 */
export function initWebVitals(): void {
	if (!CONFIG.ENABLED || typeof PerformanceObserver === 'undefined') return;
	if (webVitalsInitialized) return; // Prevent duplicate initialization

	// Track CLS across page lifecycle
	let clsValue = 0;
	let clsShiftCount = 0;

	// INP de la visite : interactions seules, adresse de la page où chacune a commencé
	const inpTracker = createInpTracker();
	let removeInpListeners = () => {};

	// Dernières valeurs envoyées : INP et CLS partent à chaque passage en arrière-plan,
	// mais une valeur déjà envoyée ne repart pas (un onglet ouvert des jours renvoyait
	// sinon le même INP toutes les 5 minutes d'absence, fin de la fenêtre anti-doublon)
	let reportedCls = 0;
	let reportedInp = 0;

	// Premier passage en arrière-plan : FCP et LCP mesurés après lui sont écartés
	// (onglet ouvert en arrière-plan → « LCP » de plusieurs heures, cf. web-vitals-visibilite.ts)
	let hiddenTime = readFirstHiddenTime();
	document.addEventListener('visibilitychange', (event) => {
		if (document.visibilityState === 'hidden') {
			hiddenTime = Math.min(hiddenTime, event.timeStamp);
		}
	});

	// LCP (Largest Contentful Paint)
	try {
		const lcpObserver = new PerformanceObserver((entryList) => {
			const entries = entryList.getEntries();
			const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
			if (lastEntry && !isPaintAfterHidden(lastEntry.startTime, hiddenTime)) {
				reportWebVital('LCP', lastEntry.startTime);
			}
		});
		lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
		webVitalsObservers.push(lcpObserver);
	} catch {
		// LCP not supported
	}

	// FID (First Input Delay)
	try {
		const fidObserver = new PerformanceObserver((entryList) => {
			const entries = entryList.getEntries();
			const firstEntry = entries[0] as PerformanceEventTiming;
			if (firstEntry) {
				reportWebVital('FID', firstEntry.processingStart - firstEntry.startTime);
			}
		});
		fidObserver.observe({ type: 'first-input', buffered: true });
		webVitalsObservers.push(fidObserver);
	} catch {
		// FID not supported
	}

	// CLS (Cumulative Layout Shift)
	try {
		const clsObserver = new PerformanceObserver((entryList) => {
			for (const entry of entryList.getEntries()) {
				const layoutShift = entry as PerformanceEntry & {
					hadRecentInput: boolean;
					value: number;
				};
				// Only count layout shifts without recent user input
				if (!layoutShift.hadRecentInput) {
					clsValue += layoutShift.value;
					clsShiftCount++;
				}
			}
		});
		clsObserver.observe({ type: 'layout-shift', buffered: true });
		webVitalsObservers.push(clsObserver);
	} catch {
		// CLS not supported
	}

	// FCP (First Contentful Paint)
	try {
		const fcpObserver = new PerformanceObserver((entryList) => {
			const entries = entryList.getEntries();
			const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint');
			if (fcpEntry && !isPaintAfterHidden(fcpEntry.startTime, hiddenTime)) {
				reportWebVital('FCP', fcpEntry.startTime);
			}
		});
		fcpObserver.observe({ type: 'paint', buffered: true });
		webVitalsObservers.push(fcpObserver);
	} catch {
		// FCP not supported
	}

	// TTFB (Time to First Byte) from Navigation Timing
	try {
		const navObserver = new PerformanceObserver((entryList) => {
			const entries = entryList.getEntries();
			const navEntry = entries[0] as PerformanceNavigationTiming;
			if (navEntry && navEntry.responseStart > 0) {
				const ttfb = navEntry.responseStart - navEntry.requestStart;
				reportWebVital('TTFB', ttfb);
			}
		});
		navObserver.observe({ type: 'navigation', buffered: true });
		webVitalsObservers.push(navObserver);
	} catch {
		// Navigation timing not supported
	}

	// INP (Interaction to Next Paint) - aggregated across session
	try {
		const inpObserver = new PerformanceObserver((entryList) => {
			inpTracker.add(entryList.getEntries() as unknown as InteractionEntry[], window.location.href);
		});
		// durationThreshold is a valid option for event entries but not in TS types
		inpObserver.observe({
			type: 'event',
			buffered: true,
			durationThreshold: 16
		} as PerformanceObserverInit);
		webVitalsObservers.push(inpObserver);
		// Début de chaque interaction : l'adresse de la page à cet instant (un clic
		// qui navigue est observé après la navigation)
		const recordStart = (event: Event) =>
			inpTracker.recordStart(event.timeStamp, window.location.href);
		window.addEventListener('pointerdown', recordStart, { capture: true, passive: true });
		window.addEventListener('keydown', recordStart, { capture: true, passive: true });
		removeInpListeners = () => {
			window.removeEventListener('pointerdown', recordStart, { capture: true });
			window.removeEventListener('keydown', recordStart, { capture: true });
		};
	} catch {
		// INP not supported
	}

	// Single consolidated visibilitychange listener for CLS and INP
	// Report on page hide (when user leaves or switches tabs)
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') {
			// Report CLS if it grew since the last report (une mesure abandonnée retente)
			if (
				clsValue > reportedCls &&
				reportWebVital('CLS', clsValue, { shift_count: clsShiftCount })
			) {
				reportedCls = clsValue;
			}

			// Report INP if a slower interaction occurred since the last report
			const inp = inpTracker.current(readInteractionCount());
			if (
				inp &&
				inp.value > reportedInp &&
				reportWebVital('INP', inp.value, { event_name: inp.eventName, target: inp.target }, inp.url)
			) {
				reportedInp = inp.value;
			}

			// Note: We don't reset values - cumulative metrics continue across tab switches
		}
	});

	// Cleanup observers on page unload
	window.addEventListener('beforeunload', () => {
		webVitalsObservers.forEach((observer) => observer.disconnect());
		webVitalsObservers.length = 0;
		removeInpListeners();
		webVitalsInitialized = false;
	});

	webVitalsInitialized = true;
}
