/**
 * Pomodoro — side effects (audio + browser notifications)
 *
 * Kept out of the store proper so the store stays pure-data. Consumers
 * (the page) call `unlockAudio()` from a user-gesture handler the first
 * time the user interacts, then `playBell()` / `showPhaseNotification()`
 * from non-gesture contexts (e.g. the auto-transition tick) work
 * reliably across browsers.
 *
 * No audio asset is shipped: the bell is synthesised via the Web Audio
 * API. One sine wave with an exponential decay envelope — small enough
 * to define inline, friendly enough for a study timer.
 */

import type { PomodoroPhase } from './logic';

// =============================================================================
// Audio (Web Audio synth bell)
// =============================================================================

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (audioCtx) return audioCtx;
	// Safari historically only exposed the prefixed constructor; modern
	// versions support both. Use a typed local instead of `any`.
	type AudioContextGlobals = typeof globalThis & {
		AudioContext?: typeof AudioContext;
		webkitAudioContext?: typeof AudioContext;
	};
	const g = globalThis as AudioContextGlobals;
	const Ctor = g.AudioContext ?? g.webkitAudioContext;
	if (!Ctor) return null;
	try {
		audioCtx = new Ctor();
		return audioCtx;
	} catch {
		return null;
	}
}

/**
 * Resume / create the AudioContext from a user-gesture handler so that
 * subsequent calls to `playBell()` from non-gesture contexts work.
 * Idempotent.
 */
export function unlockAudio(): void {
	const ctx = getAudioContext();
	if (!ctx) return;
	if (ctx.state === 'suspended') {
		// `resume()` returns a Promise; we don't await it because the
		// unlock side effect is what matters, not the timing.
		void ctx.resume();
	}
}

/** Synthesise a short bell. Silent if audio is unavailable or locked. */
export function playBell(): void {
	const ctx = getAudioContext();
	if (!ctx) return;
	if (ctx.state === 'suspended') void ctx.resume();

	const now = ctx.currentTime;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();

	osc.type = 'sine';
	osc.frequency.setValueAtTime(880, now); // A5

	// Exponential envelope: instant attack, ~1.2s tail. Start the gain at
	// a tiny non-zero value so `exponentialRampToValueAtTime` is well-defined.
	gain.gain.setValueAtTime(0.0001, now);
	gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

	osc.connect(gain).connect(ctx.destination);
	osc.start(now);
	osc.stop(now + 1.3);
}

// =============================================================================
// Browser notifications
// =============================================================================

const NOTIFICATION_TITLES: Record<PomodoroPhase, string> = {
	work: 'Pomodoro — Travail',
	short_break: 'Pomodoro — Pause courte',
	long_break: 'Pomodoro — Pause longue'
};

const NOTIFICATION_BODIES: Record<PomodoroPhase, string> = {
	work: 'Au travail !',
	short_break: 'Pause courte. Étirez-vous.',
	long_break: 'Pause longue. Reposez-vous bien.'
};

/**
 * Ask the browser for notification permission. Returns true iff granted.
 * Safe to call from any context; resolves false when the API is absent.
 */
export async function requestNotificationPermission(): Promise<boolean> {
	if (typeof Notification === 'undefined') return false;
	try {
		const perm = await Notification.requestPermission();
		return perm === 'granted';
	} catch {
		return false;
	}
}

/**
 * Fire a browser notification for the given phase. No-op if the API is
 * missing or permission isn't granted.
 */
export function showPhaseNotification(phase: PomodoroPhase): void {
	if (typeof Notification === 'undefined') return;
	if (Notification.permission !== 'granted') return;
	try {
		// `tag` causes successive notifications to replace the previous
		// one rather than stacking — desirable for a timer.
		new Notification(NOTIFICATION_TITLES[phase], {
			body: NOTIFICATION_BODIES[phase],
			silent: true,
			tag: 'chiphre-pomodoro'
		});
	} catch {
		// Some browsers (e.g. mobile Chrome) reject `new Notification`
		// outside of a ServiceWorker. Silently degrade.
	}
}
