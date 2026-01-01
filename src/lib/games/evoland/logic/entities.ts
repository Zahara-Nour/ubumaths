/**
 * Evoland Entity System
 *
 * Base entity class for all game entities (hero, monsters, NPCs, etc.)
 * Based on the original Entity.hx from Evoland.
 */

import { Direction, DIRECTION_VECTORS, EKind, TILE_SIZE } from './constants';
import type { World } from './world';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Entity state that can be serialized for save/load.
 */
export interface SerializedEntity {
	readonly kind: EKind;
	readonly x: number;
	readonly y: number;
	readonly ix: number;
	readonly iy: number;
	readonly direction: Direction;
	readonly hp?: number;
}

/**
 * Axis-aligned bounding box for collision detection.
 */
export interface AABB {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/**
 * Movement target for grid-based movement.
 */
export interface MoveTarget {
	readonly x: number;
	readonly y: number;
}

/**
 * Entity animation state.
 */
export interface AnimationState {
	/** Current animation frame */
	frame: number;
	/** Frame counter for timing */
	counter: number;
	/** Frames per animation step */
	frameDelay: number;
	/** Total frames in animation */
	totalFrames: number;
	/** Is animation playing */
	playing: boolean;
}

// ============================================================================
// ENTITY BASE CLASS
// ============================================================================

/**
 * Base class for all game entities.
 *
 * Provides:
 * - Position management (continuous and grid-based)
 * - Target-based movement with interpolation
 * - Direction facing
 * - Animation state
 * - AABB collision bounds
 *
 * @example
 * ```typescript
 * const hero = new Entity(EKind.Hero, 100, 100);
 * hero.setTarget(116, 100); // Move one tile right
 *
 * // In game loop
 * hero.update(tmod, world);
 * ```
 */
export class Entity {
	/** Entity type identifier */
	readonly kind: EKind;

	/** Continuous X position (pixels) */
	x: number;

	/** Continuous Y position (pixels) */
	y: number;

	/** Grid X position (tiles) */
	ix: number;

	/** Grid Y position (tiles) */
	iy: number;

	/** Current facing direction */
	direction: Direction;

	/** Movement target (null if stationary) */
	protected target: MoveTarget | null = null;

	/** Movement speed (pixels per frame at tmod=1) */
	speed: number = 1.5;

	/** Animation state */
	animation: AnimationState;

	/** Health points (-1 = invulnerable) */
	hp: number = -1;

	/** Maximum health points */
	maxHp: number = -1;

	/** Hit recovery counter (invincibility frames) */
	hitRecovery: number = 0;

	/** Is entity removed/dead */
	removed: boolean = false;

	/** Collision bounds offset from position */
	protected boundsOffset: AABB = { x: 2, y: 8, width: 12, height: 8 };

	/**
	 * Create a new entity.
	 * @param kind - Entity type
	 * @param x - Initial X position (pixels)
	 * @param y - Initial Y position (pixels)
	 */
	constructor(kind: EKind, x: number, y: number) {
		this.kind = kind;
		this.x = x;
		this.y = y;
		this.ix = Math.floor(x / TILE_SIZE);
		this.iy = Math.floor(y / TILE_SIZE);
		this.direction = Direction.Down;

		this.animation = {
			frame: 0,
			counter: 0,
			frameDelay: 8,
			totalFrames: 2,
			playing: false
		};
	}

	// ========================================================================
	// POSITION MANAGEMENT
	// ========================================================================

	/**
	 * Set position directly (teleport).
	 */
	setPosition(x: number, y: number): void {
		this.x = x;
		this.y = y;
		this.ix = Math.floor(x / TILE_SIZE);
		this.iy = Math.floor(y / TILE_SIZE);
		this.target = null;
	}

	/**
	 * Set grid position (converts to pixel position).
	 */
	setGridPosition(ix: number, iy: number): void {
		this.ix = ix;
		this.iy = iy;
		this.x = ix * TILE_SIZE;
		this.y = iy * TILE_SIZE;
		this.target = null;
	}

	/**
	 * Get center position (for rendering/collision).
	 */
	getCenter(): { x: number; y: number } {
		return {
			x: this.x + TILE_SIZE / 2,
			y: this.y + TILE_SIZE / 2
		};
	}

	/**
	 * Get collision bounds in world coordinates.
	 */
	getBounds(): AABB {
		return {
			x: this.x + this.boundsOffset.x,
			y: this.y + this.boundsOffset.y,
			width: this.boundsOffset.width,
			height: this.boundsOffset.height
		};
	}

	/**
	 * Set custom collision bounds.
	 */
	setBounds(offsetX: number, offsetY: number, width: number, height: number): void {
		this.boundsOffset = { x: offsetX, y: offsetY, width, height };
	}

	// ========================================================================
	// MOVEMENT
	// ========================================================================

	/**
	 * Set movement target (for grid-based movement).
	 */
	setTarget(x: number, y: number): void {
		this.target = { x, y };
		this.animation.playing = true;
	}

	/**
	 * Check if entity has reached its target.
	 */
	hasReachedTarget(): boolean {
		if (!this.target) return true;
		return this.x === this.target.x && this.y === this.target.y;
	}

	/**
	 * Check if entity is currently moving.
	 */
	isMoving(): boolean {
		return this.target !== null && !this.hasReachedTarget();
	}

	/**
	 * Move towards target by speed amount.
	 * @param tmod - Time modifier (1.0 = normal speed)
	 * @returns True if still moving, false if reached target
	 */
	protected moveTowardsTarget(tmod: number): boolean {
		if (!this.target) return false;

		const dx = this.target.x - this.x;
		const dy = this.target.y - this.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		// Guard against zero distance (already at target)
		if (distance === 0) {
			this.target = null;
			this.animation.playing = false;
			return false;
		}

		if (distance <= this.speed * tmod) {
			// Reached target
			this.x = this.target.x;
			this.y = this.target.y;
			this.ix = Math.floor(this.x / TILE_SIZE);
			this.iy = Math.floor(this.y / TILE_SIZE);
			this.target = null;
			this.animation.playing = false;
			return false;
		}

		// Move towards target (safe - distance > 0)
		const moveX = (dx / distance) * this.speed * tmod;
		const moveY = (dy / distance) * this.speed * tmod;
		this.x += moveX;
		this.y += moveY;

		return true;
	}

	/**
	 * Try to move in a direction (grid-based).
	 * @param dir - Direction to move
	 * @param world - World for collision checking
	 * @returns True if movement started, false if blocked
	 */
	tryMove(dir: Direction, world: World): boolean {
		// Already moving?
		if (this.isMoving()) return false;

		const vec = DIRECTION_VECTORS[dir];
		const targetIx = this.ix + vec.dx;
		const targetIy = this.iy + vec.dy;

		// Check collision
		if (world.collide(targetIx, targetIy)) {
			return false;
		}

		// Set direction and target
		this.direction = dir;
		this.setTarget(targetIx * TILE_SIZE, targetIy * TILE_SIZE);
		return true;
	}

	/**
	 * Move freely (pixel-based with collision).
	 * @param dx - X velocity
	 * @param dy - Y velocity
	 * @param world - World for collision checking
	 * @param tmod - Time modifier
	 */
	moveFree(dx: number, dy: number, world: World, tmod: number): void {
		// Update direction based on movement
		if (Math.abs(dx) > Math.abs(dy)) {
			this.direction = dx > 0 ? Direction.Right : Direction.Left;
		} else if (dy !== 0) {
			this.direction = dy > 0 ? Direction.Down : Direction.Up;
		}

		// Apply movement with collision
		const bounds = this.getBounds();
		const newX = this.x + dx * tmod;
		const newY = this.y + dy * tmod;

		// Check X movement
		if (dx !== 0) {
			const checkX = dx > 0 ? bounds.x + bounds.width + dx * tmod : bounds.x + dx * tmod;
			if (!world.collideBox(checkX, bounds.y, 1, bounds.height)) {
				this.x = newX;
			}
		}

		// Check Y movement
		if (dy !== 0) {
			const checkY = dy > 0 ? bounds.y + bounds.height + dy * tmod : bounds.y + dy * tmod;
			const currentBounds = this.getBounds();
			if (!world.collideBox(currentBounds.x, checkY, currentBounds.width, 1)) {
				this.y = newY;
			}
		}

		// Update grid position
		this.ix = Math.floor(this.x / TILE_SIZE);
		this.iy = Math.floor(this.y / TILE_SIZE);

		// Animation
		if (dx !== 0 || dy !== 0) {
			this.animation.playing = true;
		}
	}

	// ========================================================================
	// ANIMATION
	// ========================================================================

	/**
	 * Update animation state.
	 */
	protected updateAnimation(): void {
		if (!this.animation.playing) {
			this.animation.frame = 0;
			return;
		}

		this.animation.counter++;
		if (this.animation.counter >= this.animation.frameDelay) {
			this.animation.counter = 0;
			this.animation.frame = (this.animation.frame + 1) % this.animation.totalFrames;
		}
	}

	/**
	 * Set animation parameters.
	 */
	setAnimation(totalFrames: number, frameDelay: number): void {
		this.animation.totalFrames = totalFrames;
		this.animation.frameDelay = frameDelay;
	}

	// ========================================================================
	// COMBAT
	// ========================================================================

	/**
	 * Take damage.
	 * @param amount - Damage amount
	 * @param recoveryFrames - Invincibility frames after hit
	 * @returns True if entity died
	 */
	takeDamage(amount: number, recoveryFrames: number = 60): boolean {
		// Invincible or already dead
		if (this.hp < 0 || this.hitRecovery > 0 || this.removed) {
			return false;
		}

		this.hp -= amount;
		this.hitRecovery = recoveryFrames;

		if (this.hp <= 0) {
			this.hp = 0;
			this.removed = true;
			return true;
		}

		return false;
	}

	/**
	 * Heal entity.
	 * @param amount - Heal amount
	 */
	heal(amount: number): void {
		if (this.hp < 0 || this.maxHp < 0) return;
		this.hp = Math.min(this.hp + amount, this.maxHp);
	}

	/**
	 * Check if entity is invincible (hit recovery active).
	 */
	isInvincible(): boolean {
		return this.hitRecovery > 0;
	}

	// ========================================================================
	// COLLISION
	// ========================================================================

	/**
	 * Check AABB collision with another entity.
	 */
	collidesWith(other: Entity): boolean {
		if (this.removed || other.removed) return false;

		const a = this.getBounds();
		const b = other.getBounds();

		return (
			a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
		);
	}

	/**
	 * Check if point is inside entity bounds.
	 */
	containsPoint(px: number, py: number): boolean {
		const bounds = this.getBounds();
		return (
			px >= bounds.x &&
			px < bounds.x + bounds.width &&
			py >= bounds.y &&
			py < bounds.y + bounds.height
		);
	}

	/**
	 * Get distance to another entity (center to center).
	 */
	distanceTo(other: Entity): number {
		const a = this.getCenter();
		const b = other.getCenter();
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	/**
	 * Get grid distance to another entity.
	 */
	gridDistanceTo(other: Entity): number {
		return Math.abs(this.ix - other.ix) + Math.abs(this.iy - other.iy);
	}

	// ========================================================================
	// UPDATE
	// ========================================================================

	/**
	 * Update entity state (called every frame).
	 * @param tmod - Time modifier
	 * @param world - World reference
	 */
	update(tmod: number, world: World): void {
		// Update hit recovery
		if (this.hitRecovery > 0) {
			this.hitRecovery = Math.max(0, this.hitRecovery - tmod);
		}

		// Move towards target
		this.moveTowardsTarget(tmod);

		// Update animation
		this.updateAnimation();

		// Subclasses override for specific behavior
		this.onUpdate(tmod, world);
	}

	/**
	 * Override in subclasses for custom update logic.
	 */

	protected onUpdate(_tmod: number, _world: World): void {
		// Override in subclasses
	}

	// ========================================================================
	// SERIALIZATION
	// ========================================================================

	/**
	 * Serialize entity state.
	 */
	toJSON(): SerializedEntity {
		return {
			kind: this.kind,
			x: this.x,
			y: this.y,
			ix: this.ix,
			iy: this.iy,
			direction: this.direction,
			hp: this.hp >= 0 ? this.hp : undefined
		};
	}

	/**
	 * Restore entity state from serialized data.
	 */
	fromJSON(data: SerializedEntity): void {
		this.x = data.x;
		this.y = data.y;
		this.ix = data.ix;
		this.iy = data.iy;
		this.direction = data.direction;
		if (data.hp !== undefined) {
			this.hp = data.hp;
		}
	}
}

// ============================================================================
// ENTITY MANAGER
// ============================================================================

/**
 * Manages a collection of entities.
 *
 * Provides:
 * - Entity creation and removal
 * - Update loop for all entities
 * - Collision queries
 * - Y-sorted iteration for rendering
 */
export class EntityManager {
	private entities: Entity[] = [];
	private toRemove: Set<Entity> = new Set();

	/**
	 * Add an entity to the manager.
	 */
	add(entity: Entity): void {
		this.entities.push(entity);
	}

	/**
	 * Mark an entity for removal (processed at end of frame).
	 */
	remove(entity: Entity): void {
		entity.removed = true;
		this.toRemove.add(entity);
	}

	/**
	 * Get all entities.
	 */
	getAll(): readonly Entity[] {
		return this.entities;
	}

	/**
	 * Get entities of a specific kind.
	 */
	getByKind(kind: EKind): Entity[] {
		return this.entities.filter((e) => e.kind === kind && !e.removed);
	}

	/**
	 * Get entities sorted by Y position (for rendering).
	 */
	getYSorted(): Entity[] {
		return [...this.entities].filter((e) => !e.removed).sort((a, b) => a.y - b.y);
	}

	/**
	 * Find entity at grid position.
	 */
	findAtGrid(ix: number, iy: number): Entity | null {
		return this.entities.find((e) => !e.removed && e.ix === ix && e.iy === iy) ?? null;
	}

	/**
	 * Find entities colliding with given entity.
	 */
	findCollisions(entity: Entity): Entity[] {
		return this.entities.filter((e) => e !== entity && !e.removed && entity.collidesWith(e));
	}

	/**
	 * Find entities within radius of a point.
	 */
	findInRadius(x: number, y: number, radius: number): Entity[] {
		return this.entities.filter((e) => {
			if (e.removed) return false;
			const center = e.getCenter();
			const dx = center.x - x;
			const dy = center.y - y;
			return Math.sqrt(dx * dx + dy * dy) <= radius;
		});
	}

	/**
	 * Update all entities.
	 */
	update(tmod: number, world: World): void {
		// Update all entities
		for (const entity of this.entities) {
			if (!entity.removed) {
				entity.update(tmod, world);
			}
		}

		// Remove marked entities
		if (this.toRemove.size > 0) {
			this.entities = this.entities.filter((e) => !this.toRemove.has(e));
			this.toRemove.clear();
		}
	}

	/**
	 * Clear all entities.
	 */
	clear(): void {
		this.entities = [];
		this.toRemove.clear();
	}

	/**
	 * Get entity count (active only).
	 */
	count(): number {
		return this.entities.filter((e) => !e.removed).length;
	}
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create an entity at a grid position.
 */
export function createEntityAtGrid(kind: EKind, ix: number, iy: number): Entity {
	const entity = new Entity(kind, ix * TILE_SIZE, iy * TILE_SIZE);
	entity.ix = ix;
	entity.iy = iy;
	return entity;
}

/**
 * Create an entity manager.
 */
export function createEntityManager(): EntityManager {
	return new EntityManager();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get opposite direction.
 */
export function getOppositeDirection(dir: Direction): Direction {
	switch (dir) {
		case Direction.Up:
			return Direction.Down;
		case Direction.Down:
			return Direction.Up;
		case Direction.Left:
			return Direction.Right;
		case Direction.Right:
			return Direction.Left;
	}
}

/**
 * Get direction from one position to another.
 */
export function getDirectionTo(fromX: number, fromY: number, toX: number, toY: number): Direction {
	const dx = toX - fromX;
	const dy = toY - fromY;

	if (Math.abs(dx) > Math.abs(dy)) {
		return dx > 0 ? Direction.Right : Direction.Left;
	}
	return dy > 0 ? Direction.Down : Direction.Up;
}

/**
 * Check if two AABBs overlap.
 */
export function aabbOverlap(a: AABB, b: AABB): boolean {
	return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Get AABB from entity-like object.
 */
export function getEntityAABB(
	x: number,
	y: number,
	width: number = TILE_SIZE,
	height: number = TILE_SIZE
): AABB {
	return { x, y, width, height };
}
