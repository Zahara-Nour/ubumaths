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
 * EKind.Hero = 6 → row 6 (facing down/left/right)
 * EKind.HeroUp = 7 → row 7 (facing up)
 * For Right direction, we flip the Left sprite horizontally.
 */
export const HERO_SPRITES: Record<number, HeroSpriteConfig> = {
	[Direction.Down]: { col: 0, row: 6, flipX: false },
	[Direction.Up]: { col: 0, row: 7, flipX: false },
	[Direction.Left]: { col: 0, row: 6, flipX: false },
	[Direction.Right]: { col: 0, row: 6, flipX: true }
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
 * EKind.Chest = 1, so chests are in row 1.
 */
export const CHEST_SPRITES = {
	closed: { col: 0, row: 1 },
	open: { col: 1, row: 1 }
} as const;

/**
 * Monster sprite positions in sprites_alpha.png.
 * EKind.Monster = 2 → row 2
 * EKind.Bat = 8 → row 8
 */
export const MONSTER_SPRITES = {
	slime: { col: 0, row: 2 },
	bat: { col: 0, row: 8 }
} as const;

/**
 * Sword sprite configuration (uses col 3 for sword swing).
 */
export const SWORD_SPRITES: Record<number, SpritePosition> = {
	[Direction.Down]: { col: 3, row: 1 },
	[Direction.Up]: { col: 3, row: 1 },
	[Direction.Left]: { col: 3, row: 1 },
	[Direction.Right]: { col: 3, row: 1 }
};

/**
 * Get sword sprite position.
 */
export function getSwordSprite(direction: number): SpritePosition {
	return SWORD_SPRITES[direction] ?? SWORD_SPRITES[Direction.Down];
}

// ============================================================================
// TILE SPRITE POSITIONS (tiles_alpha.png)
// ============================================================================

/**
 * Tile sprite positions in tiles_alpha.png.
 * Maps Block types to sprite sheet positions.
 * Based on analysis of the actual tile sheet.
 */
export const TILE_SPRITES: Partial<Record<number, SpritePosition>> = {
	[Block.Field]: { col: 5, row: 2 }, // Grass tile (plain green)
	[Block.Tree]: { col: 0, row: 0 }, // Tree (large tree)
	[Block.Water]: { col: 0, row: 1 }, // Water
	[Block.Rock]: { col: 3, row: 3 }, // Rock/stone
	[Block.Sand]: { col: 0, row: 4 }, // Sand/desert
	[Block.Bush]: { col: 3, row: 2 }, // Bush
	[Block.BridgeUD]: { col: 5, row: 3 }, // Bridge vertical
	[Block.BridgeLR]: { col: 6, row: 3 } // Bridge horizontal
};

/**
 * Dark/empty tile color (for tiles without sprites).
 */
export const DARK_TILE_COLOR = '#1a1a2e';

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
