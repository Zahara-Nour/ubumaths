/**
 * Selected Period Store
 * =====================
 *
 * Manages the currently selected academic period in the teacher dashboard with localStorage persistence.
 *
 * ARCHITECTURE:
 * -------------
 * - Uses Svelte 5 runes ($state) for reactivity
 * - Lazy initialization from localStorage (only on first access)
 * - Server-safe: All localStorage operations are guarded by `typeof window` checks
 * - Auto-hydration is handled by the teacher layout, not by this store
 *
 * USAGE:
 * ------
 * ```typescript
 * import { getSelectedPeriodId, setSelectedPeriod, selectedPeriodStore } from '$lib/stores/selectedPeriod.svelte';
 *
 * // Get current selection
 * const periodId = getSelectedPeriodId();
 *
 * // Update selection (auto-persists to localStorage)
 * setSelectedPeriod('period-uuid-123');
 *
 * // Or use reactive store in components
 * const store = selectedPeriodStore();
 * let localPeriodId = $state(store.id);
 * $effect(() => {
 *   if (localPeriodId) {
 *     store.set(localPeriodId);
 *   }
 * });
 * ```
 *
 * PERSISTENCE:
 * ------------
 * - Key: 'teacher_selected_period_id'
 * - Stored as raw UUID string
 * - Survives page reloads and browser restarts
 * - Cleared only when clearSelectedPeriod() is called or teacher logs out
 *
 * AUTO-HYDRATION:
 * ---------------
 * Period initialization is handled automatically by the teacher layout
 * (/dashboard/teacher/+layout.svelte) which auto-selects the current period if none selected.
 */

import type { Database } from '$lib/types/database';

type AcademicPeriod = Database['public']['Tables']['academic_periods']['Row'];

// localStorage key for persisting selected period ID
const STORAGE_KEY = 'teacher_selected_period_id';

// Reactive state: Currently selected period ID (null = no selection)
let selectedPeriodId = $state<string | null>(null);

// Lazy initialization flag to prevent multiple localStorage reads
let initialized = false;

/**
 * Ensure store is initialized from localStorage
 * Called automatically by all exported functions
 * Only runs once per session (guarded by `initialized` flag)
 */
function ensureInitialized() {
	// Only initialize once and only in browser environment
	if (!initialized && typeof window !== 'undefined') {
		// Attempt to restore previous selection from localStorage
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			selectedPeriodId = stored;
		}
		initialized = true;
	}
}

/**
 * Get the currently selected period ID
 *
 * @returns UUID string of selected period, or null if no period is selected
 *
 * @example
 * const periodId = getSelectedPeriodId();
 * if (periodId) {
 *   // Teacher has a period selected
 * }
 */
export function getSelectedPeriodId(): string | null {
	ensureInitialized();
	return selectedPeriodId;
}

/**
 * Set the selected period ID and persist to localStorage
 *
 * @param periodId - UUID of the period to select
 *
 * @example
 * setSelectedPeriod('abc-123-def-456');
 */
export function setSelectedPeriod(periodId: string): void {
	// Update reactive state
	selectedPeriodId = periodId;

	// Persist to localStorage (browser only)
	if (typeof window !== 'undefined') {
		localStorage.setItem(STORAGE_KEY, periodId);
	}
}

/**
 * Clear the selected period and remove from localStorage
 *
 * @example
 * clearSelectedPeriod(); // Teacher must manually select a period again
 */
export function clearSelectedPeriod(): void {
	// Clear reactive state
	selectedPeriodId = null;

	// Remove from localStorage (browser only)
	if (typeof window !== 'undefined') {
		localStorage.removeItem(STORAGE_KEY);
	}
}

/**
 * Find the selected period object from an array of periods
 *
 * Helper function to get the full period object (not just ID).
 * Returns undefined if no period is selected or period not found in array.
 *
 * @param periods - Array of periods to search
 * @returns Period object if found, undefined otherwise
 *
 * @example
 * const periods = [{ id: 'abc-123', name: 'Trimestre 1' }, ...];
 * const selected = findSelectedPeriod(periods);
 * if (selected) {
 *   console.log(selected.name); // 'Trimestre 1'
 * }
 */
export function findSelectedPeriod(periods: AcademicPeriod[]): AcademicPeriod | undefined {
	ensureInitialized();

	// No selection or empty array
	if (!selectedPeriodId || periods.length === 0) {
		return undefined;
	}

	// Find period by ID
	return periods.find((p) => p.id === selectedPeriodId);
}

/**
 * Reactive getter for use in Svelte components (advanced usage)
 *
 * Returns an object with reactive getter for use with $derived.
 * Most components should use getSelectedPeriodId() directly instead.
 *
 * @returns Object with reactive id getter and setter functions
 *
 * @example
 * const store = selectedPeriodStore();
 * const periodId = $derived(store.id); // Reactive
 * store.set('new-period-id');
 */
export function selectedPeriodStore() {
	ensureInitialized();
	return {
		get id() {
			return selectedPeriodId;
		},
		set: setSelectedPeriod,
		clear: clearSelectedPeriod
	};
}
