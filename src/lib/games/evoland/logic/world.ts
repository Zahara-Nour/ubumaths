/**
 * Evoland World System
 *
 * Handles world data, collision detection, and tile management.
 * Based on the original World.hx from Evoland.
 */

import { Block, EKind, ChestKind, WORLD_SIZE, TILE_SIZE } from './constants';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Position of an entity on the grid.
 */
export interface GridPosition {
	readonly x: number;
	readonly y: number;
}

/**
 * Monster spawn data extracted from the world.
 */
export interface MonsterSpawn {
	readonly x: number;
	readonly y: number;
	readonly kind: typeof EKind.Monster | typeof EKind.Bat | typeof EKind.Knight;
}

/**
 * Chest data extracted from the world.
 */
export interface ChestSpawn {
	readonly x: number;
	readonly y: number;
	readonly kind: ChestKind;
}

/**
 * NPC position extracted from the world.
 */
export interface NPCSpawn {
	readonly x: number;
	readonly y: number;
}

/**
 * Complete world data loaded from PNG or JSON.
 */
export interface WorldData {
	readonly tiles: Block[][];
	readonly monsters: MonsterSpawn[];
	readonly chests: ChestSpawn[];
	readonly npcs: NPCSpawn[];
}

/**
 * Serialized world data for JSON storage.
 */
export interface SerializedWorldData {
	readonly tiles: number[][];
	readonly monsters: Array<{ x: number; y: number; kind: number }>;
	readonly chests: Array<{ x: number; y: number; kind: number }>;
	readonly npcs: Array<{ x: number; y: number }>;
}

// ============================================================================
// COLOR MAPPING (PNG to Block)
// ============================================================================

/**
 * Color to Block mapping from the original Haxe code.
 * Each color in the world.png represents a specific tile type.
 */
const COLOR_TO_BLOCK: ReadonlyMap<number, Block> = new Map([
	[0x000000, Block.Dark],
	[0xda02a7, Block.Dark], // Magenta also = Dark
	[0x0f6d01, Block.Tree],
	[0x64fd4d, Block.Field],
	[0x65b4fb, Block.Water],
	[0x792d01, Block.BridgeUD],
	[0xe65400, Block.BridgeLR],
	[0x1eda02, Block.Bush],
	[0x9e9e9e, Block.Rock],
	[0x023ada, Block.SavePoint],
	[0xe8fd4d, Block.Sand],
	[0x6fc418, Block.Cactus],
	[0xc49918, Block.Door],
	[0x585f5c, Block.Dungeon],
	[0x0e0b0e, Block.DarkDungeon],
	[0x8a8a8a, Block.DungeonSoil],
	[0xc5d8c6, Block.DungeonWall],
	[0x4e7450, Block.DungeonStat],
	[0xa66e6e, Block.DungeonStairs],
	[0x92afa7, Block.DungeonFakeWall],
	[0x392d39, Block.DungeonFakeDark],
	[0x4dfdba, Block.DungeonPuzzle],
	[0x973902, Block.MonsterGenerator],
	[0x0f4d01, Block.FakeTree],
	[0x9abc9c, Block.DungeonExit]
]);

/**
 * Special colors for entities (monsters, NPCs).
 */
const MONSTER_COLORS: ReadonlyMap<
	number,
	typeof EKind.Monster | typeof EKind.Bat | typeof EKind.Knight
> = new Map([
	[0xda0205, EKind.Monster],
	[0xfd2b2e, EKind.Bat],
	[0xa70204, EKind.Knight]
]);

/** NPC marker color */
const NPC_COLOR = 0xfd4dd3;

/** Chest color prefix (0xFFFFxx where xx is chest kind) */
const CHEST_COLOR_PREFIX = 0xffff00;

// ============================================================================
// WORLD CLASS
// ============================================================================

/**
 * World manager for tile data and collision.
 *
 * Features:
 * - 98x98 tile grid
 * - Collision detection
 * - Removed tiles tracking (for destroyed objects)
 * - Entity position lookup
 *
 * @example
 * ```typescript
 * const world = new World();
 * await world.loadFromPNG('/games/evoland/world.png');
 *
 * // Check collision
 * if (!world.collide(heroX, heroY)) {
 *   // Can move here
 * }
 *
 * // Get spawn positions
 * const monsters = world.getMonsters();
 * ```
 */
export class World {
	/** Tile grid [x][y] */
	private tiles: Block[][];

	/** Removed tiles [x][y] - tiles that have been destroyed */
	private removed: boolean[][];

	/** Monster spawn positions */
	private monsters: MonsterSpawn[];

	/** Chest positions and types */
	private chests: ChestSpawn[];

	/** NPC positions */
	private npcs: NPCSpawn[];

	/** Whether this is the dungeon world */
	private isDungeon: boolean = false;

	/**
	 * Create a new world.
	 */
	constructor() {
		this.tiles = [];
		this.removed = [];
		this.monsters = [];
		this.chests = [];
		this.npcs = [];

		// Initialize empty grid
		for (let x = 0; x < WORLD_SIZE; x++) {
			this.tiles[x] = [];
			this.removed[x] = [];
			for (let y = 0; y < WORLD_SIZE; y++) {
				this.tiles[x][y] = Block.Dark;
				this.removed[x][y] = false;
			}
		}
	}

	// ========================================================================
	// LOADING
	// ========================================================================

	/**
	 * Load world data from a PNG image.
	 * @param imageSrc - URL of the world PNG
	 */
	async loadFromPNG(imageSrc: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = 'anonymous';

			img.onload = () => {
				try {
					this.decodePNG(img);
					resolve();
				} catch (error) {
					reject(error);
				}
			};

			img.onerror = () => {
				reject(new Error(`Failed to load world image: ${imageSrc}`));
			};

			img.src = imageSrc;
		});
	}

	/**
	 * Load world data from serialized JSON.
	 * @param data - Serialized world data
	 */
	loadFromJSON(data: SerializedWorldData): void {
		// Load tiles
		for (let x = 0; x < WORLD_SIZE; x++) {
			for (let y = 0; y < WORLD_SIZE; y++) {
				this.tiles[x][y] = (data.tiles[x]?.[y] ?? Block.Dark) as Block;
			}
		}

		// Load entities
		this.monsters = data.monsters.map((m) => ({
			x: m.x,
			y: m.y,
			kind: m.kind as typeof EKind.Monster | typeof EKind.Bat | typeof EKind.Knight
		}));

		this.chests = data.chests.map((c) => ({
			x: c.x,
			y: c.y,
			kind: c.kind as ChestKind
		}));

		this.npcs = data.npcs.map((n) => ({
			x: n.x,
			y: n.y
		}));
	}

	/**
	 * Decode a PNG image to extract world data.
	 */
	private decodePNG(img: HTMLImageElement): void {
		// Create canvas to read pixel data
		const canvas = document.createElement('canvas');
		canvas.width = WORLD_SIZE;
		canvas.height = WORLD_SIZE;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('Could not get canvas context');
		}

		ctx.drawImage(img, 0, 0);
		const imageData = ctx.getImageData(0, 0, WORLD_SIZE, WORLD_SIZE);
		const data = imageData.data;

		// Clear previous data
		this.monsters = [];
		this.chests = [];
		this.npcs = [];

		// Decode each pixel
		for (let y = 0; y < WORLD_SIZE; y++) {
			for (let x = 0; x < WORLD_SIZE; x++) {
				const idx = (y * WORLD_SIZE + x) * 4;
				const r = data[idx];
				const g = data[idx + 1];
				const b = data[idx + 2];
				const color = (r << 16) | (g << 8) | b;

				this.tiles[x][y] = this.decodeColor(x, y, color, data);
			}
		}
	}

	/**
	 * Decode a pixel color to a block type.
	 * Also extracts monster, chest, and NPC positions.
	 */
	private decodeColor(x: number, y: number, color: number, data: Uint8ClampedArray): Block {
		// Check for monster colors
		const monsterKind = MONSTER_COLORS.get(color);
		if (monsterKind !== undefined) {
			this.monsters.push({ x, y, kind: monsterKind });
			// Return the block from the tile above
			if (y > 0) {
				const idx = ((y - 1) * WORLD_SIZE + x) * 4;
				const r = data[idx];
				const g = data[idx + 1];
				const b = data[idx + 2];
				const aboveColor = (r << 16) | (g << 8) | b;
				return this.decodeColor(x, y - 1, aboveColor, data);
			}
			return Block.Field;
		}

		// Check for NPC color
		if (color === NPC_COLOR) {
			this.npcs.push({ x, y });
			return Block.Free;
		}

		// Check for chest color (0xFFFFxx)
		if ((color & 0xffff00) === CHEST_COLOR_PREFIX) {
			const chestKind = color & 0xff;
			this.chests.push({ x, y, kind: chestKind as ChestKind });
			return Block.Field;
		}

		// Look up block type
		const block = COLOR_TO_BLOCK.get(color);
		if (block !== undefined) {
			return block;
		}

		// Unknown color - default to Dark
		console.warn(`Unknown world color 0x${color.toString(16).padStart(6, '0')} at (${x},${y})`);
		return Block.Dark;
	}

	// ========================================================================
	// TILE ACCESS
	// ========================================================================

	/**
	 * Get the tile at a position.
	 * @returns Block type, or Dark if out of bounds
	 */
	getTile(x: number, y: number): Block {
		if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) {
			return Block.Dark;
		}
		return this.tiles[x][y];
	}

	/**
	 * Set a tile at a position.
	 */
	setTile(x: number, y: number, block: Block): void {
		if (x >= 0 && y >= 0 && x < WORLD_SIZE && y < WORLD_SIZE) {
			this.tiles[x][y] = block;
		}
	}

	/**
	 * Check if a tile has been removed (destroyed).
	 */
	isRemoved(x: number, y: number): boolean {
		if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) {
			return false;
		}
		return this.removed[x][y];
	}

	/**
	 * Remove (destroy) a tile.
	 * @returns true if the tile was removed, false if already removed or invalid
	 */
	remove(x: number, y: number): boolean {
		if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) {
			return false;
		}
		if (this.removed[x][y]) {
			return false;
		}
		this.removed[x][y] = true;
		return true;
	}

	/**
	 * Restore a removed tile.
	 */
	restore(x: number, y: number): void {
		if (x >= 0 && y >= 0 && x < WORLD_SIZE && y < WORLD_SIZE) {
			this.removed[x][y] = false;
		}
	}

	/**
	 * Apply removed tiles from save data.
	 * @param removedList - Array of encoded positions (x + y * SIZE or x + (y + SIZE) * SIZE for dungeon)
	 */
	applyRemovedList(removedList: number[]): void {
		for (const encoded of removedList) {
			const yOffset = this.isDungeon ? WORLD_SIZE : 0;
			const x = encoded % WORLD_SIZE;
			const y = Math.floor(encoded / WORLD_SIZE) - yOffset;
			if (y >= 0 && y < WORLD_SIZE) {
				this.removed[x][y] = true;
			}
		}
	}

	// ========================================================================
	// COLLISION
	// ========================================================================

	/**
	 * Check if a tile blocks movement.
	 * @returns true if the tile is solid and cannot be walked through
	 */
	collide(x: number, y: number): boolean {
		// Out of bounds = collision
		if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) {
			return true;
		}

		// Removed tiles don't collide
		if (this.removed[x][y]) {
			return false;
		}

		const block = this.tiles[x][y];

		// Solid blocks
		switch (block) {
			case Block.Dark:
			case Block.Tree:
			case Block.Water:
			case Block.Bush:
			case Block.Rock:
			case Block.Cactus:
			case Block.Lock:
			case Block.Door:
			case Block.DarkDungeon:
			case Block.DungeonWall:
			case Block.DungeonStat:
				return true;

			// Walkable blocks
			case Block.BridgeUD:
			case Block.BridgeLR:
			case Block.Dungeon:
			case Block.MonsterGenerator:
			case Block.Field:
			case Block.SavePoint:
			case Block.Sand:
			case Block.Free:
			case Block.DungeonSoil:
			case Block.FakeTree:
			case Block.SandBank:
			case Block.RiverBank:
			case Block.Detail:
			case Block.SandDetail:
			case Block.DungeonStairs:
			case Block.DungeonFakeWall:
			case Block.DungeonFakeDark:
			case Block.DungeonPuzzle:
			case Block.DungeonExit:
				return false;

			default:
				return false;
		}
	}

	/**
	 * Check collision for a bounding box (pixel coordinates).
	 * @param px - Pixel X position
	 * @param py - Pixel Y position
	 * @param width - Width in pixels
	 * @param height - Height in pixels
	 * @returns true if any tile in the box collides
	 */
	collideBox(px: number, py: number, width: number, height: number): boolean {
		const x1 = Math.floor(px / TILE_SIZE);
		const y1 = Math.floor(py / TILE_SIZE);
		const x2 = Math.floor((px + width - 1) / TILE_SIZE);
		const y2 = Math.floor((py + height - 1) / TILE_SIZE);

		for (let x = x1; x <= x2; x++) {
			for (let y = y1; y <= y2; y++) {
				if (this.collide(x, y)) {
					return true;
				}
			}
		}

		return false;
	}

	// ========================================================================
	// SOIL DETECTION (for rendering banks/shores)
	// ========================================================================

	/**
	 * Get the underlying soil type at a position.
	 * Used for rendering terrain transitions (banks, shores).
	 */
	getSoil(x: number, y: number, recursive: boolean = false): Block | null {
		if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) {
			return Block.Field;
		}

		const block = this.tiles[x][y];

		switch (block) {
			// Blocks that need to look at neighbors
			case Block.Dark:
			case Block.Tree:
			case Block.Bush:
			case Block.Rock:
			case Block.SavePoint:
			case Block.Cactus:
			case Block.Lock:
			case Block.Free:
			case Block.Door:
			case Block.Dungeon:
			case Block.FakeTree: {
				if (recursive) {
					return null;
				}

				// Find the lowest-index soil from neighbors
				let best: Block | null = null;
				const neighbors = [
					this.getSoil(x, y - 1, true),
					this.getSoil(x, y + 1, true),
					this.getSoil(x - 1, y, true),
					this.getSoil(x + 1, y, true)
				];

				for (const soil of neighbors) {
					if (soil !== null) {
						if (best === null || soil < best) {
							best = soil;
						}
					}
				}

				return best ?? Block.Field;
			}

			// Water-related
			case Block.BridgeLR:
			case Block.BridgeUD:
			case Block.Water:
				return recursive ? null : Block.Water;

			// Direct soil types
			case Block.Field:
			case Block.Sand:
			case Block.DungeonSoil:
				return block;

			// Dungeon blocks use DungeonSoil
			case Block.DungeonWall:
			case Block.DungeonStat:
			case Block.DungeonStairs:
			case Block.DungeonFakeWall:
			case Block.DungeonPuzzle:
			case Block.MonsterGenerator:
			case Block.DungeonExit:
				return Block.DungeonSoil;

			// Detail/decoration blocks
			case Block.Detail:
			case Block.RiverBank:
			case Block.SandBank:
			case Block.SandDetail:
			case Block.DarkDungeon:
			case Block.DungeonFakeDark:
				return null;

			default:
				return null;
		}
	}

	// ========================================================================
	// ENTITY POSITIONS
	// ========================================================================

	/**
	 * Get all monster spawn positions.
	 */
	getMonsters(): readonly MonsterSpawn[] {
		return this.monsters;
	}

	/**
	 * Get all chest positions.
	 */
	getChests(): readonly ChestSpawn[] {
		return this.chests;
	}

	/**
	 * Get all NPC positions.
	 */
	getNPCs(): readonly NPCSpawn[] {
		return this.npcs;
	}

	/**
	 * Find all positions of a specific block type.
	 */
	findBlockPositions(block: Block): GridPosition[] {
		const positions: GridPosition[] = [];
		for (let x = 0; x < WORLD_SIZE; x++) {
			for (let y = 0; y < WORLD_SIZE; y++) {
				if (this.tiles[x][y] === block) {
					positions.push({ x, y });
				}
			}
		}
		return positions;
	}

	// ========================================================================
	// SERIALIZATION
	// ========================================================================

	/**
	 * Serialize world data to JSON format.
	 */
	toJSON(): SerializedWorldData {
		return {
			tiles: this.tiles.map((col) => col.slice()),
			monsters: this.monsters.map((m) => ({ x: m.x, y: m.y, kind: m.kind })),
			chests: this.chests.map((c) => ({ x: c.x, y: c.y, kind: c.kind })),
			npcs: this.npcs.map((n) => ({ x: n.x, y: n.y }))
		};
	}

	/**
	 * Get removed tiles as encoded list for save data.
	 */
	getRemovedList(): number[] {
		const list: number[] = [];
		const yOffset = this.isDungeon ? WORLD_SIZE : 0;

		for (let x = 0; x < WORLD_SIZE; x++) {
			for (let y = 0; y < WORLD_SIZE; y++) {
				if (this.removed[x][y]) {
					list.push(x + (y + yOffset) * WORLD_SIZE);
				}
			}
		}

		return list;
	}

	/**
	 * Set whether this is the dungeon world.
	 */
	setDungeon(isDungeon: boolean): void {
		this.isDungeon = isDungeon;
	}

	/**
	 * Check if this is the dungeon world.
	 */
	getIsDungeon(): boolean {
		return this.isDungeon;
	}

	/**
	 * Reset all removed tiles.
	 */
	resetRemoved(): void {
		for (let x = 0; x < WORLD_SIZE; x++) {
			for (let y = 0; y < WORLD_SIZE; y++) {
				this.removed[x][y] = false;
			}
		}
	}
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create and load the main overworld.
 */
export async function loadOverworld(basePath: string = '/games/evoland'): Promise<World> {
	const world = new World();
	await world.loadFromPNG(`${basePath}/world.png`);
	return world;
}

/**
 * Create and load the dungeon world.
 */
export async function loadDungeon(basePath: string = '/games/evoland'): Promise<World> {
	const world = new World();
	world.setDungeon(true);
	await world.loadFromPNG(`${basePath}/dungeon.png`);
	return world;
}

/**
 * Convert pixel position to grid position.
 */
export function pixelToGrid(px: number, py: number): GridPosition {
	return {
		x: Math.floor(px / TILE_SIZE),
		y: Math.floor(py / TILE_SIZE)
	};
}

/**
 * Convert grid position to pixel position (top-left corner).
 */
export function gridToPixel(gx: number, gy: number): { x: number; y: number } {
	return {
		x: gx * TILE_SIZE,
		y: gy * TILE_SIZE
	};
}

/**
 * Convert grid position to pixel position (center).
 */
export function gridToPixelCenter(gx: number, gy: number): { x: number; y: number } {
	return {
		x: gx * TILE_SIZE + TILE_SIZE / 2,
		y: gy * TILE_SIZE + TILE_SIZE / 2
	};
}
