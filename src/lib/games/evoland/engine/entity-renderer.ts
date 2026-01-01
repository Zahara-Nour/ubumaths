/**
 * Evoland Entity Renderer
 *
 * Renders game entities (hero, monsters, projectiles) with Y-sorting.
 * Based on the original DepthManager.hx for proper depth ordering.
 */

import type { Entity } from '../logic/entities';
import type { Hero } from '../logic/hero';
import type { Monster, Fireball } from '../logic/monster';
import type { SpriteSheet } from './sprite-sheet';
import type { Viewport } from './world-renderer';
import { Direction, EKind, TILE_SIZE } from '../logic/constants';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Sprite animation frame data.
 */
export interface SpriteAnimFrame {
	/** Column in sprite sheet */
	readonly col: number;
	/** Row in sprite sheet */
	readonly row: number;
	/** Flip sprite horizontally */
	readonly flipX?: boolean;
}

/**
 * Sprite definition for an entity kind.
 */
export interface SpriteDefinition {
	/** Frames per direction [Down, Up, Left, Right] or single for all */
	readonly frames: SpriteAnimFrame[][] | SpriteAnimFrame[];
	/** Shadow type: 0 = large, 1 = small, -1 = none */
	readonly shadow?: number;
	/** Y offset for rendering */
	readonly offsetY?: number;
}

// ============================================================================
// SPRITE DEFINITIONS
// ============================================================================

/**
 * Sprite definitions for each entity kind.
 * Based on sprites_alpha.png layout.
 */
const ENTITY_SPRITES: Record<EKind, SpriteDefinition> = {
	// Hero facing down/left/right (row 0-1)
	[EKind.Hero]: {
		frames: [
			// Down: frames 0-1
			[
				{ col: 0, row: 0 },
				{ col: 1, row: 0 }
			],
			// Up: use HeroUp (different sprite)
			[
				{ col: 0, row: 1 },
				{ col: 1, row: 1 }
			],
			// Left: flip right
			[
				{ col: 2, row: 0, flipX: true },
				{ col: 3, row: 0, flipX: true }
			],
			// Right
			[
				{ col: 2, row: 0 },
				{ col: 3, row: 0 }
			]
		],
		shadow: 0,
		offsetY: 0
	},

	// Hero facing up (row 1)
	[EKind.HeroUp]: {
		frames: [
			[
				{ col: 0, row: 1 },
				{ col: 1, row: 1 }
			]
		],
		shadow: 0,
		offsetY: 0
	},

	// NPC (row 2)
	[EKind.NPC]: {
		frames: [
			{ col: 0, row: 2 },
			{ col: 1, row: 2 }
		],
		shadow: 0,
		offsetY: 0
	},

	// Chest (row 3)
	[EKind.Chest]: {
		frames: [
			{ col: 0, row: 3 },
			{ col: 1, row: 3 }
		],
		shadow: 1,
		offsetY: 0
	},

	// Monster (row 4)
	[EKind.Monster]: {
		frames: [
			{ col: 0, row: 4 },
			{ col: 1, row: 4 }
		],
		shadow: 0,
		offsetY: 0
	},

	// Sword (row 5-6, different directions)
	[EKind.Sword]: {
		frames: [
			// Down
			[{ col: 0, row: 5 }],
			// Up
			[{ col: 1, row: 5 }],
			// Left
			[{ col: 0, row: 6 }],
			// Right
			[{ col: 1, row: 6 }]
		],
		shadow: -1,
		offsetY: 0
	},

	// SavePoint (row 7)
	[EKind.SavePoint]: {
		frames: [
			{ col: 0, row: 7 },
			{ col: 1, row: 7 },
			{ col: 2, row: 7 },
			{ col: 3, row: 7 }
		],
		shadow: -1,
		offsetY: 0
	},

	// Cursor (row 8)
	[EKind.Cursor]: {
		frames: [{ col: 0, row: 8 }],
		shadow: -1,
		offsetY: 0
	},

	// Bat (row 9)
	[EKind.Bat]: {
		frames: [
			{ col: 0, row: 9 },
			{ col: 1, row: 9 }
		],
		shadow: 1,
		offsetY: -4
	},

	// Knight (row 10)
	[EKind.Knight]: {
		frames: [
			{ col: 0, row: 10 },
			{ col: 1, row: 10 }
		],
		shadow: 0,
		offsetY: 0
	},

	// Fireball (row 11)
	[EKind.Fireball]: {
		frames: [
			{ col: 0, row: 11 },
			{ col: 1, row: 11 },
			{ col: 2, row: 11 },
			{ col: 3, row: 11 }
		],
		shadow: -1,
		offsetY: 0
	}
};

// ============================================================================
// ENTITY RENDERER CLASS
// ============================================================================

/**
 * Renders entities with proper depth sorting and animation.
 *
 * Features:
 * - Y-sorting for depth ordering
 * - Animation frame cycling
 * - Shadow rendering
 * - Directional sprites
 * - Sword attack rendering
 * - Hit flash effect
 *
 * @example
 * ```typescript
 * const entityRenderer = new EntityRenderer(spritesSheet);
 *
 * // In render loop
 * entityRenderer.render(ctx, entities, viewport);
 * ```
 */
export class EntityRenderer {
	private sprites: SpriteSheet;

	/**
	 * Create a new entity renderer.
	 * @param spritesSheet - Sprite sheet for entities
	 */
	constructor(spritesSheet: SpriteSheet) {
		this.sprites = spritesSheet;
	}

	/**
	 * Render all entities with Y-sorting.
	 * @param ctx - Canvas context
	 * @param entities - Entities to render
	 * @param viewport - Camera viewport
	 */
	render(ctx: CanvasRenderingContext2D, entities: readonly Entity[], viewport: Viewport): void {
		// Sort by Y position (entities lower on screen render on top)
		const sorted = [...entities].filter((e) => !e.removed).sort((a, b) => a.y - b.y);

		for (const entity of sorted) {
			this.renderEntity(ctx, entity, viewport);
		}
	}

	/**
	 * Render a single entity.
	 */
	private renderEntity(ctx: CanvasRenderingContext2D, entity: Entity, viewport: Viewport): void {
		const screenX = entity.x - viewport.x;
		const screenY = entity.y - viewport.y;

		// Skip if off-screen
		if (
			screenX + TILE_SIZE < 0 ||
			screenY + TILE_SIZE < 0 ||
			screenX > viewport.width ||
			screenY > viewport.height
		) {
			return;
		}

		const def = ENTITY_SPRITES[entity.kind];
		if (!def) return;

		// Draw shadow
		if (def.shadow !== undefined && def.shadow >= 0) {
			this.drawShadow(ctx, screenX, screenY, def.shadow);
		}

		// Get animation frame
		const frame = this.getAnimationFrame(entity, def);
		if (!frame) return;

		// Apply hit flash (white flash when taking damage)
		if (entity.hitRecovery > 0 && Math.floor(entity.hitRecovery / 4) % 2 === 0) {
			ctx.globalAlpha = 0.5;
		}

		// Draw sprite
		const offsetY = def.offsetY ?? 0;
		this.sprites.drawSprite(
			ctx,
			frame.col,
			frame.row,
			screenX,
			screenY + offsetY,
			frame.flipX ?? false,
			false
		);

		// Reset alpha
		ctx.globalAlpha = 1;
	}

	/**
	 * Render hero with sword if attacking.
	 */
	renderHero(ctx: CanvasRenderingContext2D, hero: Hero, viewport: Viewport): void {
		const screenX = hero.x - viewport.x;
		const screenY = hero.y - viewport.y;

		// Get correct hero sprite (up vs other directions)
		const heroKind = hero.getRenderKind();
		const def = ENTITY_SPRITES[heroKind];
		if (!def) return;

		// Draw shadow
		if (def.shadow !== undefined && def.shadow >= 0) {
			this.drawShadow(ctx, screenX, screenY, def.shadow);
		}

		// Get animation frame based on direction
		const frame = this.getDirectionalFrame(hero, def);
		if (!frame) return;

		// Apply hit flash
		if (hero.hitRecovery > 0 && Math.floor(hero.hitRecovery / 4) % 2 === 0) {
			ctx.globalAlpha = 0.5;
		}

		// Draw hero
		this.sprites.drawSprite(
			ctx,
			frame.col,
			frame.row,
			screenX,
			screenY,
			frame.flipX ?? false,
			false
		);

		// Draw sword if attacking
		if (hero.sword.active) {
			this.renderSword(ctx, hero, viewport);
		}

		ctx.globalAlpha = 1;
	}

	/**
	 * Render sword attack.
	 */
	private renderSword(ctx: CanvasRenderingContext2D, hero: Hero, viewport: Viewport): void {
		const swordDef = ENTITY_SPRITES[EKind.Sword];
		if (!swordDef || !Array.isArray(swordDef.frames[0])) return;

		const frames = swordDef.frames as SpriteAnimFrame[][];
		const dirFrames = frames[hero.sword.direction];
		if (!dirFrames || dirFrames.length === 0) return;

		const frame = dirFrames[0];

		// Calculate sword position based on direction
		let swordX = hero.x - viewport.x;
		let swordY = hero.y - viewport.y;

		switch (hero.sword.direction) {
			case Direction.Up:
				swordY -= TILE_SIZE;
				break;
			case Direction.Down:
				swordY += TILE_SIZE;
				break;
			case Direction.Left:
				swordX -= TILE_SIZE;
				break;
			case Direction.Right:
				swordX += TILE_SIZE;
				break;
		}

		this.sprites.drawSprite(ctx, frame.col, frame.row, swordX, swordY, frame.flipX ?? false, false);
	}

	/**
	 * Render monsters.
	 */
	renderMonsters(
		ctx: CanvasRenderingContext2D,
		monsters: readonly Monster[],
		viewport: Viewport
	): void {
		// Sort by Y
		const sorted = [...monsters].filter((m) => !m.removed).sort((a, b) => a.y - b.y);

		for (const monster of sorted) {
			this.renderEntity(ctx, monster, viewport);
		}
	}

	/**
	 * Render fireballs.
	 */
	renderFireballs(
		ctx: CanvasRenderingContext2D,
		fireballs: readonly Fireball[],
		viewport: Viewport
	): void {
		for (const fireball of fireballs) {
			if (!fireball.removed) {
				this.renderEntity(ctx, fireball, viewport);
			}
		}
	}

	/**
	 * Get animation frame for entity.
	 */
	private getAnimationFrame(entity: Entity, def: SpriteDefinition): SpriteAnimFrame | null {
		const frames = def.frames;

		if (!frames || frames.length === 0) return null;

		// Check if directional frames
		if (Array.isArray(frames[0])) {
			return this.getDirectionalFrame(entity, def);
		}

		// Single animation sequence
		const animFrames = frames as SpriteAnimFrame[];
		const frameIndex = entity.animation.frame % animFrames.length;
		return animFrames[frameIndex];
	}

	/**
	 * Get directional animation frame.
	 */
	private getDirectionalFrame(entity: Entity, def: SpriteDefinition): SpriteAnimFrame | null {
		const frames = def.frames as SpriteAnimFrame[][];

		if (!frames || frames.length === 0) return null;

		// Get direction index
		const dirIndex = Math.min(entity.direction, frames.length - 1);
		const dirFrames = frames[dirIndex];

		if (!dirFrames || dirFrames.length === 0) return null;

		const frameIndex = entity.animation.frame % dirFrames.length;
		return dirFrames[frameIndex];
	}

	/**
	 * Draw shadow ellipse.
	 */
	private drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
		ctx.save();
		ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
		ctx.beginPath();

		if (size === 0) {
			// Large shadow
			ctx.ellipse(x + 8, y + 14, 7, 4, 0, 0, Math.PI * 2);
		} else {
			// Small shadow
			ctx.ellipse(x + 8, y + 14, 5, 3, 0, 0, Math.PI * 2);
		}

		ctx.fill();
		ctx.restore();
	}

	/**
	 * Update sprite sheet reference.
	 */
	setSpriteSheet(sprites: SpriteSheet): void {
		this.sprites = sprites;
	}
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create an entity renderer.
 */
export function createEntityRenderer(spritesSheet: SpriteSheet): EntityRenderer {
	return new EntityRenderer(spritesSheet);
}
