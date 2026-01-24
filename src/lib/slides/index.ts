/**
 * UbuSlides - Slide presentation system for UbuMaths
 * Built on top of reveal.js
 */

// Core components
export { default as Deck } from './core/Deck.svelte';
export { default as Slide } from './core/Slide.svelte';
export { default as UbuMarkSlide } from './core/UbuMarkSlide.svelte';

// Context
export { DECK_CONTEXT_KEY } from './core/context.js';

// Configuration
export { defaultConfig, mergeConfig } from './core/config.js';

// Types
export type {
	DeckConfig,
	DeckContext,
	DeckState,
	FragmentEvent,
	RevealInstance,
	RevealOptions,
	SlideBackground,
	SlideChangedEvent,
	SlideProps,
	SlideTransition,
	TransitionSpeed,
	NavigationMode
} from './core/types.js';
