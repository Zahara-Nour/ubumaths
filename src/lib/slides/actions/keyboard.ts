/**
 * Keyboard navigation action for UbuSlides
 *
 * Svelte action that handles keyboard events for slide navigation.
 * Only active when the element has focus.
 */

import type { DeckStore } from '../stores/deckStore.svelte.js';

export interface KeyboardActionOptions {
	/** DeckStore instance */
	store: DeckStore;
	/** Whether keyboard navigation is enabled */
	enabled?: boolean;
	/** Custom key handlers */
	customHandlers?: Record<string, (store: DeckStore) => void>;
}

/**
 * Default key bindings
 */
const defaultKeyBindings: Record<string, (store: DeckStore) => void> = {
	// Horizontal navigation only (skip verticals, like reveal.js)
	ArrowRight: (store) => store.nextH(),
	ArrowLeft: (store) => store.prevH(),

	// Vertical navigation only
	ArrowDown: (store) => store.down(),
	ArrowUp: (store) => store.up(),

	// Sequential navigation (fragments → verticals → horizontals)
	PageDown: (store) => store.next(),
	PageUp: (store) => store.prev(),
	' ': (store) => store.next(),
	Backspace: (store) => store.prev(),
	n: (store) => store.next(),
	N: (store) => store.next(),
	p: (store) => store.prev(),
	P: (store) => store.prev(),

	// Home/End
	Home: (store) => store.goTo(0, 0, -1),
	End: (store) => store.goTo(Number.MAX_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER),

	// Overview mode
	o: (store) => store.toggleOverview(),
	O: (store) => store.toggleOverview(),
	Escape: (store) => {
		if (store.overview) store.setOverview(false);
	},

	// Pause
	b: (store) => store.togglePause(),
	B: (store) => store.togglePause(),
	'.': (store) => store.togglePause()
};

/**
 * Keyboard navigation action
 *
 * Usage:
 * ```svelte
 * <div use:keyboard={{ store, enabled: true }} tabindex="0">
 *   ...
 * </div>
 * ```
 */
export function keyboard(
	node: HTMLElement,
	options: KeyboardActionOptions
): { update: (options: KeyboardActionOptions) => void; destroy: () => void } {
	let currentOptions = options;

	function handleKeyDown(event: KeyboardEvent) {
		if (!currentOptions.enabled) return;

		// Don't handle if inside an input or textarea
		const target = event.target as HTMLElement;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
			return;
		}

		const key = event.key;
		const { store, customHandlers = {} } = currentOptions;

		// Check custom handlers first
		if (customHandlers[key]) {
			event.preventDefault();
			customHandlers[key](store);
			return;
		}

		// Check default bindings
		if (defaultKeyBindings[key]) {
			event.preventDefault();
			defaultKeyBindings[key](store);
		}
	}

	node.addEventListener('keydown', handleKeyDown);

	return {
		update(newOptions: KeyboardActionOptions) {
			currentOptions = newOptions;
		},
		destroy() {
			node.removeEventListener('keydown', handleKeyDown);
		}
	};
}

/**
 * Helper to merge custom handlers with defaults
 */
export function mergeKeyHandlers(
	custom: Record<string, (store: DeckStore) => void>
): Record<string, (store: DeckStore) => void> {
	return { ...defaultKeyBindings, ...custom };
}
