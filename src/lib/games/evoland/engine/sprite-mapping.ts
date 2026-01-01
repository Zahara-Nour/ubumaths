/**
 * Sprite Mapping for Evoland
 *
 * Maps game entities and tiles to their sprite sheet positions.
 * Based on analysis of sprites_alpha.png and tiles_alpha.png.
 */

import { Block, Direction } from '../logic/constants';

// ============================================================================
// SPRITE POSITIONS
// ============================================================================

/**
 * Sprite position in a sprite sheet.
 */
export interface SpritePosition {
	readonly col: number;
	readonly row: number;
}

/**
 * Hero sprite configuration.
 * Initial GameBoy-style hero uses a single sprite for all directions.
 * The 'flip' property indicates if the sprite should be flipped horizontally.
 */
export interface HeroSpriteConfig {
	readonly col: number;
	readonly row: number;
	readonly flipX: boolean;
}

/**
 * Hero sprite positions in sprites_alpha.png.
 * Initial hero (col 0, row 0) is the simple GameBoy-style sprite.
 * For Right direction, we flip the sprite horizontally.
 */
export const HERO_SPRITES: Record<number, HeroSpriteConfig> = {
	[Direction.Down]: { col: 0, row: 0, flipX: false },
	[Direction.Up]: { col: 0, row: 0, flipX: false },
	[Direction.Left]: { col: 0, row: 0, flipX: false },
	[Direction.Right]: { col: 0, row: 0, flipX: true }
};

/**
 * Hero walking animation frames (2 frames per direction).
 */
export const HERO_WALK_SPRITES: Record<number, SpritePosition[]> = {
	[Direction.Down]: [
		{ col: 0, row: 3 },
		{ col: 1, row: 3 }
	],
	[Direction.Up]: [
		{ col: 2, row: 3 },
		{ col: 3, row: 3 }
	],
	[Direction.Left]: [
		{ col: 4, row: 3 },
		{ col: 5, row: 3 }
	],
	[Direction.Right]: [
		{ col: 6, row: 3 },
		{ col: 7, row: 3 }
	]
};

/**
 * Chest sprite positions in sprites_alpha.png.
 */
export const CHEST_SPRITES = {
	closed: { col: 4, row: 0 },
	open: { col: 5, row: 0 }
} as const;

/**
 * Monster sprite positions in sprites_alpha.png.
 */
export const MONSTER_SPRITES = {
	slime: { col: 0, row: 1 },
	bat: { col: 0, row: 4 }
} as const;

// ============================================================================
// TILE SPRITE POSITIONS (tiles_alpha.png)
// ============================================================================

/**
 * Tile sprite positions in tiles_alpha.png.
 * Maps Block types to sprite sheet positions.
 */
export const TILE_SPRITES: Partial<Record<number, SpritePosition>> = {
	[Block.Field]: { col: 4, row: 3 }, // Grass tile
	[Block.Tree]: { col: 0, row: 0 }, // Tree
	[Block.Water]: { col: 0, row: 1 }, // Water
	[Block.Rock]: { col: 2, row: 3 }, // Rock
	[Block.Sand]: { col: 0, row: 4 }, // Sand
	[Block.BridgeUD]: { col: 4, row: 4 } // Bridge vertical
};

/**
 * Get the sprite position for a tile type.
 * Returns undefined for tiles that should be rendered as solid colors.
 */
export function getTileSprite(block: number): SpritePosition | undefined {
	return TILE_SPRITES[block];
}

/**
 * Get the hero sprite configuration for a direction.
 */
export function getHeroSprite(direction: number): HeroSpriteConfig {
	return HERO_SPRITES[direction] ?? HERO_SPRITES[Direction.Down];
}

/**
 * Get the hero walking animation frame.
 */
export function getHeroWalkSprite(direction: number, frame: number): SpritePosition {
	const frames = HERO_WALK_SPRITES[direction] ?? HERO_WALK_SPRITES[Direction.Down];
	return frames[frame % frames.length];
}
