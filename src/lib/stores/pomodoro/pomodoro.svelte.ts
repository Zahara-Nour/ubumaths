/**
 * Pomodoro — reactive singleton
 *
 * Thin Svelte 5 wrapper around `./logic.ts`. Holds the only mutable
 * reference to state + settings, persists every change to localStorage,
 * and ticks the clock while the timer is running.
 *
 * Pure side effects (sound, browser notifications, `<title>` updates,
 * aria-live announcements) live in the page, not here — the store only
 * queues transition events and lets consumers drain them.
 *
 * The store auto-starts its tick loop in the constructor (client-only,
 * gated on `$effect.root` + `state.status === 'running'`), so the timer
 * survives client-side navigation across the SPA.
 */

import { browser } from '$app/environment';
import {
	defaultSettings,
	defaultState,
	clampSettings,
	start,
	pause,
	resume,
	skip,
	reset,
	tick,
	resetTodayIfNewDay,
	serialize,
	deserialize,
	getRemainingMs,
	getPhaseDurationMs,
	STORAGE_KEY,
	type PomodoroSettings,
	type PomodoroState,
	type PomodoroPhase
} from './logic';

const TICK_INTERVAL_MS = 250;

class PomodoroStore {
	// ===========================================================================
	// Reactive state
	// ===========================================================================

	state = $state<PomodoroState>(defaultState(Date.now()));
	settings = $state<PomodoroSettings>(defaultSettings());

	/**
	 * Phase transitions queued by the tick loop or by `skip()`. Consumers
	 * (the page) drain this with `clearPendingTransitions()` after handling.
	 */
	pendingTransitions = $state<PomodoroPhase[]>([]);

	/** True once `hydrate()` has run. UI can gate first paint on this. */
	hydrated = $state(false);

	/**
	 * Bumped every tick so `remainingMs` re-derives without a wider `$effect`.
	 * Private — the UI must read `remainingMs`, not the raw wall-clock value.
	 */
	private nowMs = $state(Date.now());

	// ===========================================================================
	// Derived
	// ===========================================================================

	remainingMs = $derived(getRemainingMs(this.state, this.settings, this.nowMs));
	phaseDurationMs = $derived(getPhaseDurationMs(this.state.phase, this.settings));
	progress = $derived.by(() => {
		const total = this.phaseDurationMs;
		if (total <= 0) return 0;
		const elapsed = total - this.remainingMs;
		return Math.min(1, Math.max(0, elapsed / total));
	});

	// ===========================================================================
	// Construction — hydrate + auto-tick (client only)
	// ===========================================================================

	private tickInterval: ReturnType<typeof setInterval> | null = null;

	constructor() {
		if (!browser) return;

		this.hydrate();

		// $effect.root keeps the inner effect alive for the singleton's
		// lifetime, without needing a parent component scope. The inner
		// effect starts/stops the interval based on running status, so we
		// don't burn cycles while the timer is paused or idle.
		$effect.root(() => {
			$effect(() => {
				if (this.state.status !== 'running') {
					this.stopInterval();
					return;
				}
				// Catch up immediately (covers post-hydrate resume after sleep)
				// before settling into the polling cadence.
				this.tickOnce();
				this.startInterval();
				return () => this.stopInterval();
			});
		});
	}

	// ===========================================================================
	// Public actions
	// ===========================================================================

	/** Smart start: starts from `ready`, resumes from `paused`, no-op when running. */
	play(): void {
		const now = Date.now();
		if (this.state.status === 'ready') {
			this.state = start(this.state, this.settings, now);
		} else if (this.state.status === 'paused') {
			this.state = resume(this.state, now);
		} else {
			return;
		}
		this.nowMs = now;
		this.persist();
	}

	pause(): void {
		if (this.state.status !== 'running') return;
		const now = Date.now();
		this.state = pause(this.state, now);
		this.nowMs = now;
		this.persist();
	}

	skip(): void {
		// The UI disables Skip from `ready` — guard defensively so a stray
		// keybind / hot-reload can't silently inflate `todayCount`.
		if (this.state.status === 'ready') return;
		const now = Date.now();
		const result = skip(this.state, this.settings, now);
		this.state = result.state;
		this.pendingTransitions = [...this.pendingTransitions, result.transition];
		this.nowMs = now;
		this.persist();
	}

	reset(): void {
		const now = Date.now();
		this.state = reset(this.state, now);
		this.nowMs = now;
		this.persist();
	}

	updateSettings(patch: Partial<PomodoroSettings>): void {
		this.settings = clampSettings({ ...this.settings, ...patch });
		this.persist();
	}

	resetSettings(): void {
		this.settings = defaultSettings();
		this.persist();
	}

	clearPendingTransitions(): void {
		if (this.pendingTransitions.length === 0) return;
		this.pendingTransitions = [];
	}

	/**
	 * Read state + settings from localStorage and replace the in-memory
	 * values. Idempotent — safe to call from the constructor or as a
	 * "reload from storage" affordance.
	 */
	hydrate(): void {
		if (this.hydrated) return;
		this.hydrated = true;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			const parsed = deserialize(raw, Date.now());
			if (parsed) {
				this.state = resetTodayIfNewDay(parsed.state, Date.now());
				this.settings = parsed.settings;
			}
		} catch {
			// Quota / disabled storage / private mode — defaults already set.
		}
	}

	// ===========================================================================
	// Internals
	// ===========================================================================

	private startInterval(): void {
		if (this.tickInterval !== null) return;
		this.tickInterval = setInterval(() => this.tickOnce(), TICK_INTERVAL_MS);
	}

	private stopInterval(): void {
		if (this.tickInterval === null) return;
		clearInterval(this.tickInterval);
		this.tickInterval = null;
	}

	private tickOnce(): void {
		const now = Date.now();
		this.nowMs = now;
		if (this.state.status !== 'running') return;
		const result = tick(this.state, this.settings, now);
		if (result.transitions.length > 0) {
			this.state = result.state;
			this.pendingTransitions = [...this.pendingTransitions, ...result.transitions];
			this.persist();
		}
	}

	private persist(): void {
		try {
			localStorage.setItem(STORAGE_KEY, serialize(this.state, this.settings));
		} catch {
			// Silently ignore quota / disabled-storage.
		}
	}
}

export const pomodoroStore = new PomodoroStore();
