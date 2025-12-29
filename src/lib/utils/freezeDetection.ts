/**
 * Freeze Detection System
 *
 * Detects UI freezes using:
 * 1. Long Task Observer - Detects tasks > 100ms blocking the main thread
 * 2. Heartbeat System - Detects complete unresponsiveness > 15s
 * 3. Activity Tracking - Records user actions for context
 *
 * FALSE POSITIVE PREVENTION:
 * The heartbeat system is inherently prone to false positives because timer
 * delays can be caused by many things besides actual JS freezes:
 *
 * 1. Background tab throttling (Chrome "intensive throttling" after 5min)
 * 2. Computer sleep/wake (no visibility event fires)
 * 3. Page Lifecycle API freeze/resume events
 * 4. Chrome Energy Saver mode (throttles when battery <20%)
 * 5. iOS Low Power Mode (throttles rAF to 30fps)
 * 6. Browser extensions blocking execution
 * 7. Garbage collection pauses
 * 8. DevTools profiling
 *
 * To prevent false positives, we:
 * - Check document.hidden directly (not just visibility change events)
 * - Listen to pagehide (more reliable than visibilitychange in some browsers)
 * - Listen to freeze/resume events (Page Lifecycle API)
 * - Track user idle time (> 5min idle + drift = likely throttling)
 * - Require corroborating Long Task events (real freezes have them)
 *
 * Configuration:
 * - LONG_TASK_THRESHOLD: 100ms (notable), 500ms (error logging)
 * - FREEZE_PROMPT_THRESHOLD: 15000ms (prompt user)
 * - FREEZE_AUTO_REPORT_THRESHOLD: 30000ms (silent report)
 * - RETENTION: 20 last actions, 15 minutes of freezes
 *
 * References:
 * - https://developer.chrome.com/blog/timer-throttling-in-chrome-88
 * - https://developer.chrome.com/blog/page-lifecycle-api
 * - https://tech.trivago.com/post/2020-11-17-exploringthepagevisibilityapifordetectin
 * - https://developer.chrome.com/blog/memory-and-energy-saver-mode
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
// Track if page was frozen by browser (Page Lifecycle API)
let pageWasFrozen = false;
// Track last user interaction time to detect idle periods
let lastUserInteractionTime = Date.now();

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
 *
 * RESEARCH FINDINGS - Long Task API limitations:
 *
 * 1. Browser support: Chromium only (Chrome, Edge) - NOT Firefox/Safari
 *    Reference: https://web.dev/articles/custom-metrics
 *
 * 2. The buffered flag is NOT supported for longtask entries
 *    Must initialize in <head> before any other scripts to catch all tasks
 *    Reference: https://w3c.github.io/longtasks/
 *
 * 3. Cross-origin attribution is limited:
 *    - Only 3 iframes get attribution
 *    - After 10 long tasks, attribution becomes "unknown"
 *    Reference: https://github.com/w3c/longtasks
 *
 * 4. 50ms threshold, 1ms granularity
 *    High-resolution timing reduced due to Spectre mitigations
 *
 * Despite limitations, Long Task Observer is critical for distinguishing
 * real freezes from sleep/wake: a real JS freeze would be detected here,
 * while computer sleep would NOT generate any long task events.
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
 *
 * RESEARCH FINDINGS - Why heartbeat detection is problematic:
 *
 * The heartbeat approach (checking setTimeout drift) is fundamentally
 * unreliable because many things can delay timers that are NOT real freezes:
 *
 * 1. Computer sleep/wake (no visibilitychange event, just timer delay)
 *    Reference: https://medium.com/@erlan.zharkeev/how-to-detect-when-a-computer-wakes-up-from-sleep-my-experience-solving-the-problem-with-6639f79e5275
 *
 * 2. Background tab throttling (Chrome intensive throttling = 1 check/min)
 *    Reference: https://developer.chrome.com/blog/timer-throttling-in-chrome-88
 *
 * 3. Energy saver modes (Chrome Energy Saver, iOS Low Power Mode)
 *    Reference: https://developer.chrome.com/blog/memory-and-energy-saver-mode
 *
 * 4. Garbage Collection pauses all JS execution (looks like freeze)
 *    Reference: https://developer.chrome.com/docs/devtools/memory-problems
 *
 * 5. Browser extensions can block execution
 *    Reference: https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/minimize-page-load-time-impact
 *
 * 6. performance.now() behavior varies by platform during sleep:
 *    - Windows: timers delayed during sleep
 *    - Linux: timers fire immediately on wake if due during sleep
 *    - macOS: monotonic clock may drift
 *    Reference: https://github.com/nodejs/node/issues/6763
 *
 * SOLUTION: We use multiple verification layers (see FALSE POSITIVE PREVENTION below)
 */
function initHeartbeat(): void {
	if (!browser) return;

	expectedHeartbeatTime = Date.now() + HEARTBEAT_INTERVAL_MS;

	const checkHeartbeat = (): void => {
		const now = Date.now();
		const drift = now - expectedHeartbeatTime;

		// =================================================================
		// FALSE POSITIVE PREVENTION
		// =================================================================
		// Many things can cause timer drift that are NOT real JS freezes:
		// 1. Page hidden (browser throttles timers for backgrounded tabs)
		// 2. Page visibility changed during interval
		// 3. Page frozen by browser (Page Lifecycle API)
		// 4. Computer sleep/wake (no visibility event fires)
		// 5. Chrome Energy Saver mode (throttles timers when battery <20%)
		// 6. Long idle period (browser may throttle inactive tabs)
		// =================================================================

		const isCurrentlyHidden = document.hidden;
		const timeSinceLastInteraction = now - lastUserInteractionTime;
		const isLongIdle = timeSinceLastInteraction > 5 * 60 * 1000; // 5 minutes

		// Reasons to skip freeze detection
		const skipReasons: string[] = [];
		if (isCurrentlyHidden) skipReasons.push('page is hidden');
		if (pageWasHiddenDuringHeartbeat) skipReasons.push('page was hidden during interval');
		if (pageWasFrozen) skipReasons.push('page was frozen by browser');

		if (skipReasons.length > 0) {
			console.debug(`[Freeze Detection] Skipping check - ${skipReasons.join(', ')}`);
			pageWasHiddenDuringHeartbeat = false;
			pageWasFrozen = false;
			state.isUnresponsive = false;
			state.lastHeartbeat = now;
			expectedHeartbeatTime = now + HEARTBEAT_INTERVAL_MS;
			heartbeatTimeout = setTimeout(checkHeartbeat, HEARTBEAT_INTERVAL_MS);
			return;
		}

		// Additional check: long idle + large drift = likely browser throttling
		if (isLongIdle && drift > 5000) {
			console.debug(
				`[Freeze Detection] Large drift (${drift}ms) during idle period (${Math.round(timeSinceLastInteraction / 1000)}s since last interaction) - likely browser throttling, skipping`
			);
			state.lastHeartbeat = now;
			expectedHeartbeatTime = now + HEARTBEAT_INTERVAL_MS;
			heartbeatTimeout = setTimeout(checkHeartbeat, HEARTBEAT_INTERVAL_MS);
			return;
		}

		// Check for significant drift (potential freeze detected)
		if (drift > FREEZE_PROMPT_THRESHOLD_MS) {
			// =================================================================
			// CORROBORATION CHECK - The key insight from research
			// =================================================================
			// A real JavaScript freeze (blocking the main thread) would be
			// detected by BOTH:
			//   1. Heartbeat system (timer drift)
			//   2. Long Task Observer (PerformanceObserver)
			//
			// However, sleep/wake and browser throttling would ONLY cause:
			//   - Timer drift (heartbeat)
			//   - NO long task events (because JS wasn't running, it was suspended)
			//
			// Therefore: large drift + no long tasks = NOT a real freeze
			//
			// This is the most reliable way to distinguish real freezes from
			// system-level events like sleep/wake.
			// Reference: https://medium.com/@erlan.zharkeev/how-to-detect-when-a-computer-wakes-up-from-sleep-my-experience-solving-the-problem-with-6639f79e5275
			// =================================================================
			const recentLongTasks = state.freezeEvents.filter((e) => {
				const eventTime = new Date(e.timestamp).getTime();
				const timeSinceEvent = now - eventTime;
				// Look for long tasks in the last 30 seconds with significant duration
				// Threshold of 1000ms ensures we're looking for real blocking, not minor hiccups
				return e.type === 'long_task' && timeSinceEvent < 30000 && e.duration > 1000;
			});

			if (recentLongTasks.length === 0) {
				// No corroborating long tasks = almost certainly sleep/wake or throttling
				console.debug(
					`[Freeze Detection] Large drift (${drift}ms) but no corroborating long tasks - likely sleep/wake, skipping`
				);
				state.lastHeartbeat = now;
				expectedHeartbeatTime = now + HEARTBEAT_INTERVAL_MS;
				heartbeatTimeout = setTimeout(checkHeartbeat, HEARTBEAT_INTERVAL_MS);
				return;
			}

			// We have corroborating evidence - this appears to be a real freeze
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
			lastUserInteractionTime = Date.now();
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
			lastUserInteractionTime = Date.now();
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
			lastUserInteractionTime = Date.now();
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

	// Track keyboard activity (for idle detection, not logged as action)
	document.addEventListener(
		'keydown',
		() => {
			lastUserInteractionTime = Date.now();
		},
		{ passive: true, capture: true }
	);

	// Track mouse movement (for idle detection, not logged as action)
	let lastMouseMoveTime = 0;
	document.addEventListener(
		'mousemove',
		() => {
			const now = Date.now();
			// Throttle to once per second to avoid performance impact
			if (now - lastMouseMoveTime > 1000) {
				lastUserInteractionTime = now;
				lastMouseMoveTime = now;
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
 *
 * RESEARCH FINDINGS - Why multiple events are needed:
 *
 * 1. visibilitychange alone is insufficient:
 *    - Doesn't fire for computer sleep/wake (no visibility change occurs)
 *    - Browser inconsistencies: Chrome/Firefox don't fire in all cases that pagehide does
 *    - Screen magnifiers can set hidden=false even when page is fully obscured
 *    Reference: https://tech.trivago.com/post/2020-11-17-exploringthepagevisibilityapifordetectin
 *
 * 2. Browser timer throttling is aggressive:
 *    - Chrome "intensive throttling": after 5min hidden + 30s silent → timers checked 1x/min
 *    - Exemptions: WebSockets, WebRTC, audio playing, Web Workers
 *    Reference: https://developer.chrome.com/blog/timer-throttling-in-chrome-88
 *
 * 3. Page Lifecycle API (freeze/resume):
 *    - Browsers can freeze pages to save resources
 *    - No timer callbacks run during freeze
 *    Reference: https://developer.chrome.com/blog/page-lifecycle-api
 *
 * 4. Energy saver modes cause additional throttling:
 *    - Chrome Energy Saver: reduces refresh to 30fps when battery <20%
 *    - iOS Low Power Mode: throttles rAF to 30fps
 *    Reference: https://developer.chrome.com/blog/memory-and-energy-saver-mode
 */
function initVisibilityTracking(): void {
	if (!browser) return;

	// visibilitychange: Standard visibility API
	// Fires when user switches tabs or minimizes browser
	// Note: Does NOT fire for computer sleep/wake!
	document.addEventListener('visibilitychange', () => {
		pageWasHiddenDuringHeartbeat = true;
	});

	// pagehide: More reliable than visibilitychange in some browsers
	// Research by trivago found this fires in cases where visibilitychange doesn't
	// See: https://tech.trivago.com/post/2020-11-17-exploringthepagevisibilityapifordetectin
	window.addEventListener('pagehide', () => {
		pageWasHiddenDuringHeartbeat = true;
	});

	// Page Lifecycle API: freeze/resume events
	// Chrome can freeze background tabs to save memory/battery
	// During freeze, no JS runs and timers are suspended
	// See: https://developer.chrome.com/blog/page-lifecycle-api
	document.addEventListener('freeze', () => {
		pageWasFrozen = true;
		console.debug('[Freeze Detection] Page frozen by browser');
	});

	document.addEventListener('resume', () => {
		pageWasFrozen = true; // Mark to skip next check after resume
		console.debug('[Freeze Detection] Page resumed from frozen state');
	});

	// blur + hidden: Additional signal for edge cases
	// Note: blur alone doesn't mean throttling (page can be visible but unfocused)
	// Only relevant when combined with hidden state
	// Research: focus/blur != visibility - a page can be visible but not focused
	// See: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
	window.addEventListener('blur', () => {
		if (document.hidden) {
			pageWasHiddenDuringHeartbeat = true;
		}
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
