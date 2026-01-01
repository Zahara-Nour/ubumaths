/**
 * Evoland Monster Entities
 *
 * AI patterns for different enemy types.
 * Based on the original Monster.hx from Evoland.
 */

import { Entity, type AABB, aabbOverlap } from './entities';
import type { World } from './world';
import { Direction, DIRECTION_VECTORS, EKind, TILE_SIZE, XP_PER_KILL } from './constants';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Monster spawn data from world.
 */
export interface MonsterSpawnData {
	readonly x: number;
	readonly y: number;
	readonly kind: EKind;
}

/**
 * Monster behavior pattern.
 */
export type MonsterBehavior = 'random' | 'bat' | 'knight';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Monster move delay in frames */
const MONSTER_MOVE_DELAY = 40;

/** Bat flight radius in tiles */
const BAT_RADIUS = 4;

/** Bat move delay (faster than monsters) */
const BAT_MOVE_DELAY = 20;

/** Knight teleport cooldown */
const KNIGHT_TELEPORT_DELAY = 100;

/** Knight aggro range in tiles */
const KNIGHT_AGGRO_RANGE = 6;

/** Fireball speed */
const FIREBALL_SPEED = 2;

/** Fireball lifetime in frames */
const FIREBALL_LIFETIME = 120;

// ============================================================================
// MONSTER BASE CLASS
// ============================================================================

/**
 * Base monster entity.
 *
 * Features:
 * - Random walk AI (default)
 * - Collision with hero for damage
 * - Death on sword hit
 * - XP drop on death
 */
export class Monster extends Entity {
	/** Spawn position (for patrol AI) */
	spawnX: number;
	spawnY: number;

	/** AI behavior pattern */
	behavior: MonsterBehavior;

	/** Move timer */
	moveTimer: number;

	/** Move delay */
	moveDelay: number;

	/** XP reward on death */
	xpReward: number = XP_PER_KILL;

	/** Gold drop on death (random 0-2) */
	goldDrop: number = 0;

	/**
	 * Create a monster.
	 * @param kind - Monster type (Monster, Bat, Knight)
	 * @param x - Spawn X position
	 * @param y - Spawn Y position
	 */
	constructor(kind: EKind, x: number, y: number) {
		super(kind, x, y);

		this.spawnX = x;
		this.spawnY = y;

		// Set up HP
		this.hp = 1;
		this.maxHp = 1;

		// Movement speed
		this.speed = 1;

		// AI behavior based on kind
		switch (kind) {
			case EKind.Bat:
				this.behavior = 'bat';
				this.moveDelay = BAT_MOVE_DELAY;
				break;
			case EKind.Knight:
				this.behavior = 'knight';
				this.moveDelay = KNIGHT_TELEPORT_DELAY;
				this.hp = 3;
				this.maxHp = 3;
				break;
			default:
				this.behavior = 'random';
				this.moveDelay = MONSTER_MOVE_DELAY;
		}

		// Initialize move timer with random offset
		this.moveTimer = Math.random() * this.moveDelay;

		// Set up collision bounds
		this.setBounds(2, 8, 12, 8);

		// Animation
		this.setAnimation(2, 10);
	}

	// ========================================================================
	// AI BEHAVIOR
	// ========================================================================

	/**
	 * Random walk AI - move to random adjacent tile.
	 */
	private randomWalk(world: World): void {
		// Get random direction using Fisher-Yates shuffle
		const directions = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
		for (let i = directions.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[directions[i], directions[j]] = [directions[j], directions[i]];
		}

		for (const dir of directions) {
			const vec = DIRECTION_VECTORS[dir];
			const targetX = this.ix + vec.dx;
			const targetY = this.iy + vec.dy;

			if (!world.collide(targetX, targetY)) {
				this.tryMove(dir, world);
				return;
			}
		}
	}

	/**
	 * Bat AI - fly within radius of spawn point.
	 */
	private batFlight(world: World): void {
		// Get random direction
		const directions = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
		const dir = directions[Math.floor(Math.random() * 4)];
		const vec = DIRECTION_VECTORS[dir];

		const targetX = this.ix + vec.dx;
		const targetY = this.iy + vec.dy;

		// Check if within radius of spawn
		const spawnIx = Math.floor(this.spawnX / TILE_SIZE);
		const spawnIy = Math.floor(this.spawnY / TILE_SIZE);
		const distFromSpawn = Math.abs(targetX - spawnIx) + Math.abs(targetY - spawnIy);

		if (distFromSpawn <= BAT_RADIUS && !world.collide(targetX, targetY)) {
			this.tryMove(dir, world);
		}
	}

	/**
	 * Knight AI - teleport near hero and attack.
	 * @returns Fireball if knight shoots, null otherwise
	 */
	private knightBehavior(world: World, heroX: number, heroY: number): Fireball | null {
		const heroIx = Math.floor(heroX / TILE_SIZE);
		const heroIy = Math.floor(heroY / TILE_SIZE);
		const dist = Math.abs(this.ix - heroIx) + Math.abs(this.iy - heroIy);

		// If hero in range, teleport and shoot
		if (dist <= KNIGHT_AGGRO_RANGE) {
			// Find position near hero
			const offsets = [
				{ dx: 0, dy: -2 },
				{ dx: 0, dy: 2 },
				{ dx: -2, dy: 0 },
				{ dx: 2, dy: 0 }
			];

			// Shuffle using Fisher-Yates and find valid teleport spot
			for (let i = offsets.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[offsets[i], offsets[j]] = [offsets[j], offsets[i]];
			}

			for (const offset of offsets) {
				const teleportX = heroIx + offset.dx;
				const teleportY = heroIy + offset.dy;

				if (!world.collide(teleportX, teleportY)) {
					// Teleport
					this.setGridPosition(teleportX, teleportY);

					// Face hero
					if (Math.abs(heroIx - teleportX) > Math.abs(heroIy - teleportY)) {
						this.direction = heroIx > teleportX ? Direction.Right : Direction.Left;
					} else {
						this.direction = heroIy > teleportY ? Direction.Down : Direction.Up;
					}

					// Shoot fireball
					const fireballX = this.x + TILE_SIZE / 2;
					const fireballY = this.y + TILE_SIZE / 2;
					return new Fireball(fireballX, fireballY, this.direction);
				}
			}
		}

		return null;
	}

	// ========================================================================
	// UPDATE
	// ========================================================================

	protected onUpdate(tmod: number, world: World): void {
		// Waiting for move to complete
		if (this.isMoving()) return;

		// Update move timer
		this.moveTimer -= tmod;
		if (this.moveTimer > 0) return;

		// Reset timer
		this.moveTimer = this.moveDelay;

		// Execute AI behavior
		switch (this.behavior) {
			case 'random':
				this.randomWalk(world);
				break;
			case 'bat':
				this.batFlight(world);
				break;
			// Knight is handled separately with hero position
		}
	}

	/**
	 * Update knight AI (needs hero position).
	 * @returns Fireball if knight shoots
	 */
	updateKnight(tmod: number, world: World, heroX: number, heroY: number): Fireball | null {
		if (this.behavior !== 'knight') return null;

		// Waiting for move to complete
		if (this.isMoving()) return null;

		// Update move timer
		this.moveTimer -= tmod;
		if (this.moveTimer > 0) return null;

		// Reset timer
		this.moveTimer = this.moveDelay;

		return this.knightBehavior(world, heroX, heroY);
	}

	/**
	 * Check if monster collides with hero.
	 */
	hitsHero(heroX: number, heroY: number, heroWidth: number, heroHeight: number): boolean {
		if (this.removed) return false;

		const monsterBounds = this.getBounds();
		const heroBounds: AABB = {
			x: heroX,
			y: heroY,
			width: heroWidth,
			height: heroHeight
		};

		return aabbOverlap(monsterBounds, heroBounds);
	}

	/**
	 * Check if sword hitbox kills this monster.
	 */
	checkSwordHit(swordHitbox: AABB): boolean {
		if (this.removed || this.isInvincible()) return false;

		const bounds = this.getBounds();
		if (aabbOverlap(bounds, swordHitbox)) {
			return this.takeDamage(1, 0);
		}

		return false;
	}

	/**
	 * Calculate gold drop on death.
	 */
	calculateGoldDrop(): number {
		// Random 0-2 gold, weighted towards 0
		const roll = Math.random();
		if (roll < 0.6) return 0;
		if (roll < 0.9) return 1;
		return 2;
	}
}

// ============================================================================
// FIREBALL
// ============================================================================

/**
 * Fireball projectile shot by Knight.
 */
export class Fireball extends Entity {
	/** Velocity X */
	vx: number;

	/** Velocity Y */
	vy: number;

	/** Lifetime counter */
	lifetime: number;

	constructor(x: number, y: number, direction: Direction) {
		super(EKind.Fireball, x, y);

		this.direction = direction;
		this.lifetime = FIREBALL_LIFETIME;

		// Set velocity based on direction
		const vec = DIRECTION_VECTORS[direction];
		this.vx = vec.dx * FIREBALL_SPEED;
		this.vy = vec.dy * FIREBALL_SPEED;

		// Small collision bounds
		this.setBounds(4, 4, 8, 8);

		// Animation
		this.setAnimation(4, 4);
	}

	protected onUpdate(tmod: number, world: World): void {
		// Move
		this.x += this.vx * tmod;
		this.y += this.vy * tmod;

		// Update grid position
		this.ix = Math.floor(this.x / TILE_SIZE);
		this.iy = Math.floor(this.y / TILE_SIZE);

		// Decrease lifetime
		this.lifetime -= tmod;
		if (this.lifetime <= 0) {
			this.removed = true;
			return;
		}

		// Collision with world
		if (world.collide(this.ix, this.iy)) {
			this.removed = true;
		}

		// Keep animation playing
		this.animation.playing = true;
	}

	/**
	 * Check if fireball hits hero.
	 */
	hitsHero(heroX: number, heroY: number, heroWidth: number, heroHeight: number): boolean {
		if (this.removed) return false;

		const fireBounds = this.getBounds();
		const heroBounds: AABB = {
			x: heroX,
			y: heroY,
			width: heroWidth,
			height: heroHeight
		};

		if (aabbOverlap(fireBounds, heroBounds)) {
			this.removed = true;
			return true;
		}

		return false;
	}
}

// ============================================================================
// MONSTER MANAGER
// ============================================================================

/**
 * Manages monster spawning and updates.
 */
export class MonsterManager {
	private monsters: Monster[] = [];
	private fireballs: Fireball[] = [];
	private maxMonsters: number;

	constructor(maxMonsters: number = 50) {
		this.maxMonsters = maxMonsters;
	}

	/**
	 * Spawn a monster.
	 */
	spawn(kind: EKind, x: number, y: number): Monster | null {
		if (this.monsters.length >= this.maxMonsters) return null;

		const monster = new Monster(kind, x, y);
		this.monsters.push(monster);
		return monster;
	}

	/**
	 * Spawn monsters from world data.
	 */
	spawnFromWorld(spawns: MonsterSpawnData[]): void {
		for (const spawn of spawns) {
			this.spawn(spawn.kind, spawn.x * TILE_SIZE, spawn.y * TILE_SIZE);
		}
	}

	/**
	 * Add a fireball.
	 */
	addFireball(fireball: Fireball): void {
		this.fireballs.push(fireball);
	}

	/**
	 * Update all monsters and fireballs.
	 */
	update(tmod: number, world: World, heroX: number, heroY: number): void {
		// Update monsters
		for (const monster of this.monsters) {
			if (!monster.removed) {
				monster.update(tmod, world);

				// Special knight update
				if (monster.behavior === 'knight') {
					const fireball = monster.updateKnight(tmod, world, heroX, heroY);
					if (fireball) {
						this.addFireball(fireball);
					}
				}
			}
		}

		// Update fireballs
		for (const fireball of this.fireballs) {
			if (!fireball.removed) {
				fireball.update(tmod, world);
			}
		}

		// Remove dead entities
		this.monsters = this.monsters.filter((m) => !m.removed);
		this.fireballs = this.fireballs.filter((f) => !f.removed);
	}

	/**
	 * Check sword hits on all monsters.
	 * @returns Array of killed monsters
	 */
	checkSwordHits(swordHitbox: AABB | null): Monster[] {
		if (!swordHitbox) return [];

		const killed: Monster[] = [];
		for (const monster of this.monsters) {
			if (monster.checkSwordHit(swordHitbox)) {
				killed.push(monster);
			}
		}
		return killed;
	}

	/**
	 * Check hero collisions with monsters.
	 * @returns True if hero was hit
	 */
	checkHeroHit(heroX: number, heroY: number, heroWidth: number, heroHeight: number): boolean {
		for (const monster of this.monsters) {
			if (monster.hitsHero(heroX, heroY, heroWidth, heroHeight)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Check hero collisions with fireballs.
	 * @returns True if hero was hit
	 */
	checkFireballHit(heroX: number, heroY: number, heroWidth: number, heroHeight: number): boolean {
		for (const fireball of this.fireballs) {
			if (fireball.hitsHero(heroX, heroY, heroWidth, heroHeight)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Get all monsters.
	 */
	getMonsters(): readonly Monster[] {
		return this.monsters;
	}

	/**
	 * Get all fireballs.
	 */
	getFireballs(): readonly Fireball[] {
		return this.fireballs;
	}

	/**
	 * Get monster count.
	 */
	count(): number {
		return this.monsters.length;
	}

	/**
	 * Clear all monsters and fireballs.
	 */
	clear(): void {
		this.monsters = [];
		this.fireballs = [];
	}
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a monster at grid position.
 */
export function createMonster(kind: EKind, ix: number, iy: number): Monster {
	return new Monster(kind, ix * TILE_SIZE, iy * TILE_SIZE);
}

/**
 * Create a monster manager.
 */
export function createMonsterManager(maxMonsters?: number): MonsterManager {
	return new MonsterManager(maxMonsters);
}
