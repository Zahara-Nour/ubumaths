/**
 * Evoland Hero Entity
 *
 * Player character with grid/free movement, sword attacks, and item collection.
 * Based on the original Hero.hx from Evoland.
 */

import { Entity, type AABB } from './entities';
import type { World } from './world';
import {
	Direction,
	DIRECTION_VECTORS,
	EKind,
	TILE_SIZE,
	HERO_START_HP,
	HERO_MAX_HP,
	HERO_BASE_SPEED,
	SWORD_DURATION,
	Block
} from './constants';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Hero state flags for progression.
 */
export interface HeroFlags {
	/** Can move left (default: only right) */
	canMoveLeft: boolean;
	/** Can move in all directions (not just up/down) */
	canMoveAll: boolean;
	/** Free pixel movement (not grid-locked) */
	freeMovement: boolean;
	/** Has sword weapon */
	hasSword: boolean;
	/** Can push blocks */
	canPushBlock: boolean;
}

/**
 * Hero inventory.
 */
export interface HeroInventory {
	/** Number of keys */
	keys: number;
	/** Gold coins */
	gold: number;
	/** Experience points */
	xp: number;
	/** Current level */
	level: number;
}

/**
 * Sword attack state.
 */
export interface SwordState {
	/** Is sword active */
	active: boolean;
	/** Sword attack timer */
	timer: number;
	/** Sword direction */
	direction: Direction;
}

/**
 * Serialized hero state for save/load.
 */
export interface SerializedHero {
	readonly x: number;
	readonly y: number;
	readonly ix: number;
	readonly iy: number;
	readonly direction: Direction;
	readonly hp: number;
	readonly inventory: HeroInventory;
	readonly flags: HeroFlags;
}

// ============================================================================
// HERO CLASS
// ============================================================================

/**
 * Player character entity.
 *
 * Features:
 * - Grid-based movement (default, Zelda-style)
 * - Free movement (unlocked by CFreeMove chest)
 * - Sword attacks with hitbox
 * - Push-block mechanic
 * - NPC interaction detection
 * - Key/gold/XP collection
 *
 * @example
 * ```typescript
 * const hero = new Hero(100, 100);
 *
 * // In game loop
 * hero.handleInput(inputManager);
 * hero.update(tmod, world);
 * ```
 */
export class Hero extends Entity {
	/** Progression flags */
	flags: HeroFlags;

	/** Inventory */
	inventory: HeroInventory;

	/** Sword attack state */
	sword: SwordState;

	/** Push block counter (frames holding against block) */
	pushCounter: number = 0;

	/** Push block threshold (frames needed to push) */
	static readonly PUSH_THRESHOLD = 25;

	/** Input state */
	private inputState = {
		up: false,
		down: false,
		left: false,
		right: false,
		attack: false
	};

	/** Was attack just pressed (for toggle detection) */
	private attackJustPressed = false;

	/**
	 * Create a new hero.
	 * @param x - Initial X position
	 * @param y - Initial Y position
	 */
	constructor(x: number, y: number) {
		super(EKind.Hero, x, y);

		// Set up HP
		this.hp = HERO_START_HP;
		this.maxHp = HERO_MAX_HP;

		// Set up speed
		this.speed = HERO_BASE_SPEED;

		// Set up collision bounds (smaller than tile for movement)
		this.setBounds(3, 8, 10, 7);

		// Initialize flags (all disabled by default - progression unlocks them)
		this.flags = {
			canMoveLeft: false,
			canMoveAll: false,
			freeMovement: false,
			hasSword: false,
			canPushBlock: false
		};

		// Initialize inventory
		this.inventory = {
			keys: 0,
			gold: 0,
			xp: 0,
			level: 1
		};

		// Initialize sword state
		this.sword = {
			active: false,
			timer: 0,
			direction: Direction.Down
		};

		// Animation setup
		this.setAnimation(2, 8);
	}

	// ========================================================================
	// INPUT HANDLING
	// ========================================================================

	/**
	 * Set input state (called from input manager).
	 */
	setInput(up: boolean, down: boolean, left: boolean, right: boolean, attack: boolean): void {
		this.inputState.up = up;
		this.inputState.down = down;
		this.inputState.left = left;
		this.inputState.right = right;

		// Track attack toggle
		this.attackJustPressed = attack && !this.inputState.attack;
		this.inputState.attack = attack;
	}

	/**
	 * Check if a direction input is pressed and allowed.
	 * Evoland progression: Right first, then Left, then Up/Down.
	 */
	private canInputDirection(dir: Direction): boolean {
		switch (dir) {
			case Direction.Up:
				return this.inputState.up && this.flags.canMoveAll;
			case Direction.Down:
				return this.inputState.down && this.flags.canMoveAll;
			case Direction.Left:
				return this.inputState.left && this.flags.canMoveLeft;
			case Direction.Right:
				return this.inputState.right; // Always allowed from start
		}
	}

	/**
	 * Get the primary movement direction from input.
	 */
	private getInputDirection(): Direction | null {
		// Priority: Up, Down, Left, Right (matches original)
		if (this.canInputDirection(Direction.Up)) return Direction.Up;
		if (this.canInputDirection(Direction.Down)) return Direction.Down;
		if (this.canInputDirection(Direction.Left)) return Direction.Left;
		if (this.canInputDirection(Direction.Right)) return Direction.Right;
		return null;
	}

	// ========================================================================
	// MOVEMENT
	// ========================================================================

	/**
	 * Handle grid-based movement.
	 */
	private handleGridMovement(world: World): void {
		// Already moving? Wait to finish
		if (this.isMoving()) return;

		const dir = this.getInputDirection();
		if (dir === null) {
			this.animation.playing = false;
			return;
		}

		// Update direction even if we can't move
		this.direction = dir;

		// Check for push-block
		if (this.flags.canPushBlock) {
			const vec = DIRECTION_VECTORS[dir];
			const targetTile = world.getTile(this.ix + vec.dx, this.iy + vec.dy);
			if (targetTile === Block.DungeonPuzzle) {
				this.handlePushBlock(world, dir);
				return;
			}
		}

		// Try to move
		this.tryMove(dir, world);
	}

	/**
	 * Handle free (pixel-based) movement.
	 */
	private handleFreeMovement(tmod: number, world: World): void {
		let dx = 0;
		let dy = 0;

		if (this.canInputDirection(Direction.Up)) dy -= this.speed;
		if (this.canInputDirection(Direction.Down)) dy += this.speed;
		if (this.canInputDirection(Direction.Left)) dx -= this.speed;
		if (this.canInputDirection(Direction.Right)) dx += this.speed;

		// Normalize diagonal movement
		if (dx !== 0 && dy !== 0) {
			const factor = 0.707; // 1 / sqrt(2)
			dx *= factor;
			dy *= factor;
		}

		if (dx !== 0 || dy !== 0) {
			this.moveFree(dx, dy, world, tmod);
		} else {
			this.animation.playing = false;
		}
	}

	/**
	 * Handle push-block mechanic.
	 */
	private handlePushBlock(world: World, dir: Direction): void {
		this.pushCounter++;

		if (this.pushCounter >= Hero.PUSH_THRESHOLD) {
			const vec = DIRECTION_VECTORS[dir];
			const puzzleX = this.ix + vec.dx;
			const puzzleY = this.iy + vec.dy;
			const behindX = puzzleX + vec.dx;
			const behindY = puzzleY + vec.dy;

			// Check if we can push (space behind is empty)
			if (!world.collide(behindX, behindY)) {
				// Move the puzzle block
				world.setTile(puzzleX, puzzleY, Block.DungeonSoil);
				world.setTile(behindX, behindY, Block.DungeonPuzzle);
				this.pushCounter = 0;

				// Move hero into the now-empty space
				this.tryMove(dir, world);
			}
		}
	}

	// ========================================================================
	// SWORD ATTACK
	// ========================================================================

	/**
	 * Start sword attack.
	 */
	attack(): void {
		if (!this.flags.hasSword || this.sword.active) return;

		this.sword.active = true;
		this.sword.timer = SWORD_DURATION;
		this.sword.direction = this.direction;
	}

	/**
	 * Update sword attack state.
	 */
	private updateSword(tmod: number): void {
		if (!this.sword.active) return;

		this.sword.timer -= tmod;
		if (this.sword.timer <= 0) {
			this.sword.active = false;
			this.sword.timer = 0;
		}
	}

	/**
	 * Get sword hitbox (for collision with enemies).
	 */
	getSwordHitbox(): AABB | null {
		if (!this.sword.active) return null;

		const center = this.getCenter();
		const size = 12;
		const offset = 10;

		switch (this.sword.direction) {
			case Direction.Up:
				return {
					x: center.x - size / 2,
					y: center.y - offset - size,
					width: size,
					height: size
				};
			case Direction.Down:
				return {
					x: center.x - size / 2,
					y: center.y + offset,
					width: size,
					height: size
				};
			case Direction.Left:
				return {
					x: center.x - offset - size,
					y: center.y - size / 2,
					width: size,
					height: size
				};
			case Direction.Right:
				return {
					x: center.x + offset,
					y: center.y - size / 2,
					width: size,
					height: size
				};
		}
	}

	// ========================================================================
	// INVENTORY
	// ========================================================================

	/**
	 * Add key to inventory.
	 */
	addKey(): void {
		this.inventory.keys++;
	}

	/**
	 * Use a key (for locked doors).
	 * @returns True if key was available and used
	 */
	useKey(): boolean {
		if (this.inventory.keys <= 0) return false;
		this.inventory.keys--;
		return true;
	}

	/**
	 * Add gold to inventory.
	 */
	addGold(amount: number): void {
		this.inventory.gold += amount;
	}

	/**
	 * Add XP and check for level up.
	 * @returns True if leveled up
	 */
	addXP(amount: number): boolean {
		this.inventory.xp += amount;

		// Check level up (100 XP per level)
		const xpForLevel = 100;
		if (this.inventory.xp >= xpForLevel) {
			this.inventory.xp -= xpForLevel;
			this.inventory.level++;
			return true;
		}

		return false;
	}

	// ========================================================================
	// INTERACTIONS
	// ========================================================================

	/**
	 * Get tile in front of hero (for NPC/chest interaction).
	 */
	getTileInFront(): { x: number; y: number } {
		const vec = DIRECTION_VECTORS[this.direction];
		return {
			x: this.ix + vec.dx,
			y: this.iy + vec.dy
		};
	}

	/**
	 * Check if hero is facing a locked door.
	 */
	isFacingLock(world: World): boolean {
		const front = this.getTileInFront();
		return world.getTile(front.x, front.y) === Block.Lock;
	}

	/**
	 * Try to unlock door in front.
	 * @returns True if door was unlocked
	 */
	tryUnlock(world: World): boolean {
		if (!this.isFacingLock(world)) return false;
		if (!this.useKey()) return false;

		const front = this.getTileInFront();
		world.setTile(front.x, front.y, Block.DungeonSoil);
		return true;
	}

	// ========================================================================
	// UPDATE
	// ========================================================================

	/**
	 * Main update called each frame.
	 */
	protected onUpdate(tmod: number, world: World): void {
		// Handle attack input
		if (this.attackJustPressed && this.flags.hasSword) {
			this.attack();
		}

		// Update sword
		this.updateSword(tmod);

		// Handle movement
		if (!this.sword.active) {
			if (this.flags.freeMovement) {
				this.handleFreeMovement(tmod, world);
			} else {
				this.handleGridMovement(world);
			}
		}

		// Reset push counter if not pushing
		const dir = this.getInputDirection();
		if (dir === null || dir !== this.direction) {
			this.pushCounter = 0;
		}
	}

	/**
	 * Get render sprite kind (Hero or HeroUp based on direction).
	 */
	getRenderKind(): EKind {
		return this.direction === Direction.Up ? EKind.HeroUp : EKind.Hero;
	}

	// ========================================================================
	// SERIALIZATION
	// ========================================================================

	/**
	 * Serialize hero state for saving.
	 */
	toSaveData(): SerializedHero {
		return {
			x: this.x,
			y: this.y,
			ix: this.ix,
			iy: this.iy,
			direction: this.direction,
			hp: this.hp,
			inventory: { ...this.inventory },
			flags: { ...this.flags }
		};
	}

	/**
	 * Restore hero state from save data.
	 */
	fromSaveData(data: SerializedHero): void {
		this.x = data.x;
		this.y = data.y;
		this.ix = data.ix;
		this.iy = data.iy;
		this.direction = data.direction;
		this.hp = data.hp;
		this.inventory = { ...data.inventory };
		this.flags = { ...data.flags };
	}

	// ========================================================================
	// PROGRESSION FLAGS
	// ========================================================================

	/**
	 * Enable left movement (CLeftCtrl chest).
	 */
	unlockLeftMovement(): void {
		this.flags.canMoveLeft = true;
	}

	/**
	 * Enable all direction movement (CRightCtrl chest or similar).
	 */
	unlockAllDirections(): void {
		this.flags.canMoveAll = true;
		this.flags.canMoveLeft = true;
	}

	/**
	 * Enable free movement (CFreeMove chest).
	 */
	unlockFreeMovement(): void {
		this.flags.freeMovement = true;
		this.flags.canMoveLeft = true;
	}

	/**
	 * Enable sword (CWeapon chest).
	 */
	unlockSword(): void {
		this.flags.hasSword = true;
	}

	/**
	 * Enable push block (CPushBlock chest).
	 */
	unlockPushBlock(): void {
		this.flags.canPushBlock = true;
	}
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a hero at pixel position.
 */
export function createHero(x: number, y: number): Hero {
	return new Hero(x, y);
}

/**
 * Create a hero at grid position.
 */
export function createHeroAtGrid(ix: number, iy: number): Hero {
	const hero = new Hero(ix * TILE_SIZE, iy * TILE_SIZE);
	hero.ix = ix;
	hero.iy = iy;
	return hero;
}
