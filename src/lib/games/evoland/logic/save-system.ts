/**
 * Evoland Save System
 *
 * Handles game state persistence with localStorage and optional Supabase sync.
 * Uses Zod for validation to prevent corrupted save data.
 */

import { z } from 'zod';
import { Direction, WORLD_SIZE, MAX_CHEST_KIND } from './constants';
import type { ProgressionState } from './progression';
import type { SerializedHero } from './hero';

/** Maximum tiles that can be removed (WORLD_SIZE * WORLD_SIZE) */
const MAX_REMOVED_TILES = WORLD_SIZE * WORLD_SIZE;

/** Maximum save file size in bytes (100KB) */
const MAX_SAVE_SIZE = 100 * 1024;

// ============================================================================
// SCHEMAS (Zod validation)
// ============================================================================

/**
 * Schema for progression flags.
 */
const ProgressionFlagsSchema = z.object({
	canMoveLeft: z.boolean(),
	canMoveRight: z.boolean(),
	canMoveAll: z.boolean(),
	freeMovement: z.boolean(),
	mode2D: z.boolean(),
	scrolling: z.boolean(),
	colorLevel: z.number().int().min(0).max(4),
	zoomLevel: z.number().int().min(1).max(3),
	hasWeapon: z.boolean(),
	monstersEnabled: z.boolean(),
	npcsEnabled: z.boolean(),
	canSave: z.boolean(),
	canPushBlock: z.boolean(),
	dungeonAccess: z.boolean(),
	dungeonKillCounter: z.boolean(),
	puzzlesEnabled: z.boolean(),
	levelUpEnabled: z.boolean(),
	farmingEnabled: z.boolean(),
	titleScreenEnabled: z.boolean(),
	soundsEnabled: z.boolean(),
	musicEnabled: z.boolean(),
	diabloMode: z.boolean(),
	webEnabled: z.boolean()
});

/**
 * Schema for progression state.
 */
const ProgressionStateSchema = z.object({
	flags: ProgressionFlagsSchema,
	openedChests: z.array(z.number().int().min(0).max(MAX_CHEST_KIND)).max(MAX_CHEST_KIND + 1),
	scrollLevels: z.record(z.string(), z.number().int().min(0).max(4)),
	gold: z.number().int().min(0).max(99999),
	keys: z.number().int().min(0).max(99),
	xp: z.number().int().min(0).max(999),
	level: z.number().int().min(1).max(99),
	hp: z.number().int().min(0).max(99),
	maxHp: z.number().int().min(1).max(99),
	killCount: z.number().int().min(0).max(99999)
});

/**
 * Schema for hero state.
 */
const HeroStateSchema = z.object({
	x: z
		.number()
		.min(0)
		.max(WORLD_SIZE * 16),
	y: z
		.number()
		.min(0)
		.max(WORLD_SIZE * 16),
	ix: z.number().int().min(0).max(WORLD_SIZE),
	iy: z.number().int().min(0).max(WORLD_SIZE),
	direction: z.number().int().min(0).max(3),
	hp: z.number().int().min(0).max(99),
	inventory: z.object({
		keys: z.number().int().min(0).max(99),
		gold: z.number().int().min(0).max(99999),
		xp: z.number().int().min(0).max(999),
		level: z.number().int().min(1).max(99)
	}),
	flags: z.object({
		canMoveLeft: z.boolean(),
		canMoveAll: z.boolean(),
		freeMovement: z.boolean(),
		hasSword: z.boolean(),
		canPushBlock: z.boolean()
	})
});

/**
 * Schema for world state.
 */
const WorldStateSchema = z.object({
	removedTiles: z.array(z.number().int().min(0)).max(MAX_REMOVED_TILES),
	isDungeon: z.boolean()
});

/**
 * Schema for complete save data.
 */
const SaveDataSchema = z.object({
	version: z.number().int().min(1),
	timestamp: z.number().int().positive(),
	progression: ProgressionStateSchema,
	hero: HeroStateSchema,
	world: WorldStateSchema,
	overworldRemoved: z.array(z.number().int().min(0)).max(MAX_REMOVED_TILES),
	dungeonRemoved: z.array(z.number().int().min(0)).max(MAX_REMOVED_TILES)
});

// ============================================================================
// TYPES
// ============================================================================

/**
 * Complete save data structure.
 */
export interface SaveData {
	/** Save format version */
	version: number;
	/** Save timestamp (ms since epoch) */
	timestamp: number;
	/** Progression state */
	progression: ProgressionState;
	/** Hero state */
	hero: SerializedHero;
	/** World state */
	world: {
		removedTiles: number[];
		isDungeon: boolean;
	};
	/** Removed tiles in overworld */
	overworldRemoved: number[];
	/** Removed tiles in dungeon */
	dungeonRemoved: number[];
}

/**
 * Save slot metadata.
 */
export interface SaveSlot {
	/** Slot index (0-2) */
	slot: number;
	/** Has save data */
	exists: boolean;
	/** Save timestamp */
	timestamp?: number;
	/** Player level */
	level?: number;
	/** Play time (seconds) */
	playTime?: number;
}

/**
 * Save result.
 */
export interface SaveResult {
	success: boolean;
	error?: string;
}

/**
 * Load result.
 */
export interface LoadResult {
	success: boolean;
	data?: SaveData;
	error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Current save format version */
export const SAVE_VERSION = 1;

/** localStorage key prefix */
const STORAGE_KEY_PREFIX = 'evoland_save_';

/** Maximum save slots */
export const MAX_SAVE_SLOTS = 3;

// ============================================================================
// SAVE SYSTEM CLASS
// ============================================================================

/**
 * Manages game save/load operations.
 *
 * Features:
 * - 3 save slots
 * - Zod validation for data integrity
 * - localStorage persistence
 * - Optional Supabase sync (when logged in)
 *
 * @example
 * ```typescript
 * const saveSystem = new SaveSystem();
 *
 * // Save game
 * const result = saveSystem.save(0, gameState);
 *
 * // Load game
 * const loadResult = saveSystem.load(0);
 * if (loadResult.success) {
 *   applyState(loadResult.data);
 * }
 * ```
 */
export class SaveSystem {
	/**
	 * Check if localStorage is available.
	 */
	private isStorageAvailable(): boolean {
		try {
			const test = '__storage_test__';
			localStorage.setItem(test, test);
			localStorage.removeItem(test);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get storage key for a slot.
	 */
	private getStorageKey(slot: number): string {
		return `${STORAGE_KEY_PREFIX}${slot}`;
	}

	// ========================================================================
	// SAVE OPERATIONS
	// ========================================================================

	/**
	 * Save game to a slot.
	 */
	save(slot: number, data: SaveData): SaveResult {
		// Validate slot
		if (slot < 0 || slot >= MAX_SAVE_SLOTS) {
			return { success: false, error: 'Invalid save slot' };
		}

		// Check storage availability
		if (!this.isStorageAvailable()) {
			return { success: false, error: 'localStorage not available' };
		}

		// Validate data
		const validation = SaveDataSchema.safeParse(data);
		if (!validation.success) {
			return { success: false, error: `Invalid save data: ${validation.error.message}` };
		}

		try {
			// Add metadata
			const saveData: SaveData = {
				...data,
				version: SAVE_VERSION,
				timestamp: Date.now()
			};

			// Save to localStorage
			const json = JSON.stringify(saveData);

			// Check save size to prevent DoS
			if (json.length > MAX_SAVE_SIZE) {
				return { success: false, error: 'Save data too large' };
			}

			localStorage.setItem(this.getStorageKey(slot), json);

			return { success: true };
		} catch (err) {
			return { success: false, error: `Failed to save: ${String(err)}` };
		}
	}

	/**
	 * Load game from a slot.
	 */
	load(slot: number): LoadResult {
		// Validate slot
		if (slot < 0 || slot >= MAX_SAVE_SLOTS) {
			return { success: false, error: 'Invalid save slot' };
		}

		// Check storage availability
		if (!this.isStorageAvailable()) {
			return { success: false, error: 'localStorage not available' };
		}

		try {
			const json = localStorage.getItem(this.getStorageKey(slot));
			if (!json) {
				return { success: false, error: 'No save data found' };
			}

			// Parse JSON
			const parsed = JSON.parse(json);

			// Validate data
			const validation = SaveDataSchema.safeParse(parsed);
			if (!validation.success) {
				return { success: false, error: `Corrupted save data: ${validation.error.message}` };
			}

			return { success: true, data: validation.data as SaveData };
		} catch (err) {
			return { success: false, error: `Failed to load: ${String(err)}` };
		}
	}

	/**
	 * Delete save from a slot.
	 */
	delete(slot: number): SaveResult {
		// Validate slot
		if (slot < 0 || slot >= MAX_SAVE_SLOTS) {
			return { success: false, error: 'Invalid save slot' };
		}

		// Check storage availability
		if (!this.isStorageAvailable()) {
			return { success: false, error: 'localStorage not available' };
		}

		try {
			localStorage.removeItem(this.getStorageKey(slot));
			return { success: true };
		} catch (err) {
			return { success: false, error: `Failed to delete: ${String(err)}` };
		}
	}

	// ========================================================================
	// SLOT MANAGEMENT
	// ========================================================================

	/**
	 * Get metadata for all save slots.
	 */
	getSlots(): SaveSlot[] {
		const slots: SaveSlot[] = [];

		for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
			const result = this.load(i);

			if (result.success && result.data) {
				slots.push({
					slot: i,
					exists: true,
					timestamp: result.data.timestamp,
					level: result.data.progression.level
				});
			} else {
				slots.push({
					slot: i,
					exists: false
				});
			}
		}

		return slots;
	}

	/**
	 * Check if a slot has save data.
	 */
	hasData(slot: number): boolean {
		if (slot < 0 || slot >= MAX_SAVE_SLOTS) return false;
		if (!this.isStorageAvailable()) return false;

		const key = this.getStorageKey(slot);
		return localStorage.getItem(key) !== null;
	}

	/**
	 * Get the newest save slot.
	 */
	getNewestSlot(): number | null {
		const slots = this.getSlots();
		const existingSlots = slots.filter((s) => s.exists && s.timestamp);

		if (existingSlots.length === 0) return null;

		existingSlots.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
		return existingSlots[0].slot;
	}

	/**
	 * Clear all save data.
	 */
	clearAll(): void {
		for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
			this.delete(i);
		}
	}
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new save system.
 */
export function createSaveSystem(): SaveSystem {
	return new SaveSystem();
}

/**
 * Create empty save data structure.
 */
export function createEmptySaveData(): SaveData {
	return {
		version: SAVE_VERSION,
		timestamp: Date.now(),
		progression: {
			flags: {
				canMoveLeft: false,
				canMoveRight: true,
				canMoveAll: false,
				freeMovement: false,
				mode2D: false,
				scrolling: false,
				colorLevel: 0,
				zoomLevel: 1,
				hasWeapon: false,
				monstersEnabled: false,
				npcsEnabled: false,
				canSave: false,
				canPushBlock: false,
				dungeonAccess: false,
				dungeonKillCounter: false,
				puzzlesEnabled: false,
				levelUpEnabled: false,
				farmingEnabled: false,
				titleScreenEnabled: false,
				soundsEnabled: false,
				musicEnabled: false,
				diabloMode: false,
				webEnabled: false
			},
			openedChests: [],
			scrollLevels: {},
			gold: 0,
			keys: 0,
			xp: 0,
			level: 1,
			hp: 3,
			maxHp: 3,
			killCount: 0
		},
		hero: {
			x: 0,
			y: 0,
			ix: 0,
			iy: 0,
			direction: Direction.Down,
			hp: 3,
			inventory: {
				keys: 0,
				gold: 0,
				xp: 0,
				level: 1
			},
			flags: {
				canMoveLeft: false,
				canMoveAll: false,
				freeMovement: false,
				hasSword: false,
				canPushBlock: false
			}
		},
		world: {
			removedTiles: [],
			isDungeon: false
		},
		overworldRemoved: [],
		dungeonRemoved: []
	};
}

/**
 * Validate save data.
 */
export function validateSaveData(data: unknown): data is SaveData {
	return SaveDataSchema.safeParse(data).success;
}

/**
 * Format timestamp for display.
 */
export function formatSaveTimestamp(timestamp: number): string {
	const date = new Date(timestamp);
	return date.toLocaleString();
}
