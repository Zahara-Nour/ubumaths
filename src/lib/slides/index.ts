/**
 * UbuSlides - Slide presentation system for UbuMaths
 * Native Svelte 5 implementation (no reveal.js dependency)
 */

// Core components
export { default as Deck } from './core/Deck.svelte';
export { default as Slide } from './core/Slide.svelte';
export { default as AnnotatableSlide } from './core/AnnotatableSlide.svelte';
export { default as UbuMarkSlide } from './core/UbuMarkSlide.svelte';
export { default as QuestionSlide } from './core/QuestionSlide.svelte';
export { default as WhiteboardSlide } from './core/WhiteboardSlide.svelte';

// Context
export { DECK_CONTEXT_KEY, SLIDE_CONTEXT_KEY, SLIDE_POSITION_KEY } from './core/context.js';

// Configuration
export { defaultConfig, mergeConfig } from './core/config.js';

// Store
export { createDeckStore, type DeckStore } from './stores/deckStore.svelte.js';

// Stores (existing)
export { slideAnnotationStore } from './stores/slideAnnotationStore.svelte.js';

// Transitions
export { slideTransition, slideIn, slideOut } from './transitions/slide.js';
export { fadeTransition, fadeIn, fadeOut } from './transitions/fade.js';

// Navigation
export { createHashNavigation, parseHash, formatHash, syncHashEffect } from './navigation/hash.js';

// Actions
export { keyboard, mergeKeyHandlers } from './actions/keyboard.js';

// Types
export type {
	DeckConfig,
	DeckContext,
	DeckState,
	DeckStoreActions,
	FragmentEvent,
	NavigationState,
	SlideBackground,
	SlideChangedEvent,
	SlideInfo,
	SlideProps,
	SlideTransition,
	TransitionDirection,
	TransitionSpeed,
	NavigationMode
} from './core/types.js';

export { TRANSITION_DURATIONS } from './core/types.js';

export type {
	SlideAnnotationToolType,
	AnnotationStyle
} from './stores/slideAnnotationStore.svelte.js';
