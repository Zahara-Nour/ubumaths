/**
 * UbuSlides - Default configuration
 */

import type { DeckConfig } from './types.js';

/**
 * Default configuration for UbuSlides decks
 * Optimized for math education presentations
 */
export const defaultConfig: DeckConfig = {
	// Layout - 16:9 widescreen for modern displays
	width: 1920,
	height: 1080,
	margin: 0.04,
	minScale: 0.2,
	maxScale: 2.0,
	center: true,

	// Navigation
	controls: true,
	controlsTutorial: true,
	controlsLayout: 'bottom-right',
	controlsBackArrows: 'faded',
	navigationMode: 'default',
	keyboard: true,
	touch: true,
	mouseWheel: false,
	loop: false,
	rtl: false,
	shuffle: false,

	// Progress & Status
	progress: true,
	slideNumber: false,
	hash: true,
	history: false,
	hashOneBasedIndex: false,
	respondToHashChanges: true,

	// Transitions
	transition: 'slide',
	transitionSpeed: 'default',
	backgroundTransition: 'fade',

	// Fragments
	fragments: true,
	fragmentInURL: true,

	// Auto-slide (disabled by default)
	autoSlide: 0,
	autoSlideStoppable: true,

	// Auto-animate
	autoAnimate: true,
	autoAnimateEasing: 'ease',
	autoAnimateDuration: 1.0,
	autoAnimateUnmatched: true,

	// Appearance
	embedded: false,
	help: true,
	pause: true,
	showNotes: false,
	hideInactiveCursor: true,
	hideCursorTime: 5000,

	// Performance
	viewDistance: 3,
	mobileViewDistance: 2,
	preloadIframes: null,

	// Plugins (none by default, added via UbuSlides plugins)
	plugins: []
};

/**
 * Merge user config with defaults
 */
export function mergeConfig(userConfig: Partial<DeckConfig> = {}): DeckConfig {
	return {
		...defaultConfig,
		...userConfig,
		// Merge plugins array
		plugins: [...(defaultConfig.plugins ?? []), ...(userConfig.plugins ?? [])]
	};
}
