/**
 * Test Mode Store
 * ================
 *
 * Manages teacher test mode toggle state with persistence to localStorage.
 *
 * FEATURES:
 * - Reactive state using Svelte stores
 * - Auto-persists to localStorage
 * - Provides toggle function
 * - Client-side only
 *
 * USAGE:
 * ```svelte
 * <script>
 * import { testMode } from '$lib/stores/test-mode.svelte';
 *
 * // In Svelte component, use $testMode to access reactive value
 * {#if $testMode}
 *   <p>Test mode is enabled</p>
 * {/if}
 *
 * // Toggle test mode
 * <button onclick={() => testMode.toggle()}>Toggle</button>
 * </script>
 * ```
 *
 * NOTE: This store is for client-side UI state only.
 * Server-side filtering should use the user_preferences table.
 */

import { writable } from 'svelte/store';

const STORAGE_KEY = 'teacher_test_mode';

// Load initial value from localStorage (client-side only)
function getInitialValue(): boolean {
	if (typeof window === 'undefined') return false;
	const stored = localStorage.getItem(STORAGE_KEY);
	return stored === 'true';
}

// Create writable store with helper methods
function createTestModeStore() {
	const { subscribe, set, update } = writable(getInitialValue());

	// Auto-persist to localStorage when value changes
	if (typeof window !== 'undefined') {
		subscribe((value) => {
			localStorage.setItem(STORAGE_KEY, String(value));
		});
	}

	return {
		subscribe,
		toggle: () => update((v) => !v),
		set: (value: boolean) => set(value)
	};
}

export const testMode = createTestModeStore();
