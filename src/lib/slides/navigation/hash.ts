/**
 * Hash-based navigation for UbuSlides
 *
 * Synchronizes slide position with URL hash in format #/h/v/f
 */

import type { DeckStore } from '../stores/deckStore.svelte.js';
import type { NavigationState } from '../core/types.js';

export interface HashNavigationOptions {
	/** Whether to respond to hash changes (default: true) */
	respondToHashChanges?: boolean;
	/** Whether to include fragment in hash (default: true) */
	fragmentInURL?: boolean;
	/** Whether to use one-based indexing (default: false) */
	oneBasedIndex?: boolean;
}

/**
 * Parse hash from URL into navigation state
 *
 * @param hash - URL hash (e.g., "#/2/1/0")
 * @param oneBasedIndex - Whether indices are one-based
 * @returns Navigation state or null if invalid
 */
export function parseHash(hash: string, oneBasedIndex = false): NavigationState | null {
	// Remove leading # and /
	const cleanHash = hash.replace(/^#\/?/, '');
	if (!cleanHash) return null;

	const parts = cleanHash.split('/').map(Number);

	// Validate parts are numbers
	if (parts.some(isNaN)) return null;

	const offset = oneBasedIndex ? 1 : 0;
	const h = (parts[0] ?? 0) - offset;
	const v = (parts[1] ?? 0) - offset;
	const f = (parts[2] ?? -1) - (oneBasedIndex && parts[2] !== undefined ? 1 : 0);

	// Validate indices are non-negative (after offset)
	if (h < 0 || v < 0) return null;

	return { h, v, f };
}

/**
 * Format navigation state as URL hash
 *
 * @param state - Navigation state
 * @param options - Hash options
 * @returns URL hash string (e.g., "#/2/1/0")
 */
export function formatHash(state: NavigationState, options: HashNavigationOptions = {}): string {
	const { fragmentInURL = true, oneBasedIndex = false } = options;

	const offset = oneBasedIndex ? 1 : 0;
	const h = state.h + offset;
	const v = state.v + offset;
	const f = state.f;

	let hash = `#/${h}`;

	// Add vertical index if non-zero or if fragment will be included
	if (v > 0 || (fragmentInURL && f >= 0)) {
		hash += `/${v}`;
	}

	// Add fragment index if enabled and present
	if (fragmentInURL && f >= 0) {
		hash += `/${f + (oneBasedIndex ? 1 : 0)}`;
	}

	return hash;
}

/**
 * Create hash navigation manager
 *
 * @param store - DeckStore instance
 * @param options - Navigation options
 * @returns Cleanup function
 */
export function createHashNavigation(
	store: DeckStore,
	options: HashNavigationOptions = {}
): () => void {
	const { respondToHashChanges = true, oneBasedIndex = false } = options;

	/**
	 * Handle hash change from URL (external navigation)
	 */
	function handleHashChange(): void {
		if (!respondToHashChanges) return;

		const hash = typeof window !== 'undefined' ? window.location.hash : '';
		const state = parseHash(hash, oneBasedIndex);

		if (state) {
			store.goTo(state.h, state.v, state.f);
		}
	}

	// Listen for external hash changes
	// Note: Initial sync is handled by the caller (Deck.svelte)
	if (typeof window !== 'undefined') {
		window.addEventListener('hashchange', handleHashChange);
	}

	// Return cleanup function
	return () => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('hashchange', handleHashChange);
		}
	};
}

/**
 * Reactive hash synchronization effect
 *
 * Call this inside a Svelte 5 $effect to sync hash with store state
 *
 * @param store - DeckStore instance
 * @param options - Hash options
 */
export function syncHashEffect(store: DeckStore, options: HashNavigationOptions = {}): void {
	const { fragmentInURL = true, oneBasedIndex = false } = options;

	// Read reactive state
	const h = store.h;
	const v = store.v;
	const f = store.f;

	const hash = formatHash({ h, v, f }, { fragmentInURL, oneBasedIndex });

	if (typeof window !== 'undefined' && window.location.hash !== hash) {
		const url = new URL(window.location.href);
		url.hash = hash;
		window.history.replaceState(null, '', url);
	}
}
