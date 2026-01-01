/**
 * Tests for Evoland World System
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
	World,
	pixelToGrid,
	gridToPixel,
	gridToPixelCenter,
	type SerializedWorldData
} from './world';
import { Block, EKind, WORLD_SIZE, TILE_SIZE } from './constants';

describe('World', () => {
	let world: World;

	beforeEach(() => {
		world = new World();
	});

	describe('initialization', () => {
		it('should create a 98x98 world', () => {
			expect(world.getTile(0, 0)).toBe(Block.Dark);
			expect(world.getTile(WORLD_SIZE - 1, WORLD_SIZE - 1)).toBe(Block.Dark);
		});

		it('should return Dark for out of bounds tiles', () => {
			expect(world.getTile(-1, 0)).toBe(Block.Dark);
			expect(world.getTile(0, -1)).toBe(Block.Dark);
			expect(world.getTile(WORLD_SIZE, 0)).toBe(Block.Dark);
			expect(world.getTile(0, WORLD_SIZE)).toBe(Block.Dark);
		});
	});

	describe('tile access', () => {
		it('should get and set tiles', () => {
			world.setTile(10, 20, Block.Field);
			expect(world.getTile(10, 20)).toBe(Block.Field);
		});

		it('should ignore set for out of bounds', () => {
			world.setTile(-1, 0, Block.Field);
			world.setTile(WORLD_SIZE, 0, Block.Field);
			// Should not crash and tiles remain unchanged
			expect(world.getTile(-1, 0)).toBe(Block.Dark);
			expect(world.getTile(WORLD_SIZE, 0)).toBe(Block.Dark);
		});
	});

	describe('removed tiles', () => {
		it('should track removed tiles', () => {
			expect(world.isRemoved(10, 10)).toBe(false);
			expect(world.remove(10, 10)).toBe(true);
			expect(world.isRemoved(10, 10)).toBe(true);
		});

		it('should not remove already removed tile', () => {
			world.remove(10, 10);
			expect(world.remove(10, 10)).toBe(false);
		});

		it('should restore removed tiles', () => {
			world.remove(10, 10);
			world.restore(10, 10);
			expect(world.isRemoved(10, 10)).toBe(false);
		});

		it('should reset all removed tiles', () => {
			world.remove(10, 10);
			world.remove(20, 20);
			world.resetRemoved();
			expect(world.isRemoved(10, 10)).toBe(false);
			expect(world.isRemoved(20, 20)).toBe(false);
		});

		it('should handle out of bounds for removed', () => {
			expect(world.isRemoved(-1, 0)).toBe(false);
			expect(world.remove(-1, 0)).toBe(false);
		});
	});

	describe('collision', () => {
		beforeEach(() => {
			// Set up a test world
			world.setTile(5, 5, Block.Field);
			world.setTile(5, 6, Block.Tree);
			world.setTile(5, 7, Block.Water);
			world.setTile(5, 8, Block.BridgeUD);
			world.setTile(5, 9, Block.SavePoint);
		});

		it('should return true for out of bounds', () => {
			expect(world.collide(-1, 0)).toBe(true);
			expect(world.collide(0, -1)).toBe(true);
			expect(world.collide(WORLD_SIZE, 0)).toBe(true);
		});

		it('should not collide on Field', () => {
			expect(world.collide(5, 5)).toBe(false);
		});

		it('should collide on Tree', () => {
			expect(world.collide(5, 6)).toBe(true);
		});

		it('should collide on Water', () => {
			expect(world.collide(5, 7)).toBe(true);
		});

		it('should not collide on Bridge', () => {
			expect(world.collide(5, 8)).toBe(false);
		});

		it('should not collide on SavePoint', () => {
			expect(world.collide(5, 9)).toBe(false);
		});

		it('should not collide on removed tiles', () => {
			world.remove(5, 6); // Remove tree
			expect(world.collide(5, 6)).toBe(false);
		});

		it('should collide on solid blocks', () => {
			const solidBlocks = [
				Block.Dark,
				Block.Tree,
				Block.Water,
				Block.Bush,
				Block.Rock,
				Block.Cactus,
				Block.Door,
				Block.DungeonWall
			];

			for (const block of solidBlocks) {
				world.setTile(0, 0, block);
				expect(world.collide(0, 0)).toBe(true);
			}
		});

		it('should not collide on walkable blocks', () => {
			const walkableBlocks = [
				Block.Field,
				Block.BridgeUD,
				Block.BridgeLR,
				Block.SavePoint,
				Block.Sand,
				Block.DungeonSoil,
				Block.DungeonStairs
			];

			for (const block of walkableBlocks) {
				world.setTile(0, 0, block);
				expect(world.collide(0, 0)).toBe(false);
			}
		});
	});

	describe('collideBox', () => {
		beforeEach(() => {
			// Create a field with a tree in the middle
			for (let x = 0; x < 10; x++) {
				for (let y = 0; y < 10; y++) {
					world.setTile(x, y, Block.Field);
				}
			}
			world.setTile(5, 5, Block.Tree);
		});

		it('should detect box collision with solid tile', () => {
			// Box that overlaps with the tree at (5,5)
			const px = 5 * TILE_SIZE;
			const py = 5 * TILE_SIZE;
			expect(world.collideBox(px, py, TILE_SIZE, TILE_SIZE)).toBe(true);
		});

		it('should not collide when box is on empty tiles', () => {
			const px = 2 * TILE_SIZE;
			const py = 2 * TILE_SIZE;
			expect(world.collideBox(px, py, TILE_SIZE, TILE_SIZE)).toBe(false);
		});

		it('should detect partial overlap', () => {
			// Box that partially overlaps with tree
			const px = 4.5 * TILE_SIZE;
			const py = 4.5 * TILE_SIZE;
			expect(world.collideBox(px, py, TILE_SIZE, TILE_SIZE)).toBe(true);
		});
	});

	describe('getSoil', () => {
		beforeEach(() => {
			world.setTile(5, 5, Block.Field);
			world.setTile(5, 6, Block.Tree);
			world.setTile(5, 7, Block.Water);
			world.setTile(5, 8, Block.Sand);
			world.setTile(5, 9, Block.DungeonWall);
		});

		it('should return Field for Field tile', () => {
			expect(world.getSoil(5, 5)).toBe(Block.Field);
		});

		it('should return Field for tree above field', () => {
			world.setTile(5, 5, Block.Field);
			world.setTile(5, 6, Block.Tree);
			expect(world.getSoil(5, 6)).toBe(Block.Field);
		});

		it('should return Water for Water tile', () => {
			expect(world.getSoil(5, 7)).toBe(Block.Water);
		});

		it('should return Sand for Sand tile', () => {
			expect(world.getSoil(5, 8)).toBe(Block.Sand);
		});

		it('should return DungeonSoil for DungeonWall', () => {
			expect(world.getSoil(5, 9)).toBe(Block.DungeonSoil);
		});

		it('should return Field for out of bounds', () => {
			expect(world.getSoil(-1, 0)).toBe(Block.Field);
		});
	});

	describe('loadFromJSON', () => {
		it('should load tiles from JSON', () => {
			const data: SerializedWorldData = {
				tiles: Array(WORLD_SIZE)
					.fill(null)
					.map(() => Array(WORLD_SIZE).fill(Block.Field)),
				monsters: [],
				chests: [],
				npcs: []
			};
			data.tiles[10][20] = Block.Tree;

			world.loadFromJSON(data);
			expect(world.getTile(10, 20)).toBe(Block.Tree);
		});

		it('should load monsters from JSON', () => {
			const data: SerializedWorldData = {
				tiles: Array(WORLD_SIZE)
					.fill(null)
					.map(() => Array(WORLD_SIZE).fill(Block.Field)),
				monsters: [{ x: 10, y: 20, kind: EKind.Monster }],
				chests: [],
				npcs: []
			};

			world.loadFromJSON(data);
			const monsters = world.getMonsters();
			expect(monsters).toHaveLength(1);
			expect(monsters[0]).toEqual({ x: 10, y: 20, kind: EKind.Monster });
		});

		it('should load chests from JSON', () => {
			const data: SerializedWorldData = {
				tiles: Array(WORLD_SIZE)
					.fill(null)
					.map(() => Array(WORLD_SIZE).fill(Block.Field)),
				monsters: [],
				chests: [{ x: 15, y: 25, kind: 5 }],
				npcs: []
			};

			world.loadFromJSON(data);
			const chests = world.getChests();
			expect(chests).toHaveLength(1);
			expect(chests[0]).toEqual({ x: 15, y: 25, kind: 5 });
		});

		it('should load npcs from JSON', () => {
			const data: SerializedWorldData = {
				tiles: Array(WORLD_SIZE)
					.fill(null)
					.map(() => Array(WORLD_SIZE).fill(Block.Field)),
				monsters: [],
				chests: [],
				npcs: [{ x: 30, y: 40 }]
			};

			world.loadFromJSON(data);
			const npcs = world.getNPCs();
			expect(npcs).toHaveLength(1);
			expect(npcs[0]).toEqual({ x: 30, y: 40 });
		});
	});

	describe('toJSON', () => {
		it('should serialize world to JSON', () => {
			world.setTile(10, 20, Block.Tree);
			const json = world.toJSON();

			expect(json.tiles[10][20]).toBe(Block.Tree);
		});
	});

	describe('findBlockPositions', () => {
		it('should find all positions of a block type', () => {
			world.setTile(5, 5, Block.SavePoint);
			world.setTile(10, 10, Block.SavePoint);
			world.setTile(15, 15, Block.Tree);

			const savePoints = world.findBlockPositions(Block.SavePoint);
			expect(savePoints).toHaveLength(2);
			expect(savePoints).toContainEqual({ x: 5, y: 5 });
			expect(savePoints).toContainEqual({ x: 10, y: 10 });
		});
	});

	describe('dungeon mode', () => {
		it('should track dungeon mode', () => {
			expect(world.getIsDungeon()).toBe(false);
			world.setDungeon(true);
			expect(world.getIsDungeon()).toBe(true);
		});
	});

	describe('removed list serialization', () => {
		it('should get removed list for overworld', () => {
			world.setDungeon(false);
			world.remove(5, 10);

			const list = world.getRemovedList();
			expect(list).toContain(5 + 10 * WORLD_SIZE);
		});

		it('should get removed list for dungeon with offset', () => {
			world.setDungeon(true);
			world.remove(5, 10);

			const list = world.getRemovedList();
			expect(list).toContain(5 + (10 + WORLD_SIZE) * WORLD_SIZE);
		});

		it('should apply removed list', () => {
			world.setDungeon(false);
			const encoded = 5 + 10 * WORLD_SIZE;

			world.applyRemovedList([encoded]);
			expect(world.isRemoved(5, 10)).toBe(true);
		});
	});
});

describe('pixelToGrid', () => {
	it('should convert pixel to grid position', () => {
		expect(pixelToGrid(0, 0)).toEqual({ x: 0, y: 0 });
		expect(pixelToGrid(TILE_SIZE, TILE_SIZE)).toEqual({ x: 1, y: 1 });
		expect(pixelToGrid(TILE_SIZE * 5 + 8, TILE_SIZE * 3 + 4)).toEqual({ x: 5, y: 3 });
	});

	it('should floor fractional positions', () => {
		expect(pixelToGrid(TILE_SIZE - 1, TILE_SIZE - 1)).toEqual({ x: 0, y: 0 });
	});
});

describe('gridToPixel', () => {
	it('should convert grid to pixel position', () => {
		expect(gridToPixel(0, 0)).toEqual({ x: 0, y: 0 });
		expect(gridToPixel(1, 1)).toEqual({ x: TILE_SIZE, y: TILE_SIZE });
		expect(gridToPixel(5, 3)).toEqual({ x: TILE_SIZE * 5, y: TILE_SIZE * 3 });
	});
});

describe('gridToPixelCenter', () => {
	it('should convert grid to pixel center position', () => {
		expect(gridToPixelCenter(0, 0)).toEqual({ x: TILE_SIZE / 2, y: TILE_SIZE / 2 });
		expect(gridToPixelCenter(1, 1)).toEqual({
			x: TILE_SIZE + TILE_SIZE / 2,
			y: TILE_SIZE + TILE_SIZE / 2
		});
	});
});
