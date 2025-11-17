/**
 * Dice Store - Centralized state management for dice roller
 *
 * Provides:
 * - Roll history tracking
 * - Centralized state for multiple dice (future multi-dice support)
 * - Computed totals and statistics
 *
 * Uses Svelte 5 runes for reactive state management
 */

import type { DiceRollResult } from '../types';
import { generateId } from '../utils/uuid';

/**
 * Extended roll result with metadata
 */
export interface RollHistoryEntry {
	/** Unique identifier for this roll */
	id: string;
	/** Roll results by dice type */
	results: DiceRollResult[];
	/** Total value across all dice */
	total: number;
	/** When the roll occurred */
	timestamp: number;
}

/**
 * Create a dice store instance
 *
 * Usage:
 * ```typescript
 * import { diceStore } from '$lib/components/dice/stores/diceStore.svelte';
 *
 * // Add roll to history
 * diceStore.addRoll(results);
 *
 * // Get recent rolls
 * const recent = diceStore.recentRolls;
 * ```
 */
export function createDiceStore() {
	// State
	let rollHistory = $state<RollHistoryEntry[]>([]);
	let maxHistorySize = $state(20); // Keep last 20 rolls

	// Derived state
	const totalRolls = $derived(rollHistory.length);

	const averageTotal = $derived.by(() => {
		if (rollHistory.length === 0) return 0;
		const sum = rollHistory.reduce((acc, entry) => acc + entry.total, 0);
		return Math.round((sum / rollHistory.length) * 10) / 10; // Round to 1 decimal
	});

	const recentRolls = $derived.by(() => {
		// Return last 5 rolls, newest first
		return rollHistory.slice(-5).reverse();
	});

	/**
	 * Add a roll to history
	 *
	 * @param results - Array of dice roll results from a single roll event
	 * @returns void
	 */
	function addRoll(results: DiceRollResult[]) {
		// Validate input - reject empty rolls
		if (!results || results.length === 0) {
			console.warn('diceStore.addRoll: Cannot add empty roll');
			return;
		}

		const total = results.reduce((sum, r) => sum + r.total, 0);

		const entry: RollHistoryEntry = {
			id: generateId(), // Use fallback-safe UUID generation
			results,
			total,
			timestamp: Date.now()
		};

		// Add to history
		rollHistory = [...rollHistory, entry];

		// Trim if exceeds max size
		if (rollHistory.length > maxHistorySize) {
			rollHistory = rollHistory.slice(-maxHistorySize);
		}
	}

	/**
	 * Clear all history
	 */
	function clearHistory() {
		rollHistory = [];
	}

	/**
	 * Get roll by ID
	 */
	function getRollById(id: string): RollHistoryEntry | undefined {
		return rollHistory.find((entry) => entry.id === id);
	}

	/**
	 * Set maximum history size
	 */
	function setMaxHistorySize(size: number) {
		maxHistorySize = Math.max(1, Math.min(100, size)); // Clamp 1-100

		// Trim if needed
		if (rollHistory.length > maxHistorySize) {
			rollHistory = rollHistory.slice(-maxHistorySize);
		}
	}

	return {
		// Getters (reactive)
		get rollHistory() {
			return rollHistory;
		},
		get totalRolls() {
			return totalRolls;
		},
		get averageTotal() {
			return averageTotal;
		},
		get recentRolls() {
			return recentRolls;
		},
		get maxHistorySize() {
			return maxHistorySize;
		},

		// Methods
		addRoll,
		clearHistory,
		getRollById,
		setMaxHistorySize
	};
}

// Global instance (singleton pattern)
export const diceStore = createDiceStore();
