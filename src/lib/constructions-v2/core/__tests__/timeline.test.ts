import { describe, it, expect } from 'vitest';
import { SimpleTimeline, formatTime, formatPlaybackRate } from '../timeline.svelte';

describe('SimpleTimeline — loading', () => {
	it('loads durations and computes total', () => {
		const tl = new SimpleTimeline();
		tl.load([500, 300, 200]);
		expect(tl.totalDuration).toBe(1000);
		expect(tl.stepCount).toBe(3);
		expect(tl.currentStepIndex).toBe(-1);
	});

	it('empty durations', () => {
		const tl = new SimpleTimeline();
		tl.load([]);
		expect(tl.totalDuration).toBe(0);
		expect(tl.stepCount).toBe(0);
	});
});

describe('SimpleTimeline — step navigation', () => {
	it('stepForward advances to next step', () => {
		const tl = new SimpleTimeline();
		tl.load([500, 300, 200]);
		tl.stepForward();
		expect(tl.currentStepIndex).toBe(0);
		expect(tl.currentTime).toBe(500);
	});

	it('stepForward twice reaches step 1', () => {
		const tl = new SimpleTimeline();
		tl.load([500, 300, 200]);
		tl.stepForward();
		tl.stepForward();
		expect(tl.currentStepIndex).toBe(1);
		expect(tl.currentTime).toBe(800);
	});

	it('stepForward stops at last step', () => {
		const tl = new SimpleTimeline();
		tl.load([500, 300]);
		tl.stepForward();
		tl.stepForward();
		tl.stepForward(); // should not go past end
		expect(tl.currentStepIndex).toBe(1);
	});

	it('stepBackward goes back', () => {
		const tl = new SimpleTimeline();
		tl.load([500, 300, 200]);
		tl.stepForward();
		tl.stepForward();
		tl.stepBackward();
		expect(tl.currentStepIndex).toBe(0);
		expect(tl.currentTime).toBe(500);
	});

	it('stepBackward from step 0 goes to -1', () => {
		const tl = new SimpleTimeline();
		tl.load([500, 300]);
		tl.stepForward();
		tl.stepBackward();
		expect(tl.currentStepIndex).toBe(-1);
		expect(tl.currentTime).toBe(0);
	});

	it('seekToStep jumps to specific step', () => {
		const tl = new SimpleTimeline();
		tl.load([500, 300, 200]);
		tl.seekToStep(2);
		expect(tl.currentStepIndex).toBe(2);
		expect(tl.currentTime).toBe(1000);
	});
});

describe('SimpleTimeline — scrubbing', () => {
	it('scrubByProgress seeks to position', () => {
		const tl = new SimpleTimeline();
		tl.load([500, 500]);
		tl.scrubByProgress(0.5);
		expect(tl.currentTime).toBe(500);
		expect(tl.currentStepIndex).toBe(0);
	});

	it('scrubByProgress clamps to 0-1', () => {
		const tl = new SimpleTimeline();
		tl.load([500]);
		tl.scrubByProgress(1.5);
		expect(tl.currentTime).toBe(500);
	});
});

describe('SimpleTimeline — reactive getters', () => {
	it('progress is 0 initially', () => {
		const tl = new SimpleTimeline();
		tl.load([500]);
		expect(tl.progress).toBe(0);
	});

	it('hasPrev / hasNext', () => {
		const tl = new SimpleTimeline();
		tl.load([500, 300]);
		expect(tl.hasPrev).toBe(false);
		expect(tl.hasNext).toBe(true);
		tl.stepForward();
		expect(tl.hasPrev).toBe(true);
		expect(tl.hasNext).toBe(true);
		tl.stepForward();
		expect(tl.hasPrev).toBe(true);
		expect(tl.hasNext).toBe(false);
	});
});

describe('SimpleTimeline — speed', () => {
	it('setPlaybackRate clamps to 0.25-4', () => {
		const tl = new SimpleTimeline();
		tl.setPlaybackRate(0.1);
		expect(tl.playbackRate).toBe(0.25);
		tl.setPlaybackRate(10);
		expect(tl.playbackRate).toBe(4);
	});

	it('resetSpeed goes back to 1', () => {
		const tl = new SimpleTimeline();
		tl.setPlaybackRate(2);
		tl.resetSpeed();
		expect(tl.playbackRate).toBe(1);
	});
});

describe('SimpleTimeline — callbacks', () => {
	it('onStepChange fires on navigation', () => {
		const steps: number[] = [];
		const tl = new SimpleTimeline({ onStepChange: (i) => steps.push(i) });
		tl.load([500, 300]);
		tl.stepForward();
		tl.stepForward();
		expect(steps).toEqual([0, 1]);
	});
});

describe('SimpleTimeline — reset', () => {
	it('reset clears state', () => {
		const tl = new SimpleTimeline();
		tl.load([500, 300]);
		tl.stepForward();
		tl.stepForward();
		tl.reset();
		expect(tl.currentStepIndex).toBe(-1);
		expect(tl.currentTime).toBe(0);
		expect(tl.isPlaying).toBe(false);
	});
});

describe('formatters', () => {
	it('formatTime formats milliseconds', () => {
		expect(formatTime(1500)).toBe('1.5s');
		expect(formatTime(0)).toBe('0.0s');
	});

	it('formatPlaybackRate formats rate', () => {
		expect(formatPlaybackRate(1)).toBe('1x');
		expect(formatPlaybackRate(1.5)).toBe('1.5x');
		expect(formatPlaybackRate(2)).toBe('2x');
	});
});
