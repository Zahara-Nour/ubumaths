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
 *
 * Based on Haxe World.hx: tiles[Type.enumIndex(b) - 1]
 * So row = Block_enum_index - 1, column 0 for first variant.
 */
export const TILE_SPRITES: Partial<Record<number, SpritePosition>> = {
	// Row = Block enum value - 1
	[Block.Field]: { col: 0, row: 0 }, // Field = 1 → row 0
	[Block.Tree]: { col: 0, row: 1 }, // Tree = 2 → row 1
	[Block.Water]: { col: 0, row: 2 }, // Water = 3 → row 2
	[Block.BridgeUD]: { col: 0, row: 3 }, // BridgeUD = 4 → row 3
	[Block.BridgeLR]: { col: 0, row: 4 }, // BridgeLR = 5 → row 4
	[Block.Bush]: { col: 0, row: 5 }, // Bush = 6 → row 5
	[Block.RiverBank]: { col: 0, row: 6 }, // RiverBank = 7 → row 6
	[Block.Detail]: { col: 0, row: 7 }, // Detail = 8 → row 7
	[Block.Rock]: { col: 0, row: 8 }, // Rock = 9 → row 8
	[Block.SavePoint]: { col: 0, row: 9 }, // SavePoint = 10 → row 9
	[Block.Sand]: { col: 0, row: 10 }, // Sand = 11 → row 10
	[Block.SandBank]: { col: 0, row: 11 }, // SandBank = 12 → row 11
	[Block.SandDetail]: { col: 0, row: 12 }, // SandDetail = 13 → row 12
	[Block.Cactus]: { col: 0, row: 13 }, // Cactus = 14 → row 13
	[Block.Door]: { col: 0, row: 14 }, // Door = 15 → row 14
	[Block.Dungeon]: { col: 0, row: 15 }, // Dungeon = 16 → row 15
	[Block.DungeonSoil]: { col: 0, row: 16 }, // DungeonSoil = 17 → row 16
	[Block.DungeonWall]: { col: 0, row: 17 }, // DungeonWall = 18 → row 17
	[Block.DungeonStat]: { col: 0, row: 18 }, // DungeonStat = 19 → row 18
	[Block.DungeonStairs]: { col: 0, row: 19 }, // DungeonStairs = 20 → row 19
	[Block.DungeonFakeWall]: { col: 0, row: 20 }, // DungeonFakeWall = 21 → row 20
	[Block.DungeonPuzzle]: { col: 0, row: 21 }, // DungeonPuzzle = 22 → row 21
	[Block.MonsterGenerator]: { col: 0, row: 22 }, // MonsterGenerator = 23 → row 22
	[Block.FakeTree]: { col: 0, row: 23 }, // FakeTree = 24 → row 23
	[Block.DungeonExit]: { col: 0, row: 24 } // DungeonExit = 25 → row 24
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
