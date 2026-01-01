/**
 * Tests for Evoland Game Loop
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	GameLoop,
	TARGET_FPS,
	FRAME_DURATION,
	MAX_DELTA_TIME,
	createSimpleLoop,
	createEvolandLoop
} from './game-loop';

describe('Game Loop Constants', () => {
	it('should have correct target FPS for Evoland', () => {
		expect(TARGET_FPS).toBe(40);
	});

	it('should have correct frame duration', () => {
		expect(FRAME_DURATION).toBeCloseTo(1000 / 40, 2);
		expect(FRAME_DURATION).toBe(25); // 1000/40 = 25ms
	});

	it('should have max delta time to prevent spiral of death', () => {
		expect(MAX_DELTA_TIME).toBe(0.5);
	});
});

describe('GameLoop', () => {
	let loop: GameLoop;
	let updateCalls: Array<{ dt: number; rawDt: number }>;
	let renderCalls: Array<{ interpolation: number }>;
	let rafId: number;
	let rafCallback: FrameRequestCallback | null;

	beforeEach(() => {
		updateCalls = [];
		renderCalls = [];
		rafId = 0;
		rafCallback = null;

		// Mock performance.now
		vi.spyOn(performance, 'now').mockReturnValue(0);

		// Mock requestAnimationFrame
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
			rafCallback = callback;
			return ++rafId;
		});

		// Mock cancelAnimationFrame
		vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
			rafCallback = null;
		});

		loop = new GameLoop(
			(dt, rawDt) => updateCalls.push({ dt, rawDt }),
			(interpolation) => renderCalls.push({ interpolation })
		);
	});

	afterEach(() => {
		loop.stop();
		vi.restoreAllMocks();
	});

	describe('start/stop', () => {
		it('should start the loop', () => {
			expect(loop.isRunning).toBe(false);
			loop.start();
			expect(loop.isRunning).toBe(true);
			expect(window.requestAnimationFrame).toHaveBeenCalled();
		});

		it('should not start twice', () => {
			loop.start();
			loop.start();
			expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
		});

		it('should stop the loop', () => {
			loop.start();
			loop.stop();
			expect(loop.isRunning).toBe(false);
			expect(window.cancelAnimationFrame).toHaveBeenCalled();
		});
	});

	describe('pause/resume', () => {
		it('should pause the loop', () => {
			loop.start();
			expect(loop.isPaused).toBe(false);
			loop.pause();
			expect(loop.isPaused).toBe(true);
			expect(loop.isRunning).toBe(true); // Still running, just paused
		});

		it('should resume the loop', () => {
			loop.start();
			loop.pause();
			loop.resume();
			expect(loop.isPaused).toBe(false);
		});

		it('should toggle pause state', () => {
			loop.start();
			loop.togglePause();
			expect(loop.isPaused).toBe(true);
			loop.togglePause();
			expect(loop.isPaused).toBe(false);
		});

		it('should skip updates when paused', () => {
			loop.start();
			const updateCountBeforePause = updateCalls.length;
			const renderCountBeforePause = renderCalls.length;

			loop.pause();

			// Simulate a frame while paused
			if (rafCallback) {
				vi.spyOn(performance, 'now').mockReturnValue(50);
				rafCallback(50);
			}

			// No new updates or renders while paused
			expect(updateCalls.length).toBe(updateCountBeforePause);
			expect(renderCalls.length).toBe(renderCountBeforePause);
		});
	});

	describe('update/render callbacks', () => {
		it('should call update when enough time has accumulated', () => {
			loop.start();

			// Simulate a frame at 25ms (one frame duration)
			if (rafCallback) {
				vi.spyOn(performance, 'now').mockReturnValue(25);
				rafCallback(25);
			}

			expect(updateCalls.length).toBeGreaterThan(0);
		});

		it('should call render each frame', () => {
			const renderCountBefore = renderCalls.length;
			loop.start();

			// Simulate a frame
			if (rafCallback) {
				vi.spyOn(performance, 'now').mockReturnValue(25);
				rafCallback(25);
			}

			// At least one render call should have been made
			expect(renderCalls.length).toBeGreaterThan(renderCountBefore);
		});

		it('should pass interpolation factor to render', () => {
			loop.start();

			// Simulate a frame
			if (rafCallback) {
				vi.spyOn(performance, 'now').mockReturnValue(25);
				rafCallback(25);
			}

			expect(renderCalls[0].interpolation).toBeGreaterThanOrEqual(0);
			expect(renderCalls[0].interpolation).toBeLessThanOrEqual(1);
		});
	});

	describe('stats', () => {
		it('should track frame count', () => {
			const frameCountBefore = loop.stats.frameCount;
			loop.start();

			// Simulate a frame
			if (rafCallback) {
				vi.spyOn(performance, 'now').mockReturnValue(25);
				rafCallback(25);
			}

			expect(loop.stats.frameCount).toBeGreaterThan(frameCountBefore);
		});

		it('should track tmod (smoothed delta time)', () => {
			loop.start();

			// Simulate a frame
			if (rafCallback) {
				vi.spyOn(performance, 'now').mockReturnValue(25);
				rafCallback(25);
			}

			expect(loop.stats.tmod).toBeGreaterThan(0);
		});
	});
});

describe('createSimpleLoop', () => {
	it('should create a loop with just update callback', () => {
		const updates: number[] = [];
		const loop = createSimpleLoop((dt) => updates.push(dt));

		expect(loop).toBeInstanceOf(GameLoop);
		loop.stop();
	});
});

describe('createEvolandLoop', () => {
	it('should create a loop configured for Evoland', () => {
		const loop = createEvolandLoop(
			() => {},
			() => {}
		);

		expect(loop).toBeInstanceOf(GameLoop);
		expect(loop.stats.frameTime).toBe(25); // 40 FPS
		loop.stop();
	});
});
