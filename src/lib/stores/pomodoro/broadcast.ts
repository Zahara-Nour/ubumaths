/**
 * Pomodoro — BroadcastChannel helper
 *
 * Thin wrapper around the BroadcastChannel API for syncing the Pomodoro
 * state between tabs of the same origin. Fails silently (returns null /
 * no-ops) when the API is missing or instantiation throws, so callers
 * don't need to branch on browser support.
 *
 * The fallback when the channel is unavailable is the existing
 * "last writer wins via localStorage" behaviour — perfectly acceptable
 * for v1.5: less responsive but still correct.
 */

import { browser } from '$app/environment';
import type { PomodoroPhase, PomodoroSettings, PomodoroState } from './logic';

const CHANNEL_NAME = 'chiphre:pomodoro:v1';

/**
 * Wire-format message exchanged between tabs. A transition field that's
 * non-null tells receivers "I just fired sound + notif for this phase —
 * you should not duplicate them".
 */
export interface PomodoroBroadcastMessage {
	readonly type: 'sync';
	readonly from: string;
	readonly state: PomodoroState;
	readonly settings: PomodoroSettings;
	readonly transition: PomodoroPhase | null;
}

// =============================================================================
// Tab identity
// =============================================================================

function makeTabId(): string {
	if (browser && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	// Highly unlikely fallback (any modern browser supports randomUUID);
	// kept so SSR/test imports don't crash.
	return `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const TAB_ID = makeTabId();

export function getTabId(): string {
	return TAB_ID;
}

// =============================================================================
// Channel
// =============================================================================

let channel: BroadcastChannel | null = null;
let channelAttempted = false;

function openChannel(): BroadcastChannel | null {
	if (!browser) return null;
	if (channel) return channel;
	if (channelAttempted) return null;
	channelAttempted = true;
	if (typeof BroadcastChannel === 'undefined') return null;
	try {
		channel = new BroadcastChannel(CHANNEL_NAME);
		return channel;
	} catch {
		return null;
	}
}

/**
 * Subscribe to inbound sync messages. The handler is invoked for any
 * message that did NOT originate from this tab. No-op + returns no-op
 * unsubscriber when the channel is unavailable.
 */
export function subscribe(handler: (msg: PomodoroBroadcastMessage) => void): () => void {
	const ch = openChannel();
	if (!ch) return () => {};
	const listener = (e: MessageEvent<PomodoroBroadcastMessage>) => {
		const msg = e.data;
		if (!msg || msg.type !== 'sync') return;
		if (msg.from === TAB_ID) return;
		handler(msg);
	};
	ch.addEventListener('message', listener);
	return () => ch.removeEventListener('message', listener);
}

/**
 * Send a sync message. No-op when the channel is unavailable. Calling
 * code is responsible for passing plain (snapshot) data — reactive
 * proxies must be unwrapped before posting (structured clone otherwise
 * throws).
 */
export function publish(
	state: PomodoroState,
	settings: PomodoroSettings,
	transition: PomodoroPhase | null
): void {
	const ch = openChannel();
	if (!ch) return;
	try {
		ch.postMessage({
			type: 'sync',
			from: TAB_ID,
			state,
			settings,
			transition
		} satisfies PomodoroBroadcastMessage);
	} catch {
		// Closed channel / clone failure — silently degrade to
		// localStorage-only sync on next tick.
	}
}
