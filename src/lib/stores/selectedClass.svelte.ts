/**
 * Selected Class Store
 * ====================
 *
 * Manages the currently selected class in the teacher dashboard with localStorage persistence.
 *
 * ARCHITECTURE:
 * -------------
 * - Uses Svelte 5 runes ($state) for reactivity
 * - Lazy initialization from localStorage (only on first access)
 * - Server-safe: All localStorage operations are guarded by `typeof window` checks
 *
 * USAGE:
 * ------
 * ```typescript
 * import { getSelectedClassId, setSelectedClass } from '$lib/stores/selectedClass.svelte';
 *
 * // Get current selection
 * const classId = getSelectedClassId();
 *
 * // Update selection (auto-persists to localStorage)
 * setSelectedClass('class-uuid-123');
 *
 * // Clear selection
 * clearSelectedClass();
 * ```
 *
 * PERSISTENCE:
 * ------------
 * - Key: 'teacher_selected_class_id'
 * - Stored as raw UUID string
 * - Survives page reloads and browser restarts
 * - Cleared only when clearSelectedClass() is called or teacher logs out
 */

import type { Class } from '$lib/types/database';

// localStorage key for persisting selected class ID
const STORAGE_KEY = 'teacher_selected_class_id';

// Reactive state: Currently selected class ID (null = no selection)
let selectedClassId = $state<string | null>(null);

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
			selectedClassId = stored;
		}
		initialized = true;
	}
}

/**
 * Get the currently selected class ID
 *
 * @returns UUID string of selected class, or null if no class is selected
 *
 * @example
 * const classId = getSelectedClassId();
 * if (classId) {
 *   // Teacher has a class selected
 * }
 */
export function getSelectedClassId(): string | null {
	ensureInitialized();
	return selectedClassId;
}

/**
 * Set the selected class ID and persist to localStorage
 *
 * @param classId - UUID of the class to select
 *
 * @example
 * setSelectedClass('abc-123-def-456');
 */
export function setSelectedClass(classId: string): void {
	// Update reactive state
	selectedClassId = classId;

	// Persist to localStorage (browser only)
	if (typeof window !== 'undefined') {
		localStorage.setItem(STORAGE_KEY, classId);
	}
}

/**
 * Clear the selected class and remove from localStorage
 *
 * @example
 * clearSelectedClass(); // Teacher must manually select a class again
 */
export function clearSelectedClass(): void {
	// Clear reactive state
	selectedClassId = null;

	// Remove from localStorage (browser only)
	if (typeof window !== 'undefined') {
		localStorage.removeItem(STORAGE_KEY);
	}
}

/**
 * Find the selected class object from an array of classes
 *
 * Helper function to get the full class object (not just ID).
 * Returns undefined if no class is selected or class not found in array.
 *
 * @param classes - Array of classes to search
 * @returns Class object if found, undefined otherwise
 *
 * @example
 * const classes = [{ id: 'abc-123', name: 'Math 6A' }, ...];
 * const selected = findSelectedClass(classes);
 * if (selected) {
 *   console.log(selected.name); // 'Math 6A'
 * }
 */
export function findSelectedClass(classes: Class[]): Class | undefined {
	ensureInitialized();

	// No selection or empty array
	if (!selectedClassId || classes.length === 0) {
		return undefined;
	}

	// Find class by ID
	return classes.find((c) => c.id === selectedClassId);
}

/**
 * Reactive getter for use in Svelte components (advanced usage)
 *
 * Returns an object with reactive getter for use with $derived.
 * Most components should use getSelectedClassId() directly instead.
 *
 * @returns Object with reactive id getter and setter functions
 *
 * @example
 * const store = selectedClassStore();
 * const classId = $derived(store.id); // Reactive
 * store.set('new-class-id');
 */
export function selectedClassStore() {
	ensureInitialized();
	return {
		get id() {
			return selectedClassId;
		},
		set: setSelectedClass,
		clear: clearSelectedClass
	};
}
