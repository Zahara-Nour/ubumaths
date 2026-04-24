/**
 * Timeline — plain JS playback controller for construction animations.
 *
 * No $state — the caller owns reactive state and passes an onUpdate
 * callback that is called whenever the timeline state changes.
 * This follows the CLAUDE.md reactivity rule:
 *   UI event → handler → update reactive state → trigger DOM update
 */

export interface TimelineState {
	isPlaying: boolean;
	currentStepIndex: number;
	currentTime: number;
	totalDuration: number;
	playbackRate: number;
	stepCount: number;
	progress: number;
	stepProgress: number;
	hasPrev: boolean;
	hasNext: boolean;
}

interface StepTiming {
	start: number;
	end: number;
}

export type TimelineUpdateFn = (state: TimelineState) => void;

export function createInitialTimelineState(): TimelineState {
	return {
		isPlaying: false,
		currentStepIndex: -1,
		currentTime: 0,
		totalDuration: 0,
		playbackRate: 1,
		stepCount: 0,
		progress: 0,
		stepProgress: 0,
		hasPrev: false,
		hasNext: false
	};
}

/**
 * Timeline engine — plain JS class, no Svelte runes.
 * Calls onUpdate(state) whenever the state changes.
 * The caller is responsible for storing state reactively.
 */
export class Timeline {
	private stepTimings: StepTiming[] = [];
	private rafId: number | null = null;
	private lastFrameTime = 0;

	// Internal mutable state (NOT reactive)
	private _isPlaying = false;
	private _currentStepIndex = -1;
	private _currentTime = 0;
	private _totalDuration = 0;
	private _playbackRate = 1;
	private _stepCount = 0;

	private onUpdate: TimelineUpdateFn;
	private onStepChange?: (stepIndex: number) => void;

	constructor(onUpdate: TimelineUpdateFn, onStepChange?: (stepIndex: number) => void) {
		this.onUpdate = onUpdate;
		this.onStepChange = onStepChange;
	}

	// ─── Loading ─────────────────────────────────────────────

	load(durations: number[]): void {
		this.stopInternal();
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
		this.emitState();
	}

	// ─── Playback controls ──────────────────────────────────

	play(): void {
		if (this._isPlaying || this._stepCount === 0) return;
		if (this._currentTime >= this._totalDuration) {
			this._currentTime = 0;
			this._currentStepIndex = -1;
		}
		this._isPlaying = true;
		this.lastFrameTime = performance.now();
		this.rafId = requestAnimationFrame((t) => this.tick(t));
		this.emitState();
	}

	pause(): void {
		this._isPlaying = false;
		this.cancelRaf();
		this.emitState();
	}

	toggle(): void {
		if (this._isPlaying) this.pause();
		else this.play();
	}

	reset(): void {
		this.stopInternal();
		this.emitState();
	}

	// ─── Step navigation ────────────────────────────────────

	stepForward(): void {
		if (this._currentStepIndex + 1 >= this._stepCount) return;
		this.cancelRaf();
		this._isPlaying = false;
		const nextIndex = this._currentStepIndex + 1;
		this._currentTime = this.stepTimings[nextIndex].end;
		this.updateCurrentStep();
		this.emitState();
	}

	stepBackward(): void {
		if (this._currentStepIndex < 0) return;
		this.cancelRaf();
		this._isPlaying = false;
		if (this._currentStepIndex === 0) {
			this._currentTime = 0;
			this._currentStepIndex = -1;
		} else {
			this._currentTime = this.stepTimings[this._currentStepIndex - 1].end;
			this.updateCurrentStep();
		}
		this.emitState();
	}

	seekToStep(index: number): void {
		if (index < 0 || index >= this._stepCount) return;
		this.cancelRaf();
		this._isPlaying = false;
		this._currentTime = this.stepTimings[index].end;
		this.updateCurrentStep();
		this.emitState();
	}

	scrubByProgress(progress: number): void {
		this.cancelRaf();
		this._isPlaying = false;
		this._currentTime = Math.max(0, Math.min(1, progress)) * this._totalDuration;
		this.updateCurrentStep();
		this.emitState();
	}

	// ─── Speed ──────────────────────────────────────────────

	setPlaybackRate(rate: number): void {
		this._playbackRate = Math.max(0.25, Math.min(4, rate));
		this.emitState();
	}

	speedUp(): void {
		this.setPlaybackRate(this._playbackRate * 1.5);
	}

	slowDown(): void {
		this.setPlaybackRate(this._playbackRate / 1.5);
	}

	resetSpeed(): void {
		this.setPlaybackRate(1);
	}

	// ─── Cleanup ────────────────────────────────────────────

	destroy(): void {
		this.cancelRaf();
		this._isPlaying = false;
	}

	// ─── Internal ───────────────────────────────────────────

	private tick(now: number): void {
		if (!this._isPlaying) return;

		const deltaMs = (now - this.lastFrameTime) * this._playbackRate;
		this.lastFrameTime = now;

		this._currentTime = Math.min(this._currentTime + deltaMs, this._totalDuration);
		this.updateCurrentStep();

		if (this._currentTime >= this._totalDuration) {
			this._isPlaying = false;
			this.emitState();
			return;
		}

		this.emitState();
		this.rafId = requestAnimationFrame((t) => this.tick(t));
	}

	private updateCurrentStep(): void {
		const newIndex = this.findStepAt(this._currentTime);
		if (newIndex !== this._currentStepIndex) {
			this._currentStepIndex = newIndex;
			this.onStepChange?.(newIndex);
		}
	}

	private findStepAt(time: number): number {
		if (time <= 0 || this.stepTimings.length === 0) return -1;
		for (let i = 0; i < this.stepTimings.length; i++) {
			if (time <= this.stepTimings[i].end) return i;
		}
		return this.stepTimings.length - 1;
	}

	private stopInternal(): void {
		this._isPlaying = false;
		this.cancelRaf();
		this._currentTime = 0;
		this._currentStepIndex = -1;
	}

	private cancelRaf(): void {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
	}

	private computeStepProgress(): number {
		if (this._currentStepIndex < 0 || this._currentStepIndex >= this.stepTimings.length) return 0;
		const timing = this.stepTimings[this._currentStepIndex];
		const duration = timing.end - timing.start;
		if (duration === 0) return 1;
		return Math.max(0, Math.min(1, (this._currentTime - timing.start) / duration));
	}

	private emitState(): void {
		this.onUpdate({
			isPlaying: this._isPlaying,
			currentStepIndex: this._currentStepIndex,
			currentTime: this._currentTime,
			totalDuration: this._totalDuration,
			playbackRate: this._playbackRate,
			stepCount: this._stepCount,
			progress: this._totalDuration > 0 ? this._currentTime / this._totalDuration : 0,
			stepProgress: this.computeStepProgress(),
			hasPrev: this._currentStepIndex >= 0,
			hasNext: this._currentStepIndex + 1 < this._stepCount
		});
	}
}

export function formatTime(ms: number): string {
	const seconds = ms / 1000;
	return `${seconds.toFixed(1)}s`;
}

export function formatPlaybackRate(rate: number): string {
	return `${rate.toFixed(rate % 1 === 0 ? 0 : 1)}x`;
}
