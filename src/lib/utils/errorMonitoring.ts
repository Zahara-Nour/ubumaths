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
import { page } from '$app/stores';
import { get } from 'svelte/store';

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
	context?: Record<string, any>;
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
let errorCounts: Map<number, number> = new Map(); // timestamp => count
let sentHashes: Set<string> = new Set(); // Recently sent error hashes
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
 * Generate hash for error deduplication
 */
function generateErrorHash(error: ClientErrorData): string {
	const key = `${error.error_type}:${error.message}:${error.file_path || ''}:${error.line_number || ''}`;
	return btoa(key).substring(0, 32);
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
 */
function queueError(error: ClientErrorData): void {
	if (!CONFIG.ENABLED) return;

	// Check rate limit
	if (!isWithinRateLimit()) {
		console.warn('[Error Monitoring] Rate limit exceeded, skipping error');
		return;
	}

	const hash = generateErrorHash(error);

	// Check for duplicates
	if (isDuplicate(hash)) {
		console.debug('[Error Monitoring] Duplicate error, skipping');
		return;
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
		context?: Record<string, any>;
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
	formData?: Record<string, any>
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
	context?: Record<string, any>
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
