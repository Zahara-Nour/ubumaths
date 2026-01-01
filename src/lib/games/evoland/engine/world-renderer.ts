/**
 * Evoland World Renderer
 *
 * Renders the game world with two-pass terrain/details system.
 * Based on the original World.hx draw() method.
 */

import type { World } from '../logic/world';
import type { SpriteSheet } from './sprite-sheet';
import { Block, WORLD_SIZE, TILE_SIZE } from '../logic/constants';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Camera/viewport configuration for rendering.
 */
export interface Viewport {
	/** Camera X position (world pixels) */
	readonly x: number;
	/** Camera Y position (world pixels) */
	readonly y: number;
	/** Viewport width (screen pixels) */
	readonly width: number;
	/** Viewport height (screen pixels) */
	readonly height: number;
}

/**
 * Seeded random number generator for consistent detail placement.
 */
class SeededRandom {
	private seed: number;

	constructor(seed: number) {
		this.seed = seed;
	}

	/**
	 * Get next random integer in range [0, max).
	 */
	random(max: number): number {
		// LCG algorithm (same as Haxe Rand)
		this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
		return Math.floor((this.seed / 0x7fffffff) * max);
	}

	/**
	 * Reset the random seed.
	 */
	reset(seed: number): void {
		this.seed = seed;
	}
}

// ============================================================================
// WORLD RENDERER CLASS
// ============================================================================

/**
 * World tile renderer with viewport culling.
 *
 * Features:
 * - Two-pass rendering (terrain, then details)
 * - Viewport culling for performance
 * - Bank/shore tile transitions
 * - Random detail placement with seeded RNG
 * - Shadow rendering for obstacles
 *
 * @example
 * ```typescript
 * const worldRenderer = new WorldRenderer(world, tilesSheet);
 *
 * // In render loop
 * worldRenderer.render(ctx, {
 *   x: camera.x,
 *   y: camera.y,
 *   width: 240,
 *   height: 160
 * });
 * ```
 */
export class WorldRenderer {
	private world: World;
	private tiles: SpriteSheet;
	private rng: SeededRandom;

	/** Tile variant counts for each block type (from sprite sheet) */
	private tileVariants: Map<Block, number>;

	/**
	 * Create a new world renderer.
	 * @param world - World data to render
	 * @param tilesSheet - Tile sprite sheet
	 */
	constructor(world: World, tilesSheet: SpriteSheet) {
		this.world = world;
		this.tiles = tilesSheet;
		this.rng = new SeededRandom(42);
		this.tileVariants = new Map();

		// Set up tile variant counts based on sprite sheet layout
		// Each row in the sprite sheet corresponds to a block type
		// The number of columns varies per block type
		this.initTileVariants();
	}

	/**
	 * Initialize tile variant counts.
	 * Based on the tiles_alpha.png layout.
	 */
	private initTileVariants(): void {
		// These counts match the original Evoland tile sheet
		// Each block type may have multiple variants (columns in the sprite sheet)
		this.tileVariants.set(Block.Field, 1);
		this.tileVariants.set(Block.Tree, 4);
		this.tileVariants.set(Block.Water, 1);
		this.tileVariants.set(Block.BridgeUD, 1);
		this.tileVariants.set(Block.BridgeLR, 1);
		this.tileVariants.set(Block.Bush, 2);
		this.tileVariants.set(Block.RiverBank, 4); // N, E, W, S
		this.tileVariants.set(Block.Detail, 4);
		this.tileVariants.set(Block.Rock, 2);
		this.tileVariants.set(Block.SavePoint, 1);
		this.tileVariants.set(Block.Sand, 1);
		this.tileVariants.set(Block.SandBank, 4); // N, E, W, S
		this.tileVariants.set(Block.SandDetail, 4);
		this.tileVariants.set(Block.Cactus, 2);
		this.tileVariants.set(Block.Door, 1);
		this.tileVariants.set(Block.Dungeon, 1);
		this.tileVariants.set(Block.DungeonSoil, 1);
		this.tileVariants.set(Block.DungeonWall, 1);
		this.tileVariants.set(Block.DungeonStat, 1);
		this.tileVariants.set(Block.DungeonStairs, 1);
		this.tileVariants.set(Block.DungeonFakeWall, 1);
		this.tileVariants.set(Block.DungeonPuzzle, 1);
		this.tileVariants.set(Block.MonsterGenerator, 1);
		this.tileVariants.set(Block.FakeTree, 1);
		this.tileVariants.set(Block.DungeonExit, 1);
		this.tileVariants.set(Block.Dark, 1);
	}

	/**
	 * Render the world to a canvas context.
	 * @param ctx - Canvas 2D context
	 * @param viewport - Camera viewport
	 */
	render(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		viewport: Viewport
	): void {
		// Calculate visible tile range with 1 tile margin for partial visibility
		const startX = Math.max(0, Math.floor(viewport.x / TILE_SIZE) - 1);
		const startY = Math.max(0, Math.floor(viewport.y / TILE_SIZE) - 1);
		const endX = Math.min(WORLD_SIZE, Math.ceil((viewport.x + viewport.width) / TILE_SIZE) + 1);
		const endY = Math.min(WORLD_SIZE, Math.ceil((viewport.y + viewport.height) / TILE_SIZE) + 1);

		// Reset RNG for consistent rendering
		this.rng.reset(42);

		// First pass: terrain (soil, water, banks)
		for (let y = startY; y < endY; y++) {
			for (let x = startX; x < endX; x++) {
				this.drawTerrain(ctx, x, y, viewport);
			}
		}

		// Reset RNG again for details pass
		this.rng.reset(42);

		// Second pass: details (trees, rocks, decorations)
		for (let y = startY; y < endY; y++) {
			for (let x = startX; x < endX; x++) {
				this.drawDetails(ctx, x, y, viewport);
			}
		}
	}

	/**
	 * Draw terrain layer at a position.
	 */
	private drawTerrain(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		x: number,
		y: number,
		viewport: Viewport
	): void {
		const soil = this.world.getSoil(x, y);
		if (soil === null) return;

		const screenX = x * TILE_SIZE - viewport.x;
		const screenY = y * TILE_SIZE - viewport.y;

		// Draw base soil
		this.drawTile(ctx, soil, screenX, screenY, 0);

		// Draw bank/shore transitions
		if (soil === Block.Water) {
			// Check north
			const northSoil = this.world.getSoil(x, y - 1);
			if (northSoil !== Block.Water && northSoil !== null) {
				const bankType = northSoil === Block.Sand ? Block.SandBank : Block.RiverBank;
				this.drawTile(ctx, bankType, screenX, screenY, 0); // N variant
			}

			// Check east
			const eastSoil = this.world.getSoil(x + 1, y);
			if (eastSoil !== Block.Water && eastSoil !== null) {
				const bankType = eastSoil === Block.Sand ? Block.SandBank : Block.RiverBank;
				this.drawTile(ctx, bankType, screenX, screenY, 1); // E variant
			}

			// Check west
			const westSoil = this.world.getSoil(x - 1, y);
			if (westSoil !== Block.Water && westSoil !== null) {
				const bankType = westSoil === Block.Sand ? Block.SandBank : Block.RiverBank;
				this.drawTile(ctx, bankType, screenX, screenY, 2); // W variant
			}
		} else if (soil === Block.Field) {
			// Sand bank transitions on field
			if (this.world.getSoil(x, y - 1) === Block.Sand) {
				this.drawTile(ctx, Block.SandBank, screenX, screenY, 0);
			}
			if (this.world.getSoil(x + 1, y) === Block.Sand) {
				this.drawTile(ctx, Block.SandBank, screenX, screenY, 1);
			}
			if (this.world.getSoil(x - 1, y) === Block.Sand) {
				this.drawTile(ctx, Block.SandBank, screenX, screenY, 2);
			}
			if (this.world.getSoil(x, y + 1) === Block.Sand) {
				this.drawTile(ctx, Block.SandBank, screenX, screenY, 3);
			}
		}
	}

	/**
	 * Draw details layer at a position.
	 */
	private drawDetails(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		x: number,
		y: number,
		viewport: Viewport
	): void {
		// Skip if tile is removed
		if (this.world.isRemoved(x, y)) {
			return;
		}

		const block = this.world.getTile(x, y);
		const screenX = x * TILE_SIZE - viewport.x;
		const screenY = y * TILE_SIZE - viewport.y;

		switch (block) {
			case Block.Field:
				// Random grass details
				if (this.rng.random(3) === 0) {
					const dx = this.rng.random(7) - 3;
					const dy = -this.rng.random(4);
					this.drawTile(ctx, Block.Detail, screenX + dx, screenY + dy, this.rng.random(4));
				}
				break;

			case Block.Sand:
				// Random sand details
				if (this.rng.random(3) === 0) {
					const dx = this.rng.random(7) - 3;
					const dy = -this.rng.random(4);
					this.drawTile(ctx, Block.SandDetail, screenX + dx, screenY + dy, this.rng.random(4));
				}
				break;

			case Block.Tree:
				// Trees with shadow and random offset
				this.drawShadow(ctx, screenX, screenY, 0);
				{
					const dx = this.rng.random(5) - 2;
					const dy = -this.rng.random(3);
					const variant = Math.min(this.rng.random(4), this.rng.random(4)); // Favor lower variants
					this.drawTile(ctx, block, screenX + dx, screenY + dy, variant);
				}
				break;

			case Block.Rock:
			case Block.Bush:
				// Rocks and bushes with shadow
				this.drawShadow(ctx, screenX, screenY, 0);
				{
					const dx = this.rng.random(5) - 2;
					const dy = -this.rng.random(3);
					this.drawTile(ctx, block, screenX + dx, screenY + dy, this.rng.random(2));
				}
				break;

			case Block.Cactus:
				// Cacti with small shadow
				this.drawShadow(ctx, screenX, screenY, 1);
				{
					const dx = this.rng.random(5) - 2;
					const dy = -this.rng.random(3);
					this.drawTile(ctx, block, screenX + dx, screenY + dy, this.rng.random(2));
				}
				break;

			case Block.Dark:
				// Dark tiles may have trees
				if (this.rng.random(3) === 0) {
					const dx = this.rng.random(5) - 2;
					const dy = this.rng.random(2);
					this.drawTile(ctx, Block.Tree, screenX + dx, screenY + dy, this.rng.random(4));
				}
				break;

			case Block.DungeonExit:
				// Render as stairs
				this.drawTile(ctx, Block.DungeonStairs, screenX, screenY, 0);
				break;

			case Block.BridgeLR:
			case Block.BridgeUD:
			case Block.SavePoint:
			case Block.Door:
			case Block.Dungeon:
			case Block.DungeonStat:
			case Block.DungeonStairs:
			case Block.DungeonWall:
			case Block.DungeonFakeWall:
			case Block.DungeonPuzzle:
			case Block.MonsterGenerator:
			case Block.FakeTree:
				// Direct tile rendering
				this.drawTile(ctx, block, screenX, screenY, 0);
				break;
		}
	}

	/**
	 * Draw a tile from the sprite sheet.
	 * @param block - Block type (determines row in sprite sheet)
	 * @param x - Screen X position
	 * @param y - Screen Y position
	 * @param variant - Tile variant (column in sprite sheet)
	 */
	private drawTile(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		block: Block,
		x: number,
		y: number,
		variant: number
	): void {
		// Block index determines the row (subtract 1 because Block.Dark = 0 but row 0 is Field)
		// The sprite sheet layout matches the Block enum order (Field at row 0)
		const row = block === Block.Dark ? -1 : block - 1;
		if (row < 0) return; // Don't render Dark tiles

		const maxVariant = this.tileVariants.get(block) ?? 1;
		const col = variant % maxVariant;

		this.tiles.drawSprite(ctx as CanvasRenderingContext2D, col, row, x, y);
	}

	/**
	 * Draw a shadow ellipse.
	 * @param size - 0 = large shadow, 1 = small shadow
	 */
	private drawShadow(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		x: number,
		y: number,
		size: number
	): void {
		ctx.save();
		ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
		ctx.beginPath();

		if (size === 0) {
			// Large shadow (for trees, rocks)
			ctx.ellipse(x + 8, y + 14, 7, 4, 0, 0, Math.PI * 2);
		} else {
			// Small shadow (for cacti)
			ctx.ellipse(x + 5, y + 13, 3, 2.5, 0, 0, Math.PI * 2);
		}

		ctx.fill();
		ctx.restore();
	}

	/**
	 * Update the world reference (for world switching).
	 */
	setWorld(world: World): void {
		this.world = world;
	}

	/**
	 * Update the tile sheet reference.
	 */
	setTileSheet(tiles: SpriteSheet): void {
		this.tiles = tiles;
	}
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a world renderer.
 */
export function createWorldRenderer(world: World, tilesSheet: SpriteSheet): WorldRenderer {
	return new WorldRenderer(world, tilesSheet);
}
