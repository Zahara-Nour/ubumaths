import { describe, it, expect } from 'vitest';
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
	STORAGE_VERSION,
	type PomodoroSettings,
	type PomodoroState
} from './logic';

const T0 = new Date('2026-05-27T10:00:00Z').getTime();
const MIN = 60_000;

function settings(overrides: Partial<PomodoroSettings> = {}): PomodoroSettings {
	return { ...defaultSettings(), ...overrides };
}

describe('defaults', () => {
	it('defaultSettings: 25/5/15, 4 pomodoros, sound on, notifs off', () => {
		const s = defaultSettings();
		expect(s.workMinutes).toBe(25);
		expect(s.shortBreakMinutes).toBe(5);
		expect(s.longBreakMinutes).toBe(15);
		expect(s.pomodorosUntilLongBreak).toBe(4);
		expect(s.soundEnabled).toBe(true);
		expect(s.notificationsEnabled).toBe(false);
	});

	it('defaultState: ready, work phase, counters at 0', () => {
		const s = defaultState(T0);
		expect(s.status).toBe('ready');
		expect(s.phase).toBe('work');
		expect(s.endsAt).toBeNull();
		expect(s.remainingMs).toBeNull();
		expect(s.workCompletedInCycle).toBe(0);
		expect(s.todayCount).toBe(0);
		expect(s.todayDate).toBe('2026-05-27');
	});
});

describe('clampSettings', () => {
	it('clamps below min', () => {
		const c = clampSettings({
			workMinutes: 0,
			shortBreakMinutes: 0,
			longBreakMinutes: 0,
			pomodorosUntilLongBreak: 1
		});
		expect(c.workMinutes).toBe(1);
		expect(c.shortBreakMinutes).toBe(1);
		expect(c.longBreakMinutes).toBe(1);
		expect(c.pomodorosUntilLongBreak).toBe(2);
	});

	it('clamps above max', () => {
		const c = clampSettings({
			workMinutes: 999,
			shortBreakMinutes: 999,
			longBreakMinutes: 999,
			pomodorosUntilLongBreak: 999
		});
		expect(c.workMinutes).toBe(90);
		expect(c.shortBreakMinutes).toBe(30);
		expect(c.longBreakMinutes).toBe(60);
		expect(c.pomodorosUntilLongBreak).toBe(8);
	});

	it('preserves valid values', () => {
		const c = clampSettings({
			workMinutes: 30,
			shortBreakMinutes: 7,
			longBreakMinutes: 20,
			pomodorosUntilLongBreak: 5
		});
		expect(c.workMinutes).toBe(30);
		expect(c.shortBreakMinutes).toBe(7);
		expect(c.longBreakMinutes).toBe(20);
		expect(c.pomodorosUntilLongBreak).toBe(5);
	});

	it('uses defaults for missing fields', () => {
		const c = clampSettings({});
		expect(c).toEqual(defaultSettings());
	});

	it('rounds non-integers down', () => {
		const c = clampSettings({ workMinutes: 25.7 });
		expect(c.workMinutes).toBe(25);
	});

	it('coerces non-finite to default', () => {
		const c = clampSettings({ workMinutes: Number.NaN });
		expect(c.workMinutes).toBe(25);
	});
});

describe('start', () => {
	it('from ready: sets endsAt and status=running', () => {
		const s = start(defaultState(T0), settings(), T0);
		expect(s.status).toBe('running');
		expect(s.phase).toBe('work');
		expect(s.endsAt).toBe(T0 + 25 * MIN);
		expect(s.remainingMs).toBeNull();
	});

	it('from paused: resumes via remainingMs (no-op for start)', () => {
		// start() from a paused state is a no-op — resume() is the right call.
		const paused: PomodoroState = { ...defaultState(T0), status: 'paused', remainingMs: 10 * MIN };
		const s = start(paused, settings(), T0 + 60_000);
		expect(s).toBe(paused);
	});

	it('from running: no-op', () => {
		const running = start(defaultState(T0), settings(), T0);
		const s = start(running, settings(), T0 + 1000);
		expect(s).toBe(running);
	});
});

describe('pause', () => {
	it('freezes remainingMs from endsAt', () => {
		const running = start(defaultState(T0), settings(), T0);
		const paused = pause(running, T0 + 10 * MIN);
		expect(paused.status).toBe('paused');
		expect(paused.endsAt).toBeNull();
		expect(paused.remainingMs).toBe(15 * MIN);
	});

	it('clamps remainingMs to 0 if already overdue', () => {
		const running = start(defaultState(T0), settings(), T0);
		const paused = pause(running, T0 + 26 * MIN);
		expect(paused.remainingMs).toBe(0);
	});

	it('no-op when not running', () => {
		const ready = defaultState(T0);
		expect(pause(ready, T0)).toBe(ready);
	});
});

describe('resume', () => {
	it('restarts endsAt at now + remainingMs', () => {
		const paused: PomodoroState = {
			...defaultState(T0),
			status: 'paused',
			remainingMs: 10 * MIN
		};
		const resumed = resume(paused, T0 + 5 * MIN);
		expect(resumed.status).toBe('running');
		expect(resumed.endsAt).toBe(T0 + 5 * MIN + 10 * MIN);
		expect(resumed.remainingMs).toBeNull();
	});

	it('no-op when not paused', () => {
		const ready = defaultState(T0);
		expect(resume(ready, T0)).toBe(ready);
	});
});

describe('skip', () => {
	it('skipping work below N goes to short_break and increments counters', () => {
		const running = start(defaultState(T0), settings(), T0);
		const result = skip(running, settings(), T0 + 5 * MIN);
		expect(result.state.phase).toBe('short_break');
		expect(result.state.status).toBe('running');
		expect(result.state.endsAt).toBe(T0 + 5 * MIN + 5 * MIN);
		expect(result.state.workCompletedInCycle).toBe(1);
		expect(result.state.todayCount).toBe(1);
		expect(result.transition).toBe('short_break');
	});

	it('skipping the Nth work goes to long_break', () => {
		let state = defaultState(T0);
		state = { ...state, workCompletedInCycle: 3 }; // about to complete the 4th
		state = start(state, settings(), T0);
		const result = skip(state, settings(), T0 + MIN);
		expect(result.state.phase).toBe('long_break');
		expect(result.state.workCompletedInCycle).toBe(4);
		expect(result.state.todayCount).toBe(1);
		expect(result.state.endsAt).toBe(T0 + MIN + 15 * MIN);
		expect(result.transition).toBe('long_break');
	});

	it('skipping short_break goes to work, no count change', () => {
		const breakState: PomodoroState = {
			...defaultState(T0),
			phase: 'short_break',
			status: 'running',
			endsAt: T0 + 5 * MIN,
			workCompletedInCycle: 1,
			todayCount: 1
		};
		const result = skip(breakState, settings(), T0 + MIN);
		expect(result.state.phase).toBe('work');
		expect(result.state.workCompletedInCycle).toBe(1);
		expect(result.state.todayCount).toBe(1);
		expect(result.transition).toBe('work');
	});

	it('skipping long_break goes to work and resets workCompletedInCycle', () => {
		const longBreak: PomodoroState = {
			...defaultState(T0),
			phase: 'long_break',
			status: 'running',
			endsAt: T0 + 15 * MIN,
			workCompletedInCycle: 4,
			todayCount: 4
		};
		const result = skip(longBreak, settings(), T0 + MIN);
		expect(result.state.phase).toBe('work');
		expect(result.state.workCompletedInCycle).toBe(0);
		expect(result.state.todayCount).toBe(4);
		expect(result.transition).toBe('work');
	});

	it('skipping from paused state resumes running on next phase', () => {
		const paused: PomodoroState = {
			...defaultState(T0),
			status: 'paused',
			remainingMs: 10 * MIN
		};
		const result = skip(paused, settings(), T0);
		expect(result.state.status).toBe('running');
		expect(result.state.phase).toBe('short_break');
	});

	it('skipping from ready state still transitions phases', () => {
		const ready = defaultState(T0);
		const result = skip(ready, settings(), T0);
		expect(result.state.phase).toBe('short_break');
		expect(result.state.status).toBe('running');
		expect(result.state.todayCount).toBe(1);
	});
});

describe('reset', () => {
	it('returns to ready and clears phase counters, preserves todayCount/todayDate', () => {
		const state: PomodoroState = {
			...defaultState(T0),
			status: 'running',
			phase: 'short_break',
			endsAt: T0 + 5 * MIN,
			workCompletedInCycle: 2,
			todayCount: 7
		};
		const r = reset(state, T0);
		expect(r.status).toBe('ready');
		expect(r.phase).toBe('work');
		expect(r.endsAt).toBeNull();
		expect(r.remainingMs).toBeNull();
		expect(r.workCompletedInCycle).toBe(0);
		expect(r.todayCount).toBe(7);
		expect(r.todayDate).toBe('2026-05-27');
	});
});

describe('tick', () => {
	it('no transition when not yet at endsAt', () => {
		const running = start(defaultState(T0), settings(), T0);
		const result = tick(running, settings(), T0 + 10 * MIN);
		expect(result.transitions).toEqual([]);
		expect(result.state).toBe(running);
	});

	it('transitions to short_break when work completes', () => {
		const running = start(defaultState(T0), settings(), T0);
		const result = tick(running, settings(), T0 + 25 * MIN + 100);
		expect(result.transitions).toEqual(['short_break']);
		expect(result.state.phase).toBe('short_break');
		expect(result.state.status).toBe('running');
		expect(result.state.workCompletedInCycle).toBe(1);
		expect(result.state.todayCount).toBe(1);
	});

	it('transitions to long_break when Nth work completes', () => {
		let state = defaultState(T0);
		state = { ...state, workCompletedInCycle: 3 };
		state = start(state, settings(), T0);
		const result = tick(state, settings(), T0 + 25 * MIN + 100);
		expect(result.transitions).toEqual(['long_break']);
		expect(result.state.workCompletedInCycle).toBe(4);
	});

	it('after long_break completes, work starts and workCompletedInCycle resets', () => {
		const longBreak: PomodoroState = {
			...defaultState(T0),
			status: 'running',
			phase: 'long_break',
			endsAt: T0 + 15 * MIN,
			workCompletedInCycle: 4,
			todayCount: 4
		};
		const result = tick(longBreak, settings(), T0 + 15 * MIN + 100);
		expect(result.transitions).toEqual(['work']);
		expect(result.state.workCompletedInCycle).toBe(0);
		expect(result.state.todayCount).toBe(4);
	});

	it('caps at 1 transition even if largely overdue', () => {
		const running = start(defaultState(T0), settings(), T0);
		// Tab slept for hours; now we tick way past
		const result = tick(running, settings(), T0 + 24 * 60 * MIN);
		expect(result.transitions.length).toBe(1);
		expect(result.transitions[0]).toBe('short_break');
		// New phase starts fresh from now, NOT from old endsAt
		expect(result.state.endsAt).toBe(T0 + 24 * 60 * MIN + 5 * MIN);
	});

	it('no transition when status=ready', () => {
		const ready = defaultState(T0);
		const result = tick(ready, settings(), T0 + 60 * MIN);
		expect(result.transitions).toEqual([]);
		expect(result.state).toBe(ready);
	});

	it('no transition when status=paused', () => {
		const paused: PomodoroState = {
			...defaultState(T0),
			status: 'paused',
			remainingMs: 10 * MIN
		};
		const result = tick(paused, settings(), T0 + 60 * MIN);
		expect(result.transitions).toEqual([]);
		expect(result.state).toBe(paused);
	});

	it('updates todayCount + resets todayDate on day change via transition', () => {
		const running = start(defaultState(T0), settings(), T0);
		const nextDay = new Date('2026-05-28T10:30:00Z').getTime();
		const result = tick(running, settings(), nextDay);
		expect(result.state.todayCount).toBe(1);
		expect(result.state.todayDate).toBe('2026-05-28');
	});
});

describe('resetTodayIfNewDay', () => {
	it('resets todayCount when date changed', () => {
		const state: PomodoroState = { ...defaultState(T0), todayCount: 5, todayDate: '2026-05-26' };
		const r = resetTodayIfNewDay(state, T0);
		expect(r.todayCount).toBe(0);
		expect(r.todayDate).toBe('2026-05-27');
	});

	it('preserves todayCount when same date', () => {
		const state: PomodoroState = { ...defaultState(T0), todayCount: 5 };
		const r = resetTodayIfNewDay(state, T0);
		expect(r).toBe(state);
	});
});

describe('serialize / deserialize', () => {
	it('roundtrips state + settings', () => {
		const state: PomodoroState = {
			...defaultState(T0),
			status: 'running',
			phase: 'short_break',
			endsAt: T0 + 5 * MIN,
			workCompletedInCycle: 2,
			todayCount: 7
		};
		const set = settings({ workMinutes: 30 });
		const raw = serialize(state, set);
		const parsed = deserialize(raw, T0);
		expect(parsed).not.toBeNull();
		expect(parsed!.state).toEqual(state);
		expect(parsed!.settings).toEqual(set);
	});

	it('roundtrips a paused state', () => {
		const state: PomodoroState = {
			...defaultState(T0),
			status: 'paused',
			remainingMs: 7 * MIN
		};
		const raw = serialize(state, defaultSettings());
		const parsed = deserialize(raw, T0);
		expect(parsed!.state).toEqual(state);
	});

	it('returns null on invalid JSON', () => {
		expect(deserialize('not json {', T0)).toBeNull();
	});

	it('returns null on wrong version', () => {
		const raw = JSON.stringify({
			version: STORAGE_VERSION + 99,
			state: defaultState(T0),
			settings: defaultSettings()
		});
		expect(deserialize(raw, T0)).toBeNull();
	});

	it('returns null on missing fields', () => {
		const raw = JSON.stringify({ version: STORAGE_VERSION });
		expect(deserialize(raw, T0)).toBeNull();
	});

	it('returns null on bogus phase enum', () => {
		const raw = JSON.stringify({
			version: STORAGE_VERSION,
			state: { ...defaultState(T0), phase: 'malicious' },
			settings: defaultSettings()
		});
		expect(deserialize(raw, T0)).toBeNull();
	});

	it('clamps out-of-range settings on deserialize', () => {
		const raw = JSON.stringify({
			version: STORAGE_VERSION,
			state: defaultState(T0),
			settings: { ...defaultSettings(), workMinutes: 9999 }
		});
		const parsed = deserialize(raw, T0);
		expect(parsed!.settings.workMinutes).toBe(90);
	});

	it('rejects null input', () => {
		expect(deserialize(null, T0)).toBeNull();
	});

	it('rejects zombie status/endsAt mismatch (running without endsAt)', () => {
		const raw = JSON.stringify({
			version: STORAGE_VERSION,
			state: { ...defaultState(T0), status: 'running', endsAt: null },
			settings: defaultSettings()
		});
		expect(deserialize(raw, T0)).toBeNull();
	});

	it('rejects zombie status/remainingMs mismatch (paused without remainingMs)', () => {
		const raw = JSON.stringify({
			version: STORAGE_VERSION,
			state: { ...defaultState(T0), status: 'paused', remainingMs: null },
			settings: defaultSettings()
		});
		expect(deserialize(raw, T0)).toBeNull();
	});

	it('rejects zombie status/endsAt mismatch (ready with endsAt)', () => {
		const raw = JSON.stringify({
			version: STORAGE_VERSION,
			state: { ...defaultState(T0), endsAt: T0 + MIN },
			settings: defaultSettings()
		});
		expect(deserialize(raw, T0)).toBeNull();
	});
});

describe('getRemainingMs', () => {
	it('running: returns endsAt - now', () => {
		const running = start(defaultState(T0), settings(), T0);
		expect(getRemainingMs(running, settings(), T0 + 10 * MIN)).toBe(15 * MIN);
	});

	it('paused: returns remainingMs', () => {
		const paused: PomodoroState = {
			...defaultState(T0),
			status: 'paused',
			remainingMs: 7 * MIN
		};
		expect(getRemainingMs(paused, settings(), T0 + 999_999)).toBe(7 * MIN);
	});

	it('ready: returns full phase duration', () => {
		const ready = defaultState(T0);
		expect(getRemainingMs(ready, settings(), T0)).toBe(25 * MIN);
	});

	it('running but overdue: clamps to 0', () => {
		const running = start(defaultState(T0), settings(), T0);
		expect(getRemainingMs(running, settings(), T0 + 30 * MIN)).toBe(0);
	});
});

describe('getPhaseDurationMs', () => {
	it('work', () => {
		expect(getPhaseDurationMs('work', settings())).toBe(25 * MIN);
	});
	it('short_break', () => {
		expect(getPhaseDurationMs('short_break', settings())).toBe(5 * MIN);
	});
	it('long_break', () => {
		expect(getPhaseDurationMs('long_break', settings())).toBe(15 * MIN);
	});
});
