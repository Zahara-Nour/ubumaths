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
	/** Fragment count for current slide */
	readonly fragmentCount: number;
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
	/** Get total fragments for current slide */
	getTotalFragments(): number;
	/** Get vertical count for a horizontal index */
	getVerticalCount(h: number): number;
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

	// Derived values
	const totalH = $derived(slides.size);
	const fragmentCount = $derived.by(() => {
		const slide = getSlide(state.h, state.v);
		return slide?.fragmentCount ?? 0;
	});
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
	 * Get total fragments for current slide
	 */
	function getTotalFragments(): number {
		const slide = getSlide(state.h, state.v);
		return slide?.fragmentCount ?? 0;
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
	 * Navigate to specific position
	 */
	function goTo(h: number, v: number = 0, f: number = -1): void {
		const clamped = clampPosition(h, v);
		const totalFragments = getSlide(clamped.h, clamped.v)?.fragmentCount ?? 0;
		const clampedF = Math.max(-1, Math.min(f, totalFragments - 1));

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

		// Try to go to next vertical slide
		const maxV = getVerticalCount(state.h) - 1;
		if (state.v < maxV) {
			state.v++;
			state.f = -1;
			return;
		}

		// Go to next horizontal slide
		const maxH = slides.size - 1;
		if (state.h < maxH) {
			state.h++;
			state.v = 0;
			state.f = -1;
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

		// Try to go to previous vertical slide
		if (state.v > 0) {
			const newV = state.v - 1;
			const slide = getSlide(state.h, newV);
			state.v = newV;
			// Show all fragments of previous slide
			state.f = (slide?.fragmentCount ?? 0) - 1;
			return;
		}

		// Go to previous horizontal slide
		if (state.h > 0) {
			const newH = state.h - 1;
			const newV = Math.max(0, getVerticalCount(newH) - 1);
			const slide = getSlide(newH, newV);
			state.h = newH;
			// Go to last vertical slide of previous horizontal
			state.v = newV;
			// Show all fragments
			state.f = (slide?.fragmentCount ?? 0) - 1;
		}
	}

	/**
	 * Go to next horizontal slide (skip verticals)
	 */
	function nextH(): void {
		const maxH = slides.size - 1;
		if (state.h < maxH) {
			state.h++;
			state.v = 0;
			state.f = -1;
		}
	}

	/**
	 * Go to previous horizontal slide (skip verticals)
	 */
	function prevH(): void {
		if (state.h > 0) {
			state.h--;
			state.v = 0;
			state.f = -1;
		}
	}

	/**
	 * Go to next vertical slide
	 */
	function nextV(): void {
		const maxV = getVerticalCount(state.h) - 1;
		if (state.v < maxV) {
			state.v++;
			state.f = -1;
		}
	}

	/**
	 * Go to previous vertical slide
	 */
	function prevV(): void {
		if (state.v > 0) {
			state.v--;
			state.f = -1;
		}
	}

	/**
	 * Go down (next vertical slide only - no fallback to horizontal)
	 */
	function down(): void {
		const maxV = getVerticalCount(state.h) - 1;
		if (state.v < maxV) {
			state.v++;
			state.f = -1;
		}
		// Do nothing if no vertical slides below
	}

	/**
	 * Go up (previous vertical slide only - no fallback to horizontal)
	 */
	function up(): void {
		if (state.v > 0) {
			state.v--;
			state.f = -1;
		}
		// Do nothing if already at top of vertical stack
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
				fragmentCount: 0,
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
	 * Update fragment count for a slide
	 */
	function updateFragmentCount(h: number, v: number, count: number): void {
		const slide = getSlide(h, v);
		if (slide) {
			slide.fragmentCount = count;
			// Trigger reactivity
			slides = new Map(slides);
		}
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
		get fragmentCount() {
			return fragmentCount;
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
		updateFragmentCount,
		toggleOverview,
		setOverview,
		togglePause,
		setScale
	};
}

export type { SlideInfo, NavigationState };
