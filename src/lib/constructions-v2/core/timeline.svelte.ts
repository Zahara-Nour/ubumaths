/**
 * SimpleTimeline — lightweight playback controller for construction animations.
 *
 * Accepts an array of step durations and drives playback via requestAnimationFrame.
 * Provides reactive state for UI binding (Svelte 5 runes).
 */

export interface TimelineCallbacks {
	onStepChange?: (stepIndex: number) => void;
	onTimeUpdate?: (progress: number) => void;
	onComplete?: () => void;
}

interface StepTiming {
	start: number;
	end: number;
}

export class SimpleTimeline {
	// ─── Reactive state ──────────────────────────────────────
	private _isPlaying = $state(false);
	private _currentStepIndex = $state(-1);
	private _currentTime = $state(0);
	private _totalDuration = $state(0);
	private _playbackRate = $state(1);
	private _stepCount = $state(0);

	// ─── Internal ────────────────────────────────────────────
	private stepTimings: StepTiming[] = [];
	private rafId: number | null = null;
	private lastFrameTime = 0;
	private callbacks: TimelineCallbacks;

	constructor(callbacks: TimelineCallbacks = {}) {
		this.callbacks = callbacks;
	}

	// ─── Loading ─────────────────────────────────────────────

	/** Load step durations and prepare for playback. */
	load(durations: number[]): void {
		this.stop();
		this.stepTimings = [];
		let cumulative = 0;
		for (const d of durations) {
			this.stepTimings.push({ start: cumulative, end: cumulative + d });
			cumulative += d;
		}
		this._totalDuration = cumulative;
		this._stepCount = durations.length;
		this._currentStepIndex = -1;
		this._currentTime = 0;
	}

	// ─── Playback controls ──────────────────────────────────

	play(): void {
		if (this._isPlaying || this._stepCount === 0) return;
		if (this._currentTime >= this._totalDuration) {
			this.reset();
		}
		this._isPlaying = true;
		this.lastFrameTime = performance.now();
		this.rafId = requestAnimationFrame((t) => this.tick(t));
	}

	pause(): void {
		this._isPlaying = false;
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
	}

	toggle(): void {
		if (this._isPlaying) this.pause();
		else this.play();
	}

	reset(): void {
		this.pause();
		this._currentTime = 0;
		this._currentStepIndex = -1;
	}

	stop(): void {
		this.pause();
		this._currentTime = 0;
		this._currentStepIndex = -1;
	}

	// ─── Step navigation ────────────────────────────────────

	stepForward(): void {
		if (this._currentStepIndex + 1 >= this._stepCount) return;
		this.pause();
		const nextIndex = this._currentStepIndex + 1;
		this._currentTime = this.stepTimings[nextIndex].end;
		this.updateCurrentStep();
	}

	stepBackward(): void {
		if (this._currentStepIndex < 0) return;
		this.pause();
		if (this._currentStepIndex === 0) {
			this._currentTime = 0;
			this._currentStepIndex = -1;
		} else {
			this._currentTime = this.stepTimings[this._currentStepIndex - 1].end;
			this.updateCurrentStep();
		}
	}

	seekToStep(index: number): void {
		if (index < 0 || index >= this._stepCount) return;
		this.pause();
		this._currentTime = this.stepTimings[index].end;
		this.updateCurrentStep();
	}

	/** Scrub to a position (0-1 progress). Pauses playback. */
	scrubByProgress(progress: number): void {
		this.pause();
		this._currentTime = Math.max(0, Math.min(1, progress)) * this._totalDuration;
		this.updateCurrentStep();
	}

	// ─── Speed ──────────────────────────────────────────────

	setPlaybackRate(rate: number): void {
		this._playbackRate = Math.max(0.25, Math.min(4, rate));
	}

	speedUp(): void {
		this.setPlaybackRate(this._playbackRate * 1.5);
	}

	slowDown(): void {
		this.setPlaybackRate(this._playbackRate / 1.5);
	}

	resetSpeed(): void {
		this._playbackRate = 1;
	}

	// ─── Reactive getters ───────────────────────────────────

	get isPlaying(): boolean {
		return this._isPlaying;
	}

	get currentStepIndex(): number {
		return this._currentStepIndex;
	}

	get currentTime(): number {
		return this._currentTime;
	}

	get totalDuration(): number {
		return this._totalDuration;
	}

	get playbackRate(): number {
		return this._playbackRate;
	}

	get stepCount(): number {
		return this._stepCount;
	}

	get progress(): number {
		if (this._totalDuration === 0) return 0;
		return this._currentTime / this._totalDuration;
	}

	get hasPrev(): boolean {
		return this._currentStepIndex >= 0;
	}

	get hasNext(): boolean {
		return this._currentStepIndex + 1 < this._stepCount;
	}

	/** Progress within the current step (0-1). */
	get stepProgress(): number {
		if (this._currentStepIndex < 0 || this._currentStepIndex >= this.stepTimings.length) return 0;
		const timing = this.stepTimings[this._currentStepIndex];
		const duration = timing.end - timing.start;
		if (duration === 0) return 1;
		return Math.max(0, Math.min(1, (this._currentTime - timing.start) / duration));
	}

	// ─── Cleanup ────────────────────────────────────────────

	destroy(): void {
		this.stop();
	}

	// ─── Internal ───────────────────────────────────────────

	private tick(now: number): void {
		if (!this._isPlaying) return;

		const deltaMs = (now - this.lastFrameTime) * this._playbackRate;
		this.lastFrameTime = now;

		this._currentTime = Math.min(this._currentTime + deltaMs, this._totalDuration);
		this.updateCurrentStep();

		this.callbacks.onTimeUpdate?.(this.stepProgress);

		if (this._currentTime >= this._totalDuration) {
			this._isPlaying = false;
			this.callbacks.onComplete?.();
			return;
		}

		this.rafId = requestAnimationFrame((t) => this.tick(t));
	}

	private updateCurrentStep(): void {
		const newIndex = this.findStepAt(this._currentTime);
		if (newIndex !== this._currentStepIndex) {
			this._currentStepIndex = newIndex;
			this.callbacks.onStepChange?.(newIndex);
		}
	}

	/** Binary search for the step containing a given time. */
	private findStepAt(time: number): number {
		if (time <= 0 || this.stepTimings.length === 0) return -1;
		for (let i = 0; i < this.stepTimings.length; i++) {
			if (time <= this.stepTimings[i].end) return i;
		}
		return this.stepTimings.length - 1;
	}
}

export function formatTime(ms: number): string {
	const seconds = ms / 1000;
	return `${seconds.toFixed(1)}s`;
}

export function formatPlaybackRate(rate: number): string {
	return `${rate.toFixed(rate % 1 === 0 ? 0 : 1)}x`;
}
