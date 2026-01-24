/**
 * UbuSlides - Slide presentation system for UbuMaths
 * Built on top of reveal.js
 */

// Core components
export { default as Deck } from './core/Deck.svelte';
export { default as Slide } from './core/Slide.svelte';
export { default as AnnotatableSlide } from './core/AnnotatableSlide.svelte';
export { default as UbuMarkSlide } from './core/UbuMarkSlide.svelte';
export { default as QuestionSlide } from './core/QuestionSlide.svelte';
export { default as WhiteboardSlide } from './core/WhiteboardSlide.svelte';

// Context
export { DECK_CONTEXT_KEY } from './core/context.js';

// Configuration
export { defaultConfig, mergeConfig } from './core/config.js';

// Stores
export { slideAnnotationStore } from './stores/slideAnnotationStore.svelte.js';

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

export type {
	SlideAnnotationToolType,
	AnnotationStyle
} from './stores/slideAnnotationStore.svelte.js';
