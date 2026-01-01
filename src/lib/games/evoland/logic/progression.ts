/**
 * Evoland Progression System
 *
 * Manages game progression, chest unlocks, and feature flags.
 * Based on the original Chests.hx and Game.hx from Evoland.
 */

import { ChestKind, CHEST_DATA, type ChestData } from './constants';
import type { Hero } from './hero';
import type { World } from './world';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Game feature flags unlocked through progression.
 */
export interface ProgressionFlags {
	// Movement
	canMoveLeft: boolean;
	canMoveRight: boolean;
	canMoveAll: boolean;
	freeMovement: boolean;

	// Display
	mode2D: boolean;
	scrolling: boolean;
	colorLevel: number; // 0-4 (grayscale to full color)
	zoomLevel: number; // 1-3

	// Combat
	hasWeapon: boolean;
	monstersEnabled: boolean;

	// Features
	npcsEnabled: boolean;
	canSave: boolean;
	canPushBlock: boolean;
	dungeonAccess: boolean;
	dungeonKillCounter: boolean;
	puzzlesEnabled: boolean;
	levelUpEnabled: boolean;
	farmingEnabled: boolean;

	// UI
	titleScreenEnabled: boolean;
	soundsEnabled: boolean;
	musicEnabled: boolean;

	// Special
	diabloMode: boolean;
	webEnabled: boolean;
}

/**
 * Chest state in the game world.
 */
export interface ChestState {
	/** Grid X position */
	readonly x: number;
	/** Grid Y position */
	readonly y: number;
	/** Chest content type */
	readonly kind: ChestKind;
	/** Has been opened */
	opened: boolean;
}

/**
 * Scroll level state (some chests have multiple levels).
 */
export interface ScrollLevel {
	current: number;
	max: number;
}

/**
 * Complete progression state for save/load.
 */
export interface ProgressionState {
	readonly flags: ProgressionFlags;
	readonly openedChests: number[]; // ChestKind values
	readonly scrollLevels: Record<number, number>; // ChestKind -> level
	readonly gold: number;
	readonly keys: number;
	readonly xp: number;
	readonly level: number;
	readonly hp: number;
	readonly maxHp: number;
	readonly killCount: number;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Create default progression flags (all disabled).
 */
export function createDefaultFlags(): ProgressionFlags {
	return {
		// Movement - start with only right movement
		canMoveLeft: false,
		canMoveRight: true,
		canMoveAll: false,
		freeMovement: false,

		// Display - start with minimal display
		mode2D: false,
		scrolling: false,
		colorLevel: 0, // Grayscale
		zoomLevel: 1,

		// Combat - disabled at start
		hasWeapon: false,
		monstersEnabled: false,

		// Features - disabled at start
		npcsEnabled: false,
		canSave: false,
		canPushBlock: false,
		dungeonAccess: false,
		dungeonKillCounter: false,
		puzzlesEnabled: false,
		levelUpEnabled: false,
		farmingEnabled: false,

		// UI - disabled at start
		titleScreenEnabled: false,
		soundsEnabled: false,
		musicEnabled: false,

		// Special
		diabloMode: false,
		webEnabled: false
	};
}

/**
 * Create default progression state.
 */
export function createDefaultProgression(): ProgressionState {
	return {
		flags: createDefaultFlags(),
		openedChests: [],
		scrollLevels: {},
		gold: 0,
		keys: 0,
		xp: 0,
		level: 1,
		hp: 3,
		maxHp: 3,
		killCount: 0
	};
}

// ============================================================================
// PROGRESSION MANAGER
// ============================================================================

/**
 * Manages game progression and chest unlocks.
 *
 * Features:
 * - Track opened chests
 * - Apply chest effects to game state
 * - Multi-level chests (scroll levels)
 * - Save/restore progression state
 *
 * @example
 * ```typescript
 * const progression = new ProgressionManager();
 *
 * // Open a chest
 * const result = progression.openChest(ChestKind.CLeftCtrl, hero);
 * console.log(result.name, result.description);
 * ```
 */
export class ProgressionManager {
	/** Current progression flags */
	private flags: ProgressionFlags;

	/** Opened chest kinds */
	private openedChests: Set<ChestKind>;

	/** Scroll levels for multi-level chests */
	private scrollLevels: Map<ChestKind, number>;

	/** Player stats */
	private gold: number = 0;
	private keys: number = 0;
	private xp: number = 0;
	private level: number = 1;
	private hp: number = 3;
	private maxHp: number = 3;
	private killCount: number = 0;

	constructor() {
		this.flags = createDefaultFlags();
		this.openedChests = new Set();
		this.scrollLevels = new Map();
	}

	// ========================================================================
	// CHEST HANDLING
	// ========================================================================

	/**
	 * Check if a chest has been opened.
	 */
	isChestOpened(kind: ChestKind): boolean {
		return this.openedChests.has(kind);
	}

	/**
	 * Get scroll level for a multi-level chest.
	 */
	getScrollLevel(kind: ChestKind): number {
		return this.scrollLevels.get(kind) ?? 0;
	}

	/**
	 * Open a chest and apply its effects.
	 * @returns Chest data for display, or null if already opened
	 */
	openChest(kind: ChestKind, hero?: Hero, world?: World): ChestData | null {
		// Check if already opened (for non-multi-level chests)
		if (this.isMultiLevelChest(kind)) {
			const currentLevel = this.getScrollLevel(kind);
			const maxLevel = this.getMaxScrollLevel(kind);
			if (currentLevel >= maxLevel) {
				return null; // Already at max level
			}
			this.scrollLevels.set(kind, currentLevel + 1);
		} else {
			if (this.openedChests.has(kind)) {
				return null; // Already opened
			}
			this.openedChests.add(kind);
		}

		// Apply chest effect
		this.applyChestEffect(kind, hero, world);

		// Return chest data for display
		return CHEST_DATA[kind];
	}

	/**
	 * Check if a chest type has multiple levels.
	 */
	private isMultiLevelChest(kind: ChestKind): boolean {
		return kind === ChestKind.CScroll || kind === ChestKind.CColor || kind === ChestKind.CZoom;
	}

	/**
	 * Get maximum scroll level for multi-level chests.
	 */
	private getMaxScrollLevel(kind: ChestKind): number {
		switch (kind) {
			case ChestKind.CScroll:
				return 2; // 0 -> 1 -> 2
			case ChestKind.CColor:
				return 4; // 0 -> 1 -> 2 -> 3 -> 4
			case ChestKind.CZoom:
				return 2; // 1 -> 2 -> 3
			default:
				return 0; // Non-multi-level chests have no scroll levels
		}
	}

	/**
	 * Apply the effect of opening a chest.
	 */
	private applyChestEffect(kind: ChestKind, hero?: Hero, _world?: World): void {
		switch (kind) {
			// Movement unlocks
			case ChestKind.CLeftCtrl:
				this.flags.canMoveLeft = true;
				hero?.unlockLeftMovement();
				break;

			case ChestKind.CRightCtrl:
				// In original Haxe, CRightCtrl does nothing (just a bonus chest "Right Key")
				// The actual up/down movement is unlocked by C2D (props.bars = false)
				break;

			case ChestKind.CFreeMove:
				this.flags.freeMovement = true;
				hero?.unlockFreeMovement();
				break;

			// Display unlocks
			case ChestKind.C2D:
				// In original Haxe: props.bars = false (removes black bars, allows vertical movement)
				this.flags.mode2D = true;
				this.flags.canMoveAll = true;
				hero?.unlockAllDirections();
				break;

			case ChestKind.CScroll:
				this.flags.scrolling = true;
				break;

			case ChestKind.CColor:
				this.flags.colorLevel = this.scrollLevels.get(kind) ?? 1;
				break;

			case ChestKind.CZoom:
				this.flags.zoomLevel = Math.min(3, (this.scrollLevels.get(kind) ?? 0) + 1);
				break;

			// Combat unlocks
			case ChestKind.CWeapon:
				this.flags.hasWeapon = true;
				hero?.unlockSword();
				break;

			case ChestKind.CMonsters:
				this.flags.monstersEnabled = true;
				break;

			// Feature unlocks
			case ChestKind.CNpc:
				this.flags.npcsEnabled = true;
				break;

			case ChestKind.CAllowSave:
				this.flags.canSave = true;
				break;

			case ChestKind.CPushBlock:
				this.flags.canPushBlock = true;
				hero?.unlockPushBlock();
				break;

			case ChestKind.CDungeon:
				this.flags.dungeonAccess = true;
				break;

			case ChestKind.CDungeonKills:
				this.flags.dungeonKillCounter = true;
				break;

			case ChestKind.CPuzzle:
				this.flags.puzzlesEnabled = true;
				break;

			case ChestKind.CLevelUp:
				this.flags.levelUpEnabled = true;
				break;

			case ChestKind.CFarming:
				this.flags.farmingEnabled = true;
				break;

			// UI unlocks
			case ChestKind.CTitleScreen:
				this.flags.titleScreenEnabled = true;
				break;

			case ChestKind.CSounds:
				this.flags.soundsEnabled = true;
				break;

			case ChestKind.CMusic:
				this.flags.musicEnabled = true;
				break;

			// Item pickups
			case ChestKind.CGoldCoin:
				this.gold += 10;
				if (hero) hero.addGold(10);
				break;

			case ChestKind.CKey:
				this.keys += 1;
				if (hero) hero.addKey();
				break;

			// Special
			case ChestKind.CDiablo:
				this.flags.diabloMode = true;
				break;

			case ChestKind.CWeb:
				this.flags.webEnabled = true;
				break;

			case ChestKind.CExit:
				// Dungeon exit - handled by game logic
				break;

			case ChestKind.CPorn:
				// Easter egg - no effect
				break;

			case ChestKind.CPrincess:
				// Victory condition - handled by game logic
				break;
		}
	}

	// ========================================================================
	// STATS
	// ========================================================================

	/**
	 * Add gold.
	 */
	addGold(amount: number): void {
		this.gold += amount;
	}

	/**
	 * Get current gold.
	 */
	getGold(): number {
		return this.gold;
	}

	/**
	 * Add key.
	 */
	addKey(): void {
		this.keys++;
	}

	/**
	 * Use key.
	 */
	useKey(): boolean {
		if (this.keys <= 0) return false;
		this.keys--;
		return true;
	}

	/**
	 * Get current keys.
	 */
	getKeys(): number {
		return this.keys;
	}

	/**
	 * Add XP and check for level up.
	 * @returns True if leveled up
	 */
	addXP(amount: number): boolean {
		this.xp += amount;

		if (!this.flags.levelUpEnabled) {
			return false;
		}

		const xpForLevel = 100;
		let leveledUp = false;

		// Process all pending level-ups (max 10 levels to prevent infinite loop)
		let levelsGained = 0;
		while (this.xp >= xpForLevel && levelsGained < 10) {
			this.xp -= xpForLevel;
			this.level++;
			this.maxHp = Math.min(10, this.maxHp + 1);
			leveledUp = true;
			levelsGained++;
		}

		if (leveledUp) {
			this.hp = this.maxHp; // Full heal after all level-ups
		}

		return leveledUp;
	}

	/**
	 * Get current XP.
	 */
	getXP(): number {
		return this.xp;
	}

	/**
	 * Get current level.
	 */
	getLevel(): number {
		return this.level;
	}

	/**
	 * Increment kill count.
	 */
	addKill(): void {
		this.killCount++;
	}

	/**
	 * Get kill count.
	 */
	getKillCount(): number {
		return this.killCount;
	}

	/**
	 * Take damage.
	 * @param amount Must be non-negative
	 * @returns True if dead
	 */
	takeDamage(amount: number): boolean {
		if (amount < 0) {
			throw new Error('Damage amount must be non-negative');
		}
		this.hp -= amount;
		if (this.hp <= 0) {
			this.hp = 0;
			return true;
		}
		return false;
	}

	/**
	 * Heal.
	 */
	heal(amount: number): void {
		this.hp = Math.min(this.maxHp, this.hp + amount);
	}

	/**
	 * Get current HP.
	 */
	getHP(): number {
		return this.hp;
	}

	/**
	 * Get max HP.
	 */
	getMaxHP(): number {
		return this.maxHp;
	}

	/**
	 * Set HP directly (for loading).
	 */
	setHP(hp: number, maxHp: number): void {
		this.maxHp = maxHp;
		this.hp = Math.min(hp, maxHp); // Clamp HP to max
	}

	// ========================================================================
	// FLAGS
	// ========================================================================

	/**
	 * Get current progression flags.
	 */
	getFlags(): Readonly<ProgressionFlags> {
		return this.flags;
	}

	/**
	 * Check a specific flag.
	 */
	hasFlag(flag: keyof ProgressionFlags): boolean {
		const value = this.flags[flag];
		return typeof value === 'boolean' ? value : value > 0;
	}

	// ========================================================================
	// SERIALIZATION
	// ========================================================================

	/**
	 * Get complete progression state for saving.
	 */
	toState(): ProgressionState {
		const scrollLevels: Record<number, number> = {};
		for (const [kind, level] of this.scrollLevels) {
			scrollLevels[kind] = level;
		}

		return {
			flags: { ...this.flags },
			openedChests: Array.from(this.openedChests),
			scrollLevels,
			gold: this.gold,
			keys: this.keys,
			xp: this.xp,
			level: this.level,
			hp: this.hp,
			maxHp: this.maxHp,
			killCount: this.killCount
		};
	}

	/**
	 * Restore progression state from saved data.
	 */
	fromState(state: ProgressionState): void {
		this.flags = { ...state.flags };
		this.openedChests = new Set(state.openedChests as ChestKind[]);
		this.scrollLevels = new Map(
			Object.entries(state.scrollLevels).map(([k, v]) => [Number(k) as ChestKind, v])
		);
		this.gold = state.gold;
		this.keys = state.keys;
		this.xp = state.xp;
		this.level = state.level;
		this.hp = state.hp;
		this.maxHp = state.maxHp;
		this.killCount = state.killCount;
	}

	/**
	 * Reset to initial state.
	 */
	reset(): void {
		this.flags = createDefaultFlags();
		this.openedChests.clear();
		this.scrollLevels.clear();
		this.gold = 0;
		this.keys = 0;
		this.xp = 0;
		this.level = 1;
		this.hp = 3;
		this.maxHp = 3;
		this.killCount = 0;
	}

	/**
	 * Sync stats with hero.
	 */
	syncWithHero(hero: Hero): void {
		// Update hero inventory
		hero.inventory.gold = this.gold;
		hero.inventory.keys = this.keys;
		hero.inventory.xp = this.xp;
		hero.inventory.level = this.level;

		// Update hero HP
		hero.hp = this.hp;
		hero.maxHp = this.maxHp;

		// Update hero flags
		if (this.flags.canMoveLeft) hero.unlockLeftMovement();
		if (this.flags.canMoveAll) hero.unlockAllDirections();
		if (this.flags.freeMovement) hero.unlockFreeMovement();
		if (this.flags.hasWeapon) hero.unlockSword();
		if (this.flags.canPushBlock) hero.unlockPushBlock();
	}

	/**
	 * Sync from hero stats.
	 */
	syncFromHero(hero: Hero): void {
		this.gold = hero.inventory.gold;
		this.keys = hero.inventory.keys;
		this.xp = hero.inventory.xp;
		this.level = hero.inventory.level;
		this.hp = hero.hp;
		this.maxHp = hero.maxHp;
	}
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new progression manager.
 */
export function createProgressionManager(): ProgressionManager {
	return new ProgressionManager();
}

/**
 * Get chest data by kind.
 */
export function getChestData(kind: ChestKind): ChestData {
	return CHEST_DATA[kind];
}

/**
 * Check if a chest kind is a feature unlock (vs item pickup).
 */
export function isFeatureUnlock(kind: ChestKind): boolean {
	const itemPickups: ChestKind[] = [ChestKind.CGoldCoin, ChestKind.CKey];
	return !itemPickups.includes(kind);
}
