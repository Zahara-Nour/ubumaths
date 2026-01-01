/**
 * Evoland Game Type Definitions
 *
 * TypeScript interfaces for the game state and entities.
 * Designed for immutable state management with Svelte 5 runes.
 */

import type { Block, ChestKind, Direction, EKind, GameStatus } from './constants';

// ============================================================================
// POSITION TYPES
// ============================================================================

/**
 * Continuous position in world coordinates (pixels).
 * Used for smooth entity movement.
 */
export interface Position {
	readonly x: number;
	readonly y: number;
}

/**
 * Discrete grid position in tile coordinates.
 * Used for tile-based collision and world access.
 */
export interface GridPosition {
	readonly ix: number;
	readonly iy: number;
}

/**
 * Axis-aligned bounding box for collision detection.
 */
export interface Bounds {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

// ============================================================================
// ENTITY TYPES
// ============================================================================

/**
 * Base entity state shared by all game entities.
 * Entities have both continuous position (x, y) and grid position (ix, iy).
 */
export interface EntityState {
	/** Unique identifier for this entity instance */
	readonly id: string;
	/** Entity type for rendering and logic dispatch */
	readonly kind: EKind;
	/** Continuous X position in pixels */
	readonly x: number;
	/** Continuous Y position in pixels */
	readonly y: number;
	/** Grid X position (tile column) */
	readonly ix: number;
	/** Grid Y position (tile row) */
	readonly iy: number;
	/** Movement speed in pixels per frame */
	readonly speed: number;
	/** Current animation frame index */
	readonly frame: number;
	/** Current facing direction */
	readonly direction: Direction;
}

/**
 * Sword attack state when the hero is attacking.
 */
export interface SwordState {
	/** Direction offset X for sword position */
	readonly dx: number;
	/** Direction offset Y for sword position */
	readonly dy: number;
	/** Attack animation position (0-1 progress) */
	readonly pos: number;
	/** Attack animation speed */
	readonly speed: number;
}

/**
 * Hero (player character) state extending base entity.
 */
export interface HeroState extends EntityState {
	/** Current health points */
	readonly hp: number;
	/** Maximum health points */
	readonly maxHp: number;
	/** Current experience points */
	readonly xp: number;
	/** Current level (1-based) */
	readonly level: number;
	/** Gold coins collected */
	readonly gold: number;
	/** Keys collected for locked doors */
	readonly keys: number;
	/** Invincibility frames remaining after taking damage */
	readonly hitRecover: number;
	/** Active sword attack state, null if not attacking */
	readonly sword: SwordState | null;
	/** Whether the hero is currently moving */
	readonly moving: boolean;
	/** Whether the hero's input is locked (during cutscenes, etc.) */
	readonly lock: boolean;
}

/**
 * Monster kind subtypes for different enemy behaviors.
 */
export type MonsterKind = 'monster' | 'bat' | 'knight' | 'fireball';

/**
 * Monster entity state extending base entity.
 */
export interface MonsterState extends EntityState {
	/** Specific monster behavior type */
	readonly monsterKind: MonsterKind;
	/** Wait timer for AI behavior (frames until next action) */
	readonly wait: number;
	/** Starting X position for patrol/return behavior */
	readonly startX: number;
	/** Starting Y position for patrol/return behavior */
	readonly startY: number;
	/** Whether this monster was spawned by a generator */
	readonly generated: boolean;
	/** Whether the monster is in attack mode (knight charge) */
	readonly attack: boolean;
	/** Current health points */
	readonly hp: number;
	/** Maximum health points */
	readonly maxHp: number;
}

/**
 * Chest entity state for progression items.
 */
export interface ChestState {
	/** Chest content type determining what is unlocked */
	readonly kind: ChestKind;
	/** Grid X position */
	readonly x: number;
	/** Grid Y position */
	readonly y: number;
	/** Whether this chest has been opened */
	readonly opened: boolean;
	/** Unique identifier for save/load tracking */
	readonly id: string;
}

/**
 * NPC (Non-Player Character) state for dialogue interactions.
 */
export interface NPCState {
	/** Unique identifier */
	readonly id: string;
	/** Grid X position */
	readonly x: number;
	/** Grid Y position */
	readonly y: number;
	/** Current dialogue index in the NPC's dialogue array */
	readonly dialogIndex: number;
	/** NPC facing direction */
	readonly direction: Direction;
}

// ============================================================================
// WORLD STATE
// ============================================================================

/**
 * World/level state containing all static and dynamic elements.
 */
export interface WorldState {
	/** 2D array of tile types [y][x] */
	readonly tiles: Block[][];
	/** 2D array tracking removed/destroyed tiles [y][x] */
	readonly removed: boolean[][];
	/** Active monsters in this world */
	readonly monsters: MonsterState[];
	/** Chests in this world */
	readonly chests: ChestState[];
	/** NPCs in this world */
	readonly npcs: NPCState[];
	/** Whether this is a dungeon (affects rendering and mechanics) */
	readonly isDungeon: boolean;
}

// ============================================================================
// GAME PROPERTIES (Progression Flags)
// ============================================================================

/**
 * Game progression properties controlling unlocked features.
 * These flags are modified when opening chests.
 * Based on Game.hx progression system.
 */
export interface GameProps {
	/**
	 * Camera zoom level.
	 * 0 = closest (original GB style)
	 * 1 = medium
	 * 2 = furthest (full view)
	 */
	readonly zoom: number;
	/** Whether UI bars (health, etc.) are visible */
	readonly bars: boolean;
	/** Whether left movement is enabled */
	readonly left: boolean;
	/**
	 * Screen scrolling mode.
	 * 0 = no scroll (screen-by-screen)
	 * 1 = horizontal scroll only
	 * 2 = full smooth scroll
	 */
	readonly scroll: number;
	/**
	 * Color rendering level.
	 * 0 = monochrome (GB style)
	 * 1-3 = increasing color depth
	 * 4 = full color
	 */
	readonly color: number;
	/** Whether life/HP display is enabled */
	readonly life: boolean;
	/**
	 * Monster spawning enabled.
	 * 0 = no monsters
	 * 1 = monsters active
	 */
	readonly monsters: number;
	/**
	 * Weapon enabled.
	 * 0 = no weapon
	 * 1 = sword available
	 */
	readonly weapons: number;
	/** Whether saving is allowed */
	readonly canSave: boolean;
	/**
	 * NPC interaction enabled.
	 * 0 = NPCs not visible
	 * 1 = NPCs active
	 */
	readonly npc: number;
	/** Whether diagonal/free movement is enabled */
	readonly freeMove: boolean;
	/** Whether sound effects are enabled */
	readonly sounds: boolean;
	/** Whether background music is enabled */
	readonly music: boolean;
	/** Whether dungeon areas are accessible */
	readonly dungeon: boolean;
	/** Dungeon monster kill counter */
	readonly dmkills: number;
	/**
	 * Puzzle mode level.
	 * 0 = puzzles disabled
	 * 1+ = puzzle features enabled
	 */
	readonly puzzle: number;
	/** Whether right movement is enabled */
	readonly right: boolean;
	/** Whether block pushing is enabled */
	readonly pushBlock: boolean;
	/** Whether leveling system is enabled */
	readonly levelUp: boolean;
	/** Whether monster respawning (farming) is enabled */
	readonly farming: boolean;
}

// ============================================================================
// CAMERA STATE
// ============================================================================

/**
 * Camera/viewport state for rendering.
 */
export interface CameraState {
	/** Camera center X position in world coordinates */
	readonly x: number;
	/** Camera center Y position in world coordinates */
	readonly y: number;
	/** Current zoom level (affects viewport size) */
	readonly zoom: number;
	/** Target zoom level for smooth zoom transitions */
	readonly targetZoom: number;
}

// ============================================================================
// VISUAL EFFECTS
// ============================================================================

/**
 * Screen shake effect state.
 */
export interface ShakeState {
	/** Remaining shake time in frames */
	readonly time: number;
	/** Shake intensity in pixels */
	readonly power: number;
}

/**
 * Color filter transition state for palette changes.
 */
export interface ColorFilterState {
	/** Current color level (0 = monochrome, 4 = full color) */
	readonly level: number;
	/** Transition progress (0-1) for smooth color changes */
	readonly transition: number;
}

// ============================================================================
// DIALOG STATE
// ============================================================================

/**
 * Active dialog/popup state.
 */
export interface DialogState {
	/** Whether a dialog is currently showing */
	readonly active: boolean;
	/** Dialog title (e.g., chest name) */
	readonly title: string;
	/** Dialog message content */
	readonly message: string;
	/** Optional icon/image identifier */
	readonly icon?: string;
}

// ============================================================================
// INPUT STATE
// ============================================================================

/**
 * Current input state from keyboard/gamepad.
 */
export interface InputState {
	/** Movement direction input (-1, 0, or 1 for each axis) */
	readonly moveX: number;
	readonly moveY: number;
	/** Action button (attack/interact) pressed */
	readonly action: boolean;
	/** Menu/pause button pressed */
	readonly menu: boolean;
	/** Confirm button pressed (for dialogs) */
	readonly confirm: boolean;
}

// ============================================================================
// MAIN GAME STATE
// ============================================================================

/**
 * Complete game state containing all game data.
 * This is the root state object managed by the game store.
 */
export interface GameState {
	/** Current game status (title, playing, paused, etc.) */
	readonly status: GameStatus;
	/** Progression properties controlling unlocked features */
	readonly props: GameProps;
	/** Overworld state */
	readonly world: WorldState;
	/** Dungeon world state (separate from overworld) */
	readonly dungeonWorld: WorldState;
	/** Player character state */
	readonly hero: HeroState;
	/** Camera/viewport state */
	readonly camera: CameraState;
	/** Set of opened chest IDs for save/load */
	readonly openedChests: Set<string>;
	/** Screen shake effect state */
	readonly shake: ShakeState;
	/** Color filter/palette state */
	readonly colorFilter: ColorFilterState;
	/** Active dialog state */
	readonly dialog: DialogState;
	/** Whether the hero is currently in the dungeon */
	readonly inDungeon: boolean;
	/** Frame counter for animations and timing */
	readonly frameCount: number;
}

// ============================================================================
// SAVE/LOAD DATA
// ============================================================================

/**
 * Serializable save data format for localStorage/server saves.
 * Uses JSON-compatible types (no Set, partial objects allowed).
 */
export interface SaveData {
	/** Save format version for migration compatibility */
	readonly version: number;
	/** Unix timestamp when save was created */
	readonly timestamp: number;
	/** Saved progression properties */
	readonly props: GameProps;
	/** Partial hero state (position, stats, inventory) */
	readonly heroState: {
		readonly x: number;
		readonly y: number;
		readonly hp: number;
		readonly maxHp: number;
		readonly xp: number;
		readonly level: number;
		readonly gold: number;
		readonly keys: number;
	};
	/** Array of opened chest IDs (serialized from Set) */
	readonly openedChests: string[];
	/** Whether the save is from dungeon */
	readonly inDungeon: boolean;
}

// ============================================================================
// FACTORY FUNCTION TYPES
// ============================================================================

/**
 * Options for creating a new hero.
 */
export interface CreateHeroOptions {
	readonly x?: number;
	readonly y?: number;
	readonly direction?: Direction;
}

/**
 * Options for creating a new monster.
 */
export interface CreateMonsterOptions {
	readonly x: number;
	readonly y: number;
	readonly monsterKind: MonsterKind;
	readonly generated?: boolean;
}

/**
 * Options for creating a new chest.
 */
export interface CreateChestOptions {
	readonly x: number;
	readonly y: number;
	readonly kind: ChestKind;
}

// ============================================================================
// ACTION TYPES (for state updates)
// ============================================================================

/**
 * Hero movement action payload.
 */
export interface MoveAction {
	readonly dx: number;
	readonly dy: number;
}

/**
 * Damage action payload.
 */
export interface DamageAction {
	readonly targetId: string;
	readonly amount: number;
	readonly knockbackX?: number;
	readonly knockbackY?: number;
}

/**
 * Chest open action payload.
 */
export interface OpenChestAction {
	readonly chestId: string;
}

// ============================================================================
// RENDER TYPES
// ============================================================================

/**
 * Sprite frame definition for sprite sheet rendering.
 */
export interface SpriteFrame {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

/**
 * Animation definition with multiple frames.
 */
export interface AnimationDef {
	readonly frames: readonly SpriteFrame[];
	readonly frameRate: number;
	readonly loop: boolean;
}

/**
 * Renderable entity with position and sprite info.
 */
export interface RenderableEntity {
	readonly x: number;
	readonly y: number;
	readonly spriteX: number;
	readonly spriteY: number;
	readonly spriteW: number;
	readonly spriteH: number;
	readonly flipX: boolean;
	readonly flipY: boolean;
	readonly opacity: number;
	readonly zIndex: number;
}
