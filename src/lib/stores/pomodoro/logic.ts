/**
 * Pomodoro — pure state machine
 *
 * No reactivity, no DOM, no globals. All functions are pure: same input ->
 * same output. The reactive wrapper lives in `pomodoro.svelte.ts` and the
 * UI consumes only that wrapper.
 *
 * Time is always passed in explicitly as `now` (epoch ms). This keeps the
 * module fully testable and makes the catch-up-after-reload behaviour
 * easy to reason about.
 */

import { z } from 'zod';

// =============================================================================
// Types
// =============================================================================

export type PomodoroPhase = 'work' | 'short_break' | 'long_break';
export type PomodoroStatus = 'ready' | 'running' | 'paused';

export interface PomodoroSettings {
	workMinutes: number;
	shortBreakMinutes: number;
	longBreakMinutes: number;
	pomodorosUntilLongBreak: number;
	soundEnabled: boolean;
	notificationsEnabled: boolean;
}

export interface PomodoroState {
	status: PomodoroStatus;
	phase: PomodoroPhase;
	/** Absolute epoch-ms of phase end. Set iff status === 'running'. */
	endsAt: number | null;
	/** Frozen remaining ms. Set iff status === 'paused'. */
	remainingMs: number | null;
	/** Work pomodoros completed in the current cycle (0..pomodorosUntilLongBreak). */
	workCompletedInCycle: number;
	/** Total work pomodoros completed today (local date). */
	todayCount: number;
	/** ISO local date "YYYY-MM-DD" tracking `todayCount`. */
	todayDate: string;
}

// =============================================================================
// Constants
// =============================================================================

export const STORAGE_VERSION = 1;
export const STORAGE_KEY = 'ubumaths:pomodoro:v1';

const MIN_MS = 60_000;

const LIMITS = {
	workMinutes: { min: 1, max: 90, default: 25 },
	shortBreakMinutes: { min: 1, max: 30, default: 5 },
	longBreakMinutes: { min: 1, max: 60, default: 15 },
	pomodorosUntilLongBreak: { min: 2, max: 8, default: 4 }
} as const;

// =============================================================================
// Defaults
// =============================================================================

export function defaultSettings(): PomodoroSettings {
	return {
		workMinutes: LIMITS.workMinutes.default,
		shortBreakMinutes: LIMITS.shortBreakMinutes.default,
		longBreakMinutes: LIMITS.longBreakMinutes.default,
		pomodorosUntilLongBreak: LIMITS.pomodorosUntilLongBreak.default,
		soundEnabled: true,
		notificationsEnabled: false
	};
}

export function defaultState(now: number): PomodoroState {
	return {
		status: 'ready',
		phase: 'work',
		endsAt: null,
		remainingMs: null,
		workCompletedInCycle: 0,
		todayCount: 0,
		todayDate: localDateString(now)
	};
}

// =============================================================================
// Settings validation
// =============================================================================

function clampInt(raw: unknown, key: keyof typeof LIMITS): number {
	const lim = LIMITS[key];
	const n = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : lim.default;
	return Math.min(lim.max, Math.max(lim.min, n));
}

export function clampSettings(input: Partial<PomodoroSettings>): PomodoroSettings {
	const d = defaultSettings();
	return {
		workMinutes: clampInt(input.workMinutes ?? d.workMinutes, 'workMinutes'),
		shortBreakMinutes: clampInt(
			input.shortBreakMinutes ?? d.shortBreakMinutes,
			'shortBreakMinutes'
		),
		longBreakMinutes: clampInt(input.longBreakMinutes ?? d.longBreakMinutes, 'longBreakMinutes'),
		pomodorosUntilLongBreak: clampInt(
			input.pomodorosUntilLongBreak ?? d.pomodorosUntilLongBreak,
			'pomodorosUntilLongBreak'
		),
		soundEnabled: typeof input.soundEnabled === 'boolean' ? input.soundEnabled : d.soundEnabled,
		notificationsEnabled:
			typeof input.notificationsEnabled === 'boolean'
				? input.notificationsEnabled
				: d.notificationsEnabled
	};
}

// =============================================================================
// Actions
// =============================================================================

export function start(
	state: PomodoroState,
	settings: PomodoroSettings,
	now: number
): PomodoroState {
	if (state.status !== 'ready') return state;
	const ensured = resetTodayIfNewDay(state, now);
	return {
		...ensured,
		status: 'running',
		endsAt: now + getPhaseDurationMs(ensured.phase, settings),
		remainingMs: null
	};
}

export function pause(state: PomodoroState, now: number): PomodoroState {
	if (state.status !== 'running' || state.endsAt === null) return state;
	return {
		...state,
		status: 'paused',
		endsAt: null,
		remainingMs: Math.max(0, state.endsAt - now)
	};
}

export function resume(state: PomodoroState, now: number): PomodoroState {
	if (state.status !== 'paused' || state.remainingMs === null) return state;
	return {
		...state,
		status: 'running',
		endsAt: now + state.remainingMs,
		remainingMs: null
	};
}

export function reset(state: PomodoroState, now: number): PomodoroState {
	return {
		status: 'ready',
		phase: 'work',
		endsAt: null,
		remainingMs: null,
		workCompletedInCycle: 0,
		// Preserve today's stats — reset only resets the *cycle*, not the day.
		todayCount: state.todayDate === localDateString(now) ? state.todayCount : 0,
		todayDate: localDateString(now)
	};
}

/**
 * Skip to the next phase manually. Always leaves the new phase in 'running'
 * status (matches user intent — "I want to move on now and start the next
 * phase"). Returns both the new state and which phase was entered, so the
 * UI can play sound / show notif.
 */
export function skip(
	state: PomodoroState,
	settings: PomodoroSettings,
	now: number
): { state: PomodoroState; transition: PomodoroPhase } {
	return transitionTo(state, settings, now);
}

// =============================================================================
// Tick
// =============================================================================

/**
 * Advance the clock to `now` and emit any phase transitions that should
 * have fired. Capped at 1 transition per call (option B in the design doc):
 * a long sleep / reload jumps straight to a fresh new-phase timer rather
 * than replaying through several phases.
 */
export function tick(
	state: PomodoroState,
	settings: PomodoroSettings,
	now: number
): { state: PomodoroState; transitions: PomodoroPhase[] } {
	if (state.status !== 'running' || state.endsAt === null) return { state, transitions: [] };
	if (now < state.endsAt) return { state, transitions: [] };

	const next = transitionTo(state, settings, now);
	return { state: next.state, transitions: [next.transition] };
}

/**
 * Internal: compute the next phase from a completed phase and start its
 * timer at `now`. Used by both `tick` (auto-transition) and `skip`
 * (manual transition).
 */
function transitionTo(
	state: PomodoroState,
	settings: PomodoroSettings,
	now: number
): { state: PomodoroState; transition: PomodoroPhase } {
	const dayAdjusted = resetTodayIfNewDay(state, now);
	let phase: PomodoroPhase;
	let workCompletedInCycle = dayAdjusted.workCompletedInCycle;
	let todayCount = dayAdjusted.todayCount;

	if (dayAdjusted.phase === 'work') {
		workCompletedInCycle += 1;
		todayCount += 1;
		phase = workCompletedInCycle >= settings.pomodorosUntilLongBreak ? 'long_break' : 'short_break';
	} else if (dayAdjusted.phase === 'short_break') {
		phase = 'work';
	} else {
		// long_break -> work, cycle resets
		phase = 'work';
		workCompletedInCycle = 0;
	}

	return {
		state: {
			...dayAdjusted,
			status: 'running',
			phase,
			endsAt: now + getPhaseDurationMs(phase, settings),
			remainingMs: null,
			workCompletedInCycle,
			todayCount
		},
		transition: phase
	};
}

// =============================================================================
// Today counter
// =============================================================================

export function resetTodayIfNewDay(state: PomodoroState, now: number): PomodoroState {
	const today = localDateString(now);
	if (state.todayDate === today) return state;
	return { ...state, todayCount: 0, todayDate: today };
}

// =============================================================================
// Helpers for display
// =============================================================================

export function getRemainingMs(
	state: PomodoroState,
	settings: PomodoroSettings,
	now: number
): number {
	if (state.status === 'running' && state.endsAt !== null) {
		return Math.max(0, state.endsAt - now);
	}
	if (state.status === 'paused' && state.remainingMs !== null) {
		return Math.max(0, state.remainingMs);
	}
	return getPhaseDurationMs(state.phase, settings);
}

export function getPhaseDurationMs(phase: PomodoroPhase, settings: PomodoroSettings): number {
	switch (phase) {
		case 'work':
			return settings.workMinutes * MIN_MS;
		case 'short_break':
			return settings.shortBreakMinutes * MIN_MS;
		case 'long_break':
			return settings.longBreakMinutes * MIN_MS;
	}
}

// =============================================================================
// Serialization (with Zod validation — localStorage is user-editable)
// =============================================================================

const PhaseSchema = z.enum(['work', 'short_break', 'long_break']);
const StatusSchema = z.enum(['ready', 'running', 'paused']);

const StateSchema = z
	.object({
		status: StatusSchema,
		phase: PhaseSchema,
		endsAt: z.number().int().nullable(),
		remainingMs: z.number().int().min(0).nullable(),
		workCompletedInCycle: z.number().int().min(0).max(100),
		todayCount: z.number().int().min(0).max(1000),
		todayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
	})
	// Cross-field invariants: a crafted localStorage with mismatched
	// status/endsAt/remainingMs would otherwise produce a zombie state that
	// every guard treats as inert.
	.refine((s) => (s.status === 'running') === (s.endsAt !== null), {
		message: 'endsAt must be set iff status is running'
	})
	.refine((s) => (s.status === 'paused') === (s.remainingMs !== null), {
		message: 'remainingMs must be set iff status is paused'
	});

const SettingsSchema = z.object({
	workMinutes: z.number(),
	shortBreakMinutes: z.number(),
	longBreakMinutes: z.number(),
	pomodorosUntilLongBreak: z.number(),
	soundEnabled: z.boolean(),
	notificationsEnabled: z.boolean()
});

const PayloadSchema = z.object({
	version: z.literal(STORAGE_VERSION),
	state: StateSchema,
	settings: SettingsSchema
});

export function serialize(state: PomodoroState, settings: PomodoroSettings): string {
	return JSON.stringify({ version: STORAGE_VERSION, state, settings });
}

export function deserialize(
	raw: string | null,
	_now: number
): { state: PomodoroState; settings: PomodoroSettings } | null {
	if (raw === null) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}
	const result = PayloadSchema.safeParse(parsed);
	if (!result.success) return null;
	return {
		state: result.data.state,
		settings: clampSettings(result.data.settings)
	};
}

// =============================================================================
// Internal utilities
// =============================================================================

function localDateString(epochMs: number): string {
	const d = new Date(epochMs);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}
