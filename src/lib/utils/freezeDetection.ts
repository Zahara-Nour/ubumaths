/**
 * Freeze Detection System
 *
 * Detects UI freezes using:
 * 1. Long Task Observer - Detects tasks > 100ms blocking the main thread
 * 2. Heartbeat System - Detects complete unresponsiveness > 15s
 * 3. Activity Tracking - Records user actions for context
 *
 * Configuration:
 * - LONG_TASK_THRESHOLD: 100ms (notable), 500ms (error logging)
 * - FREEZE_PROMPT_THRESHOLD: 15000ms (prompt user)
 * - FREEZE_AUTO_REPORT_THRESHOLD: 30000ms (silent report)
 * - RETENTION: 20 last actions, 15 minutes of freezes
 */

import { browser } from '$app/environment';

// =============================================================================
// Configuration
// =============================================================================

const LONG_TASK_THRESHOLD_MS = 100; // Log as notable
const LONG_TASK_ERROR_THRESHOLD_MS = 500; // Log as error
const HEARTBEAT_INTERVAL_MS = 2000; // Check every 2s
const FREEZE_PROMPT_THRESHOLD_MS = 15000; // 15s - prompt user
const FREEZE_AUTO_REPORT_THRESHOLD_MS = 30000; // 30s - auto report
const MAX_ACTIONS = 20; // Keep last 20 actions
const MAX_FREEZE_EVENTS = 50; // Keep last 50 freeze events
const FREEZE_RETENTION_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_STORAGE_KEY = 'ubumaths_freeze_data';

// =============================================================================
// Types
// =============================================================================

export interface FreezeEvent {
	id: string;
	timestamp: string;
	duration: number;
	type: 'long_task' | 'unresponsive';
	context?: {
		url?: string;
		lastAction?: string;
	};
}

export interface UserAction {
	type: 'click' | 'input' | 'navigation' | 'scroll';
	target: string;
	timestamp: string;
}

export interface WebVitalsData {
	LCP?: number;
	FID?: number;
	CLS?: number;
	FCP?: number;
	TTFB?: number;
	INP?: number;
}

interface FreezeStoreState {
	freezeEvents: FreezeEvent[];
	actions: UserAction[];
	webVitals: WebVitalsData;
	isUnresponsive: boolean;
	lastHeartbeat: number;
}

// =============================================================================
// Callbacks
// =============================================================================

type FreezeCallback = (duration: number, context: FreezeEvent) => void;
type AutoReportCallback = (duration: number, context: FreezeStoreState) => Promise<void>;

let onFreezePrompt: FreezeCallback | null = null;
let onAutoReport: AutoReportCallback | null = null;

/**
 * Set callback for freeze prompt (> 15s)
 */
export function setFreezePromptCallback(callback: FreezeCallback): void {
	onFreezePrompt = callback;
}

/**
 * Set callback for auto report (> 30s)
 */
export function setAutoReportCallback(callback: AutoReportCallback): void {
	onAutoReport = callback;
}

// =============================================================================
// State Management
// =============================================================================

const state: FreezeStoreState = {
	freezeEvents: [],
	actions: [],
	webVitals: {},
	isUnresponsive: false,
	lastHeartbeat: Date.now()
};

// Track page visibility to avoid false positives from backgrounded tabs
let pageWasHiddenDuringHeartbeat = false;

/**
 * Generate unique ID
 */
function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Add freeze event
 */
function addFreezeEvent(event: Omit<FreezeEvent, 'id'>): void {
	const newEvent: FreezeEvent = {
		...event,
		id: generateId()
	};

	state.freezeEvents = [...state.freezeEvents.slice(-(MAX_FREEZE_EVENTS - 1)), newEvent];
	persistState();
}

/**
 * Add user action
 */
function addAction(action: Omit<UserAction, 'timestamp'>): void {
	const newAction: UserAction = {
		...action,
		timestamp: new Date().toISOString()
	};

	state.actions = [...state.actions.slice(-(MAX_ACTIONS - 1)), newAction];
	persistState();
}

/**
 * Get recent freeze events (within retention period)
 */
export function getRecentFreezeEvents(): FreezeEvent[] {
	const cutoff = Date.now() - FREEZE_RETENTION_MS;
	return state.freezeEvents.filter((e) => new Date(e.timestamp).getTime() > cutoff);
}

/**
 * Get recent user actions
 */
export function getRecentActions(): UserAction[] {
	return state.actions;
}

/**
 * Get web vitals
 */
export function getWebVitals(): WebVitalsData {
	return { ...state.webVitals };
}

/**
 * Update web vitals
 */
export function updateWebVitals(vitals: Partial<WebVitalsData>): void {
	state.webVitals = { ...state.webVitals, ...vitals };
	persistState();
}

/**
 * Check if currently unresponsive
 */
export function isUnresponsive(): boolean {
	return state.isUnresponsive;
}

/**
 * Get last action
 */
function getLastAction(): UserAction | undefined {
	return state.actions[state.actions.length - 1];
}

// =============================================================================
// Persistence (sessionStorage)
// =============================================================================

/**
 * Persist state to sessionStorage
 */
function persistState(): void {
	if (!browser) return;

	try {
		const dataToStore = {
			freezeEvents: state.freezeEvents,
			actions: state.actions,
			webVitals: state.webVitals
		};
		sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataToStore));
	} catch {
		// Ignore storage errors
	}
}

/**
 * Restore state from sessionStorage
 */
function restoreState(): void {
	if (!browser) return;

	try {
		const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
		if (stored) {
			const data = JSON.parse(stored);
			state.freezeEvents = data.freezeEvents || [];
			state.actions = data.actions || [];
			state.webVitals = data.webVitals || {};
		}
	} catch {
		// Ignore parse errors
	}
}

// =============================================================================
// Long Task Observer
// =============================================================================

let longTaskObserver: PerformanceObserver | null = null;

/**
 * Initialize Long Task Observer
 * Detects JavaScript tasks that block the main thread for > 50ms
 */
function initLongTaskObserver(): void {
	if (!browser || !('PerformanceObserver' in window)) return;

	try {
		longTaskObserver = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				// PerformanceLongTaskTiming has duration property
				const duration = entry.duration;

				if (duration > LONG_TASK_THRESHOLD_MS) {
					const event: Omit<FreezeEvent, 'id'> = {
						timestamp: new Date().toISOString(),
						duration,
						type: 'long_task',
						context: {
							url: window.location.href,
							lastAction: getLastAction()?.type
						}
					};

					addFreezeEvent(event);

					// Log to error monitoring if very long
					if (duration > LONG_TASK_ERROR_THRESHOLD_MS) {
						// Import dynamically to avoid circular dependencies
						import('./errorMonitoring')
							.then(({ capturePerformance }) => {
								capturePerformance('long_task', duration, LONG_TASK_ERROR_THRESHOLD_MS, {
									url: window.location.href,
									lastAction: getLastAction()?.type
								});
							})
							.catch(() => {
								// Ignore import errors
							});
					}
				}
			}
		});

		// 'longtask' entry type for Long Task API
		longTaskObserver.observe({ entryTypes: ['longtask'] });
	} catch {
		// Long Task API not supported, fail silently
		console.debug('[Freeze Detection] Long Task Observer not supported');
	}
}

// =============================================================================
// Heartbeat System
// =============================================================================

let heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
let expectedHeartbeatTime = 0;

/**
 * Initialize Heartbeat System
 * Detects complete UI freezes by checking if setTimeout is delayed
 */
function initHeartbeat(): void {
	if (!browser) return;

	expectedHeartbeatTime = Date.now() + HEARTBEAT_INTERVAL_MS;

	const checkHeartbeat = (): void => {
		const now = Date.now();
		const drift = now - expectedHeartbeatTime;

		// Skip freeze detection if:
		// 1. Page is currently hidden (browser throttles timers for backgrounded tabs)
		// 2. Page visibility changed during this heartbeat interval
		// 3. Large drift detected while page is/was hidden (computer sleep/wake)
		// All these cases cause false positives due to timer throttling, not real freezes
		const isCurrentlyHidden = document.hidden;
		const shouldSkip = isCurrentlyHidden || pageWasHiddenDuringHeartbeat;

		if (shouldSkip) {
			if (isCurrentlyHidden) {
				console.debug('[Freeze Detection] Skipping check - page is hidden');
			} else if (pageWasHiddenDuringHeartbeat) {
				console.debug('[Freeze Detection] Skipping check - page was hidden during interval');
			}
			pageWasHiddenDuringHeartbeat = false;
			state.isUnresponsive = false;
			state.lastHeartbeat = now;
			expectedHeartbeatTime = now + HEARTBEAT_INTERVAL_MS;
			heartbeatTimeout = setTimeout(checkHeartbeat, HEARTBEAT_INTERVAL_MS);
			return;
		}

		// Check for significant drift (potential freeze detected)
		if (drift > FREEZE_PROMPT_THRESHOLD_MS) {
			// Before prompting user, verify this is a real freeze by checking for
			// corroborating Long Task events. A real JavaScript freeze would be
			// detected by Long Task Observer. If we have large drift but no
			// corresponding long tasks, it's likely computer sleep/wake.
			const recentLongTasks = state.freezeEvents.filter((e) => {
				const eventTime = new Date(e.timestamp).getTime();
				const timeSinceEvent = now - eventTime;
				// Look for long tasks in the last 30 seconds with significant duration
				return e.type === 'long_task' && timeSinceEvent < 30000 && e.duration > 1000;
			});

			if (recentLongTasks.length === 0) {
				// No corroborating long tasks - this is likely sleep/wake, not a real freeze
				console.debug(
					`[Freeze Detection] Large drift (${drift}ms) but no corroborating long tasks - likely sleep/wake, skipping`
				);
				state.lastHeartbeat = now;
				expectedHeartbeatTime = now + HEARTBEAT_INTERVAL_MS;
				heartbeatTimeout = setTimeout(checkHeartbeat, HEARTBEAT_INTERVAL_MS);
				return;
			}

			console.debug(
				`[Freeze Detection] Large drift (${drift}ms) with ${recentLongTasks.length} corroborating long tasks - real freeze detected`
			);
			state.isUnresponsive = true;

			const freezeEvent: Omit<FreezeEvent, 'id'> = {
				timestamp: new Date(expectedHeartbeatTime).toISOString(),
				duration: drift,
				type: 'unresponsive',
				context: {
					url: window.location.href,
					lastAction: getLastAction()?.type
				}
			};

			addFreezeEvent(freezeEvent);

			// Decide action based on duration
			if (drift > FREEZE_AUTO_REPORT_THRESHOLD_MS) {
				// Auto report (> 30s)
				if (onAutoReport) {
					onAutoReport(drift, { ...state }).catch((err) => {
						console.error('[Freeze Detection] Auto report failed:', err);
					});
				}
			} else {
				// Prompt user (> 15s)
				if (onFreezePrompt) {
					onFreezePrompt(drift, { ...freezeEvent, id: generateId() });
				}
			}

			// Log to error monitoring
			import('./errorMonitoring')
				.then(({ captureError }) => {
					captureError(new Error(`UI unresponsive for ${drift}ms`), {
						severity: drift > FREEZE_AUTO_REPORT_THRESHOLD_MS ? 'critical' : 'error',
						context: { drift, url: window.location.href },
						tags: ['freeze', 'unresponsive']
					});
				})
				.catch(() => {
					// Ignore import errors
				});
		} else {
			state.isUnresponsive = false;
		}

		state.lastHeartbeat = now;
		expectedHeartbeatTime = now + HEARTBEAT_INTERVAL_MS;
		heartbeatTimeout = setTimeout(checkHeartbeat, HEARTBEAT_INTERVAL_MS);
	};

	heartbeatTimeout = setTimeout(checkHeartbeat, HEARTBEAT_INTERVAL_MS);
}

// =============================================================================
// Activity Tracking
// =============================================================================

let activityInitialized = false;

/**
 * Get simple CSS selector for an element
 */
function getSimpleSelector(el: HTMLElement): string {
	if (el.id) return `#${el.id}`;
	if (el.className && typeof el.className === 'string') {
		const firstClass = el.className.split(' ')[0];
		if (firstClass) return `.${firstClass}`;
	}
	return el.tagName.toLowerCase();
}

/**
 * Initialize Activity Tracking
 * Records user interactions for debugging context
 */
function initActivityTracking(): void {
	if (!browser || activityInitialized) return;
	activityInitialized = true;

	// Track clicks
	document.addEventListener(
		'click',
		(e) => {
			const target = e.target as HTMLElement;
			if (target) {
				addAction({
					type: 'click',
					target: getSimpleSelector(target)
				});
			}
		},
		{ passive: true, capture: true }
	);

	// Track inputs (debounced)
	let inputTimeout: ReturnType<typeof setTimeout>;
	document.addEventListener(
		'input',
		(e) => {
			clearTimeout(inputTimeout);
			inputTimeout = setTimeout(() => {
				const target = e.target as HTMLElement;
				if (target) {
					addAction({
						type: 'input',
						target: getSimpleSelector(target)
					});
				}
			}, 500);
		},
		{ passive: true, capture: true }
	);

	// Track scroll (debounced)
	let scrollTimeout: ReturnType<typeof setTimeout>;
	let lastScrollTime = 0;
	window.addEventListener(
		'scroll',
		() => {
			const now = Date.now();
			if (now - lastScrollTime > 2000) {
				// Max once per 2s
				clearTimeout(scrollTimeout);
				scrollTimeout = setTimeout(() => {
					addAction({
						type: 'scroll',
						target: 'window'
					});
					lastScrollTime = now;
				}, 500);
			}
		},
		{ passive: true }
	);

	// Track navigation using Navigation API or fallback
	if ('navigation' in window && (window as unknown as { navigation: EventTarget }).navigation) {
		const nav = (window as unknown as { navigation: EventTarget }).navigation;
		nav.addEventListener('navigate', (e: Event) => {
			const navEvent = e as unknown as { destination?: { url?: string } };
			addAction({
				type: 'navigation',
				target: navEvent.destination?.url || window.location.href
			});
		});
	} else {
		// Fallback: track popstate
		window.addEventListener('popstate', () => {
			addAction({
				type: 'navigation',
				target: window.location.href
			});
		});
	}
}

// =============================================================================
// Web Vitals Integration
// =============================================================================

/**
 * Integrate with existing Web Vitals monitoring
 * This is called from errorMonitoring.ts when vitals are reported
 */
export function reportWebVital(name: string, value: number): void {
	const vitalName = name.toUpperCase() as keyof WebVitalsData;
	if (['LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP'].includes(vitalName)) {
		state.webVitals[vitalName] = value;
		persistState();
	}
}

// =============================================================================
// Initialization & Cleanup
// =============================================================================

let initialized = false;

/**
 * Initialize all freeze detection systems
 */
export function initFreezeDetection(): void {
	if (!browser || initialized) return;
	initialized = true;

	// Restore any persisted state
	restoreState();

	// Initialize all systems
	initLongTaskObserver();
	initHeartbeat();
	initActivityTracking();
	initVisibilityTracking();

	// Clean up old freeze events on init
	const cutoff = Date.now() - FREEZE_RETENTION_MS;
	state.freezeEvents = state.freezeEvents.filter((e) => new Date(e.timestamp).getTime() > cutoff);
	persistState();

	console.debug('[Freeze Detection] Initialized');
}

/**
 * Initialize Page Visibility Tracking
 * Prevents false freeze reports when tab is backgrounded
 */
function initVisibilityTracking(): void {
	if (!browser) return;

	document.addEventListener('visibilitychange', () => {
		// When tab is hidden or becomes visible again, mark to skip next heartbeat check
		// This prevents false freeze reports from browser timer throttling
		pageWasHiddenDuringHeartbeat = true;
	});
}

/**
 * Cleanup freeze detection systems
 */
export function cleanupFreezeDetection(): void {
	if (longTaskObserver) {
		longTaskObserver.disconnect();
		longTaskObserver = null;
	}

	if (heartbeatTimeout) {
		clearTimeout(heartbeatTimeout);
		heartbeatTimeout = null;
	}

	initialized = false;
}

/**
 * Get full state for bug report context
 */
export function getFreezeDetectionContext(): {
	freezeEvents: FreezeEvent[];
	recentActions: UserAction[];
	webVitals: WebVitalsData;
} {
	return {
		freezeEvents: getRecentFreezeEvents(),
		recentActions: getRecentActions(),
		webVitals: getWebVitals()
	};
}
