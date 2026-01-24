/**
 * UbuSlides - Type definitions
 * Native Svelte 5 slide system (no reveal.js dependency)
 */

// ============================================================================
// Transition Types
// ============================================================================

/**
 * Available transition types
 */
export type SlideTransition = 'none' | 'fade' | 'slide' | 'convex' | 'concave' | 'zoom';

/**
 * Transition speed
 */
export type TransitionSpeed = 'default' | 'fast' | 'slow';

/**
 * Transition direction
 */
export type TransitionDirection = 'forward' | 'backward';

/**
 * Transition durations in milliseconds
 */
export const TRANSITION_DURATIONS: Record<TransitionSpeed, number> = {
	fast: 400,
	default: 800,
	slow: 1200
};

// ============================================================================
// Navigation Types
// ============================================================================

/**
 * Navigation mode
 */
export type NavigationMode = 'default' | 'linear' | 'grid';

/**
 * Current navigation state
 */
export interface NavigationState {
	h: number; // Horizontal index
	v: number; // Vertical index
	f: number; // Fragment index (-1 = none shown)
}

// ============================================================================
// Slide Types
// ============================================================================

/**
 * Background repeat options
 */
export type BackgroundRepeat = 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat';

/**
 * Background size options
 */
export type BackgroundSize = 'cover' | 'contain' | 'auto' | string;

/**
 * Slide background configuration
 */
export interface SlideBackground {
	color?: string;
	image?: string;
	video?: string;
	iframe?: string;
	size?: BackgroundSize;
	position?: string;
	repeat?: BackgroundRepeat;
	opacity?: number;
}

/**
 * Information about a registered slide
 */
export interface SlideInfo {
	h: number;
	v: number;
	element: HTMLElement | null;
}

/**
 * Slide props
 */
export interface SlideProps {
	/** Transition for this specific slide */
	transition?: SlideTransition;
	/** Transition speed for this slide */
	transitionSpeed?: TransitionSpeed;
	/** Background color */
	background?: string;
	/** Background image URL */
	backgroundImage?: string;
	/** Background video URL */
	backgroundVideo?: string;
	/** Background iframe URL */
	backgroundIframe?: string;
	/** Background size */
	backgroundSize?: BackgroundSize;
	/** Background position */
	backgroundPosition?: string;
	/** Background repeat */
	backgroundRepeat?: BackgroundRepeat;
	/** Background opacity (0-1) */
	backgroundOpacity?: number;
	/** Background transition (can differ from slide transition) */
	backgroundTransition?: SlideTransition;
	/** Allow interaction with background iframe */
	backgroundInteractive?: boolean;
	/** Custom state class added to slide element */
	state?: string;
	/** Auto-slide duration for this slide (ms) */
	autoSlide?: number;
	/** Enable auto-animate for this slide */
	autoAnimate?: boolean;
	/** Auto-animate ID for grouping */
	autoAnimateId?: string;
	/** Visibility */
	visibility?: 'hidden' | 'uncounted';
	/** Additional classes */
	class?: string;
	/** Data attributes */
	data?: Record<string, string>;
	/** Callback when slide active state changes */
	onActiveChange?: (isActive: boolean) => void;
}

// ============================================================================
// Deck Types
// ============================================================================

/**
 * Deck configuration
 */
export interface DeckConfig {
	// Layout
	width?: number;
	height?: number;
	margin?: number;
	minScale?: number;
	maxScale?: number;
	center?: boolean;

	// Navigation
	controls?: boolean;
	controlsLayout?: 'bottom-right' | 'edges';
	controlsBackArrows?: 'faded' | 'hidden' | 'visible';
	navigationMode?: NavigationMode;
	keyboard?: boolean;
	touch?: boolean;
	mouseWheel?: boolean;
	loop?: boolean;
	rtl?: boolean;

	// Progress & Status
	progress?: boolean;
	slideNumber?: boolean | string;
	hash?: boolean;
	hashOneBasedIndex?: boolean;
	respondToHashChanges?: boolean;

	// Transitions
	transition?: SlideTransition;
	transitionSpeed?: TransitionSpeed;
	backgroundTransition?: SlideTransition;

	// Fragments
	fragments?: boolean;
	fragmentInURL?: boolean;

	// Auto-slide
	autoSlide?: number;
	autoSlideStoppable?: boolean;

	// Auto-animate
	autoAnimate?: boolean;
	autoAnimateEasing?: string;
	autoAnimateDuration?: number;

	// Appearance
	embedded?: boolean;
	hideInactiveCursor?: boolean;
	hideCursorTime?: number;

	// Fullscreen mode (position: fixed)
	fullscreen?: boolean;
}

/**
 * Deck state
 */
export interface DeckState {
	h: number;
	v: number;
	f?: number;
	paused: boolean;
	overview: boolean;
}

/**
 * Slide changed event data
 */
export interface SlideChangedEvent {
	h: number;
	v: number;
	f: number;
	previousH: number;
	previousV: number;
}

/**
 * Fragment event data
 */
export interface FragmentEvent {
	fragment: HTMLElement;
	index: number;
}

// ============================================================================
// Store Types
// ============================================================================

/**
 * Actions provided by DeckStore
 */
export interface DeckStoreActions {
	/** Navigate to specific position */
	goTo(h: number, v?: number, f?: number): void;
	/** Go to next slide/fragment */
	next(): void;
	/** Go to previous slide/fragment */
	prev(): void;
	/** Go to next horizontal slide */
	nextH(): void;
	/** Go to previous horizontal slide */
	prevH(): void;
	/** Go to next vertical slide */
	nextV(): void;
	/** Go to previous vertical slide */
	prevV(): void;
	/** Register a slide */
	registerSlide(info: SlideInfo): void;
	/** Unregister a slide */
	unregisterSlide(h: number, v?: number): void;
	/** Toggle overview mode */
	toggleOverview(): void;
	/** Set overview mode */
	setOverview(value: boolean): void;
	/** Toggle pause state */
	togglePause(): void;
	/** Set scale factor */
	setScale(scale: number): void;
}

/**
 * Deck context provided to child components
 */
export interface DeckContext {
	/** Get the store instance */
	getStore: () => import('../stores/deckStore.svelte.js').DeckStore;
	/** Get current indices */
	getIndices: () => NavigationState;
	/** Navigate to slide */
	slide: (h: number, v?: number, f?: number) => void;
	/** Go to next slide */
	next: () => void;
	/** Go to previous slide */
	prev: () => void;
	/** Get current scale */
	getScale: () => number;
	/** Check if deck is in overview mode */
	isOverview: () => boolean;
}
