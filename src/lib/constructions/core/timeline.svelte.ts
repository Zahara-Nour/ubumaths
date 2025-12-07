/**
 * Construction Timeline Controller
 *
 * This module provides a reactive timeline controller for geometric construction
 * animations using Svelte 5 runes. It handles playback control, step navigation,
 * and time-based animation.
 *
 * @module constructions/core/timeline
 */

import type { Step, ConstructionScript, NonParallelStep } from '../types';
import {
	isPointStep,
	isLineStep,
	isArcStep,
	isCircleStep,
	isTextStep,
	isMarkStep,
	isMoveStep,
	isShowStep,
	isHideStep,
	isRotateStep,
	isSpreadStep,
	isRaiseStep,
	isLowerStep,
	isStyleStep,
	isPauseStep,
	isParallelStep
} from '../types';
import { DEFAULT_ANIMATION_DURATION, DEFAULT_PAUSE_DURATION } from '../constants';

// =============================================================================
// Types
// =============================================================================

/**
 * Playback status of the timeline
 */
export type TimelineStatus = 'idle' | 'playing' | 'paused';

/**
 * Callback function for step changes
 */
export type StepChangeCallback = (stepIndex: number, step: Step) => void;

/**
 * Callback function for time updates during playback
 */
export type TimeUpdateCallback = (time: number, progress: number) => void;

/**
 * Options for the Timeline constructor
 */
export interface TimelineOptions {
	/** Callback when the current step changes */
	onStepChange?: StepChangeCallback;
	/** Callback for time updates during playback */
	onTimeUpdate?: TimeUpdateCallback;
	/** Callback when playback completes */
	onComplete?: () => void;
}

/**
 * Information about a step's timing
 */
interface StepTiming {
	/** Index of the step */
	readonly index: number;
	/** Start time in milliseconds */
	readonly startTime: number;
	/** End time in milliseconds */
	readonly endTime: number;
	/** Duration of the step in milliseconds */
	readonly duration: number;
}

/**
 * Options for loading a script
 */
export interface LoadOptions {
	/**
	 * Pre-calculated durations for each step (in milliseconds).
	 * If provided, these durations are used instead of extracting from step properties.
	 * This allows the Engine to calculate durations based on instrument positions.
	 */
	stepDurations?: number[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a step is an object creation step (instant)
 */
function isObjectCreationStep(step: Step | NonParallelStep): boolean {
	return isPointStep(step) || isCircleStep(step) || isTextStep(step) || isMarkStep(step);
}

/**
 * Check if a step is an animated drawing step (line or arc)
 */
function isDrawingStep(step: Step | NonParallelStep): boolean {
	return isLineStep(step) || isArcStep(step);
}

/**
 * Check if a step is an instrument action (animated)
 */
function _isInstrumentActionStep(step: Step | NonParallelStep): boolean {
	return (
		isMoveStep(step) ||
		isShowStep(step) ||
		isHideStep(step) ||
		isRotateStep(step) ||
		isSpreadStep(step) ||
		isRaiseStep(step) ||
		isLowerStep(step)
	);
}

/**
 * Get the duration from a step that has an optional duration property
 */
function getStepDurationValue(step: NonParallelStep): number {
	// Steps with duration property
	if (isMoveStep(step)) return step.duration ?? DEFAULT_ANIMATION_DURATION;
	if (isShowStep(step)) return step.duration ?? DEFAULT_ANIMATION_DURATION;
	if (isHideStep(step)) return step.duration ?? DEFAULT_ANIMATION_DURATION;
	if (isRotateStep(step)) return step.duration ?? DEFAULT_ANIMATION_DURATION;
	if (isSpreadStep(step)) return step.duration ?? DEFAULT_ANIMATION_DURATION;
	if (isRaiseStep(step)) return step.duration ?? DEFAULT_ANIMATION_DURATION;
	if (isLowerStep(step)) return step.duration ?? DEFAULT_ANIMATION_DURATION;
	if (isStyleStep(step)) return step.duration ?? 100; // Style changes are quick
	if (isPauseStep(step)) return step.pause;

	// Object creation steps are instant
	if (isObjectCreationStep(step)) return 100;

	// Drawing steps (line, arc) have animation
	if (isDrawingStep(step)) return DEFAULT_ANIMATION_DURATION;

	return DEFAULT_ANIMATION_DURATION;
}

/**
 * Calculate the duration of a step
 *
 * @param step - Step definition
 * @returns Duration in milliseconds
 */
function getStepDuration(step: Step): number {
	// Pause step
	if (isPauseStep(step)) {
		return step.pause;
	}

	// Parallel step - take the longest duration
	if (isParallelStep(step)) {
		let maxDuration = 0;
		for (const subStep of step.parallel) {
			const duration = getStepDurationValue(subStep);
			if (duration > maxDuration) {
				maxDuration = duration;
			}
		}
		return maxDuration || DEFAULT_ANIMATION_DURATION;
	}

	// All other steps
	return getStepDurationValue(step);
}

/**
 * Clamp playback rate to valid range
 *
 * @param rate - Requested playback rate
 * @returns Clamped rate between 0.25 and 4
 */
function clampPlaybackRate(rate: number): number {
	return Math.max(0.25, Math.min(4, rate));
}

// =============================================================================
// Timeline Class
// =============================================================================

/**
 * Timeline controller for construction animations
 *
 * Manages playback state, step navigation, and time-based animation using
 * Svelte 5 runes for reactivity.
 *
 * @example
 * ```typescript
 * const timeline = new Timeline({
 *   onStepChange: (index, step) => {
 *     console.log(`Step ${index}: ${step.type}`);
 *   }
 * });
 *
 * timeline.load(constructionScript);
 * timeline.play();
 * ```
 */
export class Timeline {
	// =========================================================================
	// Private State (must be declared before derived state that uses them)
	// =========================================================================

	/** Steps from the loaded script */
	#steps: Step[] = [];

	/** Timing information for each step */
	#stepTimings: StepTiming[] = [];

	/** Request animation frame ID */
	#rafId: number | null = null;

	/** Timestamp of the last animation frame */
	#lastTimestamp = 0;

	/** Callback for step changes */
	#onStepChange?: StepChangeCallback;

	/** Callback for time updates */
	#onTimeUpdate?: TimeUpdateCallback;

	/** Callback when playback completes */
	#onComplete?: () => void;

	/** Pre-calculated step durations (set at load time) */
	#preCalculatedDurations?: number[];

	// =========================================================================
	// Reactive State (Svelte 5 runes)
	// =========================================================================

	/** Current step index (0-based) */
	currentStepIndex = $state(0);

	/** Current time in milliseconds since the start of playback */
	currentTime = $state(0);

	/** Total duration of all steps in milliseconds */
	totalDuration = $state(0);

	/** Current playback status */
	status = $state<TimelineStatus>('idle');

	/** Playback rate multiplier (0.25 to 4) */
	playbackRate = $state(1);

	// =========================================================================
	// Derived State
	// =========================================================================

	/** Progress through the timeline (0 to 1) */
	progress = $derived(this.totalDuration > 0 ? this.currentTime / this.totalDuration : 0);

	/** Whether the timeline is currently playing */
	isPlaying = $derived(this.status === 'playing');

	/** Whether the timeline is paused */
	isPaused = $derived(this.status === 'paused');

	/** Whether playback can be started */
	canPlay = $derived(this.status !== 'playing' && this.#steps.length > 0);

	/** Whether there is a next step */
	hasNext = $derived(this.currentStepIndex < this.#steps.length - 1);

	/** Whether there is a previous step */
	hasPrev = $derived(this.currentStepIndex > 0);

	/** Current step (or null if no script loaded) */
	currentStep = $derived(this.#steps[this.currentStepIndex] ?? null);

	/** Total number of steps */
	stepCount = $derived(this.#steps.length);

	/** Progress within the current step (0 to 1) */
	stepProgress = $derived.by(() => {
		const timing = this.#stepTimings[this.currentStepIndex];
		if (!timing || timing.duration === 0) return 1;
		const elapsed = this.currentTime - timing.startTime;
		return Math.max(0, Math.min(1, elapsed / timing.duration));
	});

	// =========================================================================
	// Constructor
	// =========================================================================

	/**
	 * Create a new Timeline instance
	 *
	 * @param options - Configuration options
	 */
	constructor(options?: TimelineOptions) {
		this.#onStepChange = options?.onStepChange;
		this.#onTimeUpdate = options?.onTimeUpdate;
		this.#onComplete = options?.onComplete;
	}

	// =========================================================================
	// Script Loading
	// =========================================================================

	/**
	 * Load a construction script into the timeline
	 *
	 * Calculates step timings and resets playback state.
	 *
	 * @param script - Construction script to load
	 * @param options - Optional load options (e.g., pre-calculated durations)
	 */
	load(script: ConstructionScript, options?: LoadOptions): void {
		this.reset();

		this.#steps = [...script.steps];
		this.#preCalculatedDurations = options?.stepDurations;
		this.#calculateStepTimings();

		// Notify initial step
		if (this.#steps.length > 0 && this.#onStepChange) {
			this.#onStepChange(0, this.#steps[0]);
		}
	}

	/**
	 * Calculate timing information for all steps
	 *
	 * Uses pre-calculated durations if provided via load options,
	 * otherwise extracts durations from step properties.
	 */
	#calculateStepTimings(): void {
		this.#stepTimings = [];
		let currentTime = 0;

		for (let i = 0; i < this.#steps.length; i++) {
			const step = this.#steps[i];
			// Use pre-calculated duration if available, otherwise get from step
			const duration = this.#preCalculatedDurations?.[i] ?? getStepDuration(step);

			this.#stepTimings.push({
				index: i,
				startTime: currentTime,
				endTime: currentTime + duration,
				duration
			});

			currentTime += duration;

			// Add a small gap between steps for visual clarity
			currentTime += DEFAULT_PAUSE_DURATION / 4;
		}

		this.totalDuration = currentTime;
	}

	// =========================================================================
	// Playback Control
	// =========================================================================

	/**
	 * Start or resume playback
	 */
	play(): void {
		if (this.#steps.length === 0) return;

		// If at the end, restart from beginning
		if (this.currentStepIndex >= this.#steps.length - 1 && this.stepProgress >= 1) {
			this.reset();
		}

		this.status = 'playing';
		this.#lastTimestamp = 0;
		this.#startAnimationLoop();
	}

	/**
	 * Pause playback
	 */
	pause(): void {
		this.status = 'paused';
		this.#stopAnimationLoop();
	}

	/**
	 * Toggle between play and pause
	 */
	toggle(): void {
		if (this.isPlaying) {
			this.pause();
		} else {
			this.play();
		}
	}

	/**
	 * Reset the timeline to the beginning
	 */
	reset(): void {
		this.#stopAnimationLoop();
		this.status = 'idle';
		this.currentStepIndex = 0;
		this.currentTime = 0;

		// Notify step change if we have steps
		if (this.#steps.length > 0 && this.#onStepChange) {
			this.#onStepChange(0, this.#steps[0]);
		}
	}

	/**
	 * Stop playback and reset
	 */
	stop(): void {
		this.reset();
	}

	// =========================================================================
	// Step Navigation
	// =========================================================================

	/**
	 * Advance to the next step
	 *
	 * @returns true if advanced, false if already at the end
	 */
	stepForward(): boolean {
		if (!this.hasNext) return false;

		const nextIndex = this.currentStepIndex + 1;
		this.seekToStep(nextIndex);
		return true;
	}

	/**
	 * Go back to the previous step
	 *
	 * @returns true if moved back, false if already at the beginning
	 */
	stepBackward(): boolean {
		if (!this.hasPrev) return false;

		const prevIndex = this.currentStepIndex - 1;
		this.seekToStep(prevIndex);
		return true;
	}

	/**
	 * Seek to a specific step
	 *
	 * @param index - Step index to seek to
	 */
	seekToStep(index: number): void {
		if (this.#steps.length === 0) return;

		const clampedIndex = Math.max(0, Math.min(this.#steps.length - 1, index));

		if (clampedIndex === this.currentStepIndex) return;

		const timing = this.#stepTimings[clampedIndex];
		if (!timing) return;

		const previousIndex = this.currentStepIndex;
		this.currentStepIndex = clampedIndex;
		this.currentTime = timing.startTime;

		// Notify step change
		if (this.#onStepChange && previousIndex !== clampedIndex) {
			this.#onStepChange(clampedIndex, this.#steps[clampedIndex]);
		}
	}

	/**
	 * Seek to a specific time
	 *
	 * @param time - Time in milliseconds
	 */
	seekToTime(time: number): void {
		if (this.#steps.length === 0) return;

		const clampedTime = Math.max(0, Math.min(this.totalDuration, time));
		this.currentTime = clampedTime;

		// Find the corresponding step
		const newStepIndex = this.#findStepAtTime(clampedTime);

		if (newStepIndex !== this.currentStepIndex) {
			const previousIndex = this.currentStepIndex;
			this.currentStepIndex = newStepIndex;

			if (this.#onStepChange && previousIndex !== newStepIndex) {
				this.#onStepChange(newStepIndex, this.#steps[newStepIndex]);
			}
		}

		// Notify time update
		if (this.#onTimeUpdate) {
			this.#onTimeUpdate(this.currentTime, this.progress);
		}
	}

	/**
	 * Seek to a progress value (0 to 1)
	 *
	 * @param progress - Progress value between 0 and 1
	 */
	seekToProgress(progress: number): void {
		const clampedProgress = Math.max(0, Math.min(1, progress));
		const time = clampedProgress * this.totalDuration;
		this.seekToTime(time);
	}

	// =========================================================================
	// Scrubbing (Interactive Seeking)
	// =========================================================================

	/**
	 * Scrub to a specific time (pauses automatically)
	 *
	 * Use this for interactive scrubbing where the user drags a slider.
	 * Automatically pauses playback while scrubbing.
	 *
	 * @param time - Time in milliseconds
	 */
	scrub(time: number): void {
		// Pause if playing
		if (this.isPlaying) {
			this.pause();
		}

		// Set status to paused (not idle) to indicate scrubbing state
		if (this.status === 'idle') {
			this.status = 'paused';
		}

		this.seekToTime(time);
	}

	/**
	 * Scrub to a progress value (0 to 1), pauses automatically
	 *
	 * Use this for interactive scrubbing where the user drags a progress slider.
	 *
	 * @param progress - Progress value between 0 and 1
	 */
	scrubByProgress(progress: number): void {
		const clampedProgress = Math.max(0, Math.min(1, progress));
		const time = clampedProgress * this.totalDuration;
		this.scrub(time);
	}

	// =========================================================================
	// Convenient Seek Aliases
	// =========================================================================

	/**
	 * Seek to a specific time (alias for seekToTime)
	 *
	 * @param time - Time in milliseconds
	 */
	seek(time: number): void {
		this.seekToTime(time);
	}

	/**
	 * Seek by progress value (alias for seekToProgress)
	 *
	 * @param progress - Progress value between 0 and 1
	 */
	seekByProgress(progress: number): void {
		this.seekToProgress(progress);
	}

	// =========================================================================
	// Playback Rate
	// =========================================================================

	/**
	 * Set the playback rate
	 *
	 * @param rate - Playback rate (0.25 to 4)
	 */
	setPlaybackRate(rate: number): void {
		this.playbackRate = clampPlaybackRate(rate);
	}

	/**
	 * Increase playback rate
	 */
	speedUp(): void {
		this.setPlaybackRate(this.playbackRate * 1.5);
	}

	/**
	 * Decrease playback rate
	 */
	slowDown(): void {
		this.setPlaybackRate(this.playbackRate / 1.5);
	}

	/**
	 * Reset playback rate to 1x
	 */
	resetSpeed(): void {
		this.playbackRate = 1;
	}

	// =========================================================================
	// Animation Loop
	// =========================================================================

	/**
	 * Start the animation loop
	 */
	#startAnimationLoop(): void {
		if (this.#rafId !== null) return;

		const animate = (timestamp: number) => {
			if (this.status !== 'playing') {
				this.#rafId = null;
				return;
			}

			// Calculate delta time
			if (this.#lastTimestamp === 0) {
				this.#lastTimestamp = timestamp;
			}
			const deltaTime = (timestamp - this.#lastTimestamp) * this.playbackRate;
			this.#lastTimestamp = timestamp;

			// Update current time
			const newTime = this.currentTime + deltaTime;

			if (newTime >= this.totalDuration) {
				// Playback complete
				this.currentTime = this.totalDuration;
				this.currentStepIndex = this.#steps.length - 1;
				this.status = 'idle';
				this.#rafId = null;

				if (this.#onTimeUpdate) {
					this.#onTimeUpdate(this.currentTime, 1);
				}
				if (this.#onComplete) {
					this.#onComplete();
				}
				return;
			}

			this.currentTime = newTime;

			// Check for step changes
			const newStepIndex = this.#findStepAtTime(newTime);
			if (newStepIndex !== this.currentStepIndex) {
				const previousIndex = this.currentStepIndex;
				this.currentStepIndex = newStepIndex;

				if (this.#onStepChange && previousIndex !== newStepIndex) {
					this.#onStepChange(newStepIndex, this.#steps[newStepIndex]);
				}
			}

			// Notify time update
			if (this.#onTimeUpdate) {
				this.#onTimeUpdate(this.currentTime, this.progress);
			}

			// Continue animation
			this.#rafId = requestAnimationFrame(animate);
		};

		this.#rafId = requestAnimationFrame(animate);
	}

	/**
	 * Stop the animation loop
	 */
	#stopAnimationLoop(): void {
		if (this.#rafId !== null) {
			cancelAnimationFrame(this.#rafId);
			this.#rafId = null;
		}
		this.#lastTimestamp = 0;
	}

	/**
	 * Find the step index at a given time
	 *
	 * @param time - Time in milliseconds
	 * @returns Step index
	 */
	#findStepAtTime(time: number): number {
		if (this.#stepTimings.length === 0) return 0;

		// Binary search for efficiency
		let low = 0;
		let high = this.#stepTimings.length - 1;

		while (low < high) {
			const mid = Math.floor((low + high + 1) / 2);
			if (this.#stepTimings[mid].startTime <= time) {
				low = mid;
			} else {
				high = mid - 1;
			}
		}

		return low;
	}

	// =========================================================================
	// Getters for Step Information
	// =========================================================================

	/**
	 * Get timing information for a specific step
	 *
	 * @param index - Step index
	 * @returns Step timing or null if index is invalid
	 */
	getStepTiming(index: number): StepTiming | null {
		return this.#stepTimings[index] ?? null;
	}

	/**
	 * Get all step timings
	 *
	 * @returns Array of step timings
	 */
	getAllStepTimings(): readonly StepTiming[] {
		return this.#stepTimings;
	}

	/**
	 * Get a step by index
	 *
	 * @param index - Step index
	 * @returns Step or null if index is invalid
	 */
	getStep(index: number): Step | null {
		return this.#steps[index] ?? null;
	}

	// =========================================================================
	// Cleanup
	// =========================================================================

	/**
	 * Clean up resources
	 *
	 * Call this when the timeline is no longer needed.
	 */
	destroy(): void {
		this.#stopAnimationLoop();
		this.#steps = [];
		this.#stepTimings = [];
		this.#onStepChange = undefined;
		this.#onTimeUpdate = undefined;
		this.#onComplete = undefined;
	}
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new Timeline instance
 *
 * @param options - Configuration options
 * @returns New Timeline instance
 */
export function createTimeline(options?: TimelineOptions): Timeline {
	return new Timeline(options);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format time in milliseconds to a display string
 *
 * @param ms - Time in milliseconds
 * @returns Formatted string (e.g., "1:23.4")
 */
export function formatTime(ms: number): string {
	const totalSeconds = ms / 1000;
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;

	if (minutes > 0) {
		return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
	}
	return `${seconds.toFixed(1)}s`;
}

/**
 * Format playback rate for display
 *
 * @param rate - Playback rate
 * @returns Formatted string (e.g., "1.5x")
 */
export function formatPlaybackRate(rate: number): string {
	return `${rate.toFixed(rate === Math.floor(rate) ? 0 : 1)}x`;
}
