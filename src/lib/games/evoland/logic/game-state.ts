/**
 * Evoland Game State Manager
 *
 * Central game state that orchestrates world, hero, monsters, and progression.
 * This is the main interface between the game controller and the game logic.
 */

import { World } from './world';
import { Hero, createHeroAtGrid } from './hero';
import { MonsterManager, createMonsterManager, type Monster } from './monster';
import { ProgressionManager, createProgressionManager } from './progression';
import { Block, ChestKind, CHEST_DATA, TILE_SIZE, EKind } from './constants';
import type { InputState } from '../engine/input-manager';
import { evolandStore } from '../stores/evoland.svelte';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Camera state for viewport positioning.
 */
export interface Camera {
	x: number;
	y: number;
	targetX: number;
	targetY: number;
}

/**
 * Game state configuration.
 */
export interface GameStateConfig {
	/** Starting position (grid coordinates) */
	readonly startX?: number;
	readonly startY?: number;
	/** Whether to enable scrolling camera */
	readonly scrolling?: boolean;
}

/**
 * Chest entity in the world.
 */
export interface Chest {
	/** Grid X position */
	readonly x: number;
	/** Grid Y position */
	readonly y: number;
	/** Chest content type */
	readonly kind: (typeof ChestKind)[keyof typeof ChestKind];
	/** Whether the chest has been opened */
	opened: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Base screen dimensions */
const SCREEN_WIDTH = 240;
const SCREEN_HEIGHT = 160;

/** Hero starting position in Evoland */
const DEFAULT_START_X = 51;
const DEFAULT_START_Y = 78;

/** Camera smoothing factor */
const CAMERA_SMOOTHING = 0.1;

// ============================================================================
// GAME STATE CLASS
// ============================================================================

/**
 * Main game state manager.
 *
 * Responsibilities:
 * - Initialize and manage game world
 * - Update hero based on input
 * - Update monsters with AI
 * - Handle collisions and interactions
 * - Track progression and unlocks
 *
 * @example
 * ```typescript
 * const gameState = new GameState();
 * await gameState.initialize();
 *
 * // In game loop
 * gameState.handleInput(inputState);
 * gameState.update(dt);
 *
 * // Get state for rendering
 * const camera = gameState.getCamera();
 * const hero = gameState.getHero();
 * ```
 */
export class GameState {
	private world: World;
	private hero: Hero;
	private monsterManager: MonsterManager;
	private progression: ProgressionManager;
	private camera: Camera;
	private config: GameStateConfig;
	private chests: Chest[] = [];

	private _initialized: boolean = false;

	constructor(config: GameStateConfig = {}) {
		this.config = config;
		this.world = new World();
		this.monsterManager = createMonsterManager();
		this.progression = createProgressionManager();

		// Create hero at starting position
		const startX = config.startX ?? DEFAULT_START_X;
		const startY = config.startY ?? DEFAULT_START_Y;
		this.hero = createHeroAtGrid(startX, startY);

		// Initialize camera centered on hero
		this.camera = {
			x: this.hero.x - SCREEN_WIDTH / 2,
			y: this.hero.y - SCREEN_HEIGHT / 2,
			targetX: this.hero.x - SCREEN_WIDTH / 2,
			targetY: this.hero.y - SCREEN_HEIGHT / 2
		};
	}

	// ========================================================================
	// INITIALIZATION
	// ========================================================================

	/**
	 * Initialize the game state.
	 * Loads world data and sets up initial state.
	 */
	async initialize(): Promise<void> {
		if (this._initialized) return;

		try {
			// For now, we'll use a simple test world
			// In the future, this will load from PNG or JSON
			this.initializeTestWorld();

			// Apply initial progression state
			this.applyProgressionToHero();

			// Sync with UI store
			this.syncToStore();

			this._initialized = true;
		} catch (error) {
			console.error('Failed to initialize game state:', error);
			throw error;
		}
	}

	/**
	 * Initialize a simple test world for development.
	 */
	private initializeTestWorld(): void {
		// Create a simple field with some obstacles
		for (let x = 45; x < 60; x++) {
			for (let y = 73; y < 85; y++) {
				this.world.setTile(x, y, Block.Field);
			}
		}

		// Add some trees around the edges
		for (let x = 45; x < 60; x++) {
			this.world.setTile(x, 73, Block.Tree);
			this.world.setTile(x, 84, Block.Tree);
		}
		for (let y = 73; y < 85; y++) {
			this.world.setTile(45, y, Block.Tree);
			this.world.setTile(59, y, Block.Tree);
		}

		// Clear starting area
		for (let x = 49; x < 54; x++) {
			for (let y = 76; y < 81; y++) {
				this.world.setTile(x, y, Block.Field);
			}
		}

		// Add test chests for progression
		// Hero starts at (51, 78), so place chests to the right
		this.chests = [
			{ x: 53, y: 78, kind: ChestKind.CLeftCtrl, opened: false }, // Unlock left
			{ x: 55, y: 78, kind: ChestKind.CRightCtrl, opened: false }, // Unlock up/down
			{ x: 53, y: 76, kind: ChestKind.CWeapon, opened: false }, // Get sword
			{ x: 55, y: 76, kind: ChestKind.CMonsters, opened: false } // Enable monsters
		];

		// Add test monsters (they won't appear until CMonsters chest is opened)
		this.spawnTestMonsters();
	}

	/**
	 * Spawn test monsters for development.
	 */
	private spawnTestMonsters(): void {
		// Spawn a few slimes in the test area (north of hero)
		this.monsterManager.spawn(EKind.Monster, 50 * TILE_SIZE, 75 * TILE_SIZE);
		this.monsterManager.spawn(EKind.Monster, 52 * TILE_SIZE, 75 * TILE_SIZE);
		this.monsterManager.spawn(EKind.Monster, 54 * TILE_SIZE, 75 * TILE_SIZE);

		// Spawn a bat (west of hero)
		this.monsterManager.spawn(EKind.Bat, 47 * TILE_SIZE, 78 * TILE_SIZE);
	}

	// ========================================================================
	// INPUT HANDLING
	// ========================================================================

	/**
	 * Handle input from the input manager.
	 */
	handleInput(input: InputState): void {
		if (!this._initialized) return;

		// Convert InputState to hero input
		const up = input.moveY < 0;
		const down = input.moveY > 0;
		const left = input.moveX < 0;
		const right = input.moveX > 0;
		const attack = input.action;

		this.hero.setInput(up, down, left, right, attack);
	}

	// ========================================================================
	// UPDATE
	// ========================================================================

	/**
	 * Update game state.
	 * @param dt - Delta time multiplier (tmod)
	 */
	update(dt: number): void {
		if (!this._initialized) return;

		// Update hero
		this.hero.update(dt, this.world);

		// Update monsters (only if enabled)
		const flags = this.progression.getFlags();
		if (flags.monstersEnabled) {
			this.monsterManager.update(dt, this.world, this.hero.x, this.hero.y);

			// Check for hero-monster collisions
			this.checkMonsterCollisions();
		}

		// Check for hero-chest collisions
		this.checkChestCollisions();

		// Update camera
		this.updateCamera(dt);

		// Sync state to store
		this.syncToStore();

		// Check for game over
		if (this.hero.hp <= 0) {
			evolandStore.gameOver();
		}
	}

	/**
	 * Check for collisions between hero and chests.
	 */
	private checkChestCollisions(): void {
		// Get hero grid position
		const heroGridX = Math.floor(this.hero.x / TILE_SIZE);
		const heroGridY = Math.floor(this.hero.y / TILE_SIZE);

		for (const chest of this.chests) {
			if (chest.opened) continue;

			// Check if hero is on the chest tile
			if (heroGridX === chest.x && heroGridY === chest.y) {
				this.openChest(chest);
			}
		}
	}

	/**
	 * Open a chest and apply its effects.
	 */
	private openChest(chest: Chest): void {
		chest.opened = true;

		// Apply chest effect through progression system
		this.progression.openChest(chest.kind, this.hero);

		// Update hero flags from progression
		this.applyProgressionToHero();

		// Get chest data for dialog
		const chestData = CHEST_DATA[chest.kind];
		if (chestData) {
			// Show dialog with chest content
			evolandStore.showDialog({
				title: chestData.name,
				message: chestData.description
			});
		}
	}

	/**
	 * Update camera position to follow hero.
	 */
	private updateCamera(dt: number): void {
		if (!this.config.scrolling) {
			// Fixed camera at start position
			return;
		}

		// Update camera target to center on hero
		this.camera.targetX = this.hero.x - SCREEN_WIDTH / 2;
		this.camera.targetY = this.hero.y - SCREEN_HEIGHT / 2;

		// Smooth camera movement
		const smoothing = 1 - Math.pow(1 - CAMERA_SMOOTHING, dt);
		this.camera.x += (this.camera.targetX - this.camera.x) * smoothing;
		this.camera.y += (this.camera.targetY - this.camera.y) * smoothing;
	}

	/**
	 * Check for collisions between hero and monsters.
	 */
	private checkMonsterCollisions(): void {
		// Skip if hero is in hit recovery (invulnerable)
		if (this.hero.hitRecovery > 0) return;

		const monsters = this.monsterManager.getMonsters();

		for (const monster of monsters) {
			// Skip dead monsters
			if (monster.removed) continue;

			// Check if hero sword hits monster
			if (this.hero.sword.active) {
				// Simple collision check - TODO: implement proper sword bounds
				const dx = Math.abs(monster.x - this.hero.x);
				const dy = Math.abs(monster.y - this.hero.y);
				if (dx < 24 && dy < 24) {
					monster.hp -= 1;
					if (monster.hp <= 0) {
						monster.removed = true;
						this.hero.addXP(10);
					}
				}
			}

			// Check if monster hits hero
			const dx = Math.abs(monster.x - this.hero.x);
			const dy = Math.abs(monster.y - this.hero.y);
			if (dx < 12 && dy < 12) {
				this.hero.takeDamage(1);
			}
		}
	}

	/**
	 * Apply progression flags to hero.
	 */
	private applyProgressionToHero(): void {
		const flags = this.progression.getFlags();

		this.hero.flags.canMoveLeft = flags.canMoveLeft;
		this.hero.flags.canMoveAll = flags.canMoveAll;
		this.hero.flags.freeMovement = flags.freeMovement;
		this.hero.flags.hasSword = flags.hasWeapon;
		this.hero.flags.canPushBlock = flags.canPushBlock;
	}

	/**
	 * Sync game state to the UI store.
	 */
	private syncToStore(): void {
		evolandStore.updateHUD({
			hp: this.hero.hp,
			maxHp: this.hero.maxHp,
			gold: this.hero.inventory.gold,
			keys: this.hero.inventory.keys,
			xp: this.hero.inventory.xp,
			level: this.hero.inventory.level,
			killCount: 0, // TODO: track kill count in MonsterManager
			showKillCounter: this.progression.getFlags().dungeonKillCounter
		});

		const flags = this.progression.getFlags();
		evolandStore.updateVisuals({
			colorLevel: flags.colorLevel,
			zoomLevel: flags.zoomLevel,
			scrolling: flags.scrolling,
			mode2D: flags.mode2D
		});

		evolandStore.updateFlags(flags);
	}

	// ========================================================================
	// GETTERS
	// ========================================================================

	/**
	 * Check if initialized.
	 */
	get initialized(): boolean {
		return this._initialized;
	}

	/**
	 * Get the world.
	 */
	getWorld(): World {
		return this.world;
	}

	/**
	 * Get the hero.
	 */
	getHero(): Hero {
		return this.hero;
	}

	/**
	 * Get all monsters.
	 */
	getMonsters(): readonly Monster[] {
		return this.monsterManager.getMonsters();
	}

	/**
	 * Get the camera state.
	 */
	getCamera(): Camera {
		return { ...this.camera };
	}

	/**
	 * Get the progression manager.
	 */
	getProgression(): ProgressionManager {
		return this.progression;
	}

	/**
	 * Get all chests.
	 */
	getChests(): readonly Chest[] {
		return this.chests;
	}

	// ========================================================================
	// RESET
	// ========================================================================

	/**
	 * Reset the game state.
	 */
	reset(): void {
		// Reset hero to starting position
		const startX = this.config.startX ?? DEFAULT_START_X;
		const startY = this.config.startY ?? DEFAULT_START_Y;
		this.hero = createHeroAtGrid(startX, startY);

		// Reset camera
		this.camera = {
			x: this.hero.x - SCREEN_WIDTH / 2,
			y: this.hero.y - SCREEN_HEIGHT / 2,
			targetX: this.hero.x - SCREEN_WIDTH / 2,
			targetY: this.hero.y - SCREEN_HEIGHT / 2
		};

		// Clear monsters
		this.monsterManager.clear();

		// Reset chests
		for (const chest of this.chests) {
			chest.opened = false;
		}

		// Reset progression
		this.progression = createProgressionManager();

		// Apply initial progression to hero
		this.applyProgressionToHero();

		// Sync to store
		this.syncToStore();
	}
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new game state.
 */
export function createGameState(config?: GameStateConfig): GameState {
	return new GameState(config);
}
