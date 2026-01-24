/**
 * UbuSlides - Type definitions
 * Wrapper around reveal.js for UbuMaths
 */

import type Reveal from 'reveal.js';

// Re-export Reveal types
export type RevealInstance = Reveal.Api;
export type RevealOptions = Reveal.Options;

/**
 * Transition types supported by reveal.js
 */
export type SlideTransition = 'none' | 'fade' | 'slide' | 'convex' | 'concave' | 'zoom';

/**
 * Transition speed
 */
export type TransitionSpeed = 'default' | 'fast' | 'slow';

/**
 * Navigation mode
 */
export type NavigationMode = 'default' | 'linear' | 'grid';

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
 * Deck configuration - extends reveal.js options with UbuMaths specifics
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
	controlsTutorial?: boolean;
	controlsLayout?: 'bottom-right' | 'edges';
	controlsBackArrows?: 'faded' | 'hidden' | 'visible';
	navigationMode?: NavigationMode;
	keyboard?: boolean;
	touch?: boolean;
	mouseWheel?: boolean;
	loop?: boolean;
	rtl?: boolean;
	shuffle?: boolean;

	// Progress & Status
	progress?: boolean;
	slideNumber?: boolean | string | ((slide: { h: number; v: number }) => string);
	hash?: boolean;
	history?: boolean;
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
	autoAnimateUnmatched?: boolean;

	// Appearance
	embedded?: boolean;
	help?: boolean;
	pause?: boolean;
	showNotes?: boolean;
	hideInactiveCursor?: boolean;
	hideCursorTime?: number;

	// Performance
	viewDistance?: number;
	mobileViewDistance?: number;
	preloadIframes?: boolean | null;

	// Plugins
	plugins?: Reveal.PluginFunction[];
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
	/** Custom state class added to reveal element */
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
}

/**
 * Deck state
 */
export interface DeckState {
	indexh: number;
	indexv: number;
	indexf?: number;
	paused: boolean;
	overview: boolean;
}

/**
 * Slide changed event data
 */
export interface SlideChangedEvent {
	indexh: number;
	indexv: number;
	previousSlide: HTMLElement | null;
	currentSlide: HTMLElement;
}

/**
 * Fragment event data
 */
export interface FragmentEvent {
	fragment: HTMLElement;
	fragments: HTMLElement[];
}

/**
 * Deck context provided to child components
 */
export interface DeckContext {
	/** Get the reveal.js instance */
	getReveal: () => RevealInstance | undefined;
	/** Check if deck is ready */
	isReady: () => boolean;
	/** Navigate to slide */
	slide: (h: number, v?: number, f?: number) => void;
	/** Go to next slide */
	next: () => void;
	/** Go to previous slide */
	prev: () => void;
	/** Get current indices */
	getIndices: () => { h: number; v: number; f: number };
	/** Get total slides count */
	getTotalSlides: () => number;
}
