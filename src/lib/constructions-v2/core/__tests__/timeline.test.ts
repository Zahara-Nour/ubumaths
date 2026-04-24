import { describe, it, expect } from 'vitest';
import {
	Timeline,
	createInitialTimelineState,
	formatTime,
	formatPlaybackRate
} from '../timeline.svelte';

function createTimeline() {
	let state = createInitialTimelineState();
	const steps: number[] = [];
	const tl = new Timeline(
		(s) => {
			state = s;
		},
		(stepIndex) => {
			steps.push(stepIndex);
		}
	);
	return { tl, getState: () => state, steps };
}

describe('Timeline — loading', () => {
	it('loads durations and computes total', () => {
		const { tl, getState } = createTimeline();
		tl.load([500, 300, 200]);
		expect(getState().totalDuration).toBe(1000);
		expect(getState().stepCount).toBe(3);
		expect(getState().currentStepIndex).toBe(-1);
	});

	it('empty durations', () => {
		const { tl, getState } = createTimeline();
		tl.load([]);
		expect(getState().totalDuration).toBe(0);
		expect(getState().stepCount).toBe(0);
	});
});

describe('Timeline — step navigation', () => {
	it('stepForward advances to next step', () => {
		const { tl, getState } = createTimeline();
		tl.load([500, 300, 200]);
		tl.stepForward();
		expect(getState().currentStepIndex).toBe(0);
		expect(getState().currentTime).toBe(500);
	});

	it('stepForward twice reaches step 1', () => {
		const { tl, getState } = createTimeline();
		tl.load([500, 300, 200]);
		tl.stepForward();
		tl.stepForward();
		expect(getState().currentStepIndex).toBe(1);
		expect(getState().currentTime).toBe(800);
	});

	it('stepForward stops at last step', () => {
		const { tl, getState } = createTimeline();
		tl.load([500, 300]);
		tl.stepForward();
		tl.stepForward();
		tl.stepForward();
		expect(getState().currentStepIndex).toBe(1);
	});

	it('stepBackward goes back', () => {
		const { tl, getState } = createTimeline();
		tl.load([500, 300, 200]);
		tl.stepForward();
		tl.stepForward();
		tl.stepBackward();
		expect(getState().currentStepIndex).toBe(0);
		expect(getState().currentTime).toBe(500);
	});

	it('stepBackward from step 0 goes to -1', () => {
		const { tl, getState } = createTimeline();
		tl.load([500, 300]);
		tl.stepForward();
		tl.stepBackward();
		expect(getState().currentStepIndex).toBe(-1);
		expect(getState().currentTime).toBe(0);
	});

	it('seekToStep jumps to specific step', () => {
		const { tl, getState } = createTimeline();
		tl.load([500, 300, 200]);
		tl.seekToStep(2);
		expect(getState().currentStepIndex).toBe(2);
		expect(getState().currentTime).toBe(1000);
	});
});

describe('Timeline — scrubbing', () => {
	it('scrubByProgress seeks to position', () => {
		const { tl, getState } = createTimeline();
		tl.load([500, 500]);
		tl.scrubByProgress(0.5);
		expect(getState().currentTime).toBe(500);
		expect(getState().currentStepIndex).toBe(0);
	});

	it('scrubByProgress clamps to 0-1', () => {
		const { tl, getState } = createTimeline();
		tl.load([500]);
		tl.scrubByProgress(1.5);
		expect(getState().currentTime).toBe(500);
	});
});

describe('Timeline — reactive getters', () => {
	it('progress is 0 initially', () => {
		const { tl, getState } = createTimeline();
		tl.load([500]);
		expect(getState().progress).toBe(0);
	});

	it('hasPrev / hasNext', () => {
		const { tl, getState } = createTimeline();
		tl.load([500, 300]);
		expect(getState().hasPrev).toBe(false);
		expect(getState().hasNext).toBe(true);
		tl.stepForward();
		expect(getState().hasPrev).toBe(true);
		expect(getState().hasNext).toBe(true);
		tl.stepForward();
		expect(getState().hasPrev).toBe(true);
		expect(getState().hasNext).toBe(false);
	});
});

describe('Timeline — speed', () => {
	it('setPlaybackRate clamps to 0.25-4', () => {
		const { tl, getState } = createTimeline();
		tl.setPlaybackRate(0.1);
		expect(getState().playbackRate).toBe(0.25);
		tl.setPlaybackRate(10);
		expect(getState().playbackRate).toBe(4);
	});

	it('resetSpeed goes back to 1', () => {
		const { tl, getState } = createTimeline();
		tl.setPlaybackRate(2);
		tl.resetSpeed();
		expect(getState().playbackRate).toBe(1);
	});
});

describe('Timeline — callbacks', () => {
	it('onStepChange fires on navigation', () => {
		const { tl, steps } = createTimeline();
		tl.load([500, 300]);
		tl.stepForward();
		tl.stepForward();
		expect(steps).toEqual([0, 1]);
	});
});

describe('Timeline — reset', () => {
	it('reset clears state', () => {
		const { tl, getState } = createTimeline();
		tl.load([500, 300]);
		tl.stepForward();
		tl.stepForward();
		tl.reset();
		expect(getState().currentStepIndex).toBe(-1);
		expect(getState().currentTime).toBe(0);
		expect(getState().isPlaying).toBe(false);
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
