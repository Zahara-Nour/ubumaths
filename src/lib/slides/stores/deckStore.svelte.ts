/**
 * DeckStore - Core navigation state for slide deck
 *
 * Factory function that creates a reactive store instance per Deck.
 * Uses Svelte 5 runes for reactivity.
 */

import type { SlideInfo, NavigationState, DeckStoreActions } from '../core/types.js';

export interface DeckStore extends DeckStoreActions {
	/** Current horizontal index (0-based) */
	readonly h: number;
	/** Current vertical index (0-based) */
	readonly v: number;
	/** Current fragment index (-1 = none shown) */
	readonly f: number;
	/** Total number of horizontal slides */
	readonly totalH: number;
	/** Whether current horizontal has vertical slides */
	readonly hasVerticalSlides: boolean;
	/** Vertical slide count for current horizontal */
	readonly verticalCount: number;
	/** Whether overview mode is active */
	readonly overview: boolean;
	/** Whether deck is paused */
	readonly paused: boolean;
	/** Scale factor for content */
	readonly scale: number;
	/** Get current navigation state */
	readonly state: NavigationState;
	/** Get slide info at position */
	getSlide(h: number, v?: number): SlideInfo | undefined;
	/** Get total fragments for current slide (queries DOM) */
	getTotalFragments(): number;
	/** Get vertical count for a horizontal index */
	getVerticalCount(h: number): number;
	/** Claim the next horizontal index (for synchronous ordering) */
	claimNextH(): number;
	/** Go up (previous vertical) */
	up(): void;
	/** Go down (next vertical) */
	down(): void;
}

interface DeckStoreState {
	h: number;
	v: number;
	f: number;
	overview: boolean;
	paused: boolean;
	scale: number;
}

/**
 * Creates a new DeckStore instance
 *
 * Each Deck component should create its own store instance
 * and provide it via Svelte context.
 */
export function createDeckStore(): DeckStore {
	// Reactive state
	const state = $state<DeckStoreState>({
		h: 0,
		v: 0,
		f: -1,
		overview: false,
		paused: false,
		scale: 1
	});

	// Slide registry: Map<horizontal index, SlideInfo[]>
	// Each horizontal index maps to an array of vertical slides
	let slides = $state<Map<number, SlideInfo[]>>(new Map());

	// Counter for claiming h indices (incremented synchronously during script execution)
	// This ensures correct ordering even when slides with vertical children need to know
	// their h index before onMount (so they can pass it to children via context)
	let nextHIndex = 0;

	// Memory for vertical positions (like reveal.js)
	// When navigating horizontally, we save/restore vertical positions
	const verticalMemory = new Map<number, number>();

	// Memory for fragment positions (like reveal.js)
	// When leaving a slide, we save fragment position; when returning, we restore it
	// Key is "h-v" string, value is fragment index
	const fragmentMemory = new Map<string, number>();

	/**
	 * Get fragment memory key for a slide position
	 */
	function getFragmentKey(h: number, v: number): string {
		return `${h}-${v}`;
	}

	/**
	 * Save current fragment position to memory
	 */
	function saveFragmentPosition(): void {
		if (state.f >= 0) {
			fragmentMemory.set(getFragmentKey(state.h, state.v), state.f);
		}
	}

	/**
	 * Get saved fragment position for a slide, or -1 if none
	 */
	function getSavedFragmentPosition(h: number, v: number): number {
		return fragmentMemory.get(getFragmentKey(h, v)) ?? -1;
	}

	// Derived values
	const totalH = $derived(slides.size);
	const verticalCount = $derived(getVerticalCount(state.h));
	const hasVerticalSlides = $derived(verticalCount > 1);

	/**
	 * Get slide info at position
	 */
	function getSlide(h: number, v: number = 0): SlideInfo | undefined {
		const verticalStack = slides.get(h);
		if (!verticalStack) return undefined;
		return verticalStack[v];
	}

	/**
	 * Get total vertical slides for a horizontal index
	 */
	function getVerticalCount(h: number): number {
		const verticalStack = slides.get(h);
		return verticalStack?.length ?? 0;
	}

	/**
	 * Get total fragments for current slide (queries DOM like reveal.js)
	 */
	function getTotalFragments(): number {
		const slide = getSlide(state.h, state.v);
		if (!slide?.element) return 0;
		return slide.element.querySelectorAll('.fragment').length;
	}

	/**
	 * Clamp position to valid bounds
	 */
	function clampPosition(h: number, v: number): { h: number; v: number } {
		const maxH = Math.max(0, slides.size - 1);
		const clampedH = Math.max(0, Math.min(h, maxH));
		const maxV = Math.max(0, getVerticalCount(clampedH) - 1);
		const clampedV = Math.max(0, Math.min(v, maxV));
		return { h: clampedH, v: clampedV };
	}

	/**
	 * Get fragment count for a specific slide (queries DOM)
	 */
	function getFragmentCount(h: number, v: number): number {
		const slide = getSlide(h, v);
		if (!slide?.element) return 0;
		return slide.element.querySelectorAll('.fragment').length;
	}

	/**
	 * Navigate to specific position
	 * If f is not specified (-1), restores saved fragment position for the target slide
	 */
	function goTo(h: number, v: number = 0, f: number = -1): void {
		// Save current fragment position before leaving
		saveFragmentPosition();

		const clamped = clampPosition(h, v);
		const totalFragments = getFragmentCount(clamped.h, clamped.v);

		// If f not specified, try to restore saved position
		let targetF = f;
		if (f === -1) {
			targetF = getSavedFragmentPosition(clamped.h, clamped.v);
		}
		const clampedF = Math.max(-1, Math.min(targetF, totalFragments - 1));

		state.h = clamped.h;
		state.v = clamped.v;
		state.f = clampedF;
	}

	/**
	 * Go to next slide/fragment
	 */
	function next(): void {
		const totalFragments = getTotalFragments();

		// If there are more fragments to show
		if (state.f < totalFragments - 1) {
			state.f++;
			return;
		}

		// Save fragment position before leaving this slide
		saveFragmentPosition();

		// Try to go to next vertical slide
		const maxV = getVerticalCount(state.h) - 1;
		if (state.v < maxV) {
			const newV = state.v + 1;
			state.v = newV;
			state.f = getSavedFragmentPosition(state.h, newV);
			return;
		}

		// Go to next horizontal slide
		const maxH = slides.size - 1;
		if (state.h < maxH) {
			const newH = state.h + 1;
			state.h = newH;
			state.v = 0;
			state.f = getSavedFragmentPosition(newH, 0);
		}
	}

	/**
	 * Go to previous slide/fragment
	 */
	function prev(): void {
		// If there are fragments shown, hide one
		if (state.f >= 0) {
			state.f--;
			return;
		}

		// Save fragment position before leaving this slide
		saveFragmentPosition();

		// Try to go to previous vertical slide
		if (state.v > 0) {
			const newV = state.v - 1;
			state.v = newV;
			// Restore saved fragment position, or show all fragments if never visited
			const savedF = getSavedFragmentPosition(state.h, newV);
			state.f = savedF >= 0 ? savedF : getFragmentCount(state.h, newV) - 1;
			return;
		}

		// Go to previous horizontal slide
		if (state.h > 0) {
			const newH = state.h - 1;
			const newV = Math.max(0, getVerticalCount(newH) - 1);
			state.h = newH;
			state.v = newV;
			// Restore saved fragment position, or show all fragments if never visited
			const savedF = getSavedFragmentPosition(newH, newV);
			state.f = savedF >= 0 ? savedF : getFragmentCount(newH, newV) - 1;
		}
	}

	/**
	 * Go to next horizontal slide (skip verticals)
	 * Saves current vertical/fragment position and restores target's saved position (like reveal.js)
	 */
	function nextH(): void {
		const maxH = slides.size - 1;
		if (state.h < maxH) {
			// Save current positions before leaving
			saveFragmentPosition();
			if (getVerticalCount(state.h) > 1) {
				verticalMemory.set(state.h, state.v);
			}

			const targetH = state.h + 1;
			// Restore saved vertical position for target, or default to 0
			const targetV = verticalMemory.get(targetH) ?? 0;
			// Clamp to valid range
			const maxV = Math.max(0, getVerticalCount(targetH) - 1);
			const finalV = Math.min(targetV, maxV);

			state.h = targetH;
			state.v = finalV;
			state.f = getSavedFragmentPosition(targetH, finalV);
		}
	}

	/**
	 * Go to previous horizontal slide (skip verticals)
	 * Saves current vertical/fragment position and restores target's saved position (like reveal.js)
	 */
	function prevH(): void {
		if (state.h > 0) {
			// Save current positions before leaving
			saveFragmentPosition();
			if (getVerticalCount(state.h) > 1) {
				verticalMemory.set(state.h, state.v);
			}

			const targetH = state.h - 1;
			// Restore saved vertical position for target, or default to 0
			const targetV = verticalMemory.get(targetH) ?? 0;
			// Clamp to valid range
			const maxV = Math.max(0, getVerticalCount(targetH) - 1);
			const finalV = Math.min(targetV, maxV);

			state.h = targetH;
			state.v = finalV;
			// Restore saved fragment position, or show all if going backward and never visited
			const savedF = getSavedFragmentPosition(targetH, finalV);
			state.f = savedF >= 0 ? savedF : getFragmentCount(targetH, finalV) - 1;
		}
	}

	/**
	 * Go to next vertical slide
	 */
	function nextV(): void {
		const maxV = getVerticalCount(state.h) - 1;
		if (state.v < maxV) {
			saveFragmentPosition();
			const newV = state.v + 1;
			state.v = newV;
			state.f = getSavedFragmentPosition(state.h, newV);
		}
	}

	/**
	 * Go to previous vertical slide
	 */
	function prevV(): void {
		if (state.v > 0) {
			saveFragmentPosition();
			const newV = state.v - 1;
			state.v = newV;
			const savedF = getSavedFragmentPosition(state.h, newV);
			state.f = savedF >= 0 ? savedF : getFragmentCount(state.h, newV) - 1;
		}
	}

	/**
	 * Go down (next vertical slide only - no fallback to horizontal)
	 */
	function down(): void {
		const maxV = getVerticalCount(state.h) - 1;
		if (state.v < maxV) {
			saveFragmentPosition();
			const newV = state.v + 1;
			state.v = newV;
			state.f = getSavedFragmentPosition(state.h, newV);
		}
	}

	/**
	 * Go up (previous vertical slide only - no fallback to horizontal)
	 */
	function up(): void {
		if (state.v > 0) {
			saveFragmentPosition();
			const newV = state.v - 1;
			state.v = newV;
			const savedF = getSavedFragmentPosition(state.h, newV);
			state.f = savedF >= 0 ? savedF : getFragmentCount(state.h, newV) - 1;
		}
		// Do nothing if already at top of vertical stack
	}

	/**
	 * Claim the next horizontal index (called synchronously during script execution)
	 * This ensures correct ordering for slides with vertical children that need to
	 * know their h index before their children mount.
	 */
	function claimNextH(): number {
		const h = nextHIndex;
		nextHIndex++;
		return h;
	}

	/**
	 * Register a slide
	 */
	function registerSlide(info: SlideInfo): void {
		const { h, v } = info;
		const stack = slides.get(h) ?? [];

		// Ensure array has room for this vertical index
		while (stack.length <= v) {
			stack.push({
				h,
				v: stack.length,
				element: null
			});
		}

		stack[v] = info;
		slides.set(h, stack);

		// Trigger reactivity
		slides = new Map(slides);
	}

	/**
	 * Unregister a slide
	 */
	function unregisterSlide(h: number, v: number = 0): void {
		const stack = slides.get(h);
		if (!stack) return;

		if (stack.length === 1 && v === 0) {
			slides.delete(h);
		} else if (v < stack.length) {
			stack.splice(v, 1);
		}

		// Trigger reactivity
		slides = new Map(slides);

		// Adjust current position if needed
		const clamped = clampPosition(state.h, state.v);
		state.h = clamped.h;
		state.v = clamped.v;
	}

	/**
	 * Toggle overview mode
	 */
	function toggleOverview(): void {
		state.overview = !state.overview;
	}

	/**
	 * Set overview mode
	 */
	function setOverview(value: boolean): void {
		state.overview = value;
	}

	/**
	 * Toggle pause state
	 */
	function togglePause(): void {
		state.paused = !state.paused;
	}

	/**
	 * Set scale
	 */
	function setScale(scale: number): void {
		state.scale = scale;
	}

	return {
		// Getters
		get h() {
			return state.h;
		},
		get v() {
			return state.v;
		},
		get f() {
			return state.f;
		},
		get totalH() {
			return totalH;
		},
		get hasVerticalSlides() {
			return hasVerticalSlides;
		},
		get verticalCount() {
			return verticalCount;
		},
		get overview() {
			return state.overview;
		},
		get paused() {
			return state.paused;
		},
		get scale() {
			return state.scale;
		},
		get state(): NavigationState {
			return {
				h: state.h,
				v: state.v,
				f: state.f
			};
		},

		// Methods
		getSlide,
		getVerticalCount,
		getTotalFragments,
		claimNextH,
		goTo,
		next,
		prev,
		nextH,
		prevH,
		nextV,
		prevV,
		up,
		down,
		registerSlide,
		unregisterSlide,
		toggleOverview,
		setOverview,
		togglePause,
		setScale
	};
}

export type { SlideInfo, NavigationState };
