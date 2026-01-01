/**
 * Tests for Evoland game constants
 */
import { describe, it, expect } from 'vitest';
import {
	Block,
	BLOCK_NAMES,
	EKind,
	EKIND_NAMES,
	ChestKind,
	Direction,
	DIRECTION_NAMES,
	DIRECTION_VECTORS,
	GameStatus,
	WORLD_SIZE,
	TILE_SIZE,
	BASE_WIDTH,
	BASE_HEIGHT,
	TARGET_FPS,
	XP_PER_KILL,
	XP_FOR_LEVEL,
	MAX_MONSTERS,
	CHEST_DATA,
	WALKABLE_BLOCKS,
	SOLID_BLOCKS,
	isWalkable,
	isSolid
} from './constants';

describe('Block enum', () => {
	it('should have 30 tile types', () => {
		const blockValues = Object.values(Block).filter((v) => typeof v === 'number');
		expect(blockValues).toHaveLength(30);
	});

	it('should start at 0 and be sequential', () => {
		expect(Block.Dark).toBe(0);
		expect(Block.DungeonFakeDark).toBe(29);
	});

	it('should have a name for each block type', () => {
		const blockValues = Object.values(Block).filter((v) => typeof v === 'number') as number[];
		for (const value of blockValues) {
			expect(BLOCK_NAMES[value as Block]).toBeDefined();
			expect(typeof BLOCK_NAMES[value as Block]).toBe('string');
		}
	});

	it('should have correct names for key blocks', () => {
		expect(BLOCK_NAMES[Block.Field]).toBe('Field');
		expect(BLOCK_NAMES[Block.Tree]).toBe('Tree');
		expect(BLOCK_NAMES[Block.Water]).toBe('Water');
		expect(BLOCK_NAMES[Block.SavePoint]).toBe('SavePoint');
	});
});

describe('EKind enum', () => {
	it('should have 11 entity types', () => {
		const ekindValues = Object.values(EKind).filter((v) => typeof v === 'number');
		expect(ekindValues).toHaveLength(11);
	});

	it('should have correct values for key entities', () => {
		expect(EKind.Hero).toBe(6);
		expect(EKind.HeroUp).toBe(7);
		expect(EKind.Monster).toBe(2);
		expect(EKind.Fireball).toBe(10);
	});

	it('should have a name for each entity type', () => {
		const ekindValues = Object.values(EKind).filter((v) => typeof v === 'number') as number[];
		for (const value of ekindValues) {
			expect(EKIND_NAMES[value as EKind]).toBeDefined();
		}
	});
});

describe('ChestKind enum', () => {
	it('should have 27 chest types', () => {
		const chestValues = Object.values(ChestKind).filter((v) => typeof v === 'number');
		expect(chestValues).toHaveLength(27);
	});

	it('should have correct order matching original Haxe enum', () => {
		expect(ChestKind.CLeftCtrl).toBe(0);
		expect(ChestKind.C2D).toBe(1);
		expect(ChestKind.CWeapon).toBe(5);
		expect(ChestKind.CPrincess).toBe(26);
	});

	it('should have data for each chest type', () => {
		const chestValues = Object.values(ChestKind).filter((v) => typeof v === 'number') as number[];
		for (const value of chestValues) {
			const data = CHEST_DATA[value as ChestKind];
			expect(data).toBeDefined();
			expect(data.name).toBeDefined();
			expect(data.description).toBeDefined();
		}
	});

	it('should have French text in chest data', () => {
		expect(CHEST_DATA[ChestKind.CWeapon].name).toBe('Epee');
		expect(CHEST_DATA[ChestKind.CPrincess].name).toBe('Princesse');
	});
});

describe('Direction enum', () => {
	it('should have 4 directions', () => {
		const dirValues = Object.values(Direction).filter((v) => typeof v === 'number');
		expect(dirValues).toHaveLength(4);
	});

	it('should have correct vector values', () => {
		expect(DIRECTION_VECTORS[Direction.Up]).toEqual({ dx: 0, dy: -1 });
		expect(DIRECTION_VECTORS[Direction.Down]).toEqual({ dx: 0, dy: 1 });
		expect(DIRECTION_VECTORS[Direction.Left]).toEqual({ dx: -1, dy: 0 });
		expect(DIRECTION_VECTORS[Direction.Right]).toEqual({ dx: 1, dy: 0 });
	});

	it('should have names for all directions', () => {
		expect(DIRECTION_NAMES[Direction.Up]).toBe('Up');
		expect(DIRECTION_NAMES[Direction.Down]).toBe('Down');
		expect(DIRECTION_NAMES[Direction.Left]).toBe('Left');
		expect(DIRECTION_NAMES[Direction.Right]).toBe('Right');
	});
});

describe('GameStatus enum', () => {
	it('should have 5 states', () => {
		const statusValues = Object.values(GameStatus).filter((v) => typeof v === 'number');
		expect(statusValues).toHaveLength(5);
	});

	it('should have correct values', () => {
		expect(GameStatus.Title).toBe(0);
		expect(GameStatus.Playing).toBe(1);
		expect(GameStatus.Paused).toBe(2);
		expect(GameStatus.GameOver).toBe(3);
		expect(GameStatus.Victory).toBe(4);
	});
});

describe('Game constants', () => {
	it('should have correct world size', () => {
		expect(WORLD_SIZE).toBe(98);
	});

	it('should have correct tile size', () => {
		expect(TILE_SIZE).toBe(16);
	});

	it('should have correct base resolution', () => {
		expect(BASE_WIDTH).toBe(240);
		expect(BASE_HEIGHT).toBe(160);
	});

	it('should have correct FPS target', () => {
		expect(TARGET_FPS).toBe(40);
	});

	it('should have correct XP values', () => {
		expect(XP_PER_KILL).toBe(10);
		expect(XP_FOR_LEVEL).toBe(100);
	});

	it('should have correct monster limit', () => {
		expect(MAX_MONSTERS).toBe(50);
	});
});

describe('Collision helpers', () => {
	describe('WALKABLE_BLOCKS', () => {
		it('should include Field', () => {
			expect(WALKABLE_BLOCKS.has(Block.Field)).toBe(true);
		});

		it('should include bridges', () => {
			expect(WALKABLE_BLOCKS.has(Block.BridgeUD)).toBe(true);
			expect(WALKABLE_BLOCKS.has(Block.BridgeLR)).toBe(true);
		});

		it('should include save points', () => {
			expect(WALKABLE_BLOCKS.has(Block.SavePoint)).toBe(true);
		});

		it('should not include solid blocks', () => {
			expect(WALKABLE_BLOCKS.has(Block.Tree)).toBe(false);
			expect(WALKABLE_BLOCKS.has(Block.Water)).toBe(false);
			expect(WALKABLE_BLOCKS.has(Block.Rock)).toBe(false);
		});
	});

	describe('SOLID_BLOCKS', () => {
		it('should include obstacles', () => {
			expect(SOLID_BLOCKS.has(Block.Tree)).toBe(true);
			expect(SOLID_BLOCKS.has(Block.Water)).toBe(true);
			expect(SOLID_BLOCKS.has(Block.Rock)).toBe(true);
			expect(SOLID_BLOCKS.has(Block.DungeonWall)).toBe(true);
		});

		it('should not include walkable blocks', () => {
			expect(SOLID_BLOCKS.has(Block.Field)).toBe(false);
			expect(SOLID_BLOCKS.has(Block.SavePoint)).toBe(false);
		});
	});

	describe('isWalkable', () => {
		it('should return true for walkable blocks', () => {
			expect(isWalkable(Block.Field)).toBe(true);
			expect(isWalkable(Block.SavePoint)).toBe(true);
			expect(isWalkable(Block.DungeonSoil)).toBe(true);
		});

		it('should return false for solid blocks', () => {
			expect(isWalkable(Block.Tree)).toBe(false);
			expect(isWalkable(Block.Water)).toBe(false);
		});
	});

	describe('isSolid', () => {
		it('should return true for solid blocks', () => {
			expect(isSolid(Block.Tree)).toBe(true);
			expect(isSolid(Block.Water)).toBe(true);
			expect(isSolid(Block.Rock)).toBe(true);
		});

		it('should return false for walkable blocks', () => {
			expect(isSolid(Block.Field)).toBe(false);
			expect(isSolid(Block.SavePoint)).toBe(false);
		});
	});

	describe('mutual exclusivity', () => {
		it('should have no overlap between walkable and solid blocks', () => {
			for (const block of WALKABLE_BLOCKS) {
				expect(SOLID_BLOCKS.has(block)).toBe(false);
			}
			for (const block of SOLID_BLOCKS) {
				expect(WALKABLE_BLOCKS.has(block)).toBe(false);
			}
		});
	});
});
